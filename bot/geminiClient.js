// Classifica intencoes via classificador local + Gemini Flash como fallback.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function parseNum(s) {
  const map = { dois:2, duas:2, tres:3, três:3, quatro:4, cinco:5, seis:6 };
  return parseInt(s) || map[s.toLowerCase()] || 3;
}

// Detecta range de meses → { from, to } (índices 0–11) ou null
function parseMonthRange(t) {
  const now = new Date().getMonth();
  if (/desde\s*(o\s*)?in[íi]cio\s*(do\s*ano)?|desde\s*janeiro|do\s*in[íi]cio\s*do\s*ano/i.test(t))
    return { from: 0, to: now };
  if (/ano\s*(completo|inteiro|todo)|o\s*ano\s*inteiro/i.test(t))
    return { from: 0, to: 11 };
  const primMatch = t.match(/primeiros?\s+(\d+|tr[eê]s|dois?|quatro|cinco|seis)/i);
  if (primMatch) { const n = parseNum(primMatch[1]); return { from: 0, to: Math.min(n - 1, 11) }; }
  const ultMatch = t.match(/[uú]ltimos?\s+(\d+|tr[eê]s|dois?|quatro|cinco|seis)\s*mes/i);
  if (ultMatch) { const n = parseNum(ultMatch[1]); return { from: Math.max(0, now - n + 1), to: now }; }
  return null;
}

// Resolve referências relativas e nomes de mês → retorna nome do mês em PT
function getMonthName(t) {
  if (/m[eê]s\s*(passado|anterior|[uú]ltimo)|[uú]ltimo\s*m[eê]s/i.test(t))
    return MONTH_PT[((new Date().getMonth() - 1) + 12) % 12];
  if (/pr[oó]ximo\s*m[eê]s|m[eê]s\s*(que\s*vem|seguinte)/i.test(t))
    return MONTH_PT[(new Date().getMonth() + 1) % 12];
  if (/m[eê]s\s*(atual|corrente|de\s*hoje|vigente)|esse\s*m[eê]s|este\s*m[eê]s/i.test(t))
    return MONTH_PT[new Date().getMonth()];
  return MONTH_PT.find(m => t.includes(m)) || null;
}

// Remove palavras de ruído e retorna filtro de nome, ou null se não sobrar nada útil
function extractNameFilter(t) {
  const noise = [
    'quanto','eu','vc','voce','você','gastei','gastou','gasto','gastar',
    'paguei','pagou','pagar','comprei','comprou','despesa','despesas','gastos',
    'foram','foi','ficou','no','na','nos','nas','de','do','da','dos','das',
    'em','com','por','para','até','ate','esse','este','essa','esta','esses','estes',
    'meu','minha','meus','minhas','o','a','os','as','um','uma','uns','umas',
    'mes','mês','passado','anterior','atual','corrente','ultimo','último',
    'proximo','próximo','seguinte','vem','que','ja','já','aqui','agora','hoje',
    'ontem','semana','ano','jarvis','controle','quais','qual','sao','são',
    ...MONTH_PT,
  ];
  const re = new RegExp(`\\b(${noise.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const cleaned = t.replace(re, ' ').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim();
  return (cleaned.length >= 2 && !/^\d+$/.test(cleaned)) ? cleaned.toLowerCase() : null;
}

// Classificador local — sem API. Cobre >95% dos casos reais.
function localClassify(t) {
  const month = getMonthName(t);

  // ── Exportar ──────────────────────────────────────────────────────────────
  if (/exporta|exportar|planilha|csv|meus dados|baixar dados|relat[oó]rio|gera(r)?\s*(arquivo|relat)/.test(t))
    return { intent: 'export', params: {} };

  // ── Parcelar compra (ANTES do cardMatch — "parcelei no crédito" é parcela, não by_payment) ──
  if (/parcel[eio]u?|parcel(ar|amento|ada?|ado)|divid[iu]\s*(em|n)?\s*\d+|\bem\s*\d+\s*[xX]\b|\d+\s*[xX]\s*(no|na|de|do)\b|financ[ie]|prestac|presta[çc]/.test(t))
    return { intent: 'add_installments', params: {} };

  // ── Mudar vencimento ──────────────────────────────────────────────────────
  if (/vencimento|vence\s*(dia|no\s*dia|n[ao]\s*dia)|\bmuda\s*(o\s*)?venc|atualiz\w*\s*(o\s*)?venc|novo\s*vencimento|troc\w+\s*(o\s*)?venc|dia\s*de\s*pagamento|muda\s*o\s*dia/.test(t))
    return { intent: 'update_due_date', params: {} };

  // ── Investimentos ─────────────────────────────────────────────────────────
  if (/investimento|carteira|rendimento|aporte|aplica[çc][aã]o|quanto\s*(eu\s*)?investi|minha\s*carteira|a[çc][oõ]es?|fii\b|tesouro|cdb\b|lci\b|lca\b|cripto|bitcoin|btc\b/.test(t))
    return { intent: 'query', params: { subtype: 'investments', month } };

  // ── Projetos ──────────────────────────────────────────────────────────────
  if (/projeto|meta\b|objetivo|poupando|guardando|economiz|juntando\s*dinheiro|reserva/.test(t))
    return { intent: 'query', params: { subtype: 'projects', month } };

  // ── Concluir / marcar como pago ───────────────────────────────────────────
  if (/conclu[ií]|conclua|concluir|marqu?e?\s*(como\s*)?(pago|paga)|marca\s*(como\s*)?(pago|paga)|quitar?|quit[ae]|j[aá]\s*paguei\s*(o|a)\b|liquidar|liquidei|j[aá]\s*(t[aá]|foi)\s*pago|efetu[ea]r?\s*pagamento/.test(t)) {
    const nameRaw = t
      .replace(/\b(conclua|concluir|conclu[ií]|marque?|marca|quitar?|quit[ae]|j[aá]\s*paguei|liquidar|liquidei|efetu[ea]r?)\b/gi, '')
      .replace(/\b(a\s+despesa\s+d[ao]?|o\s+gasto\s+d[ao]?|despesa\s+d[ao]?|a\s+conta\s+d[ao]?|como\s+pag[ao]|pra\s+mim|para\s+mim|jarvis|o\s+pagamento\s+d[ao]?)\b/gi, '')
      .replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (nameRaw.length >= 2)
      return { intent: 'conclude_expense', params: { expense_name: nameRaw } };
  }

  // ── Análise / feedback multi-mês ─────────────────────────────────────────
  const hasSingleMonth = /esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente|de\s*hoje)|esse\s*m[eê]s\s*atual/i.test(t);
  const hasRange = /desde|primeiros?|[uú]ltimos?\s+\d|[uú]ltimos?\s+(tr[eê]s|dois?|quatro)|ano\s*(completo|inteiro|todo)|o\s*ano/i.test(t);
  if (!hasSingleMonth && /\bfeedback\b|an[aá]lise|analisa(r|me)?|como\s+(foi(ram)?|est[aá])\s+(o\s*)?(ano|meses|per[ií]odo)|resumo\s+(do\s+)?(ano|per[ií]odo|trim|primeiros?|[uú]ltimos?)|primeiros?\s+\d+\s*mes|[uú]ltimos?\s+\d+\s*mes|primeiros?\s+(tr[eê]s|dois?|quatro)|[uú]ltimos?\s+(tr[eê]s|dois?|quatro)/i.test(t)) {
    const range = hasRange ? parseMonthRange(t) : null;
    if (range || /ano|primeiros?|[uú]ltimos?|desde/i.test(t)) {
      const r = range || { from: 0, to: new Date().getMonth() };
      return { intent: 'query', params: { subtype: 'analysis', fromMonth: r.from, toMonth: r.to } };
    }
    return { intent: 'query', params: { subtype: 'summary', month: MONTH_PT[new Date().getMonth()] } };
  }

  // ── Por semana ────────────────────────────────────────────────────────────
  if (/\bsemana\b/.test(t))
    return { intent: 'query', params: { subtype: 'by_week', month: null } };

  // ── Maiores gastos ────────────────────────────────────────────────────────
  if (/maior(es)?|top\s*\d|piores?|mais\s*caro|mais\s*cara|o\s*que\s*(mais\s*)?(gast|custou)|gastei?\s*mais|mais\s*pesado|saiu\s*mais|custou\s*mais/.test(t))
    return { intent: 'query', params: { subtype: 'biggest', month } };

  const hasQuery = /quanto|gast|resumo|total|como\s*(t[aá]|foi|est[aá])|saldo|sobr[ao]u|sobr|sobrando|balanç|balanco|fiz|gastamos|dispend|situac|financ[ei]|dinheiro|fechamento|mensal|qto|kanto|gastei|saiu|foi\s*parar/.test(t);

  // ── Comparativo entre dois meses ─────────────────────────────────────────
  if (/comparativo|comparar|compar[ae]\b|\bvs\.?\s|\bversus\b|diferen[çc]a\s*entre|compara[çc][aã]o|evolu[ií]|evoluiu|melhor[ao]u|pior[ao]u\s*esse\s*m[eê]s/i.test(t)) {
    const now = new Date().getMonth();
    const months = [];
    MONTH_PT.forEach((m, i) => { if (t.includes(m)) months.push(i); });
    if (/m[eê]s\s*(passado|anterior|[uú]ltimo)|[uú]ltimo\s*m[eê]s/i.test(t))
      months.unshift(((now - 1) + 12) % 12);
    if (/esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente)/i.test(t))
      if (!months.includes(now)) months.push(now);
    const cardMatchC = t.match(/nubank|nu\b|c6\s*bank|c6\b|picpay|next|inter|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|pix|d[eé]bito|cr[eé]dito/);
    const month1 = months[0] ?? ((now - 1 + 12) % 12);
    const month2 = months[1] !== undefined ? months[1] : now;
    return { intent: 'query', params: { subtype: 'compare', month1, month2, filter: cardMatchC ? cardMatchC[0].trim() : null } };
  }

  // ── Por cartão / forma de pagamento ──────────────────────────────────────
  const cardMatch = t.match(/nubank|nu\b|c6\s*bank|c6\b|picpay|next|inter|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|will\s*bank|will\b|pix|d[eé]bito|cr[eé]dito/);
  if (hasQuery && cardMatch)
    return { intent: 'query', params: { subtype: 'by_payment', month, filter: cardMatch[0].trim() } };

  // ── Por nome / categoria ──────────────────────────────────────────────────
  if (hasQuery) {
    const nameFilter = extractNameFilter(t);
    const genericTerms = ['tudo','mes','geral','resumo','total','saldo','balanço','balanco','gastos','despesas','quanto','qto','dinheiro','situacao','fechamento','financas'];
    if (nameFilter && nameFilter.length >= 3 && !genericTerms.includes(nameFilter)) {
      const range = parseMonthRange(t);
      if (range) {
        return { intent: 'query', params: { subtype: 'by_name_range', fromMonth: range.from, toMonth: range.to, filter: nameFilter } };
      }
      return { intent: 'query', params: { subtype: 'by_name', month, filter: nameFilter } };
    }
    return { intent: 'query', params: { subtype: 'summary', month } };
  }

  return null; // ambíguo — tenta Gemini
}

const PROMPT = `Classifique a mensagem de um app de finanças pessoais em PT-BR.
Retorne SOMENTE JSON sem markdown.

Intenções:
- "query": consultar dados (gastos, resumo, investimentos, projetos)
- "add_installments": parcelar compra
- "update_due_date": mudar vencimento de despesa fixa
- "export": exportar CSV
- "chat": saudação ou conversa

Para query:
  subtype: "summary"|"by_payment"|"biggest"|"investments"|"projects"|"by_name"|"by_name_range"|"analysis"|"compare"
  month: nome do mês PT-BR (aceita "mês passado", "mês anterior") ou null
  filter: texto de filtro ou null
  fromMonth: índice do mês inicial (0=jan) — para by_name_range e analysis
  toMonth: índice do mês final (0=jan) — para by_name_range e analysis
  month1: índice do 1º mês (0=jan) — para compare
  month2: índice do 2º mês (0=jan) — para compare

Para add_installments: name, total_value, installments, payment, month
Para update_due_date: expense_name, new_day
Para export/chat: {}

Retorne: {"intent":"...","params":{...}}`;

export async function classifyIntent(text) {
  const local = localClassify(text.toLowerCase());
  if (local) return local;

  const key = process.env.GEMINI_API_KEY;
  if (!key) return { intent: 'chat', params: {} };
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT + '\n\nMensagem: ' + text }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 300 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.warn('[Gemini] classify error:', e.message);
    return { intent: 'chat', params: {} };
  }
}
