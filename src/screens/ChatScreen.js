import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Image, ImageBackground, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
function MessageBubble({ msg, colors }) {
  const isUser = msg.from === 'user';
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && <CapAvatarImg size={32} />}
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
    </View>
  );
}

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

// ─── Grid de sugestões (mostrado só na tela inicial) ──────────────────────────
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
const mkMsg = (from, text) => ({ id: String(_id++), from, text });

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
  const listRef = useRef(null);
  const capInitRef = useRef(false);
  const capLenRef = useRef(0);
  const historyRef = useRef([]);

  // Rastreia teclado para ajustar padding do input bar
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

  const push = useCallback((from, text) => {
    setMessages(prev => [...prev, mkMsg(from, text)]);
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([mkMsg('bot', `Oi ${firstName}! 👋 Conversa reiniciada. O que posso fazer por você?`)]);
    setPendingOp(null);
    setInputText('');
    historyRef.current = [];
  }, [firstName]);

  // ─── Envio de mensagem ─────────────────────────────────────────────────────
  const send = useCallback((rawText) => {
    const text = (rawText || '').trim();
    if (!text || loading) return;
    setInputText('');
    push('user', text);
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
      push('bot', botText);
      setLoading(false);
      scrollToEnd();
    }, 300);
  }, [loading, pendingOp, data, investments, projects, paymentMethods, userName,
      addItem, updateItem, removeItem, setUserName, setIsInvestor, setMakesContributions,
      addProjectFull, updateProject, removeProject, setContributionGoalPct, push, scrollToEnd]);

  // ─── Voz ──────────────────────────────────────────────────────────────────
  const { listening, toggleMic } = useVoiceChat({
    onTranscript: useCallback((text) => send(text), [send]),
  });

  // ─── Esconde tab bar com teclado ──────────────────────────────────────────
  const navigation = useNavigation();
  useEffect(() => {
    const parent = navigation.getParent();
    const show = Keyboard.addListener('keyboardDidShow', () => parent?.setOptions({ tabBarStyle: { display: 'none' } }));
    const hide = Keyboard.addListener('keyboardDidHide', () => parent?.setOptions({ tabBarStyle: { display: 'flex' } }));
    return () => {
      show.remove(); hide.remove();
      parent?.setOptions({ tabBarStyle: { display: 'flex' } });
    };
  }, [navigation]);

  const isWelcome = messages.length === 1;
  // Quando teclado visível, FloatingTabBar some — remove clearance dele do padding
  const inputPadBottom = keyboardVisible ? Math.max(insets.bottom, 8) : insets.bottom + 72;

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      {/* Fundo sutil aplicado em toda a tela, sem "box" separado */}
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
          {/* Avatar com online dot */}
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
              {listening ? '🎤 Ouvindo...' : pendingOp ? '⏳ Aguardando resposta' : '● Assistente financeiro'}
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
        </View>

        {/* ─── Mensagens ──────────────────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          inverted
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble msg={item} colors={colors} />}
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

        {/* ─── Barra de input ─────────────────────────────────────────────── */}
        <View style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: inputPadBottom,
          },
        ]}>
          <MicButton listening={listening} onPress={toggleMic} colors={colors} />

          <TextInput
            value={listening ? '' : inputText}
            onChangeText={setInputText}
            placeholder={
              listening ? '🎤 Ouvindo...'
              : pendingOp ? 'sim ou não...'
              : 'Pergunte algo...'
            }
            placeholderTextColor={listening ? '#E5393580' : colors.textMuted}
            style={[styles.input, {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.border,
            }]}
            editable={!listening}
            multiline
            maxLength={300}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            onPress={() => send(inputText)}
            disabled={!inputText.trim() || loading || listening}
            activeOpacity={0.8}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name="send"
              size={17}
              color="#fff"
              style={{ opacity: inputText.trim() && !loading && !listening ? 1 : 0.35 }}
            />
          </TouchableOpacity>
        </View>
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
  bubble: { maxWidth: '80%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: { borderWidth: 1, borderBottomLeftRadius: 5 },
  bubbleUser: { borderBottomRightRadius: 5 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { fontSize: 15, lineHeight: 22, color: '#fff' },
  bold: { fontWeight: '900' },
  italic: { fontStyle: 'italic' },

  // Typing dots
  typingDots: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  typingDot: { width: 9, height: 9, borderRadius: 5 },

  // Chips grid (estado inicial)
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
});
