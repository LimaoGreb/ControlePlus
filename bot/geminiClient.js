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
    // palavras de quantidade/totalidade — "ao todo", "em geral", etc.
    'ao','todo','todos','todas','tudo','geral','gerais',
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

  // ── Adicionar cartão/forma de pagamento (não suportado via bot) ─────────────
  // Bloqueia antes do cardMatch genérico para não virar query by_payment
  if (/\b(adicione?|adicionar|cria[rr]?|incluir?|nova?\s+forma|novo\s+cart)\b.{0,35}\b(cart[aã]o|forma\s*de\s*pagamento|m[eé]todo\s*de\s*pagamento|bandeira)\b/i.test(t) &&
      !/\blimite\b/i.test(t)) {
    return { intent: 'unsupported', params: { feature: 'payment_method' } };
  }

  // ── Limite de cartão ─────────────────────────────────────────────────────
  if (/\blimite\b.{0,35}(cart[aã]o|cr[eé]dito|card)|(cart[aã]o|cr[eé]dito).{0,35}\blimite\b/i.test(t) ||
      /\b(define|coloca|adiciona|ajusta|muda|atualiza)\b.{0,20}\blimite\b/i.test(t)) {
    const numMatch = t.match(/\d+(?:[.,]\d{1,2})?/);
    const limit = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    const CARD_RE2 = /nubank|nu\b|c6|picpay|next|inter|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|will/;
    const cardMatch = t.match(CARD_RE2);
    return { intent: 'set_credit_limit', params: { card_name: cardMatch?.[0]?.trim() || null, limit } };
  }

  // ── Nome do usuário ──────────────────────────────────────────────────────
  if (/\b(meu\s*nome\s*(é|eh|ser[aá]|vai\s*ser)|(me\s*chamo|pode\s*me\s*chamar)|(muda|troca|atualiza|coloca)\b.{0,15}\bnome\b)/i.test(t)) {
    const nameMatch = t.match(/(?:(?:meu\s*nome\s*(?:é|eh|será|vai\s*ser)\s*)|(?:me\s*chamo\s*)|(?:pode\s*me\s*chamar\s*de\s*)|(?:(?:muda|troca|atualiza|coloca)\b.{0,15}(?:nome|pra|para)\s*))(\w+)/i);
    return { intent: 'set_user_name', params: { name: nameMatch?.[1] || null } };
  }

  // ── Meta de contribuição / dízimo ───────────────────────────────────────
  if (/\b(contribui[çc][aã]o|d[íi]zimo|doa[çc][aã]o)\b.{0,30}(\d+\s*%|porcent|percent)/i.test(t) ||
      /\d+\s*%\s*.{0,15}\b(contribui[çc][aã]o|d[íi]zimo)\b/i.test(t)) {
    const pctMatch = t.match(/(\d+(?:[.,]\d{1,2})?)\s*%?/);
    const pct = pctMatch ? parseFloat(pctMatch[1].replace(',', '.')) : null;
    return { intent: 'set_contribution_pct', params: { pct } };
  }

  // ── Guardado em projeto (atualiza savings) ────────────────────────────────
  if (/\b(guardei|guarde?|poupei|poupeie?|economizei|economiz|coloque[ií]|adicionei|deposite[ií]|coloca[nd]?o)\b.{0,30}\b(projeto|meta|poupan[çc]a|reserva|viagem|carro|casa|fundo)\b|\b(guardei|poupei|economizei)\b.{0,10}\b(pra|pro|para)\b/i.test(t)) {
    const numMatch = t.match(/\d+(?:[.,]\d{1,2})?/);
    const amount = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    const stripped = t
      .replace(/\b(guardei|guarde?|poupei|poupeie?|economizei|economiz|coloque[ií]|adicionei|deposite[ií]|no|na|no\s*projeto|no\s*fundo|pra|pro|para|do|da|de|projeto|meta|poupan[çc]a|reserva|r\$|reais|mensais?)\b/gi, ' ')
      .replace(/\d+(?:[.,]\d+)?/g, ' ').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim();
    return { intent: 'update_project_saved', params: {
      project_name: stripped.length >= 2 ? stripped : null,
      amount, mode: 'add'
    }};
  }

  // ── Toggle settings (investidor / contribuições) ──────────────────────────
  if (/\b(ativa|ative|ativar|liga|ligar|habilita|habilitar|desativa|desative|desativar|desliga|desligar|desabilita|desabilitar)\b/i.test(t)) {
    const isOn = !/\b(desativ|deslig|desabilit)\b/i.test(t);
    if (/\binvest/i.test(t)) return { intent: 'toggle_setting', params: { key: 'isInvestor', value: isOn } };
    if (/contribui|doa[çc]|d[íi]zimo|doacoes?/i.test(t)) return { intent: 'toggle_setting', params: { key: 'makesContributions', value: isOn } };
  }

  // ── Mudar foto / avatar ───────────────────────────────────────────────────
  if (/\b(muda|mudar|troca|trocar|atualiza|atualizar|coloca|colocar|define|definir)\b.{0,20}\b(foto|avatar|imagem|perfil)\b|\bfoto\s*de\s*perfil\b|minha\s*foto\b/i.test(t))
    return { intent: 'set_avatar', params: {} };

  // ── Exportar ──────────────────────────────────────────────────────────────
  if (/exporta|exportar|planilha|csv|meus dados|baixar dados|relat[oó]rio/.test(t))
    return { intent: 'export', params: {} };

  // ── Parcelar compra (ANTES do cardMatch — "parcelei no crédito" é parcela, não by_payment) ──
  if (/parcel[eio]u?|parcel(ar|amento|ada?|ado)|\bem\s*\d+\s*(vezes|parcelas|meses?|[xX])\b|\d+\s*[xX]\s*(no|na|de|do)\b|financ(iar|iamento)\b|financiei\b|prestac|presta[çc]|credi[aá]rio\b/.test(t))
    return { intent: 'add_installments', params: {} };

  // ── Mudar vencimento ──────────────────────────────────────────────────────
  if (/vencimento|vence\s*(dia|no\s*dia|n[ao]\s*dia)|\bmuda\s*(o\s*)?venc|atualiz\w*\s*(o\s*)?venc|novo\s*vencimento|muda\s*o\s*dia/.test(t))
    return { intent: 'update_due_date', params: {} };

  // ── Criar projeto / meta ─────────────────────────────────────────────────
  if (/\b(cria|criar|adiciona|adicione|adicionar|novo|nova|cadastra|cadastrar)\b.{0,30}\b(projeto|meta|objetivo|poupan[çc]a|reserva)\b|\b(projeto|meta|objetivo)\b.{0,25}\b(novo|nova|cria|criar|adicionar)\b/i.test(t)) {
    const nums = (t.match(/\d+(?:[.,]\d{1,2})?/g) || []).map(n => parseFloat(n.replace(',', '.')));
    const nameStripped = t
      .replace(/\b(cria|criar|adiciona|adicione|adicionar|novo|nova|cadastra|cadastrar|um|uma|projeto|meta|objetivo|poupan[çc]a|reserva|com|de|r\$|reais|guardando|guardado|mensais?|por\s*m[eê]s|j[aá])\b/gi, ' ')
      .replace(/\d+(?:[.,]\d+)?/g, ' ').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim();
    return { intent: 'add_project', params: {
      name: nameStripped.length >= 2 ? nameStripped : null,
      target: nums[0] || null,
      monthly: nums[1] || null,
      saved: nums[2] || 0,
    }};
  }

  // ── Investimentos ─────────────────────────────────────────────────────────
  if (/investimento|carteira|rendimento|aporte|aplica[çc][aã]o|quanto\s*(eu\s*)?investi|investid[ao]\b|tenho\s*investid|minha\s*carteira|\ba[çc][oõ]es?\b|fii\b|tesouro\b|cdb\b|lci\b|lca\b|cripto|bitcoin|btc\b|portf[oó]lio|holdings?\b|\binvest\b|\bativos?\b|renda\s*fixa\b|debentur\w*|previdenci\w*|\bselic\b|\bipca\b|fundo\s*de\s*investimento\b/.test(t))
    return { intent: 'query', params: { subtype: 'investments', month } };

  // ── Projetos ──────────────────────────────────────────────────────────────
  if (/projeto|metas?\b|objetivo|poupando|guardando|economiz|juntando\s*dinheiro|reserva\b/.test(t)) {
    const pStripped = t
      .replace(/\b(status|qual|como|esta[oa]|estao|estão|meus?|minhas?|quantos?|falta|do|da|de|em|no|na|o|a|projeto|projetos|meta|metas|objetivo|objetivos)\b/gi, ' ')
      .replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
    const pFilter = pStripped.length >= 2 ? pStripped : null;
    return { intent: 'query', params: { subtype: 'projects', month, filter: pFilter } };
  }

  // ── Reabrir / desconcluir despesa ─────────────────────────────────────────
  if (/reabr[ae]|reabertur|desconclui|desmarqu?e?|reabrir|volta\s*(ao\s*)?aberto|n[aã]o\s*(est[aá]|foi)\s*pag|desfa[çz]/i.test(t)) {
    // "reabra todos os meses" → bulk de meses não suportado
    if (/\btodos?\s+os\s+meses?\b|\btodas?\s+os\s+meses?\b/i.test(t))
      return { intent: 'unsupported', params: { feature: 'bulk_reopen_months' } };
    const nameRaw = t
      .replace(/\b(reabr[ae]|reabertur\w*|desconclui[rr]?|desmarqu?e?|reabrir|volta\s*(?:ao\s*)?aberto|desfa[çz]\w*)\b/gi, '')
      // remove "todos/todas + os/as/meses/gastos/despesas" e genéricos
      .replace(/\b(todos?\s+(?:[ao]s?\s+)?(?:minhas?\s+)?(?:despesas?|gastos?|meses?|contas?)|todas?\s+(?:[ao]s?\s+)?(?:minhas?\s+)?(?:despesas?|contas?)|a\s+minha\s+despesa|minha\s+despesa|a\s+despesa\s+d[ao]?|todos?|todas?|despesas?|gastos?|contas?)\b/gi, '')
      // remove artigos soltos (ex: "a netflix" → "netflix")
      .replace(/\b(o|a|os|as)\b/gi, '')
      .replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    // isAll: pega "todos", "todas", "tudo" — inclui masculino e feminino
    const isAll = /\b(todos?|todas?|tudo|all)\b/.test(t);
    return { intent: 'reopen_expense', params: { expense_name: nameRaw.length >= 2 ? nameRaw : null, all: isAll } };
  }

  // ── Bulk conclude (não suportado) — precisa vir ANTES do conclude individual ──
  if (/\b(conclu[ií]|conclua|concluir)\b.{0,25}\b(todos?\s*os\s*meses?|todas?\s*(?:as\s*)?despesas?|todos?\s*(?:os\s*)?gastos?|tudo)\b|\b(todos?\s*os\s*meses?|todas?\s*as\s*despesas?)\b.{0,25}\b(conclu|concluir)\b/i.test(t)) {
    return { intent: 'unsupported', params: { feature: 'bulk_conclude' } };
  }

  // ── Concluir / marcar como pago ───────────────────────────────────────────
  if (/conclu[ií]|conclua|concluir|\bmarqu?e?\b.*\b(pago|paga)\b|quitar?|quit[ae]|quitad[ao]\b|paguei\s*(o|a)\b|j[aá]\s*paguei|liquidar|liquidei|liquidou\b|(foi|t[aá]|est[aá]|fica)\s*pag[ao]\b|deu\s*baixa\b|d[aá]\s*baixa\b|finaliz(ei|ou|ado|ada)\b/.test(t)) {
    if (!/quanto|total|saldo|resumo/.test(t)) {
      const nameRaw = t
        .replace(/\b(conclua|concluir|conclu[ií]|marqu?e?|quitar?|quit[ae]|j[aá]\s*paguei|paguei\s*(o|a)|liquidar|liquidei)\b/gi, '')
        .replace(/\b(a\s+minha\s+despesa\b|minha\s+despesa\b|a\s+despesa\s+d[ao]?|o\s+gasto\s+d[ao]?|despesa\s+d[ao]?|a\s+conta\s+d[ao]?|como\s+pag[ao]|pra\s+mim|para\s+mim|jarvis)\b/gi, '')
        // remove artigos soltos ("o ifood" → "ifood", "a netflix" → "netflix")
        .replace(/\b(o|a|os|as)\b/gi, '')
        .replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (nameRaw.length >= 2)
        return { intent: 'conclude_expense', params: { expense_name: nameRaw } };
    }
  }

  // ── Análise / feedback multi-mês ─────────────────────────────────────────
  const hasSingleMonth = /esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente|de\s*hoje)/i.test(t);
  const hasRange = /desde|a\s*partir\s*de|primeiros?|[uú]ltimos?\s+(\d|tr[eê]s|dois?|quatro|meses)|ano\s*(completo|inteiro|todo)|o\s*ano|esse\s*ano|este\s*ano|desse\s*ano|hist[oó]rico|anual\b|trimest\w+|semest\w+/i.test(t);
  if (!hasSingleMonth && /\bfeedback\b|an[aá]lise|analisa(r|me)?|avalia[çc][aã]o\b|como\s+(foi(ram)?|est[aá]|andam?)\s+(o\s*)?(ano|meses?|per[ií]odo)|resumo\s+d[eo]s?\s*(ano|per[ií]odo|trim\w*|semest\w*|primeiros?|[uú]ltimos?)|per[ií]odo|trimest\w+|semest\w+|primeiros?\s+\d+\s*mes|[uú]ltimos?\s+\d+\s*mes|[uú]ltimos?\s*meses\b|primeiros?\s+(tr[eê]s|dois?|quatro)|[uú]ltimos?\s+(tr[eê]s|dois?|quatro|meses)/i.test(t)) {
    const range = hasRange ? parseMonthRange(t) : null;
    if (range || /ano|primeiros?|[uú]ltimos?|desde|per[ií]odo|trimest|semest/i.test(t)) {
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
      (/gastei\b/.test(t) && /m[eê]s\s*(passado|anterior)/.test(t) && /esse\s*m[eê]s|m[eê]s\s*atual|agora/.test(t)) ||
      (/\b(cresceu|subiu|baixou|diminuiu|aumentou|reduziu|mudou|variou|piorou|melhorou|tend[eê]ncia)\b/i.test(t) && (CARD_RE.test(t) || /m[eê]s\s*(passado|anterior)|anterior|passado\b/i.test(t)))) {
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

const PROMPT = `Você é Jarvis, assistente financeiro do Controle+ (app PT-BR).
Classifique a mensagem e retorne SOMENTE JSON sem markdown, sem explicações.

INTENÇÕES:

"query" — consultar/ver dados financeiros
  subtype: "summary"|"by_payment"|"biggest"|"investments"|"projects"|"by_name"|"by_name_range"|"analysis"|"compare"|"by_week"
  month: nome do mês PT-BR ou null
  filter: filtro por nome (despesa, cartão) ou null
  fromMonth/toMonth: índices 0–11 para ranges (0=jan, 11=dez)
  month1/month2: índices 0–11 para compare

"add_installments" — parcelar compra em parcelas
  name, total_value (total da compra), installments (nº parcelas), payment, month

"update_due_date" — mudar data de vencimento de despesa fixa
  expense_name, new_day (1–31)

"conclude_expense" — marcar despesa como paga/concluída
  expense_name

"reopen_expense" — desmarcar/reabrir despesa já concluída
  expense_name (ou null), all: true|false

"income" — adicionar renda, receita ou entrada
  name (ex: "Salário","Freelance","Aluguel"), value (número), month

"add_project" — criar projeto ou meta de poupança
  name, target (valor total da meta), monthly (valor guardado/mês), saved (já guardado, default 0)

"toggle_setting" — ativar ou desativar configuração do app
  key: "isInvestor" | "makesContributions"
  value: true (ativar) | false (desativar)

"set_avatar" — usuário quer trocar foto de perfil
  {}

"set_credit_limit" — definir limite de crédito num cartão
  card_name (ex: "nubank", "next"), limit (número)

"set_user_name" — mudar o nome do usuário no app
  name (string)

"set_contribution_pct" — definir percentual de contribuição/dízimo
  pct (número de 0 a 100)

"update_project_saved" — atualizar quanto já foi guardado num projeto
  project_name (nome do projeto), amount (número), mode: "add"|"set"

"export" — exportar dados em CSV
  {}

"chat" — saudação, ajuda, conversa geral
  {}

EXEMPLOS:
"como tá o mês" → {"intent":"query","params":{"subtype":"summary","month":null}}
"resumo de junho" → {"intent":"query","params":{"subtype":"summary","month":"junho"}}
"quanto gastei no nubank" → {"intent":"query","params":{"subtype":"by_payment","filter":"nubank","month":null}}
"maiores gastos de maio" → {"intent":"query","params":{"subtype":"biggest","month":"maio"}}
"ifood em março" → {"intent":"query","params":{"subtype":"by_name","filter":"ifood","month":"março"}}
"ifood desde janeiro" → {"intent":"query","params":{"subtype":"by_name_range","fromMonth":0,"toMonth":5,"filter":"ifood"}}
"como foi o semestre" → {"intent":"query","params":{"subtype":"analysis","fromMonth":0,"toMonth":5}}
"análise do ano" → {"intent":"query","params":{"subtype":"analysis","fromMonth":0,"toMonth":11}}
"nubank vs mês passado" → {"intent":"query","params":{"subtype":"compare","month1":4,"month2":5,"filter":"nubank"}}
"gastos por semana" → {"intent":"query","params":{"subtype":"by_week","month":null}}
"parcelei notebook 3600 em 12x no crédito" → {"intent":"add_installments","params":{"name":"Notebook","total_value":3600,"installments":12,"payment":"Crédito","month":null}}
"vencimento da netflix para dia 10" → {"intent":"update_due_date","params":{"expense_name":"netflix","new_day":10}}
"conclua a internet" → {"intent":"conclude_expense","params":{"expense_name":"internet"}}
"marquei o ifood como pago" → {"intent":"conclude_expense","params":{"expense_name":"ifood"}}
"reabra a netflix" → {"intent":"reopen_expense","params":{"expense_name":"netflix","all":false}}
"reabra todas" → {"intent":"reopen_expense","params":{"expense_name":null,"all":true}}
"recebi 5000 de salário" → {"intent":"income","params":{"name":"Salário","value":5000,"month":null}}
"cria projeto viagem meta 8000 guardando 400" → {"intent":"add_project","params":{"name":"Viagem","target":8000,"monthly":400,"saved":0}}
"nova meta carro 30000 por 800 por mês" → {"intent":"add_project","params":{"name":"Carro","target":30000,"monthly":800,"saved":0}}
"ativa modo investidor" → {"intent":"toggle_setting","params":{"key":"isInvestor","value":true}}
"desativa investidor" → {"intent":"toggle_setting","params":{"key":"isInvestor","value":false}}
"ativa contribuições" → {"intent":"toggle_setting","params":{"key":"makesContributions","value":true}}
"desativa dízimo" → {"intent":"toggle_setting","params":{"key":"makesContributions","value":false}}
"muda minha foto de perfil" → {"intent":"set_avatar","params":{}}
"quero trocar meu avatar" → {"intent":"set_avatar","params":{}}
"exporta meus dados" → {"intent":"export","params":{}}
"ativa modo investidor" → {"intent":"toggle_setting","params":{"key":"isInvestor","value":true}}
"desativa contribuições" → {"intent":"toggle_setting","params":{"key":"makesContributions","value":false}}
"muda minha foto de perfil" → {"intent":"set_avatar","params":{}}
"define limite de 600 no next" → {"intent":"set_credit_limit","params":{"card_name":"next","limit":600}}
"adiciona limite de 2000 no nubank" → {"intent":"set_credit_limit","params":{"card_name":"nubank","limit":2000}}
"cartão c6 com limite de 3000" → {"intent":"set_credit_limit","params":{"card_name":"c6","limit":3000}}
"meu nome é Gabriel" → {"intent":"set_user_name","params":{"name":"Gabriel"}}
"me chamo Gabi" → {"intent":"set_user_name","params":{"name":"Gabi"}}
"muda meu nome para João" → {"intent":"set_user_name","params":{"name":"João"}}
"define contribuição para 10%" → {"intent":"set_contribution_pct","params":{"pct":10}}
"dízimo de 15%" → {"intent":"set_contribution_pct","params":{"pct":15}}
"guardei 300 no projeto viagem" → {"intent":"update_project_saved","params":{"project_name":"viagem","amount":300,"mode":"add"}}
"economizei 500 pra reserva" → {"intent":"update_project_saved","params":{"project_name":"reserva","amount":500,"mode":"add"}}
"já guardei 1500 na meta carro" → {"intent":"update_project_saved","params":{"project_name":"carro","amount":1500,"mode":"set"}}
"exporta meus dados" → {"intent":"export","params":{}}
"oi jarvis" → {"intent":"chat","params":{}}
"ajuda" → {"intent":"chat","params":{}}

Retorne apenas o JSON, nada mais.`;

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
