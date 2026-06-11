// Seção colapsável (accordion) com animação suave (LayoutAnimation).
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
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={styles.header}>
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: colors.alpha(color, 0.18) }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {typeof count === 'number' && (
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {count} {count === 1 ? 'item' : 'itens'}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.total, { color }]}>{formatBRL(total)}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.textMuted}
            style={{ marginLeft: 8 }}
          />
        </View>
      </TouchableOpacity>

      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: { fontSize: 16, fontWeight: '800' },
  count: { fontSize: 12, marginTop: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
  total: { fontSize: 16, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
});
