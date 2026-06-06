// Formatação e parsing de moeda no padrão brasileiro (pt-BR / BRL).
// Implementação manual para não depender de Intl/ICU (nem sempre disponível no Hermes).

// Formata um número como "1.500,00" (sem o prefixo R$).
export function formatNumber(value) {
  const n = Number.isFinite(value) ? value : 0;
  const negative = n < 0;
  const abs = Math.abs(n);
  const fixed = abs.toFixed(2); // "1500.00"
  const [intPart, decPart] = fixed.split('.');
  // Insere separador de milhar (ponto).
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${withThousands},${decPart}`;
}

// Formata como moeda completa: "R$ 1.500,00".
export function formatBRL(value) {
  return `R$ ${formatNumber(value)}`;
}

// Formata percentual: "73,5%".
export function formatPercent(value) {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toFixed(1).replace('.', ',')}%`;
}

// Formato compacto para rótulos de gráfico: 1500 -> "1,5k", 1200000 -> "1,2M".
export function formatCompact(value) {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1).replace('.', ',')}k`;
  return `${sign}${Math.round(abs)}`;
}

// Converte os dígitos digitados (interpretados como centavos) em valor numérico.
// Ex.: o usuário digita "150000" -> 1500.00 reais.
export function digitsToValue(text) {
  const digits = String(text).replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

// Converte uma string em padrão BR ("1.500,00" ou "1500,5") em número.
export function parseBRL(text) {
  if (typeof text === 'number') return text;
  if (!text) return 0;
  const clean = String(text)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}
