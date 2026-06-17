import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'requify-theme';

const readThemeFromDom = () => {
  const theme = document.documentElement.dataset.theme;
  return theme === 'dark' || theme === 'light' ? theme : 'light';
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readThemeFromDom);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => {
      setTheme((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        return next;
      });
    },
    setTheme: (next) => {
      if (next !== 'dark' && next !== 'light') return;
      applyTheme(next);
      setTheme(next);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};
