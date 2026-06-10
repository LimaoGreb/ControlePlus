// Insights automáticos: compara meses, projeta saldo e alerta vencimentos.
// Aparece entre o card de resumo e os gráficos — some quando não há nada relevante.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import { formatBRL } from '../utils/currency';
import { YEAR, MONTH_NAMES } from '../data/initialData';

function ensureMonth(m) {
  return {
    incomes: (m && m.incomes) || [],
    fixed: (m && m.fixed) || [],
    variable: (m && m.variable) || [],
    contributions: (m && m.contributions) || [],
  };
}

function buildInsights(monthIndex, month, data) {
  const insights = [];
  const now = new Date();
  const isThisYear = now.getFullYear() === YEAR;
  const isCurrentMonth = isThisYear && now.getMonth() === monthIndex;
  const currentDay = now.getDate();
  const totals = monthTotals(month);

  // 1. Renda não registrada
  if (totals.despesaTotal > 0 && totals.rendaTotal === 0) {
    insights.push({
      type: 'warning',
      icon: 'cash-outline',
      title: 'Renda não registrada',
      body: 'Você tem despesas lançadas mas ainda não registrou a renda deste mês.',
    });
  }

  // 2. Comparação com mês anterior
  if (monthIndex > 0) {
    const prev = ensureMonth(data.months && data.months[monthIndex - 1]);
    const prevTotals = monthTotals(prev);
    const prevName = MONTH_NAMES[monthIndex - 1];

    if (prevTotals.variableTotal > 50 && totals.variableTotal > 50) {
      const diff = (totals.variableTotal - prevTotals.variableTotal) / prevTotals.variableTotal;
      if (diff >= 0.2) {
        insights.push({
          type: 'warning',
          icon: 'trending-up-outline',
          title: `Variáveis +${Math.round(diff * 100)}% vs ${prevName}`,
          body: `${formatBRL(totals.variableTotal)} este mês contra ${formatBRL(prevTotals.variableTotal)} em ${prevName}.`,
        });
      } else if (diff <= -0.15) {
        insights.push({
          type: 'positive',
          icon: 'trending-down-outline',
          title: `Variáveis ${Math.round(Math.abs(diff) * 100)}% menores`,
          body: `Boa! Você gastou menos em variáveis do que em ${prevName}. Segue assim 💪`,
        });
      }
    }

    if (prevTotals.fixedTotal > 50 && totals.fixedTotal > prevTotals.fixedTotal * 1.15) {
      const diff = Math.round(((totals.fixedTotal - prevTotals.fixedTotal) / prevTotals.fixedTotal) * 100);
      insights.push({
        type: 'warning',
        icon: 'repeat-outline',
        title: `Fixos +${diff}% vs ${prevName}`,
        body: `Seus gastos fixos cresceram. Vale revisar se tem algo novo que ficou permanente.`,
      });
    }
  }

  // 3. Vencimentos nos próximos 3 dias (só no mês atual)
  if (isCurrentMonth) {
    const allItems = [...(month.fixed || []), ...(month.variable || [])];
    const upcoming = allItems
      .filter((it) => it.dueDay && !it.concluded)
      .map((it) => ({ ...it, daysLeft: it.dueDay - currentDay }))
      .filter((it) => it.daysLeft >= 0 && it.daysLeft <= 3)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    if (upcoming.length > 0) {
      const first = upcoming[0];
      const label =
        first.daysLeft === 0 ? 'vence HOJE' :
        first.daysLeft === 1 ? 'vence amanhã' :
        `vence em ${first.daysLeft} dias`;
      const extra = upcoming.length > 1 ? ` + ${upcoming.length - 1} outro(s) próximo(s)` : '';
      insights.push({
        type: 'urgent',
        icon: 'alarm-outline',
        title: `${first.name || 'Despesa'} ${label}`,
        body: `${formatBRL(first.value)}${extra} — não esquece de pagar! ⏰`,
      });
    }
  }

  // 5. Mês quase no limite (sem projeção — só pelo atual)
  if (totals.rendaTotal > 0 && totals.percentGasto >= 85 && totals.percentGasto < 100 && !isCurrentMonth) {
    insights.push({
      type: 'warning',
      icon: 'warning-outline',
      title: `${Math.round(totals.percentGasto)}% da renda comprometida`,
      body: 'Sobrou bem pouco esse mês. Vale revisar os variáveis para próximos meses.',
    });
  }

  return insights;
}

const TYPE_CONFIG = {
  urgent:   { color: '#FF4444' },
  danger:   { color: '#FF6B35' },
  warning:  { color: '#F5A623' },
  info:     { color: '#4A90D9' },
  positive: { color: '#27AE60' },
};

export default function InsightCards({ monthIndex, month }) {
  const { data } = useData();
  const { colors } = useTheme();

  const insights = useMemo(
    () => buildInsights(monthIndex, month, data || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthIndex, month, data]
  );

  if (!insights.length) return null;

  return (
    <View style={styles.wrapper}>
      {insights.map((ins, i) => {
        const cfg = TYPE_CONFIG[ins.type] || TYPE_CONFIG.info;
        return (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.bar, { backgroundColor: cfg.color }]} />
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Ionicons name={ins.icon} size={15} color={cfg.color} style={{ marginRight: 6 }} />
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{ins.title}</Text>
              </View>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>{ins.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10, gap: 6 },
  card: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar: { width: 3 },
  body: { flex: 1, paddingHorizontal: 10, paddingVertical: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  title: { fontSize: 12.5, fontWeight: '700', flex: 1 },
  desc: { fontSize: 11.5, lineHeight: 16 },
});
