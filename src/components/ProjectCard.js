// Card editável de um projeto/meta: nome, objetivo (R$), aporte mensal,
// já guardado — com donut de progresso e os valores bem visíveis.
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL } from '../utils/currency';
import { projectStats } from '../utils/projects';
import CurrencyInput from './CurrencyInput';
import DonutProgress from './DonutProgress';

function Field({ label, value, onChangeValue }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <CurrencyInput value={value} onChangeValue={onChangeValue} style={{ width: '100%' }} />
    </View>
  );
}

function ValLine({ color, label, value, colors }) {
  return (
    <View style={styles.valLine}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.valLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.valValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export default function ProjectCard({ project, onChangeName, onChangeField, onRemove }) {
  const { colors } = useTheme();
  const s = projectStats(project);
  const mainColor = s.done ? colors.positive : colors.primary;

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

      {/* Donut + valores */}
      <View style={styles.progressRow}>
        <DonutProgress pct={s.pct} size={94} color={mainColor} label="da meta" />
        <View style={styles.valuesCol}>
          <ValLine color={colors.positive} label="Guardado" value={formatBRL(s.saved)} colors={colors} />
          <ValLine color={s.done ? colors.positive : colors.textMuted} label="Falta" value={formatBRL(s.remaining)} colors={colors} />
          <View style={[styles.etaBox, { backgroundColor: colors.alpha(mainColor, 0.12) }]}>
            <Text style={[styles.eta, { color: mainColor }]}>
              {s.done
                ? '🎉 Meta concluída!'
                : s.monthsLeft != null
                ? `⏳ ~${s.monthsLeft} ${s.monthsLeft === 1 ? 'mês' : 'meses'}${s.etaLabel ? ` · ${s.etaLabel}` : ''}`
                : 'Defina um aporte mensal'}
            </Text>
          </View>
        </View>
      </View>

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
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  valuesCol: { flex: 1, marginLeft: 18 },
  valLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  valLabel: { fontSize: 13, fontWeight: '600', width: 64 },
  valValue: { fontSize: 15, fontWeight: '800', flex: 1 },
  etaBox: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  eta: { fontSize: 12.5, fontWeight: '800' },
  fields: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  field: { flex: 1, marginRight: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
});
