// Classifica intencoes via Gemini Flash (gratuito).
// Usado apenas para queries/comandos — despesas usam o parser local.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Classificador local — sem API, cobre todos os casos comuns de query.
function localClassify(text) {
  const t = text.toLowerCase();
  const month = MONTH_PT.find(m => t.includes(m)) || null;

  if (/exporta|planilha|csv|meus dados/.test(t))
    return { intent: 'export', params: {} };

  if (/investimento|carteira|rendimento|aporte/.test(t))
    return { intent: 'query', params: { subtype: 'investments', month } };

  if (/projeto|meta|objetivo/.test(t))
    return { intent: 'query', params: { subtype: 'projects', month } };

  if (/maior|maiores/.test(t))
    return { intent: 'query', params: { subtype: 'biggest', month } };

  const hasQuery = /quanto|gast|resumo|total|como t|como foi|como est/.test(t);
  const cardMatch = t.match(/nubank|c6|picpay|next|inter|bradesco|ita[uú]|santander|recargapay|pix|d[eé]bito|cr[eé]dito/);
  if (hasQuery && cardMatch)
    return { intent: 'query', params: { subtype: 'by_payment', month, filter: cardMatch[0] } };

  if (hasQuery)
    return { intent: 'query', params: { subtype: 'summary', month } };

  return null;
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
