import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

export default function Dashboard({ currentUser }) {
  const [balance, setBalance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [recentPayslip, setRecentPayslip] = useState(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (!currentUser) return;
    api.leave.balance(currentUser.id).then(setBalance).catch(() => setBalance(null));
    api.attendance.summary({ employee_id: currentUser.id, year, month }).then(setSummary);
    api.leave.list({ employee_id: currentUser.id }).then(r => setRecentLeaves(r.slice(0, 5)));
    api.payroll.list({ employee_id: currentUser.id }).then(r => setRecentPayslip(r[0] ?? null));
  }, [currentUser?.id]);

  if (!currentUser) return <div className="card">사용자가 선택되지 않았습니다.</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>대시보드</h1>
          <div className="sub">{currentUser.name} · {currentUser.department ?? '-'} · {currentUser.position ?? '-'}</div>
        </div>
        <div className="sub">{fmt.ym(year, month)} 기준</div>
      </div>

      <div className="grid grid-4">
        <div className="card kpi">
          <div className="label">이번 달 근무일수</div>
          <div className="value">{summary?.aggregate.days ?? 0}일</div>
          <div className="delta">총 근로 {summary?.aggregate.regular ?? 0}h + 연장 {summary?.aggregate.overtime ?? 0}h</div>
        </div>
        <div className="card kpi">
          <div className="label">연장·야간·휴일</div>
          <div className="value">
            {((summary?.aggregate.overtime ?? 0) + (summary?.aggregate.night ?? 0) + (summary?.aggregate.holiday ?? 0)).toFixed(1)}h
          </div>
          <div className="delta">연장 {summary?.aggregate.overtime ?? 0} · 야간 {summary?.aggregate.night ?? 0} · 휴일 {summary?.aggregate.holiday ?? 0}</div>
        </div>
        <div className="card kpi">
          <div className="label">연차 잔여</div>
          <div className="value">{balance?.remaining ?? 0}일</div>
          <div className="delta">발생 {balance?.entitled ?? 0} · 사용 {balance?.used ?? 0} · 신청중 {balance?.pending ?? 0}</div>
        </div>
        <div className="card kpi">
          <div className="label">최근 급여 실수령</div>
          <div className="value">{recentPayslip ? fmt.won(recentPayslip.net_pay) : '-'}</div>
          <div className="delta">{recentPayslip ? fmt.ym(recentPayslip.year, recentPayslip.month) : '계산된 급여 없음'}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>최근 휴가 신청</h2>
          {recentLeaves.length === 0 ? <div className="sub">신청 내역이 없습니다.</div> : (
            <table>
              <thead><tr><th>유형</th><th>기간</th><th className="num">일수</th><th>상태</th></tr></thead>
              <tbody>
                {recentLeaves.map(l => (
                  <tr key={l.id}>
                    <td>{leaveTypeLabel(l.leave_type)}</td>
                    <td>{fmt.date(l.start_date)} ~ {fmt.date(l.end_date)}</td>
                    <td className="num">{l.days}</td>
                    <td><span className={`badge ${l.status}`}>{statusLabel(l.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2>근로기준법 안내 (이번 달)</h2>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>주 40시간 + 연장 12시간 한도 (근기법 53조)</li>
            <li>연장근로: 통상임금의 50% 이상 가산 (56조)</li>
            <li>야간근로(22:00–06:00): 50% 추가 가산</li>
            <li>휴일근로: 8시간 이내 50%, 초과분 100% 가산</li>
            <li>연차: {balance?.entitled ?? '-'}일 발생 (입사 {balance?.hire_date ?? '-'})</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export function leaveTypeLabel(t) {
  return ({
    annual: '연차',
    half_am: '오전반차',
    half_pm: '오후반차',
    sick: '병가',
    family: '경조사',
    other: '기타'
  })[t] ?? t;
}
export function statusLabel(s) {
  return ({ pending: '대기', approved: '승인', rejected: '반려', canceled: '취소' })[s] ?? s;
}
