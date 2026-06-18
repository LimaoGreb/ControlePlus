// Widget 2x2 — Progresso do primeiro projeto de poupanca.
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { formatBRL } from '../utils/currency';

const C = {
  bg: '#141E2D', card: '#1E2C3F', accent: '#E0A52E',
  text: '#FFFFFF', textSec: '#7A90A8',
  positive: '#2BB673', negative: '#E5484D', warn: '#F5A524', empty: '#2E3F52',
};

export function ProjetoWidget({ data }) {
  const { projects } = data;
  const proj = projects[0];

  if (!proj) {
    return (
      <FlexWidget
        style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 14 }}
        clickAction="OPEN_APP"
      >
        <TextWidget text="Controle+" style={{ fontSize: 11, fontWeight: '700', color: C.accent }} />
        <TextWidget text="Nenhum projeto" style={{ fontSize: 14, fontWeight: '700', color: C.textSec, marginTop: 8 }} />
        <TextWidget text="Crie um projeto de poupanca no app" style={{ fontSize: 10, color: C.textSec, marginTop: 4 }} />
      </FlexWidget>
    );
  }

  const pct    = proj.target > 0 ? Math.min(Math.round((proj.saved / proj.target) * 100), 100) : 0;
  const falta  = Math.max((proj.target || 0) - (proj.saved || 0), 0);
  const filled = Math.max(Math.min(pct, 99), 1);
  const empty  = 100 - filled;
  const barColor = pct >= 100 ? C.positive : pct > 60 ? C.accent : C.warn;

  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}
      clickAction="OPEN_APP"
    >
      {/* Cabecalho */}
      <TextWidget text="Controle+  Projeto" style={{ fontSize: 11, fontWeight: '700', color: C.accent }} />

      {/* Nome do projeto */}
      <TextWidget text={proj.name || 'Sem nome'} style={{ fontSize: 18, fontWeight: '900', color: C.text }} maxLines={2} />

      {/* Porcentagem */}
      <TextWidget text={pct + '% concluido'} style={{ fontSize: 13, fontWeight: '700', color: barColor }} />

      {/* Barra de progresso */}
      <FlexWidget style={{ width: 'match_parent', height: 8, borderRadius: 4, backgroundColor: C.empty, flexDirection: 'row', overflow: 'hidden' }}>
        <FlexWidget style={{ flex: filled, height: 'match_parent', backgroundColor: barColor, borderRadius: 4 }} />
        <FlexWidget style={{ flex: empty, height: 'match_parent', backgroundColor: '#00000000' }} />
      </FlexWidget>

      {/* Valores */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={formatBRL(proj.saved || 0) + ' guardados'} style={{ fontSize: 11, color: C.text, fontWeight: '600' }} />
        <TextWidget text={'Meta: ' + formatBRL(proj.target || 0)} style={{ fontSize: 10, color: C.textSec, marginTop: 2 }} />
        {falta > 0 && (
          <TextWidget text={'Faltam ' + formatBRL(falta)} style={{ fontSize: 10, color: C.textSec }} />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
