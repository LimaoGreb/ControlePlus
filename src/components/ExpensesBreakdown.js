// Detalhamento de despesas: duas barras (Fixas e Variáveis) clicáveis que
// expandem (estilo leque/cortina) mostrando o detalhamento de cada item.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import { formatBRL, formatPercent } from '../utils/currency';
import { getCategoryInsight, getMonthInsight } from '../utils/insights';

// Uma categoria (Fixas ou Variáveis) que abre e mostra seus itens.
function CategoryBar({ label, icon, color, items, total, grandTotal }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const pctOfTotal = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
  const hasItems = items && items.some((i) => (Number(i.value) || 0) > 0);

  const sorted = [...(items || [])]
    .filter((i) => (Number(i.value) || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.catWrap}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} disabled={!hasItems}>
        <View style={styles.catHeader}>
          <View style={styles.catLeft}>
            <View style={[styles.catIcon, { backgroundColor: colors.alpha(color, 0.18) }]}>
              <Ionicons name={icon} size={16} color={color} />
            </View>
            <Text style={[styles.catLabel, { color: colors.text }]}>{label}</Text>
          </View>
          <View style={styles.catRight}>
            <Text style={[styles.catValue, { color }]}>{formatBRL(total)}</Text>
            {hasItems && (
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
        </View>

        {/* Barra de proporção em relação ao total de despesas */}
        <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
          <View style={[styles.fill, { width: `${Math.max(2, pctOfTotal)}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.catPct, { color: colors.textSecondary }]}>
          {formatPercent(pctOfTotal)} do total de despesas
        </Text>
      </TouchableOpacity>

      {/* Detalhamento dos itens (leque) */}
      {open && (
        <View style={[styles.detailBox, { borderColor: colors.border }]}>
          {(() => {
            const msg = getCategoryInsight(sorted);
            return msg ? (
              <View style={[styles.insight, { backgroundColor: colors.alpha(color, 0.12) }]}>
                <Text style={[styles.insightText, { color: colors.text }]}>{msg}</Text>
              </View>
            ) : null;
          })()}
          {sorted.map((it) => {
            const pctOfCat = total > 0 ? (it.value / total) * 100 : 0;
            return (
              <View key={it.id} style={styles.detailRow}>
                <View style={styles.detailTop}>
                  <Text style={[styles.detailName, { color: colors.text }]} numberOfLines={1}>
                    {it.name || 'Sem nome'}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                    {formatBRL(it.value)} · {formatPercent(pctOfCat)}
                  </Text>
                </View>
                <View style={[styles.detailTrack, { backgroundColor: colors.cardAlt }]}>
                  <View
                    style={[styles.detailFill, { width: `${Math.max(3, pctOfCat)}%`, backgroundColor: color }]}
                  />
                </View>
              </View>
            );
          })}
          <Text style={[styles.detailHint, { color: colors.textMuted }]}>
            Percentuais relativos ao total de {label.toLowerCase()}.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ExpensesBreakdown({ month }) {
  const { colors } = useTheme();
  const totals = monthTotals(month);

  if (totals.despesaTotal <= 0) {
    return (
      <Text style={[styles.placeholder, { color: colors.textMuted }]}>
        Sem despesas ainda. Adicione despesas fixas ou variáveis para ver o detalhamento.
      </Text>
    );
  }

  const pctVar = totals.rendaTotal > 0 ? (totals.variableTotal / totals.rendaTotal) * 100 : 0;
  const pctFix = totals.rendaTotal > 0 ? (totals.fixedTotal / totals.rendaTotal) * 100 : 0;

  return (
    <View>
      {/* Resumo rápido em % da renda (sem repetir o valor total) */}
      {totals.rendaTotal > 0 ? (
        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          Você comprometeu <Text style={{ color: colors.variable, fontWeight: '800' }}>{formatPercent(pctVar)}</Text> da renda com variáveis e{' '}
          <Text style={{ color: colors.fixed, fontWeight: '800' }}>{formatPercent(pctFix)}</Text> com fixas.
        </Text>
      ) : (
        <Text style={[styles.summary, { color: colors.textMuted }]}>
          Lance sua renda para ver o % comprometido com despesas.
        </Text>
      )}

      {(() => {
        const msg = getMonthInsight(month);
        return msg ? (
          <View style={[styles.monthInsight, { backgroundColor: colors.alpha(colors.primary, 0.12), borderColor: colors.alpha(colors.primary, 0.4) }]}>
            <Text style={[styles.monthInsightText, { color: colors.text }]}>{msg}</Text>
          </View>
        ) : null;
      })()}

      <Text style={[styles.tapHint, { color: colors.textMuted }]}>Toque numa categoria para ver os detalhes</Text>

      <CategoryBar
        label="Gastos Fixos"
        icon="repeat-outline"
        color={colors.fixed}
        items={month.fixed}
        total={totals.fixedTotal}
        grandTotal={totals.despesaTotal}
      />
      <CategoryBar
        label="Gastos Variáveis"
        icon="pricetags-outline"
        color={colors.variable}
        items={month.variable}
        total={totals.variableTotal}
        grandTotal={totals.despesaTotal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { textAlign: 'center', paddingVertical: 20, fontSize: 13, lineHeight: 19 },
  summary: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 12 },
  tapHint: { fontSize: 11, marginBottom: 12, marginTop: 2 },
  monthInsight: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  monthInsightText: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  insight: { borderRadius: 10, padding: 10, marginBottom: 12 },
  insightText: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  catWrap: { marginBottom: 16 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  catIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  catLabel: { fontSize: 15, fontWeight: '800' },
  catRight: { flexDirection: 'row', alignItems: 'center' },
  catValue: { fontSize: 17, fontWeight: '800' },
  track: { height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  catPct: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  detailBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  detailRow: { marginBottom: 10 },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  detailTrack: { height: 8, borderRadius: 6, overflow: 'hidden' },
  detailFill: { height: '100%', borderRadius: 6 },
  detailHint: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
});
