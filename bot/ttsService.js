const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

export const AVAILABLE_VOICES = [
  { id: 'Celeste-PlayAI', label: 'Celeste (feminina, padrão)' },
  { id: 'Fritz-PlayAI', label: 'Fritz (masculino)' },
  { id: 'Arista-PlayAI', label: 'Arista (feminina, jovem)' },
];

const DEFAULT_VOICE = 'Celeste-PlayAI';

const _voicePrefs = new Map();
const _voiceReplyChats = new Set();

export function setVoiceForChat(chatId, voice) { _voicePrefs.set(String(chatId), voice); }
export function getVoiceForChat(chatId) { return _voicePrefs.get(String(chatId)) || DEFAULT_VOICE; }
export function activateVoiceReply(chatId) { _voiceReplyChats.add(String(chatId)); }
export function deactivateVoiceReply(chatId) { _voiceReplyChats.delete(String(chatId)); }
export function isVoiceReply(chatId) { return _voiceReplyChats.has(String(chatId)); }

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[_*[\]()~>#+=|{}\\]/g, '')
    .replace(/\n+/g, '. ')
    .trim();
}

function splitIntoChunks(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function groqTTSChunk(chunk, voice) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY não configurada');
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'playai-tts', input: chunk, voice, response_format: 'mp3' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq TTS HTTP ${res.status}: ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function googleTTSChunk(chunk) {
  const encoded = encodeURIComponent(chunk);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=pt-BR&client=tw-ob&ttsspeed=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function textToSpeech(text, chatId) {
  const clean = stripMarkdown(text);
  const voice = getVoiceForChat(chatId);
  console.log(`[TTS] Groq PlayAI (${voice}): chars=${clean.length}`);

  try {
    const chunks = splitIntoChunks(clean, 800);
    const buffers = await Promise.all(chunks.map(c => groqTTSChunk(c, voice)));
    const buf = Buffer.concat(buffers);
    if (!buf.length) throw new Error('buffer vazio');
    console.log(`[TTS] Groq ok, bytes=${buf.length}`);
    return buf;
  } catch (e) {
    console.warn(`[TTS] Groq falhou (${e.message}), fallback Google TTS...`);
    const chunks = splitIntoChunks(clean, 190);
    const buffers = await Promise.all(chunks.map(googleTTSChunk));
    const buf = Buffer.concat(buffers);
    if (!buf.length) throw new Error('Google TTS gerou buffer vazio');
    console.log(`[TTS] Google fallback ok, bytes=${buf.length}`);
    return buf;
  }
}
