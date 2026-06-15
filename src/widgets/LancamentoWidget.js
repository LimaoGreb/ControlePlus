import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function LancamentoWidget({ colors }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: 16,
      }}
    >
      <TextWidget
        text="+"
        style={{ fontSize: 26, color: '#FFFFFF', fontWeight: '900', marginRight: 10 }}
      />
      <TextWidget
        text="Lançar gasto"
        style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '800' }}
      />
    </FlexWidget>
  );
}
