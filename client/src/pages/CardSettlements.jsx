import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const VAN_LIST = ['NICE', 'KIS', 'KCP', 'JTNET', 'KOCES'];
const CARD_LIST = ['신한카드', '삼성카드', '현대카드', '국민카드', '롯데카드', 'BC카드', '하나카드', 'NH농협카드'];

export default function CardSettlements() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [draft, setDraft] = useState({
    sale_date: today.toISOString().slice(0, 10),
    van_company: 'NICE', card_company: '신한카드',
    sales_amount: 0, fee_rate: 1.6, memo: ''
  });

  async function reload() {
    setRows(await api.cardSettlements.list({ year, month, status: statusFilter || undefined }));
    setSummary(await api.cardSettlements.summary({ year, month }));
  }
  useEffect(() => { reload(); }, [year, month, statusFilter]);

  async function add(e) {
    e.preventDefault();
    await api.cardSettlements.create(draft);
    setDraft({ ...draft, sales_amount: 0, memo: '' });
    reload();
  }
  async function deposit(id) {
    const amt = prompt('실제 입금액 (비우면 예상 입금액)');
    await api.cardSettlements.deposit(id, amt ? { actual_deposit_amount: Number(amt) } : {});
    reload();
  }
  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.cardSettlements.remove(id);
    reload();
  }

  return (
    <>
      <div className="page-header">
        <div><h1>카드 매출 정산</h1><div className="sub">VAN사·카드사별 매출 → 입금 대조, 수수료 자동 계산</div></div>
      </div>

      <div className="toolbar">
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90 }} />년
        <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 60 }} />월
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="pending">입금 대기</option>
          <option value="deposited">입금 완료</option>
        </select>
      </div>

      {summary && (
        <div className="grid grid-4">
          <div className="card kpi"><div className="label">월 카드매출</div><div className="value">{fmt.won(summary.total_sales)}</div></div>
          <div className="card kpi"><div className="label">수수료</div><div className="value">{fmt.won(summary.total_fee)}</div><div className="delta">실수령 {fmt.won(summary.total_net)}</div></div>
          <div className="card kpi"><div className="label">입금 대기</div><div className="value" style={{ color: 'var(--warning)' }}>{fmt.won(summary.pending_net)}</div></div>
          <div className="card kpi">
            <div className="label">VAN사 분포</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              {Object.entries(summary.by_van).map(([van, v]) => (
                <div key={van}>{van}: {fmt.won(v.sales)}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>카드 매출 등록</h2>
        <form onSubmit={add} className="form-row">
          <input type="date" value={draft.sale_date} onChange={e => setDraft({ ...draft, sale_date: e.target.value })} required />
          <select value={draft.van_company} onChange={e => setDraft({ ...draft, van_company: e.target.value })}>
            {VAN_LIST.map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={draft.card_company} onChange={e => setDraft({ ...draft, card_company: e.target.value })}>
            {CARD_LIST.map(v => <option key={v}>{v}</option>)}
          </select>
          <input type="number" placeholder="매출액" value={draft.sales_amount} onChange={e => setDraft({ ...draft, sales_amount: Number(e.target.value) })} style={{ width: 130 }} required />
          <input type="number" step="0.01" placeholder="수수료율%" value={draft.fee_rate} onChange={e => setDraft({ ...draft, fee_rate: Number(e.target.value) })} style={{ width: 90 }} />
          <input placeholder="메모" value={draft.memo} onChange={e => setDraft({ ...draft, memo: e.target.value })} style={{ flex: 1, minWidth: 140 }} />
          <button type="submit">등록</button>
        </form>
      </div>

      <div className="card">
        <h2>정산 내역 ({rows.length}건)</h2>
        <table>
          <thead>
            <tr>
              <th>매출일</th><th>VAN</th><th>카드사</th>
              <th className="num">매출액</th><th className="num">수수료율</th>
              <th className="num">수수료</th><th className="num">실수령</th>
              <th>입금예정</th><th>상태</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.sale_date}</td>
                <td>{r.van_company}</td>
                <td>{r.card_company}</td>
                <td className="num">{fmt.won(r.sales_amount)}</td>
                <td className="num">{r.fee_rate}%</td>
                <td className="num">{fmt.won(r.fee_amount)}</td>
                <td className="num">{fmt.won(r.net_amount)}</td>
                <td>{r.expected_deposit_date}</td>
                <td>
                  {r.deposit_status === 'deposited'
                    ? <span className="badge approved">완료 {r.actual_deposit_date ?? ''}</span>
                    : <span className="badge pending">대기</span>}
                </td>
                <td>
                  {r.deposit_status === 'pending' && (
                    <button className="success sm" onClick={() => deposit(r.id)}>입금처리</button>
                  )}{' '}
                  <button className="danger sm" onClick={() => remove(r.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
