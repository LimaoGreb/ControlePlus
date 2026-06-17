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
  { key: 'SettingsTemas',   icon: 'color-palette-outline', label: 'Temas',               desc: 'Tema escuro e paleta de cores' },
  { key: 'SettingsBackup',  icon: 'cloud-upload-outline',  label: 'Backup',              desc: 'Exportar e importar dados (JSON)' },
];

function InfoRow({ label, value, colors, first }) {
  return (
    <View style={[styles.infoRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '40' }]}>
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

      {/* ── Nav para sub-telas ── */}
      <View style={styles.section}>
        {SECTIONS.map((s, i) => {
          const b = badge(s.key);
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '40' },
              ]}
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

      {/* ── Sobre o app ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SOBRE O APP</Text>
      </View>
      <View style={styles.section}>
        <InfoRow label="Nome" value="Controle+" colors={colors} first />
        <InfoRow label="Versão" value={Constants.expoConfig?.version || '2.0.5'} colors={colors} />
        <InfoRow label="Ano de controle" value={String(YEAR)} colors={colors} />
        <InfoRow label="Armazenamento" value="Local (AsyncStorage)" colors={colors} />
        <InfoRow label="Plataforma" value={Platform.OS} colors={colors} />
        <InfoRow label="Desenvolvido por" value="Kowalsky" colors={colors} />
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Seus dados ficam apenas no aparelho. Faça backups com a exportação.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  section: { marginBottom: 24 },
  sectionHeader: {
    borderLeftWidth: 3, marginLeft: 16,
    paddingLeft: 13, paddingRight: 16, paddingVertical: 12,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowDesc: { fontSize: 12, marginTop: 1 },
  badge: { fontSize: 14, fontWeight: '800', marginRight: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
});
