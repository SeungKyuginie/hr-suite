import { Router } from 'express';
import { store, nextId, findById, removeById, getSettings } from '../store.js';
import { computePayslip } from '../lib/payrollCalc.js';

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

export default router;
