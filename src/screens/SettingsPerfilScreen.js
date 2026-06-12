import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, Alert, Share, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { telegram } from '../data/bankLogos';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import AvatarPicker from '../components/AvatarPicker';

export default function SettingsPerfilScreen() {
  const { colors } = useTheme();
  const {
    userName, setUserName,
    isInvestor, setIsInvestor,
    makesContributions, setMakesContributions,
    contributionGoalPct, setContributionGoalPct,
    telegramChatId, setTelegramChatId,
  } = useSettings();
  const {
    coupleCode, status, lastSync,
    connect, disconnect, generateCode,
    sharePersonal, setSharePersonal,
    partnerName, setPartnerName,
    FIREBASE_CONFIGURED,
  } = useSync();
  const { token, googleUser, signIn, signOut, loading: googleLoading, ready } = useGoogleAuth();
  const [codeInput, setCodeInput] = useState('');
  const [tgInput, setTgInput] = useState(telegramChatId || '');
  const [connecting, setConnecting] = useState(false);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* Identidade */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AvatarPicker />
        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Seu nome</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="Seu nome ou apelido"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        />
      </View>

      {/* Perfil financeiro */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERFIL FINANCEIRO</Text>

        <View style={styles.rowBetween}>
          <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
            <Ionicons name="trending-up" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Você é um investidor?</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {isInvestor ? 'Aba "Investir" ativada com sua carteira.' : 'Ative para liberar a aba "Investir".'}
              </Text>
            </View>
          </View>
          <Switch value={isInvestor} onValueChange={setIsInvestor} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.rowBetween}>
          <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
            <Ionicons name="heart" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Você faz contribuições?</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {makesContributions ? 'Seção de doações/dízimo ativa.' : 'Ative para registrar doações e dízimo.'}
              </Text>
            </View>
          </View>
          <Switch value={makesContributions} onValueChange={setMakesContributions} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </View>

        {makesContributions && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.text }]}>Meta de contribuição (% da renda)</Text>
            <View style={styles.goalRow}>
              <TextInput
                value={String(contributionGoalPct)}
                onChangeText={(t) => setContributionGoalPct(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                maxLength={3}
                style={[styles.goalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              />
              <Text style={[styles.goalSuffix, { color: colors.textSecondary }]}>% da renda</Text>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted, marginTop: 4 }]}>Padrão 10% (o clássico dízimo).</Text>
          </>
        )}
      </View>

      {/* Modo Casal */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MODO CASAL</Text>

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

            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Código do casal</Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeText, { color: colors.primary, borderColor: colors.border, backgroundColor: colors.cardAlt }]}>{coupleCode}</Text>
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: colors.primary }]}
                onPress={() => Share.share({ message: `Entra no Controle+ e usa este código no Modo Casal: ${coupleCode}` })}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                <Text style={[{ color: colors.primary, fontWeight: '700', fontSize: 14 }]}>Enviar</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Nome do(a) parceiro(a)</Text>
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
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Compartilhar dados pessoais</Text>
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
            <View style={styles.addRow}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase())}
                placeholder="Ex.: A3B9-KZ12"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary, opacity: connecting ? 0.6 : 1 }]}
                disabled={connecting}
                onPress={async () => {
                  if (!codeInput.trim()) return;
                  setConnecting(true);
                  try { await connect(codeInput); setCodeInput(''); }
                  catch (e) { Alert.alert('Erro', String(e.message || e)); }
                  finally { setConnecting(false); }
                }}
              >
                <Ionicons name="link-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

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
              <Text style={[styles.btnText]}>Gerar novo código</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Jarvis — Telegram */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>JARVIS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <SvgXml xml={telegram} width={38} height={38} style={{ borderRadius: 10 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Jarvis — Telegram</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>Cole seu chatId para receber despesas pelo bot</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Ex: 8750225106"
            placeholderTextColor={colors.textMuted}
            value={tgInput}
            onChangeText={setTgInput}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.tgBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setTelegramChatId(tgInput);
              Alert.alert('Jarvis vinculado!', 'Despesas enviadas pelo bot vão aparecer no app automaticamente.');
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Google */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTA GOOGLE</Text>

        {googleUser ? (
          <>
            <View style={[styles.googleAccountRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              {googleUser.photo
                ? <Image source={{ uri: googleUser.photo }} style={styles.googleAvatar} />
                : <Ionicons name="person-circle" size={44} color={colors.textMuted} />}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.googleName, { color: colors.text }]}>{googleUser.name}</Text>
                <Text style={[styles.googleEmail, { color: colors.textMuted }]}>{googleUser.email}</Text>
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10, marginBottom: 14 }]}>
              Conta conectada. Use o backup por Google Drive na tela de Backup.
            </Text>

            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: colors.negative }]}
              onPress={() => Alert.alert('Desconectar Google', 'Deseja sair da conta Google? O backup pelo Drive ficará indisponível.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: signOut },
              ])}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.negative} />
              <Text style={[styles.btnOutlineText, { color: colors.negative }]}>Sair da conta Google</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 16 }]}>
              Entre com Google para habilitar backup e restauração automática dos seus dados pelo Google Drive.
            </Text>
            <TouchableOpacity
              style={[styles.googleSignInBtn, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}
              onPress={signIn}
              disabled={!ready || googleLoading}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={[styles.googleSignInText, { color: colors.text }]}>
                {googleLoading ? 'Conectando…' : 'Entrar com Google'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  toggleLabel: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { height: 1, marginVertical: 14 },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalInput: { width: 80, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  goalSuffix: { fontSize: 15, fontWeight: '600', marginLeft: 10 },
  syncRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  syncText: { fontSize: 14, fontWeight: '700' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: 3, textAlign: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
  btnText: { fontSize: 16, fontWeight: '800', marginLeft: 8, color: '#fff' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14 },
  btnOutlineText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  googleAccountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14 },
  googleAvatar: { width: 44, height: 44, borderRadius: 22 },
  googleName: { fontSize: 15, fontWeight: '700' },
  googleEmail: { fontSize: 12, marginTop: 2 },
  googleSignInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, gap: 10 },
  googleG: { fontSize: 18, fontWeight: '900', color: '#1a73e8' },
  googleSignInText: { fontSize: 15, fontWeight: '700' },
  jarvisIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5A52418' },
  tgBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
});
