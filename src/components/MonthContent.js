// Conteúdo completo de um mês: cabeçalho + resumo + gráficos + seções colapsáveis
// + botão de concluir mês. Reutilizado pela HomeScreen e pela MonthScreen.
import React from 'react';
import { ScrollView, View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { monthTotals } from '../utils/calculations';
import MonthlySummaryCard from './MonthlySummaryCard';
import MonthCharts from './MonthCharts';
import IncomeSection from './IncomeSection';
import FixedExpensesSection from './FixedExpensesSection';
import VariableExpensesSection from './VariableExpensesSection';
import ContributionsSection from './ContributionsSection';
import CompleteMonthButton from './CompleteMonthButton';

export default function MonthContent({ monthIndex, header = null, scrollRef = null }) {
  const { colors } = useTheme();
  const { data } = useData();
  const { makesContributions, contributionGoalPct } = useSettings();
  const month = (data.months && data.months[monthIndex]) || {
    incomes: [],
    fixed: [],
    variable: [],
    contributions: [],
    completed: false,
  };
  const totals = monthTotals(month);

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

        <MonthlySummaryCard totals={totals} />
        <MonthCharts month={month} />

        <IncomeSection monthIndex={monthIndex} month={month} />
        <FixedExpensesSection monthIndex={monthIndex} month={month} />
        <VariableExpensesSection monthIndex={monthIndex} month={month} />
        {makesContributions && (
          <ContributionsSection monthIndex={monthIndex} month={month} goalPct={contributionGoalPct} />
        )}

        <CompleteMonthButton monthIndex={monthIndex} month={month} />

        <View style={{ height: 96 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
});
