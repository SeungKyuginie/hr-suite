import { Router } from 'express';
import { store, nextId, findById, removeById } from '../store.js';

const router = Router();

function withVendor(inv) {
  const v = store.vendors.find(x => x.id === inv.vendor_id);
  return {
    ...inv,
    vendor_name: v?.name ?? '(삭제됨)',
    vendor_biz_no: v?.biz_no ?? null,
    vendor_payment_terms: v?.payment_terms ?? null
  };
}

router.get('/', (req, res) => {
  const { year, month, vendor_id, status, taxable_type } = req.query;
  let list = [...store.purchase_invoices];
  if (year && month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    list = list.filter(r => r.invoice_date.startsWith(ym));
  }
  if (vendor_id) list = list.filter(r => r.vendor_id === Number(vendor_id));
  if (status) list = list.filter(r => r.payment_status === status);
  if (taxable_type) list = list.filter(r => r.taxable_type === taxable_type);
  res.json(list.map(withVendor).sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)));
});

router.get('/vat-summary', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year, month required' });
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const rows = store.purchase_invoices.filter(r => r.invoice_date.startsWith(ym));
  let taxable_supply = 0, tax = 0, exempt_supply = 0, count = 0;
  for (const r of rows) {
    count += 1;
    if (r.taxable_type === 'taxable') {
      taxable_supply += r.supply_amount;
      tax += r.tax_amount;
    } else {
      exempt_supply += r.supply_amount;
    }
  }
  res.json({
    year: Number(year), month: Number(month),
    taxable_supply, tax_deductible: tax, exempt_supply,
    total: taxable_supply + tax + exempt_supply, count
  });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.vendor_id || !b.invoice_date) {
    return res.status(400).json({ error: 'vendor_id, invoice_date required' });
  }
  const vendor = store.vendors.find(v => v.id === Number(b.vendor_id));
  if (!vendor) return res.status(400).json({ error: 'vendor not found' });
  const supply = Number(b.supply_amount ?? 0);
  const taxableType = b.taxable_type ?? 'taxable';
  const tax = taxableType === 'taxable' ? Math.round(supply * 0.1) : 0;
  const due = b.payment_due_date ?? addDays(b.invoice_date, vendor.payment_terms ?? 30);
  const row = {
    id: nextId('purchase_invoices'),
    vendor_id: Number(b.vendor_id),
    invoice_date: b.invoice_date,
    invoice_no: b.invoice_no ?? `INV-${b.invoice_date.replace(/-/g, '')}-${b.vendor_id}`,
    item_desc: b.item_desc ?? null,
    taxable_type: taxableType,
    supply_amount: supply,
    tax_amount: tax,
    total_amount: supply + tax,
    evidence_type: b.evidence_type ?? 'tax_invoice',
    payment_due_date: due,
    payment_status: 'unpaid',
    paid_amount: 0,
    paid_date: null,
    memo: b.memo ?? null,
    created_at: new Date().toISOString()
  };
  store.purchase_invoices.push(row);
  res.status(201).json({ id: row.id });
});

router.put('/:id', (req, res) => {
  const r = findById('purchase_invoices', req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  const allowed = ['invoice_date', 'invoice_no', 'item_desc', 'taxable_type',
    'supply_amount', 'evidence_type', 'payment_due_date', 'memo'];
  for (const f of allowed) {
    if (f in req.body) {
      r[f] = ['supply_amount'].includes(f) ? Number(req.body[f]) : req.body[f];
    }
  }
  r.tax_amount = r.taxable_type === 'taxable' ? Math.round(r.supply_amount * 0.1) : 0;
  r.total_amount = r.supply_amount + r.tax_amount;
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  removeById('purchase_invoices', req.params.id);
  res.json({ ok: true });
});

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default router;
