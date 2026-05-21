import { Router } from 'express';
import { store, nextId, findById } from '../store.js';
import { annualLeaveEntitlement } from '../lib/laborLaw.js';

const router = Router();

router.get('/', (req, res) => {
  const { employee_id, status } = req.query;
  let rows = [...store.leave_requests];
  if (employee_id) rows = rows.filter(r => r.employee_id === Number(employee_id));
  if (status) rows = rows.filter(r => r.status === status);
  rows.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  res.json(rows.map(r => {
    const emp = findById('employees', r.employee_id);
    const dec = r.decided_by ? findById('employees', r.decided_by) : null;
    return { ...r, employee_name: emp?.name ?? '', decider_name: dec?.name ?? null };
  }));
});

router.get('/balance/:employee_id', (req, res) => {
  const emp = findById('employees', req.params.employee_id);
  if (!emp) return res.status(404).json({ error: 'employee not found' });
  const entitlement = annualLeaveEntitlement(emp.hire_date);
  const annualTypes = ['annual', 'half_am', 'half_pm'];
  const used = store.leave_requests
    .filter(l => l.employee_id === emp.id && l.status === 'approved' && annualTypes.includes(l.leave_type))
    .reduce((s, l) => s + l.days, 0);
  const pending = store.leave_requests
    .filter(l => l.employee_id === emp.id && l.status === 'pending' && annualTypes.includes(l.leave_type))
    .reduce((s, l) => s + l.days, 0);
  res.json({
    employee_id: emp.id,
    hire_date: emp.hire_date,
    entitled: entitlement.entitled,
    used,
    pending,
    remaining: entitlement.entitled - used,
    yearsOfService: entitlement.yearsOfService,
    basis: entitlement.basis
  });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.employee_id || !b.leave_type || !b.start_date || !b.end_date) {
    return res.status(400).json({ error: 'required: employee_id, leave_type, start_date, end_date' });
  }
  let days = b.days;
  if (days == null) {
    if (b.leave_type === 'half_am' || b.leave_type === 'half_pm') {
      days = 0.5;
    } else {
      const s = new Date(b.start_date + 'T00:00:00');
      const e = new Date(b.end_date + 'T00:00:00');
      days = Math.max(1, Math.round((e - s) / 86400000) + 1);
    }
  }
  const row = {
    id: nextId('leave_requests'),
    employee_id: Number(b.employee_id),
    leave_type: b.leave_type,
    start_date: b.start_date,
    end_date: b.end_date,
    days: Number(days),
    reason: b.reason ?? null,
    status: 'pending',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };
  store.leave_requests.push(row);
  res.status(201).json({ id: row.id, days });
});

router.post('/:id/decision', (req, res) => {
  const { decision, decided_by, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
  }
  const row = findById('leave_requests', req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  row.status = decision;
  row.decided_by = decided_by ?? null;
  row.decided_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  row.decision_note = note ?? null;
  res.json({ ok: true });
});

router.post('/:id/cancel', (req, res) => {
  const row = findById('leave_requests', req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  row.status = 'canceled';
  res.json({ ok: true });
});

export default router;
