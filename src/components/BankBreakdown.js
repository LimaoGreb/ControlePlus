// Gráfico de gastos por banco/cartão com barra de limite de crédito.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { getBankById } from '../data/banks';
import { formatBRL } from '../utils/currency';

export default function BankBreakdown({ month }) {
  const { colors } = useTheme();
  const { paymentMethods } = useSettings();

  const fixed = month?.fixed || [];
  const variable = month?.variable || [];
  const all = [...fixed, ...variable];

  // Agrupa gastos por forma de pagamento
  const totals = {};
  for (const item of all) {
    if (!item.payment) continue;
    if (!totals[item.payment]) totals[item.payment] = 0;
    totals[item.payment] += item.value || 0;
  }

  // Monta entradas com dados do paymentMethod
  const entries = Object.entries(totals)
    .map(([pmName, spent]) => {
      const pm = paymentMethods.find(p => p.name === pmName);
      const bank = pm?.bank ? getBankById(pm.bank) : null;
      return {
        pmName,
        spent,
        bank,
        isCredit: pm?.isCredit || false,
        creditLimit: pm?.creditLimit || null,
        color: bank?.color || colors.primary,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Nenhuma despesa com forma de pagamento definida.
        </Text>
      </View>
    );
  }

  const maxSpent = Math.max(...entries.map(e => e.spent), 1);

  return (
    <View style={styles.container}>
      {entries.map((entry) => {
        const barPct = entry.spent / maxSpent;
        const limitPct = entry.creditLimit ? Math.min(1, entry.spent / entry.creditLimit) : null;
        const nearLimit = limitPct !== null && limitPct >= 0.8;
        const overLimit = limitPct !== null && limitPct >= 1;
        const alertColor = overLimit ? '#FF3B30' : nearLimit ? '#FF9500' : entry.color;

        return (
          <View key={entry.pmName} style={styles.row}>
            {/* Linha: nome + valor */}
            <View style={styles.labelRow}>
              <View style={[styles.colorDot, { backgroundColor: entry.color }]} />
              <Text style={[styles.pmName, { color: colors.text }]} numberOfLines={1}>{entry.pmName}</Text>
              {entry.bank && (
                <Text style={[styles.bankBadge, { color: entry.color }]}>{entry.bank.name}</Text>
              )}
              <Text style={[styles.amount, { color: colors.text }]}>{formatBRL(entry.spent)}</Text>
            </View>

            {/* Barra de gasto relativo */}
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${Math.round(barPct * 100)}%`, backgroundColor: entry.color }]} />
            </View>

            {/* Barra de limite (crédito) */}
            {entry.creditLimit > 0 && (
              <View style={styles.limitRow}>
                <View style={[styles.limitTrack, { backgroundColor: colors.border }]}>
                  <View style={[
                    styles.limitFill,
                    { width: `${Math.round(Math.min(limitPct, 1) * 100)}%`, backgroundColor: alertColor }
                  ]} />
                </View>
                <Text style={[styles.limitLabel, { color: alertColor }]}>
                  {overLimit ? '⚠️ Acima do limite' : nearLimit ? `⚠️ ${Math.round(limitPct * 100)}% do limite` : `${Math.round(limitPct * 100)}% · limite ${formatBRL(entry.creditLimit)}`}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 4 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  row: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  pmName: { flex: 1, fontSize: 13, fontWeight: '700' },
  bankBadge: { fontSize: 11, fontWeight: '600', marginRight: 8 },
  amount: { fontSize: 13, fontWeight: '800' },

  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  limitRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  limitFill: { height: 4, borderRadius: 2 },
  limitLabel: { fontSize: 10, fontWeight: '700' },
});
