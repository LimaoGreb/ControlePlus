// Configurações: perfil, formas de pagamento, tema + paletas, backup e sobre.
import React, { useState, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import CollapsibleCard from '../components/CollapsibleCard';
import AvatarPicker from '../components/AvatarPicker';
import { YEAR } from '../data/initialData';
import { useSync } from '../context/SyncContext';

function Card({ title, colors, children }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title && <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>}
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, mode, toggleTheme, palettes, paletteId, setPalette } = useTheme();
  const { data, importData } = useData();
  const {
    userName,
    setUserName,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    updatePaymentMethod,
    setPaymentCredit,
    isInvestor,
    setIsInvestor,
    makesContributions,
    setMakesContributions,
    contributionGoalPct,
    setContributionGoalPct,
  } = useSettings();
  const { coupleCode, status, lastSync, connect, disconnect, generateCode, sharePersonal, setSharePersonal, partnerName, setPartnerName, FIREBASE_CONFIGURED } = useSync();
  const [busy, setBusy] = useState(false);
  const [newPayment, setNewPayment] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const handleAddPayment = () => {
    if (addPaymentMethod(newPayment)) setNewPayment('');
  };

  const handleExport = async () => {
    try {
      setBusy(true);
      const json = JSON.stringify(data, null, 2);
      const fileName = `backup-financas-${YEAR}.json`;
      const uri = FileSystem.cacheDirectory + fileName;
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
      if (res.canceled || !res.assets || !res.assets.length) return;
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(content);
      Alert.alert('Importar backup', 'Isto vai substituir TODOS os dados atuais. Deseja continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Substituir',
          style: 'destructive',
          onPress: async () => {
            try {
              await importData(parsed);
              Alert.alert('Pronto', 'Backup importado com sucesso!');
            } catch (e) {
              Alert.alert('Erro', String(e.message || e));
            }
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Erro ao importar', String(err.message || err));
    }
  };

  return (
    <ScrollView ref={scrollRef} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {/* Perfil */}
      <Card title="Perfil" colors={colors}>
        <AvatarPicker />
        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Seu nome</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="Seu nome ou apelido"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        />
      </Card>

      {/* Formas de pagamento */}
      <Card title={`Formas de pagamento (${paymentMethods.length})`} colors={colors}>
        {paymentMethods.length === 0 && (
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10 }]}>
            Nenhuma cadastrada. Adicione para escolher na hora de lançar despesas.
          </Text>
        )}
        {paymentMethods.map((pm) => (
          <View key={pm.id} style={[styles.pmRow, { borderColor: colors.border }]}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <TextInput
              value={pm.name}
              onChangeText={(t) => updatePaymentMethod(pm.id, t)}
              placeholder="Nome (ex.: Crédito Nubank)"
              placeholderTextColor={colors.textMuted}
              style={[styles.pmNameInput, { color: colors.text }]}
            />
            <TouchableOpacity
              onPress={() => setPaymentCredit(pm.id, !pm.isCredit)}
              style={[
                styles.creditChip,
                {
                  backgroundColor: pm.isCredit ? colors.primary : 'transparent',
                  borderColor: pm.isCredit ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.creditChipText, { color: pm.isCredit ? contrastText(colors.primary) : colors.textMuted }]}>
                Crédito
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removePaymentMethod(pm.id)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
              <Ionicons name="trash-outline" size={20} color={colors.negative} />
            </TouchableOpacity>
          </View>
        ))}
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 2, marginBottom: 10 }]}>
          Marque "Crédito" nos cartões — ao escolher um deles numa despesa, o app pergunta o parcelamento.
        </Text>

        <View style={styles.pmAddRow}>
          <TextInput
            value={newPayment}
            onChangeText={setNewPayment}
            placeholder="Ex.: PIX, Crédito Nubank, Boleto"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleAddPayment}
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          />
          <TouchableOpacity
            onPress={handleAddPayment}
            style={[styles.pmAddBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={24} color={contrastText(colors.primary)} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Investidor */}
      <Card title="Investimentos" colors={colors}>
        <View style={styles.rowBetween}>
          <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
            <Ionicons name="trending-up" size={22} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 10 }]}>
              Você é um investidor?
            </Text>
          </View>
          <Switch
            value={isInvestor}
            onValueChange={setIsInvestor}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>
          {isInvestor
            ? 'A aba "Investir" está ativada na barra inferior, com sua carteira e rentabilidade.'
            : 'Ative para liberar a aba "Investir", onde você acompanha sua carteira (renda fixa, ações, FIIs, cripto...) e a rentabilidade.'}
        </Text>
      </Card>

      {/* Contribuições */}
      <Card title="Contribuições" colors={colors}>
        <View style={styles.rowBetween}>
          <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
            <Ionicons name="heart" size={22} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 10 }]}>
              Você faz contribuições?
            </Text>
          </View>
          <Switch
            value={makesContributions}
            onValueChange={setMakesContributions}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>
          {makesContributions
            ? 'A seção "Contribuições" aparece em cada mês (doações, dízimo, ofertas...), com meta de % da renda.'
            : 'Ative para registrar doações, dízimo e ofertas em cada mês, com meta de % da renda.'}
        </Text>

        {makesContributions && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: colors.text }]}>Meta (% da renda)</Text>
            <View style={styles.goalInputRow}>
              <TextInput
                value={String(contributionGoalPct)}
                onChangeText={(t) => setContributionGoalPct(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                maxLength={3}
                style={[styles.goalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              />
              <Text style={[styles.goalSuffix, { color: colors.textSecondary }]}>% da renda</Text>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted, marginTop: 6 }]}>
              Padrão 10% (o clássico dízimo). Defina o valor que fizer sentido pra você.
            </Text>
          </View>
        )}
      </Card>

      {/* Tema e cores */}
      <CollapsibleCard
        title="Tema e cores"
        icon="color-palette-outline"
        right={`${(palettes.find((p) => p.id === paletteId) || {}).name || ''} · ${mode === 'dark' ? 'Escuro' : 'Claro'}`}
      >
        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon" size={22} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 10 }]}>Tema escuro</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Paleta de cores</Text>
        <View style={styles.paletteGrid}>
          {palettes.map((p) => {
            const selected = p.id === paletteId;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPalette(p.id)}
                style={[
                  styles.swatchCard,
                  { borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2.5 : 1 },
                ]}
              >
                <View style={styles.swatchStripes}>
                  {p.swatches.map((c, i) => (
                    <View key={i} style={[styles.stripe, { backgroundColor: c }]} />
                  ))}
                </View>
                <View style={styles.swatchFooter}>
                  <Text style={[styles.swatchName, { color: colors.text }]}>{p.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </CollapsibleCard>

      {/* Modo Casal */}
      <CollapsibleCard title="Modo Casal" icon="heart-outline">
        {!FIREBASE_CONFIGURED ? (
          <View>
            <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10 }]}>
              Para ativar, configure o Firebase gratuito no arquivo{' '}
              <Text style={{ fontWeight: '800' }}>src/services/firebase.js</Text>.{'\n\n'}
              1. Acesse console.firebase.google.com{'\n'}
              2. Crie um projeto → Realtime Database → "Modo de teste"{'\n'}
              3. Configurações ⚙️ → Adicionar app Web → copie o firebaseConfig{'\n'}
              4. Cole no arquivo e reinicie o app
            </Text>
          </View>
        ) : coupleCode ? (
          <View>
            <View style={[styles.syncStatusRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={[styles.syncDot, { backgroundColor: status === 'synced' ? '#2BB673' : status === 'error' ? '#E5484D' : '#F5A524' }]} />
              <Text style={[styles.syncStatusText, { color: colors.text }]}>
                {status === 'synced' ? 'Sincronizado' : status === 'syncing' ? 'Sincronizando…' : status === 'error' ? 'Erro de conexão' : 'Conectando…'}
                {lastSync && status === 'synced' ? `  ·  ${new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Código do casal</Text>
            <View style={styles.codeDisplayRow}>
              <Text style={[styles.codeText, { color: colors.primary, borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                {coupleCode}
              </Text>
              <TouchableOpacity
                style={[styles.shareCodeBtn, { borderColor: colors.primary }]}
                onPress={() => Share.share({ message: `Entra no Controle+ e usa este código no Modo Casal: ${coupleCode}` })}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                <Text style={[styles.shareCodeText, { color: colors.primary }]}>Enviar</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted, marginTop: 6 }]}>
              Compartilhe este código com seu(ua) parceiro(a). Quando ele(a) entrar com o mesmo código, vocês ficam sincronizados automaticamente.
            </Text>

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
                  <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Compartilhar dados pessoais</Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Permite que seu/sua parceiro(a) veja e edite suas despesas e renda pessoais.
                  </Text>
                </View>
              </View>
              <Switch
                value={sharePersonal}
                onValueChange={setSharePersonal}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: colors.negative, marginTop: 14 }]}
              onPress={() => Alert.alert('Desconectar', 'Sair do Modo Casal? Seus dados locais são mantidos.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Desconectar', style: 'destructive', onPress: disconnect },
              ])}
            >
              <Ionicons name="unlink-outline" size={20} color={colors.negative} />
              <Text style={[styles.actionTextOutline, { color: colors.negative }]}>Desconectar do casal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 14 }]}>
              Crie um código ou insira o código do(a) seu/sua parceiro(a) para manter os dados sincronizados em tempo real.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Entrar com código existente</Text>
            <View style={styles.pmAddRow}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase())}
                placeholder="Ex.: A3B9-KZ12"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity
                style={[styles.pmAddBtn, { backgroundColor: colors.primary, opacity: connecting ? 0.6 : 1 }]}
                disabled={connecting}
                onPress={async () => {
                  if (!codeInput.trim()) return;
                  setConnecting(true);
                  try {
                    await connect(codeInput);
                    setCodeInput('');
                  } catch (e) {
                    Alert.alert('Erro', String(e.message || e));
                  } finally {
                    setConnecting(false);
                  }
                }}
              >
                <Ionicons name="link-outline" size={22} color={colors.onPrimary || '#fff'} />
              </TouchableOpacity>
            </View>

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.textMuted }]}>ou</Text>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                const code = generateCode();
                try {
                  await connect(code);
                } catch (e) {
                  Alert.alert('Erro', String(e.message || e));
                }
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.onPrimary || '#fff'} />
              <Text style={[styles.actionText, { color: colors.onPrimary || '#fff' }]}>Gerar novo código</Text>
            </TouchableOpacity>
          </View>
        )}
      </CollapsibleCard>

      {/* Backup */}
      <CollapsibleCard title="Backup" icon="save-outline">
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={busy}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={contrastText(colors.primary)} />
          <Text style={[styles.actionText, { color: contrastText(colors.primary) }]}>Exportar dados (JSON)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: colors.primary }]} onPress={handleImport}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionTextOutline, { color: colors.primary }]}>Importar dados (JSON)</Text>
        </TouchableOpacity>
      </CollapsibleCard>

      {/* Sobre */}
      <Card title="Sobre o app" colors={colors}>
        <Info label="Nome" value="Controle+" colors={colors} />
        <Info label="Versão" value="1.8.1" colors={colors} />
        <Info label="Ano de controle" value={String(YEAR)} colors={colors} />
        <Info label="Armazenamento" value="Local (AsyncStorage)" colors={colors} />
        <Info label="Plataforma" value={Platform.OS} colors={colors} />
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10 }]}>
          Seus dados ficam apenas no aparelho. Faça backups com a exportação.
        </Text>
      </Card>

      <View style={{ height: 96 }} />
    </ScrollView>
  );
}

function Info({ label, value, colors }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pmNameInput: { flex: 1, fontSize: 15, fontWeight: '600', marginLeft: 10, paddingVertical: 0, height: 24 },
  creditChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 },
  creditChipText: { fontSize: 11.5, fontWeight: '700' },
  goalInputRow: { flexDirection: 'row', alignItems: 'center' },
  goalInput: { width: 80, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  goalSuffix: { fontSize: 15, fontWeight: '600', marginLeft: 10 },
  pmAddRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pmAddBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  swatchCard: { width: '48.5%', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  swatchStripes: { flexDirection: 'row', height: 44 },
  stripe: { flex: 1 },
  swatchFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  swatchName: { fontSize: 13, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginBottom: 10 },
  actionText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14 },
  actionTextOutline: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  // Modo Casal
  syncStatusRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  syncDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  syncStatusText: { fontSize: 14, fontWeight: '700' },
  codeDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: 3, textAlign: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  shareCodeBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  shareCodeText: { fontSize: 14, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '700' },
});
