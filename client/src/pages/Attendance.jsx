import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

export default function Attendance({ currentUser, isAdmin }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scope, setScope] = useState('me'); // me | all (admin only)
  const [draft, setDraft] = useState({ work_date: today.toISOString().slice(0, 10), clock_in: '09:00', clock_out: '18:00', is_holiday: false });

  async function reload() {
    if (!currentUser) return;
    const params = { year, month };
    if (scope === 'me' || !isAdmin) params.employee_id = currentUser.id;
    const list = await api.attendance.list(params);
    setRows(list);
    if (scope === 'me' || !isAdmin) {
      setSummary((await api.attendance.summary({ employee_id: currentUser.id, year, month })).aggregate);
    } else {
      setSummary(null);
    }
  }
  useEffect(() => { reload(); }, [currentUser?.id, year, month, scope]);

  async function clockIn() {
    await api.attendance.clockIn(currentUser.id);
    reload();
  }
  async function clockOut() {
    await api.attendance.clockOut(currentUser.id);
    reload();
  }
  async function addRow(e) {
    e.preventDefault();
    await api.attendance.upsert({ ...draft, employee_id: currentUser.id });
    reload();
  }
  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.attendance.remove(id);
    reload();
  }

  return (
    <>
      <div className="page-header">
        <div><h1>근태관리</h1><div className="sub">출퇴근 기록, 연장·야간·휴일 자동 분해</div></div>
        <div className="form-row">
          <button onClick={clockIn}>출근 기록</button>
          <button onClick={clockOut} className="ghost">퇴근 기록</button>
        </div>
      </div>

      <div className="toolbar">
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90 }} />년
        <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 60 }} />월
        {isAdmin && (
          <select value={scope} onChange={e => setScope(e.target.value)}>
            <option value="me">본인</option>
            <option value="all">전체 직원</option>
          </select>
        )}
        <span className="spacer" />
      </div>

      {summary && (
        <div className="grid grid-4">
          <div className="card kpi"><div className="label">근무일수</div><div className="value">{summary.days}일</div></div>
          <div className="card kpi"><div className="label">정규근로</div><div className="value">{summary.regular}h</div></div>
          <div className="card kpi"><div className="label">연장근로</div><div className="value">{summary.overtime}h</div><div className="delta">×1.5 가산</div></div>
          <div className="card kpi"><div className="label">야간·휴일</div><div className="value">{(summary.night + summary.holiday + summary.holidayOver8).toFixed(1)}h</div><div className="delta">야간 {summary.night} · 휴일 {summary.holiday + summary.holidayOver8}</div></div>
        </div>
      )}

      <div className="card">
        <h2>근태 기록 추가/수정 (같은 날짜는 덮어쓰기)</h2>
        <form onSubmit={addRow} className="form-row">
          <input type="date" value={draft.work_date} onChange={e => setDraft({ ...draft, work_date: e.target.value })} required />
          <input type="time" value={draft.clock_in} onChange={e => setDraft({ ...draft, clock_in: e.target.value })} required />
          <span>~</span>
          <input type="time" value={draft.clock_out} onChange={e => setDraft({ ...draft, clock_out: e.target.value })} required />
          <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" checked={draft.is_holiday} onChange={e => setDraft({ ...draft, is_holiday: e.target.checked })} />
            휴일근로
          </label>
          <button type="submit">저장</button>
        </form>
      </div>

      <div className="card">
        <h2>기록 ({rows.length}건)</h2>
        <table>
          <thead>
            <tr>
              <th>날짜</th>{scope === 'all' && isAdmin && <th>이름</th>}
              <th>출근</th><th>퇴근</th><th className="num">정규</th><th className="num">연장</th>
              <th className="num">야간</th><th className="num">휴일</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.work_date} {r.is_holiday ? <span className="badge rejected">휴일</span> : null}</td>
                {scope === 'all' && isAdmin && <td>{r.employee_name}</td>}
                <td>{r.clock_in ?? '-'}</td>
                <td>{r.clock_out ?? '-'}</td>
                <td className="num">{r.hours.regular}</td>
                <td className="num">{r.hours.overtime}</td>
                <td className="num">{r.hours.night}</td>
                <td className="num">{r.hours.holiday}</td>
                <td><button className="danger sm" onClick={() => remove(r.id)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
