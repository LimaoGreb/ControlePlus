// Hub de configurações — cada seção navega para uma tela própria.
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
import { YEAR } from '../data/initialData';

const SECTIONS = [
  { key: 'SettingsPerfil',  icon: 'person-outline',        label: 'Perfil',              desc: 'Nome, foto, investidor, contribuições e modo casal' },
  { key: 'SettingsCartoes', icon: 'card-outline',          label: 'Formas de Pagamento', desc: 'Cartões e métodos de pagamento' },
  { key: 'SettingsBudget', icon: 'wallet-outline',        label: 'Orçamento',           desc: 'Limites mensais por categoria de gasto' },
  { key: 'SettingsTemas',   icon: 'color-palette-outline', label: 'Temas',               desc: 'Tema escuro e paleta de cores' },
  { key: 'SettingsBackup',  icon: 'cloud-upload-outline',  label: 'Backup',              desc: 'Exportar e importar dados (JSON)' },
];

function Info({ label, value, colors }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { paymentMethods } = useSettings();
  const { coupleCode, status } = useSync();

  function badge(key) {
    if (key === 'SettingsCartoes') return paymentMethods.length ? `${paymentMethods.length}` : null;
    if (key === 'SettingsCasal') return coupleCode ? (status === 'synced' ? '●' : '○') : null;
    return null;
  }

  function badgeColor(key) {
    if (key === 'SettingsCasal') return status === 'synced' ? '#2BB673' : '#F5A524';
    return colors.textSecondary;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {SECTIONS.map((s, i) => {
          const b = badge(s.key);
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.row, i < SECTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate(s.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name={s.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{s.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{s.desc}</Text>
              </View>
              {b && <Text style={[styles.badge, { color: badgeColor(s.key) }]}>{b}</Text>}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SOBRE O APP</Text>
        <Info label="Nome" value="Controle+" colors={colors} />
        <Info label="Versão" value={Constants.expoConfig?.version || '2.0.5'} colors={colors} />
        <Info label="Ano de controle" value={String(YEAR)} colors={colors} />
        <Info label="Armazenamento" value="Local (AsyncStorage)" colors={colors} />
        <Info label="Plataforma" value={Platform.OS} colors={colors} />
        <Info label="Desenvolvido por" value="Kowalsky" colors={colors} />
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10 }]}>
          Seus dados ficam apenas no aparelho. Faça backups com a exportação.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 16, paddingTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowDesc: { fontSize: 12, marginTop: 1 },
  badge: { fontSize: 14, fontWeight: '800', marginRight: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 16 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 14 },
});
