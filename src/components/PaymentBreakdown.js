// Detalhamento por forma de pagamento: barras clicáveis que expandem (leque)
// mostrando tudo que foi pago com aquela forma (PIX, Crédito Next, etc.).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { expensesByPayment } from '../utils/calculations';
import { formatBRL, formatPercent } from '../utils/currency';
import { getBankForPayment } from '../data/banks';
import BankBadge from './BankBadge';

function PaymentBar({ entry, color, bank }) {
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
          <View style={styles.nameRow}>
            <View style={styles.badgeSlot}>
              {bank && <BankBadge bank={bank} size={20} />}
            </View>
            <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>{entry.name}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.value, { color }]}>{formatBRL(entry.value)}</Text>
            <Text style={[styles.pct, { color: colors.textMuted }]}> {formatPercent(entry.percent)}</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} style={{ marginLeft: 6 }} />
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
          <View style={[styles.fill, { width: `${Math.max(3, entry.percent)}%`, backgroundColor: color }]} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[styles.detailBox, { borderTopColor: colors.border + '40' }]}>
          {sorted.map((it, itmIdx) => {
            const pctOfMethod = entry.value > 0 ? (it.value / entry.value) * 100 : 0;
            return (
              <View
                key={it.id}
                style={[
                  styles.detailRow,
                  itmIdx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '40' },
                ]}
              >
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
  const { paymentMethods } = useSettings();
  const { list } = expensesByPayment(month);

  const pmByName = {};
  (paymentMethods || []).forEach((pm) => { pmByName[pm.name] = pm; });

  if (!list || list.length === 0) {
    return (
      <Text style={[styles.placeholder, { color: colors.textMuted }]}>
        Cadastre formas de pagamento nas Configurações e marque-as nas despesas
        para ver este gráfico.
      </Text>
    );
  }

  return (
    <View style={styles.outer}>
      {list.map((entry, idx) => {
        const pm = pmByName[entry.name];
        const bank = getBankForPayment(pm);
        return (
          <PaymentBar key={entry.name} entry={entry} color={bank?.color || colors.chart[idx % colors.chart.length]} bank={bank} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  placeholder: { textAlign: 'center', paddingVertical: 20, paddingHorizontal: 16, fontSize: 13, lineHeight: 19 },
  wrap: { marginBottom: 4 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingRight: 0,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  badgeSlot: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  name: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 15, fontWeight: '800' },
  pct: { fontSize: 11, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  detailBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6, marginTop: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  detailName: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  detailValue: { fontSize: 12, fontWeight: '600' },
  detailHint: { fontSize: 10.5, fontStyle: 'italic', marginTop: 4 },
});
