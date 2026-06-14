// Linha editável de um item: nome + valor + (forma de pagamento) + remover.
// Para despesas/rendas, é "arrastável": arrasta pra DIREITA conclui, pra ESQUERDA reabre.
// Quando nome + valor + pagamento estão preenchidos, o card trava automaticamente.
// Segure 2s para desbloquear; blur (clicar fora) trava novamente.
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { getBankForPayment } from '../data/banks';
import { MONTH_NAMES } from '../data/initialData';
import CurrencyInput from './CurrencyInput';
import DueDayChip from './DueDayChip';
import BankBadge from './BankBadge';

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

  // ── Lock state ─────────────────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const focusCount = useRef(0);
  const blurTimer = useRef(null);
  const chipPressed = useRef(false);

  const concluded = !!item.concluded;
  const lockConditionMet = showPayment && !!item.name?.trim() && Number(item.value) > 0 && !!item.payment;
  const isLocked = lockConditionMet && !unlocked && !concluded;

  const handleLongPress = () => {
    hapticSuccess();
    setUnlocked(true);
  };

  const handleInputFocus = () => {
    focusCount.current++;
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const handleInputBlur = () => {
    focusCount.current = Math.max(0, focusCount.current - 1);
    if (!unlocked) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      if (focusCount.current === 0 && !chipPressed.current && lockConditionMet) setUnlocked(false);
      chipPressed.current = false;
    }, 200);
  };

  const handleChipPress = (pm) => {
    chipPressed.current = true;
    const selected = item.payment === pm.name;
    onChangePayment?.(selected ? null : pm.name);
  };

  // ── Ghost de parcela (referência visual, value=0, não conta nos totais) ────
  if (item.isInstallmentRef) {
    const startName = MONTH_NAMES[item.installmentStartMonth] ?? '?';
    const valStr = item.installmentValue != null
      ? `R$ ${Number(item.installmentValue).toFixed(2).replace('.', ',')}`
      : '';
    return (
      <View style={[styles.refWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="card-outline" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.refName, { color: colors.textSecondary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.refTag, { color: colors.textMuted }]}>
            {'💳 Contabiliza a partir de '}
            {startName}
            {item.installmentCount ? ` · ${item.installmentCount}x${valStr ? ` de ${valStr}` : ''}` : ''}
          </Text>
        </View>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={18} color={colors.border} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Card principal ─────────────────────────────────────────────────────────
  const rowContent = (
    <View style={[
      styles.wrapper,
      {
        borderColor: isOverdue ? '#CC0000' : colors.border,
        borderWidth: isOverdue ? 2 : 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: isLocked ? 0.82 : 1,
      },
    ]}>
      {isOverdue && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(220,0,0,0.22)', zIndex: 1 }}
        />
      )}
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
          editable={!concluded && !isLocked}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          style={[
            styles.nameInput,
            {
              backgroundColor: (concluded || isLocked) ? 'transparent' : colors.inputBg,
              color: concluded ? colors.textMuted : colors.text,
              borderColor: (concluded || isLocked) ? 'transparent' : colors.border,
              textDecorationLine: concluded ? 'line-through' : 'none',
            },
          ]}
        />
        <CurrencyInput
          value={item.value}
          onChangeValue={onChangeValue}
          editable={!concluded && !isLocked}
          overdue={isOverdue}
          style={styles.value}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        {isLocked ? (
          <View style={styles.lockBtn}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          </View>
        ) : onRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.trash} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={22} color={colors.negative} />
          </TouchableOpacity>
        )}
      </View>

      {((swipeable && onChangeDueDay) || (showPayment && paymentMethods.length > 0)) && (
        <View style={styles.chipsRow}>
          {swipeable && onChangeDueDay && !isLocked && (
            <DueDayChip dueDay={item.dueDay} onChange={onChangeDueDay} color={accent} />
          )}
          {showPayment && (concluded || isLocked)
            ? (() => {
                const sel = paymentMethods.find((pm) => pm.name === item.payment);
                if (!sel) return null;
                const bank = getBankForPayment(sel);
                return (
                  <View style={[styles.chip, { backgroundColor: bank?.color || accent, borderColor: bank?.color || accent }]}>
                    {bank && <BankBadge bank={bank} size={18} />}
                    <Text style={[styles.chipText, { color: '#fff' }]}>{sel.name}</Text>
                  </View>
                );
              })()
            : showPayment && paymentMethods.map((pm) => {
                const selected = item.payment === pm.name;
                const bank = getBankForPayment(pm);
                const chipColor = selected ? (bank?.color || accent) : 'transparent';
                const borderColor = selected ? (bank?.color || accent) : (bank?.color ? bank.color + '55' : colors.border);
                const textColor = selected ? '#fff' : (bank?.color || colors.textSecondary);
                return (
                  <TouchableOpacity
                    key={pm.id}
                    onPress={() => handleChipPress(pm)}
                    style={[styles.chip, { backgroundColor: chipColor, borderColor }]}
                  >
                    {bank && !selected && <BankBadge bank={bank} size={20} />}
                    {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                    <Text style={[styles.chipText, { color: textColor }]}>{pm.name}</Text>
                  </TouchableOpacity>
                );
              })}
          {unlocked && lockConditionMet && !concluded && (
            <TouchableOpacity
              onPress={() => { hapticSuccess(); setUnlocked(false); }}
              style={[styles.confirmBtn, { borderColor: colors.positive, backgroundColor: colors.positive + '18' }]}
            >
              <Ionicons name="checkmark-circle" size={13} color={colors.positive} />
              <Text style={[styles.confirmBtnTxt, { color: colors.positive }]}>Confirmar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // Envolve com long-press quando bloqueado
  const cardWithLock = isLocked ? (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={handleLongPress}
      delayLongPress={1000}
    >
      {rowContent}
    </TouchableOpacity>
  ) : rowContent;

  if (!swipeable) return cardWithLock;

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
      {cardWithLock}
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
  lockBtn: { paddingLeft: 10, paddingVertical: 6, opacity: 0.55 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 6, gap: 6 },
  chipText: { fontSize: 13, fontWeight: '700' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 6, gap: 4 },
  confirmBtnTxt: { fontSize: 11, fontWeight: '700' },
  action: { justifyContent: 'center', width: 100, paddingHorizontal: 14, borderRadius: 10, marginBottom: 10 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 },
  refWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  refName: { fontSize: 13, fontWeight: '700' },
  refTag: { fontSize: 11, marginTop: 2 },
});
