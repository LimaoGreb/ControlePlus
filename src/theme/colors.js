// Compatibilidade: as cores agora vêm das paletas (ver palettes.js).
import { buildColors, DEFAULT_PALETTE_ID } from './palettes';

export const getColors = (mode) => buildColors(DEFAULT_PALETTE_ID, mode);
