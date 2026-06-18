// Base reutilizável para listas dinâmicas de despesas (fixas e variáveis). Colapsável.
import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useInstallment } from '../context/InstallmentContext';
import { contrastText } from '../utils/colorUtils';
import { YEAR } from '../data/initialData';
import Collapsible from './Collapsible';
import ItemRow from './ItemRow';

function ExpensesSection({
  monthIndex,
  items,
  section,
  title,
  icon,
  color,
  total,
  addLabel,
  extraButton,
  forceOpen = false,
  allowInstallments = true,
}) {
  const { colors } = useTheme();
  const { addItem, removeItem, updateItem } = useData();
  const { paymentMethods } = useSettings();
  const { requestInstallment } = useInstallment();
  const onColor = contrastText(color);

  // now calculado uma vez por mount, não por render
  const now = useMemo(() => new Date(), []); // eslint-disable-line
  const isItemOverdue = useCallback((item) => {
    if (!item.dueDay || item.concluded) return false;
    return new Date(YEAR, monthIndex, item.dueDay, 23, 59, 59) < now;
  }, [monthIndex, now]);

  // Ao escolher uma forma de pagamento: marca no item e, se for cartão de
  // crédito (e já tiver valor), abre a janela de parcelamento.
  const handlePayment = useCallback((item, pmName) => {
    updateItem(monthIndex, section, item.id, 'payment', pmName);
    if (!pmName || !allowInstallments) return;
    const pm = paymentMethods.find((m) => m.name === pmName);
    if (pm && pm.isCredit && Number(item.value) > 0) {
      requestInstallment({
        monthIndex,
        section,
        itemId: item.id,
        name: item.name,
        value: Number(item.value),
        payment: pmName,
      });
    }
  }, [monthIndex, section, updateItem, allowInstallments, paymentMethods, requestInstallment]);

  return (
    <Collapsible icon={icon} title={title} total={total} color={color} count={items.length} forceOpen={forceOpen}>
      {items.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Nenhum item ainda. Toque em "{addLabel}".
        </Text>
      )}

      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          namePlaceholder="Nome da despesa"
          accentColor={color}
          showPayment
          paymentMethods={paymentMethods}
          swipeable
          isOverdue={isItemOverdue(item)}
          onToggleConcluded={(v) => updateItem(monthIndex, section, item.id, 'concluded', v)}
          onChangeDueDay={(d) => updateItem(monthIndex, section, item.id, 'dueDay', d)}
          onChangeName={(t) => updateItem(monthIndex, section, item.id, 'name', t)}
          onChangeValue={(v) => updateItem(monthIndex, section, item.id, 'value', v)}
          onChangePayment={(p) => handlePayment(item, p)}
          onRemove={() => removeItem(monthIndex, section, item.id)}
          showCategory
          onChangeCategory={(cat) => updateItem(monthIndex, section, item.id, 'category', cat)}
        />
      ))}

      <TouchableOpacity
        style={[styles.addBtn, { borderTopColor: colors.border + '55' }]}
        onPress={() => addItem(monthIndex, section, '', 0, null)}
      >
        <Ionicons name="add-circle-outline" size={17} color={color} />
        <Text style={[styles.addText, { color }]}>{addLabel}</Text>
      </TouchableOpacity>

      {extraButton}
    </Collapsible>
  );
}

export default React.memo(ExpensesSection);

const styles = StyleSheet.create({
  empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addText: { fontSize: 13, fontWeight: '700', marginLeft: 7 },
});
