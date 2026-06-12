// Linha editável de um item: nome + valor + (forma de pagamento) + remover.
// Para despesas/rendas, é "arrastável": arrasta pra DIREITA conclui, pra ESQUERDA reabre.
import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { getBankById } from '../data/banks';
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
  // Conclusão por arraste (despesas e rendas):
  swipeable = false,
  onToggleConcluded,
  onChangeDueDay,
  concludeLabel = 'Concluir',
  reopenLabel = 'Reabrir',
  isOverdue = false,
}) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;
  const swipeRef = useRef(null);
  const concluded = !!item.concluded;

  const rowContent = (
    <View style={[
      styles.wrapper,
      { borderColor: colors.border, backgroundColor: colors.card },
      isOverdue && styles.overdueWrapper,
    ]}>
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
          editable={!concluded}
          style={[
            styles.nameInput,
            {
              backgroundColor: concluded ? 'transparent' : colors.inputBg,
              color: concluded ? colors.textMuted : colors.text,
              borderColor: concluded ? 'transparent' : colors.border,
              textDecorationLine: concluded ? 'line-through' : 'none',
            },
          ]}
        />
        <CurrencyInput value={item.value} onChangeValue={onChangeValue} editable={!concluded} style={styles.value} />
        {onRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.trash} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={22} color={colors.negative} />
          </TouchableOpacity>
        )}
      </View>

      {((swipeable && onChangeDueDay) || (showPayment && paymentMethods.length > 0)) && (
        <View style={styles.chipsRow}>
          {swipeable && onChangeDueDay && (
            <DueDayChip dueDay={item.dueDay} onChange={onChangeDueDay} color={accent} />
          )}
          {showPayment && paymentMethods.map((pm) => {
            const selected = item.payment === pm.name;
            const bank = pm.bank ? getBankById(pm.bank) : null;
            const chipColor = selected ? (bank?.color || accent) : 'transparent';
            const borderColor = selected ? (bank?.color || accent) : (bank?.color ? bank.color + '55' : colors.border);
            const textColor = selected ? '#fff' : (bank?.color || colors.textSecondary);
            return (
              <TouchableOpacity
                key={pm.id}
                onPress={() => onChangePayment(selected ? null : pm.name)}
                style={[styles.chip, { backgroundColor: chipColor, borderColor }]}
              >
                {bank && !selected && <View style={[styles.bankDot, { backgroundColor: bank.color }]} />}
                {selected && <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 3 }} />}
                <Text style={[styles.chipText, { color: textColor }]}>{pm.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  if (!swipeable) return rowContent;

  const renderLeft = (progress) => {
    const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.action, { backgroundColor: colors.positive, alignItems: 'flex-start', opacity }]}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.actionText}>{concludeLabel}</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderRight = (progress) => {
    const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.action, { backgroundColor: colors.textMuted, alignItems: 'flex-end', opacity }]}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Ionicons name="arrow-undo" size={20} color="#fff" />
          <Text style={styles.actionText}>{reopenLabel}</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      leftThreshold={80}
      rightThreshold={80}
      onSwipeableOpen={(direction) => {
        const concluding = direction === 'left';
        if (concluding) hapticSuccess();
        else hapticTap();
        onToggleConcluded && onToggleConcluded(concluding);
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
  overdueWrapper: { borderLeftWidth: 3, borderLeftColor: '#FF3B30', backgroundColor: 'rgba(255,59,48,0.11)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  nameInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginRight: 8 },
  value: { width: 118 },
  trash: { paddingLeft: 8, paddingVertical: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 6 },
  chipText: { fontSize: 13, fontWeight: '700' },
  bankDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  action: { justifyContent: 'center', width: 100, paddingHorizontal: 14, borderRadius: 10, marginBottom: 10 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 },
});
