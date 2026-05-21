import { useEffect, useState } from 'react';
import { api } from '../api.js';

const sections = [
  {
    title: '4대보험 요율 (근로자 부담분, %)',
    keys: [
      ['rate_national_pension', '국민연금'],
      ['rate_health_insurance', '건강보험'],
      ['rate_long_term_care', '장기요양 (건보료 대비)'],
      ['rate_employment_insurance', '고용보험']
    ]
  },
  {
    title: '근로기준',
    keys: [
      ['standard_hours_per_day', '1일 표준근로시간'],
      ['standard_hours_per_week', '1주 표준근로시간'],
      ['overtime_multiplier', '연장근로 가산배수'],
      ['night_multiplier', '야간근로 추가배수'],
      ['holiday_multiplier_8h', '휴일 8h 이내 배수'],
      ['holiday_multiplier_over_8h', '휴일 8h 초과 배수']
    ]
  },
  {
    title: '연차정책',
    keys: [
      ['annual_leave_basis', '산정 기준 (hire_date | fiscal_year)'],
      ['fiscal_year_start_month', '회계연도 시작월']
    ]
  },
  {
    title: '회사정보',
    keys: [
      ['company_name', '회사명'],
      ['company_ceo', '대표자'],
      ['company_brn', '사업자등록번호'],
      ['company_address', '주소']
    ]
  }
];

export default function Settings() {
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.settings.get().then(setValues); }, []);

  async function save() {
    const next = await api.settings.update(values);
    setValues(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="page-header">
        <div><h1>설정</h1><div className="sub">법정 요율·근로기준·회사정보를 관리</div></div>
        <button onClick={save}>{saved ? '저장됨' : '저장'}</button>
      </div>

      {sections.map(sec => (
        <div className="card" key={sec.title}>
          <h2>{sec.title}</h2>
          <div className="grid grid-2">
            {sec.keys.map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  value={values[key] ?? ''}
                  onChange={e => setValues({ ...values, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
