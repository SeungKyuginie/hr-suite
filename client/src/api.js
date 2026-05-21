// Vite proxy: /api → http://localhost:4000
const base = '/api';

async function request(path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  employees: {
    list: () => request('/employees'),
    get: (id) => request(`/employees/${id}`),
    create: (body) => request('/employees', { method: 'POST', body }),
    update: (id, body) => request(`/employees/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/employees/${id}`, { method: 'DELETE' })
  },
  attendance: {
    list: (params = {}) => request('/attendance' + qs(params)),
    summary: (params) => request('/attendance/summary' + qs(params)),
    upsert: (body) => request('/attendance', { method: 'POST', body }),
    clockIn: (employee_id) => request('/attendance/clock-in', { method: 'POST', body: { employee_id } }),
    clockOut: (employee_id) => request('/attendance/clock-out', { method: 'POST', body: { employee_id } }),
    remove: (id) => request(`/attendance/${id}`, { method: 'DELETE' })
  },
  leave: {
    list: (params = {}) => request('/leave' + qs(params)),
    balance: (employee_id) => request(`/leave/balance/${employee_id}`),
    create: (body) => request('/leave', { method: 'POST', body }),
    decide: (id, body) => request(`/leave/${id}/decision`, { method: 'POST', body }),
    cancel: (id) => request(`/leave/${id}/cancel`, { method: 'POST' })
  },
  payroll: {
    list: (params = {}) => request('/payroll' + qs(params)),
    get: (id) => request(`/payroll/${id}`),
    calculate: (body) => request('/payroll/calculate', { method: 'POST', body }),
    calculateAll: (body) => request('/payroll/calculate-all', { method: 'POST', body })
  },
  settings: {
    get: () => request('/settings'),
    update: (body) => request('/settings', { method: 'PUT', body })
  }
};

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export const fmt = {
  won: (n) => (n == null ? '-' : Number(n).toLocaleString('ko-KR') + '원'),
  num: (n) => (n == null ? '-' : Number(n).toLocaleString('ko-KR')),
  date: (s) => (s ? s.slice(0, 10) : '-'),
  ym: (y, m) => `${y}년 ${String(m).padStart(2, '0')}월`
};
