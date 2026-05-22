import { Router } from 'express';
import { store, nextId, findById, removeById } from '../store.js';

const router = Router();

router.get('/', (req, res) => {
  const q = (req.query.q ?? '').toString().trim().toLowerCase();
  let list = [...store.vendors];
  if (q) {
    list = list.filter(v =>
      (v.name ?? '').toLowerCase().includes(q) ||
      (v.biz_no ?? '').includes(q) ||
      (v.category ?? '').toLowerCase().includes(q)
    );
  }
  // 미지급금 잔액 부착
  const list2 = list.map(v => {
    const unpaid = store.purchase_invoices
      .filter(i => i.vendor_id === v.id && i.payment_status !== 'paid')
      .reduce((s, i) => s + (i.total_amount - (i.paid_amount ?? 0)), 0);
    return { ...v, unpaid_balance: unpaid };
  });
  res.json(list2.sort((a, b) => a.name.localeCompare(b.name, 'ko')));
});

router.get('/:id', (req, res) => {
  const v = findById('vendors', req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  const invoices = store.purchase_invoices.filter(i => i.vendor_id === v.id);
  res.json({ ...v, invoices });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'name required' });
  const v = {
    id: nextId('vendors'),
    name: b.name,
    biz_no: b.biz_no ?? null,
    ceo: b.ceo ?? null,
    contact_name: b.contact_name ?? null,
    contact_phone: b.contact_phone ?? null,
    email: b.email ?? null,
    address: b.address ?? null,
    payment_terms: Number(b.payment_terms ?? 30),
    bank_name: b.bank_name ?? null,
    bank_account: b.bank_account ?? null,
    category: b.category ?? null,
    memo: b.memo ?? null,
    created_at: new Date().toISOString()
  };
  store.vendors.push(v);
  res.status(201).json({ id: v.id });
});

router.put('/:id', (req, res) => {
  const v = findById('vendors', req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  const allowed = ['name', 'biz_no', 'ceo', 'contact_name', 'contact_phone', 'email', 'address',
    'payment_terms', 'bank_name', 'bank_account', 'category', 'memo'];
  for (const f of allowed) {
    if (f in req.body) {
      v[f] = f === 'payment_terms' ? Number(req.body[f]) : req.body[f];
    }
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const hasInvoices = store.purchase_invoices.some(i => i.vendor_id === id);
  if (hasInvoices) return res.status(400).json({ error: '관련 세금계산서가 있어 삭제할 수 없습니다.' });
  removeById('vendors', id);
  res.json({ ok: true });
});

export default router;
