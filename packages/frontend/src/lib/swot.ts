import type { ColMeta, SwotData } from '../types';

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

function numericCols(cols: ColMeta[]) {
  return cols.filter(c => c.data_type === 'numeric' && c.stats.avg != null);
}
function dateCols(cols: ColMeta[]) {
  return cols.filter(c => c.data_type === 'date');
}
function categoricalCols(cols: ColMeta[]) {
  return cols.filter(c => c.data_type === 'categorical');
}

export function computeInsights(cols: ColMeta[], rows: Record<string, unknown>[]): string[] {
  const insights: string[] = [];

  insights.push(`Dataset contains ${rows.length.toLocaleString()} rows across ${cols.length} columns.`);

  const highNull = cols.filter(c => c.stats.nullPct > 0.1);
  if (highNull.length > 0) {
    insights.push(`${highNull.length} column(s) have >10% missing values — highest: "${highNull[0].display_name}" at ${pct(highNull[0].stats.nullPct)}.`);
  } else {
    insights.push('Data completeness is strong — no columns exceed 10% missing values.');
  }

  const nums = numericCols(cols);
  if (nums.length > 0) {
    const widest = nums.reduce((a, b) => {
      const ra = (b.stats.max ?? 0) - (b.stats.min ?? 0);
      const rb = (a.stats.max ?? 0) - (a.stats.min ?? 0);
      return ra > rb ? b : a;
    });
    insights.push(`"${widest.display_name}" has the widest numeric range: ${fmt(widest.stats.min ?? 0)} – ${fmt(widest.stats.max ?? 0)} (avg ${fmt(widest.stats.avg ?? 0)}).`);
  }

  const cats = categoricalCols(cols);
  if (cats.length > 0) {
    const richest = cats.reduce((a, b) => b.stats.uniqueCount > a.stats.uniqueCount ? b : a);
    insights.push(`"${richest.display_name}" has the highest categorical diversity with ${richest.stats.uniqueCount} unique values.`);
  }

  const dates = dateCols(cols);
  if (dates.length > 0) {
    insights.push(`${dates.length} date/time column(s) detected — temporal analysis is available.`);
  }

  const highCardinality = cols.filter(c => c.stats.uniqueCount === rows.length && c.data_type === 'text');
  if (highCardinality.length > 0) {
    insights.push(`"${highCardinality[0].display_name}" appears to be a unique identifier column (100% unique values).`);
  }

  return insights.slice(0, 6);
}

export function computeSWOT(cols: ColMeta[], rows: Record<string, unknown>[]): SwotData {
  const nums = numericCols(cols);
  const dates = dateCols(cols);
  const cats = categoricalCols(cols);
  const highNull = cols.filter(c => c.stats.nullPct > 0.15);
  const totalNull = cols.reduce((s, c) => s + c.stats.nullPct, 0) / Math.max(cols.length, 1);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Strengths
  if (rows.length >= 1000) strengths.push(`Large dataset with ${rows.length.toLocaleString()} rows provides statistically reliable insights.`);
  else if (rows.length >= 100) strengths.push(`Dataset with ${rows.length.toLocaleString()} rows is sufficient for trend analysis.`);
  if (totalNull < 0.05) strengths.push('Excellent data completeness — overall missing rate below 5%.');
  if (nums.length >= 3) strengths.push(`${nums.length} numeric columns enable rich quantitative analysis and aggregation.`);
  if (dates.length >= 1) strengths.push('Temporal columns present — time-series and trend analysis is possible.');

  // Weaknesses
  if (highNull.length > 0) weaknesses.push(`${highNull.length} column(s) have >15% missing values, reducing analytical confidence.`);
  if (cols.length < 5) weaknesses.push('Limited number of columns may constrain multi-dimensional analysis.');
  if (nums.length === 0) weaknesses.push('No numeric columns detected — quantitative metrics cannot be computed.');
  if (rows.length < 50) weaknesses.push(`Small sample size (${rows.length} rows) may produce unreliable aggregations.`);
  if (cats.every(c => c.stats.uniqueCount <= 2)) weaknesses.push('Categorical columns have very low cardinality, limiting segmentation depth.');

  // Opportunities
  if (cats.length >= 2) opportunities.push(`${cats.length} categorical dimensions available for cross-segment comparison and drill-down.`);
  if (dates.length >= 1 && nums.length >= 1) opportunities.push('Combining date and numeric columns opens forecasting and period-over-period comparison.');
  if (nums.length >= 2) opportunities.push('Multiple numeric metrics can be correlated to uncover hidden relationships.');
  opportunities.push('Adding calculated columns (ratios, growth rates) can surface actionable KPIs from existing data.');

  // Threats
  if (totalNull > 0.1) threats.push(`High overall missing rate (${pct(totalNull)}) may skew aggregated metrics.`);
  const highCardinality = cats.filter(c => c.stats.uniqueCount > 50);
  if (highCardinality.length > 0) threats.push(`"${highCardinality[0].display_name}" has very high cardinality (${highCardinality[0].stats.uniqueCount} values) — may be misclassified as categorical.`);
  if (dates.length === 0) threats.push('No date columns detected — time-based trend analysis is not possible with current data.');
  threats.push('Data staleness risk: without refresh timestamps, it is unclear how current the dataset is.');

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    threats: threats.slice(0, 4),
  };
}

export function computeHealthScore(cols: ColMeta[], rows: Record<string, unknown>[]): number {
  if (cols.length === 0 || rows.length === 0) return 0;

  let score = 100;

  // Penalize missing data
  const avgNullPct = cols.reduce((s, c) => s + c.stats.nullPct, 0) / cols.length;
  score -= avgNullPct * 40; // up to -40 for all nulls

  // Reward row count
  if (rows.length < 10) score -= 20;
  else if (rows.length < 50) score -= 10;
  else if (rows.length < 100) score -= 5;

  // Reward column diversity
  const hasNumeric = cols.some(c => c.data_type === 'numeric');
  const hasDate = cols.some(c => c.data_type === 'date');
  const hasCategorical = cols.some(c => c.data_type === 'categorical');
  if (!hasNumeric) score -= 10;
  if (!hasDate) score -= 5;
  if (!hasCategorical) score -= 5;

  // Reward column count
  if (cols.length < 3) score -= 10;
  else if (cols.length >= 5) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
