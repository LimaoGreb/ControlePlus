// Handler principal de widgets — chamado pelo Android quando precisa renderizar/atualizar.
// Registrado em index.js via registerWidgetTaskHandler().
import React from 'react';
import { loadWidgetData } from './widgetData';
import { SaldoWidget }      from './SaldoWidget';
import { ResumoWidget }     from './ResumoWidget';
import { LancamentoWidget } from './LancamentoWidget';
import { PortfolioWidget }  from './PortfolioWidget';
import { ProjetoWidget }    from './ProjetoWidget';
import { CartoesWidget }    from './CartoesWidget';

const WIDGET_MAP = {
  SaldoWidget,
  ResumoWidget,
  LancamentoWidget,
  PortfolioWidget,
  ProjetoWidget,
  CartoesWidget,
};

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (widgetAction === 'WIDGET_DELETED') return;

  const { widgetName } = widgetInfo;
  const Component = WIDGET_MAP[widgetName];
  if (!Component) return;

  try {
    const data = await loadWidgetData();
    renderWidget(React.createElement(Component, { data }));
  } catch (e) {
    console.warn('[Widget] erro ao renderizar ' + widgetName + ':', e?.message);
  }
}
