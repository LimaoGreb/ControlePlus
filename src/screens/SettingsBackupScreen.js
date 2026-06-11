import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import { useData } from '../context/DataContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { uploadToDrive, downloadFromDrive } from '../services/googleDrive';
import { contrastText } from '../utils/colorUtils';
import { YEAR } from '../data/initialData';

const BACKUP_FILENAME = `backup-controle-plus-${YEAR}.json`;

export default function SettingsBackupScreen() {
  const { colors } = useTheme();
  const { data, importData } = useData();
  const { token, googleUser, signIn, signOut, loading, ready } = useGoogleAuth();
  const [busy, setBusy] = useState(false);

  // ── Backup local ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setBusy(true);
      const json = JSON.stringify(data, null, 2);
      const uri = FileSystem.cacheDirectory + BACKUP_FILENAME;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup das finanças' });
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
      Alert.alert('Importar backup', 'Isto vai substituir TODOS os dados atuais. Deseja continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Substituir', style: 'destructive', onPress: async () => {
          try { await importData(parsed); Alert.alert('Pronto', 'Backup importado com sucesso!'); }
          catch (e) { Alert.alert('Erro', String(e.message || e)); }
        }},
      ]);
    } catch (err) {
      Alert.alert('Erro ao importar', String(err.message || err));
    }
  };

  // ── Backup Google Drive ───────────────────────────────────────────────────────
  const handleDriveExport = async () => {
    if (!token) { signIn(); return; }
    try {
      setBusy(true);
      await uploadToDrive(token, BACKUP_FILENAME, data);
      Alert.alert('Backup salvo no Drive', `Arquivo "${BACKUP_FILENAME}" salvo na sua conta Google Drive.`);
    } catch (err) {
      if (String(err).includes('401')) {
        signOut();
        Alert.alert('Sessão expirada', 'Faça login com Google novamente.');
      } else {
        Alert.alert('Erro no Drive', String(err.message || err));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDriveImport = async () => {
    if (!token) { signIn(); return; }
    try {
      setBusy(true);
      const result = await downloadFromDrive(token, BACKUP_FILENAME);
      if (!result) { Alert.alert('Não encontrado', `Nenhum arquivo "${BACKUP_FILENAME}" no seu Drive.`); return; }
      const date = new Date(result.modifiedTime).toLocaleString('pt-BR');
      Alert.alert('Restaurar do Drive', `Backup encontrado (${date}).\nIsso vai substituir TODOS os dados atuais.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', style: 'destructive', onPress: async () => {
          try { await importData(result.data); Alert.alert('Pronto', 'Dados restaurados do Google Drive!'); }
          catch (e) { Alert.alert('Erro', String(e.message || e)); }
        }},
      ]);
    } catch (err) {
      Alert.alert('Erro no Drive', String(err.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* Backup local */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BACKUP LOCAL</Text>
        <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 14 }]}>
          Exporta um arquivo JSON pro seu celular. Você escolhe onde salvar.
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

      {/* Backup Google Drive */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GOOGLE DRIVE</Text>

        {googleUser ? (
          <View style={[styles.accountRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            {googleUser.photo
              ? <Image source={{ uri: googleUser.photo }} style={styles.avatar} />
              : <Ionicons name="person-circle" size={38} color={colors.textMuted} />}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.accountName, { color: colors.text }]}>{googleUser.name}</Text>
              <Text style={[styles.accountEmail, { color: colors.textMuted }]}>{googleUser.email}</Text>
            </View>
            <TouchableOpacity onPress={signOut} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="log-out-outline" size={22} color={colors.negative} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 14 }]}>
            Conecte sua conta Google para salvar e restaurar backups diretamente no Drive.
          </Text>
        )}

        {!googleUser ? (
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}
            onPress={signIn} disabled={!ready || loading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[styles.googleBtnText, { color: colors.text }]}>Entrar com Google</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#1a73e8', opacity: busy ? 0.6 : 1, marginTop: 12 }]}
              onPress={handleDriveExport} disabled={busy}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>Salvar backup no Drive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: '#1a73e8', marginTop: 10 }]}
              onPress={handleDriveImport} disabled={busy}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#1a73e8" />
              <Text style={[styles.btnOutlineText, { color: '#1a73e8' }]}>Restaurar do Drive</Text>
            </TouchableOpacity>
          </>
        )}
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
