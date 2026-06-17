// Card editável de um projeto/meta.
// Modos: "aporte" (Meta+Guardar/mês → calcula prazo) | "prazo" (Meta+Meses → calcula quanto guardar/mês).
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL } from '../utils/currency';
import { projectStats } from '../utils/projects';
import { hapticSuccess } from '../utils/haptics';
import CurrencyInput from './CurrencyInput';
import DonutProgress from './DonutProgress';
import { MONTH_NAMES } from '../data/initialData';

// ─── Name → Emoji ─────────────────────────────────────────────────────────────
const EMOJI_MAP = [
  { keys: ['casa','apto','apartamento','moradia','imovel','imóvel','terreno','lote','lar'], emoji: '🏠' },
  { keys: ['carro','veículo','veiculo','automóvel','automovel'], emoji: '🚗' },
  { keys: ['moto','motocicleta'], emoji: '🏍️' },
  { keys: ['viagem','férias','ferias','intercâmbio','intercambio','turismo','viajar'], emoji: '✈️' },
  { keys: ['celular','iphone','android','smartphone','telefone'], emoji: '📱' },
  { keys: ['notebook','computador','laptop','pc','mac'], emoji: '💻' },
  { keys: ['casamento','noivado','noiva'], emoji: '💍' },
  { keys: ['faculdade','curso','estudo','escola','universidade','educação','educacao'], emoji: '📚' },
  { keys: ['investimento','renda','bolsa','fii'], emoji: '📈' },
  { keys: ['bike','bicicleta'], emoji: '🚲' },
  { keys: ['pet','cachorro','gato','dog'], emoji: '🐾' },
  { keys: ['televisão','televisao','smart tv'], emoji: '📺' },
  { keys: ['reforma','construção','construcao','obra'], emoji: '🔨' },
  { keys: ['reserva','emergência','emergencia','fundo de emerg'], emoji: '🛡️' },
  { keys: ['piscina'], emoji: '🏊' },
  { keys: ['academia','treino','fitness'], emoji: '💪' },
  { keys: ['música','musica','instrumento','violão','violao','guitarra','piano'], emoji: '🎸' },
  { keys: ['natal','presente'], emoji: '🎁' },
  { keys: ['bebê','bebe','filho','criança','crianca','enxoval'], emoji: '👶' },
  { keys: ['negócio','negocio','empresa','empreend'], emoji: '💼' },
];

function getEmoji(name) {
  const n = (name || '').toLowerCase();
  for (const { keys, emoji } of EMOJI_MAP) {
    if (keys.some(k => n.includes(k))) return emoji;
  }
  return '🎯';
}

// ─── Cálculo da simulação por prazo ──────────────────────────────────────────
function calcPrazo(target, deadline) {
  const months = Math.max(1, Math.round(Number(deadline) || 1));
  const monthly = target > 0 ? target / months : 0;
  const now = new Date();
  const eta = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const etaLabel = `${MONTH_NAMES[eta.getMonth()].slice(0, 3)}/${eta.getFullYear()}`;
  return { monthly, months, etaLabel };
}

// ─── InfoBlock (label empilhado acima do valor) ───────────────────────────────
function InfoBlock({ label, value, valueColor, colors }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor || colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProjectCard({ project, onChangeName, onChangeField, onRemove }) {
  const { colors } = useTheme();
  const s = projectStats(project);
  const mainColor = s.done ? colors.positive : colors.primary;
  const emoji = getEmoji(project.name);
  const mode = project.mode || 'aporte';

  const hasSaved = (Number(project.saved) || 0) > 0;
  const [showSaved, setShowSaved] = useState(hasSaved);
  const [aportInput, setAportInput] = useState(0);
  const [showAportModal, setShowAportModal] = useState(false);

  const sim = calcPrazo(s.target, project.deadline || 12);

  const handleAport = (type) => {
    const current = Number(project.saved) || 0;
    const amount = Number(aportInput) || 0;
    if (amount <= 0) return;
    const newSaved = type === 'add' ? current + amount : Math.max(0, current - amount);
    onChangeField('saved', newSaved);
    if (newSaved > 0) setShowSaved(true);
    setAportInput(0);
    setShowAportModal(false);
    hapticSuccess();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* Nome + lixeira */}
      <View style={styles.topRow}>
        <TextInput
          value={project.name}
          onChangeText={onChangeName}
          placeholder="Ex.: Comprar uma casa"
          placeholderTextColor={colors.textMuted}
          style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        />
        <TouchableOpacity onPress={onRemove} style={styles.trash} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Ionicons name="trash-outline" size={22} color={colors.negative} />
        </TouchableOpacity>
      </View>

      {/* Donut + painel de info */}
      <View style={styles.progressRow}>
        <DonutProgress pct={s.pct} size={120} color={mainColor} emoji={emoji} />

        <View style={styles.infoCol}>
          {mode === 'aporte' ? (
            <>
              {s.saved > 0 ? (
                <InfoBlock label="Guardado" value={formatBRL(s.saved)} valueColor={colors.positive} colors={colors} />
              ) : showSaved ? (
                <InfoBlock label="Guardado" value={formatBRL(0)} valueColor={colors.textMuted} colors={colors} />
              ) : (
                <TouchableOpacity onPress={() => setShowSaved(true)} activeOpacity={0.6} style={styles.infoBlock}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>GUARDADO</Text>
                  <Text style={[styles.infoValue, { color: colors.textMuted }]}>—</Text>
                </TouchableOpacity>
              )}
              {!s.done && (
                <InfoBlock label="Falta" value={formatBRL(s.remaining)} colors={colors} />
              )}
              <View style={[styles.etaBox, { backgroundColor: mainColor + '1A' }]}>
                <Text style={[styles.eta, { color: mainColor }]}>
                  {s.done
                    ? '🎉 Meta concluída!'
                    : s.monthsLeft != null
                    ? `⏳ ~${s.monthsLeft} ${s.monthsLeft === 1 ? 'mês' : 'meses'}${s.etaLabel ? ` · ${s.etaLabel}` : ''}`
                    : 'Defina um aporte mensal'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <InfoBlock
                label="Prazo"
                value={`${sim.months} ${sim.months === 1 ? 'mês' : 'meses'}`}
                colors={colors}
              />
              <InfoBlock
                label="Guardar por mês"
                value={formatBRL(sim.monthly)}
                valueColor={mainColor}
                colors={colors}
              />
              <View style={[styles.etaBox, { backgroundColor: mainColor + '1A' }]}>
                <Text style={[styles.eta, { color: mainColor }]}>📅 {sim.etaLabel}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Toggle de modo */}
      <View style={[styles.modeToggle, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'aporte' && [styles.modeTabActive, { backgroundColor: mainColor }]]}
          onPress={() => onChangeField('mode', 'aporte')}
          activeOpacity={0.75}
        >
          <Text style={[styles.modeTabTxt, { color: mode === 'aporte' ? '#fff' : colors.textSecondary }]}>
            ⏱ Meta + Aporte
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'prazo' && [styles.modeTabActive, { backgroundColor: mainColor }]]}
          onPress={() => onChangeField('mode', 'prazo')}
          activeOpacity={0.75}
        >
          <Text style={[styles.modeTabTxt, { color: mode === 'prazo' ? '#fff' : colors.textSecondary }]}>
            🎯 Meta + Prazo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Campos principais */}
      <View style={styles.fields}>
        <View style={[styles.field, styles.fieldCard, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Objetivo (total)</Text>
          <CurrencyInput value={project.target} onChangeValue={(v) => onChangeField('target', v)} style={{ width: '100%' }} />
        </View>
        <View style={[styles.field, styles.fieldCard, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
          {mode === 'aporte' ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Guardar por mês</Text>
              <CurrencyInput value={project.monthly} onChangeValue={(v) => onChangeField('monthly', v)} style={{ width: '100%' }} />
            </>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Em quantos meses?</Text>
              <TextInput
                value={project.deadline ? String(project.deadline) : ''}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/\D/g, ''), 10);
                  onChangeField('deadline', isNaN(n) ? 0 : n);
                }}
                keyboardType="number-pad"
                placeholder="Ex.: 48"
                placeholderTextColor={colors.textMuted}
                style={[styles.simInput, { backgroundColor: 'transparent', color: colors.text }]}
              />
            </>
          )}
        </View>
      </View>

      {/* Já guardado + Aporte rápido (quarto quadrante) */}
      {(showSaved || hasSaved) && (
        <View style={[styles.fields, { marginTop: 12 }]}>
          <View style={[styles.field, styles.fieldCard, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Já guardado</Text>
            <CurrencyInput value={project.saved} onChangeValue={(v) => onChangeField('saved', v)} style={{ width: '100%' }} />
          </View>
          <View style={[styles.field, styles.fieldCard, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>💸 Aporte rápido</Text>
            <View style={styles.aportRow}>
              <CurrencyInput
                value={aportInput}
                onChangeValue={setAportInput}
                style={{ flex: 1 }}
              />
              <TouchableOpacity
                onPress={() => { if (Number(aportInput) > 0) setShowAportModal(true); }}
                style={[styles.aportBtn, {
                  backgroundColor: Number(aportInput) > 0 ? mainColor : colors.cardAlt,
                }]}
              >
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={Number(aportInput) > 0 ? '#fff' : colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de confirmação do aporte */}
      <Modal
        visible={showAportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAportModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border + '80' }]}>
            <Text style={[styles.modalAmt, { color: colors.text }]}>{formatBRL(Number(aportInput) || 0)}</Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>O que deseja fazer com esse valor?</Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => handleAport('add')}
                style={[styles.modalBtn, { backgroundColor: colors.positive + '18', borderColor: colors.positive }]}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.positive} />
                <Text style={[styles.modalBtnTxt, { color: colors.positive }]}>Adicionar</Text>
                <Text style={[styles.modalBtnSub, { color: colors.positive }]}>
                  {formatBRL((Number(project.saved) || 0) + (Number(aportInput) || 0))}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleAport('remove')}
                style={[styles.modalBtn, { backgroundColor: colors.negative + '18', borderColor: colors.negative }]}
              >
                <Ionicons name="remove-circle-outline" size={22} color={colors.negative} />
                <Text style={[styles.modalBtnTxt, { color: colors.negative }]}>Remover</Text>
                <Text style={[styles.modalBtnSub, { color: colors.negative }]}>
                  {formatBRL(Math.max(0, (Number(project.saved) || 0) - (Number(aportInput) || 0)))}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowAportModal(false)}
              style={[styles.modalCancel, { borderTopColor: colors.border + '40' }]}
            >
              <Text style={[styles.modalCancelTxt, { color: colors.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  nameInput: { flex: 1, height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', marginRight: 8 },
  trash: { paddingLeft: 6, paddingVertical: 6 },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoCol: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  infoBlock: { marginBottom: 10 },
  infoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoValue: { fontSize: 17, fontWeight: '900' },
  etaBox: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  eta: { fontSize: 12, fontWeight: '800' },

  modeToggle: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  modeTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  modeTabActive: {},
  modeTabTxt: { fontSize: 12, fontWeight: '800' },

  fields: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  fieldCard: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  simInput: { height: 38, fontSize: 15, fontWeight: '700', paddingHorizontal: 0 },

  aportSection: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  aportLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  aportRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  aportBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  modalCard: { width: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalAmt: { fontSize: 30, fontWeight: '900', textAlign: 'center', paddingTop: 24, paddingHorizontal: 20 },
  modalHint: { fontSize: 13, textAlign: 'center', marginTop: 4, paddingBottom: 18, paddingHorizontal: 20 },
  modalBtns: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  modalBtn: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 5 },
  modalBtnTxt: { fontSize: 14, fontWeight: '800' },
  modalBtnSub: { fontSize: 11, fontWeight: '700', opacity: 0.7 },
  modalCancel: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 15, alignItems: 'center' },
  modalCancelTxt: { fontSize: 14, fontWeight: '700' },
});
