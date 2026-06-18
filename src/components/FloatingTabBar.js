// Barra de navegação flutuante (estilo moderno/minimalista): destacada das bordas,
// cantos arredondados, com a aba ativa em "pílula" colorida.
// Badge dourado no ícone do Cap indica mensagens não lidas.
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useCapMessages } from '../context/CapContext';

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useCapMessages();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 8 }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.cardAlt,
            borderColor: colors.border,
            shadowColor: '#000',
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const iconColor = focused ? colors.primaryLight : colors.textMuted;
          const icon = options.tabBarIcon
            ? options.tabBarIcon({ focused, color: iconColor, size: 22 })
            : null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const isCapTab = route.name === 'Cap';
          const showBadge = isCapTab && unreadCount > 0;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                {icon}
                {showBadge && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeTxt}>
                      {unreadCount > 9 ? '9+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.labelRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color: focused ? colors.primaryLight : colors.textMuted,
                      fontWeight: focused ? '800' : '600',
                      fontSize: focused ? 11.5 : 10,
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    borderRadius: 22,
    paddingHorizontal: 6,
    borderWidth: 1,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 30,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  iconWrap: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  label: { fontSize: 10 },
  badge: {
    position: 'absolute',
    top: -4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 16,
  },
});
