// Dispara atualizacao de todos os widgets instalados na home screen.
// Chamado pelo WidgetSyncManager em App.js quando o app vai para background.
import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { loadWidgetData }      from './widgetData';
import { SaldoWidget }         from './SaldoWidget';
import { ResumoWidget }        from './ResumoWidget';
import { LancamentoWidget }    from './LancamentoWidget';
import { PortfolioWidget }     from './PortfolioWidget';
import { ProjetoWidget }       from './ProjetoWidget';
import { CartoesWidget }       from './CartoesWidget';

const WIDGET_MAP = {
  SaldoWidget,
  ResumoWidget,
  LancamentoWidget,
  PortfolioWidget,
  ProjetoWidget,
  CartoesWidget,
};

export async function updateAllWidgets() {
  try {
    const data = await loadWidgetData();

    await Promise.all(
      Object.entries(WIDGET_MAP).map(([name, Comp]) =>
        requestWidgetUpdate({
          widgetName: name,
          renderWidget: () => React.createElement(Comp, { data }),
          widgetNotFound: () => {},
        }).catch(() => {})
      )
    );
  } catch (e) {
    console.warn('[Widgets] updateAllWidgets erro:', e?.message);
  }
}
