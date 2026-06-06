// Cálculos da carteira de investimentos.
import { typeGroup, typeLabel, GROUPS } from '../data/investmentTypes';

const num = (v) => Number(v) || 0;

// Totais gerais da carteira.
export function portfolioTotals(list) {
  const items = list || [];
  let invested = 0;
  let current = 0;
  for (const it of items) {
    invested += num(it.invested);
    current += num(it.current);
  }
  const result = current - invested;
  const resultPct = invested > 0 ? (result / invested) * 100 : 0;
  return { invested, current, result, resultPct, count: items.length };
}

// Resultado de um item.
export function itemResult(it) {
  const invested = num(it.invested);
  const current = num(it.current);
  const result = current - invested;
  const resultPct = invested > 0 ? (result / invested) * 100 : 0;
  return { invested, current, result, resultPct };
}

// Agrupa por classe (Renda Fixa / Variável / Outros) para alocação.
// Retorna [{ group, current, invested, result, percentOfCurrent, items: [...] }]
export function byGroup(list) {
  const items = list || [];
  const totalCurrent = items.reduce((a, it) => a + num(it.current), 0);
  const map = {};
  for (const g of GROUPS) map[g] = { group: g, current: 0, invested: 0, items: [] };

  for (const it of items) {
    const g = typeGroup(it.typeId);
    if (!map[g]) map[g] = { group: g, current: 0, invested: 0, items: [] };
    map[g].current += num(it.current);
    map[g].invested += num(it.invested);
    map[g].items.push({ ...it, label: typeLabel(it.typeId) });
  }

  return GROUPS.map((g) => map[g])
    .filter((entry) => entry.items.length > 0)
    .map((entry) => ({
      ...entry,
      result: entry.current - entry.invested,
      percentOfCurrent: totalCurrent > 0 ? (entry.current / totalCurrent) * 100 : 0,
    }));
}
