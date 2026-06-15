import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { fmtBRL } from './widgetUtils';

function InvestRow({ name, value, pct, colors }) {
  const isPos = pct >= 0;
  const pctStr = (isPos ? '+' : '') + (pct || 0).toFixed(1) + '%';
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <TextWidget
        text={name || '—'}
        style={{ fontSize: 12, color: colors.textSub, fontWeight: '600', flex: 1 }}
      />
      <TextWidget
        text={fmtBRL(value || 0)}
        style={{ fontSize: 12, color: colors.text, fontWeight: '700', marginRight: 8 }}
      />
      <TextWidget
        text={pctStr}
        style={{ fontSize: 11, color: isPos ? colors.positive : colors.negative, fontWeight: '700' }}
      />
    </FlexWidget>
  );
}

export function PortfolioWidget({ investments = [], colors }) {
  const total = investments.reduce((s, i) => s + (i.current || 0), 0);
  // Mostra até 3 investimentos mais valiosos
  const top = [...investments]
    .sort((a, b) => (b.current || 0) - (a.current || 0))
    .slice(0, 3);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        borderRadius: 20,
        padding: 18,
        justifyContent: 'space-between',
      }}
    >
      {/* Cabeçalho */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text="Portfólio"
          style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}
        />
        <TextWidget
          text={`${investments.length} ativo${investments.length !== 1 ? 's' : ''}`}
          style={{ fontSize: 11, color: colors.textMuted }}
        />
      </FlexWidget>

      {/* Total */}
      <TextWidget
        text={fmtBRL(total)}
        style={{ fontSize: 26, color: colors.text, fontWeight: '900' }}
      />

      {/* Lista dos top ativos */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        {top.length === 0 ? (
          <TextWidget
            text="Nenhum investimento cadastrado"
            style={{ fontSize: 12, color: colors.textMuted }}
          />
        ) : (
          top.map((inv, i) => (
            <InvestRow
              key={i}
              name={inv.ticker || inv.name || 'Ativo'}
              value={inv.current || 0}
              pct={inv.variation || 0}
              colors={colors}
            />
          ))
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
