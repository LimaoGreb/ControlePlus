// Dispara requestWidgetUpdate para todos os widgets ativos.
// Chamado quando o app vai pro background — garante dados frescos na home.
import { requestWidgetUpdate } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { getWidgetColors } from './widgetColors';
import { SaldoWidget } from './SaldoWidget';
import { ResumoWidget } from './ResumoWidget';
import { LancamentoWidget } from './LancamentoWidget';
import { PortfolioWidget } from './PortfolioWidget';
import { ProjetoWidget } from './ProjetoWidget';
import { CartoesWidget } from './CartoesWidget';
import { MONTH_NAMES } from './widgetUtils';

async function getColors() {
  try {
    const [mode, pal] = await Promise.all([
      AsyncStorage.getItem('@financas:tema'),
      AsyncStorage.getItem('@financas:paleta'),
    ]);
    return getWidgetColors(pal || 'vintage', mode || 'dark');
  } catch { return getWidgetColors(); }
}

async function getMonthData() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const mi = now.getMonth();
    const raw = await AsyncStorage.getItem(`@financas:dados:${year}`);
    const parsed = raw ? JSON.parse(raw) : null;
    const m = parsed?.months?.[mi] || {};
    const renda = (m.incomes || []).reduce((s, i) => s + (Number(i.value) || 0), 0);
    const gastos = [
      ...(m.fixed || []),
      ...(m.variable || []),
      ...(m.contributions || []),
    ].filter(i => !i.isInstallmentRef).reduce((s, i) => s + (Number(i.value) || 0), 0);
    const sobra = renda - gastos;
    const pct = renda > 0 ? Math.min(gastos / renda, 1) : 0;
    const status = m.completed ? 'done' : renda > 0 || gastos > 0 ? 'progress' : 'empty';
    return { mes: MONTH_NAMES[mi], ano: year, renda, gastos, sobra, pct, status };
  } catch {
    const now = new Date();
    return { mes: MONTH_NAMES[now.getMonth()], ano: now.getFullYear(), renda: 0, gastos: 0, sobra: 0, pct: 0, status: 'empty' };
  }
}

async function noop() {}

export async function updateAllWidgets() {
  try {
    const colors = await getColors();
    const data = await getMonthData();

    const [investments, projects, cards] = await Promise.all([
      AsyncStorage.getItem('@financas:investimentos').then(r => r ? JSON.parse(r) : []).catch(() => []),
      AsyncStorage.getItem('@financas:projetos').then(r => r ? JSON.parse(r) : []).catch(() => []),
      AsyncStorage.getItem('@financas:formasPagamento').then(r => r ? JSON.parse(r) : []).catch(() => []),
    ]);

    await Promise.allSettled([
      requestWidgetUpdate({ widgetName: 'SaldoWidget', renderWidget: () => <SaldoWidget {...data} colors={colors} />, widgetNotFound: noop }),
      requestWidgetUpdate({ widgetName: 'ResumoWidget', renderWidget: () => <ResumoWidget {...data} colors={colors} />, widgetNotFound: noop }),
      requestWidgetUpdate({ widgetName: 'LancamentoWidget', renderWidget: () => <LancamentoWidget colors={colors} />, widgetNotFound: noop }),
      requestWidgetUpdate({ widgetName: 'PortfolioWidget', renderWidget: () => <PortfolioWidget investments={investments} colors={colors} />, widgetNotFound: noop }),
      requestWidgetUpdate({ widgetName: 'ProjetoWidget', renderWidget: () => <ProjetoWidget project={projects[0] || null} colors={colors} />, widgetNotFound: noop }),
      requestWidgetUpdate({ widgetName: 'CartoesWidget', renderWidget: () => <CartoesWidget cards={cards} colors={colors} />, widgetNotFound: noop }),
    ]);
  } catch (e) {
    console.warn('[updateAllWidgets] error:', e?.message);
  }
}
