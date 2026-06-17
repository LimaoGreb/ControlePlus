import React from 'react';
import { Alert, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import Collapsible from './Collapsible';
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

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.income + '18', borderColor: colors.income + '80' }]}
          onPress={() => addItem(monthIndex, 'incomes', '', 0)}
        >
          <Ionicons name="add" size={18} color={colors.income} />
          <Text style={[styles.addText, { color: colors.income }]}>Adicionar renda</Text>
        </TouchableOpacity>

        {hasValues && (
          <TouchableOpacity
            style={[styles.replicateBtn, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}
            onPress={handleReplicate}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.replicateText, { color: colors.textSecondary }]}>Replicar nos seguintes</Text>
          </TouchableOpacity>
        )}
      </View>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 11,
    gap: 6,
  },
  addText: { fontSize: 13, fontWeight: '800' },
  replicateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 11,
    gap: 6,
  },
  replicateText: { fontSize: 12, fontWeight: '700' },
});
