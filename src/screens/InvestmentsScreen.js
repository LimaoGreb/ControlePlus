// Tela de Investimentos — carteira manual com rentabilidade e alocação.
import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { formatBRL, formatPercent } from '../utils/currency';
import { portfolioTotals, byGroup } from '../utils/investments';
import { isQuotable, fetchQuote, fetchCurrencies } from '../services/quotes';
import { fetchIndicadores } from '../services/bacen';
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
          <Text style={[styles.allocLabel, { color: colors.textSecondary }]}>{entry.group}</Text>
          <View style={styles.allocRight}>
            <Text style={[styles.allocValue, { color }]}>{formatBRL(entry.current)}</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} style={{ marginLeft: 6 }} />
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
        <View style={[styles.detailBox, { borderTopColor: colors.border + '40' }]}>
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
  const [refreshing, setRefreshing] = useState(false);
  const [currencies, setCurrencies] = useState({ usd: null, eur: null, gbp: null, btc: null, ars: null });
  const [indicadores, setIndicadores] = useState({ selic: null, ipca: null, igpm: null });
  const hasQuotable = investments.some((i) => isQuotable(i.typeId) && i.ticker);

  useEffect(() => {
    fetchCurrencies().then(setCurrencies);
    fetchIndicadores().then(setIndicadores);
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      updateAllQuotes(),
      fetchCurrencies().then(setCurrencies),
      fetchIndicadores().then(setIndicadores),
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <Text style={[styles.title, { color: colors.text }]}>Investimentos</Text>

      {/* Câmbio */}
      <View style={[styles.card, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80', padding: 14 }]}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>Câmbio</Text>
        <View style={styles.marketGrid}>
          {[
            { flag: '🇺🇸', label: 'Dólar',   val: currencies.usd },
            { flag: '🇪🇺', label: 'Euro',    val: currencies.eur },
            { flag: '🇬🇧', label: 'Libra',   val: currencies.gbp },
            { flag: '₿',   label: 'Bitcoin', val: currencies.btc },
            { flag: '🇦🇷', label: 'Peso AR', val: currencies.ars },
          ].map((item) => (
            <View key={item.label} style={[styles.marketChip, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
              <Text style={styles.marketFlag}>{item.flag}</Text>
              <Text style={[styles.marketLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.marketValue, { color: colors.text }]}>
                {item.val != null ? (item.val < 0.01 ? `R$ ${item.val.toFixed(4)}` : formatBRL(item.val)) : '—'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Indicadores Econômicos — BACEN */}
      <View style={[styles.card, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80', padding: 14 }]}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>Indicadores (BACEN)</Text>
        <View style={styles.indicGrid}>
          {[
            { label: 'SELIC / CDI', val: indicadores.selic, suffix: '% a.a.', color: colors.positive },
            { label: 'IPCA 12m',    val: indicadores.ipca,  suffix: '%',       color: colors.negative },
            { label: 'IGP-M 12m',   val: indicadores.igpm,  suffix: '%',       color: colors.variable },
          ].map((ind) => (
            <View key={ind.label} style={[styles.indicChip, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
              <Text style={[styles.indicLabel, { color: colors.textSecondary }]}>{ind.label}</Text>
              <Text style={[styles.indicValue, { color: ind.color }]}>
                {ind.val != null ? `${ind.val.toFixed(2)}${ind.suffix}` : '—'}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>
          Fonte: Banco Central do Brasil · atualizado no pull-to-refresh
        </Text>
      </View>

      {/* Resumo da carteira — só mostra quando há investimentos */}
      {investments.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
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
      )}

      {/* Alocação por classe */}
      {groups.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
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
        <View style={[styles.onboardCard, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
          <Text style={styles.onboardEmoji}>💼</Text>
          <Text style={[styles.onboardTitle, { color: colors.text }]}>Você já está investindo?</Text>
          <Text style={[styles.onboardSub, { color: colors.textSecondary }]}>
            Se você já tem aplicações, cadastre cada uma para acompanhar a rentabilidade. Se está começando agora, adicione seu primeiro aporte!
          </Text>
          <View style={styles.onboardBtns}>
            <TouchableOpacity
              style={[styles.onboardBtn, { backgroundColor: colors.primary }]}
              onPress={addInvestment}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.onboardBtnTxt}>Sim, já invisto!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.onboardBtn, { backgroundColor: colors.cardAlt, borderWidth: 1.5, borderColor: colors.border }]}
              onPress={addInvestment}
              activeOpacity={0.8}
            >
              <Ionicons name="rocket-outline" size={18} color={colors.primary} />
              <Text style={[styles.onboardBtnTxt, { color: colors.primary }]}>Quero começar agora</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 11 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryCol: { flex: 1, paddingRight: 8 },
  sLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sValue: { fontSize: 20, fontWeight: '800' },
  resultBanner: { borderRadius: 14, padding: 14, alignItems: 'center' },
  rLabel: { fontSize: 13, fontWeight: '600' },
  rValue: { fontSize: 26, fontWeight: '900', marginTop: 2 },
  rPct: { fontSize: 14, fontWeight: '700' },
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  marketChip: { width: '47%', flexGrow: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10, alignItems: 'flex-start' },
  marketFlag: { fontSize: 20, marginBottom: 2 },
  marketLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  marketValue: { fontSize: 15, fontWeight: '800' },
  indicGrid: { flexDirection: 'row', gap: 8 },
  indicChip: { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10, alignItems: 'center' },
  indicLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  indicValue: { fontSize: 15, fontWeight: '900' },
  quoteAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  quoteAllText: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
  allocWrap: { marginBottom: 4 },
  allocHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingRight: 16,
  },
  allocLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4, flex: 1 },
  allocRight: { flexDirection: 'row', alignItems: 'center' },
  allocValue: { fontSize: 15, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  allocPct: { fontSize: 10.5, fontWeight: '600', marginTop: 4, marginBottom: 4 },
  detailBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6, marginTop: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  detailName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12, marginLeft: 2, color: undefined },
  empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  onboardCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 24, marginBottom: 14, alignItems: 'center' },
  onboardEmoji: { fontSize: 48, marginBottom: 12 },
  onboardTitle: { fontSize: 19, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  onboardSub: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  onboardBtns: { width: '100%', gap: 10 },
  onboardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, gap: 8 },
  onboardBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addText: { fontSize: 16, fontWeight: '800', marginLeft: 4 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 16 },
});
