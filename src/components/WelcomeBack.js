import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, Image, StyleSheet, AppState, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const AWAY_THRESHOLD = 5 * 60 * 1000; // 5 minutos em ms

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function WelcomeBack() {
  const { colors } = useTheme();
  const { userName, ready } = useSettings();
  const appState      = useRef('active'); // inicia como active para ignorar transição de cold start
  const backgroundTime = useRef(null);
  const isColdStart   = useRef(true);
  const [visible, setVisible] = useState(false);

  const screenOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale       = useRef(new Animated.Value(0)).current;
  const textOpacity     = useRef(new Animated.Value(0)).current;
  const textTranslateY  = useRef(new Animated.Value(24)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const show = () => {
    screenOpacity.setValue(0);
    logoScale.setValue(0);
    textOpacity.setValue(0);
    textTranslateY.setValue(24);
    subtitleOpacity.setValue(0);
    setVisible(true);
  };

  // Caso 1: cold start — app foi fechado nos recentes e reaberto.
  // Espera o SettingsContext terminar de carregar (ready). Se já tinha nome
  // gravado = retorno legítimo. Se estava vazio = primeiro acesso, não mostra.
  useEffect(() => {
    if (!ready || !isColdStart.current) return;
    isColdStart.current = false;
    if (userName) show();
  }, [ready]); // eslint-disable-line

  // Animação sequenciada
  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(screenOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(logoScale,       { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(textOpacity,    { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(screenOpacity,  { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [visible]); // eslint-disable-line

  // Caso 2: voltou do background após +5 minutos fora.
  // Diálogos de permissão, troca rápida de app etc. ficam abaixo do threshold.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
      } else if (nextState === 'active' && appState.current.match(/inactive|background/)) {
        const elapsed = backgroundTime.current ? Date.now() - backgroundTime.current : 0;
        if (elapsed >= AWAY_THRESHOLD) show();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []); // eslint-disable-line

  if (!visible) return null;

  const firstName = userName?.trim().split(' ')[0] || null;
  const greeting  = getGreeting();

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: screenOpacity, zIndex: 9999 }]}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary, colors.accent, colors.variable]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Animated.View
          renderToHardwareTextureAndroid
          style={{ transform: [{ scale: logoScale }] }}
        >
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/android-icon-foreground.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.greeting,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          {greeting}{firstName ? `, ${firstName}` : ''}! 👋
        </Animated.Text>

        <Animated.Text style={[styles.sub, { opacity: subtitleOpacity }]}>
          Bem-vindo de volta ao Controle+ 🚀
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 132, height: 132, borderRadius: 66,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logo: { width: 96, height: 96 },
  greeting: {
    fontSize: 34, fontWeight: '900', color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sub: {
    fontSize: 17, fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    marginTop: 12, textAlign: 'center',
  },
});
