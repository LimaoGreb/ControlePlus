// Botão flutuante "+" de lançamento rápido de gasto (2-3 toques).
// Abre uma janelinha de baixo: nome + valor + tipo (+ pagamento) -> Adicionar.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { hapticSuccess, hapticTap } from '../utils/haptics';
import CurrencyInput from './CurrencyInput';

export default function QuickAddFab({ monthIndex }) {
  const { colors } = useTheme();
  const { addItem } = useData();
  const { paymentMethods } = useSettings();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState(0);
  const [section, setSection] = useState('variable');
  const [payment, setPayment] = useState(null);

  const reset = () => {
    setName('');
    setValue(0);
    setSection('variable');
    setPayment(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const canAdd = value > 0;

  const add = () => {
    if (!canAdd) return;
    addItem(monthIndex, section, name.trim() || 'Gasto', value, payment);
    hapticSuccess();
    close();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 86 }]}
        activeOpacity={0.85}
        onPress={() => {
          hapticTap();
          setOpen(true);
        }}
      >
        <Ionicons name="add" size={32} color={contrastText(colors.primary)} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="slide" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={close}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.text }]}>Lançar gasto rápido ⚡</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="No que gastou? (ex.: Mercado)"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            />

            <View style={styles.valueRow}>
              <Text style={[styles.rs, { color: colors.text }]}>R$</Text>
              <CurrencyInput value={value} onChangeValue={setValue} style={styles.valueInput} />
            </View>

            {/* Tipo */}
            <View style={styles.typeRow}>
              {[
                { id: 'variable', label: 'Gasto Variável', color: colors.variable },
                { id: 'fixed', label: 'Gasto Fixo', color: colors.fixed },
              ].map((t) => {
                const sel = section === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSection(t.id)}
                    style={[styles.typeBtn, { borderColor: sel ? t.color : colors.border, backgroundColor: sel ? t.color : 'transparent' }]}
                  >
                    <Text style={[styles.typeText, { color: sel ? contrastText(t.color) : colors.textSecondary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pagamento (opcional) */}
            {paymentMethods.length > 0 && (
              <View style={styles.chips}>
                {paymentMethods.map((pm) => {
                  const sel = payment === pm.name;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      onPress={() => setPayment(sel ? null : pm.name)}
                      style={[styles.chip, { backgroundColor: sel ? colors.primary : 'transparent', borderColor: sel ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.chipText, { color: sel ? contrastText(colors.primary) : colors.textSecondary }]}>{pm.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary, opacity: canAdd ? 1 : 0.5 }]}
              disabled={!canAdd}
              onPress={add}
            >
              <Text style={[styles.addText, { color: contrastText(colors.primary) }]}>Adicionar gasto</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '900', marginBottom: 16 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 12 },
  valueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  rs: { fontSize: 22, fontWeight: '900', marginRight: 10 },
  valueInput: { flex: 1, height: 56, fontSize: 22, textAlign: 'left' },
  typeRow: { flexDirection: 'row', marginBottom: 12 },
  typeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginHorizontal: 4 },
  typeText: { fontSize: 14, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, fontWeight: '700' },
  addBtn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  addText: { fontSize: 17, fontWeight: '800' },
});
