import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';

export default function SettingsCartoesScreen() {
  const { colors } = useTheme();
  const { paymentMethods, addPaymentMethod, removePaymentMethod, updatePaymentMethod, setPaymentCredit } = useSettings();
  const [newPayment, setNewPayment] = useState('');

  const handleAdd = () => { if (addPaymentMethod(newPayment)) setNewPayment(''); };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {paymentMethods.length === 0 && (
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10 }]}>
            Nenhuma cadastrada. Adicione para escolher na hora de lançar despesas.
          </Text>
        )}
        {paymentMethods.map((pm) => (
          <View key={pm.id} style={[styles.pmRow, { borderColor: colors.border }]}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <TextInput
              value={pm.name}
              onChangeText={(t) => updatePaymentMethod(pm.id, t)}
              placeholder="Nome (ex.: Crédito Nubank)"
              placeholderTextColor={colors.textMuted}
              style={[styles.pmNameInput, { color: colors.text }]}
            />
            <TouchableOpacity
              onPress={() => setPaymentCredit(pm.id, !pm.isCredit)}
              style={[styles.creditChip, { backgroundColor: pm.isCredit ? colors.primary : 'transparent', borderColor: pm.isCredit ? colors.primary : colors.border }]}
            >
              <Text style={[styles.creditChipText, { color: pm.isCredit ? contrastText(colors.primary) : colors.textMuted }]}>Crédito</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removePaymentMethod(pm.id)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
              <Ionicons name="trash-outline" size={20} color={colors.negative} />
            </TouchableOpacity>
          </View>
        ))}
        <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10 }]}>
          Marque "Crédito" nos cartões — ao escolher um deles numa despesa, o app pergunta o parcelamento.
        </Text>
        <View style={styles.addRow}>
          <TextInput
            value={newPayment}
            onChangeText={setNewPayment}
            placeholder="Ex.: PIX, Crédito Nubank, Boleto"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleAdd}
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          />
          <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={24} color={contrastText(colors.primary)} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 8 },
  pmRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  pmNameInput: { flex: 1, fontSize: 15, fontWeight: '600', marginLeft: 10, paddingVertical: 0, height: 24 },
  creditChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 },
  creditChipText: { fontSize: 11.5, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
