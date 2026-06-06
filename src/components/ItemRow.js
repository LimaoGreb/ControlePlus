// Linha editável de um item: nome + valor + (forma de pagamento) + remover.
// Para despesas, é "arrastável": arrasta pra DIREITA conclui, pra ESQUERDA reabre.
import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import CurrencyInput from './CurrencyInput';
import DueDayChip from './DueDayChip';

export default function ItemRow({
  item,
  namePlaceholder = 'Nome',
  onChangeName,
  onChangeValue,
  onRemove,
  accentColor,
  showPayment = false,
  paymentMethods = [],
  onChangePayment,
  // Conclusão por arraste (apenas despesas):
  swipeable = false,
  onToggleConcluded,
  onChangeDueDay,
}) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;
  const swipeRef = useRef(null);
  const concluded = !!item.concluded;

  const rowContent = (
    <View style={[styles.wrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.row}>
        {swipeable ? (
          <Ionicons
            name={concluded ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={concluded ? colors.positive : colors.textMuted}
            style={{ marginRight: 8 }}
          />
        ) : (
          <View style={[styles.dot, { backgroundColor: accent }]} />
        )}
        <TextInput
          value={item.name}
          onChangeText={onChangeName}
          placeholder={namePlaceholder}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.inputBg,
              color: concluded ? colors.textMuted : colors.text,
              borderColor: colors.border,
              textDecorationLine: concluded ? 'line-through' : 'none',
            },
          ]}
        />
        <CurrencyInput value={item.value} onChangeValue={onChangeValue} style={styles.value} />
        {onRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.trash} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={22} color={colors.negative} />
          </TouchableOpacity>
        )}
      </View>

      {(swipeable || (showPayment && paymentMethods.length > 0)) && (
        <View style={styles.chipsRow}>
          {swipeable && onChangeDueDay && (
            <DueDayChip dueDay={item.dueDay} onChange={onChangeDueDay} color={accent} />
          )}
          {showPayment && paymentMethods.map((pm) => {
            const selected = item.payment === pm.name;
            return (
              <TouchableOpacity
                key={pm.id}
                onPress={() => onChangePayment(selected ? null : pm.name)}
                style={[
                  styles.chip,
                  { backgroundColor: selected ? accent : 'transparent', borderColor: selected ? accent : colors.border },
                ]}
              >
                {selected && <Ionicons name="checkmark" size={13} color={contrastText(accent)} style={{ marginRight: 3 }} />}
                <Text style={[styles.chipText, { color: selected ? contrastText(accent) : colors.textSecondary }]}>{pm.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  if (!swipeable) return rowContent;

  const leftAction = (
    <View style={[styles.action, { backgroundColor: colors.positive, alignItems: 'flex-start' }]}>
      <Ionicons name="checkmark-circle" size={22} color="#fff" />
      <Text style={styles.actionText}>Concluir</Text>
    </View>
  );
  const rightAction = (
    <View style={[styles.action, { backgroundColor: colors.textMuted, alignItems: 'flex-end' }]}>
      <Ionicons name="arrow-undo" size={20} color="#fff" />
      <Text style={styles.actionText}>Reabrir</Text>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={() => leftAction}
      renderRightActions={() => rightAction}
      leftThreshold={48}
      rightThreshold={48}
      onSwipeableOpen={(direction) => {
        onToggleConcluded && onToggleConcluded(direction === 'left');
        swipeRef.current && swipeRef.current.close();
      }}
      overshootLeft={false}
      overshootRight={false}
    >
      {rowContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  nameInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginRight: 8 },
  value: { width: 118 },
  trash: { paddingLeft: 8, paddingVertical: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 6 },
  chipText: { fontSize: 13, fontWeight: '700' },
  action: { justifyContent: 'center', width: 100, paddingHorizontal: 14, borderRadius: 10, marginBottom: 10 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 },
});
