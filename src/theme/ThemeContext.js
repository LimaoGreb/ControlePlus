// Contexto de tema: modo (escuro/claro) + paleta de cores escolhida, com persistência.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { buildColors, PALETTES, DEFAULT_PALETTE_ID } from './palettes';
import { loadTheme, saveTheme, loadPalette, savePalette } from '../services/storage';

const ThemeContext = createContext({
  mode: 'dark',
  paletteId: DEFAULT_PALETTE_ID,
  colors: buildColors(DEFAULT_PALETTE_ID, 'dark'),
  palettes: PALETTES,
  toggleTheme: () => {},
  setPalette: () => {},
  ready: false,
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadTheme(), loadPalette()]).then(([t, p]) => {
      setMode(t);
      setPaletteId(p);
      setReady(true);
    });
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  };

  const setPalette = (id) => {
    setPaletteId(id);
    savePalette(id);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        paletteId,
        colors: buildColors(paletteId, mode),
        palettes: PALETTES,
        toggleTheme,
        setPalette,
        ready,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
