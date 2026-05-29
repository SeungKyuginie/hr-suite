// 급여 계산 모듈 — 4대보험, 소득세(간이세액표 근사), 지방소득세
//
// ⚠️ 본 계산은 실무 참고용 근사식이다.
// 실제 원천징수 신고는 국세청 간이세액표(엑셀)를 적용하거나
// 세무사 검토를 거치는 것이 표준 실무이다.

import { aggregateMonth } from './laborLaw.js';

const NON_TAXABLE_MEAL_MAX = 200000; // 식대 비과세 한도 (월 20만원, 2024년 개정)

/**
 * 통상시급 산출.
 * - 월 소정근로시간 = 209시간 (주40h 기준 표준)
 * @param {number} baseSalary  월 기본급
 * @param {number} [monthlyStdHours=209]
 */
export function hourlyOrdinaryWage(baseSalary, monthlyStdHours = 209) {
  return baseSalary / monthlyStdHours;
}

/**
 * 월간 가산수당 계산.
 */
export function calcAllowances(baseSalary, monthAgg, settings) {
  const hourly = hourlyOrdinaryWage(baseSalary);
  const overtimeMult = parseFloat(settings.overtime_multiplier ?? 1.5);
  const nightMult = parseFloat(settings.night_multiplier ?? 0.5);
  const holiday8 = parseFloat(settings.holiday_multiplier_8h ?? 1.5);
  const holidayOver = parseFloat(settings.holiday_multiplier_over_8h ?? 2.0);

  const overtimePay = Math.round(hourly * monthAgg.overtime * overtimeMult);
  const nightPay = Math.round(hourly * monthAgg.night * nightMult);
  const holidayPay =
    Math.round(hourly * monthAgg.holiday * holiday8) +
    Math.round(hourly * monthAgg.holidayOver8 * holidayOver);

  return { overtimePay, nightPay, holidayPay, hourly: Math.round(hourly) };
}

/**
 * 4대보험 근로자 부담분 계산 (월).
 * @param {number} taxableMonthly   과세 대상 월보수액
 * @param {object} settings
 */
export function calcSocialInsurance(taxableMonthly, settings) {
  const rNP = parseFloat(settings.rate_national_pension) / 100;
  const rHI = parseFloat(settings.rate_health_insurance) / 100;
  const rLTC = parseFloat(settings.rate_long_term_care) / 100;
  const rEI = parseFloat(settings.rate_employment_insurance) / 100;

  // 국민연금 기준소득월액 상한 (2025.7~ 기준 6,170,000 가정)
  const npBase = Math.min(taxableMonthly, 6170000);
  const nationalPension = Math.round((npBase * rNP) / 10) * 10; // 원단위 절사 후 10원 단위
  const healthInsurance = Math.round((taxableMonthly * rHI) / 10) * 10;
  const longTermCare = Math.round((healthInsurance * rLTC) / 10) * 10;
  const employmentInsurance = Math.round((taxableMonthly * rEI) / 10) * 10;

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    total: nationalPension + healthInsurance + longTermCare + employmentInsurance
  };
}

/**
 * 4대보험 사업주 부담분 계산 (월).
 * 근로자 부담분과 동일 요율 + 고용보험 사업주 가산분 + 산재보험.
 *
 * @param {number} taxableMonthly  과세 대상 월보수액
 * @param {object} settings
 * @param {object} [opts]
 * @param {number} [opts.employerEmploymentExtraRate=0.25]  고용보험 고용안정·직업능력개발 사업주 가산 (%)
 * @param {number} [opts.industrialAccidentRate=0.7]         산재보험 요율 (%, 업종별)
 */
export function calcEmployerSocialInsurance(taxableMonthly, settings, opts = {}) {
  const rNP = parseFloat(settings.rate_national_pension) / 100;
  const rHI = parseFloat(settings.rate_health_insurance) / 100;
  const rLTC = parseFloat(settings.rate_long_term_care) / 100;
  const rEI = parseFloat(settings.rate_employment_insurance) / 100;
  const rEIExtra = parseFloat(opts.employerEmploymentExtraRate ?? 0.25) / 100;
  const rIA = parseFloat(opts.industrialAccidentRate ?? 0.7) / 100;

  const npBase = Math.min(taxableMonthly, 6170000);
  const nationalPension = Math.round((npBase * rNP) / 10) * 10;
  const healthInsurance = Math.round((taxableMonthly * rHI) / 10) * 10;
  const longTermCare = Math.round((healthInsurance * rLTC) / 10) * 10;
  const employmentInsurance = Math.round((taxableMonthly * (rEI + rEIExtra)) / 10) * 10;
  const industrialAccident = Math.round((taxableMonthly * rIA) / 10) * 10;

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    industrialAccident,
    rates: {
      employment_insurance_total: (parseFloat(settings.rate_employment_insurance) + parseFloat(opts.employerEmploymentExtraRate ?? 0.25)).toFixed(2),
      industrial_accident: parseFloat(opts.industrialAccidentRate ?? 0.7)
    },
    total: nationalPension + healthInsurance + longTermCare + employmentInsurance + industrialAccident
  };
}

/**
 * 근로소득 간이세액 근사 계산.
 * 실 간이세액표(국세청)에 100% 일치하지 않는다 — 누진세율 + 근로소득공제·세액공제를 단순화한 근사식이다.
 *
 * @param {number} taxableMonthly  과세 대상 월급여 (비과세 제외)
 * @param {number} dependents      부양가족수 (본인 포함)
 * @param {number} childrenUnder20 20세 이하 자녀 수 (세액공제 영향)
 */
export function calcIncomeTax(taxableMonthly, dependents = 1, childrenUnder20 = 0) {
  if (taxableMonthly <= 1060000) return 0; // 비과세 구간 근사

  // 1) 연환산 총급여
  const annualGross = taxableMonthly * 12;
  // 2) 근로소득공제 (2024 개정 단순 적용)
  const earnedDeduction = laborIncomeDeduction(annualGross);
  // 3) 근로소득금액
  const laborIncome = Math.max(0, annualGross - earnedDeduction);
  // 4) 인적공제 = 1인당 150만원
  const personalDeduction = dependents * 1500000;
  // 5) 표준세액공제·근로소득세액공제 단순화
  const taxBase = Math.max(0, laborIncome - personalDeduction);
  // 6) 누진세율 적용 (2024 기준)
  let tax = progressiveTax(taxBase);
  // 7) 근로소득세액공제 (단순 한도 적용)
  tax = Math.max(0, tax - earnedTaxCredit(tax, annualGross));
  // 8) 자녀 세액공제 (1명 15만, 2명 35만, 3명+30만씩 — 단순)
  let childCredit = 0;
  if (childrenUnder20 === 1) childCredit = 150000;
  else if (childrenUnder20 === 2) childCredit = 350000;
  else if (childrenUnder20 >= 3) childCredit = 350000 + (childrenUnder20 - 2) * 300000;
  tax = Math.max(0, tax - childCredit);

  // 월 환산 + 10원 단위 절사
  return Math.max(0, Math.round(tax / 12 / 10) * 10);
}

function laborIncomeDeduction(annualGross) {
  // 2024 근로소득공제 표
  if (annualGross <= 5_000_000) return annualGross * 0.7;
  if (annualGross <= 15_000_000) return 3_500_000 + (annualGross - 5_000_000) * 0.4;
  if (annualGross <= 45_000_000) return 7_500_000 + (annualGross - 15_000_000) * 0.15;
  if (annualGross <= 100_000_000) return 12_000_000 + (annualGross - 45_000_000) * 0.05;
  return 14_750_000 + (annualGross - 100_000_000) * 0.02;
}

function progressiveTax(base) {
  // 2024 종합소득세율
  const brackets = [
    { up: 14_000_000, rate: 0.06, sub: 0 },
    { up: 50_000_000, rate: 0.15, sub: 1_260_000 },
    { up: 88_000_000, rate: 0.24, sub: 5_760_000 },
    { up: 150_000_000, rate: 0.35, sub: 15_440_000 },
    { up: 300_000_000, rate: 0.38, sub: 19_940_000 },
    { up: 500_000_000, rate: 0.40, sub: 25_940_000 },
    { up: 1_000_000_000, rate: 0.42, sub: 35_940_000 },
    { up: Infinity, rate: 0.45, sub: 65_940_000 }
  ];
  for (const b of brackets) {
    if (base <= b.up) return Math.max(0, base * b.rate - b.sub);
  }
  return 0;
}

function earnedTaxCredit(grossTax, annualGross) {
  // 근로소득세액공제 단순화: 산출세액의 55%(130만원 한도) 또는 30%(50만원 한도)
  let credit = grossTax <= 1_300_000 ? grossTax * 0.55 : 715_000 + (grossTax - 1_300_000) * 0.3;
  // 총급여별 한도
  let limit;
  if (annualGross <= 33_000_000) limit = 740_000;
  else if (annualGross <= 70_000_000) limit = Math.max(660_000, 740_000 - (annualGross - 33_000_000) * 0.008);
  else if (annualGross <= 120_000_000) limit = Math.max(500_000, 660_000 - (annualGross - 70_000_000) * 0.5 / 100);
  else limit = Math.max(200_000, 500_000 - (annualGross - 120_000_000) * 0.5 / 100);
  return Math.min(credit, limit);
}

/**
 * 통합 급여 계산.
 * 입력: 직원 + 해당월 근태 records + settings
 * 출력: payslip 객체 (DB에 저장 가능한 형태)
 */
export function computePayslip(employee, attendanceRecords, settings, year, month) {
  const monthAgg = aggregateMonth(attendanceRecords, {
    standardHoursPerDay: parseFloat(settings.standard_hours_per_day ?? 8)
  });
  const allowances = calcAllowances(employee.base_salary, monthAgg, settings);
  const mealAllowance = Math.min(employee.meal_allowance ?? 0, NON_TAXABLE_MEAL_MAX);

  // 과세대상 = 기본급 + 가산수당 (식대는 비과세 한도 내 제외)
  const taxable =
    employee.base_salary + allowances.overtimePay + allowances.nightPay + allowances.holidayPay;
  const grossPay = taxable + mealAllowance;

  const si = calcSocialInsurance(taxable, settings);
  const incomeTax = calcIncomeTax(
    taxable,
    employee.dependents ?? 1,
    employee.children_under_20 ?? 0
  );
  const localTax = Math.round((incomeTax * 0.1) / 10) * 10;

  const totalDeduction = si.total + incomeTax + localTax;
  const netPay = grossPay - totalDeduction;

  return {
    employee_id: employee.id,
    year,
    month,
    base_salary: employee.base_salary,
    overtime_pay: allowances.overtimePay,
    night_pay: allowances.nightPay,
    holiday_pay: allowances.holidayPay,
    meal_allowance: mealAllowance,
    taxable,
    national_pension: si.nationalPension,
    health_insurance: si.healthInsurance,
    long_term_care: si.longTermCare,
    employment_insurance: si.employmentInsurance,
    income_tax: incomeTax,
    local_tax: localTax,
    gross_pay: grossPay,
    total_deduction: totalDeduction,
    net_pay: netPay,
    detail_json: JSON.stringify({ monthAgg, hourly: allowances.hourly })
  };
}
