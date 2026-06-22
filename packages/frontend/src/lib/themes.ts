import type { ThemeDefinition, ThemeId } from '../types';

export const THEMES: ThemeDefinition[] = [
  { id: 'arctic-white',  name: 'Arctic White',   type: 'light', preview: { bg: '#ffffff', accent: '#3b82f6', text: '#0f172a' } },
  { id: 'warm-sand',     name: 'Warm Sand',       type: 'light', preview: { bg: '#fdf6ec', accent: '#d97706', text: '#2c1810' } },
  { id: 'mint-fresh',    name: 'Mint Fresh',      type: 'light', preview: { bg: '#f0fdf4', accent: '#16a34a', text: '#052e16' } },
  { id: 'lavender-mist', name: 'Lavender Mist',   type: 'light', preview: { bg: '#faf5ff', accent: '#7c3aed', text: '#1e0a2e' } },
  { id: 'rose-gold',     name: 'Rose Gold',       type: 'light', preview: { bg: '#fff1f2', accent: '#e11d48', text: '#1f0a0d' } },
  { id: 'midnight-pro',  name: 'Midnight Pro',    type: 'dark',  preview: { bg: '#0d1117', accent: '#58a6ff', text: '#e6edf3' } },
  { id: 'obsidian',      name: 'Obsidian',        type: 'dark',  preview: { bg: '#1a1a2e', accent: '#a78bfa', text: '#e2e8f0' } },
  { id: 'forest-night',  name: 'Forest Night',    type: 'dark',  preview: { bg: '#0d1f0d', accent: '#4ade80', text: '#d1fae5' } },
  { id: 'ember',         name: 'Ember',           type: 'dark',  preview: { bg: '#1c1108', accent: '#f97316', text: '#fef3c7' } },
  { id: 'slate-storm',   name: 'Slate Storm',     type: 'dark',  preview: { bg: '#0f172a', accent: '#38bdf8', text: '#f1f5f9' } },
];

export function applyTheme(themeId: ThemeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('excelboard-theme', themeId);
}

export function getStoredTheme(): ThemeId {
  return (localStorage.getItem('excelboard-theme') as ThemeId) || 'midnight-pro';
}

export function getChartColors(): string[] {
  const el = document.documentElement;
  const style = getComputedStyle(el);
  return Array.from({ length: 8 }, (_, i) =>
    style.getPropertyValue(`--chart-${i + 1}`).trim()
  ).filter(Boolean);
}
