import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { onBulkUnlock, isPendingUnlock } from '../utils/editModeSignal';
import { MONTH_NAMES } from '../data/initialData';
import CurrencyInput from './CurrencyInput';
import DueDayChip from './DueDayChip';
import CategoryChip from './CategoryChip';
import PaymentChip from './PaymentChip';

const CAT_META = {
  alimentacao: { icon: '🍔', name: 'Alimentação' }, transporte: { icon: '🚗', name: 'Transporte' },
  moradia:     { icon: '🏠', name: 'Moradia' },     saude:      { icon: '💊', name: 'Saúde' },
  lazer:       { icon: '🎮', name: 'Lazer' },       educacao:   { icon: '📚', name: 'Educação' },
  vestuario:   { icon: '👕', name: 'Vestuário' },   assinaturas:{ icon: '📺', name: 'Assinaturas' },
  tech:        { icon: '💻', name: 'Tech' },        outros:     { icon: '🔮', name: 'Outros' },
};

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
  showCategory = false,
  onChangeCategory,
}) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;
  const swipeRef = useRef(null);

  const [unlocked, setUnlocked] = useState(() => isPendingUnlock());
  const focusCount = useRef(0);
  const blurTimer = useRef(null);
  const chipPressed = useRef(false);

  const concluded = !!item.concluded;
  const lockConditionMet = showPayment && !!item.name?.trim() && Number(item.value) > 0 && !!item.payment;
  const isLocked = lockConditionMet && !unlocked && !concluded;

  useEffect(() => onBulkUnlock(() => setUnlocked(true)), []);

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

  // ── Ghost de parcela ────────────────────────────────────────────────────────
  if (item.isInstallmentRef) {
    const startName = MONTH_NAMES[item.installmentStartMonth] ?? '?';
    const valStr = item.installmentValue != null
      ? `R$ ${Number(item.installmentValue).toFixed(2).replace('.', ',')}`
      : '';
    return (
      <View style={[styles.refWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="card-outline" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.refName, { color: colors.textSecondary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.refTag, { color: colors.textMuted }]}>
            {'💳 Contabiliza a partir de '}{startName}
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

  // ── Meta text para estado travado/concluído ──────────────────────────────────
  const metaParts = [];
  if (item.payment) metaParts.push(`💳 ${item.payment}`);
  if (item.category && CAT_META[item.category]) metaParts.push(`${CAT_META[item.category].icon} ${CAT_META[item.category].name}`);
  if (item.dueDay) metaParts.push(`📅 dia ${item.dueDay}`);
  const metaText = metaParts.join('  ·  ');
  const hasMetaPills = (isLocked || concluded) && metaText.length > 0;

  const hasChips = !isLocked && !concluded &&
    ((swipeable && onChangeDueDay) || (showPayment && paymentMethods.length > 0) || showCategory);

  // ── Linha flat (sem card próprio — vive dentro do card da seção) ───────────
  const rowContent = (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.text + '0D',
        borderColor: colors.border + '80',
        opacity: concluded ? 0.5 : 1,
      },
    ]}>
      {/* ── Linha principal: ícone + nome + valor + ação ── */}
      <View style={styles.mainRow}>
        {swipeable ? (
          <Ionicons
            name={concluded ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={concluded ? colors.positive : colors.textMuted}
            style={styles.leadIcon}
          />
        ) : (
          <View style={[styles.dot, { backgroundColor: accent }]} />
        )}

        {concluded ? (
          <Text
            style={[styles.nameInput, { color: colors.textMuted, textDecorationLine: 'line-through', lineHeight: 38 }]}
            numberOfLines={1}
          >
            {item.name || namePlaceholder}
          </Text>
        ) : (
          <TextInput
            value={item.name}
            onChangeText={onChangeName}
            placeholder={namePlaceholder}
            placeholderTextColor={colors.textMuted}
            editable={!isLocked}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            style={[styles.nameInput, { backgroundColor: 'transparent', color: colors.text }]}
          />
        )}

        <View pointerEvents={concluded ? 'none' : 'auto'} style={styles.valueInput}>
          <CurrencyInput
            value={item.value}
            onChangeValue={onChangeValue}
            editable={!concluded && !isLocked}
            overdue={isOverdue}
            style={{ width: '100%' }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </View>

        {isLocked ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { hapticSuccess(); setUnlocked(true); }}
            onLongPress={() => { hapticSuccess(); setUnlocked(true); }}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : onRemove ? (
          <TouchableOpacity onPress={onRemove} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={20} color={colors.negative} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Estado TRAVADO / CONCLUÍDO: linha de meta flat ── */}
      {hasMetaPills && (
        <Text numberOfLines={1} style={[styles.metaLine, { color: colors.textMuted }]}>
          {metaText}
        </Text>
      )}

      {/* ── Estado EDIÇÃO: Categoria · Pagamento · Vencimento (lista) ── */}
      {hasChips && (
        <View style={styles.chipsSection}>
          {showCategory && (
            <View style={[styles.chipRow, { borderTopColor: colors.border + '40' }]}>
              <CategoryChip categoryId={item.category} onChange={onChangeCategory} />
            </View>
          )}
          {showPayment && paymentMethods.length > 0 && (
            <View style={[styles.chipRow, { borderTopColor: colors.border + '40' }]}>
              <PaymentChip payment={item.payment} paymentMethods={paymentMethods} onChange={onChangePayment} />
            </View>
          )}
          {swipeable && onChangeDueDay && (
            <View style={[styles.chipRow, { borderTopColor: colors.border + '40' }]}>
              <DueDayChip dueDay={item.dueDay} onChange={onChangeDueDay} color={accent} />
            </View>
          )}
          {unlocked && lockConditionMet && (
            <View style={[styles.confirmRow, { borderTopColor: colors.border + '40' }]}>
              <TouchableOpacity
                onPress={() => { hapticSuccess(); setUnlocked(false); }}
                style={[styles.confirmBtn, { borderColor: colors.positive, backgroundColor: colors.positive + '18' }]}
              >
                <Ionicons name="checkmark-circle" size={13} color={colors.positive} />
                <Text style={[styles.confirmBtnTxt, { color: colors.positive }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const cardWithLock = rowContent;

  if (!swipeable) return cardWithLock;

  const renderLeft = (progress) => {
    const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    const scale  = progress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.swipeAction, { backgroundColor: colors.positive, alignItems: 'flex-start', opacity }]}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.swipeActionTxt}>{concludeLabel}</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderRight = (progress) => {
    const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    const scale  = progress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.swipeAction, { backgroundColor: colors.textMuted, alignItems: 'flex-end', opacity }]}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Ionicons name="arrow-undo" size={20} color="#fff" />
          <Text style={styles.swipeActionTxt}>{reopenLabel}</Text>
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
        if (concluding) hapticSuccess(); else hapticTap();
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
  // ── Card leve: fundo sutil + borda nos 3 lados + cantos direitos ──────────
  card: {
    overflow: 'hidden',
    marginVertical: 5,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
  },
  // ── Linha principal ────────────────────────────────────────────────────────
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leadIcon: { marginRight: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  nameInput: {
    flex: 1,
    height: 38,
    paddingHorizontal: 4,
    fontSize: 15,
    marginRight: 8,
  },
  valueInput: { width: 100 },
  iconBtn: { paddingLeft: 6, paddingVertical: 4, opacity: 0.8 },

  // ── Meta linha flat (travado / concluído) ─────────────────────────────────
  metaLine: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.2,
    paddingLeft: 40,
    paddingRight: 12,
    paddingBottom: 10,
  },

  // ── Chips de edição (lista vertical) ─────────────────────────────────────
  chipsSection: {},
  chipRow: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  confirmBtnTxt: { fontSize: 11, fontWeight: '700' },

  // ── Swipe actions ──────────────────────────────────────────────────────────
  swipeAction: {
    justifyContent: 'center',
    width: 100,
    paddingHorizontal: 14,
  },
  swipeActionTxt: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 },

  // ── Ghost de parcela ───────────────────────────────────────────────────────
  refWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  refName: { fontSize: 13, fontWeight: '700' },
  refTag:  { fontSize: 11, marginTop: 2 },
});
