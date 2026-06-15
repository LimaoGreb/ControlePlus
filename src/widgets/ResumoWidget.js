import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { fmtBRL, progressColor } from './widgetUtils';

function StatCol({ label, value, color }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
      <TextWidget text={label} style={{ fontSize: 11, color, fontWeight: '600' }} />
      <TextWidget text={fmtBRL(value)} style={{ fontSize: 13, color, fontWeight: '800', marginTop: 3 }} />
    </FlexWidget>
  );
}

export function ResumoWidget({ mes, ano, renda, gastos, sobra, pct, status, colors }) {
  const barColor = progressColor(pct, colors);
  const fillFlex = Math.max(0.02, Math.min(0.98, pct || 0));
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
        padding: 18,
        justifyContent: 'space-between',
      }}
    >
      {/* Cabeçalho */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text={`${mes} ${ano}`}
          style={{ fontSize: 15, color: colors.text, fontWeight: '900' }}
        />
        <TextWidget
          text={statusLabel}
          style={{ fontSize: 11, color: statusColor, fontWeight: '700' }}
        />
      </FlexWidget>

      {/* 3 colunas: Renda / Gastos / Sobra */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <StatCol label="Renda" value={renda} color={colors.positive} />
        <FlexWidget style={{ width: 1, height: 32, backgroundColor: colors.border }} />
        <StatCol label="Gastos" value={gastos} color={colors.negative} />
        <FlexWidget style={{ width: 1, height: 32, backgroundColor: colors.border }} />
        <StatCol label="Sobra" value={sobra} color={sobra < 0 ? colors.negative : colors.text} />
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
          text={`${Math.round((pct || 0) * 100)}% do orçamento utilizado`}
          style={{ fontSize: 10, color: colors.textMuted, marginTop: 5 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
