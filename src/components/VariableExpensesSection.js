// Seção de Despesas Variáveis — lista dinâmica.
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { monthTotals } from '../utils/calculations';
import ExpensesSection from './ExpensesSection';

export default function VariableExpensesSection({ monthIndex, month }) {
  const { colors } = useTheme();
  const totals = monthTotals(month);

  return (
    <ExpensesSection
      monthIndex={monthIndex}
      items={month.variable || []}
      section="variable"
      title="Gastos Variáveis"
      icon="pricetags-outline"
      color={colors.variable}
      total={totals.variableTotal}
      addLabel="Adicionar despesa variável"
    />
  );
}
