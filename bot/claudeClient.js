// Google Gemini Flash — gratuito, sem cartão de crédito.
// Chave: aistudio.google.com → "Get API key" → "Create API key"
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const GEMINI_URL = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const MONTH_INDEX = new Date().getMonth();

const SYSTEM_PROMPT = `Você é Jarvis, assistente financeiro do app Controle+.
Analise a mensagem do usuário e extraia informações de uma DESPESA em português informal.

Responda APENAS com JSON válido (sem explicação, sem markdown, sem bloco de código):
{
  "name": "nome da despesa (ex: Mercado, Uber, Conta de luz)",
  "value": 30.50,
  "payment": "forma de pagamento mencionada ou null",
  "monthIndex": 0,
  "isExpense": true
}

Regras:
- monthIndex: 0-11 (janeiro=0). Se não mencionado, use ${MONTH_INDEX}.
- value: número em reais. "3 pila"=3, "30 conto"=30, "cinquenta"=50, null se não mencionado.
- Se NÃO for sobre despesa: {"isExpense": false}`;

async function callGemini(userText) {
  const body = {
    contents: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Entendido. Vou responder apenas com JSON.' }] },
      { role: 'user', parts: [{ text: userText }] },
    ],
    generationConfig: { maxOutputTokens: 256, temperature: 0.1 },
  };

  const res = await fetch(GEMINI_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

export async function parseExpenseMessage(text) {
  try {
    const raw = await callGemini(text);
    if (!raw) return { isExpense: false };
    // Remove possíveis backticks se o modelo incluir mesmo assim
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('[Gemini] parseExpenseMessage falhou:', e.message);
    return { isExpense: false };
  }
}

export async function extractField(field, userReply) {
  const prompts = {
    value: `O usuário disse "${userReply}". Qual é o valor em reais? Responda APENAS o número (ex: 30.50) ou null.`,
    payment: `O usuário disse "${userReply}" como pagamento. Responda APENAS o nome limpo (ex: "Pix", "Débito Nubank") ou null.`,
  };
  try {
    const raw = await callGemini(prompts[field] || userReply);
    if (!raw || raw === 'null') return null;
    if (field === 'value') return parseFloat(raw.replace(',', '.')) || null;
    return raw;
  } catch {
    return null;
  }
}
