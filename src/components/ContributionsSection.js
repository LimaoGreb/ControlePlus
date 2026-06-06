// Seção de Contribuições (doações/dízimo) — lista dinâmica + meta de % da renda.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { monthTotals } from '../utils/calculations';
import { formatBRL, formatPercent } from '../utils/currency';
import Collapsible from './Collapsible';
import ItemRow from './ItemRow';

export default function ContributionsSection({ monthIndex, month, goalPct = 10 }) {
  const { colors } = useTheme();
  const { addItem, removeItem, updateItem } = useData();
  const totals = monthTotals(month);
  const items = month.contributions || [];
  const color = colors.primary;
  const onColor = contrastText(color);

  const achievedPct = totals.contributionsPct; // % da renda já contribuído
  const metGoal = goalPct > 0 && achievedPct >= goalPct;
  const progress = goalPct > 0 ? Math.min(100, (achievedPct / goalPct) * 100) : 0;

  return (
    <Collapsible
      icon="heart-outline"
      title="Contribuições"
      total={totals.contributionsTotal}
      color={color}
      count={items.length}
    >
      {/* Meta de % da renda */}
      {totals.rendaTotal > 0 && goalPct > 0 && (
        <View style={[styles.goalBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <View style={styles.goalRow}>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
              {formatPercent(achievedPct)} da renda
            </Text>
            <Text style={[styles.goalTarget, { color: metGoal ? colors.positive : colors.textSecondary }]}>
              {metGoal ? 'Meta atingida ✓' : `Meta: ${formatPercent(goalPct)}`}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(2, progress)}%`, backgroundColor: metGoal ? colors.positive : color },
              ]}
            />
          </View>
        </View>
      )}

      {items.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Nenhuma contribuição ainda. Toque em "Adicionar contribuição".
        </Text>
      )}

      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          namePlaceholder="Ex.: Dízimo, Oferta, Caridade"
          accentColor={color}
          swipeable
          onToggleConcluded={(v) => updateItem(monthIndex, 'contributions', item.id, 'concluded', v)}
          onChangeDueDay={(d) => updateItem(monthIndex, 'contributions', item.id, 'dueDay', d)}
          onChangeName={(t) => updateItem(monthIndex, 'contributions', item.id, 'name', t)}
          onChangeValue={(v) => updateItem(monthIndex, 'contributions', item.id, 'value', v)}
          onRemove={() => removeItem(monthIndex, 'contributions', item.id)}
        />
      ))}

      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: color }]}
        onPress={() => addItem(monthIndex, 'contributions', '', 0)}
      >
        <Ionicons name="add" size={24} color={onColor} />
        <Text style={[styles.addText, { color: onColor }]}>Adicionar contribuição</Text>
      </TouchableOpacity>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  goalBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalLabel: { fontSize: 14, fontWeight: '800' },
  goalTarget: { fontSize: 13, fontWeight: '700' },
  track: { height: 10, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addText: { fontSize: 16, fontWeight: '800', marginLeft: 4 },
});
