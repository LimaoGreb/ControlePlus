// Widget 4x2 — Limites dos cartoes de credito cadastrados.
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { formatBRL } from '../utils/currency';

const C = {
  bg: '#141E2D', card: '#1E2C3F', accent: '#E0A52E',
  text: '#FFFFFF', textSec: '#7A90A8',
  positive: '#2BB673', negative: '#E5484D', empty: '#2E3F52',
};

function CartaoRow({ name, limit, isLast }) {
  return (
    <FlexWidget style={{ flexDirection: 'column' }}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
        <TextWidget text={name} style={{ fontSize: 13, color: C.text, fontWeight: '600' }} maxLines={1} />
        <TextWidget
          text={limit > 0 ? formatBRL(limit) : 'Sem limite'}
          style={{ fontSize: 13, fontWeight: '700', color: limit > 0 ? C.positive : C.textSec }}
        />
      </FlexWidget>
      {!isLast && (
        <FlexWidget style={{ width: 'match_parent', height: 1, backgroundColor: C.empty }} />
      )}
    </FlexWidget>
  );
}

export function CartoesWidget({ data }) {
  const { paymentMethods } = data;
  const cartoes = paymentMethods.filter((pm) => pm.creditLimit > 0);
  const total   = cartoes.reduce((s, pm) => s + (Number(pm.creditLimit) || 0), 0);
  const top4    = cartoes.slice(0, 4);

  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}
      clickAction="OPEN_APP"
    >
      {/* Cabecalho */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="Cartoes de Credito" style={{ fontSize: 12, fontWeight: '800', color: C.accent }} />
        {total > 0 && (
          <TextWidget text={'Total: ' + formatBRL(total)} style={{ fontSize: 11, color: C.textSec }} />
        )}
      </FlexWidget>

      {/* Divisor */}
      <FlexWidget style={{ width: 'match_parent', height: 1, backgroundColor: C.empty }} />

      {/* Lista */}
      {cartoes.length === 0 ? (
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text="Nenhum cartao com limite cadastrado" style={{ fontSize: 12, color: C.textSec }} />
          <TextWidget text="Adicione em Pagamentos nas Configuracoes" style={{ fontSize: 10, color: C.textSec, marginTop: 4 }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', flex: 1, justifyContent: 'space-around' }}>
          {top4.map((pm, i) => (
            <CartaoRow key={pm.id} name={pm.name} limit={Number(pm.creditLimit) || 0} isLast={i === top4.length - 1} />
          ))}
          {cartoes.length > 4 && (
            <TextWidget text={'+ ' + (cartoes.length - 4) + ' mais cartoes...'} style={{ fontSize: 10, color: C.textSec, marginTop: 4 }} />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
