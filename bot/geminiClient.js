// Classifica intencoes via Gemini Flash (gratuito).
// Usado apenas para queries/comandos — despesas usam o parser local.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Classificador local — rápido, sem API. Cobre os casos mais comuns.
function localClassify(text) {
  const lower = text.toLowerCase();
  const monthMatch = MONTH_PT.find(m => lower.includes(m));

  // Exportar
  if (/\b(exporta|exportar|planilha|csv|baixar dados|meus dados)\b/i.test(lower)) {
    return { intent: 'export', params: {} };
  }
  // Investimentos
  if (/\b(investimento|carteira|rendimento|aplica[çc][aã]o|aportes?)\b/i.test(lower)) {
    return { intent: 'query', params: { subtype: 'investments', month: monthMatch || null } };
  }
  // Projetos
  if (/\b(projeto|meta|objetivo|poupando|guardando)\b/i.test(lower)) {
    return { intent: 'query', params: { subtype: 'projects', month: monthMatch || null } };
  }
  // Maiores gastos
  if (/\b(maior|maiores|top|pior|piores)\b.*\b(gasto|despesa|conta)\b/i.test(lower) ||
      /\b(gasto|despesa)\b.*\b(maior|maiores)\b/i.test(lower)) {
    return { intent: 'query', params: { subtype: 'biggest', month: monthMatch || null } };
  }
  // Por forma de pagamento ou cartão específico
  if (/\b(quanto|gastos?|gastei|paguei)\b/i.test(lower) &&
      /\b(nubank|c6|picpay|next|inter|bradesco|itau|ita[uú]|santander|pix|d[eé]bito|cr[eé]dito|cart[aã]o|recargapay)\b/i.test(lower)) {
    const filterMatch = lower.match(/\b(nubank|c6|picpay|next|inter|bradesco|ita[uú]|santander|pix|d[eé]bito|cr[eé]dito|recargapay)\b/i);
    return { intent: 'query', params: { subtype: 'by_payment', month: monthMatch || null, filter: filterMatch ? filterMatch[0] : null } };
  }
  // Resumo geral / total do mês
  if (/\b(resumo|como t[aá]|como foi|como est[aá]|total|quanto (eu |vc |você )?(gastei|gasto|gastou)|gastos? do m[eê]s|m[eê]s de|esse m[eê]s|este m[eê]s)\b/i.test(lower)) {
    return { intent: 'query', params: { subtype: 'summary', month: monthMatch || null } };
  }

  return null; // ambíguo — deixa o Gemini decidir
}

const PROMPT = `Classifique a mensagem de um app de financas pessoais em PT-BR.
Retorne SOMENTE JSON sem markdown.

Intencoes possiveis:
- "query": quer consultar informacoes (gastos, resumo, investimentos, projetos)
- "add_installments": quer parcelar uma compra em N vezes
- "update_due_date": quer mudar o dia de vencimento de uma despesa fixa
- "export": quer exportar os dados em CSV
- "chat": saudacao ou conversa geral

Para query, inclua:
  subtype: "summary" | "by_payment" | "biggest" | "investments" | "projects" | "by_name"
  month: nome do mes PT-BR ou null (null = mes atual)
  filter: texto de filtro (forma de pagamento, nome) ou null

Para add_installments, inclua:
  name: nome da compra ou null
  total_value: numero (valor TOTAL) ou null
  installments: numero de parcelas ou null
  payment: forma de pagamento ou null
  month: mes de inicio PT-BR ou null

Para update_due_date, inclua:
  expense_name: nome da despesa (parcial ok)
  new_day: numero 1-31 ou null

Para export: {}
Para chat: {}

Formato exato: {"intent":"...","params":{...}}`;

export async function classifyIntent(text) {
  // Tenta classificador local primeiro (rápido, sem API)
  const local = localClassify(text);
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
