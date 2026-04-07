import { useState, useEffect } from 'react';

export interface ThemeColors {
  bg: string;
  paper: string;
  toolbar: string;
}

const STORAGE_KEY = 'scriptsmith-theme';

const DEFAULTS: ThemeColors = {
  bg: '#f5f6f8',
  paper: '#ffffff',
  toolbar: '#f0f2f5',
};

function loadTheme(): ThemeColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--custom-bg', colors.bg);
  root.style.setProperty('--custom-paper', colors.paper);
  root.style.setProperty('--custom-toolbar', colors.toolbar);

  // Apply directly to the elements via CSS variables on :root
  // We inject a style tag so it overrides Tailwind
  const id = 'scriptsmith-theme-overrides';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = `
    .bg-editor-bg, [class*="bg-editor-bg"] { background-color: ${colors.bg} !important; }
    .bg-editor-paper { background-color: ${colors.paper} !important; }
    .bg-toolbar-bg { background-color: ${colors.toolbar} !important; }
    .bg-breakdown-bg { background-color: ${colors.bg} !important; }
    .bg-background { background-color: ${colors.bg} !important; }
  `;
}

export function useTheme() {
  const [colors, setColors] = useState<ThemeColors>(loadTheme);

  useEffect(() => {
    applyTheme(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  // Apply on mount
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const reset = () => setColors(DEFAULTS);

  return { colors, updateColor, reset };
}
