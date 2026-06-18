// Histórico de ações do app — timeline alternado esquerda/direita.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, Pressable,
  StyleSheet, ActivityIndicator, RefreshControl, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { getActivityLog, clearActivityLog } from '../services/activityLog';

const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtTimestamp(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const day = d.getDate();
    const mon = SHORT_MONTHS[d.getMonth()];
    const todayStr = now.toDateString();
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === todayStr) return `Hoje, ${hh}:${mm}`;
    if (d.toDateString() === yest.toDateString()) return `Ontem, ${hh}:${mm}`;
    return `${day} ${mon}, ${hh}:${mm}`;
  } catch { return '—'; }
}

function ActorBadge({ actor }) {
  if (!actor || actor === 'user') return null;
  const isCap = actor === 'cap';
  const bg = isCap ? '#7C3AED20' : '#EC489920';
  const fg = isCap ? '#7C3AED' : '#EC4899';
  return (
    <View style={[styles.actorBadge, { backgroundColor: bg }]}>
      <Text style={[styles.actorText, { color: fg }]}>
        {isCap ? '⚡ Cap' : '👫 Casal'}
      </Text>
    </View>
  );
}

function EntryCard({ entry, align }) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.text + '0D', borderColor: colors.border + '55', borderLeftColor: entry.color },
      align === 'right' && styles.cardRight,
    ]}>
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{entry.title}</Text>
      {!!entry.detail && (
        <Text style={[styles.cardDetail, { color: colors.textSecondary }]} numberOfLines={2}>
          {entry.detail}
        </Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardTime, { color: colors.textMuted }]}>{fmtTimestamp(entry.timestamp)}</Text>
        <ActorBadge actor={entry.actor} />
      </View>
    </View>
  );
}

function TimelineItem({ entry, isLeft }) {
  const { colors } = useTheme();
  return (
    <View style={styles.itemRow}>
      {/* Lado esquerdo */}
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {isLeft && <EntryCard entry={entry} align="left" />}
      </View>

      {/* Centro: linha + dot */}
      <View style={styles.centerCol}>
        <View style={[styles.connector, { backgroundColor: colors.border + '50' }]} />
        <View style={[styles.dot, { backgroundColor: entry.color }]}>
          <Ionicons name={entry.icon} size={11} color="#fff" />
        </View>
        <View style={[styles.connector, { backgroundColor: colors.border + '50' }]} />
      </View>

      {/* Lado direito */}
      <View style={[styles.side, { alignItems: 'flex-start' }]}>
        {!isLeft && <EntryCard entry={entry} align="right" />}
      </View>
    </View>
  );
}

export default function ActivityLogScreen({ visible, onClose }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const sheetAnim = useRef(new Animated.Value(900)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await getActivityLog();
      setLog(entries);
    } catch (e) {
      console.warn('[ActivityLogScreen] erro ao carregar:', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      load();
      sheetAnim.setValue(900);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(sheetAnim, {
          toValue: 0, damping: 22, stiffness: 200, mass: 0.85, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetAnim, { toValue: 900, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const handleClear = () => {
    Alert.alert(
      'Limpar histórico',
      'Tem certeza? Isso apaga todo o registro de ações do app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo', style: 'destructive',
          onPress: async () => { await clearActivityLog(); setLog([]); },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      {/* Backdrop com fade sincronizado */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
      </Animated.View>

      {/* Container que empurra o sheet para o fundo */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border + '30',
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: sheetAnim }],
          },
        ]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border + '80' }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Histórico</Text>
            <View style={styles.headerActions}>
              {log.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 18 }}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border + '50' }]} />

          {/* Conteúdo */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} size="large" />
          ) : log.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.text + '08' }]}>
                <Ionicons name="time-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                Nenhuma ação registrada
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                As ações do app vão aparecer aqui conforme você usa o Controle+.
              </Text>
            </View>
          ) : (
            <FlatList
              data={log}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TimelineItem entry={item} isLeft={index % 2 === 0} />
              )}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              ListFooterComponent={<View style={{ height: 16 }} />}
              removeClippedSubviews
              maxToRenderPerBatch={20}
              windowSize={10}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    gap: 10,
  },
  titleAccent: { width: 4, height: 20, borderRadius: 2 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },

  divider: { height: 1 },

  emptyWrap: {
    alignItems: 'center', paddingTop: 56, paddingBottom: 32,
    paddingHorizontal: 36, gap: 10,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  scrollContent: { paddingTop: 12 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  side: { flex: 1, paddingHorizontal: 10 },
  centerCol: {
    width: 36,
    alignItems: 'center',
    zIndex: 2,
  },
  connector: { flex: 1, width: 2, minHeight: 12 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
  },

  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    padding: 9,
    marginVertical: 6,
  },
  cardRight: {},
  cardTitle: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  cardDetail: { fontSize: 11, marginTop: 3, lineHeight: 14 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 5, gap: 5,
  },
  cardTime: { flex: 1, fontSize: 10, fontWeight: '600' },

  actorBadge: {
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  actorText: { fontSize: 9.5, fontWeight: '700' },
});
