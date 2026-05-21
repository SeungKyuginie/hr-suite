import { Router } from 'express';
import { store, nextId, findById, removeById } from '../store.js';
import { annualLeaveEntitlement } from '../lib/laborLaw.js';

const router = Router();

router.get('/', (req, res) => {
  res.json([...store.employees].sort((a, b) => a.id - b.id));
});

router.get('/:id', (req, res) => {
  const emp = findById('employees', req.params.id);
  if (!emp) return res.status(404).json({ error: 'not found' });
  const leave = annualLeaveEntitlement(emp.hire_date);
  const used = store.leave_requests
    .filter(l => l.employee_id === emp.id && l.status === 'approved'
      && ['annual', 'half_am', 'half_pm'].includes(l.leave_type))
    .reduce((s, l) => s + l.days, 0);
  res.json({ ...emp, leaveEntitlement: leave, leaveUsed: used, leaveRemaining: leave.entitled - used });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.emp_no || !b.name || !b.hire_date) {
    return res.status(400).json({ error: 'emp_no, name, hire_date required' });
  }
  if (store.employees.some(e => e.emp_no === b.emp_no)) {
    return res.status(400).json({ error: 'emp_no already exists' });
  }
  const emp = {
    id: nextId('employees'),
    emp_no: b.emp_no,
    name: b.name,
    department: b.department ?? null,
    position: b.position ?? null,
    email: b.email ?? null,
    phone: b.phone ?? null,
    hire_date: b.hire_date,
    resign_date: null,
    base_salary: Number(b.base_salary ?? 0),
    dependents: Number(b.dependents ?? 1),
    children_under_20: Number(b.children_under_20 ?? 0),
    meal_allowance: Number(b.meal_allowance ?? 200000),
    is_admin: b.is_admin ? 1 : 0,
    created_at: new Date().toISOString()
  };
  store.employees.push(emp);
  res.status(201).json({ id: emp.id });
});

router.put('/:id', (req, res) => {
  const emp = findById('employees', req.params.id);
  if (!emp) return res.status(404).json({ error: 'not found' });
  const allowed = [
    'name', 'department', 'position', 'email', 'phone', 'hire_date', 'resign_date',
    'base_salary', 'dependents', 'children_under_20', 'meal_allowance', 'is_admin'
  ];
  for (const f of allowed) {
    if (f in req.body) {
      emp[f] = f === 'is_admin' ? (req.body[f] ? 1 : 0)
        : typeof emp[f] === 'number' ? Number(req.body[f]) : req.body[f];
    }
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  removeById('employees', id);
  // 연관 데이터 삭제
  store.attendance = store.attendance.filter(r => r.employee_id !== id);
  store.leave_requests = store.leave_requests.filter(r => r.employee_id !== id);
  store.payslips = store.payslips.filter(r => r.employee_id !== id);
  res.json({ ok: true });
});

export default router;
