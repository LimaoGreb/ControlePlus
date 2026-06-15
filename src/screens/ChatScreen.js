import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, Image, ImageBackground, Keyboard,
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

// ─── Sugestões rápidas ────────────────────────────────────────────────────────
const CHIPS = [
  { label: '📊 Resumo', text: 'como tá o mês?' },
  { label: '💸 Maiores', text: 'maiores gastos do mês' },
  { label: '📅 Semana', text: 'gastos essa semana' },
  { label: '🎯 Projetos', text: 'status dos projetos' },
  { label: '📈 Carteira', text: 'como estão meus investimentos' },
  { label: '📋 Análise', text: 'análise do ano' },
  { label: '💳 Cartão', text: 'quanto no cartão esse mês' },
];

// ─── Renderiza texto do bot com *bold* e _italic_ ────────────────────────────
function BotText({ text, colors }) {
  if (!text) return null;
  const parts = (text || '').split(/(\*[^*]+\*|_[^_]+_)/);
  const nodes = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      nodes.push(<Text key={i} style={styles.bold}>{p.slice(1, -1)}</Text>);
    } else if (p.startsWith('_') && p.endsWith('_') && p.length > 2) {
      nodes.push(<Text key={i} style={[styles.italic, { color: colors.textSecondary }]}>{p.slice(1, -1)}</Text>);
    } else {
      nodes.push(<Text key={i}>{p}</Text>);
    }
  }
  return (
    <Text style={[styles.msgText, { color: colors.text }]} selectable>
      {nodes}
    </Text>
  );
}

const CAP_AVATAR = require('../../assets/Gemini_Generated_Image_lebrn5lebrn5lebr.png');

function CapAvatarImg() {
  return (
    <View style={styles.avatarWrap}>
      <Image source={CAP_AVATAR} style={styles.avatarImg} resizeMode="cover" />
    </View>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
function MessageBubble({ msg, colors }) {
  const isUser = msg.from === 'user';
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && <CapAvatarImg />}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: colors.primary }]
          : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }],
      ]}>
        {isUser
          ? <Text style={styles.msgTextUser} selectable>{msg.text}</Text>
          : <BotText text={msg.text} colors={colors} />
        }
      </View>
    </View>
  );
}

// ─── Indicador "digitando…" ───────────────────────────────────────────────────
function TypingIndicator({ colors }) {
  return (
    <View style={styles.msgRow}>
      <CapAvatarImg />
      <View style={[styles.bubbleBot, styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    </View>
  );
}

// ─── Botão mic com pulso quando ouvindo ──────────────────────────────────────
function MicButton({ listening, onPress, colors }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (listening) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.35, duration: 550, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0,  duration: 550, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    pulse.setValue(1);
  }, [listening, pulse]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.micWrap}>
      <Animated.View
        style={[
          styles.micBtn,
          {
            backgroundColor: listening ? '#E53935' : colors.border,
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <Ionicons name={listening ? 'mic' : 'mic-outline'} size={20} color="#fff" />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Waveform estilo WhatsApp quando gravando áudio ──────────────────────────
function WaveformRecorder({ colors, onStop }) {
  const bars = useRef([
    new Animated.Value(0.3), new Animated.Value(0.7), new Animated.Value(0.5),
    new Animated.Value(0.9), new Animated.Value(0.4), new Animated.Value(0.6),
    new Animated.Value(0.25),
  ]).current;

  useEffect(() => {
    const loops = bars.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.0, duration: 280 + i * 55, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 280 + i * 55, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={[styles.waveformBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={[styles.recDot, { backgroundColor: '#E53935' }]} />
      <Text style={[styles.recLabel, { color: '#E53935' }]}>Gravando...</Text>
      <View style={styles.waveformBars}>
        {bars.map((anim, i) => (
          <Animated.View
            key={i}
            style={[styles.waveBar, { backgroundColor: '#E53935', transform: [{ scaleY: anim }] }]}
          />
        ))}
      </View>
      <TouchableOpacity onPress={onStop} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close-circle" size={28} color={colors.textMuted} />
      </TouchableOpacity>
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
  const listRef = useRef(null);
  const capInitRef = useRef(false);
  const capLenRef = useRef(0);
  // Histórico de conversa (máx 10 turnos) para o Cap manter contexto entre mensagens.
  const historyRef = useRef([]);

  // ─── Integração CapContext ─────────────────────────────────────────────────
  useEffect(() => {
    if (!capReady || capInitRef.current) return;
    capInitRef.current = true;
    capLenRef.current = capMsgs.length;
    const unread = capMsgs.filter(m => !m.read);
    if (unread.length > 0) {
      setMessages(prev => [...prev, ...unread.map(m => mkMsg('bot', m.text))]);
    }
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
    const newGreeting = `Oi ${firstName}! 👋 Conversa reiniciada. O que posso fazer por você?`;
    setMessages([mkMsg('bot', newGreeting)]);
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
          try {
            pendingOp.fn();
            botText = pendingOp.successText;
          } catch (e) {
            console.warn('[Cap chat] exec error:', e);
            botText = `⚠️ Ocorreu um erro: ${e.message || 'tenta de novo.'}`;
          }
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
          const contextData = { data, investments, projects, paymentMethods, userName };
          const dataOps    = { addItem, updateItem, removeItem };
          const settingsOps = { setUserName, setIsInvestor, setMakesContributions, addProjectFull, updateProject, removeProject, setContributionGoalPct };
          const result = await processMessage(text, contextData, dataOps, settingsOps, historyRef.current.slice(-10));
          botText = result.botText;
          if (result.pendingOp) setPendingOp(result.pendingOp);
        } catch (e) {
          console.warn('[Cap chat] processMessage error:', e);
          botText = 'Eita, deu um erro aqui. Tenta de novo!';
        }
      }

      // Mantém histórico para contexto (máx 10 entradas = 5 turnos)
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

  // ─── Voz (STT apenas) ─────────────────────────────────────────────────────
  const { listening, toggleMic } = useVoiceChat({
    onTranscript: useCallback((text) => send(text), [send]),
  });

  // ─── Esconde tab bar quando teclado aparece ────────────────────────────────
  const navigation = useNavigation();
  useEffect(() => {
    const parent = navigation.getParent();
    const show = Keyboard.addListener('keyboardDidShow', () => {
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      parent?.setOptions({ tabBarStyle: { display: 'flex' } });
    });
    return () => {
      show.remove();
      hide.remove();
      parent?.setOptions({ tabBarStyle: { display: 'flex' } });
    };
  }, [navigation]);

  const tabBarClearance = insets.bottom + 80;

  return (
    <KeyboardAvoidingView
      style={[styles.outer, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerAvatarWrap}>
          <Image source={CAP_AVATAR} style={styles.headerAvatarImg} resizeMode="cover" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Cap</Text>
          <Text style={[styles.headerSub, { color: listening ? '#E53935' : colors.textMuted }]}>
            {listening ? '🎤 Ouvindo...' : 'Assistente financeiro'}
          </Text>
        </View>
        {pendingOp && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.pendingTxt, { color: colors.primary }]}>Aguardando confirmação</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={clearConversation}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Lista de mensagens com fundo */}
      <ImageBackground source={CAP_BG} style={{ flex: 1 }} imageStyle={{ opacity: 0.07 }} resizeMode="cover">
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          inverted
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble msg={item} colors={colors} />}
          ListHeaderComponent={loading ? <TypingIndicator colors={colors} /> : null}
          contentContainerStyle={styles.list}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </ImageBackground>

      {/* Chips de sugestão — fixos acima do input */}
      {!listening && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={[styles.chipsWrap, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="always"
        >
          {CHIPS.map(chip => (
            <TouchableOpacity
              key={chip.label}
              onPress={() => send(chip.text)}
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipTxt, { color: colors.textSecondary }]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Waveform (gravando) ou barra de input normal */}
      {listening ? (
        <WaveformRecorder colors={colors} onStop={toggleMic} />
      ) : (
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: tabBarClearance }]}>
          <MicButton listening={false} onPress={toggleMic} colors={colors} />

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={pendingOp ? 'Digite sim ou não...' : 'Pergunte algo...'}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg || colors.background, borderColor: colors.border }]}
            multiline
            maxLength={300}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            onPress={() => send(inputText)}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.75}
            style={[styles.sendBtn, { backgroundColor: inputText.trim() && !loading ? colors.primary : colors.border }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerAvatarWrap: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  headerAvatarImg: { width: 38, height: 38 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '500' },
  pendingBadge: { marginLeft: 'auto', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pendingTxt: { fontSize: 10, fontWeight: '700' },

  list: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatarWrap: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: 30, height: 30 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleUser: { borderBottomRightRadius: 4 },
  msgText: { fontSize: 14.5, lineHeight: 22 },
  msgTextUser: { fontSize: 14.5, lineHeight: 22, color: '#fff' },
  bold: { fontWeight: '900' },
  italic: { fontStyle: 'italic' },

  chipsWrap: { flexShrink: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  chipTxt: { fontSize: 11, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 10,
    borderTopWidth: 1,
  },
  micWrap: { paddingBottom: 1 },
  micBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    marginBottom: 1,
  },

  waveformBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: 1,
  },
  recDot: { width: 10, height: 10, borderRadius: 5 },
  recLabel: { fontSize: 13, fontWeight: '700', minWidth: 80 },
  waveformBars: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36 },
  waveBar: { width: 4, height: 28, borderRadius: 2 },
});
