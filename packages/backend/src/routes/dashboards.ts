import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

const router = Router();
type Row = Record<string, unknown>;

function parseDashboard(d: Row) {
  return { ...d, layout: JSON.parse(d.layout as string || '[]') };
}

router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM dashboards ORDER BY updated_at DESC').all() as Row[];
  res.json(rows.map(parseDashboard));
});

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { name = 'New Dashboard', description = '', theme = 'midnight-pro' } = req.body;
  db.prepare('INSERT INTO dashboards (id, name, description, theme, layout) VALUES (?, ?, ?, ?, ?)').run(id, name, description, theme, '[]');
  res.json({ id, name, description, theme, layout: [] });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const dash = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!dash) { res.status(404).json({ error: 'Not found' }); return; }
  const widgets = (db.prepare('SELECT * FROM widgets WHERE dashboard_id = ? ORDER BY created_at').all(req.params.id) as Row[])
    .map(w => ({ ...w, config: JSON.parse(w.config as string || '{}'), position: JSON.parse(w.position as string || '{}') }));
  res.json({ ...parseDashboard(dash), widgets });
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const { name, description, theme, layout } = req.body;
  const cur = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(req.params.id) as Row;
  if (!cur) { res.status(404).json({ error: 'Not found' }); return; }
  db.prepare('UPDATE dashboards SET name=?, description=?, theme=?, layout=?, updated_at=? WHERE id=?')
    .run(name ?? cur.name, description ?? cur.description, theme ?? cur.theme, layout ? JSON.stringify(layout) : cur.layout, now, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  getDb().prepare('DELETE FROM dashboards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/duplicate', (req: Request, res: Response) => {
  const db = getDb();
  const orig = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!orig) { res.status(404).json({ error: 'Not found' }); return; }
  const newId = uuidv4();
  db.prepare('INSERT INTO dashboards (id, name, description, theme, layout) VALUES (?, ?, ?, ?, ?)').run(newId, `${orig.name} (Copy)`, orig.description, orig.theme, orig.layout);
  const widgets = db.prepare('SELECT * FROM widgets WHERE dashboard_id = ?').all(req.params.id) as Row[];
  const stmt = db.prepare('INSERT INTO widgets (id, dashboard_id, widget_type, source_id, config, position) VALUES (?, ?, ?, ?, ?, ?)');
  for (const w of widgets) stmt.run(uuidv4(), newId, w.widget_type, w.source_id, w.config, w.position);
  res.json({ id: newId });
});

// Widget routes scoped under dashboards
router.post('/:id/widgets', (req: Request, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { widget_type, source_id, config, position } = req.body;
  db.prepare('INSERT INTO widgets (id, dashboard_id, widget_type, source_id, config, position) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, widget_type, source_id || null, JSON.stringify(config || {}), JSON.stringify(position || { x: 0, y: 0, w: 4, h: 3 }));
  db.prepare('UPDATE dashboards SET updated_at=? WHERE id=?').run(Math.floor(Date.now() / 1000), req.params.id);
  res.json({ id });
});

router.put('/:dashId/widgets/positions', (req: Request, res: Response) => {
  const db = getDb();
  const updates = req.body.positions as { id: string; position: object }[];
  const stmt = db.prepare('UPDATE widgets SET position=? WHERE id=?');
  for (const u of updates) stmt.run(JSON.stringify(u.position), u.id);
  res.json({ success: true });
});

router.put('/widgets/:widgetId', (req: Request, res: Response) => {
  const db = getDb();
  const { config, position, widget_type, source_id } = req.body;
  if (config !== undefined) db.prepare('UPDATE widgets SET config=? WHERE id=?').run(JSON.stringify(config), req.params.widgetId);
  if (position !== undefined) db.prepare('UPDATE widgets SET position=? WHERE id=?').run(JSON.stringify(position), req.params.widgetId);
  if (widget_type !== undefined) db.prepare('UPDATE widgets SET widget_type=? WHERE id=?').run(widget_type, req.params.widgetId);
  if (source_id !== undefined) db.prepare('UPDATE widgets SET source_id=? WHERE id=?').run(source_id, req.params.widgetId);
  res.json({ success: true });
});

router.delete('/widgets/:widgetId', (req: Request, res: Response) => {
  getDb().prepare('DELETE FROM widgets WHERE id = ?').run(req.params.widgetId);
  res.json({ success: true });
});

export default router;
