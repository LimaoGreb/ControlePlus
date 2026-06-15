import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { fmtBRL, progressColor } from './widgetUtils';

const BANK_LABELS = {
  nubank: 'Nubank',
  c6: 'C6 Bank',
  picpay: 'PicPay',
  inter: 'Inter',
  itau: 'Itaú',
  bradesco: 'Bradesco',
  santander: 'Santander',
  bb: 'Banco do Brasil',
};

function CardRow({ card, used, colors }) {
  const limit = card.creditLimit || 0;
  const livre = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const fillFlex = Math.max(0.02, Math.min(0.98, pct));
  const barColor = progressColor(pct, colors);
  const bankLabel = BANK_LABELS[card.bank] || card.name || 'Cartão';

  return (
    <FlexWidget style={{ flexDirection: 'column', marginTop: 10 }}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={bankLabel} style={{ fontSize: 12, color: colors.text, fontWeight: '700' }} />
        <TextWidget
          text={`${fmtBRL(livre)} livre`}
          style={{ fontSize: 11, color: livre > 0 ? colors.positive : colors.negative, fontWeight: '600' }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.bgBar,
          flexDirection: 'row',
          marginTop: 5,
        }}
      >
        <FlexWidget style={{ flex: fillFlex, backgroundColor: barColor, borderRadius: 3 }} />
        <FlexWidget style={{ flex: 1 - fillFlex }} />
      </FlexWidget>
      <TextWidget
        text={`${fmtBRL(used)} de ${fmtBRL(limit)}`}
        style={{ fontSize: 10, color: colors.textMuted, marginTop: 3 }}
      />
    </FlexWidget>
  );
}

export function CartoesWidget({ cards = [], cardUsage = {}, colors }) {
  const creditCards = cards.filter(c => c.isCredit && c.creditLimit > 0).slice(0, 3);

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
        justifyContent: 'flex-start',
      }}
    >
      <TextWidget
        text="Cartões de Crédito"
        style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}
      />

      {creditCards.length === 0 ? (
        <TextWidget
          text="Nenhum cartão com limite cadastrado"
          style={{ fontSize: 12, color: colors.textMuted, marginTop: 16 }}
        />
      ) : (
        creditCards.map((card, i) => (
          <CardRow
            key={i}
            card={card}
            used={cardUsage[card.id] || 0}
            colors={colors}
          />
        ))
      )}
    </FlexWidget>
  );
}
