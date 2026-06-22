import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { analyzeFile, getSheetData } from '../services/analysis.service';
import { getAuthUrl, exchangeCode, downloadOneDriveFile } from '../services/onedrive.service';
import { testAzureConnection, listAzureBlobs, downloadAzureBlob } from '../services/azure.service';
import { testLookerConnection, listLookerLooks, downloadLookAsExcel } from '../services/looker.service';

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.xlsx', '.xls', '.xlsm'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

type Row = Record<string, unknown>;

function saveSource(data: Row) {
  const db = getDb();
  db.prepare(`
    INSERT INTO data_sources (id, name, source_type, connection_config, file_path, last_synced_at, row_count, column_count, sheet_names, active_sheet, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.name, data.source_type, data.connection_config ?? null,
    data.file_path ?? null, data.last_synced_at, data.row_count, data.column_count,
    data.sheet_names, data.active_sheet, data.status
  );
}

function updateSourceColumns(sourceId: string, columns: { name: string; displayName: string; dataType: string; stats: object }[]) {
  const db = getDb();
  db.prepare('DELETE FROM source_columns WHERE source_id = ?').run(sourceId);
  const stmt = db.prepare('INSERT INTO source_columns (id, source_id, name, display_name, data_type, stats) VALUES (?, ?, ?, ?, ?, ?)');
  for (const col of columns) stmt.run(uuidv4(), sourceId, col.name, col.displayName, col.dataType, JSON.stringify(col.stats));
}

function parseSource(s: Row): Row {
  return { ...s, sheet_names: JSON.parse(s.sheet_names as string || '[]') };
}

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const id = uuidv4();
    const analysis = analyzeFile(req.file.path);
    saveSource({
      id, name: req.body.name || req.file.originalname, source_type: 'local',
      connection_config: null, file_path: req.file.path,
      last_synced_at: Math.floor(Date.now() / 1000),
      row_count: analysis.rowCount, column_count: analysis.columnCount,
      sheet_names: JSON.stringify(analysis.sheetNames), active_sheet: analysis.activeSheet, status: 'connected',
    });
    updateSourceColumns(id, analysis.columns);
    res.json({ id, ...analysis });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const sources = db.prepare('SELECT * FROM data_sources ORDER BY created_at DESC').all() as Row[];
  res.json(sources.map(parseSource));
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!source) { res.status(404).json({ error: 'Not found' }); return; }
  const columns = (db.prepare('SELECT * FROM source_columns WHERE source_id = ?').all(req.params.id) as Row[])
    .map(c => ({ ...c, stats: JSON.parse(c.stats as string || '{}') }));
  res.json({ ...parseSource(source), columns });
});

router.get('/:id/data', (req: Request, res: Response) => {
  const db = getDb();
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!source || !source.file_path) { res.status(404).json({ error: 'Not found' }); return; }
  const page = Number(req.query.page) || 1;
  const requestedSize = Number(req.query.pageSize) || 100;
  // Allow unlimited fetch when pageSize=0 or >=999999; otherwise cap preview at 5000
  const pageSize = requestedSize >= 999999 || requestedSize <= 0 ? 0 : Math.min(requestedSize, 5000);
  const sheet = req.query.sheet as string || source.active_sheet as string;
  const filters: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (k.startsWith('filter_')) filters[k.slice(7)] = v as string;
  }
  res.json(getSheetData(source.file_path as string, sheet, page, pageSize, filters));
});

router.get('/:id/stats', (req: Request, res: Response) => {
  const db = getDb();
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!source || !source.file_path) { res.status(404).json({ error: 'Not found' }); return; }
  const requestedSheet = req.query.sheet as string | undefined;
  const analysis = analyzeFile(source.file_path as string, requestedSheet);
  // Refresh stored columns when querying the active (or default) sheet
  const effectiveSheet = requestedSheet || source.active_sheet as string;
  if (!requestedSheet || requestedSheet === source.active_sheet) {
    updateSourceColumns(req.params.id, analysis.columns);
  }
  res.json(analysis);
});

router.post('/:id/refresh', (req: Request, res: Response) => {
  const db = getDb();
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!source) { res.status(404).json({ error: 'Not found' }); return; }
  try {
    if (source.file_path && fs.existsSync(source.file_path as string)) {
      // Pass active_sheet so analysis uses the correct sheet
      const analysis = analyzeFile(source.file_path as string, source.active_sheet as string || undefined);
      db.prepare('UPDATE data_sources SET row_count=?, column_count=?, last_synced_at=?, sheet_names=? WHERE id=?')
        .run(analysis.rowCount, analysis.columnCount, Math.floor(Date.now() / 1000), JSON.stringify(analysis.sheetNames), req.params.id);
      updateSourceColumns(req.params.id, analysis.columns);
      res.json({ success: true, ...analysis });
    } else { res.status(400).json({ error: 'File not found on disk' }); }
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id) as Row | undefined;
  if (!source) { res.status(404).json({ error: 'Not found' }); return; }
  if (source.file_path && fs.existsSync(source.file_path as string)) try { fs.unlinkSync(source.file_path as string); } catch { /* ignore */ }
  db.prepare('DELETE FROM data_sources WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  if (req.body.name) db.prepare('UPDATE data_sources SET name=? WHERE id=?').run(req.body.name, req.params.id);
  if (req.body.active_sheet) db.prepare('UPDATE data_sources SET active_sheet=? WHERE id=?').run(req.body.active_sheet, req.params.id);
  res.json({ success: true });
});

router.get('/onedrive/auth', (req: Request, res: Response) => {
  const state = uuidv4();
  res.json({ authUrl: getAuthUrl(state), state });
});

router.get('/onedrive/callback', async (req: Request, res: Response) => {
  try {
    const tokens = await exchangeCode(req.query.code as string);
    res.json({ success: true, ...tokens });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/onedrive/import', async (req: Request, res: Response) => {
  try {
    const { accessToken, driveItemId, name } = req.body;
    const id = uuidv4();
    const filePath = path.join(UPLOAD_DIR, `${id}.xlsx`);
    await downloadOneDriveFile(accessToken, driveItemId, filePath);
    const analysis = analyzeFile(filePath);
    saveSource({ id, name: name || `OneDrive-${id}`, source_type: 'onedrive', connection_config: JSON.stringify(req.body), file_path: filePath, last_synced_at: Math.floor(Date.now() / 1000), row_count: analysis.rowCount, column_count: analysis.columnCount, sheet_names: JSON.stringify(analysis.sheetNames), active_sheet: analysis.activeSheet, status: 'connected' });
    updateSourceColumns(id, analysis.columns);
    res.json({ id, ...analysis });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/azure/test', async (req: Request, res: Response) => {
  try { res.json(await testAzureConnection(req.body.connectionString)); } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/azure/blobs', async (req: Request, res: Response) => {
  try { res.json({ blobs: await listAzureBlobs(req.body.connectionString, req.body.container) }); } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/azure/import', async (req: Request, res: Response) => {
  try {
    const { connectionString, container, blobName, name } = req.body;
    const id = uuidv4();
    const filePath = path.join(UPLOAD_DIR, `${id}.xlsx`);
    await downloadAzureBlob(connectionString, container, blobName, filePath);
    const analysis = analyzeFile(filePath);
    saveSource({ id, name: name || blobName, source_type: 'azure', connection_config: JSON.stringify({ connectionString, container, blobName }), file_path: filePath, last_synced_at: Math.floor(Date.now() / 1000), row_count: analysis.rowCount, column_count: analysis.columnCount, sheet_names: JSON.stringify(analysis.sheetNames), active_sheet: analysis.activeSheet, status: 'connected' });
    updateSourceColumns(id, analysis.columns);
    res.json({ id, ...analysis });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/looker/test', async (req: Request, res: Response) => {
  const ok = await testLookerConnection(req.body);
  res.json({ success: ok });
});

router.post('/looker/looks', async (req: Request, res: Response) => {
  try { res.json(await listLookerLooks(req.body)); } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/looker/import', async (req: Request, res: Response) => {
  try {
    const { baseUrl, clientId, clientSecret, lookId, name } = req.body;
    const id = uuidv4();
    const filePath = path.join(UPLOAD_DIR, `${id}.xlsx`);
    await downloadLookAsExcel({ baseUrl, clientId, clientSecret }, lookId, filePath);
    const analysis = analyzeFile(filePath);
    saveSource({ id, name: name || `Look-${lookId}`, source_type: 'looker', connection_config: JSON.stringify({ baseUrl, clientId, clientSecret, lookId }), file_path: filePath, last_synced_at: Math.floor(Date.now() / 1000), row_count: analysis.rowCount, column_count: analysis.columnCount, sheet_names: JSON.stringify(analysis.sheetNames), active_sheet: analysis.activeSheet, status: 'connected' });
    updateSourceColumns(id, analysis.columns);
    res.json({ id, ...analysis });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/url/import', async (req: Request, res: Response) => {
  try {
    const { url, name, headers: customHeaders } = req.body;
    const id = uuidv4();
    const filePath = path.join(UPLOAD_DIR, `${id}.xlsx`);
    const response = await fetch(url, { headers: customHeaders || {} });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fs.writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
    const analysis = analyzeFile(filePath);
    saveSource({ id, name: name || url.split('/').pop() || 'URL Import', source_type: 'url', connection_config: JSON.stringify({ url }), file_path: filePath, last_synced_at: Math.floor(Date.now() / 1000), row_count: analysis.rowCount, column_count: analysis.columnCount, sheet_names: JSON.stringify(analysis.sheetNames), active_sheet: analysis.activeSheet, status: 'connected' });
    updateSourceColumns(id, analysis.columns);
    res.json({ id, ...analysis });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
