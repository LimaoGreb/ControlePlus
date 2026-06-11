import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function WelcomeBack() {
  const { userName } = useSettings();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);
  const timerRef = useRef(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(hide, 2800);
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 340, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        show();
      }
      appState.current = nextState;
    });
    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const firstName = userName?.trim().split(' ')[0] || null;
  const greeting = getGreeting();

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { top: insets.top + 12, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons name="hand-right-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <View>
          <Text style={styles.greeting}>
            {greeting}{firstName ? `, ${firstName}` : ''}! 👋
          </Text>
          <Text style={styles.sub}>Bem-vindo de volta ao Controle+</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    alignSelf: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,35,0.92)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  greeting: { fontSize: 14, fontWeight: '800', color: '#fff' },
  sub:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
});
