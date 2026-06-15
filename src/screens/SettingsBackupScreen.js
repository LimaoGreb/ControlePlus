import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
import { contrastText } from '../utils/colorUtils';
import { YEAR } from '../data/initialData';

const BACKUP_FILENAME = `backup-controle-plus-${YEAR}.json`;

export default function SettingsBackupScreen() {
  const { colors, mode, paletteId, toggleTheme, setPalette } = useTheme();
  const { data, importData } = useData();
  const {
    userName, avatar, paymentMethods, isInvestor, investments,
    projects, makesContributions, contributionGoalPct, importSettings,
  } = useSettings();
  const { coupleCode, connect } = useSync();
  const [busy, setBusy] = useState(false);

  const buildBackup = () => ({
    version: '2.0.1',
    exportedAt: new Date().toISOString(),
    data,
    settings: {
      userName, avatar, paymentMethods, isInvestor, investments,
      projects, makesContributions, contributionGoalPct,
    },
    theme: { mode, paletteId },
    coupleCode: coupleCode || null,
  });

  const restoreBackup = async (parsed) => {
    const financialData = parsed.data ?? parsed;
    await importData(financialData);

    if (parsed.settings) {
      await importSettings(parsed.settings);
    }

    if (parsed.theme) {
      setPalette(parsed.theme.paletteId);
      if (parsed.theme.mode && parsed.theme.mode !== mode) {
        toggleTheme();
      }
    }

    if (parsed.coupleCode) {
      try { await connect(parsed.coupleCode); } catch (_) {}
    }
  };

  // ── Backup local ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setBusy(true);
      const json = JSON.stringify(buildBackup(), null, 2);
      const uri = FileSystem.cacheDirectory + BACKUP_FILENAME;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup completo' });
      } else {
        Alert.alert('Backup criado', `Arquivo salvo em:\n${uri}`);
      }
    } catch (err) {
      Alert.alert('Erro ao exportar', String(err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(content);
      Alert.alert('Importar backup', 'Isso vai substituir TODOS os dados e configurações atuais. Deseja continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', style: 'destructive', onPress: async () => {
          try {
            await restoreBackup(parsed);
            Alert.alert('Pronto', 'Backup restaurado com sucesso!');
          } catch (e) { Alert.alert('Erro', String(e.message || e)); }
        }},
      ]);
    } catch (err) {
      Alert.alert('Erro ao importar', String(err.message || err));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* Backup local */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BACKUP LOCAL</Text>
        <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 14 }]}>
          Exporta um arquivo JSON completo: dados financeiros, perfil, cartões, configurações e tema.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          onPress={handleExport} disabled={busy}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={contrastText(colors.primary)} />
          <Text style={[styles.btnText, { color: contrastText(colors.primary) }]}>Exportar JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.primary, marginTop: 10 }]} onPress={handleImport}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          <Text style={[styles.btnOutlineText, { color: colors.primary }]}>Importar JSON</Text>
        </TouchableOpacity>
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
  btnText: { fontSize: 15, fontWeight: '800', marginLeft: 8 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14 },
  btnOutlineText: { fontSize: 15, fontWeight: '800', marginLeft: 8 },
  accountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  accountName: { fontSize: 14, fontWeight: '700' },
  accountEmail: { fontSize: 12, marginTop: 1 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#1a73e8' },
  googleBtnText: { fontSize: 15, fontWeight: '700' },
});
