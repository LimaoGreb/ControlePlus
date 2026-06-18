// Widget 4x2 — Resumo financeiro: renda, gastos, sobra + barra de progresso.
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { formatBRL } from '../utils/currency';

const C = {
  bg: '#141E2D', card: '#1E2C3F', accent: '#E0A52E',
  text: '#FFFFFF', textSec: '#7A90A8',
  positive: '#2BB673', negative: '#E5484D', warn: '#F5A524', empty: '#2E3F52',
};

function Col({ label, value, valueColor }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
      <TextWidget text={label} style={{ fontSize: 10, color: C.textSec, fontWeight: '600' }} />
      <TextWidget text={value} style={{ fontSize: 14, fontWeight: '900', color: valueColor || C.text, marginTop: 3 }} maxLines={1} />
    </FlexWidget>
  );
}

export function ResumoWidget({ data }) {
  const { totals, monthName, year } = data;
  const { rendaTotal, despesaTotal, sobraTotal, percentGasto } = totals;
  const pct = Math.min(Math.max(Math.round(percentGasto), 0), 100);
  const sobraColor = sobraTotal >= 0 ? C.positive : C.negative;
  const barColor = pct > 90 ? C.negative : pct > 70 ? C.warn : C.positive;
  const filled = Math.max(Math.min(pct, 99), 1);

  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}
      clickAction="OPEN_APP"
    >
      {/* Cabecalho */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="Resumo Financeiro" style={{ fontSize: 12, fontWeight: '800', color: C.accent }} />
        <TextWidget text={monthName + ' ' + year} style={{ fontSize: 10, color: C.textSec }} />
      </FlexWidget>

      {/* 3 colunas */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Col label="Renda" value={rendaTotal > 0 ? formatBRL(rendaTotal) : '--'} valueColor={C.text} />
        <FlexWidget style={{ width: 1, height: 'match_parent', backgroundColor: C.empty }} />
        <Col label="Gastos" value={despesaTotal > 0 ? formatBRL(despesaTotal) : '--'} valueColor={C.text} />
        <FlexWidget style={{ width: 1, height: 'match_parent', backgroundColor: C.empty }} />
        <Col label="Sobra" value={rendaTotal > 0 ? formatBRL(sobraTotal) : '--'} valueColor={sobraColor} />
      </FlexWidget>

      {/* Barra de progresso */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: C.empty, flexDirection: 'row', overflow: 'hidden' }}>
          <FlexWidget style={{ flex: filled, height: 'match_parent', backgroundColor: barColor, borderRadius: 3 }} />
          <FlexWidget style={{ flex: 100 - filled, height: 'match_parent', backgroundColor: '#00000000' }} />
        </FlexWidget>
        <TextWidget text={pct + '% dos ganhos em gastos'} style={{ fontSize: 10, color: C.textSec, marginTop: 4 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
