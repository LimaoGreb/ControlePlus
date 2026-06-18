import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';

// Gradiente fixo escuro — garante visual consistente antes do tema carregar do AsyncStorage
const GRADIENT = ['#2A1245', '#1A0D35', '#0A0818'];

export default function LoadingOverlay({ appReady, userName, onDone }) {
  const bgAnim      = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.45)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(18)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(0)).current;
  const welcomeY    = useRef(new Animated.Value(10)).current;
  const fadeOut     = useRef(new Animated.Value(1)).current;

  const minElapsed  = useRef(false);
  const appReadyRef = useRef(false);
  const doneRef     = useRef(false);
  const tryExitRef  = useRef(null);

  tryExitRef.current = () => {
    if (!minElapsed.current || !appReadyRef.current || doneRef.current) return;
    doneRef.current = true;
    setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 380, useNativeDriver: true })
        .start(() => onDone());
    }, 420);
  };

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]),
      Animated.timing(taglineAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      minElapsed.current = true;
      tryExitRef.current();
    }, 1100);

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (appReady) {
      appReadyRef.current = true;
      tryExitRef.current();
    }
  }, [appReady]);

  useEffect(() => {
    if (userName) {
      Animated.parallel([
        Animated.timing(welcomeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(welcomeY, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start();
    }
  }, [userName]);

  const firstName = userName?.trim().split(' ')[0] || null;

  return (
    <Animated.View style={[styles.root, { opacity: fadeOut }]}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.center, { opacity: bgAnim }]}>
        {/* Logo do app */}
        <Animated.View style={[styles.logoCircle, { transform: [{ scale: logoScale }] }]}>
          <Image
            source={require('../../assets/android-icon-foreground.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Nome do app */}
        <Animated.Text
          style={[styles.appName, { opacity: titleAnim, transform: [{ translateY: titleY }] }]}
        >
          Controle<Text style={styles.plus}>+</Text>
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
          Seu dinheiro, do seu jeito 💸
        </Animated.Text>

      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  logoImg: {
    width: 84,
    height: 84,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  plus: {
    color: '#F5A524',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  welcomeCard: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  welcomeText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
