import { Router } from 'express';
import { getSettings, setSetting } from '../store.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(getSettings());
});

router.put('/', (req, res) => {
  const body = req.body ?? {};
  for (const [k, v] of Object.entries(body)) setSetting(k, v);
  res.json(getSettings());
});

export default router;
