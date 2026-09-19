import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'hakika_customer_dark_mode';

interface ThemeState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  // Persist every change so the state survives navigation, reloads,
  // and returning to the app later.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(darkMode));
    } catch {}
  }, [darkMode]);

  const toggleDarkMode = () => setDarkModeState(v => !v);
  const setDarkMode = (v: boolean) => setDarkModeState(v);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
