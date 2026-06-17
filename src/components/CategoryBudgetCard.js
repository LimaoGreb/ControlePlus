// Card de orçamento por categoria — mostra gasto vs limite por categoria no mês.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { formatBRL } from '../utils/currency';

function barColor(pct, colors) {
  if (pct >= 1)    return colors.negative;
  if (pct >= 0.8)  return colors.warning;
  return colors.positive;
}

// Calcula quanto foi gasto por categoria no mês
export function calcCategoryTotals(month) {
  const items = [
    ...(month?.fixed || []),
    ...(month?.variable || []),
  ].filter(i => !i.isInstallmentRef && i.category);
  const totals = {};
  for (const item of items) {
    totals[item.category] = (totals[item.category] || 0) + (Number(item.value) || 0);
  }
  return totals;
}

export default function CategoryBudgetCard({ month, monthIndex, onNavigateToBudget }) {
  const { colors } = useTheme();
  const { categoryBudgets } = useSettings();

  const budgetEntries = Object.entries(categoryBudgets).filter(([, limit]) => limit > 0);
  if (budgetEntries.length === 0) return null;

  const totals = calcCategoryTotals(month);

  // Notifica quando categoria estoura ou chega em 80%
  useEffect(() => {
    budgetEntries.forEach(async ([catId, limit]) => {
      const spent = totals[catId] || 0;
      const pct = limit > 0 ? spent / limit : 0;
      const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
      if (!cat) return;
      try {
        if (pct >= 1) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🚨 Limite estourado: ${cat.name}`,
              body: `Você gastou ${formatBRL(spent)} de ${formatBRL(limit)} neste mês.`,
              color: '#E5484D',
            },
            trigger: null,
          });
        } else if (pct >= 0.8) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚠️ Atenção: ${cat.name}`,
              body: `${Math.round(pct * 100)}% do orçamento usado (${formatBRL(spent)} de ${formatBRL(limit)}).`,
              color: '#F5A524',
            },
            trigger: null,
          });
        }
      } catch {}
    });
  }, [JSON.stringify(totals)]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Orçamento por Categoria</Text>
        </View>
        <TouchableOpacity onPress={onNavigateToBudget} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {budgetEntries.map(([catId, limit]) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
        if (!cat) return null;
        const spent = totals[catId] || 0;
        const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
        const color = barColor(pct, colors);
        const fillFlex = Math.max(0.02, pct);

        return (
          <View key={catId} style={styles.row}>
            <View style={[styles.iconBadge, { backgroundColor: cat.color + '22' }]}>
              <Ionicons name={cat.icon} size={14} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowHeader}>
                <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                <Text style={[styles.catValues, { color: pct >= 1 ? colors.negative : colors.textMuted }]}>
                  {formatBRL(spent)} <Text style={{ color: colors.textMuted }}>/ {formatBRL(limit)}</Text>
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View style={[styles.fill, { flex: fillFlex, backgroundColor: color }]} />
                <View style={{ flex: 1 - fillFlex }} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconBadge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { fontSize: 13, fontWeight: '700' },
  catValues: { fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  fill: { borderRadius: 3 },
});
