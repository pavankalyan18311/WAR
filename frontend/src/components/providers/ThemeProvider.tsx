'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  const applyTheme = useCallback((mode: ThemeMode) => {
    let resolved: 'light' | 'dark' = 'dark';

    if (mode === 'system') {
      const isSystemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = isSystemDark ? 'dark' : 'light';
    } else {
      resolved = mode;
    }

    setThemeState(mode);
    setResolvedTheme(resolved);

    if (typeof document !== 'undefined') {
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('war-theme', mode);
      localStorage.setItem('threadx-theme', mode);
    }
  }, []);

  useEffect(() => {
    const stored = (localStorage.getItem('war-theme') || localStorage.getItem('threadx-theme')) as ThemeMode | null;
    const initialMode: ThemeMode = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
    applyTheme(initialMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentStored = (localStorage.getItem('war-theme') || localStorage.getItem('threadx-theme')) as ThemeMode | null;
      if (!currentStored || currentStored === 'system') {
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [applyTheme]);

  const setTheme = (mode: ThemeMode) => {
    applyTheme(mode);
  };

  const toggleTheme = () => {
    if (theme === 'dark') applyTheme('light');
    else if (theme === 'light') applyTheme('system');
    else applyTheme('dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
