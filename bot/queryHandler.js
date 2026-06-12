// Responde consultas do usuario lendo o snapshot do Firebase.
const MN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const R = (v) => `R$ ${(v || 0).toFixed(2)}`;

function resolveMonth(month) {
  if (!month) return new Date().getMonth();
  const idx = MN.findIndex(m => m.toLowerCase().includes(month.toLowerCase().substring(0, 3)));
  return idx >= 0 ? idx : new Date().getMonth();
}

export function answerQuery(snapshot, params) {
  if (!snapshot) return '❌ Sem dados. Abra o Controle+ para sincronizar com o Jarvis.';

  const { subtype, month, filter } = params || {};
  const mi = resolveMonth(month);
  const mn = MN[mi];
  const m = (snapshot.months || {})[mi] || {};
  const fixed = m.fixed || [];
  const variable = m.variable || [];
  const incomes = m.incomes || [];
  const all = [...fixed, ...variable];

  if (subtype === 'investments') {
    const inv = (snapshot.investments || []).filter(i => i.name);
    if (!inv.length) return '📈 Nenhum investimento cadastrado no Controle+.';
    const tInv = inv.reduce((s, i) => s + (i.invested || 0), 0);
    const tCur = inv.reduce((s, i) => s + (i.current || i.invested || 0), 0);
    const result = tCur - tInv;
    return `📈 *Investimentos*\n\nInvestido: ${R(tInv)}\nAtual: ${R(tCur)}\n${result >= 0 ? '🟢' : '🔴'} ${result >= 0 ? '+' : ''}${R(result)}\n\n${inv.map(i => `• ${i.name}: ${R(i.current || i.invested || 0)}`).join('\n')}`;
  }

  if (subtype === 'projects') {
    const proj = (snapshot.projects || []).filter(p => p.name);
    if (!proj.length) return '🎯 Nenhum projeto cadastrado no Controle+.';
    return `🎯 *Projetos*\n\n${proj.map(p => {
      const pct = p.target > 0 ? Math.min(100, Math.round((p.saved || 0) / p.target * 100)) : 0;
      return `*${p.name}*\n${R(p.saved || 0)} / ${R(p.target || 0)} — ${pct}%`;
    }).join('\n\n')}`;
  }

  if (subtype === 'by_week') {
    const now = new Date();
    // Semana começa na segunda
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekItems = all.filter(i => i.date && new Date(i.date) >= startOfWeek);
    if (!weekItems.length) return `📅 Nenhuma despesa registrada nesta semana (as despesas adicionadas antes desta versão não têm data individual).`;
    const total = weekItems.reduce((s, i) => s + (i.value || 0), 0);
    return `📅 *Esta semana*\n\n${weekItems.map(i => `• ${i.name}: ${R(i.value)}`).join('\n')}\n\nTotal: *${R(total)}*`;
  }

  if (subtype === 'biggest') {
    const sorted = [...all].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);
    if (!sorted.length) return `📋 Nenhuma despesa em ${mn}.`;
    return `🏆 *Top gastos de ${mn}*\n\n${sorted.map((i, n) => `${n + 1}. ${i.name}: ${R(i.value)}`).join('\n')}`;
  }

  if (subtype === 'by_payment') {
    const f = (filter || '').toLowerCase();
    const filtered = f ? all.filter(i => (i.payment || '').toLowerCase().includes(f)) : all;
    if (!filtered.length) return `💳 Sem gastos ${f ? `com "${filter}"` : ''} em ${mn}.`;
    const total = filtered.reduce((s, i) => s + (i.value || 0), 0);
    return `💳 *${filter || 'Todos'} — ${mn}*\n\nTotal: ${R(total)}\n\n${filtered.map(i => `• ${i.name}: ${R(i.value)}`).join('\n')}`;
  }

  if (subtype === 'by_name') {
    const f = (filter || '').toLowerCase();
    const filtered = all.filter(i => (i.name || '').toLowerCase().includes(f));
    if (!filtered.length) return `🔍 Nenhuma despesa com "${filter}" em ${mn}.`;
    const total = filtered.reduce((s, i) => s + (i.value || 0), 0);
    return `🔍 *"${filter}" em ${mn}*\n\n${filtered.map(i => `• ${i.name}: ${R(i.value)}`).join('\n')}\nTotal: ${R(total)}`;
  }

  // summary / total_month (default)
  const tInc = incomes.reduce((s, i) => s + (i.value || 0), 0);
  const tFix = fixed.reduce((s, i) => s + (i.value || 0), 0);
  const tVar = variable.reduce((s, i) => s + (i.value || 0), 0);
  const tExp = tFix + tVar;
  const bal = tInc - tExp;
  return `📊 *${mn}*\n\n💰 Renda: ${R(tInc)}\n💸 Gastos: ${R(tExp)}\n  ├ Fixos: ${R(tFix)}\n  └ Variáveis: ${R(tVar)}\n\n${bal >= 0 ? '✅' : '⚠️'} Saldo: ${R(bal)}`;
}
