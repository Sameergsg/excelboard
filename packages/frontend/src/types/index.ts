export type ColType = 'numeric' | 'date' | 'text' | 'categorical' | 'boolean';

export interface ColMeta {
  name: string;
  display_name: string;
  data_type: ColType;
  stats: {
    min?: number; max?: number; avg?: number;
    nullPct: number; uniqueCount: number;
    sampleValues: string[];
  };
}

export interface DataSource {
  id: string;
  name: string;
  source_type: string;
  row_count: number;
  column_count: number;
  sheet_names: string[];
  active_sheet: string;
  status: 'connected' | 'error' | 'syncing';
  last_synced_at?: number;
}

export type WidgetType =
  | 'kpi' | 'line' | 'bar' | 'area' | 'pie'
  | 'scatter' | 'table' | 'comparison' | 'gauge' | 'text' | 'spacer'
  | 'metric-comparison';

export type FilterOperator =
  // text
  | 'contains' | 'not_contains' | 'equals' | 'not_equals'
  | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | 'is_one_of'
  // numeric
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'top_n' | 'bottom_n'
  // date
  | 'on' | 'before' | 'after' | 'date_between'
  | 'in_last' | 'this_week' | 'this_month' | 'this_year'
  | 'last_month' | 'last_year';

export interface FilterRow {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
  value2?: string; // for between
  logic: 'AND' | 'OR';
}

export interface WidgetConfig {
  title?: string;
  sourceId?: string;
  sheetName?: string;
  // KPI
  column?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  prefix?: string; suffix?: string; label?: string;
  compareColumn?: string;
  // Charts
  xAxis?: string;
  yAxis?: string[];
  smooth?: boolean; showDots?: boolean;
  horizontal?: boolean; stacked?: boolean;
  // Pie
  categoryColumn?: string; valueColumn?: string;
  maxSlices?: number; innerRadius?: boolean;
  // Scatter
  xColumn?: string; yColumn?: string;
  sizeColumn?: string; colorColumn?: string;
  // Table
  columns?: string[]; pageSize?: number;
  searchable?: boolean; sortable?: boolean;
  // Comparison
  column2?: string; aggregation2?: string; label2?: string; showPct?: boolean;
  // Gauge
  minVal?: number; maxVal?: number; target?: number;
  redThreshold?: number; greenThreshold?: number;
  // Text
  content?: string;
  // Style
  bgColor?: string; textColor?: string;
  borderStyle?: 'none' | 'subtle' | 'prominent';
  colorScheme?: string;
  // Chart display
  showLegend?: boolean;
  // Filters
  filters?: FilterRow[];
  filterLogic?: 'AND' | 'OR';
  isolateFromGlobal?: boolean;
}

export interface LocalWidget {
  id: string;
  widget_type: WidgetType;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

export type ThemeId =
  | 'arctic-white' | 'warm-sand' | 'mint-fresh' | 'lavender-mist' | 'rose-gold'
  | 'midnight-pro' | 'obsidian' | 'forest-night' | 'ember' | 'slate-storm';

export interface ThemeDef {
  id: ThemeId; name: string; type: 'light' | 'dark';
  preview: { bg: string; accent: string; text: string };
}

export interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// ── Compatibility aliases & legacy types ────────────────────────────────────

/** @deprecated Use ColMeta instead */
export type ColumnMeta = ColMeta;

/** Server-side widget model (used by builder/widgets components) */
export interface Widget {
  id: string;
  dashboard_id?: string;
  widget_type: string;
  source_id?: string;
  config: WidgetConfig & {
    sheet?: string;
    label?: string;
    column?: string;
    aggregation?: string;
    prefix?: string;
    suffix?: string;
    columns?: string[];
    pageSize?: number;
    searchable?: boolean;
    showLegend?: boolean;
    xAxis?: string;
    yAxis?: string[];
    categoryColumn?: string;
    valueColumn?: string;
    maxSlices?: number;
    innerRadius?: boolean;
    xColumn?: string;
    yColumn?: string;
    minVal?: number;
    maxVal?: number;
    target?: number;
    content?: string;
  };
  position?: { x: number; y: number; w: number; h: number };
}

/** Dashboard model */
export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
  created_at?: number;
  updated_at?: number;
}
