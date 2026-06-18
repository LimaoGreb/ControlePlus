// Conteúdo completo de um mês: cabeçalho + resumo + gráficos + seções colapsáveis
// + botão de concluir mês. Reutilizado pela HomeScreen e pela MonthScreen.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { monthTotals } from '../utils/calculations';
import { formatBRL } from '../utils/currency';
import MonthlySummaryCard from './MonthlySummaryCard';
import InsightCards from './InsightCards';
import MonthCharts from './MonthCharts';
import IncomeSection from './IncomeSection';
import FixedExpensesSection from './FixedExpensesSection';
import VariableExpensesSection from './VariableExpensesSection';
import ContributionsSection from './ContributionsSection';
import CompleteMonthButton from './CompleteMonthButton';
import SimulationSection from './SimulationSection';
import { Ionicons } from '@expo/vector-icons';

export default function MonthContent({ monthIndex, header = null, scrollRef = null, hideIncome = false, searchTerm = '', additionalIncome = 0, isCouple = false, onHistoryPress = null }) {
  const { colors } = useTheme();
  const { data } = useData();
  const { makesContributions, contributionGoalPct } = useSettings();
  const [simulationActive, setSimulationActive] = useState(false);

  // Todos os useMemo antes do early return (regra dos hooks)
  const rawMonth = data?.months?.[monthIndex];
  const month = useMemo(() => ({
    incomes: rawMonth?.incomes || [],
    fixed: rawMonth?.fixed || [],
    variable: rawMonth?.variable || [],
    contributions: rawMonth?.contributions || [],
    completed: !!rawMonth?.completed,
    simulation: rawMonth?.simulation || [],
  }), [rawMonth]);

  const simOutflow = useMemo(
    () => month.simulation.reduce((s, it) => s + (Number(it.value) || 0), 0),
    [month.simulation],
  );

  const totals = useMemo(() => monthTotals(month), [month]);

  // isCouple=true sinaliza que estamos na aba Casal — sempre oculta InsightCards e ajusta totais
  const isCasal = isCouple || additionalIncome > 0;
  const displayTotals = useMemo(() => {
    if (!isCasal) return totals;
    if (additionalIncome > 0) return {
      ...totals,
      rendaTotal: additionalIncome,
      sobraTotal: additionalIncome - totals.outflowTotal,
      percentGasto: Math.min(100, (totals.outflowTotal / additionalIncome) * 100),
      percentSobra: Math.max(0, 100 - (totals.outflowTotal / additionalIncome) * 100),
    };
    return { ...totals, rendaTotal: 0, sobraTotal: -(totals.outflowTotal || 0), percentGasto: totals.outflowTotal > 0 ? 100 : 0, percentSobra: 0 };
  }, [isCasal, additionalIncome, totals]);

  const q = searchTerm.trim().toLowerCase();
  const filteredFixed = useMemo(
    () => q ? month.fixed.filter((it) => it.name.toLowerCase().includes(q)) : month.fixed,
    [q, month.fixed],
  );
  const filteredVariable = useMemo(
    () => q ? month.variable.filter((it) => it.name.toLowerCase().includes(q)) : month.variable,
    [q, month.variable],
  );
  const searchCount = filteredFixed.length + filteredVariable.length;
  const searchSum = useMemo(
    () => [...filteredFixed, ...filteredVariable].reduce((acc, it) => acc + (Number(it.value) || 0), 0),
    [filteredFixed, filteredVariable],
  );

  if (!data) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Banner fixo de simulação — fora do scroll */}
      {simulationActive && (
        <TouchableOpacity
          onPress={() => setSimulationActive(false)}
          activeOpacity={0.85}
          style={styles.simBanner}
        >
          <Ionicons name="flask" size={13} color="#F5A524" />
          <Text style={styles.simBannerText}>Modo Simulação ativo — valores não são reais</Text>
          <Ionicons name="close-circle" size={16} color="#F5A524" />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {header}

        {q ? (
          <>
            {searchCount === 0 ? (
              <View style={[styles.searchResultPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.searchResultText, { color: colors.textMuted }]}>Nenhum resultado encontrado</Text>
              </View>
            ) : (
              <>
                <View style={[styles.searchResultPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.searchResultText, { color: colors.textSecondary }]}>
                    {searchCount} resultado{searchCount !== 1 ? 's' : ''} encontrado{searchCount !== 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.searchResultSum, { color: colors.negative }]}>
                    {formatBRL(searchSum)}
                  </Text>
                </View>
                {filteredFixed.length > 0 && (
                  <FixedExpensesSection
                    monthIndex={monthIndex}
                    month={{ ...month, fixed: filteredFixed }}
                    forceOpen
                  />
                )}
                {filteredVariable.length > 0 && (
                  <VariableExpensesSection
                    monthIndex={monthIndex}
                    month={{ ...month, variable: filteredVariable }}
                    forceOpen
                  />
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Card de resumo — sempre visível, mostra impacto da simulação */}
            <MonthlySummaryCard
              totals={displayTotals}
              onHistoryPress={onHistoryPress}
              simulationActive={simulationActive}
              simulationOutflow={simOutflow}
            />

            {/* Seções reais — fantasma quando simulação ativa */}
            <View style={{ opacity: simulationActive ? 0.38 : 1 }}>
              {!isCasal && <InsightCards monthIndex={monthIndex} month={month} />}
              <MonthCharts month={month} />
              {!hideIncome && <IncomeSection monthIndex={monthIndex} month={month} />}
              <FixedExpensesSection monthIndex={monthIndex} month={month} allowInstallments={!isCasal} />
              <VariableExpensesSection monthIndex={monthIndex} month={month} allowInstallments={!isCasal} />
              {makesContributions && (
                <ContributionsSection monthIndex={monthIndex} month={month} goalPct={contributionGoalPct} />
              )}
            </View>

            {/* Toggle de simulação */}
            <View style={[styles.simToggleRow, { borderTopColor: colors.border + '50', borderBottomColor: simulationActive ? '#F5A52430' : 'transparent', backgroundColor: simulationActive ? '#F5A52408' : 'transparent' }]}>
              <Ionicons name={simulationActive ? 'flask' : 'flask-outline'} size={18} color={simulationActive ? '#F5A524' : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.simToggleLabel, { color: simulationActive ? '#F5A524' : colors.textSecondary }]}>
                  Modo Simulação
                </Text>
                <Text style={[styles.simToggleSub, { color: colors.textMuted }]}>
                  Teste despesas sem afetar seus dados
                </Text>
              </View>
              <Switch
                value={simulationActive}
                onValueChange={setSimulationActive}
                trackColor={{ false: colors.border + '80', true: '#F5A52455' }}
                thumbColor={simulationActive ? '#F5A524' : colors.textMuted}
              />
            </View>

            {/* Seção de despesas simuladas */}
            {simulationActive && (
              <SimulationSection monthIndex={monthIndex} items={month.simulation} />
            )}

            {/* Concluir/apagar mês — sempre as últimas ações da tela */}
            <CompleteMonthButton monthIndex={monthIndex} month={month} />
          </>
        )}

        <View style={{ height: 96 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },

  simBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5A52418',
    borderBottomWidth: 1,
    borderBottomColor: '#F5A52440',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  simBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#F5A524',
  },

  simToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  simToggleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  simToggleSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  searchResultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchResultText: { fontSize: 13, fontWeight: '600' },
  searchResultSum: { fontSize: 13, fontWeight: '800' },
});
