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

export async function textToSpeech(text, chatId) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY não configurada');

  const voiceId = getVoiceForChat(chatId);
  const clean = stripMarkdown(text);
  console.log(`[TTS] ElevenLabs: voz=${voiceId}, chars=${clean.length}`);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: clean,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs HTTP ${res.status}: ${err}`);
  }

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}
