// Aba Casal: despesas conjuntas sincronizadas com o/a parceiro(a).
// Navegação por meses, header com os dois nomes e indicador de atividade do parceiro.
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSync } from '../context/SyncContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { SharedMonthData } from '../context/SharedDataContext';
import MonthContent from '../components/MonthContent';
import { monthTotals } from '../utils/calculations';
import { formatBRL } from '../utils/currency';
import { MONTH_NAMES, YEAR } from '../data/initialData';

const CURRENT_MONTH = new Date().getMonth();

function timeAgo(ts) {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}

export default function CasalScreen({ navigation }) {
  const { colors } = useTheme();
  const { coupleCode, status, lastSync, partnerName, lastPartnerActivity, partnerPersonalData, sharePersonal } = useSync();
  const { userName } = useSettings();
  const { data: personalData } = useData();
  const [monthIndex, setMonthIndex] = useState(CURRENT_MONTH);
  const scrollRef = useRef(null);

  const goBack = useCallback(() => setMonthIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setMonthIndex((i) => Math.min(11, i + 1)), []);

  if (!coupleCode) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Ionicons name="heart-outline" size={56} color={colors.primary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Modo Casal</Text>
        <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
          Ative o Modo Casal nas Configurações para sincronizar despesas conjuntas com seu/sua parceiro(a).
        </Text>
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={[styles.emptyBtnText, { color: '#fff' }]}>Ir para Configurações</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const syncDotColor = status === 'synced' ? '#2BB673' : status === 'error' ? '#E5484D' : '#F5A524';
  const syncLabel =
    status === 'synced'
      ? lastSync
        ? new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'Sincronizado'
      : status === 'syncing'
      ? 'Sincronizando…'
      : status === 'error'
      ? 'Erro'
      : '—';

  const myName = (userName || 'Você').split(' ')[0];
  const theirName = (partnerName || 'Parceiro(a)').split(' ')[0];
  const partnerActivity = timeAgo(lastPartnerActivity);

  // renda combinada: soma as rendas pessoais de ambos no mês selecionado
  const myMonthTotals = monthTotals(personalData?.months?.[monthIndex] || {});
  const partnerMonthTotals = partnerPersonalData
    ? monthTotals(partnerPersonalData?.months?.[monthIndex] || {})
    : null;
  const showIncomeCard = myMonthTotals.rendaTotal > 0 || partnerMonthTotals?.rendaTotal > 0;
  const combinedIncome = myMonthTotals.rendaTotal + (partnerMonthTotals?.rendaTotal || 0);

  const isCurrentMonth = monthIndex === CURRENT_MONTH;

  const header = (
    <View style={styles.headerWrap}>
      {/* Linha superior: nomes + sync */}
      <View style={styles.topRow}>
        <View style={styles.namesRow}>
          <Ionicons name="heart" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.coupleNames, { color: colors.text }]}>
            {myName} & {theirName}
          </Text>
        </View>
        <View style={styles.syncBadge}>
          <View style={[styles.syncDot, { backgroundColor: syncDotColor }]} />
          <Text style={[styles.syncLabel, { color: colors.textMuted }]}>{syncLabel}</Text>
        </View>
      </View>

      {/* Indicador de atividade do parceiro */}
      {partnerActivity && (
        <View style={styles.activityRow}>
          <Ionicons name="radio-button-on" size={10} color={colors.primary} />
          <Text style={[styles.activityText, { color: colors.textMuted }]}>
            {theirName} atualizou {partnerActivity}
          </Text>
        </View>
      )}

      {/* Card de renda combinada */}
      {showIncomeCard && (
        <View style={[styles.incomeCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <Text style={[styles.incomeName, { color: colors.textMuted }]}>{myName}</Text>
              <Text style={[styles.incomeVal, { color: colors.text }]}>
                {formatBRL(myMonthTotals.rendaTotal)}
              </Text>
            </View>

            <View style={styles.incomeCenterBlock}>
              <Text style={[styles.incomeCenterLabel, { color: colors.textMuted }]}>renda do casal</Text>
              <Text style={[styles.incomeCenterVal, { color: colors.positive }]}>
                {formatBRL(combinedIncome)}
              </Text>
            </View>

            <View style={[styles.incomeItem, { alignItems: 'flex-end' }]}>
              <Text style={[styles.incomeName, { color: colors.textMuted }]}>{theirName}</Text>
              <Text style={[styles.incomeVal, { color: colors.text }]}>
                {partnerMonthTotals ? formatBRL(partnerMonthTotals.rendaTotal) : '—'}
              </Text>
            </View>
          </View>
          {!partnerPersonalData && sharePersonal && (
            <Text style={[styles.incomeHint, { color: colors.textMuted }]}>
              Aguardando renda do(a) {theirName}…
            </Text>
          )}
          {!sharePersonal && (
            <Text style={[styles.incomeHint, { color: colors.textMuted }]}>
              Ative "Compartilhar dados pessoais" nas configurações para somar as rendas.
            </Text>
          )}
        </View>
      )}

      {/* Navegação de meses */}
      <View style={[styles.monthNav, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={goBack}
          disabled={monthIndex === 0}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.navArrow}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={monthIndex === 0 ? colors.border : colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={[styles.monthName, { color: colors.text }]}>
            {MONTH_NAMES[monthIndex]}
            <Text style={[styles.monthYear, { color: colors.textMuted }]}> {YEAR}</Text>
          </Text>
          {isCurrentMonth && (
            <View style={[styles.currentBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.currentBadgeText, { color: colors.primary }]}>atual</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={goNext}
          disabled={monthIndex === 11}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.navArrow}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={monthIndex === 11 ? colors.border : colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SharedMonthData>
      <MonthContent
        monthIndex={monthIndex}
        scrollRef={scrollRef}
        header={header}
        hideIncome
      />
    </SharedMonthData>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '800' },

  headerWrap: { gap: 8, paddingBottom: 4 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  namesRow: { flexDirection: 'row', alignItems: 'center' },
  coupleNames: { fontSize: 17, fontWeight: '900' },

  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncLabel: { fontSize: 12, fontWeight: '600' },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -2 },
  activityText: { fontSize: 12 },

  incomeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  incomeRow: { flexDirection: 'row', alignItems: 'center' },
  incomeItem: { flex: 1, alignItems: 'flex-start', gap: 2 },
  incomeCenterBlock: { flex: 1.4, alignItems: 'center', gap: 2 },
  incomeCenterLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  incomeCenterVal: { fontSize: 20, fontWeight: '900' },
  incomeName: { fontSize: 11, fontWeight: '600' },
  incomeVal: { fontSize: 13, fontWeight: '700' },
  incomeHint: { fontSize: 11, textAlign: 'center' },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  navArrow: { paddingHorizontal: 8 },
  monthCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  monthName: { fontSize: 15, fontWeight: '800' },
  monthYear: { fontSize: 13, fontWeight: '500' },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  currentBadgeText: { fontSize: 11, fontWeight: '700' },
});
