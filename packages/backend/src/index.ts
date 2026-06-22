import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { migrate } from './db/database';
import sourcesRouter from './routes/sources';
import dashboardsRouter from './routes/dashboards';
import preferencesRouter from './routes/preferences';

const app = express();
const PORT = process.env.PORT || 3001;

migrate();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/sources', sourcesRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/preferences', preferencesRouter);

app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`ExcelBoard API running on http://localhost:${PORT}`));
