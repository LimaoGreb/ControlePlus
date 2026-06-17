import React from 'react';
import { ScrollView, View, Text, Switch, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';

export default function SettingsInvestimentosScreen() {
  const { colors } = useTheme();
  const { isInvestor, setIsInvestor, makesContributions, setMakesContributions, contributionGoalPct, setContributionGoalPct } = useSettings();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* ── Investimentos ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>INVESTIMENTOS</Text>
      </View>

      <View style={[styles.toggleRow, { borderTopColor: colors.border + '40' }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="trending-up" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Você é um investidor?</Text>
          <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
            {isInvestor ? 'A aba "Investir" está ativada com sua carteira e rentabilidade.' : 'Ative para liberar a aba "Investir" (renda fixa, ações, FIIs, cripto...).'}
          </Text>
        </View>
        <Switch value={isInvestor} onValueChange={setIsInvestor} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
      </View>

      {/* ── Contribuições ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary, marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTRIBUIÇÕES</Text>
      </View>

      <View style={[styles.toggleRow, { borderTopColor: colors.border + '40' }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="heart" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Você faz contribuições?</Text>
          <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
            {makesContributions ? 'Seção "Contribuições" ativa em cada mês com meta de % da renda.' : 'Ative para registrar doações, dízimo e ofertas com meta de % da renda.'}
          </Text>
        </View>
        <Switch value={makesContributions} onValueChange={setMakesContributions} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
      </View>

      {makesContributions && (
        <View style={[styles.goalWrap, { borderTopColor: colors.border + '40' }]}>
          <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>META (% DA RENDA)</Text>
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
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 6 }]}>Padrão 10% (o clássico dízimo).</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  sectionHeader: { borderLeftWidth: 3, marginLeft: 16, paddingLeft: 13, paddingRight: 16, paddingVertical: 12, marginBottom: 4 },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  hint: { fontSize: 12, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toggleDesc: { fontSize: 12, lineHeight: 17 },
  goalWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth },
  goalLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalInput: { width: 80, height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  goalSuffix: { fontSize: 15, fontWeight: '600', marginLeft: 10 },
});
