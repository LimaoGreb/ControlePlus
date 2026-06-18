// Tela de Projetos: metas pessoais + projetos compartilhados do casal.
import React, { useRef, useMemo } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useSharedData } from '../context/SharedDataContext';
import { useSync } from '../context/SyncContext';
import { contrastText } from '../utils/colorUtils';
import { formatBRL } from '../utils/currency';
import { projectStats } from '../utils/projects';
import ProjectCard from '../components/ProjectCard';
import ProjetosFab from '../components/ProjetosFab';

function SectionHeader({ title, count, color, colors }) {
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
      {count > 0 && (
        <Text style={[styles.countText, { color: colors.textMuted }]}>{count} {count === 1 ? 'projeto' : 'projetos'}</Text>
      )}
    </View>
  );
}

function SummaryCard({ saved, target, colors }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80', borderLeftColor: colors.positive }]}>
      <View style={styles.summaryCol}>
        <Text style={[styles.sLabel, { color: colors.textSecondary }]}>Já guardado</Text>
        <Text style={[styles.sValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatBRL(saved)}
        </Text>
      </View>
      <View style={[styles.summaryCol, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border + '40', paddingLeft: 16 }]}>
        <Text style={[styles.sLabel, { color: colors.textSecondary }]}>Soma das metas</Text>
        <Text style={[styles.sValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatBRL(target)}
        </Text>
      </View>
    </View>
  );
}

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const { projects, addProject, updateProject, removeProject } = useSettings();
  const { coupleProjects, addCoupleProject, updateCoupleProject, removeCoupleProject } = useSharedData();
  const { coupleCode, partnerName } = useSync();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const personalSaved  = useMemo(() => projects.reduce((a, p) => a + projectStats(p).saved, 0), [projects]);
  const personalTarget = useMemo(() => projects.reduce((a, p) => a + projectStats(p).target, 0), [projects]);

  const coupleSaved    = useMemo(() => coupleProjects.reduce((a, p) => a + projectStats(p).saved, 0), [coupleProjects]);
  const coupleTarget   = useMemo(() => coupleProjects.reduce((a, p) => a + projectStats(p).target, 0), [coupleProjects]);

  const partnerFirst = (partnerName || 'Parceiro(a)').split(' ')[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══ PROJETOS PESSOAIS ══ */}
        <SectionHeader
          title="Meus Projetos"
          count={projects.length}
          color={colors.primary}
          colors={colors}
        />

        {projects.length > 0 && (
          <SummaryCard saved={personalSaved} target={personalTarget} colors={colors} />
        )}

        {projects.length === 0 && (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Ionicons name="flag-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum projeto pessoal ainda. Crie uma meta só sua!
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

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={addProject}
        >
          <Ionicons name="add" size={22} color={contrastText(colors.primary)} />
          <Text style={[styles.addText, { color: contrastText(colors.primary) }]}>Novo projeto pessoal</Text>
        </TouchableOpacity>

        {/* ══ PROJETOS DO CASAL ══ */}
        {coupleCode ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <SectionHeader
              title="Projetos do Casal"
              count={coupleProjects.length}
              color={colors.primary}
              colors={colors}
            />

            <Text style={[styles.coupleHint, { color: colors.textMuted }]}>
              Metas compartilhadas com {partnerFirst}. Ambos podem editar e acompanhar.
            </Text>

            {coupleProjects.length > 0 && (
              <SummaryCard saved={coupleSaved} target={coupleTarget} colors={colors} />
            )}

            {coupleProjects.length === 0 && (
              <View style={[styles.empty, { borderColor: colors.border }]}>
                <Ionicons name="heart-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum projeto em casal ainda. Criem uma meta juntos!
                </Text>
              </View>
            )}

            {coupleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onChangeName={(t) => updateCoupleProject(p.id, 'name', t)}
                onChangeField={(field, v) => updateCoupleProject(p.id, field, v)}
                onRemove={() => removeCoupleProject(p.id)}
              />
            ))}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary }]}
              onPress={addCoupleProject}
            >
              <Ionicons name="heart" size={18} color={colors.primary} />
              <Text style={[styles.addText, { color: colors.primary }]}>Nova meta do casal</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.coupleLockedCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Ionicons name="heart-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.coupleLockedTitle, { color: colors.textSecondary }]}>Projetos do Casal</Text>
              <Text style={[styles.coupleLockedHint, { color: colors.textMuted }]}>
                Ative o Modo Casal nas Configurações para criar metas compartilhadas.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 96 }} />
      </ScrollView>
      <ProjetosFab />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },

  sectionHeader: {
    borderLeftWidth: 3, marginLeft: 16,
    paddingLeft: 13, paddingRight: 16, paddingVertical: 12,
    marginBottom: 12, marginTop: 4,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4 },
  countText: { fontSize: 11.5, marginTop: 3 },

  summaryCard: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 3, padding: 16, marginBottom: 14 },
  summaryCol: { flex: 1 },
  sLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sValue: { fontSize: 20, fontWeight: '800' },

  empty: { borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 14, gap: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 13, marginTop: 4, gap: 6,
  },
  addText: { fontSize: 15, fontWeight: '800' },

  divider: { height: 1, marginVertical: 24 },

  coupleHint: { fontSize: 13, marginBottom: 12, marginTop: -4 },

  coupleLockedCard: {
    borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8,
  },
  coupleLockedTitle: { fontSize: 16, fontWeight: '800' },
  coupleLockedHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
