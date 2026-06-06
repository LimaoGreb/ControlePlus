// Resumo Anual — consolida os 12 meses + gráficos interativos.
import React, { useState, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { annualTotals } from '../utils/calculations';
import { formatBRL, formatPercent } from '../utils/currency';
import { YEAR, MONTH_NAMES } from '../data/initialData';
import { AnnualBars, SobraLine } from '../components/Charts';

function StatCard({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color || colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// Detalhe do mês selecionado (aparece ao tocar num gráfico).
function MonthDetail({ data }) {
  const { colors } = useTheme();
  if (!data) return null;
  const pctGasto = data.renda > 0 ? (data.despesa / data.renda) * 100 : 0;
  const sobraColor = data.sobra < 0 ? colors.negative : colors.positive;
  return (
    <View style={[styles.detail, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
      <Text style={[styles.detailTitle, { color: colors.text }]}>
        {MONTH_NAMES[data.index]} {YEAR}
      </Text>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Renda</Text>
        <Text style={[styles.detailVal, { color: colors.income }]}>{formatBRL(data.renda)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Despesa</Text>
        <Text style={[styles.detailVal, { color: colors.negative }]}>{formatBRL(data.despesa)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sobra</Text>
        <Text style={[styles.detailVal, { color: sobraColor }]}>
          {formatBRL(data.sobra)} {data.renda > 0 ? `· gastou ${formatPercent(pctGasto)}` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function AnnualSummaryScreen() {
  const { colors } = useTheme();
  const { data } = useData();
  const totals = annualTotals(data.months);
  const sobraColor = totals.sobraTotal < 0 ? colors.negative : colors.positive;

  const [selected, setSelected] = useState(null);
  const selectedData = selected != null ? totals.perMonth[selected] : null;
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  return (
    <ScrollView ref={scrollRef} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Resumo de {YEAR}</Text>

      <View style={styles.grid}>
        <StatCard label="Renda Total do Ano" value={formatBRL(totals.rendaTotal)} color={colors.income} />
        <StatCard label="Despesa Total do Ano" value={formatBRL(totals.despesaTotal)} color={colors.negative} />
        <StatCard label="Gastos Fixos do Ano" value={formatBRL(totals.fixedTotal)} color={colors.fixed} />
        <StatCard label="Gastos Variáveis do Ano" value={formatBRL(totals.variableTotal)} color={colors.variable} />
        {totals.contributionsTotal > 0 && (
          <StatCard label="Contribuições do Ano" value={formatBRL(totals.contributionsTotal)} color={colors.primary} />
        )}
      </View>

      <View
        style={[
          styles.sobraCard,
          {
            backgroundColor: totals.sobraTotal < 0 ? colors.alpha(colors.negative, 0.12) : colors.alpha(colors.positive, 0.12),
            borderColor: sobraColor,
          },
        ]}
      >
        <Text style={[styles.sobraLabel, { color: colors.textSecondary }]}>Sobra Total do Ano</Text>
        <Text style={[styles.sobraValue, { color: sobraColor }]}>{formatBRL(totals.sobraTotal)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Renda x Despesa por mês</Text>
        <AnnualBars perMonth={totals.perMonth} selectedIndex={selected} onSelect={setSelected} />
        <MonthDetail data={selectedData} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Evolução da Sobra</Text>
        <SobraLine perMonth={totals.perMonth} onSelectPoint={setSelected} />
        <MonthDetail data={selectedData} />
      </View>

      <View style={{ height: 96 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48.5%', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },
  sobraCard: { borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center', marginBottom: 14, marginTop: 4 },
  sobraLabel: { fontSize: 13, fontWeight: '600' },
  sobraValue: { fontSize: 30, fontWeight: '900', marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  chartTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  detail: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  detailTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailVal: { fontSize: 14, fontWeight: '800' },
});
