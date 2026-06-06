// Campo de valor em R$ com teclado numérico e auto-formatação ao vivo (padrão BR).
// Os dígitos digitados são interpretados como centavos (digite 150000 -> 1.500,00).
// Mantém estado local pra evitar "pulos"/embaralhada ao digitar (sem round-trip lento).
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { formatNumber, digitsToValue } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

export default function CurrencyInput({ value, onChangeValue, style }) {
  const { colors } = useTheme();
  const [display, setDisplay] = useState(value ? formatNumber(value) : '');
  const lastEmitted = useRef(value || 0);

  // Sincroniza só quando o valor MUDA por fora (ex.: copiar mês anterior, reset),
  // sem interferir enquanto o usuário digita.
  useEffect(() => {
    const v = value || 0;
    if (Math.abs(v - (lastEmitted.current || 0)) > 0.0001) {
      setDisplay(v ? formatNumber(v) : '');
      lastEmitted.current = v;
    }
  }, [value]);

  const handleChange = (text) => {
    const v = digitsToValue(text);
    lastEmitted.current = v;
    setDisplay(v ? formatNumber(v) : '');
    onChangeValue(v);
  };

  return (
    <TextInput
      value={display}
      onChangeText={handleChange}
      keyboardType="numeric"
      inputMode="numeric"
      placeholder="0,00"
      placeholderTextColor={colors.textMuted}
      style={[
        styles.input,
        { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minWidth: 110,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
});
