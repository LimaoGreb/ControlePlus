// Linha editável de um item: nome + valor + (forma de pagamento) + remover.
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import CurrencyInput from './CurrencyInput';

export default function ItemRow({
  item,
  namePlaceholder = 'Nome',
  onChangeName,
  onChangeValue,
  onRemove,
  accentColor,
  // Forma de pagamento (apenas despesas):
  showPayment = false,
  paymentMethods = [],
  onChangePayment,
}) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;

  return (
    <View style={[styles.wrapper, { borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <TextInput
          value={item.name}
          onChangeText={onChangeName}
          placeholder={namePlaceholder}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.nameInput,
            { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
          ]}
        />
        <CurrencyInput value={item.value} onChangeValue={onChangeValue} style={styles.value} />
        {onRemove && (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.trash}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Ionicons name="trash-outline" size={22} color={colors.negative} />
          </TouchableOpacity>
        )}
      </View>

      {showPayment && paymentMethods.length > 0 && (
        <View style={styles.chipsRow}>
          {paymentMethods.map((pm) => {
            const selected = item.payment === pm.name;
            return (
              <TouchableOpacity
                key={pm.id}
                onPress={() => onChangePayment(selected ? null : pm.name)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? accent : 'transparent',
                    borderColor: selected ? accent : colors.border,
                  },
                ]}
              >
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={contrastText(accent)}
                    style={{ marginRight: 3 }}
                  />
                )}
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? contrastText(accent) : colors.textSecondary },
                  ]}
                >
                  {pm.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  nameInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    marginRight: 8,
  },
  value: { width: 118 },
  trash: { paddingLeft: 8, paddingVertical: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
});
