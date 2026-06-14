import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { processMessage } from '../services/jarvisLocal';

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

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
function MessageBubble({ msg, colors }) {
  const isUser = msg.from === 'user';
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarTxt}>C</Text>
        </View>
      )}
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
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarTxt}>C</Text>
      </View>
      <View style={[styles.bubbleBot, styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
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

  const greeting = `Oi ${(userName || 'você').split(' ')[0]}! 👋 Sou o *Cap*.\nMe pergunte qualquer coisa sobre seus dados — ou mande um comando direto.`;

  const [messages, setMessages] = useState([mkMsg('bot', greeting)]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingOp, setPendingOp] = useState(null);
  const listRef = useRef(null);

  const push = useCallback((from, text) => {
    setMessages(prev => [...prev, mkMsg(from, text)]);
  }, []);

  const scrollToEnd = useCallback(() => {
    // Aguarda o frame para garantir que o item foi adicionado ao layout.
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback((rawText) => {
    const text = (rawText || '').trim();
    if (!text || loading) return;
    setInputText('');
    push('user', text);
    setLoading(true);
    scrollToEnd();

    const lower = text.toLowerCase();
    const isYes = /^(sim|ok|pode|isso|certo|confirma|s|yes|vai lá)$/i.test(lower);
    const isNo  = /^(n[aã]o|nao|não|cancela|cancelar|para|não|n)$/i.test(lower);

    setTimeout(() => {
      if (pendingOp) {
        if (isYes) {
          try {
            pendingOp.fn();
            push('bot', pendingOp.successText);
          } catch (e) {
            console.warn('[Cap chat] exec error:', e);
            push('bot', `⚠️ Ocorreu um erro: ${e.message || 'tenta de novo.'}`);
          }
        } else if (isNo) {
          push('bot', 'OK, cancelado! 😊');
        } else {
          push('bot', 'Responde *sim* para confirmar ou *não* para cancelar. 😊');
          setLoading(false);
          scrollToEnd();
          return;
        }
        setPendingOp(null);
        setLoading(false);
        scrollToEnd();
        return;
      }

      try {
        const contextData = { data, investments, projects, paymentMethods, userName };
        const dataOps    = { addItem, updateItem, removeItem };
        const settingsOps = { setUserName, setIsInvestor, setMakesContributions, addProjectFull, updateProject, removeProject, setContributionGoalPct };
        const result = processMessage(text, contextData, dataOps, settingsOps);
        push('bot', result.botText);
        if (result.pendingOp) setPendingOp(result.pendingOp);
      } catch (e) {
        console.warn('[Cap chat] processMessage error:', e);
        push('bot', 'Ocorreu um erro inesperado. Tenta de novo!');
      }

      setLoading(false);
      scrollToEnd();
    }, 350); // pequena pausa para o indicador de "digitando" aparecer
  }, [loading, pendingOp, data, investments, projects, paymentMethods, userName,
      addItem, updateItem, removeItem, setUserName, setIsInvestor, setMakesContributions,
      addProjectFull, updateProject, removeProject, setContributionGoalPct, push, scrollToEnd]);

  // A FloatingTabBar é position:absolute, então reservamos espaço no fundo.
  const tabBarClearance = insets.bottom + 80;

  return (
    <KeyboardAvoidingView
      style={[styles.outer, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header interno — aparece abaixo do cabeçalho do navigator */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerAvatarTxt}>C</Text>
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Cap</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Assistente financeiro</Text>
        </View>
        {pendingOp && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.pendingTxt, { color: colors.primary }]}>Aguardando confirmação</Text>
          </View>
        )}
      </View>

      {/* Lista de mensagens */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble msg={item} colors={colors} />}
        contentContainerStyle={[styles.list, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      />

      {/* "Digitando…" */}
      {loading && <TypingIndicator colors={colors} />}

      {/* Chips de sugestão */}
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

      {/* Barra de input — fica ACIMA da FloatingTabBar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: tabBarClearance }]}>
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
  headerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerAvatarTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '500' },
  pendingBadge: { marginLeft: 'auto', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pendingTxt: { fontSize: 10, fontWeight: '700' },

  list: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleUser: { borderBottomRightRadius: 4 },
  msgText: { fontSize: 14.5, lineHeight: 22 },
  msgTextUser: { fontSize: 14.5, lineHeight: 22, color: '#fff' },
  bold: { fontWeight: '900' },
  italic: { fontStyle: 'italic' },

  chipsWrap: { flexShrink: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0,
  },
  chipTxt: { fontSize: 12.5, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1,
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
});
