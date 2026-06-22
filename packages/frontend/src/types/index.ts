export interface ColumnStats {
  min?: number; max?: number; avg?: number; median?: number;
  stdDev?: number; nullPct: number; uniqueCount: number; sampleValues: unknown[];
}

export interface ColumnMeta {
  id: string; source_id: string;
  name: string; display_name: string;
  data_type: 'numeric' | 'date' | 'text' | 'boolean' | 'categorical';
  stats: ColumnStats;
}

export interface DataSource {
  id: string; name: string;
  source_type: 'local' | 'onedrive' | 'azure' | 'looker' | 'url';
  file_path?: string; last_synced_at?: number;
  row_count: number; column_count: number;
  sheet_names: string[]; active_sheet: string;
  status: 'connected' | 'error' | 'syncing';
  columns?: ColumnMeta[];
}

export type WidgetType =
  | 'kpi' | 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  | 'table' | 'metric-comparison' | 'heatmap' | 'gauge' | 'text' | 'spacer';

export interface WidgetPosition { x: number; y: number; w: number; h: number; }

export interface Widget {
  id: string; dashboard_id: string; widget_type: WidgetType;
  source_id?: string; config: WidgetConfig; position: WidgetPosition;
}

export interface WidgetConfig {
  title?: string; sourceId?: string; sheet?: string;
  // KPI
  column?: string; aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  prefix?: string; suffix?: string; label?: string;
  // Charts
  xAxis?: string; yAxis?: string[]; colorScheme?: string[];
  smooth?: boolean; stacked?: boolean; horizontal?: boolean;
  fillArea?: boolean; showLegend?: boolean;
  // Pie
  categoryColumn?: string; valueColumn?: string; maxSlices?: number;
  // Gauge
  minVal?: number; maxVal?: number; target?: number;
  // Table
  columns?: string[]; pageSize?: number; searchable?: boolean;
  // Text
  content?: string;
  // Metric comparison
  column2?: string; aggregation2?: string;
  // Scatter
  xColumn?: string; yColumn?: string; sizeColumn?: string;
  // Filters
  dateColumn?: string; dateFrom?: string; dateTo?: string;
}

export interface Dashboard {
  id: string; name: string; description: string;
  theme: string; layout: WidgetPosition[];
  widgets?: Widget[]; created_at?: number; updated_at?: number;
}

export type ThemeId =
  | 'arctic-white' | 'warm-sand' | 'mint-fresh' | 'lavender-mist' | 'rose-gold'
  | 'midnight-pro' | 'obsidian' | 'forest-night' | 'ember' | 'slate-storm';

export interface ThemeDefinition {
  id: ThemeId; name: string; type: 'light' | 'dark';
  preview: { bg: string; accent: string; text: string; };
}
