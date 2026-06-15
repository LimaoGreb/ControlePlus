// Responde consultas do usuario lendo o snapshot do Firebase.
const MN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const R  = (v) => `R$ ${(v || 0).toFixed(2)}`;
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

function resolveMonth(month) {
  if (!month) return new Date().getMonth();
  const idx = MN.findIndex(m => m.toLowerCase().includes(month.toLowerCase().substring(0, 3)));
  return idx >= 0 ? idx : new Date().getMonth();
}

export function answerQuery(snapshot, params) {
  if (!snapshot) return 'Ainda sem dados aqui. Abre o Controle+ pra sincronizar tudo comigo. 😊';

  const { subtype, month, filter } = params || {};
  const mi = resolveMonth(month);
  const mn = MN[mi];
  const m  = (snapshot.months || {})[mi] || {};
  const fixed    = m.fixed    || [];
  const variable = m.variable || [];
  const incomes  = m.incomes  || [];
  const all = [...fixed, ...variable];

  // ── Investimentos ─────────────────────────────────────────────────────────
  if (subtype === 'investments') {
    const inv = (snapshot.investments || []).filter(i => i.name);
    if (!inv.length) return 'Você ainda não tem investimentos cadastrados no Controle+.';
    const tInv = inv.reduce((s, i) => s + (i.invested || 0), 0);
    const tCur = inv.reduce((s, i) => s + (i.current || i.invested || 0), 0);
    const result = tCur - tInv;
    const perf = result >= 0 ? `🟢 +${R(result)} de rendimento` : `🔴 ${R(Math.abs(result))} em perda`;
    return `📈 *Sua carteira*\n\nInvestido: *${R(tInv)}*\nValor atual: *${R(tCur)}*\n${perf}\n\n${inv.map(i => `• ${i.name}: ${R(i.current || i.invested || 0)}`).join('\n')}`;
  }

  // ── Projetos / metas ──────────────────────────────────────────────────────
  if (subtype === 'projects') {
    const allProj = (snapshot.projects || []).filter(p => p.name);
    const f = (filter || '').toLowerCase().trim();
    const proj = f ? allProj.filter(p => p.name.toLowerCase().includes(f)) : allProj;
    if (!proj.length) return f
      ? `Não encontrei nenhum projeto chamado _"${filter}"_. Confere se o nome está certo no Controle+.`
      : 'Nenhum projeto criado ainda. Me pede pra adicionar um ou cria pelo Controle+. 🎯';
    return `🎯 *Seus projetos*\n\n${proj.map(p => {
      const pct = p.target > 0 ? Math.min(100, Math.round((p.saved || 0) / p.target * 100)) : 0;
      const filled = Math.round(pct / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      return `*${p.name}*\n${bar} ${pct}%\n${R(p.saved || 0)} de ${R(p.target || 0)}`;
    }).join('\n\n')}`;
  }

  // ── Por semana ────────────────────────────────────────────────────────────
  if (subtype === 'by_week') {
    const now = new Date();
    const day = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
    startOfWeek.setHours(0, 0, 0, 0);
    const weekItems = all.filter(i => i.date && new Date(i.date) >= startOfWeek);
    if (!weekItems.length) return 'Nada registrado nessa semana ainda. Tá segurando o bolso? 💪';
    const total = weekItems.reduce((s, i) => s + (i.value || 0), 0);
    return `📅 *Essa semana*\n\n${weekItems.map(i => `• ${i.name}: ${R(i.value)}`).join('\n')}\n\n*Total: ${R(total)}*`;
  }

  // ── Maiores gastos ────────────────────────────────────────────────────────
  if (subtype === 'biggest') {
    const sorted = [...all].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);
    if (!sorted.length) return `Nenhum gasto em ${mn} ainda.`;
    return `💸 *O que mais pesou em ${mn}*\n\n${sorted.map((i, n) => `${n + 1}. ${i.name} — ${R(i.value)}`).join('\n')}`;
  }

  // ── Por forma de pagamento ────────────────────────────────────────────────
  if (subtype === 'by_payment') {
    const f = (filter || '').toLowerCase();
    const filtered = f ? all.filter(i => (i.payment || '').toLowerCase().includes(f)) : all;
    if (!filtered.length) return `Nenhum gasto${f ? ` no *${cap(filter)}*` : ''} em ${mn}.`;
    const total = filtered.reduce((s, i) => s + (i.value || 0), 0);
    return `💳 *${cap(filter) || 'Todos'} — ${mn}*\n\n${filtered.map(i => `• ${i.name}: ${R(i.value)}`).join('\n')}\n\n*Total: ${R(total)}*`;
  }

  // ── Por categoria ─────────────────────────────────────────────────────────
  if (subtype === 'by_category') {
    const catId = params.category_id;
    const CAT_LABELS = {
      alimentacao:'Alimentação', transporte:'Transporte', moradia:'Moradia',
      saude:'Saúde', lazer:'Lazer', educacao:'Educação',
      vestuario:'Vestuário', assinaturas:'Assinaturas', tech:'Tecnologia', outros:'Outros',
    };
    const catLabel = CAT_LABELS[catId] || catId;
    const catItems = all.filter(i => i.category === catId);
    if (!catItems.length)
      return `Nenhum gasto em *${catLabel}* em ${mn} ainda 🏷️\n\nDá pra categorizar no app ou via Cap:\n_"categoriza o iFood como alimentação"_`;
    const total = catItems.reduce((s, i) => s + (i.value || 0), 0);
    const tInc  = incomes.reduce((s, i) => s + (i.value || 0), 0);
    const pct   = tInc > 0 ? ` · ${((total / tInc) * 100).toFixed(0)}% da renda` : '';
    const lines = catItems.map(i => `• ${i.name}: ${R(i.value)}`).join('\n');
    return `🏷️ *${catLabel}* — ${mn}\n\n${lines}\n\n*Total: ${R(total)}*${pct}`;
  }

  // ── Por nome / categoria ──────────────────────────────────────────────────
  if (subtype === 'by_name') {
    const f = (filter || '').toLowerCase();
    const filtered = all.filter(i => (i.name || '').toLowerCase().includes(f));
    if (!filtered.length) return `Não achei nada com _${filter}_ em ${mn}. Já registrou isso no Controle+?`;
    const total = filtered.reduce((s, i) => s + (i.value || 0), 0);
    return `*${cap(filter)}* em ${mn}\n\n${filtered.map(i => `• ${i.name}: ${R(i.value)}`).join('\n')}\n\n*Total: ${R(total)}*`;
  }

  // ── Por nome em intervalo de meses ────────────────────────────────────────
  if (subtype === 'by_name_range') {
    const f = (filter || '').toLowerCase();
    const from = params.fromMonth ?? 0;
    const to   = params.toMonth   ?? new Date().getMonth();
    const lines = [];
    let grand = 0;
    for (let i = from; i <= to; i++) {
      const mm    = (snapshot.months || {})[i] || {};
      const items = [...(mm.fixed || []), ...(mm.variable || [])].filter(x => (x.name || '').toLowerCase().includes(f));
      if (!items.length) continue;
      const monthTotal = items.reduce((s, x) => s + (x.value || 0), 0);
      grand += monthTotal;
      lines.push(`*${MN[i]}:* ${items.map(x => `${x.name} ${R(x.value)}`).join(', ')} — ${R(monthTotal)}`);
    }
    if (!lines.length) return `Não achei nenhum gasto com _${filter}_ entre ${MN[from]} e ${MN[to]}.`;
    const rangeLabel = from === to ? MN[from] : `${MN[from]} a ${MN[to]}`;
    return `*${cap(filter)}* — ${rangeLabel}\n\n${lines.join('\n')}\n\n*Total gasto: ${R(grand)}*`;
  }

  // ── Análise multi-mês ─────────────────────────────────────────────────────
  if (subtype === 'analysis') {
    const from = params.fromMonth ?? 0;
    const to   = params.toMonth   ?? new Date().getMonth();
    const months = snapshot.months || {};
    let totalInc = 0, totalExp = 0, totalCont = 0;
    const summaries = [];
    for (let i = from; i <= to; i++) {
      const mm   = months[i] || {};
      const tInc  = (mm.incomes       || []).reduce((s, x) => s + (x.value || 0), 0);
      const tFix  = (mm.fixed         || []).reduce((s, x) => s + (x.value || 0), 0);
      const tVar  = (mm.variable      || []).reduce((s, x) => s + (x.value || 0), 0);
      const tCont = (mm.contributions || []).reduce((s, x) => s + (x.value || 0), 0);
      const tExp  = tFix + tVar;
      totalInc += tInc; totalExp += tExp; totalCont += tCont;
      summaries.push({ name: MN[i], tInc, tExp, tCont, bal: tInc - tExp - tCont });
    }
    const totalBal = totalInc - totalExp - totalCont;
    const rate     = totalInc > 0 ? (totalBal / totalInc) * 100 : 0;
    const grade    = rate >= 30 ? 'A — Excelente 🟢' : rate >= 20 ? 'B — Ótimo 🟡' : rate >= 10 ? 'C — Regular 🟠' : rate >= 0 ? 'D — Atenção 🔴' : 'F — Crítico ⛔';
    const best     = [...summaries].sort((a, b) => b.bal - a.bal)[0];
    const worst    = [...summaries].sort((a, b) => a.bal - b.bal)[0];
    const label    = from === 0 && to === new Date().getMonth() ? 'do ano até agora' : `de ${MN[from]} a ${MN[to]}`;
    const details  = summaries.map(s => {
      const icon = s.bal >= 0 ? '✅' : '❌';
      return `${icon} *${s.name}* — Renda ${R(s.tInc)} · Gastos ${R(s.tExp)} · Saldo ${R(s.bal)}`;
    }).join('\n');
    return `📊 *Análise ${label}*\n\n${details}\n\n─────────────────\n💰 Renda total: *${R(totalInc)}*\n💸 Gastos total: *${R(totalExp)}*\n${totalBal >= 0 ? '✅' : '⚠️'} Saldo do período: *${R(totalBal)}*\n📈 Taxa de poupança: ${rate.toFixed(1)}% — *${grade}*\n\n🏆 Melhor mês: *${best.name}* (${R(best.bal)})\n⚠️ Pior mês: *${worst.name}* (${R(worst.bal)})`;
  }

  // ── Comparativo entre dois meses ──────────────────────────────────────────
  if (subtype === 'compare') {
    const now = new Date().getMonth();
    const m1i = params.month1 ?? ((now - 1 + 12) % 12);
    const m2i = params.month2 ?? now;
    const f = (params.filter || '').toLowerCase();

    function getMonthTotals(idx) {
      const mm = (snapshot.months || {})[idx] || {};
      const items = [...(mm.fixed || []), ...(mm.variable || [])];
      const filtered = f ? items.filter(i => (i.payment || '').toLowerCase().includes(f) || (i.name || '').toLowerCase().includes(f)) : items;
      return { total: filtered.reduce((s, i) => s + (i.value || 0), 0), items: filtered };
    }

    const d1   = getMonthTotals(m1i);
    const d2   = getMonthTotals(m2i);
    const diff = d2.total - d1.total;
    const pct  = d1.total > 0 ? Math.abs((diff / d1.total) * 100).toFixed(1) : null;
    const filterLabel = params.filter ? ` — ${params.filter}` : '';

    const lines = [`📊 *Comparativo${filterLabel}*\n`];
    lines.push(`*${MN[m1i]}:* ${R(d1.total)}`);
    if (f && d1.items.length) d1.items.slice(0, 8).forEach(i => lines.push(`  · ${i.name}: ${R(i.value)}`));
    lines.push('');
    lines.push(`*${MN[m2i]}:* ${R(d2.total)}`);
    if (f && d2.items.length) d2.items.slice(0, 8).forEach(i => lines.push(`  · ${i.name}: ${R(i.value)}`));
    lines.push('\n─────────────────');
    if (diff > 0)
      lines.push(`📈 +${R(diff)} a mais em ${MN[m2i]}${pct ? ` (+${pct}%)` : ''}`);
    else if (diff < 0)
      lines.push(`📉 ${R(Math.abs(diff))} a menos em ${MN[m2i]}${pct ? ` (-${pct}%)` : ''}`);
    else
      lines.push('↔️ Mesmo valor nos dois meses');

    return lines.join('\n');
  }

  // ── Resumo do mês (summary / default) ─────────────────────────────────────
  const contributions = m.contributions || [];
  const tInc  = incomes.reduce((s, i) => s + (i.value || 0), 0);
  const tFix  = fixed.reduce((s, i)   => s + (i.value || 0), 0);
  const tVar  = variable.reduce((s, i) => s + (i.value || 0), 0);
  const tCont = contributions.reduce((s, i) => s + (i.value || 0), 0);
  const tExp  = tFix + tVar;
  const bal   = tInc - tExp - tCont;
  const contLine = tCont > 0 ? `\n💜 Contribuições: ${R(tCont)}` : '';
  const balIcon  = bal >= 0 ? '✅' : '⚠️';
  return `📊 *${mn}*\n\n💰 Renda: ${R(tInc)}\n💸 Gastos: ${R(tExp)}\n  ├ Fixos: ${R(tFix)}\n  └ Variáveis: ${R(tVar)}${contLine}\n\n${balIcon} Saldo: *${R(bal)}*`;
}
