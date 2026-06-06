// Cálculos de totais mensais e consolidação anual.

const sum = (items) =>
  (items || []).reduce((acc, it) => acc + (Number(it.value) || 0), 0);

// Totais de um único mês.
export function monthTotals(month) {
  const m = month || {};
  const rendaTotal = sum(m.incomes);
  const fixedTotal = sum(m.fixed);
  const variableTotal = sum(m.variable);
  const contributionsTotal = sum(m.contributions);
  const despesaTotal = fixedTotal + variableTotal;
  // Saídas totais (despesas + contribuições) — usado na sobra.
  const outflowTotal = despesaTotal + contributionsTotal;
  const percentGasto = rendaTotal > 0 ? (outflowTotal / rendaTotal) * 100 : 0;
  const percentSobra = rendaTotal > 0 ? 100 - percentGasto : 0;
  const sobraTotal = rendaTotal - outflowTotal;
  // % da renda destinada a contribuições.
  const contributionsPct = rendaTotal > 0 ? (contributionsTotal / rendaTotal) * 100 : 0;
  return {
    rendaTotal,
    fixedTotal,
    variableTotal,
    contributionsTotal,
    contributionsPct,
    despesaTotal,
    outflowTotal,
    percentGasto,
    percentSobra,
    sobraTotal,
  };
}

// Verifica se um mês tem qualquer dado preenchido (valor > 0).
export function monthHasData(month) {
  const t = monthTotals(month);
  return t.rendaTotal > 0 || t.despesaTotal > 0 || t.contributionsTotal > 0;
}

// 3 estados: 'empty' | 'progress' | 'done'.
export function monthStatus(month) {
  if (month && month.completed) return 'done';
  if (monthHasData(month)) return 'progress';
  return 'empty';
}

// Agrupa as despesas (fixas + variáveis) por forma de pagamento.
// Retorna [{ name, value, percent, items: [...] }] ordenado do maior pro menor.
export function expensesByPayment(month) {
  const m = month || {};
  const all = [
    ...(m.fixed || []).map((it) => ({ ...it, categoria: 'Fixa' })),
    ...(m.variable || []).map((it) => ({ ...it, categoria: 'Variável' })),
  ];
  const map = {};
  let total = 0;
  for (const it of all) {
    const v = Number(it.value) || 0;
    if (v <= 0) continue;
    const key = (it.payment && String(it.payment).trim()) || 'Sem forma';
    if (!map[key]) map[key] = { name: key, value: 0, items: [] };
    map[key].value += v;
    map[key].items.push(it);
    total += v;
  }
  const list = Object.values(map).map((entry) => ({
    ...entry,
    percent: total > 0 ? (entry.value / total) * 100 : 0,
  }));
  list.sort((a, b) => b.value - a.value);
  return { list, total };
}

// Consolidação do ano inteiro (recebe objeto months {0..11}).
export function annualTotals(months) {
  const totals = {
    rendaTotal: 0,
    fixedTotal: 0,
    variableTotal: 0,
    contributionsTotal: 0,
    despesaTotal: 0,
    sobraTotal: 0,
    perMonth: [],
  };
  for (let i = 0; i < 12; i++) {
    const t = monthTotals(months && months[i]);
    totals.rendaTotal += t.rendaTotal;
    totals.fixedTotal += t.fixedTotal;
    totals.variableTotal += t.variableTotal;
    totals.contributionsTotal += t.contributionsTotal;
    totals.despesaTotal += t.despesaTotal;
    totals.sobraTotal += t.sobraTotal;
    totals.perMonth.push({
      index: i,
      renda: t.rendaTotal,
      despesa: t.despesaTotal,
      sobra: t.sobraTotal,
    });
  }
  return totals;
}
