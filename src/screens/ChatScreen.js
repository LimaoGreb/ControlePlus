import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Image, ImageBackground, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { useTheme } from '../theme/ThemeContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useCapMessages } from '../context/CapContext';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { processMessage } from '../services/jarvisLocal';

const CAP_BG = require('../../assets/imagem de fundo do cap.png');
const CAP_AVATAR = require('../../assets/Gemini_Generated_Image_lebrn5lebrn5lebr.png');

const CHIPS = [
  { label: '📊 Resumo do mês', text: 'como tá o mês?' },
  { label: '💸 Maiores gastos', text: 'maiores gastos do mês' },
  { label: '📅 Essa semana', text: 'gastos essa semana' },
  { label: '🎯 Projetos', text: 'status dos projetos' },
  { label: '📈 Investimentos', text: 'como estão meus investimentos' },
  { label: '📋 Análise anual', text: 'análise do ano' },
  { label: '💳 Cartão', text: 'quanto no cartão esse mês' },
];

// Preset fixo de alturas para waveform decorativo (bolha de áudio enviada)
const WAVE_PRESET = [0.3,0.75,0.5,0.9,0.4,0.8,0.55,0.3,0.7,0.5,0.9,0.4,0.8,0.6,0.3,0.7,0.45,0.85,0.6,0.9,0.3,0.75,0.5,0.4];

function fmtSecs(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function estimateDuration(text) {
  const secs = Math.max(2, Math.round((text || '').split(' ').length / 2.5));
  return fmtSecs(secs);
}

function cleanForSpeech(text) {
  return (text || '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[^\w\sçãõáéíóúàâêîôûäëïöüñ.,!?;:\-\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Renderiza texto do bot com *bold* e _italic_ ────────────────────────────
function BotText({ text, colors }) {
  if (!text) return null;
  const parts = (text || '').split(/(\*[^*]+\*|_[^_]+_)/);
  const nodes = parts.map((p, i) => {
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
      return <Text key={i} style={styles.bold}>{p.slice(1, -1)}</Text>;
    if (p.startsWith('_') && p.endsWith('_') && p.length > 2)
      return <Text key={i} style={[styles.italic, { color: colors.textSecondary }]}>{p.slice(1, -1)}</Text>;
    return <Text key={i}>{p}</Text>;
  });
  return <Text style={[styles.msgText, { color: colors.text }]} selectable>{nodes}</Text>;
}

function CapAvatarImg({ size = 32 }) {
  return (
    <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={CAP_AVATAR} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

// Waveform estático decorativo para bolha de áudio enviado
function StaticWaveform({ color, count = 22 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {WAVE_PRESET.slice(0, count).map((h, i) => (
        <View key={i} style={{
          width: 3, height: Math.round(22 * h), borderRadius: 2,
          backgroundColor: color, opacity: 0.85,
        }} />
      ))}
    </View>
  );
}

// Waveform animado para a barra de gravação
function LiveWaveformBars({ color, count = 20 }) {
  const anims = useRef(
    Array.from({ length: count }, (_, i) => new Animated.Value(0.2 + (i % 4) * 0.05))
  ).current;

  useEffect(() => {
    const all = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 38),
          Animated.timing(a, {
            toValue: 0.45 + (i % 3) * 0.25,
            duration: 290 + (i % 4) * 110,
            useNativeDriver: true,
          }),
          Animated.timing(a, {
            toValue: 0.15 + (i % 2) * 0.1,
            duration: 290 + (i % 3) * 110,
            useNativeDriver: true,
          }),
        ])
      )
    );
    all.forEach(a => a.start());
    return () => all.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{
          width: 3, height: 26, borderRadius: 2,
          backgroundColor: color,
          transform: [{ scaleY: a }],
        }} />
      ))}
    </View>
  );
}

// ─── Barra de gravação estilo WhatsApp ────────────────────────────────────────
function RecordingBar({ secs, onCancel, onSend, colors, paddingBottom }) {
  return (
    <View style={[
      styles.recordingBar,
      { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom },
    ]}>
      <TouchableOpacity
        onPress={onCancel}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.recordActionBtn, { backgroundColor: '#E5393522' }]}
      >
        <Ionicons name="trash-outline" size={20} color="#E53935" />
      </TouchableOpacity>

      <View style={styles.recordCenter}>
        <View style={styles.recordDot} />
        <Text style={[styles.recordTimer, { color: colors.text }]}>{fmtSecs(secs)}</Text>
        <LiveWaveformBars color={colors.primary} count={20} />
      </View>

      <TouchableOpacity
        onPress={onSend}
        style={[styles.recordActionBtn, { backgroundColor: '#2BB673' }]}
      >
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({ msg, colors, speakingId, onReplay }) {
  const isUser = msg.from === 'user';

  // Bolha de áudio (usuário mandou por voz)
  if (isUser && msg.isVoice) {
    return (
      <View style={[styles.msgRow, styles.msgRowUser]}>
        <View style={{ maxWidth: '82%' }}>
          <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: colors.primary }]}>
            <View style={styles.audioBubbleRow}>
              <TouchableOpacity
                onPress={() => onReplay(msg.text, msg.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={speakingId === msg.id ? 'pause-circle' : 'play-circle'}
                  size={30}
                  color="#fff"
                />
              </TouchableOpacity>
              <StaticWaveform color="rgba(255,255,255,0.7)" count={18} />
              <Text style={styles.audioDuration}>{msg.duration || '0:05'}</Text>
            </View>
          </View>
          <Text style={[styles.audioTranscript, { color: colors.textMuted }]}>
            🔤 {msg.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && <CapAvatarImg size={32} />}
      <View style={{ maxWidth: '80%' }}>
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}>
          {isUser
            ? <Text style={styles.msgTextUser} selectable>{msg.text}</Text>
            : <BotText text={msg.text} colors={colors} />}
        </View>
        {!isUser && msg.isVoiceResponse && (
          <TouchableOpacity
            onPress={() => onReplay(msg.text, msg.id)}
            style={[styles.replayBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={speakingId === msg.id ? 'volume-high' : 'volume-medium-outline'}
              size={13}
              color={speakingId === msg.id ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.replayTxt, {
              color: speakingId === msg.id ? colors.primary : colors.textMuted,
            }]}>
              {speakingId === msg.id ? 'Falando...' : 'Ouvir resposta'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ─── 3 dots animados estilo iMessage ─────────────────────────────────────────
function TypingIndicator({ colors }) {
  const dotsRef = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.2),
    new Animated.Value(0.2),
  ]).current;

  useEffect(() => {
    const anims = dotsRef.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 350, useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.msgRow}>
      <CapAvatarImg size={32} />
      <View style={[styles.bubble, styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.typingDots}>
          {dotsRef.map((dot, i) => (
            <Animated.View key={i} style={[styles.typingDot, { backgroundColor: colors.primary, opacity: dot }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Mic com pulso quando ouvindo ─────────────────────────────────────────────
function MicButton({ listening, onPress, colors }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (listening) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 650, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0, duration: 650, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    pulse.setValue(1);
  }, [listening, pulse]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[
        styles.iconBtn,
        {
          backgroundColor: listening ? '#E53935' : colors.primary + '28',
          transform: [{ scale: pulse }],
        },
      ]}>
        <Ionicons
          name={listening ? 'mic' : 'mic-outline'}
          size={20}
          color={listening ? '#fff' : colors.primary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Grid de sugestões ────────────────────────────────────────────────────────
function ChipSuggestions({ onSend, colors }) {
  return (
    <View style={styles.chipGrid}>
      <Text style={[styles.chipLabel, { color: colors.textMuted }]}>Pergunte algo rápido</Text>
      <View style={styles.chipRow}>
        {CHIPS.map(chip => (
          <TouchableOpacity
            key={chip.label}
            onPress={() => onSend(chip.text)}
            style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipTxt, { color: colors.textSecondary }]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

let _id = 0;
const mkMsg = (from, text, opts = {}) => ({
  id: String(_id++),
  from,
  text,
  isVoice: opts.isVoice || false,
  isVoiceResponse: opts.isVoiceResponse || false,
  duration: opts.duration || null,
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, addItem, updateItem, removeItem } = useData();
  const {
    userName, investments, projects, paymentMethods,
    setUserName, setIsInvestor, setMakesContributions,
    addProjectFull, updateProject, removeProject, setContributionGoalPct,
  } = useSettings();
  const { messages: capMsgs, markAllRead, ready: capReady } = useCapMessages();

  const firstName = (userName || 'você').split(' ')[0];
  const greeting = `Oi ${firstName}! 👋 Sou o *Cap*.\nMe pergunte qualquer coisa — ou toque no 🎤 para falar!`;

  const [messages, setMessages] = useState([mkMsg('bot', greeting)]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingOp, setPendingOp] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [speakingId, setSpeakingId] = useState(null);

  const listRef = useRef(null);
  const capInitRef = useRef(false);
  const capLenRef = useRef(0);
  const historyRef = useRef([]);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup TTS ao desmontar
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try { Speech.stop(); } catch {}
    };
  }, []);

  // Rastreia teclado
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ─── Integração CapContext ─────────────────────────────────────────────────
  useEffect(() => {
    if (!capReady || capInitRef.current) return;
    capInitRef.current = true;
    capLenRef.current = capMsgs.length;
    const unread = capMsgs.filter(m => !m.read);
    if (unread.length > 0)
      setMessages(prev => [...prev, ...unread.map(m => mkMsg('bot', m.text))]);
    markAllRead();
  }, [capReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!capReady || !capInitRef.current) return;
    if (capMsgs.length <= capLenRef.current) return;
    const newMsgs = capMsgs.slice(capLenRef.current);
    capLenRef.current = capMsgs.length;
    setMessages(prev => [...prev, ...newMsgs.map(m => mkMsg('bot', m.text))]);
    markAllRead();
  }, [capMsgs.length, capReady, markAllRead]);

  const push = useCallback((from, text, opts = {}) => {
    setMessages(prev => [...prev, mkMsg(from, text, opts)]);
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([mkMsg('bot', `Oi ${firstName}! 👋 Conversa reiniciada. O que posso fazer por você?`)]);
    setPendingOp(null);
    setInputText('');
    historyRef.current = [];
    try { Speech.stop(); } catch {}
    if (mountedRef.current) setSpeakingId(null);
  }, [firstName]);

  // ─── TTS ──────────────────────────────────────────────────────────────────
  const speakResponse = useCallback((text, msgId) => {
    try {
      if (mountedRef.current) setSpeakingId(msgId);
      Speech.speak(cleanForSpeech(text), {
        language: 'pt-BR',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => { if (mountedRef.current) setSpeakingId(null); },
        onError: () => { if (mountedRef.current) setSpeakingId(null); },
      });
    } catch (e) {
      console.warn('[TTS] speak error:', e?.message);
      if (mountedRef.current) setSpeakingId(null);
    }
  }, []);

  const replaySpeech = useCallback(async (text, msgId) => {
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        Speech.stop();
        // Se era a mesma mensagem, apenas para (toggle)
        if (speakingId === msgId) {
          if (mountedRef.current) setSpeakingId(null);
          return;
        }
      }
      if (mountedRef.current) setSpeakingId(msgId);
      Speech.speak(cleanForSpeech(text), {
        language: 'pt-BR',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => { if (mountedRef.current) setSpeakingId(null); },
        onError: () => { if (mountedRef.current) setSpeakingId(null); },
      });
    } catch (e) {
      console.warn('[TTS] replay error:', e?.message);
      if (mountedRef.current) setSpeakingId(null);
    }
  }, [speakingId]);

  // ─── Envio de mensagem ─────────────────────────────────────────────────────
  const send = useCallback((rawText, isVoice = false) => {
    const text = (rawText || '').trim();
    if (!text || loading) return;
    setInputText('');
    const duration = isVoice ? estimateDuration(text) : null;
    push('user', text, { isVoice, duration });
    setLoading(true);
    scrollToEnd();

    const isYes = /^(sim|ok|pode|isso|certo|confirma|s|yes|vai lá)$/i.test(text);
    const isNo  = /^(n[aã]o|nao|não|cancela|cancelar|para|n)$/i.test(text);

    setTimeout(async () => {
      let botText = '';
      if (pendingOp) {
        if (isYes) {
          try { pendingOp.fn(); botText = pendingOp.successText; }
          catch (e) { botText = `⚠️ Ocorreu um erro: ${e.message || 'tenta de novo.'}`; }
        } else if (isNo) {
          botText = 'OK, cancelado! 😊';
        } else {
          push('bot', 'Responde *sim* para confirmar ou *não* para cancelar. 😊');
          setLoading(false);
          scrollToEnd();
          return;
        }
        setPendingOp(null);
      } else {
        try {
          const result = await processMessage(
            text,
            { data, investments, projects, paymentMethods, userName },
            { addItem, updateItem, removeItem },
            { setUserName, setIsInvestor, setMakesContributions, addProjectFull, updateProject, removeProject, setContributionGoalPct },
            historyRef.current.slice(-10)
          );
          botText = result.botText;
          if (result.pendingOp) setPendingOp(result.pendingOp);
        } catch (e) {
          console.warn('[Cap] erro:', e);
          botText = 'Eita, deu um erro aqui. Tenta de novo!';
        }
      }
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text },
        { role: 'bot', text: botText },
      ].slice(-10);

      // Captura o ID da próxima mensagem antes de criá-la
      const nextBotId = String(_id);
      push('bot', botText, { isVoiceResponse: isVoice });
      setLoading(false);
      scrollToEnd();

      if (isVoice) {
        setTimeout(() => speakResponse(botText, nextBotId), 400);
      }
    }, 300);
  }, [loading, pendingOp, data, investments, projects, paymentMethods, userName,
      addItem, updateItem, removeItem, setUserName, setIsInvestor, setMakesContributions,
      addProjectFull, updateProject, removeProject, setContributionGoalPct,
      push, scrollToEnd, speakResponse]);

  // ─── Voz ──────────────────────────────────────────────────────────────────
  const { listening, toggleMic } = useVoiceChat({
    onTranscript: useCallback((text) => {
      if (cancelledRef.current) {
        cancelledRef.current = false;
        return;
      }
      send(text, true);
    }, [send]),
  });

  // Timer de gravação
  useEffect(() => {
    if (!listening) { setRecordSecs(0); return; }
    const interval = setInterval(() => setRecordSecs(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [listening]);

  // Para TTS ao iniciar gravação
  useEffect(() => {
    if (listening) {
      try { Speech.stop(); } catch {}
      if (mountedRef.current) setSpeakingId(null);
    }
  }, [listening]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    toggleMic();
  }, [toggleMic]);

  const navigation = useNavigation();
  const isWelcome = messages.length === 1;
  const inputPadBottom = keyboardVisible ? Math.max(insets.bottom, 8) : insets.bottom + 12;

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <ImageBackground
        source={CAP_BG}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.05 }}
        resizeMode="cover"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            <View style={styles.headerAvatarWrap}>
              <Image source={CAP_AVATAR} style={styles.headerAvatarImg} resizeMode="cover" />
            </View>
            <View style={[
              styles.onlineDot,
              { backgroundColor: listening ? '#E53935' : '#2BB673', borderColor: colors.card },
            ]} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Cap</Text>
            <Text style={[styles.headerSub, { color: listening ? '#E53935' : colors.primary }]}>
              {listening ? '🎤 Gravando...' : pendingOp ? '⏳ Aguardando resposta' : '● Assistente financeiro'}
            </Text>
          </View>

          {pendingOp && (
            <View style={[styles.pendingBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.pendingTxt, { color: colors.primary }]}>confirmar?</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={clearConversation}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.clearBtn, { backgroundColor: colors.cardAlt || colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.clearBtn, { backgroundColor: colors.cardAlt || colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ─── Mensagens ──────────────────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          inverted
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              colors={colors}
              speakingId={speakingId}
              onReplay={replaySpeech}
            />
          )}
          ListHeaderComponent={
            loading
              ? <TypingIndicator colors={colors} />
              : isWelcome
                ? <ChipSuggestions onSend={send} colors={colors} />
                : null
          }
          contentContainerStyle={styles.list}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* ─── Barra de gravação ou input normal ──────────────────────────── */}
        {listening ? (
          <RecordingBar
            secs={recordSecs}
            onCancel={cancelRecording}
            onSend={toggleMic}
            colors={colors}
            paddingBottom={inputPadBottom}
          />
        ) : (
          <View style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: inputPadBottom,
            },
          ]}>
            <MicButton listening={false} onPress={toggleMic} colors={colors} />

            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={pendingOp ? 'sim ou não...' : 'Pergunte algo...'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.border,
              }]}
              multiline
              maxLength={300}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              onPress={() => send(inputText)}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons
                name="send"
                size={17}
                color="#fff"
                style={{ opacity: inputText.trim() && !loading ? 1 : 0.35 }}
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: { width: 44, height: 44 },
  headerAvatarWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  headerAvatarImg: { width: 44, height: 44 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  pendingBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pendingTxt: { fontSize: 10, fontWeight: '700' },
  clearBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  // Lista
  list: { paddingHorizontal: 14, paddingVertical: 14, gap: 2 },

  // Mensagens
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatarWrap: { overflow: 'hidden', flexShrink: 0 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: { borderWidth: 1, borderBottomLeftRadius: 5 },
  bubbleUser: { borderBottomRightRadius: 5 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { fontSize: 15, lineHeight: 22, color: '#fff' },
  bold: { fontWeight: '900' },
  italic: { fontStyle: 'italic' },

  // Typing dots
  typingDots: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  typingDot: { width: 9, height: 9, borderRadius: 5 },

  // Chips grid
  chipGrid: { paddingVertical: 10, paddingHorizontal: 4, marginBottom: 10 },
  chipLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10, paddingHorizontal: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipTxt: { fontSize: 13, fontWeight: '600' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 15,
    maxHeight: 110,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },

  // Recording bar
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  recordActionBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  recordCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  recordDot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#E53935',
  },
  recordTimer: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 34,
    fontVariant: ['tabular-nums'],
  },

  // Audio bubble (usuário mandou por voz)
  audioBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  audioTranscript: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 2,
  },

  // Botão "Ouvir resposta" no Cap
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  replayTxt: {
    fontSize: 11,
    fontWeight: '600',
  },
});
