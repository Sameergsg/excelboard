import * as XLSX from 'xlsx';
import fs from 'fs';

export interface ColumnStats {
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  stdDev?: number;
  nullPct: number;
  uniqueCount: number;
  sampleValues: unknown[];
}

export interface ColumnMeta {
  name: string;
  displayName: string;
  dataType: 'numeric' | 'date' | 'text' | 'boolean' | 'categorical';
  stats: ColumnStats;
}

export interface AnalysisResult {
  sheetNames: string[];
  activeSheet: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  preview: Record<string, unknown>[];
}

function detectType(values: unknown[]): ColumnMeta['dataType'] {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  const numericCount = nonNull.filter(v => !isNaN(Number(v)) && v !== '').length;
  if (numericCount / nonNull.length > 0.85) return 'numeric';

  const dateCount = nonNull.filter(v => {
    if (typeof v === 'number') return false;
    const d = new Date(String(v));
    return !isNaN(d.getTime()) && String(v).length > 4;
  }).length;
  if (dateCount / nonNull.length > 0.7) return 'date';

  const boolCount = nonNull.filter(v =>
    ['true','false','yes','no','1','0'].includes(String(v).toLowerCase())
  ).length;
  if (boolCount / nonNull.length > 0.9) return 'boolean';

  const unique = new Set(nonNull.map(String));
  if (unique.size <= 50 && unique.size / nonNull.length < 0.3) return 'categorical';

  return 'text';
}

function calcStats(values: unknown[], type: ColumnMeta['dataType']): ColumnStats {
  const total = values.length;
  const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  const unique = new Set(nonNull.map(String));
  const sampleValues = Array.from(unique).slice(0, 5);

  const base: ColumnStats = {
    nullPct: total > 0 ? (nullCount / total) * 100 : 0,
    uniqueCount: unique.size,
    sampleValues,
  };

  if (type === 'numeric') {
    const nums = nonNull.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (nums.length > 0) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = sum / nums.length;
      const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length;
      base.min = nums[0];
      base.max = nums[nums.length - 1];
      base.avg = Math.round(avg * 100) / 100;
      base.median = nums[Math.floor(nums.length / 2)];
      base.stdDev = Math.round(Math.sqrt(variance) * 100) / 100;
    }
  }

  return base;
}

export function analyzeFile(filePath: string, sheetName?: string): AnalysisResult {
  const workbook = XLSX.readFile(filePath, { cellDates: true, dense: false });
  const sheetNames = workbook.SheetNames;
  const activeSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const sheet = workbook.Sheets[activeSheet];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rows.length === 0) {
    return { sheetNames, activeSheet, rowCount: 0, columnCount: 0, columns: [], preview: [] };
  }

  const colNames = Object.keys(rows[0]);
  const columns: ColumnMeta[] = colNames.map(name => {
    const values = rows.map(r => r[name]);
    const dataType = detectType(values);
    const stats = calcStats(values, dataType);
    return {
      name,
      displayName: name,
      dataType,
      stats,
    };
  });

  return {
    sheetNames,
    activeSheet,
    rowCount: rows.length,
    columnCount: colNames.length,
    columns,
    preview: rows.slice(0, 100),
  };
}

export function getSheetData(
  filePath: string,
  sheetName: string,
  page = 1,
  pageSize = 100,
  filters: Record<string, string> = {}
): { data: Record<string, unknown>[]; total: number } {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  let rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  for (const [col, val] of Object.entries(filters)) {
    if (val) rows = rows.filter(r => String(r[col] ?? '').toLowerCase().includes(val.toLowerCase()));
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), total };
}
