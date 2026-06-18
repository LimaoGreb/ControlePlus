const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

export const AVAILABLE_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (feminina, padrão)' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam (masculino)' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (masculino, jovem)' },
];

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';

const _voicePrefs = new Map();
const _voiceReplyChats = new Set();

export function setVoiceForChat(chatId, voice) {
  _voicePrefs.set(String(chatId), voice);
}

export function getVoiceForChat(chatId) {
  return _voicePrefs.get(String(chatId)) || DEFAULT_VOICE;
}

export function activateVoiceReply(chatId) {
  _voiceReplyChats.add(String(chatId));
}

export function deactivateVoiceReply(chatId) {
  _voiceReplyChats.delete(String(chatId));
}

export function isVoiceReply(chatId) {
  return _voiceReplyChats.has(String(chatId));
}

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
  console.log(`[TTS] Google: chars=${clean.length}`);

  // Google TTS limita ~200 chars por request — divide em sentenças se necessário
  const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > 190) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const buffers = await Promise.all(chunks.map(googleTTSChunk));
  const buf = Buffer.concat(buffers);
  if (!buf.length) throw new Error('Google TTS gerou buffer vazio');
  console.log(`[TTS] ok, bytes=${buf.length}`);
  return buf;
}
