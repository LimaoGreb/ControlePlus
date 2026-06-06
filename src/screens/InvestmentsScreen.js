// Tela de Investimentos — carteira manual com rentabilidade e alocação.
import React, { useState, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { formatBRL, formatPercent } from '../utils/currency';
import { portfolioTotals, byGroup } from '../utils/investments';
import { isQuotable, fetchQuote } from '../services/quotes';
import InvestmentCard from '../components/InvestmentCard';

// Barra de alocação por classe, clicável (abre os itens daquela classe).
function AllocationBar({ entry, color }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const resultColor = entry.result > 0 ? colors.positive : entry.result < 0 ? colors.negative : colors.textSecondary;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.allocWrap}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle}>
        <View style={styles.allocHeader}>
          <Text style={[styles.allocLabel, { color: colors.text }]}>{entry.group}</Text>
          <View style={styles.allocRight}>
            <Text style={[styles.allocValue, { color }]}>{formatBRL(entry.current)}</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} style={{ marginLeft: 6 }} />
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
          <View style={[styles.fill, { width: `${Math.max(2, entry.percentOfCurrent)}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.allocPct, { color: colors.textSecondary }]}>
          {formatPercent(entry.percentOfCurrent)} da carteira
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={[styles.detailBox, { borderColor: colors.border }]}>
          {entry.items.map((it) => (
            <View key={it.id} style={styles.detailRow}>
              <Text style={[styles.detailName, { color: colors.text }]} numberOfLines={1}>
                {it.name || it.label}
                <Text style={{ color: colors.textMuted }}>  · {it.label}</Text>
              </Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary }]}>{formatBRL(it.current)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function InvestmentsScreen() {
  const { colors } = useTheme();
  const { investments, addInvestment, updateInvestment, removeInvestment } = useSettings();

  const totals = portfolioTotals(investments);
  const groups = byGroup(investments);
  const resultColor = totals.result > 0 ? colors.positive : totals.result < 0 ? colors.negative : colors.textSecondary;
  const sign = totals.result > 0 ? '+' : '';

  const groupColor = (g) =>
    g === 'Renda Fixa' ? colors.fixed : g === 'Renda Variável' ? colors.variable : colors.accent;

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const [updatingAll, setUpdatingAll] = useState(false);
  const hasQuotable = investments.some((i) => isQuotable(i.typeId) && i.ticker);

  const updateAllQuotes = async () => {
    setUpdatingAll(true);
    for (const inv of investments) {
      if (isQuotable(inv.typeId) && inv.ticker) {
        const p = await fetchQuote(inv.typeId, inv.ticker);
        const qty = Number(inv.quantity) || 0;
        if (p != null && qty > 0) updateInvestment(inv.id, 'current', Math.round(p * qty * 100) / 100);
      }
    }
    setUpdatingAll(false);
  };

  return (
    <ScrollView ref={scrollRef} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Investimentos</Text>

      {/* Resumo da carteira */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={[styles.sLabel, { color: colors.textSecondary }]}>Investido</Text>
            <Text style={[styles.sValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatBRL(totals.invested)}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.sLabel, { color: colors.textSecondary }]}>Valor atual</Text>
            <Text style={[styles.sValue, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatBRL(totals.current)}
            </Text>
          </View>
        </View>
        <View style={[styles.resultBanner, { backgroundColor: colors.alpha(resultColor, 0.12), borderColor: resultColor }]}>
          <Text style={[styles.rLabel, { color: colors.textSecondary }]}>Rentabilidade total</Text>
          <Text style={[styles.rValue, { color: resultColor }]}>
            {sign}{formatBRL(totals.result)}
          </Text>
          <Text style={[styles.rPct, { color: resultColor }]}>
            {sign}{formatPercent(totals.resultPct)}
          </Text>
        </View>
      </View>

      {/* Alocação por classe */}
      {groups.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Alocação da carteira</Text>
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 12 }]}>
            Toque numa classe para ver os ativos.
          </Text>
          {groups.map((g) => (
            <AllocationBar key={g.group} entry={g} color={groupColor(g.group)} />
          ))}
        </View>
      )}

      {/* Atualizar cotações (ações/FIIs/cripto com ticker) */}
      {hasQuotable && (
        <TouchableOpacity
          style={[styles.quoteAllBtn, { borderColor: colors.primary }]}
          onPress={updateAllQuotes}
          disabled={updatingAll}
        >
          {updatingAll ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          )}
          <Text style={[styles.quoteAllText, { color: colors.primary }]}>
            {updatingAll ? 'Atualizando...' : 'Atualizar cotações agora'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Lista de investimentos */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Meus ativos ({investments.length})
      </Text>

      {investments.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Nenhum investimento cadastrado. Toque em "+ Adicionar investimento" para começar.
        </Text>
      )}

      {investments.map((inv) => (
        <InvestmentCard
          key={inv.id}
          investment={inv}
          onChangeName={(t) => updateInvestment(inv.id, 'name', t)}
          onChangeType={(t) => updateInvestment(inv.id, 'typeId', t)}
          onChangeField={(field, v) => updateInvestment(inv.id, field, v)}
          onChangeInvested={(v) => updateInvestment(inv.id, 'invested', v)}
          onChangeCurrent={(v) => updateInvestment(inv.id, 'current', v)}
          onRemove={() => removeInvestment(inv.id)}
        />
      ))}

      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addInvestment}>
        <Ionicons name="add" size={24} color={contrastText(colors.primary)} />
        <Text style={[styles.addText, { color: contrastText(colors.primary) }]}>Adicionar investimento</Text>
      </TouchableOpacity>

      <Text style={[styles.note, { color: colors.textMuted }]}>
        💡 Para ações, FIIs e cripto: informe o ticker (PETR4, MXRF11, BTC…) e a
        quantidade, e toque em 🔄 para puxar o preço atual automaticamente. Renda
        fixa você atualiza o valor manualmente.
      </Text>

      <View style={{ height: 96 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 11 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryCol: { flex: 1, paddingRight: 8 },
  sLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sValue: { fontSize: 20, fontWeight: '800' },
  resultBanner: { borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  rLabel: { fontSize: 13, fontWeight: '600' },
  rValue: { fontSize: 26, fontWeight: '900', marginTop: 2 },
  rPct: { fontSize: 14, fontWeight: '700' },
  quoteAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  quoteAllText: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
  allocWrap: { marginBottom: 14 },
  allocHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  allocLabel: { fontSize: 15, fontWeight: '800' },
  allocRight: { flexDirection: 'row', alignItems: 'center' },
  allocValue: { fontSize: 16, fontWeight: '800' },
  track: { height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  allocPct: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  detailBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginLeft: 2 },
  empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addText: { fontSize: 16, fontWeight: '800', marginLeft: 4 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 16 },
});
