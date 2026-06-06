// Utilidades de cor: contraste de texto e clarear/escurecer tons.

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function toHex(n) {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return v.toString(16).padStart(2, '0');
}

export function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Luminância relativa aproximada (0 = escuro, 1 = claro).
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Retorna preto ou branco — o que tiver melhor contraste sobre a cor dada.
export function contrastText(hex) {
  return luminance(hex) > 0.58 ? '#1A1A1A' : '#FFFFFF';
}

// Mistura a cor com branco (amount>0) ou preto (amount<0). amount em [-1,1].
export function mix(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

export const lighten = (hex, amount = 0.2) => mix(hex, amount);
export const darken = (hex, amount = 0.2) => mix(hex, -amount);

// Versão translúcida (rgba) de uma cor hex.
export function alpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
