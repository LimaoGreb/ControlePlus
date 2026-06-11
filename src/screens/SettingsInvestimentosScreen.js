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
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
            <Ionicons name="trending-up" size={22} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 10 }]}>Você é um investidor?</Text>
          </View>
          <Switch value={isInvestor} onValueChange={setIsInvestor} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>
          {isInvestor ? 'A aba "Investir" está ativada com sua carteira e rentabilidade.' : 'Ative para liberar a aba "Investir" (renda fixa, ações, FIIs, cripto...).'}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
        <View style={styles.rowBetween}>
          <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
            <Ionicons name="heart" size={22} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 10 }]}>Você faz contribuições?</Text>
          </View>
          <Switch value={makesContributions} onValueChange={setMakesContributions} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>
          {makesContributions ? 'Seção "Contribuições" ativa em cada mês com meta de % da renda.' : 'Ative para registrar doações, dízimo e ofertas com meta de % da renda.'}
        </Text>

        {makesContributions && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: colors.text }]}>Meta (% da renda)</Text>
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
            <Text style={[styles.hint, { color: colors.textMuted, marginTop: 6 }]}>Padrão 10% (o clássico dízimo).</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalInput: { width: 80, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  goalSuffix: { fontSize: 15, fontWeight: '600', marginLeft: 10 },
});
