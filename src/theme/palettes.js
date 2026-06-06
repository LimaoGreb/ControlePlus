// 6 paletas de cores selecionáveis pelo usuário. Cada uma define os acentos
// (primary, fixed, variable, accent) e a lista de cores p/ gráficos e swatches.
// Verde (positivo) e vermelho (negativo) são constantes em todas as paletas.
import { lighten, contrastText, alpha } from '../utils/colorUtils';

export const PALETTES = [
  {
    id: 'vintage',
    name: 'Vintage',
    primary: '#8B3A5E',
    accent: '#5B8A9A',
    fixed: '#5B8A9A',
    variable: '#E07B4C',
    swatches: ['#5B3256', '#5B8A9A', '#F2D4A5', '#E07B4C', '#8B3A5E'],
  },
  {
    id: 'oceano',
    name: 'Oceano',
    primary: '#2E86AB',
    accent: '#1B6E8C',
    fixed: '#2E86AB',
    variable: '#E63946',
    swatches: ['#1B2838', '#2E86AB', '#A8DADC', '#F1FAEE', '#E63946'],
  },
  {
    id: 'floresta',
    name: 'Floresta',
    primary: '#2D6A4F',
    accent: '#52B788',
    fixed: '#52B788',
    variable: '#6B4226',
    swatches: ['#2D6A4F', '#52B788', '#95D5B2', '#F0EAD6', '#6B4226'],
  },
  {
    id: 'noturno',
    name: 'Noturno',
    primary: '#415A77',
    accent: '#778DA9',
    fixed: '#415A77',
    variable: '#778DA9',
    swatches: ['#0D1B2A', '#1B263B', '#415A77', '#778DA9', '#E0E1DD'],
  },
  {
    id: 'pordosol',
    name: 'Pôr do Sol',
    primary: '#F8961E',
    accent: '#F3722C',
    fixed: '#F9C74F',
    variable: '#F3722C',
    swatches: ['#F9C74F', '#F8961E', '#F3722C', '#F94144', '#9B2226'],
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    primary: '#6A0DAD',
    accent: '#9B72CF',
    fixed: '#9B72CF',
    variable: '#F2B5D4',
    swatches: ['#E8D5F5', '#9B72CF', '#6A0DAD', '#F2B5D4', '#D5C6E0'],
  },
];

export const DEFAULT_PALETTE_ID = 'vintage';

// Cores semânticas constantes (independem da paleta).
const POSITIVE = '#2BB673';
const NEGATIVE = '#E5484D';
const WARNING = '#F5A524';

export function getPalette(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

// Monta o objeto de cores completo para uma paleta + modo (dark/light).
export function buildColors(paletteId, mode) {
  const p = getPalette(paletteId);
  const isDark = mode !== 'light';

  const base = isDark
    ? {
        background: '#121212',
        card: '#1E1E1E',
        cardAlt: '#2A2A2A',
        border: '#3A3A3A',
        text: '#FFFFFF',
        textSecondary: '#B5B5B5',
        textMuted: '#7C7C7C',
        inputBg: '#262626',
        tabBar: '#181818',
      }
    : {
        background: '#F4F5F7',
        card: '#FFFFFF',
        cardAlt: '#EEF0F4',
        border: '#E2E6EC',
        text: '#1A202C',
        textSecondary: '#4A5568',
        textMuted: '#9AA5B1',
        inputBg: '#FFFFFF',
        tabBar: '#FFFFFF',
      };

  const primary = p.primary;
  const tabActive = isDark ? lighten(primary, 0.35) : primary;

  return {
    ...base,
    mode: isDark ? 'dark' : 'light',
    paletteId: p.id,

    primary,
    primaryLight: tabActive,
    onPrimary: contrastText(primary),
    accent: p.accent,

    fixed: p.fixed,
    variable: p.variable,
    onFixed: contrastText(p.fixed),
    onVariable: contrastText(p.variable),

    income: POSITIVE,
    positive: POSITIVE,
    negative: NEGATIVE,
    warning: WARNING,

    // Cores para gráficos (até 6 fatias/barras).
    chart: p.swatches,
    alpha,
    shadow: '#000000',
  };
}
