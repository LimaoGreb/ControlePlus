import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { fmtBRL, progressColor } from './widgetUtils';

export function SaldoWidget({ mes, ano, renda, gastos, sobra, pct, status, colors }) {
  const barColor = progressColor(pct, colors);
  const fillFlex = Math.max(0.02, Math.min(0.98, pct || 0));
  const isNeg = sobra < 0;
  const statusLabel = status === 'done' ? '✓ Concluído' : status === 'progress' ? 'Em andamento' : 'Vazio';
  const statusColor = status === 'done' ? colors.positive : status === 'progress' ? colors.warning : colors.textMuted;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      {/* Cabeçalho: mês + status */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text={`${mes} ${ano}`}
          style={{ fontSize: 13, color: colors.textMuted, fontWeight: '700' }}
        />
        <TextWidget
          text={statusLabel}
          style={{ fontSize: 11, color: statusColor, fontWeight: '600' }}
        />
      </FlexWidget>

      {/* Valor principal */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text="Sobra"
          style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}
        />
        <TextWidget
          text={fmtBRL(sobra)}
          style={{ fontSize: 24, color: isNeg ? colors.negative : colors.text, fontWeight: '900' }}
        />
      </FlexWidget>

      {/* Barra de progresso */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.bgBar,
            flexDirection: 'row',
          }}
        >
          <FlexWidget style={{ flex: fillFlex, backgroundColor: barColor, borderRadius: 4 }} />
          <FlexWidget style={{ flex: 1 - fillFlex }} />
        </FlexWidget>
        <TextWidget
          text={`${Math.round((pct || 0) * 100)}% dos gastos · ${fmtBRL(renda)} renda`}
          style={{ fontSize: 10, color: colors.textMuted, marginTop: 5 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
