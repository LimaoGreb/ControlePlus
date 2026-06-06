// Botão discreto e redondo de "Concluir mês" (alinhado à direita) + indicador.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { MONTH_NAMES, YEAR } from '../data/initialData';

// Confirmação que funciona em todas as plataformas (Alert no nativo, confirm no web).
function confirmAction(title, message, confirmLabel, onConfirm, destructive) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export default function CompleteMonthButton({ monthIndex, month }) {
  const { colors } = useTheme();
  const { setMonthCompleted } = useData();
  const completed = !!month.completed;
  const label = `${MONTH_NAMES[monthIndex]} ${YEAR}`;

  const conclude = () => {
    confirmAction(
      'Concluir mês',
      `Tem certeza que deseja concluir ${label}? Você ainda poderá editar os valores depois.`,
      'Concluir',
      () => setMonthCompleted(monthIndex, true)
    );
  };

  const reopen = () => {
    confirmAction(
      'Reabrir mês',
      `Deseja reabrir ${label}? Ele voltará para "em andamento".`,
      'Reabrir',
      () => setMonthCompleted(monthIndex, false),
      true
    );
  };

  if (completed) {
    return (
      <TouchableOpacity style={styles.wrap} onPress={reopen} activeOpacity={0.7}>
        <Text style={[styles.label, { color: colors.positive }]}>Mês concluído</Text>
        <View style={[styles.circle, { backgroundColor: colors.positive, borderColor: colors.positive }]}>
          <Ionicons name="checkmark" size={22} color="#fff" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.wrap} onPress={conclude} activeOpacity={0.7}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Concluir mês</Text>
      <View style={[styles.circle, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="checkmark" size={22} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  label: { fontSize: 13, fontWeight: '600', marginRight: 10 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
