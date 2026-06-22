// Uses Node.js 22.5+ built-in sqlite (no native compilation required)
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema';

const DB_PATH = process.env.DATABASE_PATH || './data/excelboard.db';

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

export function migrate(): void {
  const db = getDb();
  db.exec(SCHEMA_SQL);
  console.log('Database migrated successfully');
}
