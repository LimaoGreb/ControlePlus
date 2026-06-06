// Seção de Renda (Entradas) — até 4 fontes com nome editável. Colapsável.
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import Collapsible from './Collapsible';
import ItemRow from './ItemRow';

const MAX_INCOMES = 4;

export default function IncomeSection({ monthIndex, month }) {
  const { colors } = useTheme();
  const { addItem, removeItem, updateItem } = useData();
  const totals = monthTotals(month);
  const incomes = month.incomes || [];

  return (
    <Collapsible
      icon="cash-outline"
      title="Renda"
      total={totals.rendaTotal}
      color={colors.income}
      count={incomes.length}
    >
      {incomes.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          namePlaceholder="Ex.: Salário, Freelance, Bico"
          accentColor={colors.income}
          onChangeName={(t) => updateItem(monthIndex, 'incomes', item.id, 'name', t)}
          onChangeValue={(v) => updateItem(monthIndex, 'incomes', item.id, 'value', v)}
          onRemove={() => removeItem(monthIndex, 'incomes', item.id)}
        />
      ))}

      {incomes.length < MAX_INCOMES ? (
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: colors.income }]}
          onPress={() => addItem(monthIndex, 'incomes', '', 0)}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.income} />
          <Text style={[styles.addText, { color: colors.income }]}>+ Adicionar fonte de renda</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.limit, { color: colors.textMuted }]}>
          Limite de {MAX_INCOMES} fontes de renda atingido.
        </Text>
      )}
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  addText: { fontSize: 15, fontWeight: '700', marginLeft: 6 },
  limit: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
