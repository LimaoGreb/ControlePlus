// Botão flutuante "+" de lançamento rápido.
// Modal central com nome, valor, tipo, categoria, pagamento e opção de parcelar.
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { formatBRL } from '../utils/currency';
import CurrencyInput from './CurrencyInput';
import CategoryChip from './CategoryChip';
import PaymentChip from './PaymentChip';

export default function QuickAddFab({ monthIndex }) {
  const { colors } = useTheme();
  const { addItem, addInstallments } = useData();
  const { paymentMethods } = useSettings();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState(0);
  const [section, setSection] = useState('variable');
  const [payment, setPayment] = useState(null);
  const [category, setCategory] = useState(null);
  const [parcelar, setParcelar] = useState(false);
  const [parcelas, setParcelas] = useState(2);

  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   useNativeDriver: true, friction: 7, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [open]); // eslint-disable-line

  const reset = () => {
    setName(''); setValue(0); setSection('variable');
    setPayment(null); setCategory(null);
    setParcelar(false); setParcelas(2);
  };
  const close = () => { setOpen(false); reset(); };

  const canAdd = value > 0;
  const valorParcela = parcelas > 0 ? Math.round((value / parcelas) * 100) / 100 : 0;

  const add = () => {
    if (!canAdd) return;
    if (parcelar) {
      if (monthIndex >= 11) {
        Alert.alert('Não cabe', 'Dezembro é o último mês — não há meses seguintes para receber as parcelas.');
        return;
      }
      addInstallments(monthIndex, name.trim() || 'Gasto', valorParcela, parcelas, payment);
      hapticSuccess();
      close();
      Alert.alert('Parcelado ✅', `${name.trim() || 'Gasto'} dividido em ${parcelas}x de ${formatBRL(valorParcela)}, adicionado como Gasto Fixo a partir do mês seguinte.`);
    } else {
      addItem(monthIndex, section, name.trim() || 'Gasto', value, payment, category ? { category } : {});
      hapticSuccess();
      close();
    }
  };

  const TYPE_OPTIONS = [
    { id: 'variable', label: 'Variável', icon: 'trending-up-outline', color: colors.variable },
    { id: 'fixed',    label: 'Fixo',     icon: 'lock-closed-outline',  color: colors.fixed   },
  ];

  return (
    <>
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 86 }]}
        activeOpacity={0.85}
        onPress={() => { hapticTap(); setOpen(true); }}
      >
        <Ionicons name="add" size={32} color={contrastText(colors.primary)} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal transparent visible={open} animationType="fade" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={close}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + '80', opacity, transform: [{ scale }] }]}>

                  {/* ── Header ─────────────────────────────────── */}
                  <View style={styles.headerRow}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.alpha(colors.primary, 0.16) }]}>
                      <Ionicons name="flash" size={20} color={colors.primaryLight} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Lançar gasto rápido</Text>
                  </View>

                  {/* ── Nome ───────────────────────────────────── */}
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="No que gastou? (ex.: Mercado)"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '80' }]}
                  />

                  {/* ── Valor ──────────────────────────────────── */}
                  <View style={[styles.valueBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Text style={[styles.rsCurrency, { color: colors.textMuted }]}>R$</Text>
                    <CurrencyInput value={value} onChangeValue={setValue} style={styles.valueInput} />
                  </View>

                  {/* ── Tipo (variável / fixo) ──────────────────── */}
                  {!parcelar && (
                    <View style={styles.typeRow}>
                      {TYPE_OPTIONS.map((t) => {
                        const sel = section === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => setSection(t.id)}
                            style={[
                              styles.typeBtn,
                              { borderColor: sel ? t.color : colors.border, backgroundColor: sel ? t.color + '20' : 'transparent' },
                            ]}
                          >
                            <Ionicons name={t.icon} size={14} color={sel ? t.color : colors.textMuted} />
                            <Text style={[styles.typeText, { color: sel ? t.color : colors.textMuted, fontWeight: sel ? '800' : '500' }]}>
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* ── Toggle parcelar ─────────────────────────── */}
                  <TouchableOpacity
                    onPress={() => { hapticTap(); setParcelar((p) => !p); }}
                    style={[
                      styles.parcelarToggle,
                      { borderColor: parcelar ? colors.primary : colors.border, backgroundColor: parcelar ? colors.alpha(colors.primary, 0.12) : 'transparent' },
                    ]}
                  >
                    <Ionicons name="card-outline" size={15} color={parcelar ? colors.primaryLight : colors.textSecondary} />
                    <Text style={[styles.parcelarTxt, { color: parcelar ? colors.primaryLight : colors.textSecondary }]}>
                      Parcelar no crédito
                    </Text>
                  </TouchableOpacity>

                  {/* ── Stepper parcelas ─────────────────────────── */}
                  {parcelar && (
                    <View style={styles.stepperRow}>
                      <TouchableOpacity onPress={() => setParcelas((p) => Math.max(2, p - 1))} style={[styles.stepBtn, { borderColor: colors.border }]}>
                        <Ionicons name="remove" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.parcelasNum, { color: colors.text }]}>{parcelas}x</Text>
                      <TouchableOpacity onPress={() => setParcelas((p) => Math.min(24, p + 1))} style={[styles.stepBtn, { borderColor: colors.border }]}>
                        <Ionicons name="add" size={20} color={colors.text} />
                      </TouchableOpacity>
                      {value > 0 && (
                        <Text style={[styles.parcelaInfo, { color: colors.textMuted }]}>{formatBRL(valorParcela)}/parcela</Text>
                      )}
                    </View>
                  )}

                  {/* ── Chips: Categoria + Pagamento ─────────────── */}
                  <View style={[styles.chipsRow, { borderTopColor: colors.border + '60', borderBottomColor: colors.border + '60' }]}>
                    <CategoryChip categoryId={category} onChange={setCategory} />
                    {paymentMethods.length > 0 && (
                      <PaymentChip payment={payment} paymentMethods={paymentMethods} onChange={setPayment} />
                    )}
                  </View>

                  {/* ── Botão adicionar ──────────────────────────── */}
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary, opacity: canAdd ? 1 : 0.45 }]}
                    disabled={!canAdd}
                    onPress={add}
                  >
                    <Ionicons name={parcelar ? 'card' : 'add-circle'} size={18} color={contrastText(colors.primary)} />
                    <Text style={[styles.addText, { color: contrastText(colors.primary) }]}>
                      {parcelar ? `Parcelar em ${parcelas}x` : 'Adicionar gasto'}
                    </Text>
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
    position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  // Inputs
  nameInput: { height: 50, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, borderWidth: StyleSheet.hairlineWidth },
  valueBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 10, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth },
  rsCurrency: { fontSize: 18, fontWeight: '800', marginRight: 8 },
  valueInput: { flex: 1, height: 56, fontSize: 24, fontWeight: '800' },
  // Tipo
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 10, gap: 6 },
  typeText: { fontSize: 13 },
  // Parcelar
  parcelarToggle: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, gap: 8 },
  parcelarTxt: { fontSize: 14, fontWeight: '800' },
  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  parcelasNum: { fontSize: 22, fontWeight: '900', marginHorizontal: 20, minWidth: 50, textAlign: 'center' },
  parcelaInfo: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  // Ações
  addBtn: { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 17, fontWeight: '800' },
  cancelBtn: { height: 36, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
