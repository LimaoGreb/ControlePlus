// Tela de boas-vindas — aparece APENAS no primeiro acesso (quando não há nome).
// Visual colorido com gradiente da paleta, logo em destaque e textos grandes.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { setUserName } = useSettings();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const canStart = name.trim().length > 0;

  const start = () => {
    if (!canStart) return;
    setUserName(name.trim()); // ao salvar o nome, o app entra automaticamente
  };

  // Gradiente colorido com as cores mais vivas da paleta.
  const gradient = [colors.primary, colors.accent, colors.variable];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Topo colorido com logo e título */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 36 }]}
      >
        <View style={styles.logoCircle}>
          <Image
            source={require('../../assets/android-icon-foreground.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.welcome}>Bem-vindo(a) ao</Text>
        <Text style={styles.appName}>Controle+</Text>
        <Text style={styles.tagline}>Seu dinheiro, do seu jeito 💸</Text>
      </LinearGradient>

      {/* Corpo: pergunta o nome */}
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Vamos começar! 👋</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Como você quer ser chamado?
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Seu nome ou apelido"
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={start}
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: canStart ? colors.primary : colors.border }]}
        />

        <TouchableOpacity onPress={start} disabled={!canStart} activeOpacity={0.85} style={styles.buttonWrap}>
          {canStart ? (
            <LinearGradient
              colors={[colors.accent, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={[styles.buttonText, { color: contrastText(colors.primary) }]}>Começar →</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.button, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.buttonText, { color: colors.textMuted }]}>Começar →</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          Você pode mudar isso depois nas Configurações.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logo: { width: 96, height: 96 },
  welcome: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  appName: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.92)', marginTop: 8 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  heading: { fontSize: 28, fontWeight: '900', marginBottom: 6 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 14 },
  input: {
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonWrap: { marginTop: 18 },
  button: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 18, fontWeight: '800' },
  note: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
