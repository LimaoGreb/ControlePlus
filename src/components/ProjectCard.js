// Card editável de um projeto/meta.
// Modos: "aporte" (Meta+Guardar/mês → calcula prazo) | "prazo" (Meta+Meses → calcula quanto guardar/mês).
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL } from '../utils/currency';
import { projectStats } from '../utils/projects';
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

  const sim = calcPrazo(s.target, project.deadline || 12);

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
              {s.saved > 0 && (
                <InfoBlock label="Guardado" value={formatBRL(s.saved)} valueColor={colors.positive} colors={colors} />
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
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Objetivo (total)</Text>
          <CurrencyInput value={project.target} onChangeValue={(v) => onChangeField('target', v)} style={{ width: '100%' }} />
        </View>
        <View style={styles.field}>
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
                style={[styles.simInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              />
            </>
          )}
        </View>
      </View>

      {/* Já guardado — oculto quando zero; aparece ao tocar no botão */}
      {(showSaved || hasSaved) ? (
        <View style={[styles.fields, { marginTop: 12 }]}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Já guardado</Text>
            <CurrencyInput value={project.saved} onChangeValue={(v) => onChangeField('saved', v)} style={{ width: '100%' }} />
          </View>
          <View style={styles.field} />
        </View>
      ) : (
        <TouchableOpacity style={styles.addSavedBtn} onPress={() => setShowSaved(true)} activeOpacity={0.7}>
          <Ionicons name="wallet-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.addSavedTxt, { color: colors.textMuted }]}>Já tenho algo guardado</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  nameInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', marginRight: 8 },
  trash: { paddingLeft: 6, paddingVertical: 6 },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoCol: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  infoBlock: { marginBottom: 10 },
  infoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoValue: { fontSize: 17, fontWeight: '900' },
  etaBox: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  eta: { fontSize: 12, fontWeight: '800' },

  modeToggle: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 14 },
  modeTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  modeTabActive: {},
  modeTabTxt: { fontSize: 12, fontWeight: '800' },

  fields: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  simInput: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, fontWeight: '700' },

  addSavedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', paddingVertical: 4 },
  addSavedTxt: { fontSize: 13, fontWeight: '600' },
});
