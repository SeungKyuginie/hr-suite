import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const empty = {
  emp_no: '', name: '', department: '', position: '', email: '', phone: '',
  hire_date: '', base_salary: 0, dependents: 1, children_under_20: 0, meal_allowance: 200000, is_admin: false
};

export default function Employees({ onChange }) {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);

  const reload = () => api.employees.list().then(setList);
  useEffect(() => { reload(); }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      if (editing.id) await api.employees.update(editing.id, editing);
      else await api.employees.create(editing);
      setEditing(null);
      reload();
      onChange?.();
    } catch (err) {
      alert(err.message);
    }
  }

  async function remove(id) {
    if (!confirm('삭제하시겠습니까? 관련 근태/휴가/급여 기록이 함께 삭제됩니다.')) return;
    await api.employees.remove(id);
    reload();
    onChange?.();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>직원관리</h1>
          <div className="sub">총 {list.length}명</div>
        </div>
        <button onClick={() => setEditing({ ...empty })}>+ 직원 추가</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>사번</th><th>이름</th><th>부서</th><th>직책</th>
              <th>입사일</th><th className="num">기본급</th><th className="num">부양</th>
              <th>권한</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id}>
                <td>{e.emp_no}</td>
                <td>{e.name}</td>
                <td>{e.department}</td>
                <td>{e.position}</td>
                <td>{fmt.date(e.hire_date)}</td>
                <td className="num">{fmt.won(e.base_salary)}</td>
                <td className="num">{e.dependents}</td>
                <td>{e.is_admin ? <span className="badge approved">관리자</span> : <span className="badge">일반</span>}</td>
                <td>
                  <button className="ghost sm" onClick={() => setEditing(e)}>수정</button>
                  <button className="danger sm" style={{ marginLeft: 4 }} onClick={() => remove(e.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="card">
          <h2>{editing.id ? '직원 수정' : '신규 직원 등록'}</h2>
          <form onSubmit={submit}>
            <div className="grid grid-3">
              <Field label="사번" value={editing.emp_no} onChange={v => setEditing({ ...editing, emp_no: v })} required />
              <Field label="이름" value={editing.name} onChange={v => setEditing({ ...editing, name: v })} required />
              <Field label="입사일" type="date" value={editing.hire_date ?? ''} onChange={v => setEditing({ ...editing, hire_date: v })} required />
              <Field label="부서" value={editing.department ?? ''} onChange={v => setEditing({ ...editing, department: v })} />
              <Field label="직책" value={editing.position ?? ''} onChange={v => setEditing({ ...editing, position: v })} />
              <Field label="이메일" type="email" value={editing.email ?? ''} onChange={v => setEditing({ ...editing, email: v })} />
              <Field label="전화" value={editing.phone ?? ''} onChange={v => setEditing({ ...editing, phone: v })} />
              <Field label="기본급(월)" type="number" value={editing.base_salary} onChange={v => setEditing({ ...editing, base_salary: Number(v) })} />
              <Field label="부양가족수(본인포함)" type="number" value={editing.dependents} onChange={v => setEditing({ ...editing, dependents: Number(v) })} />
              <Field label="20세이하 자녀수" type="number" value={editing.children_under_20} onChange={v => setEditing({ ...editing, children_under_20: Number(v) })} />
              <Field label="식대(비과세 한도내)" type="number" value={editing.meal_allowance} onChange={v => setEditing({ ...editing, meal_allowance: Number(v) })} />
              <div className="field">
                <label>관리자 권한</label>
                <select value={editing.is_admin ? '1' : '0'} onChange={e => setEditing({ ...editing, is_admin: e.target.value === '1' })}>
                  <option value="0">일반</option>
                  <option value="1">관리자</option>
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 14 }}>
              <button type="submit">{editing.id ? '저장' : '등록'}</button>
              <button type="button" className="ghost" onClick={() => setEditing(null)}>취소</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}
