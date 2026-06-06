// Detalhamento por forma de pagamento: barras clicáveis que expandem (leque)
// mostrando tudo que foi pago com aquela forma (PIX, Crédito Next, etc.).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { expensesByPayment } from '../utils/calculations';
import { formatBRL, formatPercent } from '../utils/currency';

function PaymentBar({ entry, color }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const sorted = [...(entry.items || [])]
    .filter((i) => (Number(i.value) || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{entry.name}</Text>
          <View style={styles.right}>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {formatBRL(entry.value)} · {formatPercent(entry.percent)}
            </Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} style={{ marginLeft: 6 }} />
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
          <View style={[styles.fill, { width: `${Math.max(3, entry.percent)}%`, backgroundColor: color }]} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[styles.detailBox, { borderColor: colors.border }]}>
          {sorted.map((it) => {
            const pctOfMethod = entry.value > 0 ? (it.value / entry.value) * 100 : 0;
            return (
              <View key={it.id} style={styles.detailRow}>
                <Text style={[styles.detailName, { color: colors.text }]} numberOfLines={1}>
                  {it.name || 'Sem nome'}
                  <Text style={{ color: colors.textMuted }}>  · {it.categoria}</Text>
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  {formatBRL(it.value)} · {formatPercent(pctOfMethod)}
                </Text>
              </View>
            );
          })}
          <Text style={[styles.detailHint, { color: colors.textMuted }]}>
            Tudo que foi pago com {entry.name}.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function PaymentBreakdown({ month }) {
  const { colors } = useTheme();
  const { list, total } = expensesByPayment(month);

  if (!list || list.length === 0) {
    return (
      <Text style={[styles.placeholder, { color: colors.textMuted }]}>
        Cadastre formas de pagamento nas Configurações e marque-as nas despesas
        para ver este gráfico.
      </Text>
    );
  }

  return (
    <View>
      <Text style={[styles.tapHint, { color: colors.textMuted }]}>
        Toque numa forma de pagamento para ver os gastos
      </Text>
      {list.map((entry, idx) => (
        <PaymentBar key={entry.name} entry={entry} color={colors.chart[idx % colors.chart.length]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { textAlign: 'center', paddingVertical: 20, fontSize: 13, lineHeight: 19 },
  tapHint: { fontSize: 11, marginBottom: 12 },
  wrap: { marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  right: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 13, fontWeight: '700' },
  track: { height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  detailBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  detailHint: { fontSize: 11, fontStyle: 'italic', marginTop: 4 },
});
