// Gráficos do Resumo Anual: barras (renda x despesa) clicáveis e linha (sobra)
// rolável e clicável. Os toques selecionam um mês para ver o detalhe.
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../theme/ThemeContext';
import { formatCompact } from '../utils/currency';
import { MONTH_SHORT } from '../data/initialData';

function useChartConfig() {
  const { colors } = useTheme();
  return {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (o = 1) => colors.alpha(colors.primary, o),
    labelColor: (o = 1) =>
      colors.mode === 'dark' ? `rgba(181,181,181,${o})` : `rgba(74,85,104,${o})`,
    propsForDots: { r: '5' },
    propsForBackgroundLines: { stroke: colors.border },
  };
}

function Legend({ color, label }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// Barras agrupadas (renda x despesa) por mês — cada mês é tocável.
export function AnnualBars({ perMonth, selectedIndex, onSelect }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...perMonth.map((m) => Math.max(m.renda, m.despesa)));
  const H = 120;

  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={colors.income} label="Renda" />
        <Legend color={colors.negative} label="Despesa" />
      </View>
      <View style={styles.barsArea}>
        {perMonth.map((m) => {
          const selected = selectedIndex === m.index;
          return (
            <TouchableOpacity
              key={m.index}
              style={[
                styles.barGroup,
                selected && { backgroundColor: colors.alpha(colors.primary, 0.15), borderRadius: 6 },
              ]}
              activeOpacity={0.6}
              onPress={() => onSelect && onSelect(selected ? null : m.index)}
            >
              <View style={[styles.barTrack, { height: H }]}>
                <View style={styles.barCol}>
                  {m.renda > 0 && <Text style={[styles.barVal, { color: colors.income }]}>{formatCompact(m.renda)}</Text>}
                  <View style={[styles.bar, { height: Math.max(2, (m.renda / max) * (H - 16)), backgroundColor: colors.income }]} />
                </View>
                <View style={styles.barCol}>
                  {m.despesa > 0 && <Text style={[styles.barVal, { color: colors.negative }]}>{formatCompact(m.despesa)}</Text>}
                  <View style={[styles.bar, { height: Math.max(2, (m.despesa / max) * (H - 16)), backgroundColor: colors.negative }]} />
                </View>
              </View>
              <Text style={[styles.barLabel, { color: selected ? colors.primary : colors.textMuted, fontWeight: selected ? '800' : '400' }]}>
                {MONTH_SHORT[m.index]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.tip, { color: colors.textMuted }]}>Toque num mês para ver os detalhes</Text>
    </View>
  );
}

// Linha da sobra — rolável horizontalmente (sem vazar) e clicável nos pontos.
export function SobraLine({ perMonth, onSelectPoint }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const config = useChartConfig();
  const values = perMonth.map((m) => Number(m.sobra.toFixed(2)));
  // Largura confortável: pelo menos a do card, mas com folga p/ rolar e "ver de perto".
  const chartWidth = Math.max(width - 56, perMonth.length * 56);

  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={colors.primary} label="Sobra do mês" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingRight: 8 }}>
        <LineChart
          data={{
            labels: MONTH_SHORT,
            datasets: [{ data: values, color: (o = 1) => colors.alpha(colors.primary, o), strokeWidth: 3 }],
          }}
          width={chartWidth}
          height={210}
          chartConfig={config}
          bezier
          fromZero
          segments={4}
          formatYLabel={(y) => formatCompact(Number(y))}
          style={styles.line}
          onDataPointClick={({ index }) => onSelectPoint && onSelectPoint(index)}
        />
      </ScrollView>
      <Text style={[styles.tip, { color: colors.textMuted }]}>
        Arraste para o lado para ver de perto · toque num ponto para o detalhe
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 13, fontWeight: '600' },
  barsArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barGroup: { alignItems: 'center', flex: 1, paddingVertical: 2 },
  barTrack: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 1 },
  bar: { width: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barVal: { fontSize: 7, fontWeight: '700', marginBottom: 2 },
  barLabel: { fontSize: 9, marginTop: 4, paddingHorizontal: 3 },
  line: { borderRadius: 12, marginVertical: 4, paddingRight: 16 },
  tip: { fontSize: 11, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});
