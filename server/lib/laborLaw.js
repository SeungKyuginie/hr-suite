// 근로기준법 계산 모듈
// - 연차 산정 (제60조)
// - 일일 근로시간 분해 (정규/연장/야간/휴일)

/**
 * 입사일 기준 연차 산정.
 * - 입사 1년 미만: 매월 개근 시 1일 (최대 11일)
 * - 1년 이상: 15일
 * - 3년 이상: 매 2년마다 1일 가산, 상한 25일
 * @param {string} hireDateISO  'YYYY-MM-DD'
 * @param {string} refDateISO   기준일 'YYYY-MM-DD' (기본: 오늘)
 * @returns {{ entitled: number, basis: string, yearsOfService: number }}
 */
export function annualLeaveEntitlement(hireDateISO, refDateISO = new Date().toISOString().slice(0, 10)) {
  const hire = new Date(hireDateISO + 'T00:00:00');
  const ref = new Date(refDateISO + 'T00:00:00');
  if (isNaN(hire) || isNaN(ref) || ref < hire) {
    return { entitled: 0, basis: 'invalid', yearsOfService: 0 };
  }
  const monthsServed = monthDiff(hire, ref);
  const yearsOfService = Math.floor(monthsServed / 12);

  if (monthsServed < 12) {
    // 입사 1년 미만: 매월 개근 시 1일, 최대 11일
    const earned = Math.min(11, Math.max(0, monthsServed));
    return { entitled: earned, basis: 'pro_rated_monthly', yearsOfService: 0 };
  }
  // 1년 이상
  let base = 15;
  if (yearsOfService >= 3) {
    base += Math.floor((yearsOfService - 1) / 2); // 3년차 +1, 5년차 +2, ...
  }
  return { entitled: Math.min(25, base), basis: 'annual_60_1', yearsOfService };
}

function monthDiff(a, b) {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}

/**
 * 하루 근태 기록을 정규/연장/야간/휴일 시간으로 분해.
 * - 1일 표준 근로시간 = 8시간 (그 이상은 연장)
 * - 야간 = 22:00 ~ 익일 06:00 구간
 * - 휴게: 4h 초과 30분, 8h 초과 1h 자동 차감
 * @param {{ workDate:string, clockIn:string, clockOut:string, isHoliday?:boolean }} rec
 * @param {{ standardHoursPerDay?:number }} [opts]
 * @returns {{ regular:number, overtime:number, night:number, holiday:number, totalWorked:number, breakMinutes:number }}
 */
export function decomposeWorkHours(rec, opts = {}) {
  const standard = opts.standardHoursPerDay ?? 8;
  if (!rec.clockIn || !rec.clockOut) {
    return { regular: 0, overtime: 0, night: 0, holiday: 0, totalWorked: 0, breakMinutes: 0 };
  }
  const startMin = toMinutes(rec.clockIn);
  let endMin = toMinutes(rec.clockOut);
  if (endMin <= startMin) endMin += 24 * 60; // 익일 퇴근

  const grossMin = endMin - startMin;
  // 휴게시간 차감
  let breakMin = 0;
  if (grossMin >= 8 * 60) breakMin = 60;
  else if (grossMin >= 4 * 60) breakMin = 30;
  const netMin = grossMin - breakMin;
  if (netMin <= 0) {
    return { regular: 0, overtime: 0, night: 0, holiday: 0, totalWorked: 0, breakMinutes: breakMin };
  }

  // 야간 시간 산정 (휴게는 야간에도 비례 차감하지 않고 일반에서 차감 — 단순 모델)
  const nightMin = overlapMinutes(startMin, endMin, 22 * 60, 30 * 60); // 22:00~다음날 06:00
  const totalHours = round2(netMin / 60);
  const nightHours = round2(nightMin / 60);

  if (rec.isHoliday) {
    // 휴일근로: 전부 휴일시간으로 잡고, 8시간 기준 가산은 payroll에서 처리
    return {
      regular: 0,
      overtime: 0,
      night: nightHours,
      holiday: totalHours,
      totalWorked: totalHours,
      breakMinutes: breakMin
    };
  }
  const regular = Math.min(standard, totalHours);
  const overtime = Math.max(0, totalHours - standard);
  return {
    regular: round2(regular),
    overtime: round2(overtime),
    night: nightHours,
    holiday: 0,
    totalWorked: totalHours,
    breakMinutes: breakMin
  };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function overlapMinutes(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * 월간 근태 합산.
 * @param {Array} records 근태 row 배열 (work_date, clock_in, clock_out, is_holiday)
 * @returns 합계 시간
 */
export function aggregateMonth(records, opts = {}) {
  const sum = { regular: 0, overtime: 0, night: 0, holiday: 0, holidayOver8: 0, days: 0 };
  for (const r of records) {
    const d = decomposeWorkHours(
      { workDate: r.work_date, clockIn: r.clock_in, clockOut: r.clock_out, isHoliday: !!r.is_holiday },
      opts
    );
    sum.regular += d.regular;
    sum.overtime += d.overtime;
    sum.night += d.night;
    if (d.holiday > 0) {
      sum.holiday += Math.min(8, d.holiday);
      sum.holidayOver8 += Math.max(0, d.holiday - 8);
    }
    if (d.totalWorked > 0) sum.days += 1;
  }
  // 부동소수점 누적 오차 정리
  for (const k of Object.keys(sum)) sum[k] = round2(sum[k]);
  return sum;
}
