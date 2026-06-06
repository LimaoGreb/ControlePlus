// Tela inicial — abre direto no mês atual, com saudação personalizada.
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useScrollToTop, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MonthContent from '../components/MonthContent';
import Avatar from '../components/Avatar';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { userName, avatar } = useSettings();
  const navigation = useNavigation();
  const currentMonth = new Date().getMonth(); // 0..11

  // Tocar de novo na aba (já ativa) rola pro topo — igual o WhatsApp.
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const greeting = userName && userName.trim() ? `Olá, ${userName.trim()}` : 'Olá!';

  const header = (
    <View style={styles.header}>
      <Avatar avatar={avatar} size={52} />
      <View style={styles.headerText}>
        <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Mês Atual</Text>
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.gear, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Ionicons name="settings-outline" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <MonthContent monthIndex={currentMonth} header={header} scrollRef={scrollRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerText: { marginLeft: 12, flex: 1 },
  greeting: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  gear: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
