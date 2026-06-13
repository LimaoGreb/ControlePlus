// Parser local de despesas em PT-BR — sem API externa, nunca falha.

const MONTH_INDEX = new Date().getMonth();
const MONTH_NAMES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function extractMonthIndex(text) {
  const t = text.toLowerCase();
  if (/m[eê]s\s*(passado|anterior|[uú]ltimo)|[uú]ltimo\s*m[eê]s/i.test(t))
    return ((MONTH_INDEX - 1) + 12) % 12;
  if (/pr[oó]ximo\s*m[eê]s|m[eê]s\s*(que\s*vem|seguinte)/i.test(t))
    return (MONTH_INDEX + 1) % 12;
  const idx = MONTH_NAMES_PT.findIndex(m => t.includes(m));
  return idx >= 0 ? idx : MONTH_INDEX;
}

const NUMBER_WORDS = {
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'três': 3,
  'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
  'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14,
  'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18,
  'dezenove': 19, 'vinte': 20, 'trinta': 30, 'quarenta': 40,
  'cinquenta': 50, 'sessenta': 60, 'setenta': 70, 'oitenta': 80,
  'noventa': 90, 'cem': 100, 'cento': 100, 'duzentos': 200,
  'trezentos': 300, 'quatrocentos': 400, 'quinhentos': 500,
  'mil': 1000,
};

function extractValue(text) {
  // Número com decimal: "35,50" ou "35.50"
  const dec = text.match(/R?\$?\s*(\d+)[,.](\d{1,2})\s*(?:reais?|conto|pila|real)?/i);
  if (dec) return parseFloat(`${dec[1]}.${dec[2]}`);
  // Número inteiro
  const num = text.match(/R?\$?\s*(\d+)\s*(?:reais?|conto|pila|real)?/i);
  if (num) return parseFloat(num[1]);
  // Por extenso
  const lower = text.toLowerCase();
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return val;
  }
  return null;
}

function extractPayment(text) {
  const t = text.toLowerCase();
  if (/pix/i.test(t)) return 'Pix';
  if (/d[eé]bito/i.test(t)) return 'Débito';
  if (/cr[eé]dito/i.test(t)) return 'Crédito';
  if (/dinheiro|espécie|especie|cash/i.test(t)) return 'Dinheiro';
  if (/boleto/i.test(t)) return 'Boleto';
  if (/cartão|cartao/i.test(t)) return 'Cartão';
  return null;
}

function extractName(text) {
  let s = text
    .replace(/jarvis[,.]?\s*/gi, '')
    .replace(/\b(gastei|paguei|comprei|tive que pagar|fui no|fui na|fui|vim|fiz|no|na|em|de|do|da|pelo|pela|pro|pra|um|uma|o|a|meu|minha|aqui|agora|hoje|ontem|e|que|ali|la|lá)\b/gi, ' ')
    .replace(/R?\$?\s*\d+(?:[,.]?\d+)?\s*(?:reais?|conto|pila|real)?/gi, ' ')
    .replace(/\b(no pix|no d[eé]bito|no cr[eé]dito|no dinheiro|a d[eé]bito|em dinheiro|pix|d[eé]bito|cr[eé]dito|dinheiro|boleto|cart[aã]o)\b/gi, ' ')
    .replace(/\b\d+\s*x\b/gi, ' ')
    .replace(/[.,!?;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitaliza
  s = s.split(' ')
    .filter(w => w.length > 1)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return s || null;
}

const NON_EXPENSE = ['/start', '/cancelar', 'oi', 'olá', 'ola', 'tudo bem',
  'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'ok', 'sim', 'não', 'nao'];

// Verbos que iniciam fluxo de despesa mesmo sem número (bot pergunta o valor depois)
const ADD_VERBS = /\b(adiciona|adicione|adicionar|lança|lance|lançar|coloca|coloque|colocar|registra|registre|registrar)\b/i;

export async function parseExpenseMessage(text) {
  const lower = text.toLowerCase().trim();

  if (NON_EXPENSE.some(w => lower === w || lower.startsWith(w + ' '))) {
    return { isExpense: false };
  }

  const expenseKeywords = ['gastei', 'paguei', 'comprei', 'gasto', 'despesa',
    'reais', 'conto', 'pila', 'r$', 'tive que pagar'];
  const hasKeyword = expenseKeywords.some(k => lower.includes(k));
  const hasNumber = /\d+/.test(text);
  const hasAddVerb = ADD_VERBS.test(text);

  const isIncome = /\b(renda|salário|salario|receita|recebi|entrada|ganho|ganhei|proventos|faturei|faturamento|lucro|recebimento)\b/i.test(lower);
  if (isIncome) return { isExpense: false };

  // Operações de configurações — nunca são despesas
  const isSettingChange =
    /\blimite\b.{0,35}(cart[aã]o|cr[eé]dito|card)|(cart[aã]o|cr[eé]dito).{0,35}\blimite\b/i.test(lower) ||
    /\b(meu\s*nome|me\s*chamo)\b/i.test(lower) ||
    /\b(nome\s*(para?|pra|é|eh)\s+\w)|(muda|atualiza|troca)\b.{0,10}\bnome\b/i.test(lower) ||
    /\b(contribui[çc][aã]o|d[íi]zimo|doa[çc][aã]o)\b.{0,20}\d+\s*%/i.test(lower) ||
    /\b(projeto|meta|poupan[çc]a)\b.{0,10}\blimite\b/i.test(lower);
  if (isSettingChange) return { isExpense: false };

  if (hasAddVerb) {
    return { isExpense: true, name: extractName(text), value: extractValue(text), payment: extractPayment(text), monthIndex: extractMonthIndex(text) };
  }

  // Exige keyword E número — só keyword sem valor é consulta ("quanto gastei?")
  if (!hasKeyword || !hasNumber) return { isExpense: false };

  // "quanto gastei em X nos últimos 3 meses" é query, não despesa
  const hasQueryIntent = /\bquanto\b|\bhist[oó]rico\b|\bextrato\b|\btotal\b|\bresumão?\b/i.test(lower);
  if (hasQueryIntent && !hasAddVerb) return { isExpense: false };

  return {
    isExpense: true,
    name: extractName(text),
    value: extractValue(text),
    payment: extractPayment(text),
    monthIndex: extractMonthIndex(text),
  };
}

export async function extractField(field, userReply) {
  if (field === 'value') return extractValue(userReply);
  if (field === 'payment') {
    const p = extractPayment(userReply);
    if (p) return p;
    const clean = userReply.trim();
    return clean.length > 0 && clean.length < 30 ? clean : null;
  }
  return null;
}
