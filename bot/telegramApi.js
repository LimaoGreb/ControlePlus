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

export async function sendDocument(chatId, filename, content, caption) {
  try {
    const fd = new FormData();
    fd.append('chat_id', String(chatId));
    fd.append('document', new Blob([content], { type: 'text/csv; charset=utf-8' }), filename);
    if (caption) fd.append('caption', caption);
    await fetch(`${BASE()}/sendDocument`, { method: 'POST', body: fd });
  } catch (e) {
    console.warn('[Telegram] sendDocument error:', e.message);
  }
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

// Retorna o file_path de um arquivo do Telegram para download.
export async function getFile(fileId) {
  try {
    const res = await fetch(`${BASE()}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const json = await res.json();
    return json.result?.file_path || null;
  } catch (e) {
    console.warn('[Telegram] getFile error:', e.message);
    return null;
  }
}

// Baixa um arquivo do Telegram e retorna como string base64.
export async function downloadFileAsBase64(filePath) {
  try {
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    if (b64.length > 700000) console.warn('[Telegram] foto grande:', Math.round(b64.length / 1024), 'KB');
    return b64;
  } catch (e) {
    console.warn('[Telegram] downloadFile error:', e.message);
    return null;
  }
}
