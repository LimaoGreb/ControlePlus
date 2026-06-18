import { isVoiceReply, textToSpeech } from './ttsService.js';

const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const BASE = () => `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendRecordingAction(chatId) {
  await fetch(`${BASE()}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'record_voice' }),
  });
}

export async function sendVoice(chatId, audioBuffer) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('voice', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'response.mp3');
  await fetch(`${BASE()}/sendVoice`, { method: 'POST', body: fd });
}

export async function sendMessage(chatId, text, extra = {}) {
  if (isVoiceReply(chatId)) {
    try {
      await sendRecordingAction(chatId);
      const buf = await textToSpeech(text, chatId);
      await sendVoice(chatId, buf);
      return;
    } catch (e) {
      console.warn('[TTS] fallback para texto:', e.message);
    }
  }
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

export async function setWebhook(url) {
  const res = await fetch(`${BASE()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${url}/webhook` }),
  });
  return res.json();
}

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

export async function downloadFileAsBase64(filePath) {
  try {
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    if (b64.length > 700000) console.warn('[Telegram] arquivo grande:', Math.round(b64.length / 1024), 'KB');
    return b64;
  } catch (e) {
    console.warn('[Telegram] downloadFile error:', e.message);
    return null;
  }
}
