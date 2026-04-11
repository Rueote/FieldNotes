import { useState, useEffect } from 'react';

export interface ThemeColors {
  bg: string;
  paper: string;
  ui: string;
}

const STORAGE_KEY = 'scriptsmith-theme';

const DEFAULTS: ThemeColors = {
  bg:    '#1c1c1c',
  paper: '#3e4144',
  ui:    '#2b2b2c',
};

function loadTheme(): ThemeColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };

    const parsed = JSON.parse(raw);

    // migrate old key names
    if (parsed.toolbar && !parsed.ui) parsed.ui = parsed.toolbar;

    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function needsWhiteText(hex: string): boolean {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    const L =
      0.2126 * toLinear(r) +
      0.7152 * toLinear(g) +
      0.0722 * toLinear(b);

    return L < 0.35;
  } catch {
    return false;
  }
}

export function applyTheme(colors: ThemeColors) {
  const uiText = needsWhiteText(colors.ui) ? '#ffffff' : '#1a1a1a';

  // slightly improved contrast
  const uiTextMuted = needsWhiteText(colors.ui)
    ? 'rgba(255,255,255,0.65)'
    : 'rgba(0,0,0,0.55)';

  const uiBorder = needsWhiteText(colors.ui)
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(0,0,0,0.12)';

  const uiAccentBg = needsWhiteText(colors.ui)
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.07)';

  const uiPrimary = needsWhiteText(colors.ui)
    ? '#a8c4ff'
    : '#1a4a9e';

  const paperText = needsWhiteText(colors.paper)
    ? '#e8e8e8'
    : '#1a1a1a';

  const bgText = needsWhiteText(colors.bg)
    ? '#e8e8e8'
    : '#1a1a1a';

  const cellEditBg = colors.ui;
  const cellEditText = uiText;

  const id = 'scriptsmith-theme-overrides';
  let el = document.getElementById(id) as HTMLStyleElement | null;

  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }

  el.textContent = `
    /* ── Body / background ── */
    body { background-color: ${colors.bg} !important; color: ${bgText} !important; }
    .bg-background { background-color: ${colors.bg} !important; color: ${bgText} !important; }
    .bg-editor-bg  { background-color: ${colors.bg} !important; }

    /* ── Paper ── */
    .bg-editor-paper { background-color: ${colors.paper} !important; color: ${paperText} !important; }
    .screenplay-line { color: ${paperText} !important; }
    .screenplay-line::placeholder { color: transparent !important; }
    .screenplay-line.scene-heading { color: ${paperText} !important; }
    .screenplay-line.non-printable { color: ${paperText} !important; opacity: 0.45 !important; }
    .screenplay-line.lyrics { color: ${paperText} !important; }

    /* ── UI panels ── */
    .bg-toolbar-bg   { background-color: ${colors.ui} !important; }
    .bg-sidebar      { background-color: ${colors.ui} !important; }
    .bg-breakdown-bg { background-color: ${colors.ui} !important; }

    /* Panel text */
    .bg-toolbar-bg .text-foreground,
    .bg-sidebar    .text-foreground,
    .bg-sidebar    .text-sidebar-foreground,
    .bg-breakdown-bg .text-foreground,
    .bg-breakdown-bg h3,
    .bg-breakdown-bg h4 {
      color: ${uiText} !important;
    }

    .bg-toolbar-bg   .text-muted-foreground,
    .bg-sidebar      .text-muted-foreground,
    .bg-breakdown-bg .text-muted-foreground {
      color: ${uiTextMuted} !important;
    }

    /* Borders */
    .bg-toolbar-bg .border-border,
    .bg-sidebar    .border-border,
    .bg-breakdown-bg .border-border {
      border-color: ${uiBorder} !important;
    }

    .bg-sidebar {
      border-right-color: ${uiBorder} !important;
      border-left-color: ${uiBorder} !important;
    }

    /* Sidebar accents */
    .bg-sidebar .bg-sidebar-accent {
      background-color: ${uiAccentBg} !important;
    }

    .bg-sidebar .text-sidebar-primary {
      color: ${uiPrimary} !important;
    }

    .bg-sidebar button:hover {
      background-color: ${uiAccentBg} !important;
    }

    /* Toolbar */
    .bg-toolbar-bg button {
      color: ${uiText} !important;
    }

    .bg-toolbar-bg button:hover {
      background-color: ${uiAccentBg} !important;
    }

    /* ── Dialogs (FIX) ── */
    [data-radix-dialog-content] {
      background-color: ${colors.ui} !important;
      color: ${uiText} !important;
      border-color: ${uiBorder} !important;
    }

    [data-radix-dialog-content] .text-foreground {
      color: ${uiText} !important;
    }

    [data-radix-dialog-content] .text-muted-foreground {
      color: ${uiTextMuted} !important;
    }

    [data-radix-dialog-content] h3,
    [data-radix-dialog-content] h4 {
      color: ${uiTextMuted} !important;
    }

    /* ── Shot list ── */
    thead th {
      background-color: ${colors.ui} !important;
      color: ${uiText} !important;
    }

    .shot-scene-header {
      background-color: ${uiAccentBg} !important;
    }

    .shot-cell-input {
      background-color: ${cellEditBg} !important;
      color: ${cellEditText} !important;
    }

    .shot-suggestion-dropdown {
      background-color: ${colors.ui} !important;
      border-color: ${uiBorder} !important;
      color: ${uiText} !important;
    }

    .shot-suggestion-dropdown button:hover {
      background-color: ${uiAccentBg} !important;
    }

    .shot-table td,
    .shot-table th {
      border-color: ${uiBorder} !important;
    }
  `;
}

// apply immediately
applyTheme(loadTheme());

export function useTheme() {
  const [colors, setColors] = useState<ThemeColors>(loadTheme);

  useEffect(() => {
    applyTheme(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const reset = () => setColors({ ...DEFAULTS });

  return { colors, updateColor, reset };
}