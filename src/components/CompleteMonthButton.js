// Conclusão do mês: agora derivada das despesas. Mostra progresso (X/Y pagas),
// permite concluir/reabrir todas de uma vez, e indica o gesto de arraste.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthStatus, concludedCount } from '../utils/calculations';
import { hapticSuccess } from '../utils/haptics';
import { MONTH_NAMES, YEAR } from '../data/initialData';

function confirmAction(title, message, confirmLabel, onConfirm) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

export default function CompleteMonthButton({ monthIndex, month }) {
  const { colors } = useTheme();
  const { concludeAllItems, clearMonth } = useData();
  const status = monthStatus(month);
  const { done, total } = concludedCount(month);
  const label = `${MONTH_NAMES[monthIndex]} ${YEAR}`;

  if (status === 'done') {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity
          style={[styles.doneWrap, { borderTopColor: colors.border + '40' }]}
          activeOpacity={0.7}
          onPress={() =>
            confirmAction('Reabrir mês', `Reabrir ${label}? Todas as despesas voltam para "a pagar".`, 'Reabrir', () =>
              concludeAllItems(monthIndex, false)
            )
          }
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
          <Text style={[styles.doneText, { color: colors.positive }]}>Mês concluído</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>(toque para reabrir)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { borderTopColor: colors.border + '40' }]}
          activeOpacity={0.7}
          onPress={() =>
            confirmAction(
              'Apagar dados do mês',
              `Apagar todos os lançamentos de ${label}? Renda, gastos fixos e variáveis serão removidos. Essa ação não pode ser desfeita.`,
              'Apagar tudo',
              () => clearMonth(monthIndex)
            )
          }
        >
          <Ionicons name="trash-outline" size={17} color={colors.negative} />
          <Text style={[styles.btnText, { color: colors.negative }]}>Apagar dados do mês</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {total > 0 && (
        <Text style={[styles.progress, { color: colors.textMuted }]}>
          {done}/{total} despesas pagas · arraste cada uma pra concluir →
        </Text>
      )}
      <TouchableOpacity
        style={[styles.btn, { borderTopColor: colors.border + '40' }]}
        activeOpacity={0.7}
        onPress={() =>
          confirmAction('Concluir mês', `Marcar todas as despesas de ${label} como pagas?`, 'Concluir tudo', () => {
            hapticSuccess();
            concludeAllItems(monthIndex, true);
          })
        }
      >
        <Ionicons name="checkmark-done-outline" size={17} color={colors.textSecondary} />
        <Text style={[styles.btnText, { color: colors.textSecondary }]}>Concluir mês inteiro</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { borderTopColor: colors.border + '40' }]}
        activeOpacity={0.7}
        onPress={() =>
          confirmAction(
            'Apagar dados do mês',
            `Apagar todos os lançamentos de ${label}? Renda, gastos fixos e variáveis serão removidos. Essa ação não pode ser desfeita.`,
            'Apagar tudo',
            () => clearMonth(monthIndex)
          )
        }
      >
        <Ionicons name="trash-outline" size={17} color={colors.negative} />
        <Text style={[styles.btnText, { color: colors.negative }]}>Apagar dados do mês</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  progress: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btnText: { fontSize: 13.5, fontWeight: '700', marginLeft: 9 },
  clearBtn: {},
  doneWrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth },
  doneText: { fontSize: 13.5, fontWeight: '800', marginLeft: 8 },
  hint: { fontSize: 11, marginLeft: 6 },
});
