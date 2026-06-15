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
  const [editing, setEditing] = useState(null); // catId sendo editado

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Defina um limite mensal para cada categoria. O app avisa quando você chegar em 80% e quando estoura.
      </Text>

      {EXPENSE_CATEGORIES.map((cat) => {
        const limit = categoryBudgets[cat.id] || 0;
        const isEditing = editing === cat.id;

        return (
          <View key={cat.id} style={[styles.card, { backgroundColor: colors.card, borderColor: isEditing ? cat.color : colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
              <TouchableOpacity
                onPress={() => setEditing(isEditing ? null : cat.id)}
                style={[styles.editBtn, { backgroundColor: isEditing ? cat.color : colors.cardAlt }]}
              >
                <Ionicons name={isEditing ? 'checkmark' : 'pencil-outline'} size={16} color={isEditing ? '#fff' : colors.textMuted} />
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
              <Text style={[styles.limitText, { color: limit > 0 ? colors.textSecondary : colors.textMuted }]}>
                {limit > 0 ? `Limite: ${formatBRL(limit)}/mês` : 'Sem limite definido'}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  hint: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { flex: 1, fontSize: 15, fontWeight: '800' },
  editBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  limitText: { fontSize: 13, fontWeight: '600', marginLeft: 46 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 46 },
  removeBtn: { paddingHorizontal: 10 },
  removeText: { fontSize: 13, fontWeight: '700' },
});
