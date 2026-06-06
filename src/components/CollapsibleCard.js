// Card colapsável (accordion) para seções das Configurações — sem total em R$.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function CollapsibleCard({ title, icon, right, defaultOpen = false, children }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={styles.header}>
        <View style={styles.left}>
          {icon && <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 8 }} />}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.right}>
          {right ? <Text style={[styles.rightText, { color: colors.textSecondary }]}>{right}</Text> : null}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  title: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  right: { flexDirection: 'row', alignItems: 'center' },
  rightText: { fontSize: 13, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
});
