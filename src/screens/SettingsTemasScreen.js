import React from 'react';
import { ScrollView, View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function SettingsTemasScreen() {
  const { colors, mode, toggleTheme, palettes, paletteId, setPalette } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon" size={22} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 10 }]}>Tema escuro</Text>
          </View>
          <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>Paleta de cores</Text>
        <View style={styles.paletteGrid}>
          {palettes.map((p) => {
            const selected = p.id === paletteId;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPalette(p.id)}
                style={[styles.swatchCard, { borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2.5 : 1 }]}
              >
                <View style={styles.swatchStripes}>
                  {p.swatches.map((c, i) => <View key={i} style={[styles.stripe, { backgroundColor: c }]} />)}
                </View>
                <View style={styles.swatchFooter}>
                  <Text style={[styles.swatchName, { color: colors.text }]}>{p.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  swatchCard: { width: '48.5%', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  swatchStripes: { flexDirection: 'row', height: 44 },
  stripe: { flex: 1 },
  swatchFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  swatchName: { fontSize: 13, fontWeight: '700' },
});
