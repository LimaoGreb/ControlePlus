// Cards de resumo no topo do mês: Renda, Despesa, Sobra e Percentual.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL, formatPercent } from '../utils/currency';
import ProgressBar from './ProgressBar';

function Stat({ label, value, color, big }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          big && styles.statValueBig,
          { color: color || colors.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

export default function MonthlySummaryCard({ totals }) {
  const { colors } = useTheme();
  const negative = totals.sobraTotal < 0;
  const sobraColor = negative ? colors.negative : colors.positive;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Stat label="Renda Total" value={formatBRL(totals.rendaTotal)} color={colors.income} />
        <Stat label="Despesa Total" value={formatBRL(totals.despesaTotal)} color={colors.text} />
      </View>

      {totals.contributionsTotal > 0 && (
        <View style={[styles.contribRow, { borderColor: colors.border }]}>
          <Text style={[styles.contribLabel, { color: colors.textSecondary }]}>Contribuições</Text>
          <Text style={[styles.contribValue, { color: colors.primary }]}>
            {formatBRL(totals.contributionsTotal)}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.sobraBox,
          {
            backgroundColor: negative ? 'rgba(255,82,82,0.12)' : 'rgba(46,204,143,0.12)',
            borderColor: sobraColor,
          },
        ]}
      >
        <Text style={[styles.sobraLabel, { color: colors.textSecondary }]}>
          {negative ? 'Saldo Negativo' : 'Sobra do Mês'}
        </Text>
        <Text style={[styles.sobraValue, { color: sobraColor }]}>
          {formatBRL(totals.sobraTotal)}
        </Text>
        <Text style={[styles.sobraPercent, { color: sobraColor }]}>
          {negative
            ? `Gastou ${formatPercent(totals.percentGasto)} da renda`
            : `Sobrou ${formatPercent(totals.percentSobra)} da renda`}
        </Text>
      </View>

      <ProgressBar percent={totals.percentGasto} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 12,
  },
  contribLabel: { fontSize: 14, fontWeight: '600' },
  contribValue: { fontSize: 16, fontWeight: '800' },
  stat: { flex: 1, paddingRight: 8 },
  statLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statValueBig: { fontSize: 22 },
  sobraBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  sobraLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  sobraValue: { fontSize: 30, fontWeight: '900' },
  sobraPercent: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
