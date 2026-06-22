# ExcelBoard

A web-based Excel Analytics Dashboard — connect Excel files from anywhere and build fully customizable KPI & chart dashboards.

## Features

- **Data Sources Tab** — Connect Excel files from Local PC, OneDrive, Azure Blob, Looker, or direct URL
- **Auto-generated File Dashboards** — KPI cards, charts, data quality panel, and preview table per file
- **Dashboard Builder** — Drag & drop, resize, add/edit/delete 11 widget types
- **10 Color Themes** — 5 light, 5 dark, instant switching
- **SQLite persistence** — Dashboards and sources survive page reload

## Quick Start

```bash
git clone https://github.com/Sameergsg/excelboard
cd excelboard
npm install
cp packages/backend/.env.example packages/backend/.env
npm run dev
```

Open http://localhost:5173

## Widget Types

| Widget | Description |
|--------|-------------|
| KPI Card | Big number with aggregation |
| Line Chart | Time series or category |
| Bar Chart | Horizontal/vertical/stacked |
| Area Chart | Line + fill |
| Pie / Donut | Category distribution |
| Scatter Plot | X vs Y correlation |
| Data Table | Paginated, searchable |
| Metric Comparison | Two KPIs with % change |
| Gauge | Min/max/target dial |
| Text / Note | Markdown content |
| Spacer | Visual gap |

## Data Sources

| Source | Setup Required |
|--------|---------------|
| Local File | None — drag & drop |
| Direct URL | None |
| OneDrive | MICROSOFT_CLIENT_ID in .env |
| Azure Blob | Connection string |
| Looker | API credentials |

## Environment Variables

Copy `packages/backend/.env.example` to `packages/backend/.env` and fill in the required values.
