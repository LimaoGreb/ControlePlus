// Anel de progresso (donut) com SVG.
// Quando `emoji` é passado: mostra emoji + "X% da meta" no centro.
// Sem emoji: comportamento original (% grande + label).
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export default function DonutProgress({ pct = 0, size = 96, stroke, color, label, emoji }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  const sw = stroke ?? Math.round(size * 0.115);
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={colors.cardAlt} strokeWidth={sw} fill="none" />
        <Circle
          cx={center} cy={center} r={r}
          stroke={c} strokeWidth={sw} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {emoji ? (
          <>
            <Text style={{ fontSize: Math.round(size * 0.27), lineHeight: Math.round(size * 0.32) }}>{emoji}</Text>
            <Text style={{ fontSize: Math.round(size * 0.145), fontWeight: '900', color: c, marginTop: 2 }}>
              {Math.round(clamped)}%
            </Text>
            <Text style={{ fontSize: Math.round(size * 0.095), color: colors.textMuted, fontWeight: '700' }}>
              da meta
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: Math.round(size * 0.23), fontWeight: '900', color: colors.text }}>
              {Math.round(clamped)}%
            </Text>
            {label ? (
              <Text style={{ fontSize: Math.round(size * 0.105), fontWeight: '700', color: colors.textMuted, marginTop: -2 }}>
                {label}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
