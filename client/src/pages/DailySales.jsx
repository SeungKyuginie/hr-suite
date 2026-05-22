import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const empty = {
  sale_date: new Date().toISOString().slice(0, 10),
  pos_count: 4,
  cash: 0, card: 0, mobile_pay: 0, gift_card: 0, points: 0, other: 0,
  expected_cash: 0, actual_cash: 0, memo: ''
};

export default function DailySales({ currentUser }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [draft, setDraft] = useState(empty);

  async function reload() {
    setRows(await api.dailySales.list({ year, month }));
    setSummary((await api.dailySales.summary({ year, month })).aggregate);
  }
  useEffect(() => { reload(); }, [year, month]);

  async function save(e) {
    e.preventDefault();
    await api.dailySales.upsert(draft);
    setDraft(empty);
    reload();
  }
  async function close(id) {
    await api.dailySales.close(id, { closed_by: currentUser?.id });
    reload();
  }
  async function reopen(id) {
    await api.dailySales.reopen(id);
    reload();
  }
  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.dailySales.remove(id);
    reload();
  }
  function edit(r) {
    setDraft({
      sale_date: r.sale_date,
      pos_count: r.pos_count,
      cash: r.cash, card: r.card, mobile_pay: r.mobile_pay,
      gift_card: r.gift_card, points: r.points, other: r.other,
      expected_cash: r.expected_cash, actual_cash: r.actual_cash,
      memo: r.memo ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const numField = (label, key, hint) => (
    <div className="field" style={{ minWidth: 110, flex: 1 }}>
      <label>{label}{hint && <span style={{ color: 'var(--text-dim)' }}> · {hint}</span>}</label>
      <input
        type="number"
        value={draft[key]}
        onChange={e => setDraft({ ...draft, [key]: Number(e.target.value) })}
      />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div><h1>일일 매출 마감</h1><div className="sub">결제수단별 매출·시재 마감, POS별 합산</div></div>
      </div>

      <div className="toolbar">
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90 }} />년
        <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 60 }} />월
      </div>

      {summary && (
        <div className="grid grid-4">
          <div className="card kpi"><div className="label">월 총매출</div><div className="value">{fmt.won(summary.total)}</div><div className="delta">{summary.days}일 마감</div></div>
          <div className="card kpi"><div className="label">카드</div><div className="value">{fmt.won(summary.card)}</div></div>
          <div className="card kpi"><div className="label">현금</div><div className="value">{fmt.won(summary.cash)}</div><div className="delta">간편결제 {fmt.won(summary.mobile_pay)}</div></div>
          <div className="card kpi"><div className="label">시재 차이 누계</div><div className="value" style={{ color: summary.cash_diff < 0 ? 'var(--danger)' : summary.cash_diff > 0 ? 'var(--success)' : undefined }}>{fmt.won(summary.cash_diff)}</div></div>
        </div>
      )}

      <div className="card">
        <h2>일일 마감 입력 (같은 날짜는 덮어쓰기)</h2>
        <form onSubmit={save}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field">
              <label>마감일</label>
              <input type="date" value={draft.sale_date} onChange={e => setDraft({ ...draft, sale_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>POS 수</label>
              <input type="number" min={1} value={draft.pos_count} onChange={e => setDraft({ ...draft, pos_count: Number(e.target.value) })} style={{ width: 80 }} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            {numField('현금', 'cash')}
            {numField('카드', 'card')}
            {numField('간편결제', 'mobile_pay', '페이류')}
            {numField('상품권', 'gift_card')}
            {numField('포인트', 'points')}
            {numField('기타', 'other')}
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            {numField('예상 현금시재', 'expected_cash')}
            {numField('실제 현금시재', 'actual_cash')}
            <div className="field" style={{ flex: 2, minWidth: 200 }}>
              <label>메모</label>
              <input value={draft.memo} onChange={e => setDraft({ ...draft, memo: e.target.value })} placeholder="시재차이 사유 등" />
            </div>
          </div>
          <div className="form-row">
            <button type="submit">저장</button>
            <button type="button" className="ghost" onClick={() => setDraft(empty)}>초기화</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>마감 내역 ({rows.length}일)</h2>
        <table>
          <thead>
            <tr>
              <th>일자</th><th className="num">총매출</th><th className="num">현금</th>
              <th className="num">카드</th><th className="num">간편</th><th className="num">상품권</th>
              <th className="num">시재차이</th><th>상태</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.sale_date}</td>
                <td className="num">{fmt.won(r.total)}</td>
                <td className="num">{fmt.won(r.cash)}</td>
                <td className="num">{fmt.won(r.card)}</td>
                <td className="num">{fmt.won(r.mobile_pay)}</td>
                <td className="num">{fmt.won(r.gift_card)}</td>
                <td className="num" style={{ color: r.cash_diff < 0 ? 'var(--danger)' : r.cash_diff > 0 ? 'var(--success)' : undefined }}>
                  {fmt.won(r.cash_diff)}
                </td>
                <td>{r.closed ? <span className="badge approved">마감</span> : <span className="badge pending">진행중</span>}</td>
                <td>
                  <button className="ghost sm" onClick={() => edit(r)}>수정</button>{' '}
                  {r.closed
                    ? <button className="ghost sm" onClick={() => reopen(r.id)}>마감해제</button>
                    : <button className="success sm" onClick={() => close(r.id)}>마감</button>}{' '}
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
