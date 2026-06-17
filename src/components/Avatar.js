// Avatar do usuário: foto, personagem (emoji em círculo colorido) ou padrão.
import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';

// Personagens pré-definidos (emoji + cor de fundo do círculo).
export const PRESET_AVATARS = [
  // Animais clássicos
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
  { value: '🦝', color: '#5C5C5C' },
  { value: '🦋', color: '#7B3FA0' },
  { value: '🐺', color: '#3D405B' },
  { value: '🦔', color: '#8B5E3C' },
  { value: '🦦', color: '#5C4033' },
  { value: '🐬', color: '#4DA6FF' },
  { value: '🦈', color: '#607D8B' },
  { value: '🦅', color: '#5D4037' },
  // Dragões & Fantasia
  { value: '🐲', color: '#1B5E20' },
  { value: '🐉', color: '#880E4F' },
  { value: '🧙', color: '#4A148C' },
  { value: '🧝', color: '#006064' },
  { value: '🧛', color: '#37474F' },
  { value: '🧟', color: '#33691E' },
  { value: '🧜', color: '#0D47A1' },
  { value: '🧞', color: '#E65100' },
  { value: '🦸', color: '#1565C0' },
  { value: '🦹', color: '#6A1B9A' },
  { value: '🧚', color: '#F06292' },
  { value: '🧌', color: '#4E342E' },
  // Robôs & Tech
  { value: '🤖', color: '#546E7A' },
  { value: '👾', color: '#283593' },
  { value: '🕹️', color: '#212121' },
  { value: '💀', color: '#424242' },
  { value: '👻', color: '#455A64' },
  { value: '👽', color: '#1A237E' },
  { value: '🛸', color: '#311B92' },
  // Personagens humanos
  { value: '🥷', color: '#212121' },
  { value: '🧑‍🚀', color: '#1565C0' },
  { value: '🧑‍🎤', color: '#880E4F' },
  { value: '🧑‍💻', color: '#1B5E20' },
  { value: '🧑‍🍳', color: '#E65100' },
  { value: '🧑‍🎨', color: '#6A1B9A' },
  { value: '🧑‍⚕️', color: '#006064' },
  { value: '🧑‍🏫', color: '#E65100' },
  { value: '🧑‍🔬', color: '#0D47A1' },
  { value: '🧑‍🚒', color: '#B71C1C' },
  { value: '🦸‍♀️', color: '#AD1457' },
  { value: '🤠', color: '#6D4C41' },
  { value: '🎃', color: '#E65100' },
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
