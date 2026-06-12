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
    const allProj = (snapshot.projects || []).filter(p => p.name);
    const f = (filter || '').toLowerCase().trim();
    const proj = f ? allProj.filter(p => p.name.toLowerCase().includes(f)) : allProj;
    if (!proj.length) return f
      ? `🎯 Nenhum projeto com *"${filter}"* encontrado.`
      : '🎯 Nenhum projeto cadastrado no Controle+.';
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

  if (subtype === 'by_name_range') {
    const f = (filter || '').toLowerCase();
    const from = params.fromMonth ?? 0;
    const to = params.toMonth ?? new Date().getMonth();
    const lines = [];
    let grand = 0;
    for (let i = from; i <= to; i++) {
      const mm = (snapshot.months || {})[i] || {};
      const items = [...(mm.fixed || []), ...(mm.variable || [])].filter(x => (x.name || '').toLowerCase().includes(f));
      if (!items.length) continue;
      const monthTotal = items.reduce((s, x) => s + (x.value || 0), 0);
      grand += monthTotal;
      lines.push(`*${MN[i]}:* ${items.map(x => `${x.name} ${R(x.value)}`).join(', ')} — ${R(monthTotal)}`);
    }
    if (!lines.length) return `🔍 Nenhuma despesa com *"${filter}"* de ${MN[from]} a ${MN[to]}.`;
    return `🔍 *"${filter}"* de ${MN[from]} a ${MN[to]}\n\n${lines.join('\n')}\n\n*Total: ${R(grand)}*`;
  }

  if (subtype === 'analysis') {
    const from = params.fromMonth ?? 0;
    const to = params.toMonth ?? new Date().getMonth();
    const months = snapshot.months || {};
    let totalInc = 0, totalExp = 0, totalCont = 0;
    const summaries = [];
    for (let i = from; i <= to; i++) {
      const mm = months[i] || {};
      const tInc  = (mm.incomes || []).reduce((s, x) => s + (x.value || 0), 0);
      const tFix  = (mm.fixed || []).reduce((s, x) => s + (x.value || 0), 0);
      const tVar  = (mm.variable || []).reduce((s, x) => s + (x.value || 0), 0);
      const tCont = (mm.contributions || []).reduce((s, x) => s + (x.value || 0), 0);
      const tExp  = tFix + tVar;
      totalInc += tInc; totalExp += tExp; totalCont += tCont;
      summaries.push({ name: MN[i], tInc, tExp, tCont, bal: tInc - tExp - tCont });
    }
    const totalBal = totalInc - totalExp - totalCont;
    const rate = totalInc > 0 ? (totalBal / totalInc) * 100 : 0;
    const grade = rate >= 30 ? 'A 🟢 Excelente' : rate >= 20 ? 'B 🟡 Ótimo' : rate >= 10 ? 'C 🟠 Regular' : rate >= 0 ? 'D 🔴 Atenção' : 'F ⛔ Crítico';
    const best = [...summaries].sort((a, b) => b.bal - a.bal)[0];
    const worst = [...summaries].sort((a, b) => a.bal - b.bal)[0];
    const label = from === 0 && to === new Date().getMonth() ? 'do início do ano' : `de ${MN[from]} a ${MN[to]}`;
    const details = summaries.map(s => {
      const icon = s.bal >= 0 ? '✅' : '❌';
      return `${icon} *${s.name}:* Renda ${R(s.tInc)} · Gastos ${R(s.tExp)} · Saldo ${R(s.bal)}`;
    }).join('\n');
    return `📊 *Análise ${label}*\n\n${details}\n\n━━━━━━━━━━━━━\n💰 Renda total: ${R(totalInc)}\n💸 Gastos total: ${R(totalExp)}\n${totalBal >= 0 ? '✅' : '⚠️'} Saldo do período: ${R(totalBal)}\n📈 Taxa de poupança: ${rate.toFixed(1)}% — Nota ${grade}\n\n🏆 Melhor mês: *${best.name}* (${R(best.bal)})\n⚠️ Pior mês: *${worst.name}* (${R(worst.bal)})`;
  }

  if (subtype === 'compare') {
    const now = new Date().getMonth();
    const m1i = params.month1 ?? ((now - 1 + 12) % 12);
    const m2i = params.month2 ?? now;
    const f = (params.filter || '').toLowerCase();

    function getMonthTotals(mi) {
      const mm = (snapshot.months || {})[mi] || {};
      const items = [...(mm.fixed || []), ...(mm.variable || [])];
      const filtered = f ? items.filter(i => (i.payment || '').toLowerCase().includes(f) || (i.name || '').toLowerCase().includes(f)) : items;
      const total = filtered.reduce((s, i) => s + (i.value || 0), 0);
      return { total, items: filtered };
    }

    const d1 = getMonthTotals(m1i);
    const d2 = getMonthTotals(m2i);
    const diff = d2.total - d1.total;
    const pct = d1.total > 0 ? Math.abs((diff / d1.total) * 100).toFixed(1) : null;
    const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '↔️';
    const filterLabel = params.filter ? ` — ${params.filter}` : '';

    const lines = [`${arrow} *Comparativo${filterLabel}*\n`];
    lines.push(`📅 *${MN[m1i]}:* ${R(d1.total)}`);
    if (f && d1.items.length) d1.items.slice(0, 8).forEach(i => lines.push(`  · ${i.name}: ${R(i.value)}`));
    lines.push('');
    lines.push(`📅 *${MN[m2i]}:* ${R(d2.total)}`);
    if (f && d2.items.length) d2.items.slice(0, 8).forEach(i => lines.push(`  · ${i.name}: ${R(i.value)}`));
    lines.push('\n━━━━━━━━━━━━━');
    if (diff > 0)
      lines.push(`⬆️ +${R(diff)} a mais em ${MN[m2i]}${pct ? ` (+${pct}%)` : ''}`);
    else if (diff < 0)
      lines.push(`⬇️ ${R(Math.abs(diff))} a menos em ${MN[m2i]}${pct ? ` (-${pct}%)` : ''}`);
    else
      lines.push('↔️ Mesmo valor nos dois meses');

    return lines.join('\n');
  }

  // summary / total_month (default)
  const contributions = m.contributions || [];
  const tInc  = incomes.reduce((s, i) => s + (i.value || 0), 0);
  const tFix  = fixed.reduce((s, i) => s + (i.value || 0), 0);
  const tVar  = variable.reduce((s, i) => s + (i.value || 0), 0);
  const tCont = contributions.reduce((s, i) => s + (i.value || 0), 0);
  const tExp  = tFix + tVar;
  const bal   = tInc - tExp - tCont;
  const contLine = tCont > 0 ? `\n💜 Contribuições: ${R(tCont)}` : '';
  return `📊 *${mn}*\n\n💰 Renda: ${R(tInc)}\n💸 Gastos: ${R(tExp)}\n  ├ Fixos: ${R(tFix)}\n  └ Variáveis: ${R(tVar)}${contLine}\n\n${bal >= 0 ? '✅' : '⚠️'} Saldo: ${R(bal)}`;
}
