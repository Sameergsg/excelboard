import { create } from 'zustand';
import type { LocalWidget } from '../types';

function makeKey(sourceId: string, sheet: string): string {
  return `eb-widgets-${sourceId}-${sheet}`;
}

function saveToStorage(key: string, widgets: LocalWidget[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(widgets));
  } catch {
    // storage quota exceeded — ignore
  }
}

function loadFromStorage(key: string): LocalWidget[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as LocalWidget[];
  } catch {
    return [];
  }
}

interface DashboardState {
  widgets: LocalWidget[];
  editMode: boolean;
  currentKey: string;

  setWidgets: (ws: LocalWidget[]) => void;
  loadWidgets: (sourceId: string, sheet: string) => void;
  addWidget: (w: LocalWidget) => void;
  updateWidget: (id: string, partial: Partial<LocalWidget>) => void;
  removeWidget: (id: string) => void;
  setEditMode: (v: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  widgets: [],
  editMode: false,
  currentKey: '',

  setWidgets: (ws) => {
    const { currentKey } = get();
    saveToStorage(currentKey, ws);
    set({ widgets: ws });
  },

  loadWidgets: (sourceId, sheet) => {
    const key = makeKey(sourceId, sheet);
    const ws = loadFromStorage(key);
    set({ widgets: ws, currentKey: key });
  },

  addWidget: (w) => {
    const { widgets, currentKey } = get();
    const updated = [...widgets, w];
    saveToStorage(currentKey, updated);
    set({ widgets: updated });
  },

  updateWidget: (id, partial) => {
    const { widgets, currentKey } = get();
    const updated = widgets.map(w => w.id === id ? { ...w, ...partial } : w);
    saveToStorage(currentKey, updated);
    set({ widgets: updated });
  },

  removeWidget: (id) => {
    const { widgets, currentKey } = get();
    const updated = widgets.filter(w => w.id !== id);
    saveToStorage(currentKey, updated);
    set({ widgets: updated });
  },

  setEditMode: (v) => set({ editMode: v }),
}));
