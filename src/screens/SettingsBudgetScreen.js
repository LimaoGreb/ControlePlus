// Tela de configuração de orçamentos por categoria.
import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { formatBRL } from '../utils/currency';
import CurrencyInput from '../components/CurrencyInput';

export default function SettingsBudgetScreen() {
  const { colors } = useTheme();
  const { categoryBudgets, setCategoryBudget } = useSettings();
  const [editing, setEditing] = useState(null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Defina um limite mensal para cada categoria. O app avisa quando você chegar em 80% e quando estoura.
      </Text>

      <View style={styles.section}>
        {EXPENSE_CATEGORIES.map((cat, idx) => {
          const limit = categoryBudgets[cat.id] || 0;
          const isEditing = editing === cat.id;

          return (
            <View
              key={cat.id}
              style={[
                styles.catRow,
                idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '40' },
                isEditing && { borderLeftWidth: 3, borderLeftColor: cat.color },
              ]}
            >
              <View style={styles.catHeader}>
                <View style={[styles.iconBadge, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon} size={19} color={cat.color} />
                </View>
                <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                <TouchableOpacity
                  onPress={() => setEditing(isEditing ? null : cat.id)}
                  style={[styles.editBtn, { backgroundColor: isEditing ? cat.color : colors.cardAlt }]}
                >
                  <Ionicons name={isEditing ? 'checkmark' : 'pencil-outline'} size={15} color={isEditing ? '#fff' : colors.textMuted} />
                </TouchableOpacity>
              </View>

              {isEditing ? (
                <View style={styles.inputRow}>
                  <CurrencyInput
                    value={limit}
                    onChangeValue={(v) => setCategoryBudget(cat.id, v)}
                    style={{ flex: 1 }}
                  />
                  {limit > 0 && (
                    <TouchableOpacity
                      onPress={() => { setCategoryBudget(cat.id, 0); setEditing(null); }}
                      style={styles.removeBtn}
                    >
                      <Text style={[styles.removeText, { color: colors.negative }]}>Remover</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={[styles.limitText, { color: limit > 0 ? cat.color : colors.textMuted }]}>
                  {limit > 0 ? `Limite: ${formatBRL(limit)}/mês` : 'Sem limite definido'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  hint: { fontSize: 13, lineHeight: 20, marginBottom: 12, paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  catRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  catName: { flex: 1, fontSize: 14, fontWeight: '800' },
  editBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  limitText: { fontSize: 12.5, fontWeight: '600', marginLeft: 44, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 44, marginTop: 6 },
  removeBtn: { paddingHorizontal: 10 },
  removeText: { fontSize: 13, fontWeight: '700' },
});
