import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';
import { leaveTypeLabel, statusLabel } from './Dashboard.jsx';

export default function Leave({ currentUser, isAdmin, employees }) {
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState(null);
  const [scope, setScope] = useState('me');
  const [draft, setDraft] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
  const [filterStatus, setFilterStatus] = useState('');

  async function reload() {
    if (!currentUser) return;
    const params = {};
    if (scope === 'me' || !isAdmin) params.employee_id = currentUser.id;
    if (filterStatus) params.status = filterStatus;
    setRequests(await api.leave.list(params));
    setBalance(await api.leave.balance(currentUser.id));
  }
  useEffect(() => { reload(); }, [currentUser?.id, scope, filterStatus]);

  async function submit(e) {
    e.preventDefault();
    if (!draft.start_date || !draft.end_date) return alert('기간을 선택하세요');
    try {
      await api.leave.create({ ...draft, employee_id: currentUser.id });
      setDraft({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      reload();
    } catch (e) { alert(e.message); }
  }
  async function decide(id, decision) {
    const note = decision === 'rejected' ? prompt('반려 사유') : null;
    await api.leave.decide(id, { decision, decided_by: currentUser.id, note });
    reload();
  }
  async function cancel(id) {
    if (!confirm('취소하시겠습니까?')) return;
    await api.leave.cancel(id);
    reload();
  }

  return (
    <>
      <div className="page-header">
        <div><h1>휴가관리</h1><div className="sub">근로기준법 제60조 기반 연차 자동 산정</div></div>
        <div className="form-row">
          <span className="badge">발생 {balance?.entitled ?? 0}</span>
          <span className="badge approved">사용 {balance?.used ?? 0}</span>
          <span className="badge pending">신청중 {balance?.pending ?? 0}</span>
          <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>잔여 {balance?.remaining ?? 0}일</span>
        </div>
      </div>

      <div className="card">
        <h2>휴가 신청</h2>
        <form onSubmit={submit} className="form-row">
          <select value={draft.leave_type} onChange={e => setDraft({ ...draft, leave_type: e.target.value })}>
            <option value="annual">연차</option>
            <option value="half_am">오전 반차</option>
            <option value="half_pm">오후 반차</option>
            <option value="sick">병가</option>
            <option value="family">경조사</option>
            <option value="other">기타</option>
          </select>
          <input type="date" value={draft.start_date} onChange={e => setDraft({ ...draft, start_date: e.target.value, end_date: draft.end_date || e.target.value })} />
          <span>~</span>
          <input type="date" value={draft.end_date} onChange={e => setDraft({ ...draft, end_date: e.target.value })} />
          <input style={{ flex: 1, minWidth: 200 }} placeholder="사유" value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} />
          <button type="submit">신청</button>
        </form>
      </div>

      <div className="toolbar">
        {isAdmin && (
          <select value={scope} onChange={e => setScope(e.target.value)}>
            <option value="me">내 신청</option>
            <option value="all">전체 신청</option>
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="canceled">취소</option>
        </select>
      </div>

      <div className="card">
        <h2>신청 내역 ({requests.length})</h2>
        <table>
          <thead>
            <tr>
              {scope === 'all' && isAdmin && <th>직원</th>}
              <th>유형</th><th>기간</th><th className="num">일수</th><th>사유</th><th>상태</th><th>결재자</th><th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map(l => (
              <tr key={l.id}>
                {scope === 'all' && isAdmin && <td>{l.employee_name}</td>}
                <td>{leaveTypeLabel(l.leave_type)}</td>
                <td>{fmt.date(l.start_date)} ~ {fmt.date(l.end_date)}</td>
                <td className="num">{l.days}</td>
                <td>{l.reason ?? '-'}</td>
                <td><span className={`badge ${l.status}`}>{statusLabel(l.status)}</span></td>
                <td>{l.decider_name ?? '-'}</td>
                <td>
                  {l.status === 'pending' && isAdmin && (
                    <>
                      <button className="success sm" onClick={() => decide(l.id, 'approved')}>승인</button>
                      <button className="danger sm" style={{ marginLeft: 4 }} onClick={() => decide(l.id, 'rejected')}>반려</button>
                    </>
                  )}
                  {l.status === 'pending' && l.employee_id === currentUser?.id && (
                    <button className="ghost sm" onClick={() => cancel(l.id)}>취소</button>
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
