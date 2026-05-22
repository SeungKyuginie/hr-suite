import { Router } from 'express';
import { store, nextId, findById, removeById } from '../store.js';

const router = Router();

router.get('/', (req, res) => {
  const { year, month, status, van } = req.query;
  let list = [...store.card_settlements];
  if (year && month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    list = list.filter(r => r.sale_date.startsWith(ym));
  }
  if (status) list = list.filter(r => r.deposit_status === status);
  if (van) list = list.filter(r => r.van_company === van);
  res.json(list.sort((a, b) => b.sale_date.localeCompare(a.sale_date) || a.van_company.localeCompare(b.van_company)));
});

router.get('/summary', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year, month required' });
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const rows = store.card_settlements.filter(r => r.sale_date.startsWith(ym));
  const byVan = {};
  let totalSales = 0, totalFee = 0, totalNet = 0, pendingNet = 0;
  for (const r of rows) {
    totalSales += r.sales_amount;
    totalFee += r.fee_amount;
    totalNet += r.net_amount;
    if (r.deposit_status === 'pending') pendingNet += r.net_amount;
    byVan[r.van_company] = byVan[r.van_company] ?? { sales: 0, fee: 0, net: 0 };
    byVan[r.van_company].sales += r.sales_amount;
    byVan[r.van_company].fee += r.fee_amount;
    byVan[r.van_company].net += r.net_amount;
  }
  res.json({
    year: Number(year), month: Number(month),
    total_sales: totalSales, total_fee: totalFee, total_net: totalNet, pending_net: pendingNet,
    by_van: byVan
  });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.sale_date || !b.van_company || !b.card_company) {
    return res.status(400).json({ error: 'sale_date, van_company, card_company required' });
  }
  const sales = Number(b.sales_amount ?? 0);
  const feeRate = Number(b.fee_rate ?? 0);
  const fee = b.fee_amount != null ? Number(b.fee_amount) : Math.round(sales * feeRate / 100);
  const expected = b.expected_deposit_date ?? addDays(b.sale_date, 3);
  const row = {
    id: nextId('card_settlements'),
    sale_date: b.sale_date,
    van_company: b.van_company,
    card_company: b.card_company,
    sales_amount: sales,
    fee_rate: feeRate,
    fee_amount: fee,
    net_amount: sales - fee,
    expected_deposit_date: expected,
    deposit_status: 'pending',
    actual_deposit_date: null,
    actual_deposit_amount: null,
    memo: b.memo ?? null,
    created_at: new Date().toISOString()
  };
  store.card_settlements.push(row);
  res.status(201).json({ id: row.id });
});

router.post('/:id/deposit', (req, res) => {
  const r = findById('card_settlements', req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  r.deposit_status = 'deposited';
  r.actual_deposit_date = req.body.actual_deposit_date ?? new Date().toISOString().slice(0, 10);
  r.actual_deposit_amount = req.body.actual_deposit_amount != null
    ? Number(req.body.actual_deposit_amount) : r.net_amount;
  if (req.body.memo) r.memo = req.body.memo;
  res.json({ ok: true });
});

router.put('/:id', (req, res) => {
  const r = findById('card_settlements', req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  const allowed = ['sale_date', 'van_company', 'card_company', 'sales_amount', 'fee_rate',
    'fee_amount', 'expected_deposit_date', 'memo'];
  for (const f of allowed) {
    if (f in req.body) {
      r[f] = ['sales_amount', 'fee_rate', 'fee_amount'].includes(f) ? Number(req.body[f]) : req.body[f];
    }
  }
  r.net_amount = r.sales_amount - r.fee_amount;
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  removeById('card_settlements', req.params.id);
  res.json({ ok: true });
});

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default router;
