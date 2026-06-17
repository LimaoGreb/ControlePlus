// Chip de categoria (Alimentação, Lazer…). Mesmo padrão do DueDayChip.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { EXPENSE_CATEGORIES } from '../data/categories';

export default function CategoryChip({ categoryId, onChange }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = EXPENSE_CATEGORIES.find(c => c.id === categoryId) || null;

  const choose = (cat) => {
    onChange(cat?.id ?? null);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? selected.color + '22' : 'transparent',
            borderColor: selected ? selected.color : colors.border,
          },
        ]}
      >
        <Ionicons
          name={selected ? selected.icon : 'pricetag-outline'}
          size={13}
          color={selected ? selected.color : colors.textMuted}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.chipText, { color: selected ? selected.color : colors.textMuted }]}>
          {selected ? selected.name : 'Categoria'}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Qual categoria?</Text>
                <View style={styles.grid}>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSel = categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => choose(cat)}
                        style={[
                          styles.option,
                          { borderColor: isSel ? cat.color : colors.border, backgroundColor: isSel ? cat.color : colors.cardAlt },
                        ]}
                      >
                        <Ionicons name={cat.icon} size={22} color={isSel ? contrastText(cat.color) : cat.color} />
                        <Text style={[styles.optionText, { color: isSel ? contrastText(cat.color) : colors.text }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selected && (
                  <TouchableOpacity onPress={() => choose(null)} style={styles.clearBtn}>
                    <Text style={[styles.clearText, { color: colors.negative }]}>Remover categoria</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 6,
  },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 18 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  option: {
    width: 90, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, gap: 6,
  },
  optionText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  clearBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },
  clearText: { fontSize: 13, fontWeight: '700' },
});
