// Utilitários compartilhados entre os widgets.

export function fmtBRL(val) {
  const neg = val < 0;
  const abs = Math.abs(val || 0);
  const str = abs.toFixed(2);
  const [int, dec] = str.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-R$ ' : 'R$ ') + intFmt + ',' + dec;
}

export function progressColor(pct, colors) {
  if (pct >= 0.9) return colors.negative;
  if (pct >= 0.7) return colors.warning;
  return colors.positive;
}

export const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
