import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSync } from '../context/SyncContext';

export default function SettingsCasalScreen() {
  const { colors } = useTheme();
  const { coupleCode, status, lastSync, connect, disconnect, generateCode, sharePersonal, setSharePersonal, partnerName, setPartnerName, FIREBASE_CONFIGURED } = useSync();
  const route = useRoute();
  const inputRefs = useRef([]);
  const [chars, setChars] = useState(() => {
    const seed = (route.params?.code || '').replace('-', '');
    return Array(8).fill('').map((_, i) => seed[i] || '');
  });
  const [connecting, setConnecting] = useState(false);

  const fullCode = chars.slice(0, 4).join('') + '-' + chars.slice(4).join('');
  const isComplete = chars.every(c => c !== '');

  const handleChar = (index, value) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...chars];
    next[index] = char;
    setChars(next);
    if (char && index < 7) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !chars[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    const deepCode = route.params?.code;
    if (deepCode && !coupleCode) {
      setConnecting(true);
      connect(deepCode)
        .catch(e => Alert.alert('Erro ao conectar', String(e.message || e)))
        .finally(() => setConnecting(false));
    }
  }, []);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {!FIREBASE_CONFIGURED ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Para ativar, configure o Firebase gratuito no arquivo{' '}
            <Text style={{ fontWeight: '800' }}>src/services/firebase.js</Text>.{'\n\n'}
            1. Acesse console.firebase.google.com{'\n'}
            2. Crie um projeto → Realtime Database → "Modo de teste"{'\n'}
            3. Configurações ⚙️ → Adicionar app Web → copie o firebaseConfig{'\n'}
            4. Cole no arquivo e reinicie o app
          </Text>
        ) : coupleCode ? (
          <>
            <View style={[styles.syncRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={[styles.dot, { backgroundColor: status === 'synced' ? '#2BB673' : status === 'error' ? '#E5484D' : '#F5A524' }]} />
              <Text style={[styles.syncText, { color: colors.text }]}>
                {status === 'synced' ? 'Sincronizado' : status === 'syncing' ? 'Sincronizando…' : status === 'error' ? 'Erro de conexão' : 'Conectando…'}
                {lastSync && status === 'synced' ? `  ·  ${new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Código do casal</Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeText, { color: colors.primary, borderColor: colors.border, backgroundColor: colors.cardAlt }]}>{coupleCode}</Text>
              <TouchableOpacity style={[styles.shareBtn, { borderColor: colors.primary }]} onPress={() => Share.share({ message: `💑 Me conecta no Controle+!\nToca no link para entrar no Modo Casal direto:\n\nbr.kowalsky.financeapp://casal/${coupleCode}` })}>
                <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                <Text style={[{ color: colors.primary, fontWeight: '700', fontSize: 14 }]}>Enviar</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Nome do(a) parceiro(a)</Text>
            <TextInput
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder="Nome ou apelido dele(a)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            />

            <View style={[styles.rowBetween, { marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
                <Ionicons name="lock-open-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Compartilhar dados pessoais</Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>Permite que seu/sua parceiro(a) veja suas despesas e renda.</Text>
                </View>
              </View>
              <Switch value={sharePersonal} onValueChange={setSharePersonal} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>

            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: colors.negative, marginTop: 14 }]}
              onPress={() => Alert.alert('Desconectar', 'Sair do Modo Casal? Seus dados locais são mantidos.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Desconectar', style: 'destructive', onPress: disconnect },
              ])}
            >
              <Ionicons name="unlink-outline" size={20} color={colors.negative} />
              <Text style={[styles.btnOutlineText, { color: colors.negative }]}>Desconectar do casal</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 14 }]}>
              Crie um código ou insira o código do(a) parceiro(a) para sincronizar em tempo real.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Entrar com código existente</Text>
            <View style={styles.codeBoxRow}>
              {[0, 1, 2, 3].map(i => (
                <TextInput
                  key={i}
                  ref={r => { inputRefs.current[i] = r; }}
                  value={chars[i]}
                  onChangeText={v => handleChar(i, v)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                  maxLength={1}
                  autoCapitalize="characters"
                  style={[styles.charBox, { backgroundColor: colors.inputBg, color: colors.text, borderColor: chars[i] ? colors.primary : colors.border }]}
                />
              ))}
              <Text style={[styles.dashSep, { color: colors.textMuted }]}>–</Text>
              {[4, 5, 6, 7].map(i => (
                <TextInput
                  key={i}
                  ref={r => { inputRefs.current[i] = r; }}
                  value={chars[i]}
                  onChangeText={v => handleChar(i, v)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                  maxLength={1}
                  autoCapitalize="characters"
                  style={[styles.charBox, { backgroundColor: colors.inputBg, color: colors.text, borderColor: chars[i] ? colors.primary : colors.border }]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: (connecting || !isComplete) ? 0.5 : 1, marginTop: 12 }]}
              disabled={connecting || !isComplete}
              onPress={async () => {
                setConnecting(true);
                try { await connect(fullCode); setChars(Array(8).fill('')); }
                catch (e) { Alert.alert('Erro', String(e.message || e)); }
                finally { setConnecting(false); }
              }}
            >
              <Ionicons name="link-outline" size={20} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>{connecting ? 'Conectando…' : 'Conectar'}</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.textMuted }]}>ou</Text>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={async () => { try { await connect(generateCode()); } catch (e) { Alert.alert('Erro', String(e.message || e)); } }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>Gerar novo código</Text>
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
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  syncRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  syncText: { fontSize: 14, fontWeight: '700' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: 3, textAlign: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  codeBoxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  charBox: { width: 36, height: 48, borderWidth: 1.5, borderRadius: 10, textAlign: 'center', fontSize: 18, fontWeight: '900', letterSpacing: 0 },
  dashSep: { fontSize: 22, fontWeight: '300', marginHorizontal: 2 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginBottom: 10 },
  btnText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14 },
  btnOutlineText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
});
