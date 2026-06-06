// Botão flutuante "+" de lançamento rápido de gasto (2-3 toques).
// Abre uma JANELA FLUTUANTE central com "pop" (igual a do parcelamento):
// nome + valor + tipo (+ pagamento) -> Adicionar.
import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
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

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [open]); // eslint-disable-line

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

      <Modal transparent visible={open} animationType="fade" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={close}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity, transform: [{ scale }] },
                  ]}
                >
                  <View style={styles.headerRow}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.alpha(colors.primary, 0.16) }]}>
                      <Ionicons name="flash" size={20} color={colors.primaryLight} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Lançar gasto rápido</Text>
                  </View>

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
                  <TouchableOpacity style={styles.cancelBtn} onPress={close}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 18, fontWeight: '900' },
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
  cancelBtn: { height: 42, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
