import { createContext, useContext, useState, useEffect, useMemo } from 'react';

export const THEMES = {
  original: {
    name: 'Original Navy',
    vars: {
      '--bg-base':       '#0f172a',
      '--bg-card':       '#1e293b',
      '--bg-input':      '#334155',
      '--border':        '#334155',
      '--text-primary':  '#f8fafc',
      '--text-muted':    '#94a3b8',
      '--accent':        '#2563eb',
      '--accent-hover':  '#1d4ed8',
      '--accent-text':   '#ffffff',
      '--sidebar-bg':    '#1e293b',
      '--sidebar-border':'#334155',
    }
  },
  neo_white: {
    name: 'Minimal Neo-White',
    vars: {
      '--bg-base':       '#f8fafc',
      '--bg-card':       '#ffffff',
      '--bg-input':      '#f1f5f9',
      '--border':        '#cbd5e1',
      '--text-primary':  '#0f172a',
      '--text-muted':    '#475569',
      '--accent':        '#2563eb',
      '--accent-hover':  '#1d4ed8',
      '--accent-text':   '#ffffff',
      '--sidebar-bg':    '#ffffff',
      '--sidebar-border':'#cbd5e1',
    }
  },
  midnight: {
    name: 'Midnight Cyber',
    vars: {
      '--bg-base':       '#0b132b',
      '--bg-card':       '#1c2541',
      '--bg-input':      '#0b132b',
      '--border':        '#3a506b',
      '--text-primary':  '#ffffff',
      '--text-muted':    '#6fffe9',
      '--accent':        '#38bdf8',
      '--accent-hover':  '#0ea5e9',
      '--accent-text':   '#0b132b',
      '--sidebar-bg':    '#0b132b',
      '--sidebar-border':'#3a506b',
    }
  },
  desert: {
    name: 'Desert Sunset (Luxury)',
    vars: {
      '--bg-base':       '#1c130e',
      '--bg-card':       '#2a1d17',
      '--bg-input':      '#3a2a21',
      '--border':        '#4d372b',
      '--text-primary':  '#fff7ed',
      '--text-muted':    '#fb923c',
      '--accent':        '#f97316',
      '--accent-hover':  '#ea580c',
      '--accent-text':   '#ffffff',
      '--sidebar-bg':    '#2a1d17',
      '--sidebar-border':'#4d372b',
    }
  },
  emerald: {
    name: 'Emerald Tech (Forest)',
    vars: {
      '--bg-base':       '#061a14',
      '--bg-card':       '#0b2920',
      '--bg-input':      '#133d31',
      '--border':        '#1c5243',
      '--text-primary':  '#ecfdf5',
      '--text-muted':    '#34d399',
      '--accent':        '#10b981',
      '--accent-hover':  '#059669',
      '--accent-text':   '#ffffff',
      '--sidebar-bg':    '#0b2920',
      '--sidebar-border':'#1c5243',
    }
  },
  slate_pro: {
    name: 'Slate Pro (Platinum)',
    vars: {
      '--bg-base':       '#18181b',
      '--bg-card':       '#27272a',
      '--bg-input':      '#3f3f46',
      '--border':        '#52525b',
      '--text-primary':  '#fafafa',
      '--text-muted':    '#a1a1aa',
      '--accent':        '#f9703e',
      '--accent-hover':  '#ef4f21',
      '--accent-text':   '#ffffff',
      '--sidebar-bg':    '#27272a',
      '--sidebar-border':'#52525b',
    }
  }
};

export const FONTS = {
  inter: {
    name: 'Inter (Original)',
    family: "'Inter', system-ui, sans-serif",
    description: 'Clean & highly legible UI typography (Default)'
  },
  roboto: {
    name: 'Roboto',
    family: "'Roboto', sans-serif",
    description: 'Crisp geometric modern font'
  },
  outfit: {
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    description: 'Luxury modern hotel & SaaS UI font'
  },
  plus_jakarta: {
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    description: 'Elegant executive corporate font'
  },
  poppins: {
    name: 'Poppins',
    family: "'Poppins', sans-serif",
    description: 'Friendly, clear geometric sans'
  },
  montserrat: {
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    description: 'Bold, stylish premium branding font'
  }
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem('app-theme') || 'original'
  );
  const [fontKey, setFontKey] = useState(
    () => localStorage.getItem('app-font') || 'inter'
  );

  useEffect(() => {
    const theme = THEMES[themeKey] || THEMES.original;
    const root  = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    localStorage.setItem('app-theme', themeKey);
  }, [themeKey]);

  useEffect(() => {
    const font = FONTS[fontKey] || FONTS.inter;
    document.documentElement.style.setProperty('--app-font', font.family);
    localStorage.setItem('app-font', fontKey);
  }, [fontKey]);

  const value = useMemo(
    () => ({ themeKey, setThemeKey, themes: THEMES, fontKey, setFontKey, fonts: FONTS }),
    [themeKey, fontKey]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside <ThemeProvider>');
  return ctx;
}
