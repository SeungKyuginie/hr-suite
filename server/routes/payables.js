import { Router } from 'express';
import { store, findById } from '../store.js';

const router = Router();

function ageBucket(dueDate, today) {
  const diff = Math.floor((new Date(dueDate) - today) / 86400000);
  if (diff > 7) return 'upcoming';      // 7일 이후 만기
  if (diff >= 0) return 'this_week';    // 7일 이내 만기
  if (diff >= -30) return 'overdue_30'; // 30일 연체
  return 'overdue_30plus';              // 30일+ 연체
}

router.get('/', (req, res) => {
  const { vendor_id, bucket } = req.query;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let list = store.purchase_invoices.filter(i => i.payment_status !== 'paid');
  if (vendor_id) list = list.filter(i => i.vendor_id === Number(vendor_id));
  const list2 = list.map(i => {
    const v = store.vendors.find(x => x.id === i.vendor_id);
    const balance = i.total_amount - (i.paid_amount ?? 0);
    return {
      ...i,
      vendor_name: v?.name ?? '(삭제됨)',
      vendor_bank_name: v?.bank_name ?? null,
      vendor_bank_account: v?.bank_account ?? null,
      balance,
      age_bucket: ageBucket(i.payment_due_date, today),
      days_to_due: Math.floor((new Date(i.payment_due_date) - today) / 86400000)
    };
  });
  const filtered = bucket ? list2.filter(r => r.age_bucket === bucket) : list2;
  res.json(filtered.sort((a, b) => a.payment_due_date.localeCompare(b.payment_due_date)));
});

router.get('/summary', (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = { upcoming: 0, this_week: 0, overdue_30: 0, overdue_30plus: 0 };
  const byVendor = {};
  let total = 0;
  for (const i of store.purchase_invoices) {
    if (i.payment_status === 'paid') continue;
    const balance = i.total_amount - (i.paid_amount ?? 0);
    total += balance;
    buckets[ageBucket(i.payment_due_date, today)] += balance;
    byVendor[i.vendor_id] = (byVendor[i.vendor_id] ?? 0) + balance;
  }
  const vendorRanking = Object.entries(byVendor)
    .map(([id, amt]) => {
      const v = store.vendors.find(x => x.id === Number(id));
      return { vendor_id: Number(id), vendor_name: v?.name ?? '?', balance: amt };
    })
    .sort((a, b) => b.balance - a.balance);
  res.json({ total, buckets, by_vendor: vendorRanking });
});

router.post('/:id/pay', (req, res) => {
  const inv = findById('purchase_invoices', req.params.id);
  if (!inv) return res.status(404).json({ error: 'not found' });
  const amount = req.body.amount != null ? Number(req.body.amount) : (inv.total_amount - (inv.paid_amount ?? 0));
  const paidDate = req.body.paid_date ?? new Date().toISOString().slice(0, 10);
  inv.paid_amount = (inv.paid_amount ?? 0) + amount;
  inv.paid_date = paidDate;
  if (inv.paid_amount >= inv.total_amount) {
    inv.payment_status = 'paid';
  } else {
    inv.payment_status = 'partial';
  }
  if (req.body.memo) inv.memo = req.body.memo;
  res.json({ ok: true, payment_status: inv.payment_status, paid_amount: inv.paid_amount });
});

router.post('/:id/unpay', (req, res) => {
  const inv = findById('purchase_invoices', req.params.id);
  if (!inv) return res.status(404).json({ error: 'not found' });
  inv.paid_amount = 0;
  inv.paid_date = null;
  inv.payment_status = 'unpaid';
  res.json({ ok: true });
});

export default router;
