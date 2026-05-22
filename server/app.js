// Express 앱 빌더 — 로컬(server/index.js)과 Vercel(api/index.js) 둘 다에서 import.
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { ensureBootstrapped } from './store.js';
import employees from './routes/employees.js';
import attendance from './routes/attendance.js';
import leave from './routes/leave.js';
import payroll from './routes/payroll.js';
import settings from './routes/settings.js';
import vendors from './routes/vendors.js';
import dailySales from './routes/dailySales.js';
import cardSettlements from './routes/cardSettlements.js';
import purchaseInvoices from './routes/purchaseInvoices.js';
import payables from './routes/payables.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp({ serveClient = true } = {}) {
  ensureBootstrapped();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
  app.use('/api/employees', employees);
  app.use('/api/attendance', attendance);
  app.use('/api/leave', leave);
  app.use('/api/payroll', payroll);
  app.use('/api/settings', settings);
  app.use('/api/vendors', vendors);
  app.use('/api/daily-sales', dailySales);
  app.use('/api/card-settlements', cardSettlements);
  app.use('/api/purchase-invoices', purchaseInvoices);
  app.use('/api/payables', payables);

  if (serveClient) {
    const clientDist = join(__dirname, '..', 'client', 'dist');
    if (existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get(/^(?!\/api).*/, (req, res) => res.sendFile(join(clientDist, 'index.html')));
    }
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  return app;
}
