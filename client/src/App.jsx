import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Attendance from './pages/Attendance.jsx';
import Leave from './pages/Leave.jsx';
import Payroll from './pages/Payroll.jsx';
import Payslip from './pages/Payslip.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [currentId, setCurrentId] = useState(() => {
    const saved = localStorage.getItem('currentEmployeeId');
    return saved ? Number(saved) : null;
  });
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.employees.list().then(list => {
      setEmployees(list);
      if (!currentId && list.length) setCurrentId(list[0].id);
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (currentId) localStorage.setItem('currentEmployeeId', String(currentId));
  }, [currentId]);

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  const currentUser = employees.find(e => e.id === currentId);
  const isAdmin = !!currentUser?.is_admin;

  const navLink = (to, label, opts = {}) => (
    <NavLink
      to={to}
      end={opts.end}
      className={({ isActive }) => isActive ? 'active' : ''}
      onClick={() => setNavOpen(false)}
    >
      {label}
    </NavLink>
  );

  return (
    <div className="layout">
      <div className="topbar">
        <button
          className="menu-toggle"
          aria-label="메뉴 열기"
          onClick={() => setNavOpen(o => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="brand">HR Suite</div>
      </div>

      <div
        className={`sidebar-backdrop${navOpen ? ' open' : ''}`}
        onClick={() => setNavOpen(false)}
      />

      <aside className={`sidebar${navOpen ? ' open' : ''}`}>
        <div className="brand">HR Suite</div>
        {navLink('/', '대시보드', { end: true })}
        {navLink('/attendance', '근태관리')}
        {navLink('/leave', '휴가관리')}
        {navLink('/payroll', '급여관리')}
        {isAdmin && navLink('/employees', '직원관리')}
        {isAdmin && navLink('/settings', '설정')}
        <div className="footer">
          <div style={{ marginBottom: 6, color: '#94a3b8' }}>현재 사용자</div>
          <select
            value={currentId ?? ''}
            onChange={e => setCurrentId(Number(e.target.value))}
            style={{ width: '100%' }}
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} {e.is_admin ? '(관리자)' : ''}
              </option>
            ))}
          </select>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard currentUser={currentUser} />} />
          <Route path="/attendance" element={<Attendance currentUser={currentUser} isAdmin={isAdmin} />} />
          <Route path="/leave" element={<Leave currentUser={currentUser} isAdmin={isAdmin} employees={employees} />} />
          <Route path="/payroll" element={<Payroll isAdmin={isAdmin} currentUser={currentUser} />} />
          <Route path="/payroll/:id" element={<Payslip />} />
          {isAdmin && <Route path="/employees" element={<Employees onChange={() => api.employees.list().then(setEmployees)} />} />}
          {isAdmin && <Route path="/settings" element={<Settings />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
