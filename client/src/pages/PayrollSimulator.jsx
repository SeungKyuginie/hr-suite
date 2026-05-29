import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const presets = [
  { label: '최저시급(2026)', mode: 'hourly',  hourly_wage: 10320, regular_hours: 209, overtime_hours: 0 },
  { label: '시급 12,000원·주5일 8h', mode: 'hourly', hourly_wage: 12000, regular_hours: 209, overtime_hours: 0 },
  { label: '월 300만원',     mode: 'monthly', base_salary: 3000000, regular_hours: 209, overtime_hours: 0 },
  { label: '월 400만·연장20h', mode: 'monthly', base_salary: 4000000, regular_hours: 209, overtime_hours: 20 },
  { label: '월 500만원',     mode: 'monthly', base_salary: 5000000, regular_hours: 209, overtime_hours: 0 }
];

const initialMonthly = {
  mode: 'monthly',
  base_salary: 3000000,
  hourly_wage: 0,
  regular_hours: 209,
  dependents: 1,
  children_under_20: 0,
  meal_allowance: 200000,
  overtime_hours: 0,
  night_hours: 0,
  holiday_hours: 0,
  employer_employment_extra_rate: 0.25,
  industrial_accident_rate: 0.7
};

export default function PayrollSimulator() {
  const [form, setForm] = useState(initialMonthly);
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

  useEffect(() => { run(initialMonthly); }, []);

  function set(k, v, autoRun = false) {
    const next = { ...form, [k]: typeof v === 'string' ? v : (Number(v) || 0) };
    setForm(next);
    if (autoRun) run(next);
  }

  function switchMode(mode) {
    const next = { ...form, mode };
    if (mode === 'hourly' && !next.hourly_wage) {
      next.hourly_wage = Math.round((next.base_salary || 3000000) / (next.regular_hours || 209));
    }
    if (mode === 'monthly' && !next.base_salary) {
      next.base_salary = Math.round((next.hourly_wage || 10320) * (next.regular_hours || 209));
    }
    setForm(next);
    run(next);
  }

  function bumpHours(field, delta) {
    const next = { ...form, [field]: Math.max(0, (Number(form[field]) || 0) + delta) };
    setForm(next);
    run(next);
  }

  function applyPreset(p) {
    const next = { ...initialMonthly, ...p };
    setForm(next);
    run(next);
  }

  const num = (label, key, opts = {}) => (
    <div className="field" style={{ flex: 1, minWidth: opts.minWidth ?? 130 }}>
      <label>{label}{opts.hint && <span style={{ color: 'var(--text-dim)' }}> · {opts.hint}</span>}</label>
      <input
        type="number" min={0} step={opts.step ?? 1}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        onBlur={() => run()}
      />
    </div>
  );

  const hoursInput = (label, key) => (
    <div className="field" style={{ flex: 1, minWidth: 160 }}>
      <label>{label} <span style={{ color: 'var(--text-dim)' }}>(h)</span></label>
      <div className="form-row" style={{ gap: 4 }}>
        <button type="button" className="ghost sm" onClick={() => bumpHours(key, -1)}>−1</button>
        <input
          type="number" min={0} value={form[key]}
          onChange={e => set(key, e.target.value)}
          onBlur={() => run()}
          style={{ width: 70, textAlign: 'center' }}
        />
        <button type="button" className="ghost sm" onClick={() => bumpHours(key, 1)}>+1</button>
        <button type="button" className="ghost sm" onClick={() => bumpHours(key, 5)}>+5</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>급여 시뮬레이션</h1>
          <div className="sub">실수령액 · 4대보험 · 사업주 부담까지 한번에 (저장되지 않음)</div>
        </div>
        <div className="form-row">
          {presets.map(p => (
            <button key={p.label} type="button" className="ghost sm" onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>입력 조건</h2>
        <div className="form-row" style={{ marginBottom: 12, gap: 6 }}>
          <button type="button" className={form.mode === 'monthly' ? '' : 'ghost'} onClick={() => switchMode('monthly')}>월급 기준</button>
          <button type="button" className={form.mode === 'hourly' ? '' : 'ghost'} onClick={() => switchMode('hourly')}>시급 기준 (역산)</button>
        </div>

        {form.mode === 'monthly' ? (
          <div className="form-row" style={{ marginBottom: 10 }}>
            {num('월 기본급', 'base_salary')}
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label>월 소정근로 (h)</label>
              <input type="number" value={form.regular_hours} onChange={e => set('regular_hours', e.target.value)} onBlur={() => run()} />
            </div>
            {num('식대(비과세)', 'meal_allowance', { hint: '월 20만 한도' })}
            {num('부양가족 수', 'dependents', { hint: '본인 포함' })}
            {num('20세 이하 자녀', 'children_under_20')}
          </div>
        ) : (
          <div className="form-row" style={{ marginBottom: 10 }}>
            {num('시급', 'hourly_wage', { hint: '원/시간' })}
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>월 소정근로 (h)</label>
              <div className="form-row" style={{ gap: 4 }}>
                <button type="button" className="ghost sm" onClick={() => bumpHours('regular_hours', -8)}>−8</button>
                <input type="number" value={form.regular_hours} onChange={e => set('regular_hours', e.target.value)} onBlur={() => run()} style={{ width: 80, textAlign: 'center' }} />
                <button type="button" className="ghost sm" onClick={() => bumpHours('regular_hours', 8)}>+8</button>
              </div>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label>→ 월급 (자동)</label>
              <input value={fmt.won(Math.round((form.hourly_wage || 0) * (form.regular_hours || 0)))} readOnly />
            </div>
            {num('식대(비과세)', 'meal_allowance')}
            {num('부양가족', 'dependents')}
            {num('자녀', 'children_under_20')}
          </div>
        )}

        <div className="form-row" style={{ marginBottom: 10 }}>
          {hoursInput('연장근로 ×1.5', 'overtime_hours')}
          {hoursInput('야간근로 +0.5', 'night_hours')}
          {hoursInput('휴일근로 ×1.5', 'holiday_hours')}
        </div>

        <div className="form-row" style={{ marginBottom: 10 }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>고용보험 사업주 가산 %<span style={{ color: 'var(--text-dim)' }}> · 안정/직업능력</span></label>
            <input type="number" step="0.05" value={form.employer_employment_extra_rate} onChange={e => set('employer_employment_extra_rate', e.target.value)} onBlur={() => run()} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>산재보험 요율 %<span style={{ color: 'var(--text-dim)' }}> · 업종별</span></label>
            <input type="number" step="0.05" value={form.industrial_accident_rate} onChange={e => set('industrial_accident_rate', e.target.value)} onBlur={() => run()} />
          </div>
          <div style={{ flex: 1, alignSelf: 'end' }}>
            <button onClick={() => run()} disabled={busy}>{busy ? '계산 중...' : '계산하기'}</button>{' '}
            <button type="button" className="ghost" onClick={() => { setForm(initialMonthly); run(initialMonthly); }}>초기화</button>
          </div>
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
              <div className="label">사업주 부담 (월)</div>
              <div className="value" style={{ color: 'var(--warning)' }}>{fmt.won(result.employer_burden.total)}</div>
              <div className="delta">총 인건비 {fmt.won(result.employer_total_cost)}</div>
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

          <div className="grid grid-3">
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
              <h2>직원 공제 내역</h2>
              <table>
                <tbody>
                  <tr><td>국민연금 ({result.rates.national_pension}%)</td><td className="num">{fmt.won(result.deductions.national_pension)}</td></tr>
                  <tr><td>건강보험 ({result.rates.health_insurance}%)</td><td className="num">{fmt.won(result.deductions.health_insurance)}</td></tr>
                  <tr><td>장기요양 ({result.rates.long_term_care}%)</td><td className="num">{fmt.won(result.deductions.long_term_care)}</td></tr>
                  <tr><td>고용보험 ({result.rates.employment_insurance}%)</td><td className="num">{fmt.won(result.deductions.employment_insurance)}</td></tr>
                  <tr><td>소득세</td><td className="num">{fmt.won(result.deductions.income_tax)}</td></tr>
                  <tr><td>지방소득세 (10%)</td><td className="num">{fmt.won(result.deductions.local_tax)}</td></tr>
                  <tr style={{ fontWeight: 700 }}><td>총 공제</td><td className="num">{fmt.won(result.deductions.total)}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>사업주 부담 내역</h2>
              <table>
                <tbody>
                  <tr><td>국민연금 ({result.rates.national_pension}%)</td><td className="num">{fmt.won(result.employer_burden.national_pension)}</td></tr>
                  <tr><td>건강보험 ({result.rates.health_insurance}%)</td><td className="num">{fmt.won(result.employer_burden.health_insurance)}</td></tr>
                  <tr><td>장기요양 ({result.rates.long_term_care}%)</td><td className="num">{fmt.won(result.employer_burden.long_term_care)}</td></tr>
                  <tr><td>고용보험 ({result.employer_burden.employment_insurance_total_rate}%)<br /><span className="sub">실업 {result.rates.employment_insurance}% + 안정/개발 {result.rates.employer_employment_extra}%</span></td><td className="num">{fmt.won(result.employer_burden.employment_insurance)}</td></tr>
                  <tr><td>산재보험 ({result.employer_burden.industrial_accident_rate}%)</td><td className="num">{fmt.won(result.employer_burden.industrial_accident)}</td></tr>
                  <tr style={{ fontWeight: 700 }}><td>총 사업주 부담</td><td className="num">{fmt.won(result.employer_burden.total)}</td></tr>
                  <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                    <td>회사 총 인건비</td><td className="num">{fmt.won(result.employer_total_cost)}</td>
                  </tr>
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
              <div className="kpi"><div className="label">연봉(총지급 기준)</div><div className="value">{fmt.won(result.conversions.annual)}</div></div>
            </div>
          </div>

          <div className="notice">
            ⚠️ 본 시뮬레이션은 <b>참고용 근사 계산</b>입니다. 실제 4대보험 정산·간이세액표·국민연금 기준소득월액 상한·산재 업종별 요율 등에 따라 실제 금액과 차이가 있습니다.
            <br />사업주 부담은 일반 사무직 표준(고용보험 안정/개발 가산 0.25%, 산재 0.7%) 기준이며, 업종에 따라 산재 요율을 조정해 입력하세요.
          </div>
        </>
      )}
    </>
  );
}
