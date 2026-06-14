// Hook de STT para o Cap: grava fala → transcreve → chama onTranscript(text).
// Sem TTS — o Cap responde só por texto.
import { useState, useRef, useCallback, useEffect } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export function useVoiceChat({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const permGranted = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // ─── Eventos ──────────────────────────────────────────────────────────────
  useSpeechRecognitionEvent('result', (e) => {
    if (!e.isFinal) return;
    const transcript = e.results?.[0]?.transcript;
    if (transcript) {
      setListening(false);
      onTranscriptRef.current?.(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => setListening(false));

  useSpeechRecognitionEvent('error', (e) => {
    console.warn('[voice] error:', e.error, e.message);
    setListening(false);
  });

  // ─── Permissão ────────────────────────────────────────────────────────────
  const ensurePermission = useCallback(async () => {
    if (permGranted.current) return true;
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      permGranted.current = granted;
      return granted;
    } catch (e) {
      console.warn('[voice] permission error:', e.message);
      return false;
    }
  }, []);

  // ─── Start / Stop ─────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: false,
        maxAlternatives: 1,
        continuous: false,
      });
      setListening(true);
    } catch (e) {
      console.warn('[voice] start error:', e.message);
    }
  }, [ensurePermission]);

  const stopListening = useCallback(() => {
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
    setListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return { listening, toggleMic };
}
