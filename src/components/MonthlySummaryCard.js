// Cards de resumo no topo do mês: Sobra e Despesa Total como contraponto visual.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL, formatPercent } from '../utils/currency';
import ProgressBar from './ProgressBar';

export default function MonthlySummaryCard({ totals }) {
  const { colors } = useTheme();
  const negative = totals.sobraTotal < 0;
  const sobraColor = negative ? colors.negative : colors.positive;

  return (
    <View style={styles.card}>
      {totals.contributionsTotal > 0 && (
        <View style={[styles.contribRow, { borderTopColor: colors.border + '40' }]}>
          <Text style={[styles.contribLabel, { color: colors.textSecondary }]}>Contribuições</Text>
          <Text style={[styles.contribValue, { color: colors.primary }]}>
            {formatBRL(totals.contributionsTotal)}
          </Text>
        </View>
      )}

      <View style={styles.sobraRow}>
        {/* Sobra do Mês — acento à esquerda */}
        <View style={[styles.sobraBox, { borderLeftColor: sobraColor, backgroundColor: sobraColor + '12' }]}>
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

        {/* Despesa Total — contraponto à direita */}
        <View style={styles.despesaCol}>
          <View style={styles.labelRow}>
            <View style={[styles.labelDot, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.despesaLabel, { color: colors.textSecondary }]}>DESPESA TOTAL</Text>
          </View>
          <Text style={[styles.despesaValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatBRL(totals.despesaTotal)}
          </Text>
        </View>
      </View>

      <ProgressBar percent={totals.percentGasto} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 20, paddingVertical: 4 },

  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginBottom: 12,
  },
  contribLabel: { fontSize: 13, fontWeight: '600' },
  contribValue: { fontSize: 15, fontWeight: '800' },

  sobraRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },

  sobraBox: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 13,
    paddingRight: 12,
    paddingVertical: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  sobraLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  sobraValue: { fontSize: 34, fontWeight: '900' },
  sobraPercent: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  despesaCol: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 16, minWidth: 110 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  labelDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  despesaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  despesaValue: { fontSize: 22, fontWeight: '900', textAlign: 'right' },
});
