import { Router } from 'express';
import { store, nextId, findById, removeById } from '../store.js';

const router = Router();

function calcTotals(b) {
  const cash = Number(b.cash ?? 0);
  const card = Number(b.card ?? 0);
  const mobile = Number(b.mobile_pay ?? 0);
  const gift = Number(b.gift_card ?? 0);
  const points = Number(b.points ?? 0);
  const other = Number(b.other ?? 0);
  const expected = Number(b.expected_cash ?? cash);
  const actual = Number(b.actual_cash ?? expected);
  return {
    cash, card, mobile_pay: mobile, gift_card: gift, points, other,
    total: cash + card + mobile + gift + points + other,
    expected_cash: expected,
    actual_cash: actual,
    cash_diff: actual - expected
  };
}

router.get('/', (req, res) => {
  const { year, month, from, to } = req.query;
  let list = [...store.daily_sales];
  if (year && month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    list = list.filter(r => r.sale_date.startsWith(ym));
  }
  if (from) list = list.filter(r => r.sale_date >= from);
  if (to) list = list.filter(r => r.sale_date <= to);
  res.json(list.sort((a, b) => b.sale_date.localeCompare(a.sale_date)));
});

router.get('/summary', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year, month required' });
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const rows = store.daily_sales.filter(r => r.sale_date.startsWith(ym));
  const agg = rows.reduce((s, r) => ({
    cash: s.cash + r.cash,
    card: s.card + r.card,
    mobile_pay: s.mobile_pay + r.mobile_pay,
    gift_card: s.gift_card + r.gift_card,
    points: s.points + r.points,
    other: s.other + r.other,
    total: s.total + r.total,
    cash_diff: s.cash_diff + r.cash_diff,
    days: s.days + 1
  }), { cash: 0, card: 0, mobile_pay: 0, gift_card: 0, points: 0, other: 0, total: 0, cash_diff: 0, days: 0 });
  res.json({ year: Number(year), month: Number(month), aggregate: agg, days: rows.length });
});

router.get('/:id', (req, res) => {
  const r = findById('daily_sales', req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.sale_date) return res.status(400).json({ error: 'sale_date required' });
  const existing = store.daily_sales.find(r => r.sale_date === b.sale_date);
  if (existing) {
    Object.assign(existing, calcTotals(b), {
      pos_count: Number(b.pos_count ?? existing.pos_count),
      memo: b.memo ?? existing.memo
    });
    return res.json({ id: existing.id, updated: true });
  }
  const totals = calcTotals(b);
  const row = {
    id: nextId('daily_sales'),
    sale_date: b.sale_date,
    pos_count: Number(b.pos_count ?? 1),
    ...totals,
    memo: b.memo ?? null,
    closed: 0,
    closed_by: null,
    closed_at: null,
    created_at: new Date().toISOString()
  };
  store.daily_sales.push(row);
  res.status(201).json({ id: row.id });
});

router.post('/:id/close', (req, res) => {
  const r = findById('daily_sales', req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  r.closed = 1;
  r.closed_by = Number(req.body.closed_by ?? 0) || null;
  r.closed_at = new Date().toISOString();
  res.json({ ok: true });
});

router.post('/:id/reopen', (req, res) => {
  const r = findById('daily_sales', req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  r.closed = 0;
  r.closed_by = null;
  r.closed_at = null;
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  removeById('daily_sales', req.params.id);
  res.json({ ok: true });
});

export default router;
