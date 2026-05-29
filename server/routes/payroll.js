import { Router } from 'express';
import { store, nextId, findById, removeById, getSettings } from '../store.js';
import { computePayslip } from '../lib/payrollCalc.js';
import { calcAllowances, calcSocialInsurance, calcIncomeTax, hourlyOrdinaryWage } from '../lib/payrollCalc.js';

const router = Router();

function ym(year, month) { return `${year}-${String(month).padStart(2, '0')}`; }

router.get('/', (req, res) => {
  const { year, month, employee_id } = req.query;
  let rows = [...store.payslips];
  if (year) rows = rows.filter(r => r.year === Number(year));
  if (month) rows = rows.filter(r => r.month === Number(month));
  if (employee_id) rows = rows.filter(r => r.employee_id === Number(employee_id));
  rows.sort((a, b) => b.year - a.year || b.month - a.month || a.employee_id - b.employee_id);
  res.json(rows.map(r => {
    const emp = findById('employees', r.employee_id);
    return {
      ...r,
      employee_name: emp?.name ?? '',
      emp_no: emp?.emp_no ?? '',
      department: emp?.department ?? '',
      position: emp?.position ?? ''
    };
  }));
});

router.get('/:id', (req, res) => {
  const row = findById('payslips', req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const emp = findById('employees', row.employee_id);
  let detail = null;
  try { detail = JSON.parse(row.detail_json ?? 'null'); } catch (_) {}
  res.json({
    ...row,
    detail,
    employee_name: emp?.name ?? '',
    emp_no: emp?.emp_no ?? '',
    department: emp?.department ?? '',
    position: emp?.position ?? '',
    hire_date: emp?.hire_date ?? ''
  });
});

function upsertPayslip(slip) {
  const existing = store.payslips.find(
    r => r.employee_id === slip.employee_id && r.year === slip.year && r.month === slip.month
  );
  if (existing) {
    Object.assign(existing, slip);
    return existing;
  }
  const row = { id: nextId('payslips'), ...slip, created_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
  store.payslips.push(row);
  return row;
}

router.post('/calculate', (req, res) => {
  const { employee_id, year, month } = req.body;
  if (!employee_id || !year || !month) {
    return res.status(400).json({ error: 'employee_id, year, month required' });
  }
  const emp = findById('employees', employee_id);
  if (!emp) return res.status(404).json({ error: 'employee not found' });
  const records = store.attendance.filter(
    r => r.employee_id === Number(employee_id) && r.work_date.startsWith(ym(year, month))
  );
  const slip = computePayslip(emp, records, getSettings(), Number(year), Number(month));
  const saved = upsertPayslip(slip);
  res.json(saved);
});

router.post('/calculate-all', (req, res) => {
  const { year, month } = req.body;
  if (!year || !month) return res.status(400).json({ error: 'year, month required' });
  const settings = getSettings();
  const yearMonth = ym(year, month);
  const cutoff = `${yearMonth}-01`;
  const results = [];
  for (const emp of store.employees) {
    if (emp.resign_date && emp.resign_date < cutoff) continue;
    const records = store.attendance.filter(
      r => r.employee_id === emp.id && r.work_date.startsWith(yearMonth)
    );
    const slip = computePayslip(emp, records, settings, Number(year), Number(month));
    upsertPayslip(slip);
    results.push({ employee_id: emp.id, name: emp.name, net_pay: slip.net_pay });
  }
  res.json({ count: results.length, results });
});

router.delete('/:id', (req, res) => {
  removeById('payslips', req.params.id);
  res.json({ ok: true });
});

// 급여 시뮬레이션 — DB 저장 없음, 즉시 계산
router.post('/simulate', (req, res) => {
  const b = req.body ?? {};
  const settings = getSettings();
  const baseSalary = Number(b.base_salary ?? 0);
  if (baseSalary <= 0) return res.status(400).json({ error: 'base_salary required' });

  const dependents = Number(b.dependents ?? 1);
  const childrenUnder20 = Number(b.children_under_20 ?? 0);
  const mealAllowanceInput = Number(b.meal_allowance ?? 0);
  const mealAllowance = Math.min(mealAllowanceInput, 200000);

  // 가상 월 근로 집계 (사용자 입력)
  const monthAgg = {
    regular: Number(b.regular_hours ?? 209),
    overtime: Number(b.overtime_hours ?? 0),
    night: Number(b.night_hours ?? 0),
    holiday: Number(b.holiday_hours ?? 0),
    holidayOver8: Number(b.holiday_over8_hours ?? 0),
    days: Number(b.work_days ?? 22)
  };

  const allowances = calcAllowances(baseSalary, monthAgg, settings);
  const taxable = baseSalary + allowances.overtimePay + allowances.nightPay + allowances.holidayPay;
  const grossPay = taxable + mealAllowance;
  const si = calcSocialInsurance(taxable, settings);
  const incomeTax = calcIncomeTax(taxable, dependents, childrenUnder20);
  const localTax = Math.round((incomeTax * 0.1) / 10) * 10;
  const totalDeduction = si.total + incomeTax + localTax;
  const netPay = grossPay - totalDeduction;

  const hourly = hourlyOrdinaryWage(baseSalary);

  res.json({
    input: { base_salary: baseSalary, dependents, children_under_20: childrenUnder20,
      meal_allowance: mealAllowance, monthAgg },
    rates: {
      national_pension: settings.rate_national_pension,
      health_insurance: settings.rate_health_insurance,
      long_term_care: settings.rate_long_term_care,
      employment_insurance: settings.rate_employment_insurance
    },
    hourly_ordinary: Math.round(hourly),
    minimum_wage_year: 2026,
    minimum_wage_hourly: 10320,
    minimum_wage_monthly_209h: 2156880,
    earnings: {
      base_salary: baseSalary,
      overtime_pay: allowances.overtimePay,
      night_pay: allowances.nightPay,
      holiday_pay: allowances.holidayPay,
      meal_allowance: mealAllowance,
      taxable,
      gross_pay: grossPay
    },
    deductions: {
      national_pension: si.nationalPension,
      health_insurance: si.healthInsurance,
      long_term_care: si.longTermCare,
      employment_insurance: si.employmentInsurance,
      social_total: si.total,
      income_tax: incomeTax,
      local_tax: localTax,
      total: totalDeduction
    },
    net_pay: netPay,
    conversions: {
      hourly: Math.round(hourly),
      daily_8h: Math.round(hourly * 8),
      weekly_40h: Math.round(hourly * 40),
      monthly_209h: baseSalary,
      annual: baseSalary * 12,
      annual_net: netPay * 12
    }
  });
});

export default router;
