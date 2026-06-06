// Barra de progresso mostrando o % da renda já gasto.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatPercent } from '../utils/currency';

export default function ProgressBar({ percent }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const over = percent > 100;

  // Cor: verde (tranquilo) -> amarelo (atenção) -> vermelho (estourou).
  let barColor = colors.positive;
  if (percent >= 100) barColor = colors.negative;
  else if (percent >= 80) barColor = colors.warning;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Gasto da renda
        </Text>
        <Text style={[styles.value, { color: barColor }]}>
          {formatPercent(percent)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      {over && (
        <Text style={[styles.over, { color: colors.negative }]}>
          Você gastou mais do que ganhou neste mês!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 4 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '800' },
  track: { height: 12, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  over: { marginTop: 6, fontSize: 12, fontWeight: '700' },
});
