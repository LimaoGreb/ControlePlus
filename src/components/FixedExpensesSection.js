// Seção de Despesas Fixas — lista dinâmica + copiar do mês anterior.
import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import { MONTH_NAMES } from '../data/initialData';
import ExpensesSection from './ExpensesSection';

export default function FixedExpensesSection({ monthIndex, month, forceOpen = false }) {
  const { colors } = useTheme();
  const { copyFixedFromPrevious } = useData();
  const totals = monthTotals(month);

  const handleCopy = () => {
    const result = copyFixedFromPrevious(monthIndex);
    if (result === false) {
      Alert.alert(
        'Não foi possível copiar',
        monthIndex === 0
          ? 'Janeiro não tem mês anterior.'
          : `${MONTH_NAMES[monthIndex - 1]} não tem despesas fixas para copiar.`
      );
    } else if (result === 0) {
      Alert.alert(
        'Nada novo para copiar',
        `Todos os gastos fixos de ${MONTH_NAMES[monthIndex - 1]} já estão neste mês.`
      );
    }
  };

  const copyButton =
    monthIndex > 0 ? (
      <TouchableOpacity
        style={[styles.copyBtn, { borderColor: colors.fixed }]}
        onPress={handleCopy}
      >
        <Ionicons name="copy-outline" size={20} color={colors.fixed} />
        <Text style={[styles.copyText, { color: colors.fixed }]}>
          Copiar fixas de {MONTH_NAMES[monthIndex - 1]}
        </Text>
      </TouchableOpacity>
    ) : null;

  return (
    <ExpensesSection
      monthIndex={monthIndex}
      items={month.fixed || []}
      section="fixed"
      title="Gastos Fixos"
      icon="repeat-outline"
      color={colors.fixed}
      total={totals.fixedTotal}
      addLabel="Adicionar despesa fixa"
      extraButton={forceOpen ? null : copyButton}
      forceOpen={forceOpen}
    />
  );
}

const styles = StyleSheet.create({
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  copyText: { fontSize: 14, fontWeight: '700', marginLeft: 6 },
});
