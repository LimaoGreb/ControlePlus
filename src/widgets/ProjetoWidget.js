import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { fmtBRL } from './widgetUtils';

function buildDonutSvg(pct, primary, bg, text) {
  const r = 38;
  const cx = 48;
  const cy = 48;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(1, pct) * circ;
  const pctLabel = Math.round(pct * 100) + '%';
  return `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bg}" stroke-width="9"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${primary}" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
    stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="${text}" font-size="15" font-weight="bold" font-family="sans-serif">${pctLabel}</text>
</svg>`;
}

export function ProjetoWidget({ project, colors }) {
  if (!project) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          borderRadius: 20,
          padding: 16,
        }}
      >
        <TextWidget text="Projetos" style={{ fontSize: 13, color: colors.textMuted, fontWeight: '700' }} />
        <TextWidget text="Nenhum projeto cadastrado" style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }} />
      </FlexWidget>
    );
  }

  const { name, target, saved, monthly } = project;
  const pct = target > 0 ? Math.min((saved || 0) / target, 1) : 0;
  const falta = Math.max(0, (target || 0) - (saved || 0));
  const mesesRestantes = monthly > 0 ? Math.ceil(falta / monthly) : null;
  const tempoLabel = mesesRestantes != null
    ? mesesRestantes <= 1 ? 'quase lá!' : `~${mesesRestantes} meses`
    : null;

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
      {/* Nome do projeto */}
      <TextWidget
        text={name || 'Projeto'}
        style={{ fontSize: 13, color: colors.textMuted, fontWeight: '700' }}
      />

      {/* Donut centralizado */}
      <FlexWidget style={{ alignItems: 'center', justifyContent: 'center' }}>
        <SvgWidget
          svg={buildDonutSvg(pct, colors.primary, colors.bgBar, colors.text)}
          style={{ width: 96, height: 96 }}
        />
      </FlexWidget>

      {/* Guardado / Falta */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextWidget text={`Guardado: ${fmtBRL(saved || 0)}`} style={{ fontSize: 11, color: colors.positive, fontWeight: '700' }} />
          {tempoLabel && (
            <TextWidget text={tempoLabel} style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }} />
          )}
        </FlexWidget>
        <TextWidget
          text={`Falta: ${fmtBRL(falta)}`}
          style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
