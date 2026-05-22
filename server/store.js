// 메모리 기반 데이터 저장소 (Vercel 서버리스 호환).
// 콜드 스타트 시 자동으로 시드된다. 데이터는 서버리스 인스턴스가
// 살아있는 동안만 유지되며, 일정 시간 트래픽이 없으면 리셋된다.

const counters = {
  employees: 0, attendance: 0, leave_requests: 0, payslips: 0,
  vendors: 0, daily_sales: 0, card_settlements: 0, purchase_invoices: 0
};

export const store = {
  employees: [],
  attendance: [],
  leave_requests: [],
  payslips: [],
  vendors: [],
  daily_sales: [],
  card_settlements: [],
  purchase_invoices: [],
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
  if (store.vendors.length === 0) seedAccounting();
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
    employee_id: store.employees[1].id,
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
    employee_id: store.employees[2].id,
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
    employee_id: store.employees[4].id,
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
    employee_id: store.employees[5].id,
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

function seedAccounting() {
  const vendorSeeds = [
    { name: '대성농산',     biz_no: '123-45-67890', ceo: '김대성', contact_name: '이영업', contact_phone: '010-1111-2222', payment_terms: 30, category: '농산물',  bank_name: '국민', bank_account: '123-45-678901' },
    { name: '한빛수산',     biz_no: '234-56-78901', ceo: '박한빛', contact_name: '최담당', contact_phone: '010-2222-3333', payment_terms: 15, category: '수산물',  bank_name: '신한', bank_account: '110-234-567890' },
    { name: '하나축산',     biz_no: '345-67-89012', ceo: '정하나', contact_name: '윤거래', contact_phone: '010-3333-4444', payment_terms: 30, category: '축산물',  bank_name: '하나', bank_account: '345-67-89012-3' },
    { name: '서울제과',     biz_no: '456-78-90123', ceo: '한제과', contact_name: '강과장', contact_phone: '010-4444-5555', payment_terms: 30, category: '가공식품', bank_name: '우리', bank_account: '1002-456-789012' },
    { name: '광명생활용품', biz_no: '567-89-01234', ceo: '오광명', contact_name: '서팀장', contact_phone: '010-5555-6666', payment_terms: 60, category: '생활용품', bank_name: '농협', bank_account: '301-1234-5678-91' },
    { name: '청정음료',     biz_no: '678-90-12345', ceo: '임청정', contact_name: '문대리', contact_phone: '010-6666-7777', payment_terms: 30, category: '음료',    bank_name: '기업', bank_account: '012-678901-01-019' }
  ];
  for (const v of vendorSeeds) {
    store.vendors.push({
      id: nextId('vendors'),
      name: v.name,
      biz_no: v.biz_no,
      ceo: v.ceo,
      contact_name: v.contact_name,
      contact_phone: v.contact_phone,
      email: null,
      address: null,
      payment_terms: v.payment_terms,
      bank_name: v.bank_name,
      bank_account: v.bank_account,
      category: v.category,
      memo: null,
      created_at: nowIso()
    });
  }

  // 최근 14일 일일 매출
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const weekend = [0, 6].includes(d.getDay());
    const cash = Math.round((weekend ? 1800000 : 1200000) + Math.random() * 400000);
    const card = Math.round((weekend ? 9500000 : 7000000) + Math.random() * 1500000);
    const mobile = Math.round(900000 + Math.random() * 300000);
    const gift = Math.round(250000 + Math.random() * 150000);
    const points = Math.round(120000 + Math.random() * 80000);
    const expected = cash;
    const actual = cash + (Math.random() < 0.3 ? Math.round((Math.random() - 0.5) * 8000) : 0);
    store.daily_sales.push({
      id: nextId('daily_sales'),
      sale_date: dateStr,
      pos_count: 4,
      cash, card, mobile_pay: mobile, gift_card: gift, points, other: 0,
      total: cash + card + mobile + gift + points,
      expected_cash: expected,
      actual_cash: actual,
      cash_diff: actual - expected,
      memo: actual - expected !== 0 ? '시재 차이 확인 필요' : null,
      closed: i > 0 ? 1 : 0,
      closed_by: i > 0 ? store.employees[0]?.id ?? null : null,
      closed_at: i > 0 ? nowIso() : null,
      created_at: nowIso()
    });
  }

  // 카드 매출 정산 (최근 7일, VAN사별)
  const vans = [
    { van: 'NICE',   card_co: '신한카드',     fee: 1.6 },
    { van: 'NICE',   card_co: '삼성카드',     fee: 1.7 },
    { van: 'KIS',    card_co: '현대카드',     fee: 1.8 },
    { van: 'KCP',    card_co: '국민카드',     fee: 1.5 },
    { van: 'KCP',    card_co: '롯데카드',     fee: 1.9 }
  ];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const saleDate = d.toISOString().slice(0, 10);
    for (const v of vans) {
      const sales = Math.round(800000 + Math.random() * 1500000);
      const fee = Math.round(sales * v.fee / 100);
      const expected = new Date(d);
      expected.setDate(expected.getDate() + 3);
      const deposited = i >= 3;
      store.card_settlements.push({
        id: nextId('card_settlements'),
        sale_date: saleDate,
        van_company: v.van,
        card_company: v.card_co,
        sales_amount: sales,
        fee_rate: v.fee,
        fee_amount: fee,
        net_amount: sales - fee,
        expected_deposit_date: expected.toISOString().slice(0, 10),
        deposit_status: deposited ? 'deposited' : 'pending',
        actual_deposit_date: deposited ? expected.toISOString().slice(0, 10) : null,
        actual_deposit_amount: deposited ? sales - fee : null,
        memo: null,
        created_at: nowIso()
      });
    }
  }

  // 매입 세금계산서 (각 거래처당 1~2건)
  const invoiceSeeds = [
    { vendor: 1, days_ago: 5,  supply: 4200000, taxable: 'taxable',  item: '상추, 깻잎, 감자 외',  evidence: 'tax_invoice' },
    { vendor: 1, days_ago: 12, supply: 3800000, taxable: 'taxable',  item: '쌀 20kg ×30',         evidence: 'tax_invoice' },
    { vendor: 2, days_ago: 3,  supply: 2900000, taxable: 'exempt',   item: '갈치, 고등어, 새우',   evidence: 'tax_invoice' },
    { vendor: 3, days_ago: 7,  supply: 6500000, taxable: 'taxable',  item: '한우 등심·안심, 삼겹', evidence: 'tax_invoice' },
    { vendor: 4, days_ago: 10, supply: 1850000, taxable: 'taxable',  item: '비스킷, 초콜릿 외',   evidence: 'tax_invoice' },
    { vendor: 5, days_ago: 20, supply: 980000,  taxable: 'taxable',  item: '주방세제, 세탁세제',  evidence: 'tax_invoice' },
    { vendor: 5, days_ago: 2,  supply: 1240000, taxable: 'taxable',  item: '키친타올, 휴지',      evidence: 'tax_invoice' },
    { vendor: 6, days_ago: 8,  supply: 2150000, taxable: 'taxable',  item: '생수, 탄산음료',      evidence: 'tax_invoice' }
  ];
  for (const inv of invoiceSeeds) {
    const vendor = store.vendors[inv.vendor - 1];
    const tax = inv.taxable === 'taxable' ? Math.round(inv.supply * 0.1) : 0;
    const total = inv.supply + tax;
    const invDate = new Date(today);
    invDate.setDate(invDate.getDate() - inv.days_ago);
    const dueDate = new Date(invDate);
    dueDate.setDate(dueDate.getDate() + (vendor?.payment_terms ?? 30));
    const isPaid = inv.days_ago > 25;
    store.purchase_invoices.push({
      id: nextId('purchase_invoices'),
      vendor_id: vendor.id,
      invoice_date: invDate.toISOString().slice(0, 10),
      invoice_no: `INV-${invDate.toISOString().slice(0, 10).replace(/-/g, '')}-${inv.vendor}`,
      item_desc: inv.item,
      taxable_type: inv.taxable,
      supply_amount: inv.supply,
      tax_amount: tax,
      total_amount: total,
      evidence_type: inv.evidence,
      payment_due_date: dueDate.toISOString().slice(0, 10),
      payment_status: isPaid ? 'paid' : 'unpaid',
      paid_amount: isPaid ? total : 0,
      paid_date: isPaid ? dueDate.toISOString().slice(0, 10) : null,
      memo: null,
      created_at: nowIso()
    });
  }
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
