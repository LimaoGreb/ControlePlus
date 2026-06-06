// Card editável de um projeto/meta: nome, objetivo (R$), aporte mensal,
// já guardado — e o progresso/tempo calculado.
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL, formatPercent } from '../utils/currency';
import { projectStats } from '../utils/projects';
import CurrencyInput from './CurrencyInput';

function Field({ label, value, onChangeValue }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <CurrencyInput value={value} onChangeValue={onChangeValue} style={{ width: '100%' }} />
    </View>
  );
}

export default function ProjectCard({ project, onChangeName, onChangeField, onRemove }) {
  const { colors } = useTheme();
  const s = projectStats(project);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <TextInput
          value={project.name}
          onChangeText={onChangeName}
          placeholder="Ex.: Comprar um carro 🚗"
          placeholderTextColor={colors.textMuted}
          style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        />
        <TouchableOpacity onPress={onRemove} style={styles.trash} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Ionicons name="trash-outline" size={22} color={colors.negative} />
        </TouchableOpacity>
      </View>

      {/* Progresso */}
      <View style={styles.progressTop}>
        <Text style={[styles.pct, { color: s.done ? colors.positive : colors.primary }]}>
          {formatPercent(s.pct)}
        </Text>
        <Text style={[styles.savedOf, { color: colors.textSecondary }]}>
          {formatBRL(s.saved)} de {formatBRL(s.target)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
        <View style={[styles.fill, { width: `${Math.max(2, s.pct)}%`, backgroundColor: s.done ? colors.positive : colors.primary }]} />
      </View>

      {/* Resumo do cálculo */}
      {s.done ? (
        <Text style={[styles.summary, { color: colors.positive }]}>🎉 Meta concluída! Parabéns!</Text>
      ) : (
        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          Faltam <Text style={{ color: colors.text, fontWeight: '800' }}>{formatBRL(s.remaining)}</Text>
          {s.monthsLeft != null
            ? ` · ~${s.monthsLeft} ${s.monthsLeft === 1 ? 'mês' : 'meses'}${s.etaLabel ? ` (até ${s.etaLabel})` : ''}`
            : ' · defina um aporte mensal para estimar o tempo'}
        </Text>
      )}

      {/* Campos */}
      <View style={styles.fields}>
        <Field label="Objetivo (total)" value={project.target} onChangeValue={(v) => onChangeField('target', v)} />
        <Field label="Guardar por mês" value={project.monthly} onChangeValue={(v) => onChangeField('monthly', v)} />
      </View>
      <View style={styles.fields}>
        <Field label="Já guardado" value={project.saved} onChangeValue={(v) => onChangeField('saved', v)} />
        <View style={styles.field} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  nameInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', marginRight: 8 },
  trash: { paddingLeft: 6, paddingVertical: 6 },
  progressTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  pct: { fontSize: 24, fontWeight: '900' },
  savedOf: { fontSize: 13, fontWeight: '600' },
  track: { height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  summary: { fontSize: 13.5, fontWeight: '600', marginTop: 10, lineHeight: 19 },
  fields: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  field: { flex: 1, marginRight: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
});
