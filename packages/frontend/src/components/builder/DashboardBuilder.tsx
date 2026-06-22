import { useEffect, useState, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Plus, Edit2, Eye, Trash2, Copy, Download, ChevronDown, Pencil, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import { WidgetConfigModal } from './WidgetConfigModal';
import { dashboardsApi } from '../../lib/api';
import { useAppStore } from '../../stores/useAppStore';
import type { Widget, WidgetType, WidgetConfig, Dashboard } from '../../types';
import { Spinner } from '../ui/Spinner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function DashboardBuilder() {
  const { sources, activeDashboardId, setActiveDashboardId, dashboards, setDashboards, builderEditMode, setBuilderEditMode } = useAppStore();
  const [currentDash, setCurrentDash] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showNewDash, setShowNewDash] = useState(false);
  const [newDashName, setNewDashName] = useState('');
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    dashboardsApi.list().then(list => {
      setDashboards(list);
      if (list.length && !activeDashboardId) setActiveDashboardId(list[0].id);
    });
  }, []);

  useEffect(() => {
    const el = document.getElementById('builder-grid');
    if (el) setContainerWidth(el.clientWidth);
  }, []);

  useEffect(() => {
    if (activeDashboardId) loadDashboard(activeDashboardId);
  }, [activeDashboardId]);

  async function loadDashboard(id: string) {
    setLoading(true);
    const dash = await dashboardsApi.get(id);
    setCurrentDash(dash);
    setWidgets(dash.widgets || []);
    setLoading(false);
  }

  const layout: Layout[] = widgets.map(w => ({
    i: w.id, x: w.position.x, y: w.position.y, w: w.position.w, h: w.position.h, minW: 2, minH: 2,
  }));

  async function handleLayoutChange(newLayout: Layout[]) {
    if (!builderEditMode || !currentDash) return;
    const positions = newLayout.map(l => ({ id: l.i, position: { x: l.x, y: l.y, w: l.w, h: l.h } }));
    await dashboardsApi.updatePositions(currentDash.id, positions);
    setWidgets(prev => prev.map(w => {
      const found = newLayout.find(l => l.i === w.id);
      return found ? { ...w, position: { x: found.x, y: found.y, w: found.w, h: found.h } } : w;
    }));
  }

  async function handleAddWidget(type: WidgetType, config: WidgetConfig, sourceId?: string) {
    if (!currentDash) return;
    const maxY = widgets.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);
    const result = await dashboardsApi.addWidget(currentDash.id, {
      widget_type: type, source_id: sourceId,
      config, position: { x: 0, y: maxY, w: 4, h: 3 },
    });
    setWidgets(prev => [...prev, {
      id: result.id, dashboard_id: currentDash.id, widget_type: type,
      source_id: sourceId, config, position: { x: 0, y: maxY, w: 4, h: 3 },
    }]);
  }

  async function handleEditWidget(type: WidgetType, config: WidgetConfig, sourceId?: string) {
    if (!editingWidget) return;
    await dashboardsApi.updateWidget(editingWidget.id, { widget_type: type, config, source_id: sourceId });
    setWidgets(prev => prev.map(w => w.id === editingWidget.id ? { ...w, widget_type: type, config, source_id: sourceId } : w));
    setEditingWidget(null);
  }

  async function handleDeleteWidget(id: string) {
    if (!confirm('Remove this widget?')) return;
    await dashboardsApi.deleteWidget(id);
    setWidgets(prev => prev.filter(w => w.id !== id));
  }

  async function createDashboard() {
    if (!newDashName.trim()) return;
    const d = await dashboardsApi.create({ name: newDashName });
    setDashboards([...dashboards, d]);
    setActiveDashboardId(d.id);
    setShowNewDash(false); setNewDashName('');
  }

  async function deleteDashboard() {
    if (!currentDash || !confirm(`Delete "${currentDash.name}"?`)) return;
    await dashboardsApi.delete(currentDash.id);
    const remaining = dashboards.filter(d => d.id !== currentDash.id);
    setDashboards(remaining);
    setActiveDashboardId(remaining[0]?.id || null);
  }

  async function duplicateDashboard() {
    if (!currentDash) return;
    const { id } = await dashboardsApi.duplicate(currentDash.id);
    const list = await dashboardsApi.list();
    setDashboards(list);
    setActiveDashboardId(id);
  }

  async function exportPDF() {
    const el = document.getElementById('builder-grid');
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg') });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${currentDash?.name || 'dashboard'}.pdf`);
  }

  if (!dashboards.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-5xl mb-3">📊</div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">No Dashboards Yet</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">Create your first dashboard to start adding KPIs and charts</p>
        </div>
        <Button onClick={() => setShowNewDash(true)}><Plus size={16} /> Create Dashboard</Button>
        <Modal open={showNewDash} onClose={() => setShowNewDash(false)} title="New Dashboard" size="sm">
          <input value={newDashName} onChange={e => setNewDashName(e.target.value)} placeholder="Dashboard name" onKeyDown={e => e.key === 'Enter' && createDashboard()}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] mb-4" autoFocus />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowNewDash(false)}>Cancel</Button><Button onClick={createDashboard}>Create</Button></div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-wrap">
        {/* Dashboard selector */}
        <div className="relative flex items-center">
          <select value={activeDashboardId || ''} onChange={e => setActiveDashboardId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-sm bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)] font-medium cursor-pointer min-w-[160px]">
            {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 pointer-events-none text-[var(--color-text-muted)]" />
        </div>

        <Button size="sm" variant="ghost" onClick={() => setShowNewDash(true)} title="New dashboard"><Plus size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={duplicateDashboard} title="Duplicate"><Copy size={14} /></Button>
        <Button size="sm" variant="danger" onClick={deleteDashboard} title="Delete"><Trash2 size={14} /></Button>

        <div className="flex-1" />

        <Button size="sm" variant="ghost" onClick={exportPDF} title="Export PDF"><Download size={14} /> PDF</Button>
        <Button size="sm" variant={builderEditMode ? 'primary' : 'secondary'} onClick={() => setBuilderEditMode(!builderEditMode)}>
          {builderEditMode ? <><Eye size={14} /> Preview</> : <><Edit2 size={14} /> Edit</>}
        </Button>
        {builderEditMode && (
          <Button size="sm" onClick={() => setShowAddWidget(true)}><Plus size={14} /> Widget</Button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4 bg-[var(--color-bg)]" id="builder-grid">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={36} /></div>
        ) : widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-4xl mb-3">🧩</div>
            <p className="text-[var(--color-text-secondary)] mb-4">This dashboard is empty</p>
            {builderEditMode && <Button onClick={() => setShowAddWidget(true)}><Plus size={16} /> Add First Widget</Button>}
            {!builderEditMode && <p className="text-xs text-[var(--color-text-muted)]">Switch to Edit mode to add widgets</p>}
          </div>
        ) : (
          <GridLayout
            layout={layout}
            cols={12}
            rowHeight={60}
            width={containerWidth}
            isDraggable={builderEditMode}
            isResizable={builderEditMode}
            onLayoutChange={handleLayoutChange}
            margin={[12, 12]}
          >
            {widgets.map(widget => (
              <div key={widget.id} className="relative group">
                <Card className="h-full flex flex-col overflow-hidden p-3">
                  {widget.config.title && (
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 truncate">{widget.config.title}</p>
                  )}
                  <div className="flex-1 min-h-0">
                    <WidgetRenderer widget={widget} />
                  </div>
                </Card>
                {builderEditMode && (
                  <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1">
                    <button onClick={() => setEditingWidget(widget)} className="p-1 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)]"><Pencil size={11} /></button>
                    <button onClick={() => handleDeleteWidget(widget.id)} className="p-1 rounded bg-[var(--color-error)]/20 border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/40 text-[var(--color-error)]"><X size={11} /></button>
                  </div>
                )}
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      <WidgetConfigModal open={showAddWidget} onClose={() => setShowAddWidget(false)} onSave={handleAddWidget} sources={sources} />
      {editingWidget && <WidgetConfigModal open={!!editingWidget} onClose={() => setEditingWidget(null)} onSave={handleEditWidget} sources={sources} existing={editingWidget} />}

      <Modal open={showNewDash} onClose={() => setShowNewDash(false)} title="New Dashboard" size="sm">
        <input value={newDashName} onChange={e => setNewDashName(e.target.value)} placeholder="Dashboard name" onKeyDown={e => e.key === 'Enter' && createDashboard()}
          className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] mb-4" autoFocus />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowNewDash(false)}>Cancel</Button><Button onClick={createDashboard}>Create</Button></div>
      </Modal>
    </div>
  );
}
