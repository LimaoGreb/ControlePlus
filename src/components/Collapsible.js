// Seção colapsável minimalista: sem card wrapper, barra lateral colorida no header.
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatBRL } from '../utils/currency';

export default function Collapsible({
  icon,
  title,
  total,
  color,
  count,
  defaultOpen = false,
  forceOpen = false,
  children,
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen || forceOpen);

  useEffect(() => {
    if (forceOpen && !open) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpen(true);
    }
  }, [forceOpen]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={[styles.section, { marginBottom: open ? 0 : 24 }]}>
      {/* Header: barra lateral colorida + título ALL CAPS */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        style={[styles.header, { borderLeftColor: color }]}
      >
        <View style={styles.left}>
          <View style={styles.titleRow}>
            {icon && <Ionicons name={icon} size={12} color={color} style={{ marginRight: 7, opacity: 0.8 }} />}
            <Text style={[styles.title, { color: colors.textSecondary }]}>
              {title.toUpperCase()}
            </Text>
          </View>
          {typeof count === 'number' && (
            <Text style={[styles.count, { color: colors.textMuted }]}>
              {count} {count === 1 ? 'item' : 'itens'}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          <Text style={[styles.total, { color }]}>{formatBRL(total)}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={colors.textMuted}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {/* Body: traço lateral contínuo alinhado com o header */}
      {open && (
        <View style={[styles.bodyWrap, { borderLeftColor: color + '45' }]}>
          <View style={[styles.body, { borderTopColor: colors.border + '50' }]}>
            {children}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 14,
    paddingLeft: 13,
    borderLeftWidth: 3,
    marginLeft: 16,
    marginBottom: 2,
  },
  left: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  count: { fontSize: 11.5, marginTop: 3 },
  right: { flexDirection: 'row', alignItems: 'center' },
  total: { fontSize: 15, fontWeight: '800' },
  bodyWrap: {
    marginLeft: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
