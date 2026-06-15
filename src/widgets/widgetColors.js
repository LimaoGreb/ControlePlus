// Versão leve do sistema de cores para widgets (sem dependências externas).
// Espelha buildColors() de palettes.js mas só com hex puro — sem alpha/lighten.
const PALETTE_PRIMARIES = {
  vintage:  { primary: '#8B3A5E', accent: '#5B8A9A' },
  oceano:   { primary: '#2E86AB', accent: '#1B6E8C' },
  floresta: { primary: '#2D6A4F', accent: '#52B788' },
  noturno:  { primary: '#415A77', accent: '#778DA9' },
  pordosol: { primary: '#F8961E', accent: '#F3722C' },
  lavanda:  { primary: '#6A0DAD', accent: '#9B72CF' },
};

export function getWidgetColors(paletteId = 'vintage', mode = 'dark') {
  const p = PALETTE_PRIMARIES[paletteId] || PALETTE_PRIMARIES.vintage;
  const isDark = mode !== 'light';
  return {
    bg:        isDark ? '#1E1E1E' : '#FFFFFF',
    bgAlt:     isDark ? '#2A2A2A' : '#F4F5F7',
    bgBar:     isDark ? '#3A3A3A' : '#E2E6EC',
    text:      isDark ? '#FFFFFF' : '#1A202C',
    textSub:   isDark ? '#B5B5B5' : '#4A5568',
    textMuted: isDark ? '#7C7C7C' : '#9AA5B1',
    border:    isDark ? '#3A3A3A' : '#E2E6EC',
    primary:   p.primary,
    accent:    p.accent,
    positive:  '#2BB673',
    negative:  '#E5484D',
    warning:   '#F5A524',
  };
}
