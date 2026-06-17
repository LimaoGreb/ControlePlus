import React from 'react';
import { ScrollView, View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function SettingsTemasScreen() {
  const { colors, mode, toggleTheme, palettes, paletteId, setPalette } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* ── Aparência ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APARÊNCIA</Text>
      </View>
      <View style={[styles.row, { borderTopColor: colors.border + '40' }]}>
        <Ionicons name="moon" size={20} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.text }]}>Tema escuro</Text>
        <Switch
          value={mode === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      {/* ── Paleta ── */}
      <View style={[styles.sectionHeader, { borderLeftColor: colors.primary, marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PALETA DE CORES</Text>
      </View>
      <View style={styles.paletteGrid}>
        {palettes.map((p) => {
          const selected = p.id === paletteId;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPalette(p.id)}
              style={[
                styles.swatchCard,
                {
                  borderColor: selected ? colors.primary : colors.border + '80',
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.swatchStripes}>
                {p.swatches.map((c, i) => <View key={i} style={[styles.stripe, { backgroundColor: c }]} />)}
              </View>
              <View style={[styles.swatchFooter, { backgroundColor: colors.text + '0D' }]}>
                <Text style={[styles.swatchName, { color: colors.text }]}>{p.name}</Text>
                {selected
                  ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  : <View style={[styles.swatchDot, { borderColor: colors.border + '80' }]} />
                }
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  sectionHeader: {
    borderLeftWidth: 3, marginLeft: 16,
    paddingLeft: 13, paddingRight: 16, paddingVertical: 12,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  paletteGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, marginBottom: 24,
  },
  swatchCard: { width: '48.5%', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  swatchDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  swatchStripes: { flexDirection: 'row', height: 44 },
  stripe: { flex: 1 },
  swatchFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8,
  },
  swatchName: { fontSize: 13, fontWeight: '700' },
});
