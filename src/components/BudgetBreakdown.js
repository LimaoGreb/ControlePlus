// Terceiro gráfico do carrossel — orçamento por categoria do mês
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { formatBRL } from '../utils/currency';

function barColor(pct, colors) {
  if (pct === 0)  return colors.border;
  if (pct >= 1)   return colors.negative;
  if (pct >= 0.8) return '#F59E0B';
  return colors.positive;
}

export default function BudgetBreakdown({ month }) {
  const { colors } = useTheme();
  const { categoryBudgets } = useSettings();
  const navigation = useNavigation();

  const budgetEntries = Object.entries(categoryBudgets || {}).filter(([, l]) => l > 0);

  const monthIncome = (month?.incomes || []).reduce((s, i) => s + (Number(i.value) || 0), 0);

  const items = [...(month?.fixed || []), ...(month?.variable || [])].filter(i => i.category);
  const spent = {};
  for (const item of items) {
    spent[item.category] = (spent[item.category] || 0) + (Number(item.value) || 0);
  }

  const totalExp = (month?.fixed || []).concat(month?.variable || []).reduce((s, i) => s + (Number(i.value) || 0), 0);
  const freeToSpend = monthIncome - totalExp;

  if (budgetEntries.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem limites definidos</Text>
        <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
          Configure limites por categoria para acompanhar seus gastos
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('SettingsBudget')}
          style={[styles.emptyBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
          <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
          <Text style={[styles.emptyBtnTxt, { color: colors.primary }]}>Definir limites</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Resumo topo */}
      <View style={[styles.summary, { backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.freeLabel, { color: colors.textMuted }]}>Livre pra gastar</Text>
          <Text style={[styles.freeVal, { color: freeToSpend >= 0 ? colors.positive : colors.negative }]}>
            {freeToSpend >= 0 ? formatBRL(freeToSpend) : `−${formatBRL(-freeToSpend)}`}
          </Text>
        </View>
        <Text style={[styles.incomeInfo, { color: colors.textMuted }]}>
          de {formatBRL(monthIncome)} de renda
        </Text>
      </View>

      {/* Barras por categoria */}
      {budgetEntries.map(([catId, limit]) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
        if (!cat) return null;
        const spentAmt  = spent[catId] || 0;
        const pct       = limit > 0 ? spentAmt / limit : 0;
        const color     = barColor(pct, colors);
        const remaining = limit - spentAmt;
        const isOver    = remaining < 0;
        const salPct    = monthIncome > 0 ? (spentAmt / monthIncome * 100).toFixed(0) : 0;

        return (
          <View key={catId} style={styles.row}>
            <View style={[styles.badge, { backgroundColor: cat.color + '22' }]}>
              <Ionicons name={cat.icon} size={13} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                <Text style={[styles.amounts, { color: isOver ? colors.negative : colors.textSecondary }]}>
                  {formatBRL(spentAmt)}
                  <Text style={{ color: colors.textMuted, fontWeight: '500' }}> / {formatBRL(limit)}</Text>
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View style={[styles.fill, { flex: Math.min(pct, 1), backgroundColor: color }]} />
                <View style={{ flex: Math.max(0.001, 1 - pct) }} />
              </View>
              <Text style={[styles.sub, { color: isOver ? colors.negative : colors.textMuted }]}>
                {isOver
                  ? `Estourado ${formatBRL(-remaining)}`
                  : spentAmt === 0
                    ? `Limite: ${formatBRL(limit)}/mês`
                    : `Restam ${formatBRL(remaining)} · ${salPct}% da renda`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { paddingVertical: 4 },
  summary:     { borderRadius: 10, padding: 10, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  freeLabel:   { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  freeVal:     { fontSize: 18, fontWeight: '900' },
  incomeInfo:  { fontSize: 11, fontWeight: '600' },
  row:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  badge:       { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  rowTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  catName:     { fontSize: 12, fontWeight: '800' },
  amounts:     { fontSize: 11, fontWeight: '700' },
  track:       { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', marginBottom: 3 },
  fill:        { borderRadius: 3 },
  sub:         { fontSize: 10, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTitle:  { fontSize: 14, fontWeight: '800' },
  emptyDesc:   { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  emptyBtnTxt: { fontSize: 13, fontWeight: '700' },
});
