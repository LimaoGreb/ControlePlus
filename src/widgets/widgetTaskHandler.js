// Handler headless para widgets Android. Roda fora do contexto React.
// Lê dados diretamente do AsyncStorage e renderiza cada widget.
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

// ─── Leitores de AsyncStorage ────────────────────────────────────────────────

async function readColors() {
  try {
    const [mode, paletteId] = await Promise.all([
      AsyncStorage.getItem('@financas:tema'),
      AsyncStorage.getItem('@financas:paleta'),
    ]);
    return getWidgetColors(paletteId || 'vintage', mode || 'dark');
  } catch {
    return getWidgetColors();
  }
}

async function readMonthData() {
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
    return {
      mes: MONTH_NAMES[now.getMonth()],
      ano: now.getFullYear(),
      renda: 0, gastos: 0, sobra: 0, pct: 0, status: 'empty',
    };
  }
}

async function readInvestments() {
  try {
    const raw = await AsyncStorage.getItem('@financas:investimentos');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function readProjects() {
  try {
    const raw = await AsyncStorage.getItem('@financas:projetos');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function readCards() {
  try {
    const raw = await AsyncStorage.getItem('@financas:formasPagamento');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Calcula quanto de cada cartão foi usado no mês atual
async function readCardUsage() {
  try {
    const now = new Date();
    const raw = await AsyncStorage.getItem(`@financas:dados:${now.getFullYear()}`);
    const parsed = raw ? JSON.parse(raw) : null;
    const m = parsed?.months?.[now.getMonth()] || {};
    const items = [
      ...(m.fixed || []),
      ...(m.variable || []),
    ].filter(i => !i.isInstallmentRef && i.payment);
    const usage = {};
    for (const item of items) {
      usage[item.payment] = (usage[item.payment] || 0) + (Number(item.value) || 0);
    }
    return usage;
  } catch { return {}; }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function widgetTaskHandler(props) {
  const { widgetName } = props.widgetInfo;

  switch (props.taskType) {
    case 'WIDGET_ADDED':
    case 'UPDATE': {
      const colors = await readColors();

      switch (widgetName) {
        case 'SaldoWidget': {
          const data = await readMonthData();
          props.renderWidget(<SaldoWidget {...data} colors={colors} />);
          break;
        }
        case 'ResumoWidget': {
          const data = await readMonthData();
          props.renderWidget(<ResumoWidget {...data} colors={colors} />);
          break;
        }
        case 'LancamentoWidget': {
          props.renderWidget(<LancamentoWidget colors={colors} />);
          break;
        }
        case 'PortfolioWidget': {
          const investments = await readInvestments();
          props.renderWidget(<PortfolioWidget investments={investments} colors={colors} />);
          break;
        }
        case 'ProjetoWidget': {
          const projects = await readProjects();
          const project = projects[0] || null;
          props.renderWidget(<ProjetoWidget project={project} colors={colors} />);
          break;
        }
        case 'CartoesWidget': {
          const [cards, cardUsage] = await Promise.all([readCards(), readCardUsage()]);
          props.renderWidget(<CartoesWidget cards={cards} cardUsage={cardUsage} colors={colors} />);
          break;
        }
      }
      break;
    }

    case 'WIDGET_REMOVED':
    case 'WIDGET_RESIZED':
    default:
      break;
  }
}
