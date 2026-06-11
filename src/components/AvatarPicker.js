// Seletor de avatar: foto da galeria, foto do Google, ou um personagem pré-definido.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { contrastText } from '../utils/colorUtils';
import Avatar, { PRESET_AVATARS } from './Avatar';

export default function AvatarPicker() {
  const { colors } = useTheme();
  const { avatar, setAvatar } = useSettings();
  const { googleUser } = useGoogleAuth();

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma imagem de perfil.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setAvatar({ kind: 'photo', value: res.assets[0].uri });
      }
    } catch (err) {
      Alert.alert('Erro', String(err.message || err));
    }
  };

  const isPreset = (p) => avatar && avatar.kind === 'emoji' && avatar.value === p.value;

  return (
    <View>
      <View style={styles.topRow}>
        <Avatar avatar={avatar} size={72} />
        <View style={styles.topBtns}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={pickPhoto}>
            <Ionicons name="image-outline" size={18} color={contrastText(colors.primary)} />
            <Text style={[styles.btnText, { color: contrastText(colors.primary) }]}>Escolher foto</Text>
          </TouchableOpacity>
          {googleUser?.photo && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.cardAlt, borderWidth: 1.5, borderColor: '#1a73e8', marginTop: 6 }]}
              onPress={() => setAvatar({ kind: 'photo', value: googleUser.photo })}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#1a73e8' }}>G</Text>
              <Text style={[styles.btnText, { color: '#1a73e8' }]}>Foto do Google</Text>
            </TouchableOpacity>
          )}
          {avatar && (
            <TouchableOpacity style={styles.removeBtn} onPress={() => setAvatar(null)}>
              <Text style={[styles.removeText, { color: colors.textMuted }]}>Remover</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Ou escolha um personagem</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
        {PRESET_AVATARS.map((p) => (
          <TouchableOpacity
            key={p.value}
            onPress={() => setAvatar({ kind: 'emoji', value: p.value, color: p.color })}
            style={[styles.presetWrap, isPreset(p) && { borderColor: colors.primary, borderWidth: 2.5 }]}
          >
            <View style={[styles.preset, { backgroundColor: p.color }]}>
              <Text style={styles.presetEmoji}>{p.value}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  topBtns: { marginLeft: 16, flex: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 11 },
  btnText: { fontSize: 14, fontWeight: '800', marginLeft: 6 },
  removeBtn: { alignItems: 'center', paddingVertical: 8 },
  removeText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  presets: { paddingVertical: 2, paddingRight: 8 },
  presetWrap: { borderRadius: 26, borderWidth: 2.5, borderColor: 'transparent', marginRight: 10, padding: 1 },
  preset: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  presetEmoji: { fontSize: 26, lineHeight: 34 },
});
