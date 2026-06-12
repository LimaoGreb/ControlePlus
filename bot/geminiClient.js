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
  if (/desde\s*(o\s*)?in[íi]cio\s*(do\s*ano)?|desde\s*janeiro|do\s*in[íi]cio\s*do\s*ano|a\s*partir\s*de\s*janeiro/i.test(t))
    return { from: 0, to: now };
  const apartirMatch = t.match(/a\s*partir\s*de\s+(\w+)/i);
  if (apartirMatch) {
    const mi = MONTH_PT.findIndex(m => apartirMatch[1].toLowerCase().startsWith(m.substring(0, 3)));
    if (mi >= 0) return { from: mi, to: now };
  }
  if (/ano\s*(completo|inteiro|todo)|o\s*ano\s*inteiro|anual\b/i.test(t))
    return { from: 0, to: 11 };
  if (/esse\s*ano\b|este\s*ano\b|nesse\s*ano\b|neste\s*ano\b/i.test(t))
    return { from: 0, to: now };
  const primMatch = t.match(/primeiros?\s+(\d+|tr[eê]s|dois?|quatro|cinco|seis)/i);
  if (primMatch) { const n = parseNum(primMatch[1]); return { from: 0, to: Math.min(n - 1, 11) }; }
  const ultMatch = t.match(/[uú]ltimos?\s+(\d+|tr[eê]s|dois?|quatro|cinco|seis)\s*mes/i);
  if (ultMatch) { const n = parseNum(ultMatch[1]); return { from: Math.max(0, now - n + 1), to: now }; }
  if (/[uú]ltimos\s+meses\b/i.test(t)) return { from: Math.max(0, now - 2), to: now };
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
// Normaliza NFD antes do regex — \b não funciona com chars acentuados (á, ã, etc. são \W no JS)
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
function extractNameFilter(t) {
  const noise = [
    'quanto','qto','eu','vc','voce','você','gastei','gastou','gasto','gastar',
    'paguei','pagou','pagar','comprei','comprou','despesa','despesas','gastos',
    'foram','foi','ficou','no','na','nos','nas','de','do','da','dos','das',
    'em','com','por','para','ate','esse','este','essa','esta','esses','estes',
    'meu','minha','meus','minhas','o','a','os','as','um','uma','uns','umas',
    'mes','passado','anterior','atual','corrente','ultimo','proximo','seguinte',
    'vem','que','ja','aqui','agora','hoje','ontem','semana','ano','anual',
    'jarvis','controle','quais','qual','sao','como','ta','to','foi','ficou',
    'pra','pro','nesse','neste','desse','deste','total','totais','geral',
    'resumo','saldo','balanco','tenho','tem','teve','tive','tinha','teria',
    'fui','fiz','bem','mal','bom','boa','ruim','caro','barato','meses',
    'queria','quer','quero','ver','veja','mostra','fala','diz','anda','passa',
    'traz','diga','extrato','semanais','semanal','pfv','pf','me','mim',
    'show','summary','financeiro','corrente','vigente','gostaria','olha',
    'apura','atuais','detail','detalhes','detalhe','informa','informar',
    'valor','valores','periodo','historico',
    ...MONTH_PT.map(norm),
  ];
  const tNorm = norm(t);
  const re = new RegExp(`\\b(${noise.map(w => norm(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const cleaned = tNorm.replace(re, ' ').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim();
  return (cleaned.length >= 2 && !/^\d+$/.test(cleaned)) ? cleaned.toLowerCase() : null;
}

// Classificador local — sem API. Cobre >95% dos casos reais.
function localClassify(t) {
  const month = getMonthName(t);

  // ── Renda / receita ───────────────────────────────────────────────────────
  if (/\b(renda|sal[aá]rio|receita|recebi|proventos|faturei|faturamento|ganho|ganhei|recebimento|freela|freelance|comiss[aã]o|aluguel|pensao|pens[aã]o|benef[ií]cio|b[oô]nus)\b/.test(t) &&
      !/\b(quanto|como|resumo|total|gastos?|hist[oó]rico|investimento)\b/.test(t)) {
    const numMatch = t.match(/(\d+(?:[.,]\d{1,2})?)/);
    const value = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;
    const sourceMap = [
      [/sal[aá]rio|sal\b/, 'Salário'], [/freela|freelance/, 'Freelance'],
      [/honor[aá]rios?/, 'Honorários'], [/comiss[aã]o/, 'Comissão'],
      [/aluguel/, 'Aluguel'], [/dividend/, 'Dividendos'],
      [/pens[aã]o/, 'Pensão'], [/benef[ií]cio/, 'Benefício'],
      [/b[oô]nus/, 'Bônus'], [/13[oº]/, '13º Salário'],
      [/f[eé]rias/, 'Férias'], [/venda/, 'Venda'],
    ];
    let name = 'Renda';
    for (const [re, n] of sourceMap) { if (re.test(t)) { name = n; break; } }
    return { intent: 'income', params: { name, value, month } };
  }

  // ── Exportar ──────────────────────────────────────────────────────────────
  if (/exporta|exportar|planilha|csv|meus dados|baixar dados|relat[oó]rio/.test(t))
    return { intent: 'export', params: {} };

  // ── Parcelar compra (ANTES do cardMatch — "parcelei no crédito" é parcela, não by_payment) ──
  if (/parcel[eio]u?|parcel(ar|amento|ada?|ado)|\bem\s*\d+\s*(vezes|parcelas|[xX])\b|\d+\s*[xX]\s*(no|na|de|do)\b|financ(iar|iamento)\b|financiei\b|prestac|presta[çc]/.test(t))
    return { intent: 'add_installments', params: {} };

  // ── Mudar vencimento ──────────────────────────────────────────────────────
  if (/vencimento|vence\s*(dia|no\s*dia|n[ao]\s*dia)|\bmuda\s*(o\s*)?venc|atualiz\w*\s*(o\s*)?venc|novo\s*vencimento|muda\s*o\s*dia/.test(t))
    return { intent: 'update_due_date', params: {} };

  // ── Investimentos ─────────────────────────────────────────────────────────
  if (/investimento|carteira|rendimento|aporte|aplica[çc][aã]o|quanto\s*(eu\s*)?investi|investid[ao]\b|tenho\s*investid|minha\s*carteira|\ba[çc][oõ]es?\b|fii\b|tesouro\b|cdb\b|lci\b|lca\b|cripto|bitcoin|btc\b|portf[oó]lio|holdings?\b|\binvest\b/.test(t))
    return { intent: 'query', params: { subtype: 'investments', month } };

  // ── Projetos ──────────────────────────────────────────────────────────────
  if (/projeto|metas?\b|objetivo|poupando|guardando|economiz|juntando\s*dinheiro|reserva\b/.test(t)) {
    const pStripped = t
      .replace(/\b(status|qual|como|esta[oa]|estao|estão|meus?|minhas?|quantos?|falta|do|da|de|em|no|na|o|a|projeto|projetos|meta|metas|objetivo|objetivos)\b/gi, ' ')
      .replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
    const pFilter = pStripped.length >= 2 ? pStripped : null;
    return { intent: 'query', params: { subtype: 'projects', month, filter: pFilter } };
  }

  // ── Concluir / marcar como pago ───────────────────────────────────────────
  if (/conclu[ií]|conclua|concluir|\bmarqu?e?\b.*\b(pago|paga)\b|quitar?|quit[ae]|paguei\s*(o|a)\b|j[aá]\s*paguei|liquidar|liquidei|j[aá]\s*(t[aá]|foi)\s*pago/.test(t)) {
    if (!/quanto|total|saldo|resumo/.test(t)) {
      const nameRaw = t
        .replace(/\b(conclua|concluir|conclu[ií]|marqu?e?|quitar?|quit[ae]|j[aá]\s*paguei|paguei\s*(o|a)|liquidar|liquidei)\b/gi, '')
        .replace(/\b(a\s+minha\s+despesa\b|minha\s+despesa\b|a\s+despesa\s+d[ao]?|o\s+gasto\s+d[ao]?|despesa\s+d[ao]?|a\s+conta\s+d[ao]?|como\s+pag[ao]|pra\s+mim|para\s+mim|jarvis)\b/gi, '')
        .replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (nameRaw.length >= 2)
        return { intent: 'conclude_expense', params: { expense_name: nameRaw } };
    }
  }

  // ── Análise / feedback multi-mês ─────────────────────────────────────────
  const hasSingleMonth = /esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente|de\s*hoje)/i.test(t);
  const hasRange = /desde|a\s*partir\s*de|primeiros?|[uú]ltimos?\s+(\d|tr[eê]s|dois?|quatro|meses)|ano\s*(completo|inteiro|todo)|o\s*ano|esse\s*ano|este\s*ano|desse\s*ano|hist[oó]rico|anual\b/i.test(t);
  if (!hasSingleMonth && /\bfeedback\b|an[aá]lise|analisa(r|me)?|como\s+(foi(ram)?|est[aá])\s+(o\s*)?(ano|meses|per[ií]odo)|resumo\s+(do\s+)?(ano|per[ií]odo|trim|primeiros?|[uú]ltimos?)|per[ií]odo|primeiros?\s+\d+\s*mes|[uú]ltimos?\s+\d+\s*mes|primeiros?\s+(tr[eê]s|dois?|quatro)|[uú]ltimos?\s+(tr[eê]s|dois?|quatro)/i.test(t)) {
    const range = hasRange ? parseMonthRange(t) : null;
    if (range || /ano|primeiros?|[uú]ltimos?|desde|per[ií]odo/i.test(t)) {
      const r = range || { from: 0, to: new Date().getMonth() };
      return { intent: 'query', params: { subtype: 'analysis', fromMonth: r.from, toMonth: r.to } };
    }
    return { intent: 'query', params: { subtype: 'summary', month: MONTH_PT[new Date().getMonth()] } };
  }

  // ── Por semana ────────────────────────────────────────────────────────────
  if (/\bsemana\b|semanais?\b/.test(t))
    return { intent: 'query', params: { subtype: 'by_week', month: null } };

  // ── Comparativo (ANTES de biggest — "gastei mais no X vs mês passado" é compare) ─
  const CARD_RE = /nubank|nu\b|c6\s*bank|c6\b|picpay|next|inter|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|will\s*bank|will\b|pix|d[eé]bito|cr[eé]dito/;
  if (/comparativo|comparar|compar[aeo]\w*|\bvs\.?\b|\bversus\b|diferen[çc]a|\bdif\b|compara[çc][aã]o|evolu[çcií]\w*|evoluiu|\bcontra\b|m[eê]s\s*a\s*m[eê]s/i.test(t) ||
      (/mais\b/.test(t) && /anterior|passado/.test(t) && CARD_RE.test(t)) ||
      (/gastei\b/.test(t) && /m[eê]s\s*(passado|anterior)/.test(t) && /esse\s*m[eê]s|m[eê]s\s*atual|agora/.test(t))) {
    const now = new Date().getMonth();
    const months = [];
    MONTH_PT.forEach((m, i) => { if (t.includes(m)) months.push(i); });
    if (/m[eê]s\s*(passado|anterior|[uú]ltimo)|[uú]ltimo\s*m[eê]s/i.test(t))
      months.unshift(((now - 1) + 12) % 12);
    if (/esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente)/i.test(t))
      if (!months.includes(now)) months.push(now);
    const cardMatchC = t.match(CARD_RE);
    const month1 = months[0] ?? ((now - 1 + 12) % 12);
    const month2 = months[1] !== undefined ? months[1] : now;
    return { intent: 'query', params: { subtype: 'compare', month1, month2, filter: cardMatchC ? cardMatchC[0].trim() : null } };
  }

  // ── Maiores gastos ────────────────────────────────────────────────────────
  if (/maior(es)?|\btop\b|pior(es)?\s*gasto|mais\s*(caro|cara|altos?|elevados?|significativos?|pesados?|expressivos?)|o\s*que\s+mais\s*(gast|custou|tirou|levou|consumiu)|gastei?\s*mais\b|mais\s*pesado|saiu\s*mais\b|custou\s*mais|m[aá]ximo\b|principais?\s*(gasto|despesa)|apertou|me\s*apertou/.test(t))
    return { intent: 'query', params: { subtype: 'biggest', month } };

  const hasQuery = /quanto|qto\b|gast|resumo|total|como\s*(t[aá]|foi|est[aá]|estou|anda\b)|estou\s*(bem|mal)\b|t[aá]\s*(o\s*m[eê]s|bem\b|bom\b)|t[oô]\s*bem\b|financeiramente\b|financ\w*|queria\s*(ver|saber)|me\s*(fala|mostra|diz|passa|traz)\b|saldo|sobr[ao]u|sobr\b|sobrando|balanç|balanco|situac|dinheiro|fechamento|mensal|o\s+que\b|oq\b|paguei\b|saiu\b|foi\s*(pro|pra|para)\b|hist[oó]rico|desde\b|nos\s+[uú]ltimos|extrato\b|despesas?\b|valor\b|anual\b/.test(t);

  // ── Por cartão / forma de pagamento ──────────────────────────────────────
  const cardMatch = t.match(CARD_RE);
  // Aceita card mesmo sem hasQuery se há mês ou mensagem curta (ex: "nubank esse mês")
  if (cardMatch && (hasQuery || month || t.length < 28))
    return { intent: 'query', params: { subtype: 'by_payment', month, filter: cardMatch[0].trim() } };

  // ── Por nome / categoria ──────────────────────────────────────────────────
  if (hasQuery) {
    const nameFilter = extractNameFilter(t);
    const genericTerms = ['tudo','mes','geral','resumo','total','saldo','balanço','balanco','gastos','despesas','quanto','qto','dinheiro','situacao','fechamento','financas','como','ficou','totais','balanc','estou','historico'];
    const isGeneric = !nameFilter || nameFilter.length < 3
      || genericTerms.some(g => nameFilter === g || nameFilter.startsWith(g + ' ') || nameFilter.endsWith(' ' + g));
    if (!isGeneric) {
      // "histórico de X" ou "X nos últimos meses" → range do ano todo
      const isHist = /hist[oó]rico/i.test(t);
      const range = parseMonthRange(t);
      if (range || isHist) {
        const r = range || { from: 0, to: new Date().getMonth() };
        return { intent: 'query', params: { subtype: 'by_name_range', fromMonth: r.from, toMonth: r.to, filter: nameFilter } };
      }
      return { intent: 'query', params: { subtype: 'by_name', month, filter: nameFilter } };
    }
    return { intent: 'query', params: { subtype: 'summary', month } };
  }

  // ── Fallback: mensagem curta com mês → tenta extrair nome ou retorna summary ─
  if (month && t.length <= 30) {
    const nameFilter = extractNameFilter(t);
    const genericTerms = ['tudo','mes','geral','resumo','total','saldo','gastos','despesas','quanto','qto','dinheiro','extrato','resumao','fala','mostra','diz','ver','anda'];
    const isGeneric = !nameFilter || nameFilter.length < 2
      || genericTerms.some(g => nameFilter === g || nameFilter.startsWith(g + ' ') || nameFilter.endsWith(' ' + g));
    if (!isGeneric)
      return { intent: 'query', params: { subtype: 'by_name', month, filter: nameFilter } };
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
