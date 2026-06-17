import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { telegram } from '../data/bankLogos';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
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
  const [codeInput, setCodeInput] = useState('');
  const [tgInput, setTgInput] = useState(telegramChatId || '');
  const [connecting, setConnecting] = useState(false);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* ── Identidade ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>IDENTIDADE</Text>
      </View>
      <View style={styles.avatarWrap}>
        <AvatarPicker />
      </View>
      <View style={[styles.inputWrap, { borderTopColor: colors.border + '40' }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SEU NOME</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="Seu nome ou apelido"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
        />
      </View>

      {/* ── Perfil Financeiro ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary, marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERFIL FINANCEIRO</Text>
      </View>

      <View style={[styles.toggleRow, { borderTopColor: colors.border + '40' }]}>
        <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="trending-up" size={18} color={colors.primary} />
        </View>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Você é um investidor?</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {isInvestor ? 'Aba "Investir" ativada.' : 'Ative para liberar a aba "Investir".'}
          </Text>
        </View>
        <Switch value={isInvestor} onValueChange={setIsInvestor} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
      </View>

      <View style={[styles.toggleRow, { borderTopColor: colors.border + '40' }]}>
        <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="heart" size={18} color={colors.primary} />
        </View>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Você faz contribuições?</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {makesContributions ? 'Seção de doações/dízimo ativa.' : 'Ative para registrar doações e dízimo.'}
          </Text>
        </View>
        <Switch value={makesContributions} onValueChange={setMakesContributions} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
      </View>

      {makesContributions && (
        <View style={[styles.inputWrap, { borderTopColor: colors.border + '40' }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>META DE CONTRIBUIÇÃO (% DA RENDA)</Text>
          <View style={styles.goalRow}>
            <TextInput
              value={String(contributionGoalPct)}
              onChangeText={(t) => setContributionGoalPct(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              maxLength={3}
              style={[styles.goalInput, { backgroundColor: colors.inputBg, color: colors.text }]}
            />
            <Text style={[styles.goalSuffix, { color: colors.textSecondary }]}>% da renda</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 4 }]}>Padrão 10% (o clássico dízimo).</Text>
        </View>
      )}

      {/* ── Modo Casal ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary, marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MODO CASAL</Text>
      </View>

      {!FIREBASE_CONFIGURED ? (
        <Text style={[styles.blockHint, { color: colors.textMuted }]}>
          Para ativar, configure o Firebase gratuito no arquivo{' '}
          <Text style={{ fontWeight: '800' }}>src/services/firebase.js</Text>.{'\n\n'}
          1. Acesse console.firebase.google.com{'\n'}
          2. Crie um projeto → Realtime Database → "Modo de teste"{'\n'}
          3. Configurações ⚙️ → Adicionar app Web → copie o firebaseConfig{'\n'}
          4. Cole no arquivo e reinicie o app
        </Text>
      ) : coupleCode ? (
        <>
          <View style={[styles.syncRow, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80', borderTopColor: colors.border + '40' }]}>
            <View style={[styles.syncDot, { backgroundColor: status === 'synced' ? '#2BB673' : status === 'error' ? '#E5484D' : '#F5A524' }]} />
            <Text style={[styles.syncText, { color: colors.text }]}>
              {status === 'synced' ? 'Sincronizado' : status === 'syncing' ? 'Sincronizando…' : status === 'error' ? 'Erro de conexão' : 'Conectando…'}
              {lastSync && status === 'synced' ? `  ·  ${new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </Text>
          </View>

          <View style={[styles.inputWrap, { borderTopColor: colors.border + '40' }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CÓDIGO DO CASAL</Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeText, { color: colors.primary, backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>{coupleCode}</Text>
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: colors.primary }]}
                onPress={() => Share.share({ message: `Entra no Controle+ e usa este código no Modo Casal: ${coupleCode}` })}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputWrap, { borderTopColor: colors.border + '40' }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOME DO(A) PARCEIRO(A)</Text>
            <TextInput
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder="Nome ou apelido dele(a)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopColor: colors.border + '40' }]}>
            <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="lock-open-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Compartilhar dados pessoais</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>Permite que seu/sua parceiro(a) veja suas despesas e renda.</Text>
            </View>
            <Switch value={sharePersonal} onValueChange={setSharePersonal} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
          </View>

          <TouchableOpacity
            style={[styles.dangerRow, { borderTopColor: colors.border + '40' }]}
            onPress={() => Alert.alert('Desconectar', 'Sair do Modo Casal? Seus dados locais são mantidos.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Desconectar', style: 'destructive', onPress: disconnect },
            ])}
          >
            <Ionicons name="unlink-outline" size={18} color={colors.negative} />
            <Text style={[styles.dangerText, { color: colors.negative }]}>Desconectar do casal</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.blockHint, { color: colors.textMuted }]}>
            Crie um código ou insira o código do(a) parceiro(a) para sincronizar em tempo real.
          </Text>

          <View style={[styles.inputWrap, { borderTopColor: colors.border + '40' }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ENTRAR COM CÓDIGO EXISTENTE</Text>
            <View style={styles.addRow}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase())}
                placeholder="Ex.: A3B9-KZ12"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text }]}
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
          </View>

          <View style={[styles.orRow, { borderTopColor: colors.border + '40' }]}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.textMuted }]}>ou</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={async () => { try { await connect(generateCode()); } catch (e) { Alert.alert('Erro', String(e.message || e)); } }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Gerar novo código</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Jarvis ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary, marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>JARVIS</Text>
      </View>

      <View style={[styles.inputWrap, { borderTopColor: colors.border + '40' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <SvgXml xml={telegram} width={36} height={36} style={{ borderRadius: 9, marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Jarvis — Telegram</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>Cole seu chatId para receber despesas pelo bot</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text }]}
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },

  sectionHeader: {
    borderLeftWidth: 3, marginLeft: 16,
    paddingLeft: 13, paddingRight: 16, paddingVertical: 12,
    marginBottom: 0,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },

  avatarWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },

  inputWrap: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 4 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  blockHint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingVertical: 12 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  toggleIconWrap: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '700' },

  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalInput: { width: 80, height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  goalSuffix: { fontSize: 15, fontWeight: '600', marginLeft: 10 },

  syncRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16, borderRadius: 10,
  },
  syncDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  syncText: { fontSize: 14, fontWeight: '700' },

  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: 3, textAlign: 'center', borderRadius: 10, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth },
  shareBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderWidth: 1.5 },

  dangerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dangerText: { fontSize: 14, fontWeight: '700' },

  addRow: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  orRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
  btnText: { fontSize: 16, fontWeight: '800', marginLeft: 8, color: '#fff' },

  tgBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
});
