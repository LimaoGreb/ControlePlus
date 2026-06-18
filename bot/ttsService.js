import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const AVAILABLE_VOICES = [
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca (feminina, padrão)' },
  { id: 'pt-BR-AntonioNeural',   label: 'Antonio (masculino)' },
  { id: 'pt-BR-ThalitaNeural',   label: 'Thalita (feminina, jovem)' },
];

const DEFAULT_VOICE = 'pt-BR-FranciscaNeural';

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

export async function textToSpeech(text, chatId) {
  const voice = getVoiceForChat(chatId);
  const clean = stripMarkdown(text);
  console.log(`[TTS] iniciando: voz=${voice}, chars=${clean.length}`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  console.log('[TTS] metadata ok, abrindo stream');

  const chunks = [];
  await new Promise((resolve, reject) => {
    const readable = tts.toStream(clean);
    readable.on('data', chunk => chunks.push(chunk));
    readable.on('end', () => { console.log(`[TTS] stream ok, bytes=${chunks.reduce((a, c) => a + c.length, 0)}`); resolve(); });
    readable.on('error', err => { console.warn('[TTS] stream error:', err?.message || String(err), JSON.stringify(err)); reject(err || new Error('stream error')); });
  });

  const buf = Buffer.concat(chunks);
  if (!buf.length) throw new Error('TTS gerou buffer vazio');
  return buf;
}
