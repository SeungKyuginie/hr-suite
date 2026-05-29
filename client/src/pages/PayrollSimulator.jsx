import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const presets = [
  { label: '최저시급(2026)', base_salary: 2156880, overtime_hours: 0, night_hours: 0, holiday_hours: 0 },
  { label: '월 300만원',     base_salary: 3000000, overtime_hours: 0, night_hours: 0, holiday_hours: 0 },
  { label: '월 400만원 + 연장 20h', base_salary: 4000000, overtime_hours: 20, night_hours: 0, holiday_hours: 0 },
  { label: '월 500만원',     base_salary: 5000000, overtime_hours: 0, night_hours: 0, holiday_hours: 0 }
];

const initial = {
  base_salary: 3000000,
  dependents: 1,
  children_under_20: 0,
  meal_allowance: 200000,
  overtime_hours: 0,
  night_hours: 0,
  holiday_hours: 0
};

export default function PayrollSimulator() {
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(snapshot = form) {
    setBusy(true);
    try {
      const r = await api.payroll.simulate(snapshot);
      setResult(r);
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  useEffect(() => { run(initial); }, []);

  function set(k, v) {
    const next = { ...form, [k]: Number(v) || 0 };
    setForm(next);
  }

  function applyPreset(p) {
    const next = { ...form, ...p };
    delete next.label;
    setForm(next);
    run(next);
  }

  const num = (label, key, opts = {}) => (
    <div className="field" style={{ flex: 1, minWidth: 130 }}>
      <label>{label}{opts.hint && <span style={{ color: 'var(--text-dim)' }}> · {opts.hint}</span>}</label>
      <input type="number" min={0} value={form[key]} onChange={e => set(key, e.target.value)} />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>급여 시뮬레이션</h1>
          <div className="sub">가상 조건으로 실수령액·4대보험·세금을 미리 계산 (저장되지 않음)</div>
        </div>
        <div className="form-row">
          {presets.map(p => (
            <button key={p.label} type="button" className="ghost sm" onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>입력 조건</h2>
        <div className="form-row" style={{ marginBottom: 10 }}>
          {num('월 기본급', 'base_salary')}
          {num('식대(비과세)', 'meal_allowance', { hint: '월 20만 한도' })}
          {num('부양가족 수', 'dependents', { hint: '본인 포함' })}
          {num('20세 이하 자녀', 'children_under_20')}
        </div>
        <div className="form-row" style={{ marginBottom: 10 }}>
          {num('월 연장근로 h', 'overtime_hours', { hint: '×1.5' })}
          {num('월 야간근로 h', 'night_hours', { hint: '+0.5' })}
          {num('월 휴일근로 h', 'holiday_hours', { hint: '×1.5' })}
        </div>
        <div className="form-row">
          <button onClick={() => run()} disabled={busy}>{busy ? '계산 중...' : '계산하기'}</button>
          <button type="button" className="ghost" onClick={() => { setForm(initial); run(initial); }}>초기화</button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-4">
            <div className="card kpi">
              <div className="label">실수령액 (월)</div>
              <div className="value" style={{ color: 'var(--primary)' }}>{fmt.won(result.net_pay)}</div>
              <div className="delta">연 {fmt.won(result.conversions.annual_net)}</div>
            </div>
            <div className="card kpi">
              <div className="label">총 지급액</div>
              <div className="value">{fmt.won(result.earnings.gross_pay)}</div>
              <div className="delta">과세 {fmt.won(result.earnings.taxable)} · 비과세 {fmt.won(result.earnings.meal_allowance)}</div>
            </div>
            <div className="card kpi">
              <div className="label">총 공제액</div>
              <div className="value" style={{ color: 'var(--danger)' }}>{fmt.won(result.deductions.total)}</div>
              <div className="delta">공제율 {((result.deductions.total / result.earnings.gross_pay) * 100).toFixed(1)}%</div>
            </div>
            <div className="card kpi">
              <div className="label">통상시급</div>
              <div className="value">{fmt.won(result.hourly_ordinary)}</div>
              <div className="delta">
                {result.minimum_wage_year}년 최저 {fmt.won(result.minimum_wage_hourly)} · {result.hourly_ordinary >= result.minimum_wage_hourly
                  ? <span style={{ color: 'var(--success)' }}>OK</span>
                  : <span style={{ color: 'var(--danger)' }}>미달</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h2>지급 내역</h2>
              <table>
                <tbody>
                  <tr><td>기본급</td><td className="num">{fmt.won(result.earnings.base_salary)}</td></tr>
                  <tr><td>연장수당</td><td className="num">{fmt.won(result.earnings.overtime_pay)}</td></tr>
                  <tr><td>야간수당</td><td className="num">{fmt.won(result.earnings.night_pay)}</td></tr>
                  <tr><td>휴일수당</td><td className="num">{fmt.won(result.earnings.holiday_pay)}</td></tr>
                  <tr><td>식대(비과세)</td><td className="num">{fmt.won(result.earnings.meal_allowance)}</td></tr>
                  <tr style={{ fontWeight: 700 }}><td>총 지급액</td><td className="num">{fmt.won(result.earnings.gross_pay)}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>공제 내역</h2>
              <table>
                <tbody>
                  <tr><td>국민연금 ({result.rates.national_pension}%)</td><td className="num">{fmt.won(result.deductions.national_pension)}</td></tr>
                  <tr><td>건강보험 ({result.rates.health_insurance}%)</td><td className="num">{fmt.won(result.deductions.health_insurance)}</td></tr>
                  <tr><td>장기요양 ({result.rates.long_term_care}%)</td><td className="num">{fmt.won(result.deductions.long_term_care)}</td></tr>
                  <tr><td>고용보험 ({result.rates.employment_insurance}%)</td><td className="num">{fmt.won(result.deductions.employment_insurance)}</td></tr>
                  <tr><td>소득세 (간이세액 근사)</td><td className="num">{fmt.won(result.deductions.income_tax)}</td></tr>
                  <tr><td>지방소득세 (10%)</td><td className="num">{fmt.won(result.deductions.local_tax)}</td></tr>
                  <tr style={{ fontWeight: 700 }}><td>총 공제액</td><td className="num">{fmt.won(result.deductions.total)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>임금 환산</h2>
            <div className="grid grid-4">
              <div className="kpi"><div className="label">시급</div><div className="value">{fmt.won(result.conversions.hourly)}</div></div>
              <div className="kpi"><div className="label">일급 (8h)</div><div className="value">{fmt.won(result.conversions.daily_8h)}</div></div>
              <div className="kpi"><div className="label">주급 (40h)</div><div className="value">{fmt.won(result.conversions.weekly_40h)}</div></div>
              <div className="kpi"><div className="label">연봉</div><div className="value">{fmt.won(result.conversions.annual)}</div></div>
            </div>
          </div>

          <div className="notice">
            ⚠️ 본 시뮬레이션은 <b>참고용 근사 계산</b>입니다. 실 원천징수는 국세청 간이세액표를 기준으로 하며,
            건강보험 정산·국민연금 기준소득월액 상한 등 실무 변수에 따라 실제 금액과 차이가 있을 수 있습니다.
          </div>
        </>
      )}
    </>
  );
}
