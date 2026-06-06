// Avatar do usuário: foto, personagem (emoji em círculo colorido) ou padrão.
import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';

// Personagens pré-definidos (emoji + cor de fundo do círculo).
export const PRESET_AVATARS = [
  { value: '🦊', color: '#E07B4C' },
  { value: '🐱', color: '#8B3A5E' },
  { value: '🐼', color: '#415A77' },
  { value: '🦁', color: '#F8961E' },
  { value: '🐸', color: '#52B788' },
  { value: '🐧', color: '#2E86AB' },
  { value: '🐯', color: '#D99A00' },
  { value: '🐨', color: '#778DA9' },
  { value: '🦄', color: '#9B72CF' },
  { value: '🐶', color: '#6B4226' },
  { value: '🐰', color: '#D46A9A' },
  { value: '🐻', color: '#7A4E12' },
  { value: '🐵', color: '#B5651D' },
  { value: '🦉', color: '#5B8A9A' },
  { value: '🐢', color: '#2D6A4F' },
  { value: '🐙', color: '#9B2226' },
  { value: '🐲', color: '#2D6A4F' },
  { value: '🦝', color: '#5C5C5C' },
];

export default function Avatar({ avatar, size = 44 }) {
  const { colors } = useTheme();
  const radius = size / 2;

  if (avatar && avatar.kind === 'photo' && avatar.value) {
    return (
      <Image
        source={{ uri: avatar.value }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.cardAlt }}
      />
    );
  }

  if (avatar && avatar.kind === 'emoji') {
    const bg = avatar.color || colors.primary;
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }}>{avatar.value}</Text>
      </View>
    );
  }

  // Padrão: círculo com ícone de pessoa.
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="person" size={size * 0.55} color={contrastText(colors.primary)} />
    </View>
  );
}
