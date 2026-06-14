import React from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import { formatBRL } from '../utils/currency';
import ItemRow from './ItemRow';

export default function IncomeSection({ monthIndex, month }) {
  const { colors } = useTheme();
  const { addItem, removeItem, updateItem, replicateIncomeToAllMonths } = useData();
  const totals = monthTotals(month);
  const incomes = month.incomes || [];
  const hasValues = incomes.some((it) => it.value > 0);

  const handleReplicate = () => {
    Alert.alert(
      'Replicar renda',
      'Copiar estas fontes de renda para os meses seguintes? Rendas com o mesmo nome não serão duplicadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Replicar daqui pra frente', onPress: () => replicateIncomeToAllMonths(monthIndex, incomes) },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={16} color={colors.income} />
        <Text style={[styles.title, { color: colors.text }]}>Renda</Text>
        <Text style={[styles.total, { color: colors.income }]}>{formatBRL(totals.rendaTotal)}</Text>
      </View>

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

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: colors.income }]}
        onPress={() => addItem(monthIndex, 'incomes', '', 0)}
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.income} />
        <Text style={[styles.addText, { color: colors.income }]}>+ Adicionar fonte de renda</Text>
      </TouchableOpacity>

      {hasValues && (
        <TouchableOpacity
          style={[styles.replicateBtn, { borderColor: colors.income }]}
          onPress={handleReplicate}
        >
          <Ionicons name="calendar-outline" size={17} color={colors.income} />
          <Text style={[styles.replicateText, { color: colors.income }]}>Replicar nos meses seguintes</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', flex: 1 },
  total: { fontSize: 16, fontWeight: '800' },
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
  replicateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 10, marginTop: 8, gap: 6 },
  replicateText: { fontSize: 14, fontWeight: '700' },
});
