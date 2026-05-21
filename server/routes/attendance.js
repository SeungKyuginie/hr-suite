import { Router } from 'express';
import { store, nextId, findById, removeById, getSettings } from '../store.js';
import { decomposeWorkHours, aggregateMonth } from '../lib/laborLaw.js';

const router = Router();

function ym(year, month) { return `${year}-${String(month).padStart(2, '0')}`; }

router.get('/', (req, res) => {
  const { employee_id, year, month } = req.query;
  let rows = [...store.attendance];
  if (employee_id) rows = rows.filter(r => r.employee_id === Number(employee_id));
  if (year && month) rows = rows.filter(r => r.work_date.startsWith(ym(year, month)));
  rows.sort((a, b) => b.work_date.localeCompare(a.work_date) || a.employee_id - b.employee_id);
  const decorated = rows.map(r => {
    const emp = findById('employees', r.employee_id);
    return {
      ...r,
      employee_name: emp?.name ?? '',
      hours: decomposeWorkHours({
        workDate: r.work_date, clockIn: r.clock_in, clockOut: r.clock_out, isHoliday: !!r.is_holiday
      })
    };
  });
  res.json(decorated);
});

router.get('/summary', (req, res) => {
  const { employee_id, year, month } = req.query;
  if (!employee_id || !year || !month) {
    return res.status(400).json({ error: 'employee_id, year, month required' });
  }
  const records = store.attendance.filter(
    r => r.employee_id === Number(employee_id) && r.work_date.startsWith(ym(year, month))
  );
  const settings = getSettings();
  const agg = aggregateMonth(records, {
    standardHoursPerDay: parseFloat(settings.standard_hours_per_day ?? 8)
  });
  res.json({
    employee_id: Number(employee_id),
    year: Number(year),
    month: Number(month),
    aggregate: agg,
    count: records.length
  });
});

function upsert(employeeId, workDate, patch) {
  let row = store.attendance.find(r => r.employee_id === employeeId && r.work_date === workDate);
  if (!row) {
    row = { id: nextId('attendance'), employee_id: employeeId, work_date: workDate, clock_in: null, clock_out: null, is_holiday: 0, note: null };
    store.attendance.push(row);
  }
  Object.assign(row, patch);
  return row;
}

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.employee_id || !b.work_date) {
    return res.status(400).json({ error: 'employee_id, work_date required' });
  }
  upsert(Number(b.employee_id), b.work_date, {
    clock_in: b.clock_in ?? null,
    clock_out: b.clock_out ?? null,
    is_holiday: b.is_holiday ? 1 : 0,
    note: b.note ?? null
  });
  res.json({ ok: true });
});

router.post('/clock-in', (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const existing = store.attendance.find(r => r.employee_id === Number(employee_id) && r.work_date === date);
  if (!existing || !existing.clock_in) upsert(Number(employee_id), date, { clock_in: hm });
  res.json({ ok: true, date, time: hm });
});

router.post('/clock-out', (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  upsert(Number(employee_id), date, { clock_out: hm });
  res.json({ ok: true, date, time: hm });
});

router.delete('/:id', (req, res) => {
  removeById('attendance', req.params.id);
  res.json({ ok: true });
});

export default router;
