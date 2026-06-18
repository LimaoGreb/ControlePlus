const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

export const AVAILABLE_VOICES = [
  { id: 'Vitoria', label: 'Vitória (feminina, padrão)' },
  { id: 'Ricardo', label: 'Ricardo (masculino)' },
  { id: 'Camila', label: 'Camila (feminina, jovem)' },
];

const DEFAULT_VOICE = 'Vitoria';

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

async function streamElementsTTSChunk(chunk, voice) {
  const encoded = encodeURIComponent(chunk);
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encoded}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`StreamElements TTS HTTP ${res.status}`);
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

  const chunks = splitIntoChunks(clean, 190);

  try {
    console.log(`[TTS] StreamElements (${voice}): ${chunks.length} chunk(s)`);
    const buffers = await Promise.all(chunks.map(c => streamElementsTTSChunk(c, voice)));
    const buf = Buffer.concat(buffers);
    if (!buf.length) throw new Error('buffer vazio');
    console.log(`[TTS] StreamElements ok, bytes=${buf.length}`);
    return buf;
  } catch (e) {
    console.warn(`[TTS] StreamElements falhou (${e.message}), fallback Google TTS...`);
    const buffers = await Promise.all(chunks.map(googleTTSChunk));
    const buf = Buffer.concat(buffers);
    if (!buf.length) throw new Error('Google TTS gerou buffer vazio');
    console.log(`[TTS] Google fallback ok, bytes=${buf.length}`);
    return buf;
  }
}
