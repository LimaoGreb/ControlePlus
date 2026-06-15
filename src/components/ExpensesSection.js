// Base reutilizável para listas dinâmicas de despesas (fixas e variáveis). Colapsável.
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useInstallment } from '../context/InstallmentContext';
import { contrastText } from '../utils/colorUtils';
import { YEAR } from '../data/initialData';
import Collapsible from './Collapsible';
import ItemRow from './ItemRow';

export default function ExpensesSection({
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

  const now = new Date();
  const isItemOverdue = (item) => {
    if (!item.dueDay || item.concluded) return false;
    return new Date(YEAR, monthIndex, item.dueDay, 23, 59, 59) < now;
  };

  // Ao escolher uma forma de pagamento: marca no item e, se for cartão de
  // crédito (e já tiver valor), abre a janela de parcelamento.
  const handlePayment = (item, pmName) => {
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
  };

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
        style={[styles.addBtn, { backgroundColor: color }]}
        onPress={() => addItem(monthIndex, section, '', 0, null)}
      >
        <Ionicons name="add" size={24} color={onColor} />
        <Text style={[styles.addText, { color: onColor }]}>{addLabel}</Text>
      </TouchableOpacity>

      {extraButton}
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addText: { fontSize: 16, fontWeight: '800', marginLeft: 4 },
});
