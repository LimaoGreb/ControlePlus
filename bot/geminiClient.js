// Classifica intencoes via Gemini Flash (gratuito).
// Usado apenas para queries/comandos — despesas usam o parser local.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
