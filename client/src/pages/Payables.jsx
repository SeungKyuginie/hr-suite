import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const BUCKET_LABEL = {
  upcoming: '예정 (8일+ 후)',
  this_week: '금주 만기 (7일 이내)',
  overdue_30: '연체 (30일 이내)',
  overdue_30plus: '장기 연체 (30일+)'
};

export default function Payables() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [bucket, setBucket] = useState('');

  async function reload() {
    setRows(await api.payables.list({ bucket: bucket || undefined }));
    setSummary(await api.payables.summary());
  }
  useEffect(() => { reload(); }, [bucket]);

  async function pay(r) {
    const remaining = r.balance;
    const input = prompt(`결제 금액 (기본 ${remaining.toLocaleString()}원, 부분지급 가능)`, String(remaining));
    if (input == null) return;
    await api.payables.pay(r.id, { amount: Number(input) });
    reload();
  }
  async function unpay(id) {
    if (!confirm('결제완료를 취소하시겠습니까?')) return;
    await api.payables.unpay(id);
    reload();
  }

  return (
    <>
      <div className="page-header">
        <div><h1>미지급금 관리</h1><div className="sub">거래처별 외상매입 잔액, 결제 만기일 추적</div></div>
      </div>

      {summary && (
        <div className="grid grid-4">
          <div className="card kpi"><div className="label">전체 미지급</div><div className="value">{fmt.won(summary.total)}</div></div>
          <div className="card kpi"><div className="label">금주 만기</div><div className="value" style={{ color: 'var(--warning)' }}>{fmt.won(summary.buckets.this_week)}</div></div>
          <div className="card kpi"><div className="label">연체 (30일)</div><div className="value" style={{ color: 'var(--danger)' }}>{fmt.won(summary.buckets.overdue_30)}</div></div>
          <div className="card kpi"><div className="label">장기 연체</div><div className="value" style={{ color: 'var(--danger)' }}>{fmt.won(summary.buckets.overdue_30plus)}</div></div>
        </div>
      )}

      {summary && summary.by_vendor.length > 0 && (
        <div className="card">
          <h2>거래처별 잔액 TOP</h2>
          <table>
            <thead><tr><th>거래처</th><th className="num">미지급 잔액</th></tr></thead>
            <tbody>
              {summary.by_vendor.slice(0, 10).map(v => (
                <tr key={v.vendor_id}>
                  <td>{v.vendor_name}</td>
                  <td className="num">{fmt.won(v.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="toolbar">
        <select value={bucket} onChange={e => setBucket(e.target.value)}>
          <option value="">전체 만기</option>
          {Object.entries(BUCKET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card">
        <h2>미지급 명세 ({rows.length}건)</h2>
        <table>
          <thead>
            <tr>
              <th>거래처</th><th>품목</th><th>작성일</th><th>만기일</th>
              <th className="num">잔여일</th><th className="num">잔액</th>
              <th>입금계좌</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><b>{r.vendor_name}</b></td>
                <td>{r.item_desc ?? '-'}</td>
                <td>{r.invoice_date}</td>
                <td>{r.payment_due_date}</td>
                <td className="num" style={{ color: r.days_to_due < 0 ? 'var(--danger)' : r.days_to_due <= 7 ? 'var(--warning)' : undefined }}>
                  {r.days_to_due < 0 ? `${Math.abs(r.days_to_due)}일 연체` : `${r.days_to_due}일`}
                </td>
                <td className="num"><b>{fmt.won(r.balance)}</b>
                  {r.payment_status === 'partial' && <><br /><span className="sub">총 {fmt.won(r.total_amount)} / 지급 {fmt.won(r.paid_amount)}</span></>}
                </td>
                <td>{r.vendor_bank_name ?? '-'}<br /><span className="sub">{r.vendor_bank_account ?? ''}</span></td>
                <td>
                  <button className="success sm" onClick={() => pay(r)}>지급</button>{' '}
                  {r.payment_status === 'partial' && (
                    <button className="ghost sm" onClick={() => unpay(r.id)}>지급취소</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
