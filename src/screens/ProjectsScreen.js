// Tela de Projetos — metas de gastos futuros (carro, casa, etc.) com simulação.
import React, { useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { formatBRL } from '../utils/currency';
import { projectStats } from '../utils/projects';
import ProjectCard from '../components/ProjectCard';

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const { projects, addProject, updateProject, removeProject } = useSettings();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const totalTarget = projects.reduce((a, p) => a + projectStats(p).target, 0);
  const totalSaved = projects.reduce((a, p) => a + projectStats(p).saved, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 4 }]}>
          Defina suas metas (carro, casa, viagem...) e veja em quanto tempo você chega lá. 🎯
        </Text>

        {projects.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryCol}>
              <Text style={[styles.sLabel, { color: colors.textSecondary }]}>Já guardado</Text>
              <Text style={[styles.sValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>{formatBRL(totalSaved)}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={[styles.sLabel, { color: colors.textSecondary }]}>Soma das metas</Text>
              <Text style={[styles.sValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatBRL(totalTarget)}</Text>
            </View>
          </View>
        )}

        {projects.length === 0 && (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Ionicons name="flag-outline" size={36} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum projeto ainda. Crie sua primeira meta e comece a planejar!
            </Text>
          </View>
        )}

        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onChangeName={(t) => updateProject(p.id, 'name', t)}
            onChangeField={(field, v) => updateProject(p.id, field, v)}
            onRemove={() => removeProject(p.id)}
          />
        ))}

        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addProject}>
          <Ionicons name="add" size={24} color={contrastText(colors.primary)} />
          <Text style={[styles.addText, { color: contrastText(colors.primary) }]}>Novo projeto</Text>
        </TouchableOpacity>

        <View style={{ height: 96 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  summaryCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  summaryCol: { flex: 1 },
  sLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sValue: { fontSize: 20, fontWeight: '800' },
  empty: { borderWidth: 1, borderRadius: 16, borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 14 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addText: { fontSize: 16, fontWeight: '800', marginLeft: 4 },
});
