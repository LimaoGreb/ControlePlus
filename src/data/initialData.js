// Estrutura inicial do app. O app começa COMPLETAMENTE ZERADO — sem nenhuma
// renda, despesa ou mês concluído. O usuário cadastra tudo manualmente.

export const YEAR = 2026;

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

// Mês vazio: sem itens e não concluído.
function emptyMonth() {
  return { incomes: [], fixed: [], variable: [], contributions: [], completed: false };
}

export function buildInitialMonths() {
  const months = {};
  for (let m = 0; m < 12; m++) months[m] = emptyMonth();
  return months;
}

export function buildInitialData() {
  return {
    year: YEAR,
    months: buildInitialMonths(),
  };
}
