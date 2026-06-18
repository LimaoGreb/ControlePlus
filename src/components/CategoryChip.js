// Chip de categoria (Alimentação, Lazer…). Mesmo padrão do DueDayChip.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { getResolvedCategories } from '../data/categories';

export default function CategoryChip({ categoryId, onChange }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { customCategories } = useSettings();
  const [open, setOpen] = useState(false);

  const allCategories = [...getResolvedCategories(), ...customCategories];
  const selected = allCategories.find(c => c.id === categoryId) || null;

  const choose = (cat) => {
    onChange(cat?.id ?? null);
    setOpen(false);
  };

  const goManage = () => {
    setOpen(false);
    navigation.navigate('SettingsCategories');
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
        {selected?.isCustom ? (
          <Text style={styles.chipEmoji}>{selected.emoji}</Text>
        ) : (
          <Ionicons
            name={selected ? selected.icon : 'pricetag-outline'}
            size={13}
            color={selected ? selected.color : colors.textMuted}
            style={{ marginRight: 4 }}
          />
        )}
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

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                  {/* Categorias padrão */}
                  <View style={styles.grid}>
                    {getResolvedCategories().map((cat) => {
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

                  {/* Categorias personalizadas */}
                  {customCategories.length > 0 && (
                    <>
                      <View style={[styles.separator, { borderTopColor: colors.border + '60' }]} />
                      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Minhas categorias</Text>
                      <View style={styles.grid}>
                        {customCategories.map((cat) => {
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
                              <Text style={styles.customEmoji}>{cat.emoji}</Text>
                              <Text style={[styles.optionText, { color: isSel ? contrastText(cat.color) : colors.text }]}>
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border + '40' }]}>
                  {selected && (
                    <TouchableOpacity onPress={() => choose(null)} style={styles.clearBtn}>
                      <Text style={[styles.clearText, { color: colors.negative }]}>Remover categoria</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={goManage} style={styles.manageBtn}>
                    <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                    <Text style={[styles.manageText, { color: colors.primary }]}>Gerenciar categorias</Text>
                  </TouchableOpacity>
                </View>
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
  chipEmoji: { fontSize: 13, marginRight: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 18, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingBottom: 6 },
  option: {
    width: 86, alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, gap: 5,
  },
  optionText: { fontSize: 10.5, fontWeight: '700', textAlign: 'center' },
  customEmoji: { fontSize: 22 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 6 },
  clearBtn: { alignItems: 'center', paddingVertical: 4 },
  clearText: { fontSize: 13, fontWeight: '700' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4 },
  manageText: { fontSize: 12.5, fontWeight: '700' },
});
