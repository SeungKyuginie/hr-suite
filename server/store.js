// 메모리 기반 데이터 저장소 (Vercel 서버리스 호환).
// 콜드 스타트 시 자동으로 시드된다. 데이터는 서버리스 인스턴스가
// 살아있는 동안만 유지되며, 일정 시간 트래픽이 없으면 리셋된다.

const counters = { employees: 0, attendance: 0, leave_requests: 0, payslips: 0 };

export const store = {
  employees: [],
  attendance: [],
  leave_requests: [],
  payslips: [],
  settings: {}
};

export function nextId(table) {
  counters[table] += 1;
  return counters[table];
}

// ----- settings -----
export function getSetting(key) { return store.settings[key]; }
export function getSettings() { return { ...store.settings }; }
export function setSetting(key, value) { store.settings[key] = String(value); }

// ----- generic helpers -----
export function findById(table, id) {
  return store[table].find(r => r.id === Number(id));
}
export function removeById(table, id) {
  const idx = store[table].findIndex(r => r.id === Number(id));
  if (idx >= 0) store[table].splice(idx, 1);
  return idx >= 0;
}

// ----- 초기화 (idempotent) -----
let bootstrapped = false;
export function ensureBootstrapped() {
  if (bootstrapped) return;
  bootstrapped = true;
  applyDefaultSettings();
  if (store.employees.length === 0) seedSample();
}

function applyDefaultSettings() {
  const defaults = {
    rate_national_pension: '4.5',
    rate_health_insurance: '3.545',
    rate_long_term_care: '12.95',
    rate_employment_insurance: '0.9',
    standard_hours_per_day: '8',
    standard_hours_per_week: '40',
    overtime_multiplier: '1.5',
    night_multiplier: '0.5',
    holiday_multiplier_8h: '1.5',
    holiday_multiplier_over_8h: '2.0',
    annual_leave_basis: 'hire_date',
    fiscal_year_start_month: '1',
    company_name: '주식회사 샘플',
    company_ceo: '홍길동',
    company_brn: '000-00-00000',
    company_address: '서울특별시 강남구 테헤란로 1'
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in store.settings)) store.settings[k] = String(v);
  }
}

function seedSample() {
  const employees = [
    { emp_no: 'E001', name: '김관리', department: '경영지원', position: '부장',  email: 'admin@example.com',  hire_date: '2019-03-04', base_salary: 5800000, dependents: 3, children_under_20: 1, is_admin: 1 },
    { emp_no: 'E002', name: '이개발', department: '연구개발', position: '책임',  email: 'dev1@example.com',   hire_date: '2022-09-01', base_salary: 4500000, dependents: 2, children_under_20: 0, is_admin: 0 },
    { emp_no: 'E003', name: '박디자', department: '디자인',   position: '선임',  email: 'design@example.com', hire_date: '2024-05-13', base_salary: 3800000, dependents: 1, children_under_20: 0, is_admin: 0 },
    { emp_no: 'E004', name: '최신입', department: '운영',     position: '주임',  email: 'ops@example.com',    hire_date: '2025-11-03', base_salary: 3000000, dependents: 1, children_under_20: 0, is_admin: 0 },
    { emp_no: 'E005', name: '정마케', department: '마케팅',   position: '책임',  email: 'mkt@example.com',    hire_date: '2021-06-21', base_salary: 4200000, dependents: 2, children_under_20: 1, is_admin: 0 },
    { emp_no: 'E006', name: '한세일', department: '영업',     position: '대리',  email: 'sales@example.com',  hire_date: '2023-03-15', base_salary: 3600000, dependents: 1, children_under_20: 0, is_admin: 0 }
  ];
  for (const e of employees) {
    store.employees.push({
      id: nextId('employees'),
      ...e,
      phone: null,
      resign_date: null,
      meal_allowance: 200000,
      created_at: nowIso()
    });
  }

  // 최근 14영업일 근태 시드
  const today = new Date();
  for (const emp of store.employees) {
    let added = 0;
    const cursor = new Date(today);
    while (added < 14) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const clockIn = added % 5 === 0 ? '08:30' : '09:00';
        const clockOut = added % 7 === 0 ? '22:30' : (added % 3 === 0 ? '20:00' : '18:00');
        store.attendance.push({
          id: nextId('attendance'),
          employee_id: emp.id,
          work_date: dateStr,
          clock_in: clockIn,
          clock_out: clockOut,
          is_holiday: 0,
          note: null
        });
        added++;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 휴가 샘플
  const plus = (days) => addDays(new Date(), days);
  store.leave_requests.push({
    id: nextId('leave_requests'),
    employee_id: store.employees[1].id,  // 이개발
    leave_type: 'annual',
    start_date: plus(7),
    end_date: plus(8),
    days: 2,
    reason: '가족 행사',
    status: 'pending',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: nowIso()
  });
  store.leave_requests.push({
    id: nextId('leave_requests'),
    employee_id: store.employees[2].id,  // 박디자
    leave_type: 'half_pm',
    start_date: plus(-3),
    end_date: plus(-3),
    days: 0.5,
    reason: '병원 진료',
    status: 'approved',
    decided_by: store.employees[0].id,
    decided_at: nowIso(),
    decision_note: null,
    created_at: nowIso()
  });
  store.leave_requests.push({
    id: nextId('leave_requests'),
    employee_id: store.employees[4].id,  // 정마케
    leave_type: 'sick',
    start_date: plus(-10),
    end_date: plus(-9),
    days: 2,
    reason: '독감',
    status: 'approved',
    decided_by: store.employees[0].id,
    decided_at: nowIso(),
    decision_note: null,
    created_at: nowIso()
  });
  store.leave_requests.push({
    id: nextId('leave_requests'),
    employee_id: store.employees[5].id,  // 한세일
    leave_type: 'annual',
    start_date: plus(14),
    end_date: plus(16),
    days: 3,
    reason: '개인 여행',
    status: 'pending',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: nowIso()
  });
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
