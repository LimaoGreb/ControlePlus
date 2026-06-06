// Card editável de um investimento: nome, tipo (chips), valor investido,
// valor atual e rentabilidade calculada.
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { formatBRL, formatPercent } from '../utils/currency';
import { itemResult } from '../utils/investments';
import { INVESTMENT_TYPES } from '../data/investmentTypes';
import CurrencyInput from './CurrencyInput';

export default function InvestmentCard({
  investment,
  onChangeName,
  onChangeType,
  onChangeInvested,
  onChangeCurrent,
  onRemove,
}) {
  const { colors } = useTheme();
  const res = itemResult(investment);

  const groupColor = (group) =>
    group === 'Renda Fixa' ? colors.fixed : group === 'Renda Variável' ? colors.variable : colors.accent;

  const resultColor = res.result > 0 ? colors.positive : res.result < 0 ? colors.negative : colors.textSecondary;
  const sign = res.result > 0 ? '+' : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <TextInput
          value={investment.name}
          onChangeText={onChangeName}
          placeholder="Ex.: Tesouro Selic, PETR4, MXRF11"
          placeholderTextColor={colors.textMuted}
          style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        />
        <TouchableOpacity onPress={onRemove} style={styles.trash} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Ionicons name="trash-outline" size={22} color={colors.negative} />
        </TouchableOpacity>
      </View>

      {/* Chips de tipo */}
      <View style={styles.chips}>
        {INVESTMENT_TYPES.map((t) => {
          const selected = investment.typeId === t.id;
          const c = groupColor(t.group);
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => onChangeType(t.id)}
              style={[
                styles.chip,
                { backgroundColor: selected ? c : 'transparent', borderColor: selected ? c : colors.border },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? contrastText(c) : colors.textSecondary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Valores */}
      <View style={styles.valuesRow}>
        <View style={styles.valueCol}>
          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Investido</Text>
          <CurrencyInput value={investment.invested} onChangeValue={onChangeInvested} style={styles.valueInput} />
        </View>
        <View style={styles.valueCol}>
          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Valor atual</Text>
          <CurrencyInput value={investment.current} onChangeValue={onChangeCurrent} style={styles.valueInput} />
        </View>
      </View>

      {/* Rentabilidade */}
      <View style={[styles.resultBox, { borderColor: colors.border }]}>
        <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Rentabilidade</Text>
        <Text style={[styles.resultValue, { color: resultColor }]}>
          {res.invested > 0 || res.current > 0
            ? `${sign}${formatBRL(res.result)}  (${sign}${formatPercent(res.resultPct)})`
            : '—'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  nameInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginRight: 8 },
  trash: { paddingLeft: 6, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, marginRight: 7, marginBottom: 7 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  valueCol: { flex: 1, marginRight: 8 },
  valueLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  valueInput: { width: '100%' },
  resultBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  resultLabel: { fontSize: 13, fontWeight: '600' },
  resultValue: { fontSize: 15, fontWeight: '800' },
});
