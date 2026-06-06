// Anel de progresso (donut) com SVG — mostra o % de forma bonita e clara.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export default function DonutProgress({ pct = 0, size = 96, stroke = 12, color, label }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={colors.cardAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={c}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.pct, { color: colors.text }]}>{Math.round(clamped)}%</Text>
        {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 10, fontWeight: '700', marginTop: -2 },
});
