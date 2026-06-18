// Widget 4x2 — Resumo dos investimentos (total aportado vs valor atual).
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { formatBRL } from '../utils/currency';

const C = {
  bg: '#141E2D', card: '#1E2C3F', accent: '#E0A52E',
  text: '#FFFFFF', textSec: '#7A90A8',
  positive: '#2BB673', negative: '#E5484D', empty: '#2E3F52',
};

function InvRow({ name, invested, current }) {
  const diff = (current || 0) - (invested || 0);
  const diffColor = diff >= 0 ? C.positive : C.negative;
  const sign = diff >= 0 ? '+' : '';
  return (
    <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <TextWidget text={name || 'Ativo'} style={{ fontSize: 12, color: C.text, fontWeight: '600' }} maxLines={1} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text={formatBRL(current || 0)} style={{ fontSize: 12, fontWeight: '700', color: C.text }} />
        {diff !== 0 && (
          <TextWidget text={'  ' + sign + formatBRL(Math.abs(diff))} style={{ fontSize: 10, color: diffColor, marginLeft: 4 }} />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

export function PortfolioWidget({ data }) {
  const { investments } = data;
  const totalInvested = investments.reduce((s, i) => s + (Number(i.invested) || 0), 0);
  const totalCurrent  = investments.reduce((s, i) => s + (Number(i.current)  || 0), 0);
  const totalDiff     = totalCurrent - totalInvested;
  const diffColor     = totalDiff >= 0 ? C.positive : C.negative;
  const sign          = totalDiff >= 0 ? '+' : '';
  const top3          = investments.slice(0, 3);

  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}
      clickAction="OPEN_APP"
    >
      {/* Cabecalho */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={'Portfolio  ' + investments.length + ' ativo' + (investments.length !== 1 ? 's' : '')} style={{ fontSize: 12, fontWeight: '800', color: C.accent }} />
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget text={formatBRL(totalCurrent)} style={{ fontSize: 13, fontWeight: '900', color: C.text }} />
          {totalDiff !== 0 && (
            <TextWidget text={sign + formatBRL(Math.abs(totalDiff))} style={{ fontSize: 10, color: diffColor }} />
          )}
        </FlexWidget>
      </FlexWidget>

      {/* Divisor */}
      <FlexWidget style={{ width: 'match_parent', height: 1, backgroundColor: C.empty }} />

      {/* Lista de ativos */}
      {investments.length === 0 ? (
        <TextWidget text="Nenhum investimento cadastrado" style={{ fontSize: 12, color: C.textSec }} />
      ) : (
        <FlexWidget style={{ flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          {top3.map((inv) => (
            <InvRow key={inv.id} name={inv.name} invested={inv.invested} current={inv.current} />
          ))}
          {investments.length > 3 && (
            <TextWidget text={'+ ' + (investments.length - 3) + ' mais...'} style={{ fontSize: 10, color: C.textSec }} />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
