import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT key, value FROM user_preferences').all() as { key: string; value: string }[];
  const prefs: Record<string, unknown> = {};
  for (const r of rows) { try { prefs[r.key] = JSON.parse(r.value); } catch { prefs[r.key] = r.value; } }
  res.json(prefs);
});

router.put('/', (req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(req.body)) stmt.run(k, JSON.stringify(v));
  res.json({ success: true });
});

export default router;
