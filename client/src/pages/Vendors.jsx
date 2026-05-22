import { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';

const empty = {
  name: '', biz_no: '', ceo: '', contact_name: '', contact_phone: '',
  email: '', address: '', payment_terms: 30,
  bank_name: '', bank_account: '', category: '', memo: ''
};

export default function Vendors() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function reload() {
    setRows(await api.vendors.list({ q: q || undefined }));
  }
  useEffect(() => { reload(); }, [q]);

  async function save(e) {
    e.preventDefault();
    if (editingId) {
      await api.vendors.update(editingId, draft);
    } else {
      await api.vendors.create(draft);
    }
    setDraft(empty);
    setEditingId(null);
    reload();
  }
  function edit(v) {
    setEditingId(v.id);
    setDraft({
      name: v.name, biz_no: v.biz_no ?? '', ceo: v.ceo ?? '',
      contact_name: v.contact_name ?? '', contact_phone: v.contact_phone ?? '',
      email: v.email ?? '', address: v.address ?? '',
      payment_terms: v.payment_terms ?? 30,
      bank_name: v.bank_name ?? '', bank_account: v.bank_account ?? '',
      category: v.category ?? '', memo: v.memo ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.vendors.remove(id);
      reload();
    } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="page-header">
        <div><h1>거래처 관리</h1><div className="sub">협력업체·매입처 마스터, 결제조건/계좌 관리</div></div>
      </div>

      <div className="card">
        <h2>{editingId ? '거래처 수정' : '거래처 등록'}</h2>
        <form onSubmit={save}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ flex: 2, minWidth: 180 }}>
              <label>상호 *</label>
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>사업자번호</label>
              <input value={draft.biz_no} onChange={e => setDraft({ ...draft, biz_no: e.target.value })} placeholder="000-00-00000" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 100 }}>
              <label>대표자</label>
              <input value={draft.ceo} onChange={e => setDraft({ ...draft, ceo: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 100 }}>
              <label>품목</label>
              <input value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label>담당자</label>
              <input value={draft.contact_name} onChange={e => setDraft({ ...draft, contact_name: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label>연락처</label>
              <input value={draft.contact_phone} onChange={e => setDraft({ ...draft, contact_phone: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 100 }}>
              <label>결제조건(일)</label>
              <input type="number" value={draft.payment_terms} onChange={e => setDraft({ ...draft, payment_terms: Number(e.target.value) })} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 110 }}>
              <label>은행</label>
              <input value={draft.bank_name} onChange={e => setDraft({ ...draft, bank_name: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1.5, minWidth: 160 }}>
              <label>계좌번호</label>
              <input value={draft.bank_account} onChange={e => setDraft({ ...draft, bank_account: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <button type="submit">{editingId ? '수정 저장' : '등록'}</button>
            {editingId && <button type="button" className="ghost" onClick={() => { setEditingId(null); setDraft(empty); }}>취소</button>}
          </div>
        </form>
      </div>

      <div className="toolbar">
        <input placeholder="상호/사업자번호/품목 검색" value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 240 }} />
        <span className="spacer" />
        <span className="sub">총 {rows.length}개</span>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>상호</th><th>사업자번호</th><th>품목</th>
              <th>담당자</th><th>결제조건</th><th>계좌</th>
              <th className="num">미지급 잔액</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(v => (
              <tr key={v.id}>
                <td><b>{v.name}</b><br /><span className="sub">{v.ceo ?? '-'}</span></td>
                <td>{v.biz_no ?? '-'}</td>
                <td>{v.category ?? '-'}</td>
                <td>{v.contact_name ?? '-'}<br /><span className="sub">{v.contact_phone ?? ''}</span></td>
                <td>{v.payment_terms}일</td>
                <td>{v.bank_name ?? '-'}<br /><span className="sub">{v.bank_account ?? ''}</span></td>
                <td className="num" style={{ color: v.unpaid_balance > 0 ? 'var(--warning)' : undefined }}>
                  {fmt.won(v.unpaid_balance)}
                </td>
                <td>
                  <button className="ghost sm" onClick={() => edit(v)}>수정</button>{' '}
                  <button className="danger sm" onClick={() => remove(v.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
