// Tela inicial — abre direto no mês atual, com saudação personalizada.
import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import MonthContent from '../components/MonthContent';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { userName } = useSettings();
  const currentMonth = new Date().getMonth(); // 0..11

  // Tocar de novo na aba (já ativa) rola pro topo — igual o WhatsApp.
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const greeting = userName && userName.trim() ? `Olá, ${userName.trim()}` : 'Olá!';

  const header = (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Mês Atual</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <MonthContent monthIndex={currentMonth} header={header} scrollRef={scrollRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 14 },
  greeting: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 15, fontWeight: '600', marginTop: 2 },
});
