import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const EVIDENCE = {
  tax_invoice: '세금계산서',
  cash_receipt: '현금영수증',
  card: '카드매출전표',
  simplified: '간이영수증'
};

export default function PurchaseInvoices() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [vendorId, setVendorId] = useState('');
  const [status, setStatus] = useState('');
  const [taxable, setTaxable] = useState('');
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vatSummary, setVatSummary] = useState(null);
  const [draft, setDraft] = useState({
    vendor_id: '', invoice_date: today.toISOString().slice(0, 10),
    invoice_no: '', item_desc: '',
    taxable_type: 'taxable', supply_amount: 0,
    evidence_type: 'tax_invoice', memo: ''
  });

  async function reload() {
    setRows(await api.purchaseInvoices.list({
      year, month, vendor_id: vendorId || undefined,
      status: status || undefined, taxable_type: taxable || undefined
    }));
    setVatSummary(await api.purchaseInvoices.vatSummary({ year, month }));
  }
  useEffect(() => { reload(); }, [year, month, vendorId, status, taxable]);
  useEffect(() => { api.vendors.list().then(setVendors); }, []);

  async function add(e) {
    e.preventDefault();
    if (!draft.vendor_id) return alert('거래처를 선택하세요.');
    await api.purchaseInvoices.create(draft);
    setDraft({ ...draft, supply_amount: 0, item_desc: '', invoice_no: '', memo: '' });
    reload();
  }
  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.purchaseInvoices.remove(id);
    reload();
  }

  const tax = draft.taxable_type === 'taxable' ? Math.round(Number(draft.supply_amount) * 0.1) : 0;
  const total = Number(draft.supply_amount) + tax;

  return (
    <>
      <div className="page-header">
        <div><h1>매입 세금계산서</h1><div className="sub">적격증빙 등록, 부가세 매입세액 자동 집계</div></div>
      </div>

      <div className="toolbar">
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90 }} />년
        <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 60 }} />월
        <select value={vendorId} onChange={e => setVendorId(e.target.value)}>
          <option value="">전체 거래처</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">전체 결제상태</option>
          <option value="unpaid">미지급</option>
          <option value="partial">일부지급</option>
          <option value="paid">지급완료</option>
        </select>
        <select value={taxable} onChange={e => setTaxable(e.target.value)}>
          <option value="">과세/면세 전체</option>
          <option value="taxable">과세</option>
          <option value="exempt">면세</option>
        </select>
      </div>

      {vatSummary && (
        <div className="grid grid-4">
          <div className="card kpi"><div className="label">과세 공급가액</div><div className="value">{fmt.won(vatSummary.taxable_supply)}</div></div>
          <div className="card kpi"><div className="label">매입세액 (공제)</div><div className="value">{fmt.won(vatSummary.tax_deductible)}</div></div>
          <div className="card kpi"><div className="label">면세 공급가액</div><div className="value">{fmt.won(vatSummary.exempt_supply)}</div></div>
          <div className="card kpi"><div className="label">건수</div><div className="value">{vatSummary.count}건</div><div className="delta">합계 {fmt.won(vatSummary.total)}</div></div>
        </div>
      )}

      <div className="card">
        <h2>매입 세금계산서 등록</h2>
        <form onSubmit={add}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ flex: 1.5, minWidth: 160 }}>
              <label>거래처 *</label>
              <select value={draft.vendor_id} onChange={e => setDraft({ ...draft, vendor_id: e.target.value })} required>
                <option value="">선택</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="field"><label>작성일자</label>
              <input type="date" value={draft.invoice_date} onChange={e => setDraft({ ...draft, invoice_date: e.target.value })} required />
            </div>
            <div className="field"><label>증빙</label>
              <select value={draft.evidence_type} onChange={e => setDraft({ ...draft, evidence_type: e.target.value })}>
                {Object.entries(EVIDENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label>과세구분</label>
              <select value={draft.taxable_type} onChange={e => setDraft({ ...draft, taxable_type: e.target.value })}>
                <option value="taxable">과세 (10%)</option>
                <option value="exempt">면세</option>
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label>공급가액</label>
              <input type="number" value={draft.supply_amount} onChange={e => setDraft({ ...draft, supply_amount: Number(e.target.value) })} required />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 100 }}>
              <label>부가세 (자동)</label>
              <input value={fmt.won(tax)} readOnly />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 100 }}>
              <label>합계 (자동)</label>
              <input value={fmt.won(total)} readOnly />
            </div>
            <div className="field" style={{ flex: 2, minWidth: 200 }}>
              <label>품목/적요</label>
              <input value={draft.item_desc} onChange={e => setDraft({ ...draft, item_desc: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>승인번호</label>
              <input value={draft.invoice_no} onChange={e => setDraft({ ...draft, invoice_no: e.target.value })} placeholder="자동 생성" />
            </div>
          </div>
          <div className="form-row">
            <button type="submit">등록</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>매입 내역 ({rows.length}건)</h2>
        <table>
          <thead>
            <tr>
              <th>일자</th><th>거래처</th><th>품목</th><th>증빙</th>
              <th>과세</th><th className="num">공급가액</th>
              <th className="num">부가세</th><th className="num">합계</th>
              <th>결제예정</th><th>결제상태</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.invoice_date}</td>
                <td>{r.vendor_name}<br /><span className="sub">{r.vendor_biz_no ?? ''}</span></td>
                <td>{r.item_desc ?? '-'}</td>
                <td>{EVIDENCE[r.evidence_type] ?? r.evidence_type}</td>
                <td>{r.taxable_type === 'taxable' ? '과세' : '면세'}</td>
                <td className="num">{fmt.won(r.supply_amount)}</td>
                <td className="num">{fmt.won(r.tax_amount)}</td>
                <td className="num"><b>{fmt.won(r.total_amount)}</b></td>
                <td>{r.payment_due_date}</td>
                <td>
                  {r.payment_status === 'paid' ? <span className="badge approved">지급</span>
                    : r.payment_status === 'partial' ? <span className="badge pending">일부</span>
                    : <span className="badge rejected">미지급</span>}
                </td>
                <td><button className="danger sm" onClick={() => remove(r.id)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
