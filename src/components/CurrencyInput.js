// Campo de valor monetário em BRL.
// Enquanto o usuário digita: entrada livre (sem formatação ao vivo).
// Ao sair do campo (blur): parseia e formata "1.500,00".
// Suporta tanto ponto quanto vírgula como separador decimal.
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { formatNumber, parseBRL } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

export default function CurrencyInput({ value, onChangeValue, style }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  // Referência interna para evitar atualização quando vem de fora durante digitação.
  const lastEmitted = useRef(value || 0);

  // Atualiza o display quando o valor muda por fora (reset, importação, etc.)
  useEffect(() => {
    if (!focused) {
      lastEmitted.current = value || 0;
    }
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    // Mostra o número limpo para facilitar a edição (sem pontuação de milhar).
    const v = value || 0;
    setRaw(v > 0 ? String(v).replace('.', ',') : '');
  };

  const handleChange = (text) => {
    // Permite apenas dígitos + um separador decimal (vírgula ou ponto).
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setRaw(cleaned);
    // Emite o valor em tempo real para o pai não ficar desatualizado.
    const parsed = parseBRL(cleaned);
    lastEmitted.current = parsed;
    onChangeValue(parsed);
  };

  const handleBlur = (e) => {
    setFocused(false);
    const text = e.nativeEvent?.text ?? raw;
    const parsed = parseBRL(text);
    lastEmitted.current = parsed;
    setRaw('');
    onChangeValue(parsed);
  };

  // Enquanto focado: mostra o que o usuário está digitando.
  // Fora de foco: mostra o valor formatado (ou vazio se zero).
  const display = focused ? raw : (value ? formatNumber(value) : '');

  return (
    <TextInput
      value={display}
      onChangeText={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      keyboardType="numeric"
      inputMode="decimal"
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
