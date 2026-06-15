// Hook de STT para o Cap: grava fala → transcreve → chama onTranscript(text).
// expo-speech-recognition é um módulo nativo — não disponível no Expo Go.
import { useState, useRef, useCallback, useEffect } from 'react';

let SpeechModule = null;
let useSpeechEvent = () => {};

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
} catch (_) {}

export function useVoiceChat({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const permGranted = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // ─── Eventos ──────────────────────────────────────────────────────────────
  useSpeechEvent('result', (e) => {
    if (!e.isFinal) return;
    const transcript = e.results?.[0]?.transcript;
    if (transcript) {
      setListening(false);
      onTranscriptRef.current?.(transcript);
    }
  });

  useSpeechEvent('end', () => setListening(false));

  useSpeechEvent('error', (e) => {
    console.warn('[voice] error:', e.error, e.message);
    setListening(false);
  });

  // ─── Permissão ────────────────────────────────────────────────────────────
  const ensurePermission = useCallback(async () => {
    if (!SpeechModule) return false;
    if (permGranted.current) return true;
    try {
      const { granted } = await SpeechModule.requestPermissionsAsync();
      permGranted.current = granted;
      return granted;
    } catch (e) {
      console.warn('[voice] permission error:', e.message);
      return false;
    }
  }, []);

  // ─── Start / Stop ─────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!SpeechModule) return;
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      SpeechModule.start({ lang: 'pt-BR', interimResults: false, maxAlternatives: 1, continuous: false });
      setListening(true);
    } catch (e) {
      console.warn('[voice] start error:', e.message);
    }
  }, [ensurePermission]);

  const stopListening = useCallback(() => {
    try { SpeechModule?.stop(); } catch {}
    setListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return { listening, toggleMic };
}
