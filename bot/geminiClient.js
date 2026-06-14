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
  // "desde março", "desde fevereiro" etc
  const desdeMatch = t.match(/desde\s+(\w+)/i);
  if (desdeMatch) {
    const mi = MONTH_PT.findIndex(m => desdeMatch[1].toLowerCase().startsWith(m.substring(0, 3)));
    if (mi >= 0) return { from: mi, to: now };
  }
  const apartirMatch = t.match(/a\s*partir\s*de\s+(\w+)/i);
  if (apartirMatch) {
    const mi = MONTH_PT.findIndex(m => apartirMatch[1].toLowerCase().startsWith(m.substring(0, 3)));
    if (mi >= 0) return { from: mi, to: now };
  }
  if (/ano\s*(completo|inteiro|todo)|o\s*ano\s*inteiro|anual\b|ao\s*longo\s*(do\s*)?ano/i.test(t))
    return { from: 0, to: 11 };
  if (/esse\s*ano\b|este\s*ano\b|nesse\s*ano\b|neste\s*ano\b|durante\s*(o\s*)?ano\b/i.test(t))
    return { from: 0, to: now };
  // "de janeiro a maio", "de março pra julho", "de fev até ago"
  const deAMatch = t.match(/\bde\s+(\w{3,9})\s+(?:a\b|at[eé]\b|pra\b|para\b)\s+(\w{3,9})/i);
  if (deAMatch) {
    const m1 = MONTH_PT.findIndex(m => m.startsWith(deAMatch[1].toLowerCase().substring(0, 3)));
    const m2 = MONTH_PT.findIndex(m => m.startsWith(deAMatch[2].toLowerCase().substring(0, 3)));
    if (m1 >= 0 && m2 >= 0) return { from: m1, to: m2 };
  }
  const primMatch = t.match(/primeiros?\s+(\d+|tr[eê]s|dois?|quatro|cinco|seis)/i);
  if (primMatch) { const n = parseNum(primMatch[1]); return { from: 0, to: Math.min(n - 1, 11) }; }
  const ultMatch = t.match(/[uú]ltimos?\s+(\d+|tr[eê]s|dois?|quatro|cinco|seis)\s*mes/i);
  if (ultMatch) { const n = parseNum(ultMatch[1]); return { from: Math.max(0, now - n + 1), to: now }; }
  if (/[uú]ltimos\s+meses\b/i.test(t)) return { from: Math.max(0, now - 2), to: now };
  // "dos 6 meses", "nos 6 meses" — bare number of months → últimos N meses
  const bareMonthMatch = t.match(/\b(\d+)\s*mes/i);
  if (bareMonthMatch && !t.match(/[uú]ltimos|primeiros/i)) {
    const n = parseInt(bareMonthMatch[1]);
    if (n >= 2 && n <= 12) return { from: Math.max(0, now - n + 1), to: now };
  }
  return null;
}

// Resolve referências relativas e nomes de mês → retorna nome do mês em PT
function getMonthName(t) {
  if (/m[eê]s\s*(passado|anterior|[uú]ltimo)|[uú]ltimo\s*m[eê]s/i.test(t))
    return MONTH_PT[((new Date().getMonth() - 1) + 12) % 12];
  if (/pr[oó]ximo\s*m[eê]s|m[eê]s\s*(que\s*vem|seguinte)/i.test(t))
    return MONTH_PT[(new Date().getMonth() + 1) % 12];
  if (/m[eê]s\s*(atual|corrente|de\s*hoje|vigente)|esse\s*m[eê]s|este\s*m[eê]s|no\s*m[eê]s\b|\bdo\s*m[eê]s\b/i.test(t))
    return MONTH_PT[new Date().getMonth()];
  return MONTH_PT.find(m => new RegExp('\\b' + m + '\\b').test(t)) || null;
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
    // palavras de quantidade/totalidade
    'ao','todo','todos','todas','tudo','geral','gerais',
    // verbos de ação — não são nomes de despesa
    'guardei','guarde','poupei','economizei','economize','coloquei','adicionei','depositei',
    'situacao','situac','status','fechamento','financas','financeiro','financeira',
    // termos genéricos de query
    'saiu','sobrou','sobra','sobrando','consumiu','levou','aconteceu','pesou',
    'vermelho','azul','resultado','visao','reais','sobrado','gastou','pesaram','sangrou',
    // auxiliares e indicadores de análise — nunca são nomes de despesa
    'foram','estao','andaram','andou','andei','financeiramente',
    // filler words
    'alguma','coisa','algo','nada','zero','nenhuma','nenhum',
    'ultimos','primeiros','periodo',
    // slang/gírias de preenchimento — nunca são nomes de despesa
    'cara','irmao','mano','brow','po','tipo','bicho','meu','oxe',
    // English filler words
    'show','me','my','how','much','spend','balance','summary',
    // verbos de estado/ação que não são despesas
    'gastando','gstei','arruinou','destruiu','estao','preciso','saber','estou','esteve',
    // preenchimento de frases longas
    'longo','completo','completa','detalhado','detalhada','mez','desse','nesse',
    'pode','dar','favor','pfavor','desde',
    ...MONTH_PT.map(norm),
  ];
  // Remove padrões de tempo com número (ex: "últimos 3 meses") antes de extrair o filtro
  const tStripped = t
    .replace(/\b[uú]ltimos?\s+\d+\s*(?:m[eê]s|meses)\b/gi, ' ')
    .replace(/\bprimeiros?\s+\d+\s*(?:m[eê]s|meses)\b/gi, ' ')
    .replace(/\b\d+\s*(?:m[eê]s|meses)\b/gi, ' ');
  const tNorm = norm(tStripped);
  const re = new RegExp(`\\b(${noise.map(w => norm(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  // Remove emojis and special Unicode symbols before final cleaning
  const cleaned = tNorm.replace(re, ' ').replace(/[?!.,;]/g, '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{1F300}-\u{1F9FF}]/gu, '').replace(/\s+/g, ' ').trim();
  return (cleaned.length >= 2 && !/^\d+$/.test(cleaned)) ? cleaned.toLowerCase() : null;
}

// Classificador local — sem API. Cobre >95% dos casos reais.
// Exportado para uso no ChatScreen (app nativo) sem chamada de API.
export function localClassify(t) {
  const month = getMonthName(t);

  // ── Chat / ajuda — detecta antes de tudo para não engolir perguntas genéricas ──
  if (/\b(o\s*que\s*(voc[eê]\s*)?(faz|consegue\s*fazer|pode\s*fazer|sabe\s*fazer)|o\s*que\s*posso\s*fazer|como\s*(voc[eê]\s*)?funciona|como\s*usar\b|pode\s*(me\s*)?ajudar\b|voc[eê]\s+[eé]\s+(um\s*)?(bot|assistente|ia)|oi\b|ol[aá]\b|bom\s*dia|boa\s*tarde|boa\s*noite|boa\s*semana|e\s*ai\b|e\s*aí\b|tudo\s*(bem|bom|certo)\b|t[aá]\s*(bom|bem|certo|ok)\b|boa\b|valeu\b|obrigad|fala\s*bot|fala\s*jarvis|ajuda\b|help\b|hey\b|como\s+vai\b|me\s+conta\b|fala\s+a[ií]\b|e\s+(voc[eê]|vc)\b|^legal$|^show$|^perfeito$|^exatamente$|^entendi$|^talvez$|^muito\s+bom$|^isso\s+mesmo$|^isso\b|^claro\b|^massa\b|^top\b|^beleza\b|^blz\b)/i.test(t) &&
      !/(quanto|gast|resumo|saldo|paguei|despesa|saiu|recebi|financ|m[eê]s\b|meses?\b|dinheiro|bolsa|carteira|poupan|investim|portf\w*|renda\b|projeto|reserva)/i.test(t))
    return { intent: 'chat', params: {} };

  // Comandos Telegram (/start, /help etc.)
  if (t.startsWith('/')) return { intent: 'chat', params: {} };

  // Respostas curtas de conversa que não são queries
  if (/^(legal|show|perfeito|exatamente|entendi|talvez|muito\s+bom|isso\s+mesmo|claro|massa|top|beleza|blz|demais|bacana|fixe|maravilha|pode|pow+|uhu|vlw|falou|flw)$/i.test(t))
    return { intent: 'chat', params: {} };

  // ── "freela/freelance foi pago" → renda recebida (precisa vir ANTES da renda geral) ─
  if (/\b(freela|freelance)\b.{0,20}\b(foi|est[aá])\s*pag[ao]\b/i.test(t)) {
    const numMatch = t.match(/[\d.,]+/);
    const value = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    return { intent: 'income', params: { name: 'Freelance', value, month } };
  }

  // ── "entrou X", "entrada de X na conta", "depósito de X" — renda com número ──
  if (/\b(entrou|caiu\s*(?:na\s*conta)?)\b.{0,30}[\d.,]+|\bentrada\s+de\s+[\d.,]+|\bdep[oó]sito\s+de\s+[\d.,]+/i.test(t) &&
      !/\b(quanto|como|resumo|total|gastos?|hist[oó]rico|investimento)\b/i.test(t)) {
    const numMatch = t.match(/[\d.,]+/);
    const value = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    return { intent: 'income', params: { name: 'Renda', value, month } };
  }

  // ── Renda / receita ───────────────────────────────────────────────────────
  if (/\b(renda|sal[aá]rio|receita|recebi|faturei|faturamento|ganho|ganhei|recebimento|freela|freelance|comiss[aã]o|aluguel|pensao|pens[aã]o|benef[ií]cio|b[oô]nus|gratifica[çc][aã]o|honor[aá]rios?|f[eé]rias\b|13[oº°]?\s*(sal[aá]rio)?|trampo\s*(pagou|caiu))\b/.test(t) &&
      !/\b(quanto|como|resumo|total|gastos?|hist[oó]rico|investimento)\b/.test(t) &&
      !/renda\s*fixa|renda\s*vari[aá]vel/i.test(t) &&
      !/\b(vencimento|vence\b|conclua|concluir|parcela|parcelei|quita\w*|quit[ae][ií]\b|conclui|paguei|liquidei|liquidou|liquidar)\b/i.test(t) &&
      !/marc\w*\s*.{0,20}(pago|paga)\b/i.test(t) &&
      !/(t[aá]|foi|est[aá]|fica)\s*pag[ao]\b/i.test(t) &&
      !/deu\s*baixa|d[aá]\s*baixa/i.test(t) &&
      !/desconclui/i.test(t) &&
      !/reabr\w*/i.test(t) &&
      !/volta\b.{0,30}\baberto\b/i.test(t) &&
      !/\bvolta\s+(o|a)\s+\w/i.test(t) &&
      !/\bpaga\s+(o|a)\b/i.test(t) &&
      !/\bcancelar\b/i.test(t) &&
      !/\b(muda|troca|atualiza|novo|nova)\b.{0,20}\bdia\b/i.test(t) &&
      !/vencimento\b/i.test(t) &&
      !/d[íi]zimo|contribui/i.test(t)) {
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
  if ((/\b(adicione?|adicionar|cria[rr]?|incluir?|nova?\s+forma|novo\s+cart)\b.{0,35}\b(cart[aã]o|forma\s*de\s*pagamento|m[eé]todo\s*de\s*pagamento|bandeira)\b/i.test(t) ||
      /\bnovo\s+m[eé]todo\s*de\s*pagamento\b|\bbandeira\s*nova\b|\bnova\s*bandeira\b/i.test(t) ||
      /\b(cart[aã]o|forma\s*de\s*pagamento|m[eé]todo)\b.{0,20}\b(novo|nova|adicionar|cadastrar|criar)\b/i.test(t) ||
      /\b(remov[ae]r?|deletar?|excluir?|apagar?)\b.{0,30}\b(cart[aã]o|forma\s*de\s*pagamento|m[eé]todo\s*de\s*pagamento)\b/i.test(t)) &&
      !/\blimite\b/i.test(t)) {
    return { intent: 'unsupported', params: { feature: 'payment_method' } };
  }

  // ── Limite de cartão ─────────────────────────────────────────────────────
  if (/\blimite\b.{0,35}(cart[aã]o|cr[eé]dito|card)|(cart[aã]o|cr[eé]dito).{0,35}\blimite\b/i.test(t) ||
      /\b(define|coloca|adiciona|ajusta|ajustar|muda|atualiza|quero|preciso|gostaria)\b.{0,30}\blimite\b/i.test(t) ||
      /\bmeu\s+limite\b|\blimite\b.{0,25}(nubank|c6|picpay|\binter\b|next|bradesco|ita[uú]|santander|recargapay|pagbank|will|neon)/i.test(t) ||
      /\btem\s+limite\s+de\b/i.test(t) ||
      /(remov[ae]|zera|limpa|tira|retira|apaga|cancela)\s+(o\s+|a\s+|esse\s+|este\s+|meu\s+)?limite/i.test(t)) {
    const isRemove = /(remov[ae]|zera|limpa|tira|retira|apaga|cancela)\s+(o\s+|a\s+|esse\s+|este\s+|meu\s+)?limite/i.test(t);
    const numMatch = !isRemove ? t.match(/\d+(?:[.,]\d{1,2})?/) : null;
    const limit = isRemove ? 0 : (numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null);
    const CARD_RE2 = /nubank|nu\b|c6|picpay|next|\binter\b|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|will/;
    const cardMatch = t.match(CARD_RE2);
    return { intent: 'set_credit_limit', params: { card_name: cardMatch?.[0]?.trim() || null, limit } };
  }

  // ── Nome do usuário ──────────────────────────────────────────────────────
  if (/\b(meu\s*nome\s*(agora\s*)?(é|eh|ser[aá]|vai\s*ser)|(me\s*chamo|pode\s*me\s*chamar)|(muda|troca|atualiza|coloca)\b.{0,15}\bnome\b)/i.test(t)) {
    const nameMatch = t.match(/(?:(?:meu\s*nome\s*(?:agora\s*)?(?:é|eh|será|vai\s*ser)\s*)|(?:me\s*chamo\s*)|(?:pode\s*me\s*chamar\s*de\s*)|(?:(?:muda|troca|atualiza|coloca)\b.{0,15}(?:nome|pra|para)\s*))(\w+)/i);
    return { intent: 'set_user_name', params: { name: nameMatch?.[1] || null } };
  }

  // ── Meta de contribuição / dízimo ───────────────────────────────────────
  if (/\b(contribui[çc][aã]o|d[íi]zimo|doa[çc][aã]o|percentual\s*(de\s*)?(?:d[íi]zimo|contribui))\b.{0,40}(\d+\s*%|porcent|percent|por\s*cento)/i.test(t) ||
      /\b(define?|set|coloca|muda|atualiz)\b.{0,20}\b(\d+\s*%|porcent|percent|por\s*cento)\b.{0,20}\b(d[íi]zimo|contribui)/i.test(t) ||
      /\b(d[íi]zimo|contribui[çc][aã]o|contribui\w*)\b.{0,10}(\d+\s*%?|\d+\s*por\s*cento|\d+\s*percent)/i.test(t) ||
      /\d+\s*%\s*.{0,20}\b(contribui[çc][aã]o|d[íi]zimo)\b/i.test(t) ||
      /\bpercentual\s*(de\s*)?(?:d[íi]zimo|contribui\w*)\s+\d+/i.test(t) ||
      /\bcontribuir\b.{0,20}\d+\s*%/i.test(t)) {
    const pctMatch = t.match(/(\d+(?:[.,]\d{1,2})?)\s*%?/);
    const pct = pctMatch ? parseFloat(pctMatch[1].replace(',', '.')) : null;
    return { intent: 'set_contribution_pct', params: { pct } };
  }

  // ── Guardado em projeto (atualiza savings) ────────────────────────────────
  if (!/\bquanto\b/i.test(t) && (/\b(guardei|guarde?|poupei|poupeie?|economizei|economiz|coloque[ií]|adicionei|deposite[ií]|coloca[nd]?o|juntei)\b.{0,30}\b(projeto|meta|poupan[çc]a|reserva|viagem|carro|casa|fundo)\b|\b(guardei|poupei|economizei|juntei)\b.{0,20}\b(pra|pro|para)\b|j[aá]\s+tenho\b.{0,25}\bguardado\b|atualiz\w*\b.{0,25}\bguardado\b|\badiciona\s+[\d.,]+.{0,30}\b(poupan[çc]a|reserva|viagem|carro|casa|fundo|projeto|meta)\b|j[aá]\s+tenho\b.{0,20}\d+.{0,30}\b(poupan[çc]a|reserva|viagem|carro|casa|fundo|projeto|meta)\b/i.test(t))) {
    const numMatch = t.match(/\d+(?:[.,]\d{1,2})?/);
    const amount = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    const stripped = t
      .replace(/\b(guardei|guarde?|poupei|poupeie?|economizei|economiz|coloque[ií]|adicionei|deposite[ií]|juntei|atualiz\w*|j[aá]\s+tenho|guardado|para|no|na|no\s*projeto|no\s*fundo|pra|pro|do|da|de|projeto|meta|poupan[çc]a|reserva|r\$|reais|mensais?)\b/gi, ' ')
      .replace(/\d+(?:[.,]\d+)?/g, ' ').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim();
    return { intent: 'update_project_saved', params: {
      project_name: stripped.length >= 2 ? stripped : null,
      amount, mode: 'add'
    }};
  }

  // ── Toggle settings (investidor / contribuições) ──────────────────────────
  if (/\b(ativa+|ative|ativar|liga|ligar|habilita|habilitar|desativa|desative|desativar|desliga|desligar|desabilita|desabilitar|tirar|remover?|remove\b|eliminar?)\b/i.test(t)) {
    const isOn = !/\b(desativ|deslig|desabilit)\b/i.test(t);
    if (/\binvest/i.test(t)) return { intent: 'toggle_setting', params: { key: 'isInvestor', value: isOn } };
    if (/contribui|doa[çc]|d[íi]zimo|doacoes?/i.test(t)) return { intent: 'toggle_setting', params: { key: 'makesContributions', value: isOn } };
  }

  // ── Mudar foto / avatar ───────────────────────────────────────────────────
  if (/\b(muda|mudar|troca|trocar|atualiza|atualizar|coloca|colocar|define|definir)\b.{0,20}\b(foto|avatar|imagem|perfil)\b|\bfoto\s*de\s*perfil\b|minha\s*foto\b|nova\s*(foto|imagem|avatar)|(foto|imagem)\s*nova\b|\bquero\b.{0,15}(foto|avatar|imagem)\s*nova\b/i.test(t))
    return { intent: 'set_avatar', params: {} };

  // ── Exportar ──────────────────────────────────────────────────────────────
  if (/exporta|exportar|planilha|csv|meus dados|baixar dados|download\b|relat[oó]rio\s*(mensal|anual|semanal|financeiro|dos\s*dados|de\s*gastos?)|baixa\w*\s*(o\s*hist[oó]rico|os\s*dados|os\s*gastos|os\s*meus\s*dados|meus\s*dados)|backup\s*dos?\s*dados|\bgera\w*\s*(o\s+)?relat[oó]rio\b|\bme\s*(d[aê]|manda)\s*(o\s+)?relat[oó]rio\b/.test(t))
    return { intent: 'export', params: {} };

  // ── Parcelar compra (ANTES do cardMatch — "parcelei no crédito" é parcela, não by_payment) ──
  if (/parcel[eio]u?|parcel(ar|amento|ada?|ado)|comprei?\s*(em|no|na)\s*parcel|fiz\s*\d+\s*parcelas?\b|\bem\s*\d+\s*(vezes|parcelas|meses?|[xX])\b|\d+\s*[xX]\s*(no|na|de|do)\b|financ(iar|iamento)\b|financiei\b|prestac|presta[çc]|credi[aá]rio\b|adicionei\s+parcelas?/.test(t))
    return { intent: 'add_installments', params: {} };

  // ── Mudar vencimento ──────────────────────────────────────────────────────
  if (/vencimento|vencer?\s*(dia|no\s*dia|n[ao]\s*dia)|para\s+vencer\s+dia\b|\bmuda\s*(o\s*)?venc|atualiz\w*\s*(o\s*)?venc|novo\s*vencimento|muda\s*o\s*dia|dia\s*de\s*pagamento\b|novo\s*dia\s*de\s*pagamento/.test(t))
    return { intent: 'update_due_date', params: {} };

  // ── Criar projeto / meta ─────────────────────────────────────────────────
  if (/\b(cria|criar|adiciona|adicione|adicionar|novo|nova|cadastra|cadastrar)\b.{0,30}\b(projeto|meta|objetivo|poupan[çc]a|reserva)\b|\b(projeto|meta|objetivo)\b.{0,25}\b(novo|nova|cria|criar|adicionar)\b|\bjuntar\s*(dinheiro\s*)?(pra|para|pro)\b/i.test(t)) {
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

  // ── Proventos/dividendos como RENDA (não investimento) ────────────────────
  if (/\bproventos?\s*(chegaram?|caiu|ca[ií]ram?|entrou|entraram?|de\s+\d)|\bdividend\w*\s*(caiu|ca[ií]ram?|chegou|chegaram?|entrou|entraram?)\b/i.test(t) &&
      !/\b(quanto|resumo|carteira|aporte|bolsa|portf[oó]lio|minha\s*carteira)\b/i.test(t)) {
    const numMatch = t.match(/(\d+(?:[.,]\d{1,2})?)/);
    const value = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;
    return { intent: 'income', params: { name: 'Proventos', value, month } };
  }

  // ── Investimentos ─────────────────────────────────────────────────────────
  if (/investimento|carteira|rendimento|aporte|aplica[çc][aã]o|minhas\s*aplica|quanto\s*(eu\s*)?investi|investid[ao]\b|tenho\s*investid|minha\s*carteira|\ba[çc][oõ]es?\b|fii\b|tesouro\b|cdb\b|lci\b|lca\b|cripto|bitcoin|btc\b|eth\b|ethereum|portf[oó]lio|holdings?\b|\binvest\w*\b|\bativos?\b|renda\s*fixa\b|renda\s*vari[aá]vel\b|debentur\w*|previd[eê]ncia\b|previdenci\w*|\bselic\b|\bipca\b|fundo\s*de\s*investimento\b|\bfundos?\b(?!\s*de\s*emerg)|dividend\w*|patrimoni\w*|patrim[oô]nio\b|\brentabilidade\b|\bbolsa\b|como\s*vai\s*a\s*bolsa|quanto\s*(rendeu|valorizou|cresceu|apliquei|est[aá]\s*rendendo|est[aá]\s*valendo|ta\s*valendo|ta\s*rendendo)|retorno\s*(mensal|acumulado|dos?\s*invest\w*)|proventos\b|how\s+(are|is)\b.{0,20}\binvest\w*/.test(t) &&
      !/rendimento\s*do\s*per[ií]odo\b/i.test(t))
    return { intent: 'query', params: { subtype: 'investments', month } };

  // ── Apagar projeto ────────────────────────────────────────────────────────
  if (/\b(apaga[r]?|exclu[ií][r]?|excluir|remov[ae][r]?|delet[ae][r]?|cancela[r]?|deleta[r]?)\b.{0,25}\b(projeto|meta|objetivo)\b/i.test(t)) {
    const nameRaw = t
      .replace(/apaga[r]?|exclu[ií][r]?|excluir|remov[ae][r]?|delet[ae][r]?|cancela[r]?|projeto|meta|objetivo/gi, '')
      .replace(/\b(o|a|os|as|esse|esta|este|meu|minha)\b/gi, '')
      .replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'delete_project', params: { project_name: nameRaw } };
  }

  // ── Renomear projeto ──────────────────────────────────────────────────────
  if (/renomei[ao]?\w*\b.{0,25}\b(projeto|meta)\b|\b(muda[r]?|edita[r]?)\s+o?\s*nome\s+(do\s+projeto|da\s+meta)\b|\bedita[r]?\s+nome\s+(do\s+)?projeto\b/i.test(t)) {
    const paraIdx = t.search(/\s(para|pra)\s/i);
    const beforePara = paraIdx >= 0 ? t.substring(0, paraIdx) : t;
    const afterPara = paraIdx >= 0 ? t.substring(paraIdx).replace(/^\s+(para|pra)\s+/i, '').trim() : null;
    const projName = beforePara
      .replace(/renomei[ao]?\w*|muda[r]?\s+o\s+nome\s+(do|da)|do\s+projeto|da\s+meta|nome\s+(do|da)/gi, '')
      .replace(/\b(o|a)\b/gi, '').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'rename_project', params: { project_name: projName, new_name: afterPara } };
  }

  // ── Editar projeto (meta/mensal) ──────────────────────────────────────────
  if (/muda[r]?\s+(a\s+meta|o\s+mensal|o\s+objetivo)|altera[r]?\s+(a\s+meta|o\s+mensal)|aumenta[r]?\s+(a\s+meta|o\s+objetivo)|edita[r]?\s+(a\s+meta|o\s+mensal|o\s+objetivo)/i.test(t) &&
      !/\b(despesa|gasto|conta|netflix|ifood|aluguel|internet|luz|agua|energia)\b/i.test(t)) {
    const numMatch = t.match(/\d+(?:[.,]\d{1,2})?/);
    const new_value = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    const isMonthly = /mensal|por\s*m[eê]s/i.test(t);
    const field = isMonthly ? 'monthly' : 'target';
    const nameRaw = t
      .replace(/muda[r]?\s+(a\s+meta|o\s+mensal|o\s+objetivo)|altera[r]?\s+(a\s+meta|o\s+mensal)|aumenta[r]?\s+(a\s+meta|o\s+objetivo)|do\s+projeto|da\s+meta|para|pra/gi, '')
      .replace(/\d+(?:[.,]\d+)?/g, '').replace(/r\$|reais|mensais?|por\s*m[eê]s/gi, '')
      .replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'edit_project', params: { project_name: nameRaw, field, new_value } };
  }

  // ── Projetos ──────────────────────────────────────────────────────────────
  if (!/\bgastando\b.{0,30}\b(demais|muito|pouco)\b|\bbastando\b|\bou\s+gastando\b/i.test(t) && /projeto|metas?\b|objetivo|poupando|guardando|economiz|juntando\s*(dinheiro|pra|para|pro)\b|\bjuntando\b.{0,15}(comprar|carro|casa|viagem)|reserva\b|poupan[çc]a\b|fundo\s*de\s*emerg[eê]ncia|minhas\s*reservas|quanto\s*(j[aá]\s*)?guardei\b|quanto\s*(j[aá]\s*)?poupei\b|quanto\s*(j[aá]\s*)?reservei\b|quanto\s*falta\b|j[aá]\s*guardei|progresso\s*financeiro|j[aá]\s*alcancei/.test(t)) {
    const pStripped = t
      .replace(/\b(status|qual|como|esta[oa]|estao|estão|meus?|minhas?|quantos?|falta|do|da|de|em|no|na|o|a|projeto|projetos|meta|metas|objetivo|objetivos)\b/gi, ' ')
      .replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
    const pFilter = pStripped.length >= 2 ? pStripped : null;
    return { intent: 'query', params: { subtype: 'projects', month, filter: pFilter } };
  }

  // ── Renomear despesa ──────────────────────────────────────────────────────
  if ((/\brenomei[ao]?\w*\b|\b(muda[r]?|edita[r]?)\s+o?\s*nome\s+(da|do)\s+\w|\bedita[r]?\s+nome\s+(da|do)\s+\w/i.test(t)) &&
      !/\b(projeto|meta|objetivo)\b/i.test(t) &&
      !/\bmeu\s*nome\b|\bme\s*chamo\b|\bpode\s*me\s*chamar\b/i.test(t)) {
    const paraIdx = t.search(/\s(para|pra)\s/i);
    const beforePara = paraIdx >= 0 ? t.substring(0, paraIdx) : t;
    const afterPara = paraIdx >= 0 ? t.substring(paraIdx).replace(/^\s+(para|pra)\s+/i, '').trim() : null;
    const expName = beforePara
      .replace(/renomei[ao]?\w*|muda[r]?\s+o\s+nome\s+(da|do)|nome\s+(da|do)/gi, '')
      .replace(/\b(o|a)\b/gi, '').replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'rename_expense', params: { expense_name: expName, new_name: afterPara } };
  }

  // ── Editar valor da despesa ───────────────────────────────────────────────
  if (/muda[r]?\s+o\s+valor|corrig[ie][r]?\s+o\s+valor|atualiz\w*\s+o\s+valor|altera[r]?\s+o\s+valor|novo\s+valor\s+(do|da)\b|edita[r]?\s+o?\s*valor\s+(do|da)\b/i.test(t) &&
      !/\b(projeto|meta|objetivo|mensal)\b/i.test(t)) {
    const numMatch = t.match(/\d+(?:[.,]\d{1,2})?/);
    const new_value = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
    const nameRaw = t
      .replace(/muda[r]?\s+o\s+valor\s+(do|da)|corrig[ie][r]?\s+o\s+valor\s+(do|da)|atualiz\w*\s+o\s+valor\s+(do|da)|altera[r]?\s+o\s+valor\s+(do|da)|novo\s+valor\s+(do|da)/gi, '')
      .replace(/muda[r]?\s+o\s+valor|corrig[ie][r]?\s+o\s+valor|atualiz\w*\s+o\s+valor|altera[r]?\s+o\s+valor/gi, '')
      .replace(/\s+(para|pra)\s+.*/i, '').replace(/do\s+|da\s+|de\s+|o\s+|a\s+/gi, '')
      .replace(/\d+(?:[.,]\d+)?/g, '').replace(/r\$|reais/gi, '')
      .replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'edit_expense', params: { expense_name: nameRaw, field: 'value', new_value } };
  }

  // ── Editar pagamento da despesa ───────────────────────────────────────────
  if (/muda[r]?\s+o\s+pagamento|altera[r]?\s+o\s+pagamento|troca[r]?\s+o\s+pagamento|muda[r]?\s+a\s+forma\s+de\s+pag\w*/i.test(t)) {
    const PAYMENTS = [[/pix/i,'Pix'],[/d[eé]bito/i,'Débito'],[/cr[eé]dito/i,'Crédito'],[/dinheiro/i,'Dinheiro'],[/boleto/i,'Boleto']];
    let new_payment = null;
    for (const [re, label] of PAYMENTS) { if (re.test(t)) { new_payment = label; break; } }
    const nameRaw = t
      .replace(/muda[r]?\s+o\s+pagamento\s+(do|da)|altera[r]?\s+o\s+pagamento\s+(do|da)|troca[r]?\s+o\s+pagamento\s+(do|da)|muda[r]?\s+a\s+forma\s+de\s+pag\w*\s+(do|da)/gi, '')
      .replace(/muda[r]?\s+o\s+pagamento|altera[r]?\s+o\s+pagamento|troca[r]?\s+o\s+pagamento|muda[r]?\s+a\s+forma\s+de\s+pag\w*/gi, '')
      .replace(/\s+(para|pra)\s+.*/i, '').replace(/do\s+|da\s+|de\s+|o\s+|a\s+/gi, '')
      .replace(/pix|d[eé]bito|cr[eé]dito|dinheiro|boleto/gi, '')
      .replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'edit_expense', params: { expense_name: nameRaw, field: 'payment', new_payment } };
  }

  // ── Apagar despesa ────────────────────────────────────────────────────────
  if (/\b(apaga[r]?|exclu[ií][r]?|excluir|remov[ae][r]?|delet[ae][r]?)\b.{0,25}\b(a|o)\s+\w/i.test(t) &&
      !/\b(projeto|meta|objetivo|cart[aã]o|forma\s*de\s*pagamento|m[eé]todo)\b/i.test(t) &&
      !/\blimite\b/i.test(t)) {
    const nameRaw = t
      .replace(/apaga[r]?|exclu[ií][r]?|excluir|remov[ae][r]?|delet[ae][r]?/gi, '')
      .replace(/\b(o|a|os|as|esse|esta|este|essa|meu|minha)\b/gi, '')
      .replace(/\b(do\s+m[eê]s|nesse\s+m[eê]s|desse\s+m[eê]s|esse\s+m[eê]s)\b/gi, '')
      .replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'delete_expense', params: { expense_name: nameRaw } };
  }

  // ── Mover despesa (fixo ↔ variável) ──────────────────────────────────────
  if (/\b(pass[ae][r]?\b|mov[ae][r]?\b|converte[r]?\b|torna[r]?\b|transform\w*)\b.{0,40}\b(fix[ao]|vari[aá]vel)\b/i.test(t)) {
    const toFixed = /\bfix[ao]\b/i.test(t);
    const to_section = toFixed ? 'fixed' : 'variable';
    const nameRaw = t
      .replace(/pass[ae][r]?|mov[ae][r]?|converte[r]?|torna[r]?|transform\w*/gi, '')
      .replace(/\b(para|pra|em|como)\b.{0,20}(despesa\s+)?(fix[ao]|vari[aá]vel)\b/gi, '')
      .replace(/\b(fixa|fixo|vari[aá]vel|despesa|gasto)\b/gi, '')
      .replace(/\b(o|a|os|as|esse|esta|este|essa|meu|minha)\b/gi, '')
      .replace(/[?!.,;]/g, '').replace(/\s+/g, ' ').trim() || null;
    return { intent: 'move_expense', params: { expense_name: nameRaw, to_section } };
  }

  // ── "errei ao concluir X" → reopen (precisa vir ANTES do reopen geral) ────
  if (/\berrei\b.{0,20}(concluir|conclu[ií])\b/i.test(t)) {
    const nameRaw = t.replace(/\berrei\b|\bao\b|\bem\b|\bconcluir\b|\bconclu[ií]\w*\b/gi, '').replace(/\b(o|a|os|as)\b/gi, '').replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return { intent: 'reopen_expense', params: { expense_name: nameRaw.length >= 2 ? nameRaw : null } };
  }

  // ── Reabrir / desconcluir despesa ─────────────────────────────────────────
  if (/reabr[ae]|reabertur|desconclui|desmarqu?e?|reabrir|volta\b.{0,30}\baberto\b|\bvolta\s+(o|a)\s+\w+|n[aã]o\s*(est[aá]|t[aá]|foi)\s*pag|n[aã]o\s+pag(uei|ou?)\b|desfa[çz]|desmarcar\s+(tudo|todos?|todas?)|\bcancelar\b.{0,25}pagamento\b|tirar\b.{0,25}\bde\s+pag[ao]\b/i.test(t)) {
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

  // ── Bulk conclude (todas as despesas do mês atual) — precisa vir ANTES do conclude individual ──
  if ((/\b(conclu[ií]|conclua|concluir)\b.{0,25}\b(todos?\s*(?:os\s*)?(?:gastos?|contas?)?|todas?\s*(?:as\s*)?(?:despesas?|contas?)?|tudo)\b|\b(todas?\s*as\s*despesas?|todas\s*as\s*contas)\b.{0,25}\b(conclu|concluir)\b|marca\w*.{0,30}\b(tudo|todas?\b|todos?\s+os\s+gastos?|todas?\s+as\s+despesas?)\b|\bfechar\s+todas?\s*(?:as\s*)?despesas?\b|\btudo\s+pag[ao]\b|\bzer(ei|ou)\b.{0,25}(contas?|despesas?|tudo|todas?)\b/i.test(t)) &&
      !/todos?\s+os\s+meses?/i.test(t)) {
    return { intent: 'conclude_expense', params: { all: true } };
  }
  // Fechar todos os meses ainda não é suportado
  if (/\bfechar\b.{0,25}todos?\s+os\s+meses?\b|todos?\s+os\s+meses\b.{0,25}conclu/i.test(t)) {
    return { intent: 'unsupported', params: { feature: 'bulk_conclude' } };
  }

  // ── "fechar a/o [despesa]" específica → conclude (ex: "fechar a netflix") ──
  if (/\bfechar\s+(a\s+|o\s+)\w+/i.test(t) && !/\b(conta|fatura|todos?|tudo|m[eê]s)\b/i.test(t)) {
    const nameRaw = t.replace(/\bfechar\b/gi, '').replace(/\b(a|o|os|as)\b/gi, '').replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (nameRaw.length >= 2) return { intent: 'conclude_expense', params: { expense_name: nameRaw } };
  }

  // ── Concluir / marcar como pago ───────────────────────────────────────────
  if (/conclu[ií]|conclua|concluir|mar(?:c|qu)\w*\s*.{0,25}(pago|paga)\b|quitar?|quit[ae]|quitad[ao]\b|paguei\s*(o|a|da|do|na|no|minha|meu)\b|j[aá]\s*paguei|paguei\s+\S+|liquidar|liquidei|liquidou\b|(foi|t[aá]|est[aá]|fica)\s*pag[ao]\b|deu\s*baixa\b|d[aá]\s*baixa\b|\bbaixa\s+(no|na)\b|finaliz(ei|ou|ado|ada|a)\b|\bpaga\s+(o|a)\b|foi\s*liquidado\b|limpei\b|\bzer(ei|ou)\b/.test(t)) {
    if (!/quanto|total|saldo|resumo|o\s+que\s+paguei|o\s+que\s+eu\s+paguei/.test(t)) {
      const nameRaw = t
        .replace(/\b(conclua|concluir|conclu[ií]|mar(?:c|qu)\w*\s*(?:como\s*)?|marqu?e?|quitar?|quit[ae]|j[aá]\s*paguei|paguei\s*(o|a|da|do|na|no|minha|meu)?|liquidar|liquidei|deu\s*baixa|d[aá]\s*baixa|quitad[ao]|finaliz\w*|liquidou)\b/gi, '')
        .replace(/\b(a\s+minha\s+despesa\b|minha\s+despesa\b|a\s+despesa\s+d[ao]?|o\s+gasto\s+d[ao]?|despesa\s+d[ao]?|a\s+conta\s+d[ao]?|como\s+pag[ao]?\b|pago\b|paga\b|pra\s+mim|para\s+mim|jarvis)\b/gi, '')
        // remove artigos soltos ("o ifood" → "ifood", "a netflix" → "netflix")
        .replace(/\b(o|a|os|as)\b/gi, '')
        .replace(/[?,!]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (nameRaw.length >= 2)
        return { intent: 'conclude_expense', params: { expense_name: nameRaw } };
    }
  }

  // ── Análise / feedback multi-mês ─────────────────────────────────────────
  const hasSingleMonth = /esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente|de\s*hoje)/i.test(t);
  const hasRange = /desde|a\s*partir\s*de|primeiros?|[uú]ltimos?\s+(\d|tr[eê]s|dois?|quatro|meses)|ano\s*(completo|inteiro|todo)|o\s*ano|esse\s*ano|este\s*ano|desse\s*ano|hist[oó]rico|anual\b|trimest\w+|semest\w+|\b\d+\s*meses?\b/i.test(t);
  if (!hasSingleMonth && !/\bmaior(es)?\s+(gast|despesa|conta)/i.test(t) && /\bfeedback\b|an[aá]lise\b|analisa(r|me)?|avalia[çc][aã]o\b|como\s+(foi(ram)?|est[aá]|est[aã]o|estou|andam?|andei)\s+(o\s*|esse\s*|este\s*|desse\s*|nesse\s*)?(ano|meses?|per[ií]odo|finan[çc]\w*)|como\s+(est[aã]o|estou|andei|andam?).{0,25}(finan[çc]\w*|ano\b)|como\s+andei\b.{0,15}\bano\b|resumo\s+d[eo]s?\s*(ano|per[ií]odo|trim\w*|semest\w*|primeiros?|[uú]ltimos?)|resumo\b.{0,50}(ao\s+longo|desse\s+ano|esse\s+ano|o\s+ano)|como\s+foi\b.{0,30}finan[çc]\w*|per[ií]odo|trimest\w+|semest\w+|primeiros?\s+\d+\s*mes|[uú]ltimos?\s+\d+\s*mes|[uú]ltimos?\s*meses\b|primeiros?\s+(tr[eê]s|dois?|quatro)|[uú]ltimos?\s+(tr[eê]s|dois?|quatro|meses)|retrospectiva\b|evolu[çc][aã]o\s*finan[çc]\w*|tend[eê]ncia\b(?!\s+de\s+(gastos?|cr[eé]dito|d[eé]bito|contas?))|performance\s*finan[çc]\w*|balan[çc]o\s+(do\s*ano|dos?\s*[uú]ltimos?|dos?\s*meses?|geral\b)|balan[çc]o\s+geral\b|situa[çc][aã]o\b.{0,40}finan[çc]\w*|an[aá]lise\s*anual|feedback\s*anual|hist[oó]rico\s*anual|vis[aã]o\s*geral\s*(do\s*ano)?|rendimento\s*(do\s*per[ií]odo|mensal\b)|resumo\s*dos?\s*\d+\s*meses|primeiros?\s+\d\s*meses?\s*como/i.test(t)) {
    const range = hasRange ? parseMonthRange(t) : null;
    // Se há um nome específico de despesa + range E sem keywords de análise → by_name_range
    // (ex: "ifood nos últimos meses" → by_name_range; "análise dos últimos 4 meses" → analysis)
    const hasExplicitAnalysisKeyword = /\bfeedback\b|an[aá]lise\b|analisa|avalia[çc]|tend[eê]ncia|evolu[çc]|retrospectiva|performance\b|balan[çc]o\b|relat[oó]rio\b/i.test(t);
    if (!hasExplicitAnalysisKeyword) {
      const analysisGeneric = ['tudo','mes','geral','resumo','total','saldo','gastos','despesas','quanto','dinheiro','como','periodo','financas','financeiro','financeira','ano','anual','situacao','foram','foi','estao','andaram','andei','inteiro','todo','toda','todos','todas','finanças','ultimos','primeiros','financeiramente'];
      const analysisNameFilter = extractNameFilter(t);
      const hasSpecificName = analysisNameFilter && analysisNameFilter.length >= 3
        && !analysisGeneric.some(g => analysisNameFilter === g || analysisNameFilter.startsWith(g + ' ') || analysisNameFilter.endsWith(' ' + g));
      if (hasSpecificName && range) {
        return { intent: 'query', params: { subtype: 'by_name_range', fromMonth: range.from, toMonth: range.to, filter: analysisNameFilter } };
      }
    }
    if (range || /ano|primeiros?|[uú]ltimos?|desde|per[ií]odo|trimest|semest/i.test(t)) {
      const r = range || { from: 0, to: new Date().getMonth() };
      return { intent: 'query', params: { subtype: 'analysis', fromMonth: r.from, toMonth: r.to } };
    }
    // Com keyword de análise explícita mas sem range → retorna analysis do ano atual
    if (/\bfeedback\b|an[aá]lise\b|analisa|evolu[çc]|retrospectiva|performance\s*financ|tend[eê]ncia|avalia[çc]|situa[çc][aã]o\s*(?:financeira|das\s*finan\w*)?\s*geral\b|como\s+(est[aã]o|andei|andando|andam?|andou).{0,30}finan[çc]/i.test(t)) {
      const now = new Date().getMonth();
      return { intent: 'query', params: { subtype: 'analysis', fromMonth: 0, toMonth: now } };
    }
    return { intent: 'query', params: { subtype: 'summary', month: MONTH_PT[new Date().getMonth()] } };
  }

  // ── Por semana ────────────────────────────────────────────────────────────
  if (/\bsemana\b|semanais?\b|semanal\b|[uú]ltimos?\s*(\d+\s*)?(dias?)\b|gastos?\s*recentes?\b|o\s*que\s*saiu\s*nos?\s*[uú]ltimos?\s*dias?/.test(t))
    return { intent: 'query', params: { subtype: 'by_week', month: null } };

  // ── Comparativo (ANTES de biggest — "gastei mais no X vs mês passado" é compare) ─
  const CARD_RE = /nubank|\bnu\b|c6\s*bank|\bc6\b|picpay|next|\binter\b|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|will\s*bank|\bwill\b|pix|d[eé]bito|cr[eé]dito/;
  const monthsInText = MONTH_PT.filter(m => new RegExp('\\b' + m + '\\b').test(t));
  if ((/comparativo|comparar|compar[aeo]\w*|\bvs\.?\b|\bversus\b|diferen[çc]a|\bdif\b|compara[çc][aã]o|evoluiu|\bcontra\b|m[eê]s\s*a\s*m[eê]s/i.test(t) ||
      /evolu[çcií]\w*/i.test(t) && !/evolu[çc][aã]o\s*(financ|dos?\s*gast|mensal)/i.test(t)) ||
      /varia[çc][aã]o\b|crescimento\s*(dos?\s*)?gastos?|o\s*que\s*mudou\b|pior\s*ou\s*melhor|melhor\s*ou\s*pior|mais\s*ou\s*menos\s*(que|do)\b|maiores?\s*ou\s*menores?\b|piorou\s*ou\s*melhorou\b|melhorou\s*ou\s*piorou\b/i.test(t) ||
      /\b(cresci|reduzi|diminu[ií]|aumentei|melhorei|piorei).{0,20}\b(gast|m[eê]s|esse|passado|anterior)/i.test(t) ||
      /gastei\s+mais\s+em\b.{0,20}\bou\b/i.test(t) ||
      /\b(\w+)\s+(foi|est[aá])\s+(pior|melhor)\s+(que|do\s*que|em\s*rela[çc][aã]o\s*a)\b/i.test(t) ||
      /melhorou\s*em\s*rela[çc][aã]o\s*a|piorou\s*em\s*rela[çc][aã]o\s*a/i.test(t) ||
      /m[eê]s\s*passado\s+foi\s+(pior|melhor)|esse\s*m[eê]s\s+(t[aá]|est[aá])\s+(melhor|pior)/i.test(t) ||
      (/mais\b/.test(t) && /anterior|passado/.test(t) && CARD_RE.test(t)) ||
      (/gastei\b/.test(t) && /m[eê]s\s*(passado|anterior)/.test(t) && /esse\s*m[eê]s|m[eê]s\s*atual|agora/.test(t)) ||
      (/gastei\s+mais\b/.test(t) && /ou\s*menos|que\s*o\s*m[eê]s\s*(passado|anterior)/i.test(t)) ||
      (/gastei\s+mais\b/.test(t) && CARD_RE.test(t) && /em\s*(cr[eé]dito|d[eé]bito|pix)\b/i.test(t)) ||
      (/\b(cresceu|subiu|baixou|diminuiu|aumentou|reduziu|mudou|variou|piorou|melhorou|tend[eê]ncia|aumentei|diminuí|diminui\b|melhorei|piorei)\b/i.test(t) && (CARD_RE.test(t) || /m[eê]s\s*(passado|anterior)|anterior|passado\b/i.test(t) || /gastos?/i.test(t))) ||
      /\bentre\s+[^\s,]+\s+(e|ou)\s+[^\s,]+/i.test(t) ||
      /gast\w*\s+mais\b.{0,35}(m[eê]s\s*)?(passado|anterior)/i.test(t) ||
      (monthsInText.length >= 2 && (/\bou\b/i.test(t) || /\b(melhorei|piorei|melhorou|piorou|comparar|comparativo|variou|evoluiu)\b/i.test(t)))) {
    const now = new Date().getMonth();
    const months = [];
    MONTH_PT.forEach((m, i) => { if (new RegExp('\\b' + m + '\\b').test(t)) months.push(i); });
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
  if (/maior(es)?|\btop\b|ranking\b|pior(es)?\s*gasto|mais\s*(caro|cara|altos?|altas?|elevados?|significativos?|pesad[ao]s?|expressivos?|gastos?\b|despesas?\b)|o\s*que\s+mais\s*(gast|custou|tirou|levou|consumiu|saiu|pesou|foi\b)|mais\s*pesado|saiu\s*mais\b|mais\s*saiu\b|mais\s*pesou\b|custou\s*mais|m[aá]ximo\b|principais?\s*(gasto|despesa)|apertou|me\s*apertou|o\s*que\s+(sangrou|levou\s*mais\s*dinheiro)|vil[aã]o\s*(do\s*m[eê]s)?|onde\s*(foi|saiu|escapou)\s*mais|gastos?\s*que\s*pesaram?|o\s*que\s*pesou\b|onde\s*escapou/.test(t) ||
      (/gastei?\s*mais\b/.test(t) && !/ou\s*menos|que\s*o\s*m[eê]s\s*(passado|anterior)|em\s*cr[eé]dito|\s+ou\s+\w+/i.test(t)))
    return { intent: 'query', params: { subtype: 'biggest', month } };

  // ── By name + range sem hasQuery (ex: "ifood esse ano", "netflix a partir de janeiro") ─
  // Só dispara se NÃO há keywords de análise/overview — essas caem no bloco analysis abaixo
  if (!/\bfeedback\b|an[aá]lise|analisa\w*|avalia[çc]|per[ií]odo\b|trimest\w+|semest\w+|tend[eê]ncia|evolu[çc]|retrospectiva|performance\b|balan[çc]\w*|relat[oó]rio\b|rendimento\s*do\s*per/i.test(t)) {
    const earlyRange = parseMonthRange(t);
    const earlyHist = /hist[oó]rico/i.test(t);
    if (earlyRange || earlyHist) {
      const earlyFilter = extractNameFilter(t);
      const earlyGeneric = ['tudo','mes','geral','resumo','total','saldo','gastos','despesas','quanto','dinheiro','saiu','financas','financeiro','financeira','como','ano','anual','situacao','foram','foi','estao','andaram','andou','andei','financeiramente','ultimos','primeiros','periodo','inteiro','todo','toda','estou','esteve','desde','finanças','alguma','coisa','algo','zero','nada'];
      const earlySpecific = earlyFilter && earlyFilter.length >= 3
        && !earlyGeneric.some(g => earlyFilter === g || earlyFilter.startsWith(g + ' ') || earlyFilter.endsWith(' ' + g));
      if (earlySpecific) {
        const r = earlyRange || { from: 0, to: new Date().getMonth() };
        return { intent: 'query', params: { subtype: 'by_name_range', fromMonth: r.from, toMonth: r.to, filter: earlyFilter } };
      }
    }
  }

  const hasQuery = /quanto|qto\b|gast|gst\w+|resum\w*|total|como\s*(t[aá]|foi|est[aá]|estou|anda\b)|estou\s*(bem|mal)\b|t[aá]\s*(o\s*m[eê]s|bem\b|bom\b)|t[oô]\s*(bem\b|no\s*(vermelho|azul))|financeiramente\b|financ\w*|queria\s*(ver|saber)|me\s*(fala|mostra|diz|passa|traz)\b|saldo|sobr[ao]u|sobr\b|sobrando|balanç|balanco|situac|dinheiro|fechamento|mensal|o\s+que\b|oq\b|paguei\b|saiu\b|foi\s*(pro|pra|para)\b|hist[oó]rico|desde\b|nos\s+[uú]ltimos|extrato\b|despesas?\b|conta\s+de\b|valor\b|anual\b|vis[aã]o\s*(geral)?\b|resultado\s*do\s*m[eê]s|resultado\s*(financeiro)?\b|no\s*(vermelho|azul)\b|no\s+zero\b|caro\b|consumiu\b|quero\s*ver\b|o\s*m[eê]s\b|\bhow\s+much\b|\bmy\s+(spending|balance|summary|monthly)\b|\bshow\s+me\b|arruinou\b|destruiu\b/.test(t);

  // ── "fechei/limpei a conta" → conclude (precisa vir ANTES de by_payment) ──
  if (/\b(fechei|limpei|fechar)\b.{0,20}\b(conta|fatura)\b/i.test(t)) {
    const nameRaw = t.replace(/\b(fechei|limpei|a|o|os|as|conta|fatura|do|da|de|dos|das|minha|meu)\b/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return { intent: 'conclude_expense', params: { expense_name: nameRaw.length >= 2 ? nameRaw : null } };
  }

  // ── Por cartão / forma de pagamento ──────────────────────────────────────
  const cardMatch = t.match(CARD_RE);
  // Aceita card mesmo sem hasQuery se há mês ou mensagem curta (ex: "nubank esse mês")
  if (cardMatch && (hasQuery || month || t.length < 28))
    return { intent: 'query', params: { subtype: 'by_payment', month, filter: cardMatch[0].trim() } };

  // ── Por nome / categoria ──────────────────────────────────────────────────
  if (hasQuery) {
    const nameFilter = extractNameFilter(t);
    const genericTerms = ['tudo','mes','geral','resumo','total','saldo','balanço','balanco','gastos','despesas','quanto','qto','dinheiro','situacao','fechamento','financas','como','ficou','totais','balanc','estou','historico','saiu','sobrou','sobra','sobrando','consumiu','levou','aconteceu','pesou','financeira','financeiro','vermelho','azul','resultado','visao','reais','sobrado','gastou','resume','resumao','quantos','anda','bolso','cara','irmao','mano','brow','po','ta','to','relatorio','balance','spending','summary','monthly','disponivel','disponível','custou','custei','custo','nota','overview'];
    const isGeneric = !nameFilter || nameFilter.length < 3
      || genericTerms.some(g => nameFilter === g || nameFilter.startsWith(g + ' ') || nameFilter.endsWith(' ' + g));
    if (!isGeneric) {
      // "histórico de X" ou "X nos últimos meses" → range do ano todo
      const isHist = /hist[oó]rico|evolu[çcií]\w*|acumul\w*/i.test(t);
      const range = parseMonthRange(t);
      if (range || isHist) {
        const r = range || { from: 0, to: new Date().getMonth() };
        return { intent: 'query', params: { subtype: 'by_name_range', fromMonth: r.from, toMonth: r.to, filter: nameFilter } };
      }
      return { intent: 'query', params: { subtype: 'by_name', month, filter: nameFilter } };
    }
    // query genérica com range → análise multi-mês (ex: "como andou meu financeiro desde março")
    if (hasRange && !hasSingleMonth) {
      const r = parseMonthRange(t);
      const rr = r || { from: 0, to: new Date().getMonth() };
      return { intent: 'query', params: { subtype: 'analysis', fromMonth: rr.from, toMonth: rr.to } };
    }
    return { intent: 'query', params: { subtype: 'summary', month } };
  }

  // ── Fallback: mensagem curta com mês → tenta extrair nome ou retorna summary ─
  if (month && t.length <= 30) {
    const nameFilter = extractNameFilter(t);
    const genericTerms = ['tudo','mes','geral','resumo','total','saldo','gastos','despesas','quanto','qto','dinheiro','extrato','resumao','fala','mostra','diz','ver','anda','situacao','situac','status','financeiro','como','fechamento','balanco','zero','nada','alguma','coisa','algo','pago','paga','disponivel','disponível','custou','custei','custo','overview','nota'];
    const isGeneric = !nameFilter || nameFilter.length < 2
      || genericTerms.some(g => nameFilter === g || nameFilter.startsWith(g + ' ') || nameFilter.endsWith(' ' + g));
    if (!isGeneric)
      return { intent: 'query', params: { subtype: 'by_name', month, filter: nameFilter } };
    return { intent: 'query', params: { subtype: 'summary', month } };
  }

  // ── Fallback ultra-curto: nome de despesa sozinho (ex: "netflix?", "ifood") ─
  // Só dispara para mensagens de UMA palavra (sem espaço), evitando frases de chat
  if (t.length <= 14 && !t.includes(' ')) {
    const bare = t.replace(/[?!.,;]/g, '').trim();
    const GREET = /^(oi|ol[aá]|ok|sim|n[aã]o|bom|bem|boa|t[aá]|hey|valeu|obrigad\w*|certo|bl[sz]|beleza|hm+|opa|eae|eai|bora|legal|show|perfeito|exatamente|entendi|talvez|claro|massa|top|vlw|falou|flw|uhu|nope|yep|yeah|nah|pow+)$/i;
    if (bare.length >= 3 && !GREET.test(bare))
      return { intent: 'query', params: { subtype: 'by_name', month: null, filter: bare } };
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

"rename_expense" — renomear uma despesa existente
  expense_name (nome atual), new_name (nome novo)
Exemplos:
"renomeia a netflix para disney plus" → {"intent":"rename_expense","params":{"expense_name":"netflix","new_name":"disney plus"}}
"muda o nome do aluguel para Aluguel Novo" → {"intent":"rename_expense","params":{"expense_name":"aluguel","new_name":"Aluguel Novo"}}

"edit_expense" — editar valor ou forma de pagamento de uma despesa
  expense_name, field: "value"|"payment", new_value (número), new_payment (texto)
Exemplos:
"muda o valor da netflix para 55" → {"intent":"edit_expense","params":{"expense_name":"netflix","field":"value","new_value":55}}
"muda o pagamento do aluguel para pix" → {"intent":"edit_expense","params":{"expense_name":"aluguel","field":"payment","new_payment":"Pix"}}

"delete_expense" — remover uma despesa
  expense_name
Exemplos:
"apaga a netflix" → {"intent":"delete_expense","params":{"expense_name":"netflix"}}
"exclui o ifood" → {"intent":"delete_expense","params":{"expense_name":"ifood"}}

"move_expense" — mover despesa entre fixo e variável
  expense_name, to_section: "fixed"|"variable"
Exemplos:
"passa a netflix para fixa" → {"intent":"move_expense","params":{"expense_name":"netflix","to_section":"fixed"}}
"muda o aluguel pra variável" → {"intent":"move_expense","params":{"expense_name":"aluguel","to_section":"variable"}}

"rename_project" — renomear um projeto/meta
  project_name (nome atual), new_name (nome novo)
Exemplos:
"renomeia o projeto viagem para Férias" → {"intent":"rename_project","params":{"project_name":"viagem","new_name":"Férias"}}

"edit_project" — editar meta ou mensal de um projeto
  project_name, field: "target"|"monthly"|"saved", new_value (número)
Exemplos:
"muda a meta do projeto carro para 30000" → {"intent":"edit_project","params":{"project_name":"carro","field":"target","new_value":30000}}
"altera o mensal da viagem para 500" → {"intent":"edit_project","params":{"project_name":"viagem","field":"monthly","new_value":500}}

"delete_project" — apagar um projeto/meta
  project_name
Exemplos:
"apaga o projeto viagem" → {"intent":"delete_project","params":{"project_name":"viagem"}}
"exclui a meta carro" → {"intent":"delete_project","params":{"project_name":"carro"}}

Retorne apenas o JSON, nada mais.`;

export async function classifyIntent(text, history = []) {
  const local = localClassify(text.toLowerCase());
  if (local) return local;

  const key = process.env.GEMINI_API_KEY;
  if (!key) return { intent: 'chat', params: {} };
  try {
    // Monta contexto de histórico para ajudar o Gemini a resolver referências ("e esse mês?", "e as variáveis?")
    let historyCtx = '';
    if (history && history.length > 0) {
      historyCtx = '\n\nHistórico recente da conversa:\n' +
        history.map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${String(h.text || '').slice(0, 200)}`).join('\n') +
        '\n';
    }
    const fullPrompt = PROMPT + historyCtx + '\n\nMensagem atual: ' + text;
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
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
