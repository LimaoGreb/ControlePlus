// Tela inicial — abre direto no mês atual, com header fixo estilo WhatsApp.
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useScrollToTop, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MonthContent from '../components/MonthContent';
import Avatar from '../components/Avatar';
import QuickAddFab from '../components/QuickAddFab';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
import { MONTH_NAMES } from '../data/initialData';

const MENU_ITEMS = [
  { key: 'perfil',   screen: 'SettingsPerfil',  icon: 'person-outline',       label: 'Perfil' },
  { key: 'cartoes',  screen: 'SettingsCartoes', icon: 'card-outline',          label: 'Pagamentos' },
  { key: 'temas',    screen: 'SettingsTemas',   icon: 'color-palette-outline', label: 'Temas' },
  { key: 'backup',   screen: 'SettingsBackup',  icon: 'cloud-upload-outline',  label: 'Backup' },
  { key: 'geral',    screen: 'Settings',        icon: 'settings-outline',      label: 'Configurações' },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { userName, avatar } = useSettings();
  const { activeProfile, partnerName, partnerAvatar, partnerPersonalData } = useSync();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentMonth = new Date().getMonth();

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const isPartnerMode = activeProfile === 'partner' && !!partnerPersonalData;
  const displayName = isPartnerMode ? (partnerName || 'Parceiro(a)') : (userName || '');
  const displayAvatar = isPartnerMode ? partnerAvatar : avatar;
  const firstName = displayName.trim() ? displayName.trim().split(' ')[0] : null;
  const greeting = firstName ? `Olá, ${firstName}` : 'Olá!';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header fixo — fica no topo independente do scroll ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background }]}>

        {/* Linha 1: avatar + saudação + três pontinhos */}
        <View style={styles.topRow}>
          <Avatar avatar={displayAvatar} size={44} />
          <View style={styles.titleGroup}>
            <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>{greeting}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{MONTH_NAMES[currentMonth]} · Dashboard</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Chat')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 14 }}
          >
            <MaterialCommunityIcons name="robot-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Linha 2: barra de pesquisa */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderWidth: search.length > 0 ? 1 : 0, borderColor: colors.primary + '60' }]}>
          <Ionicons name="search-outline" size={15} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar despesa..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Conteúdo do mês — rola por baixo do header fixo ── */}
      <MonthContent
        monthIndex={currentMonth}
        scrollRef={scrollRef}
        searchTerm={search}
      />
      <QuickAddFab monthIndex={currentMonth} />

      {/* ── Dropdown dos três pontinhos ── */}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View
            style={[styles.dropdown, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              top: insets.top + 58,
            }]}
          >
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => { setMenuOpen(false); navigation.navigate(item.screen); }}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleGroup: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '400', paddingVertical: 0 },
  overlay: { flex: 1 },
  dropdown: {
    position: 'absolute',
    right: 16,
    minWidth: 210,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuLabel: { fontSize: 15, fontWeight: '600' },
});
