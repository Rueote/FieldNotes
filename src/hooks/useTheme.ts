import { useState, useEffect } from 'react';

export interface ThemeColors {
  bg: string;
  paper: string;
  ui: string;
}

const STORAGE_KEY = 'scriptsmith-theme';

const DEFAULTS: ThemeColors = {
  bg: '#4f5357',
  paper: '#676767',
  ui: '#3a3d40',
};

function loadTheme(): ThemeColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (parsed.toolbar && !parsed.ui) parsed.ui = parsed.toolbar;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function needsWhiteText(hex: string): boolean {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L < 0.35;
  } catch {
    return false;
  }
}

function applyTheme(colors: ThemeColors) {
  const uiText      = needsWhiteText(colors.ui)    ? '#ffffff'                  : '#1a1a1a';
  const uiTextMuted = needsWhiteText(colors.ui)    ? 'rgba(255,255,255,0.55)'   : 'rgba(0,0,0,0.45)';
  const uiBorder    = needsWhiteText(colors.ui)    ? 'rgba(255,255,255,0.12)'   : 'rgba(0,0,0,0.12)';
  const uiAccentBg  = needsWhiteText(colors.ui)    ? 'rgba(255,255,255,0.10)'   : 'rgba(0,0,0,0.07)';
  const uiPrimary   = needsWhiteText(colors.ui)    ? '#a8c4ff'                  : '#1a4a9e';
  const paperText   = needsWhiteText(colors.paper) ? '#e8e8e8'                  : '#1a1a1a';
  const bgText      = needsWhiteText(colors.bg)    ? '#e8e8e8'                  : '#1a1a1a';

  const id = 'scriptsmith-theme-overrides';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }

  el.textContent = `
    /* Background */
    body { background-color: ${colors.bg} !important; }
    .bg-background { background-color: ${colors.bg} !important; color: ${bgText} !important; }
    .bg-editor-bg  { background-color: ${colors.bg} !important; }
    .min-h-screen.bg-background > div { background-color: transparent !important; box-shadow: none !important; }

    /* Paper — scene headings same colour as paper text, not blue */
    .bg-editor-paper { background-color: ${colors.paper} !important; color: ${paperText} !important; }
    .screenplay-line { color: ${paperText} !important; }
    .screenplay-line::placeholder { color: transparent !important; }
    .screenplay-line.scene-heading { color: ${paperText} !important; }
    .screenplay-line.non-printable { color: ${paperText} !important; opacity: 0.45 !important; }
    .screenplay-line.lyrics { color: ${paperText} !important; }

    /* UI panels */
    .bg-toolbar-bg   { background-color: ${colors.ui} !important; }
    .bg-sidebar      { background-color: ${colors.ui} !important; }
    .bg-breakdown-bg { background-color: ${colors.ui} !important; }

    .bg-toolbar-bg .text-foreground,
    .bg-sidebar .text-foreground,
    .bg-sidebar .text-sidebar-foreground,
    .bg-breakdown-bg .text-foreground,
    .bg-breakdown-bg h3,
    .bg-breakdown-bg h4 { color: ${uiText} !important; }

    .bg-toolbar-bg .text-muted-foreground,
    .bg-sidebar .text-muted-foreground,
    .bg-breakdown-bg .text-muted-foreground { color: ${uiTextMuted} !important; }

    .bg-toolbar-bg .border-border,
    .bg-toolbar-bg .border-sidebar-border,
    .bg-sidebar .border-border,
    .bg-sidebar .border-sidebar-border,
    .bg-breakdown-bg .border-border { border-color: ${uiBorder} !important; }

    .bg-sidebar { border-right-color: ${uiBorder} !important; border-left-color: ${uiBorder} !important; }
    .bg-sidebar .bg-sidebar-accent { background-color: ${uiAccentBg} !important; }
    .bg-sidebar .text-sidebar-primary { color: ${uiPrimary} !important; }
    .bg-sidebar button:hover { background-color: ${uiAccentBg} !important; }
    .bg-toolbar-bg button { color: ${uiText} !important; }
    .bg-toolbar-bg button:hover { background-color: ${uiAccentBg} !important; }
  `;
}

export function useTheme() {
  const [colors, setColors] = useState<ThemeColors>(loadTheme);

  useEffect(() => {
    applyTheme(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const reset = () => setColors(DEFAULTS);

  return { colors, updateColor, reset };
}
