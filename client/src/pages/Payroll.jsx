import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api.js';

export default function Payroll({ isAdmin, currentUser }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function reload() {
    const params = { year, month };
    if (!isAdmin) params.employee_id = currentUser?.id;
    setRows(await api.payroll.list(params));
  }
  useEffect(() => { reload(); }, [year, month, currentUser?.id]);

  async function calcAll() {
    setLoading(true);
    try {
      await api.payroll.calculateAll({ year, month });
      await reload();
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  }
  async function calcOne(empId) {
    setLoading(true);
    try {
      await api.payroll.calculate({ employee_id: empId, year, month });
      await reload();
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  }

  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + r.gross_pay,
    deduction: acc.deduction + r.total_deduction,
    net: acc.net + r.net_pay
  }), { gross: 0, deduction: 0, net: 0 });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>급여관리</h1>
          <div className="sub">근태 기반 자동 계산 · 4대보험 · 간이세액표 근사</div>
        </div>
        {isAdmin && (
          <button onClick={calcAll} disabled={loading}>{fmt.ym(year, month)} 전사 일괄 계산</button>
        )}
      </div>

      <div className="notice">
        ⚠️ 본 시스템의 소득세는 누진세율 기반 <b>근사식</b>이며, 실제 원천징수 신고 시 국세청 간이세액표(엑셀)나 세무사 검토 결과를 사용하시기 바랍니다.
      </div>

      <div className="toolbar">
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90 }} />년
        <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 60 }} />월
        <span className="spacer" />
        <span className="badge">총 지급 {fmt.won(totals.gross)}</span>
        <span className="badge rejected">총 공제 {fmt.won(totals.deduction)}</span>
        <span className="badge approved">총 실지급 {fmt.won(totals.net)}</span>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>사번</th><th>이름</th><th>부서</th>
              <th className="num">기본급</th><th className="num">연장수당</th><th className="num">야간수당</th><th className="num">휴일수당</th>
              <th className="num">총지급</th><th className="num">공제</th><th className="num">실지급</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.emp_no}</td>
                <td>{r.employee_name}</td>
                <td>{r.department}</td>
                <td className="num">{fmt.num(r.base_salary)}</td>
                <td className="num">{fmt.num(r.overtime_pay)}</td>
                <td className="num">{fmt.num(r.night_pay)}</td>
                <td className="num">{fmt.num(r.holiday_pay)}</td>
                <td className="num">{fmt.num(r.gross_pay)}</td>
                <td className="num">{fmt.num(r.total_deduction)}</td>
                <td className="num"><b>{fmt.num(r.net_pay)}</b></td>
                <td>
                  <Link to={`/payroll/${r.id}`}><button className="ghost sm">명세서</button></Link>
                  {isAdmin && (
                    <button className="sm" style={{ marginLeft: 4 }} onClick={() => calcOne(r.employee_id)} disabled={loading}>재계산</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}>
                계산된 급여가 없습니다. {isAdmin && '“전사 일괄 계산”을 눌러보세요.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
