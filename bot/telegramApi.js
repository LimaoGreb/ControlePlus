// Wrapper minimalista para a API HTTP do Telegram Bot.
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const BASE = () => `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chatId, text, extra = {}) {
  await fetch(`${BASE()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra }),
  });
}

export async function sendTyping(chatId) {
  await fetch(`${BASE()}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  });
}

// Registra o webhook com a URL pública do servidor (chamar 1x no deploy).
export async function setWebhook(url) {
  const res = await fetch(`${BASE()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${url}/webhook` }),
  });
  return res.json();
}
