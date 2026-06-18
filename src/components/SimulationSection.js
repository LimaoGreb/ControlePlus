import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useData } from '../context/DataContext';
import { formatBRL } from '../utils/currency';
import CurrencyInput from './CurrencyInput';

const SIM_COLOR = '#F5A524';

export default function SimulationSection({ monthIndex, items = [] }) {
  const { colors } = useTheme();
  const { addSimItem, removeSimItem, updateSimItem } = useData();

  const total = items.reduce((s, it) => s + (Number(it.value) || 0), 0);

  return (
    <View style={[styles.container, { borderColor: SIM_COLOR + '35', backgroundColor: SIM_COLOR + '08' }]}>

      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flask-outline" size={16} color={SIM_COLOR} />
          <Text style={[styles.headerTitle, { color: SIM_COLOR }]}>Despesas Simuladas</Text>
        </View>
        {total > 0 && (
          <Text style={[styles.headerTotal, { color: SIM_COLOR }]}>{formatBRL(total)}</Text>
        )}
      </View>

      {/* Lista de itens */}
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.row, { borderColor: SIM_COLOR + '30', backgroundColor: colors.background }]}
        >
          <TextInput
            value={item.name}
            onChangeText={(t) => updateSimItem(monthIndex, item.id, 'name', t)}
            placeholder="Nome da despesa"
            placeholderTextColor={colors.textMuted}
            style={[styles.nameInput, { color: colors.text }]}
          />
          <View style={styles.valueWrap}>
            <CurrencyInput
              value={item.value}
              onChangeValue={(v) => updateSimItem(monthIndex, item.id, 'value', v)}
              style={{ width: '100%' }}
            />
          </View>
          <TouchableOpacity
            onPress={() => removeSimItem(monthIndex, item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.negative} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Botão adicionar */}
      <TouchableOpacity
        style={[styles.addBtn, { borderColor: SIM_COLOR + '55', backgroundColor: SIM_COLOR + '12' }]}
        onPress={() => addSimItem(monthIndex)}
        activeOpacity={0.75}
      >
        <Ionicons name="add-circle-outline" size={18} color={SIM_COLOR} />
        <Text style={[styles.addText, { color: SIM_COLOR }]}>Adicionar despesa simulada</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: 'dashed',
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerTotal: {
    fontSize: 14,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  nameInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    paddingHorizontal: 2,
  },
  valueWrap: {
    width: 100,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    margin: 10,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
