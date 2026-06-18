// Widget 2x2 — Saldo do mes (renda, sobra, barra de progresso).
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { formatBRL } from '../utils/currency';

const C = {
  bg: '#141E2D', card: '#1E2C3F', accent: '#E0A52E',
  text: '#FFFFFF', textSec: '#7A90A8',
  positive: '#2BB673', negative: '#E5484D', warn: '#F5A524', empty: '#2E3F52',
};

function ProgressBar({ pct }) {
  const filled = Math.max(Math.min(Math.round(pct), 99), 1);
  const empty = 100 - filled;
  const color = pct > 90 ? C.negative : pct > 70 ? C.warn : C.positive;
  return (
    <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: C.empty, flexDirection: 'row', overflow: 'hidden' }}>
      <FlexWidget style={{ flex: filled, height: 'match_parent', backgroundColor: color, borderRadius: 3 }} />
      <FlexWidget style={{ flex: empty, height: 'match_parent', backgroundColor: '#00000000' }} />
    </FlexWidget>
  );
}

export function SaldoWidget({ data }) {
  const { totals, monthName, year } = data;
  const { sobraTotal, rendaTotal, percentGasto } = totals;
  const pct = Math.min(Math.max(Math.round(percentGasto), 0), 100);
  const sobraColor = sobraTotal >= 0 ? C.positive : C.negative;

  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text="Controle+" style={{ fontSize: 11, fontWeight: '700', color: C.accent }} />
        <TextWidget text={monthName + ' ' + year} style={{ fontSize: 10, color: C.textSec, marginTop: 1 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={rendaTotal === 0 ? 'Sem dados' : formatBRL(sobraTotal)} style={{ fontSize: 22, fontWeight: '900', color: sobraColor }} maxLines={1} />
        <TextWidget text="sobra do mes" style={{ fontSize: 11, color: C.textSec, marginTop: 2 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <ProgressBar pct={pct} />
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          <TextWidget text={pct + '% dos gastos'} style={{ fontSize: 10, color: C.textSec }} />
          <TextWidget text={rendaTotal > 0 ? formatBRL(rendaTotal) : '--'} style={{ fontSize: 10, color: C.textSec }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
