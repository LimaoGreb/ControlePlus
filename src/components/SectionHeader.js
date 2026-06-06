// Cabeçalho de seção com título, ícone e total.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL } from '../utils/currency';

export default function SectionHeader({ icon, title, total, color }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Ionicons name={icon} size={20} color={color || colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.total, { color: color || colors.text }]}>
        {formatBRL(total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', marginLeft: 8 },
  total: { fontSize: 16, fontWeight: '800' },
});
