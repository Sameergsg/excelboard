import { create } from 'zustand';
import type { DataSource, Dashboard, ThemeId } from '../types';
import { applyTheme, getStoredTheme } from '../lib/themes';

interface AppState {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;

  sources: DataSource[];
  setSources: (s: DataSource[]) => void;
  addSource: (s: DataSource) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, partial: Partial<DataSource>) => void;

  dashboards: Dashboard[];
  setDashboards: (d: Dashboard[]) => void;
  activeDashboardId: string | null;
  setActiveDashboardId: (id: string | null) => void;

  activeSourceId: string | null;
  setActiveSourceId: (id: string | null) => void;

  activeTab: 'sources' | 'file' | 'builder';
  setActiveTab: (t: 'sources' | 'file' | 'builder') => void;

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
  updateSource: (id, partial) => set(st => ({
    sources: st.sources.map(s => s.id === id ? { ...s, ...partial } : s),
  })),

  dashboards: [],
  setDashboards: (dashboards) => set({ dashboards }),
  activeDashboardId: null,
  setActiveDashboardId: (id) => set({ activeDashboardId: id }),

  activeSourceId: null,
  setActiveSourceId: (id) => set({ activeSourceId: id }),

  activeTab: 'sources',
  setActiveTab: (t) => set({ activeTab: t }),

  builderEditMode: false,
  setBuilderEditMode: (v) => set({ builderEditMode: v }),
}));
