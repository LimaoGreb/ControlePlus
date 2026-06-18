// Widget 2x1 — Botao de lancamento rapido. Tap abre o app.
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const C = {
  bg: '#141E2D', accent: '#E0A52E', text: '#FFFFFF', textSec: '#7A90A8',
};

export function LancamentoWidget() {
  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundGradient: { from: '#1E2C3F', to: '#141E2D', orientation: 'LEFT_RIGHT' } }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <TextWidget text="+" style={{ fontSize: 20, fontWeight: '900', color: '#141E2D' }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text="Lancar despesa" style={{ fontSize: 14, fontWeight: '800', color: C.text }} />
        <TextWidget text="Controle+" style={{ fontSize: 10, color: C.textSec, marginTop: 1 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
