import type { ColType, ColMeta } from '../types';

const DATE_KEYWORDS = [
  'date','time','day','month','year','dt','created','updated','timestamp',
  'dob','birth','expir','due','start','end','period','invoice','order',
  'delivery','dispatch','entry','posted','tran',
];

const DATE_STRING_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                          // 2024-01-15
  /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/,               // 15/01/2024 or 15-01-2024
  /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,         // 1/1/24
  /^\d{4}[\/\-]\d{2}[\/\-]\d{2}T\d{2}:\d{2}/,   // ISO datetime
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/,         // Jan 15, 2024
  /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/,            // 15 Jan 2024
];

function isExcelSerial(v: unknown): boolean {
  if (typeof v !== 'number') return false;
  return Number.isFinite(v) && v >= 1 && v <= 73000 && Math.floor(v) === v;
}

function excelSerialToDate(serial: number): string {
  // Excel date serial: 1 = Jan 1, 1900 (with the leap-year bug)
  const utcDays = serial - 25569; // offset to Unix epoch
  const ms = utcDays * 86400 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isDateString(s: string): boolean {
  for (const pat of DATE_STRING_PATTERNS) {
    if (pat.test(s.trim())) {
      const d = new Date(s.trim());
      return !isNaN(d.getTime());
    }
  }
  return false;
}

function colNameHasDateKeyword(name: string): boolean {
  const lower = name.toLowerCase();
  return DATE_KEYWORDS.some(k => lower.includes(k));
}

export function detectColumnType(values: unknown[], columnName: string): ColType {
  const nonNull = values.filter(v => v != null && v !== '');
  if (nonNull.length === 0) return 'text';

  // 1. Date objects
  if (nonNull.some(v => v instanceof Date)) return 'date';

  // 2. Column name hint + Excel serial check
  if (colNameHasDateKeyword(columnName)) {
    const numVals = nonNull.filter(v => typeof v === 'number') as number[];
    if (numVals.length > 0 && numVals.every(isExcelSerial)) return 'date';
  }

  // 3. Date string patterns
  const strVals = nonNull.map(v => String(v));
  const dateLike = strVals.filter(s => isDateString(s));
  if (dateLike.length / strVals.length >= 0.7) return 'date';

  // 4. Numeric
  const numericCount = nonNull.filter(v => {
    if (typeof v === 'number') return !isNaN(v);
    if (typeof v === 'string') return v.trim() !== '' && !isNaN(Number(v.replace(/[,\s]/g, '')));
    return false;
  }).length;
  if (numericCount / nonNull.length >= 0.8) return 'numeric';

  // 5. Boolean
  const boolSet = new Set(['true','false','yes','no','1','0','y','n']);
  const boolCount = nonNull.filter(v => boolSet.has(String(v).toLowerCase())).length;
  if (boolCount / nonNull.length >= 0.9) return 'boolean';

  // 6. Categorical: low cardinality relative to sample
  const unique = new Set(strVals).size;
  if (unique <= 20 || unique / strVals.length <= 0.2) return 'categorical';

  // 7. Default text
  return 'text';
}

export function normalizeRows(
  rows: Record<string, unknown>[],
  columns: { name: string; type: ColType }[],
): Record<string, unknown>[] {
  return rows.map(row => {
    const out: Record<string, unknown> = { ...row };
    for (const col of columns) {
      if (col.type !== 'date') continue;
      const v = row[col.name];
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        out[col.name] = `${y}-${m}-${d}`;
      } else if (typeof v === 'number' && isExcelSerial(v)) {
        out[col.name] = excelSerialToDate(v);
      }
    }
    return out;
  });
}

export function analyzeColumns(rows: Record<string, unknown>[]): ColMeta[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  return keys.map(name => {
    const values = rows.map(r => r[name]);
    const nonNull = values.filter(v => v != null && v !== '');
    const nullPct = values.length > 0 ? (values.length - nonNull.length) / values.length : 0;
    const uniqueCount = new Set(nonNull.map(String)).size;
    const sampleValues = Array.from(new Set(nonNull.map(String))).slice(0, 5);

    const data_type = detectColumnType(values, name);

    let min: number | undefined;
    let max: number | undefined;
    let avg: number | undefined;

    if (data_type === 'numeric') {
      const nums = nonNull
        .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\s]/g, '')))
        .filter(n => !isNaN(n));
      if (nums.length > 0) {
        min = Math.min(...nums);
        max = Math.max(...nums);
        avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      }
    }

    const display_name = name
      .replace(/[_\-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    return {
      name,
      display_name,
      data_type,
      stats: { min, max, avg, nullPct, uniqueCount, sampleValues },
    };
  });
}
