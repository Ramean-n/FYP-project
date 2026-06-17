import { useEffect, useState } from 'react';
import Icon from './Icons';
import { useTheme } from '../context/ThemeContext';

const readThemeFromDom = () => {
  const theme = document.documentElement.dataset.theme;
  return theme === 'dark' ? 'dark' : 'light';
};

const ThemeToggle = () => {
  const { toggleTheme } = useTheme();
  const [theme, setTheme] = useState(readThemeFromDom);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(readThemeFromDom());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const handleToggle = () => {
    toggleTheme();
    setTheme(readThemeFromDom());
  };

  return (
    <button className="icon-button" type="button" onClick={handleToggle} title="Toggle theme">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
};

export default ThemeToggle;
