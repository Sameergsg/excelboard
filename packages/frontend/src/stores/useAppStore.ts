import { create } from 'zustand';
import type { DataSource, ThemeId, Dashboard } from '../types';
import { applyTheme, getStoredTheme } from '../lib/themes';

interface AppState {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  sources: DataSource[];
  setSources: (s: DataSource[]) => void;
  addSource: (s: DataSource) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, partial: Partial<DataSource>) => void;
  activeTab: 'files' | 'dashboard';
  setActiveTab: (t: 'files' | 'dashboard') => void;
  activeSourceId: string | null;
  setActiveSourceId: (id: string | null) => void;
  activeSheet: string;
  setActiveSheet: (s: string) => void;
  // Legacy builder fields
  dashboards: Dashboard[];
  setDashboards: (d: Dashboard[]) => void;
  activeDashboardId: string | null;
  setActiveDashboardId: (id: string | null) => void;
  builderEditMode: boolean;
  setBuilderEditMode: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: getStoredTheme(),
  setTheme: (t) => { applyTheme(t); set({ theme: t }); },
  sources: [],
  setSources: (sources) => set({ sources }),
  addSource: (s) => set(st => ({ sources: [...st.sources, s] })),
  removeSource: (id) => set(st => ({ sources: st.sources.filter(s => s.id !== id) })),
  updateSource: (id, partial) => set(st => ({ sources: st.sources.map(s => s.id === id ? { ...s, ...partial } : s) })),
  activeTab: 'files',
  setActiveTab: (t) => set({ activeTab: t }),
  activeSourceId: null,
  setActiveSourceId: (id) => set({ activeSourceId: id }),
  activeSheet: '',
  setActiveSheet: (s) => set({ activeSheet: s }),
  dashboards: [],
  setDashboards: (dashboards) => set({ dashboards }),
  activeDashboardId: null,
  setActiveDashboardId: (id) => set({ activeDashboardId: id }),
  builderEditMode: false,
  setBuilderEditMode: (v) => set({ builderEditMode: v }),
}));
