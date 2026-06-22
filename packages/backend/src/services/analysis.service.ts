import * as XLSX from 'xlsx';

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

const DATE_NAME_KEYWORDS = [
  'date', 'time', 'day', 'month', 'year', 'dt', 'created', 'updated',
  'timestamp', 'dob', 'birth', 'expir', 'due', 'start', 'end', 'period',
  'invoice', 'order', 'delivery', 'dispatch', 'entry', 'posted', 'tran',
];

function columnNameHintsDate(name: string): boolean {
  const lower = name.toLowerCase();
  return DATE_NAME_KEYWORDS.some(k => lower.includes(k));
}

function isExcelSerialDate(v: unknown): boolean {
  const n = Number(v);
  // Excel serial dates: 1 = 1900-01-01, ~73000 = year 2100
  return !isNaN(n) && n > 1 && n < 73000 && Number.isInteger(n);
}

function isDateString(v: unknown): boolean {
  if (v instanceof Date) return true;
  const s = String(v).trim();
  return (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) ||          // 2024-01-15, 2024/01/15
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(s) ||          // 15-01-2024, 01/15/2024
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s) || // Jan 2024
    /^\d{4}-(0[1-9]|1[0-2])$/.test(s)                   // 2024-01
  );
}

function serialDateToISO(serial: number): string {
  // Excel serial: days since 1899-12-30 (with leap year bug)
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return utc.toISOString().slice(0, 10);
}

// Convert Date objects and Excel serials to ISO strings in row data
function normalizeRow(
  row: Record<string, unknown>,
  dateColumns: Set<string>,
  serialDateColumns: Set<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) {
      out[k] = v.toISOString().slice(0, 10);
    } else if (serialDateColumns.has(k) && typeof v === 'number' && isExcelSerialDate(v)) {
      out[k] = serialDateToISO(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function detectType(values: unknown[], columnName = ''): ColumnMeta['dataType'] {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  const nameHintsDate = columnNameHintsDate(columnName);

  // 1. Check if values are JS Date objects (SheetJS with cellDates:true)
  const dateObjCount = nonNull.filter(v => v instanceof Date).length;
  if (dateObjCount / nonNull.length > 0.5) return 'date';

  // 2. Check for Excel serial date numbers (only if column name hints date)
  if (nameHintsDate) {
    const serialCount = nonNull.filter(v => typeof v === 'number' && isExcelSerialDate(v)).length;
    if (serialCount / nonNull.length > 0.7) return 'date';
  }

  // 3. Check for date strings
  const dateStringCount = nonNull.filter(v => !(v instanceof Date) && isDateString(v)).length;
  if (dateStringCount / nonNull.length > 0.6) return 'date';

  // 4. Numeric check (AFTER date to avoid swallowing serial dates)
  const numericCount = nonNull.filter(v => !isNaN(Number(v)) && v !== '' && !(v instanceof Date)).length;
  // If column name hints date and most values could be serials, prefer date
  if (nameHintsDate && numericCount / nonNull.length > 0.85) {
    const serialCount = nonNull.filter(v => typeof v === 'number' && isExcelSerialDate(v)).length;
    if (serialCount / nonNull.length > 0.5) return 'date';
  }
  if (numericCount / nonNull.length > 0.85) return 'numeric';

  // 5. Boolean
  const boolCount = nonNull.filter(v =>
    ['true', 'false', 'yes', 'no', '1', '0'].includes(String(v).toLowerCase())
  ).length;
  if (boolCount / nonNull.length > 0.9) return 'boolean';

  // 6. Categorical (low cardinality)
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
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rawRows.length === 0) {
    return { sheetNames, activeSheet, rowCount: 0, columnCount: 0, columns: [], preview: [] };
  }

  const colNames = Object.keys(rawRows[0]);

  // First pass: detect types on raw values
  const columns: ColumnMeta[] = colNames.map(name => {
    const values = rawRows.map(r => r[name]);
    const dataType = detectType(values, name);
    return { name, displayName: name, dataType, stats: calcStats(values, dataType) };
  });

  // Build sets for normalization
  const dateColumns = new Set(columns.filter(c => c.data_type === 'date').map(c => c.name));
  const serialDateColumns = new Set(
    columns
      .filter(c => c.data_type === 'date')
      .filter(c => {
        const sample = rawRows.slice(0, 5).map(r => r[c.name]).filter(v => v !== null);
        return sample.some(v => typeof v === 'number' && isExcelSerialDate(v));
      })
      .map(c => c.name)
  );

  // Normalize all rows (convert Date objects & serial numbers to ISO strings)
  const rows = rawRows.map(r => normalizeRow(r, dateColumns, serialDateColumns));

  // Recompute stats on normalized values for date columns
  const finalColumns: ColumnMeta[] = columns.map(col => {
    if (col.dataType === 'date') {
      const normalizedVals = rows.map(r => r[col.name]);
      return { ...col, stats: calcStats(normalizedVals, 'date') };
    }
    return col;
  });

  return {
    sheetNames,
    activeSheet,
    rowCount: rows.length,
    columnCount: colNames.length,
    columns: finalColumns,
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
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rawRows.length === 0) return { data: [], total: 0 };

  const colNames = Object.keys(rawRows[0]);

  // Detect which columns are dates for normalization
  const colTypes = new Map<string, string>();
  for (const name of colNames) {
    const vals = rawRows.slice(0, 50).map(r => r[name]);
    colTypes.set(name, detectType(vals, name));
  }
  const dateColumns = new Set([...colTypes.entries()].filter(([, t]) => t === 'date').map(([n]) => n));
  const serialDateColumns = new Set(
    [...dateColumns].filter(name => {
      const sample = rawRows.slice(0, 5).map(r => r[name]).filter(v => v !== null);
      return sample.some(v => typeof v === 'number' && isExcelSerialDate(v));
    })
  );

  let rows = rawRows.map(r => normalizeRow(r, dateColumns, serialDateColumns));

  // Apply filters
  for (const [col, val] of Object.entries(filters)) {
    if (val) rows = rows.filter(r => String(r[col] ?? '').toLowerCase().includes(val.toLowerCase()));
  }

  const total = rows.length;
  if (pageSize <= 0 || pageSize >= 999999) {
    return { data: rows, total };
  }
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), total };
}
