// Conteúdo completo de um mês: cabeçalho + resumo + gráficos + seções colapsáveis
// + botão de concluir mês. Reutilizado pela HomeScreen e pela MonthScreen.
import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
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

export default function MonthContent({ monthIndex, header = null, scrollRef = null, hideIncome = false, searchTerm = '', additionalIncome = 0, isCouple = false }) {
  const { colors } = useTheme();
  const { data } = useData();
  const { makesContributions, contributionGoalPct } = useSettings();

  if (!data) return null;

  const month = data.months?.[monthIndex] || {
    incomes: [],
    fixed: [],
    variable: [],
    contributions: [],
    completed: false,
  };
  const totals = monthTotals(month);
  // isCouple=true sinaliza que estamos na aba Casal — sempre oculta InsightCards e ajusta totais
  const isCasal = isCouple || additionalIncome > 0;
  const displayTotals = isCasal
    ? additionalIncome > 0
      ? {
          ...totals,
          rendaTotal: additionalIncome,
          sobraTotal: additionalIncome - totals.outflowTotal,
          percentGasto: (totals.outflowTotal / additionalIncome) * 100,
          percentSobra: 100 - (totals.outflowTotal / additionalIncome) * 100,
        }
      : { ...totals, rendaTotal: 0, sobraTotal: -(totals.outflowTotal || 0), percentGasto: 100, percentSobra: 0 }
    : totals;

  const q = searchTerm.trim().toLowerCase();
  const filteredFixed = q ? month.fixed.filter((it) => it.name.toLowerCase().includes(q)) : month.fixed;
  const filteredVariable = q ? month.variable.filter((it) => it.name.toLowerCase().includes(q)) : month.variable;

  const searchCount = filteredFixed.length + filteredVariable.length;
  const searchSum = [...filteredFixed, ...filteredVariable].reduce((acc, it) => acc + (Number(it.value) || 0), 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
            <MonthlySummaryCard totals={displayTotals} />
            {!isCasal && <InsightCards monthIndex={monthIndex} month={month} />}
            <MonthCharts month={month} />

            {!hideIncome && <IncomeSection monthIndex={monthIndex} month={month} />}
            <FixedExpensesSection monthIndex={monthIndex} month={month} allowInstallments={!isCasal} />
            <VariableExpensesSection monthIndex={monthIndex} month={month} allowInstallments={!isCasal} />
            {makesContributions && (
              <ContributionsSection monthIndex={monthIndex} month={month} goalPct={contributionGoalPct} />
            )}

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
  searchResultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchResultText: { fontSize: 13, fontWeight: '600' },
  searchResultSum: { fontSize: 13, fontWeight: '800' },
});
