import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
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

  useEffect(() => {
    api.employees.list().then(list => {
      setEmployees(list);
      if (!currentId && list.length) setCurrentId(list[0].id);
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (currentId) localStorage.setItem('currentEmployeeId', String(currentId));
  }, [currentId]);

  const currentUser = employees.find(e => e.id === currentId);
  const isAdmin = !!currentUser?.is_admin;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">HR Suite</div>
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>대시보드</NavLink>
        <NavLink to="/attendance" className={({ isActive }) => isActive ? 'active' : ''}>근태관리</NavLink>
        <NavLink to="/leave" className={({ isActive }) => isActive ? 'active' : ''}>휴가관리</NavLink>
        <NavLink to="/payroll" className={({ isActive }) => isActive ? 'active' : ''}>급여관리</NavLink>
        {isAdmin && <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>직원관리</NavLink>}
        {isAdmin && <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>설정</NavLink>}
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
