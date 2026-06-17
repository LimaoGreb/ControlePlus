// Campo de valor monetário BRL — padrão "centavos por dígito" (estilo Nubank/PicPay).
// Ao focar: zera o campo, o usuário digita os dígitos da direita para a esquerda.
//   "1" → 0,01 | "150" → 1,50 | "150000" → 1.500,00
// Ao blur: exibe o valor formatado salvo externamente.
import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

function fmtDigits(digits) {
  if (!digits) return '';
  const n = parseInt(digits, 10) || 0;
  if (n === 0) return '';
  const r = Math.floor(n / 100);
  const c = n % 100;
  const rStr = String(r).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rStr},${String(c).padStart(2, '0')}`;
}

export default function CurrencyInput({ value, onChangeValue, editable = true, overdue = false, style, onFocus: externalOnFocus, onBlur: externalOnBlur }) {
  const { colors } = useTheme();
  const [rawDigits, setRawDigits] = useState('');
  const [focused, setFocused] = useState(false);

  // Sincroniza quando o valor muda externamente (reset, importação, etc.)
  useEffect(() => {
    if (!focused) {
      const cents = Math.round((value || 0) * 100);
      setRawDigits(cents > 0 ? String(cents) : '');
    }
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    setRawDigits(''); // limpa para o usuário começar do zero
    externalOnFocus?.();
  };

  const handleChange = (text) => {
    // Extrai apenas dígitos (backspace remove o último, append adiciona)
    const digits = text.replace(/\D/g, '').slice(0, 9); // máx R$ 9.999.999,99
    setRawDigits(digits);
    onChangeValue(parseInt(digits || '0', 10) / 100);
  };

  const handleBlur = () => {
    setFocused(false);
    externalOnBlur?.();
  };

  // Durante foco: mostra o que está sendo digitado.
  // Fora de foco: mostra o valor externo formatado.
  const centsStr = focused
    ? rawDigits
    : Math.round((value || 0) * 100) > 0
      ? String(Math.round((value || 0) * 100))
      : '';
  const display = fmtDigits(centsStr);

  return (
    <TextInput
      value={display}
      onChangeText={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      editable={editable}
      keyboardType="number-pad"
      placeholder="0,00"
      placeholderTextColor={colors.textMuted}
      style={[
        styles.input,
        {
          color: !editable ? colors.textMuted : overdue ? '#FF3B30' : colors.text,
          borderBottomWidth: editable && focused ? 1.5 : 0,
          borderBottomColor: overdue ? 'rgba(255,59,48,0.7)' : colors.primary,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minWidth: 90,
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 4,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
});
