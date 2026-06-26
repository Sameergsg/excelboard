import { useState, useEffect } from 'react';
import { SlidersHorizontal, Plus, Edit2, RotateCcw, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useExcelData } from '../../hooks/useExcelData';
import { useFilters } from '../../hooks/useFilters';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { ActiveFilterBar } from './ActiveFilterBar';
import { FilterPanel } from './FilterPanel';
import { AutoAnalysis } from './AutoAnalysis';
import { SheetSidebar } from './SheetSidebar';
import { DashboardCanvas } from './DashboardCanvas';
import KpiBuilderModal from '../kpi-builder/KpiBuilderModal';

export function DashboardTab() {
  const { activeSourceId, activeSheet, setActiveSheet, sources, setActiveTab } = useAppStore();
  const { editMode, setEditMode, setWidgets, loadWidgets } = useDashboardStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAutoAnalysis, setShowAutoAnalysis] = useState(true);
  const [showAddWidget, setShowAddWidget] = useState(false);

  const activeSource = sources.find(s => s.id === activeSourceId) ?? null;

  const { rows, cols, loading, error } = useExcelData(activeSourceId, activeSheet);
  const filtersApi = useFilters(cols);
  const filteredRows = filtersApi.filterRows(rows);

  // When source/sheet changes: reload widgets, clear filters
  useEffect(() => {
    filtersApi.clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSourceId, activeSheet]);

  const handleSheetSelect = (sheet: string) => {
    setActiveSheet(sheet);
    loadWidgets(activeSourceId ?? '', sheet);
  };

  const handleResetLayout = () => {
    if (!activeSourceId || !activeSheet) return;
    setWidgets([]);
  };

  // Empty state — no source
  if (!activeSourceId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-24 text-center px-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
        >
          <FileSpreadsheet size={32} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          No file selected
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
          Select a file from the Files tab to view its dashboard
        </p>
        <Button variant="primary" onClick={() => setActiveTab('files')}>
          Go to Files
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Sheet sidebar */}
      <SheetSidebar
        source={activeSource}
        activeSheet={activeSheet}
        onSheetSelect={handleSheetSelect}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {/* Toolbar */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {activeSource?.name ?? 'Dashboard'}
            </span>
            {activeSheet && (
              <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                / {activeSheet}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit toggle */}
            <Button
              variant={editMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit2 size={13} />
              {editMode ? 'Done' : 'Edit'}
            </Button>

            {/* Add widget */}
            <Button variant="secondary" size="sm" onClick={() => setShowAddWidget(true)}>
              <Plus size={13} />
              Add KPI
            </Button>

            {/* Filters */}
            <Button
              variant={filtersApi.isFiltered ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFilters(f => !f)}
            >
              <SlidersHorizontal size={13} />
              Filters
              {filtersApi.activeFilters.length > 0 && (
                <span
                  className="ml-0.5 px-1 py-0 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.3)' }}
                >
                  {filtersApi.activeFilters.length}
                </span>
              )}
            </Button>

            {/* Reset layout */}
            <Button variant="ghost" size="sm" onClick={handleResetLayout} title="Reset layout">
              <RotateCcw size={13} />
            </Button>

            {/* Auto Analysis toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAutoAnalysis(a => !a)}
              title="Toggle auto analysis"
            >
              {showAutoAnalysis ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Analysis
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: 'color-mix(in srgb, var(--color-error) 12%, transparent)', color: 'var(--color-error)' }}
            >
              {error}
            </div>
          )}

          {/* Active filters bar */}
          <ActiveFilterBar
            activeFilters={filtersApi.activeFilters}
            removeFilter={filtersApi.removeFilter}
            clearAll={filtersApi.clearAll}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
          />

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          )}

          {/* Auto Analysis */}
          {!loading && showAutoAnalysis && (
            <AutoAnalysis cols={cols} rows={filteredRows} loading={loading} />
          )}

          {/* Dashboard Canvas */}
          {!loading && activeSourceId && (
            <DashboardCanvas
              sourceId={activeSourceId}
              sheetName={activeSheet}
              rows={filteredRows}
              allRows={rows}
              cols={cols}
              editMode={editMode}
              onAddWidget={() => setShowAddWidget(true)}
            />
          )}
        </div>
      </div>

      {/* Filter panel */}
      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        cols={cols}
        allRows={rows}
        filtersApi={filtersApi}
      />

      {/* Add widget modal */}
      <KpiBuilderModal
        open={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        lockSource={true}
      />
    </div>
  );
}
