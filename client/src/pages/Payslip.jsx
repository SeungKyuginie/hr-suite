import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, fmt } from '../api.js';

export default function Payslip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [slip, setSlip] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.payroll.get(id).then(setSlip);
    api.settings.get().then(setSettings);
  }, [id]);

  if (!slip) return <div className="card">로딩중...</div>;

  return (
    <>
      <div className="page-header">
        <button className="ghost" onClick={() => navigate(-1)}>← 목록</button>
        <button onClick={() => window.print()}>인쇄</button>
      </div>

      <div className="payslip">
        <h2>{fmt.ym(slip.year, slip.month)} 급여명세서</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
          <div>
            <div><b>{settings.company_name}</b></div>
            <div>대표 {settings.company_ceo} · 사업자 {settings.company_brn}</div>
            <div>{settings.company_address}</div>
          </div>
          <div>
            <div>사번 {slip.emp_no}</div>
            <div>성명 <b>{slip.employee_name}</b></div>
            <div>{slip.department} / {slip.position}</div>
            <div>입사일 {fmt.date(slip.hire_date)}</div>
          </div>
        </div>

        <table>
          <thead><tr><th colSpan={2}>지급내역</th><th colSpan={2}>공제내역</th></tr></thead>
          <tbody>
            <tr>
              <td>기본급</td><td className="num">{fmt.won(slip.base_salary)}</td>
              <td>국민연금</td><td className="num">{fmt.won(slip.national_pension)}</td>
            </tr>
            <tr>
              <td>연장수당</td><td className="num">{fmt.won(slip.overtime_pay)}</td>
              <td>건강보험</td><td className="num">{fmt.won(slip.health_insurance)}</td>
            </tr>
            <tr>
              <td>야간수당</td><td className="num">{fmt.won(slip.night_pay)}</td>
              <td>장기요양</td><td className="num">{fmt.won(slip.long_term_care)}</td>
            </tr>
            <tr>
              <td>휴일수당</td><td className="num">{fmt.won(slip.holiday_pay)}</td>
              <td>고용보험</td><td className="num">{fmt.won(slip.employment_insurance)}</td>
            </tr>
            <tr>
              <td>식대(비과세)</td><td className="num">{fmt.won(slip.meal_allowance)}</td>
              <td>소득세</td><td className="num">{fmt.won(slip.income_tax)}</td>
            </tr>
            <tr>
              <td></td><td></td>
              <td>지방소득세</td><td className="num">{fmt.won(slip.local_tax)}</td>
            </tr>
            <tr className="total">
              <td>총 지급액</td><td className="num">{fmt.won(slip.gross_pay)}</td>
              <td>총 공제액</td><td className="num">{fmt.won(slip.total_deduction)}</td>
            </tr>
            <tr className="total">
              <td colSpan={3} style={{ textAlign: 'right' }}>실지급액</td>
              <td className="num">{fmt.won(slip.net_pay)}</td>
            </tr>
          </tbody>
        </table>

        {slip.detail && (
          <div style={{ marginTop: 18, fontSize: 12, color: 'var(--text-dim)' }}>
            <b>근로내역</b> · 정규 {slip.detail.monthAgg.regular}h · 연장 {slip.detail.monthAgg.overtime}h ·
            야간 {slip.detail.monthAgg.night}h · 휴일 {slip.detail.monthAgg.holiday + slip.detail.monthAgg.holidayOver8}h ·
            근무일 {slip.detail.monthAgg.days}일 · 통상시급 {fmt.won(slip.detail.hourly)}
          </div>
        )}
      </div>
    </>
  );
}
