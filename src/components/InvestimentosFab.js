// FAB para a aba Investimentos — cria um novo investimento em branco.
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { hapticSuccess } from '../utils/haptics';

export default function InvestimentosFab() {
  const { colors } = useTheme();
  const { addInvestment } = useSettings();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    addInvestment();
    hapticSuccess();
  };

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 86 }]}
      activeOpacity={0.85}
      onPress={handlePress}
    >
      <Ionicons name="trending-up" size={24} color={contrastText(colors.primary)} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
});
