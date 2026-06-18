// FAB para a aba Projetos — abre mini-modal para criar um novo projeto.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback, Modal, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { hapticSuccess, hapticTap } from '../utils/haptics';
import CurrencyInput from './CurrencyInput';

export default function ProjetosFab() {
  const { colors } = useTheme();
  const { addProjectFull } = useSettings();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [target, setTarget] = useState(0);

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

  const reset = () => { setNome(''); setTarget(0); };
  const close = () => { setOpen(false); reset(); };

  const canSave = nome.trim().length > 0 && target > 0;

  const save = () => {
    if (!canSave) {
      Alert.alert('Preencha tudo', 'Informe o nome e a meta do projeto.');
      return;
    }
    addProjectFull({ name: nome.trim(), target, monthly: 0, saved: 0 });
    hapticSuccess();
    close();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 86 }]}
        activeOpacity={0.85}
        onPress={() => { hapticTap(); setOpen(true); }}
      >
        <Ionicons name="flag" size={26} color={contrastText(colors.primary)} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={close}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback>
                <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + '80', opacity, transform: [{ scale }] }]}>

                  <View style={styles.headerRow}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.alpha(colors.primary, 0.16) }]}>
                      <Ionicons name="flag-outline" size={20} color={colors.primaryLight} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Novo projeto</Text>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOME DO PROJETO</Text>
                  <TextInput
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex: Viagem, Carro novo, Reserva..."
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    maxLength={40}
                    style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '80' }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 8 }]}>META (R$)</Text>
                  <View style={[styles.valueBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Text style={[styles.rsCurrency, { color: colors.textMuted }]}>R$</Text>
                    <CurrencyInput value={target} onChangeValue={setTarget} style={styles.valueInput} />
                  </View>

                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Você define as contribuições mensais depois, no card do projeto.
                  </Text>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.45 }]}
                    disabled={!canSave}
                    onPress={save}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={contrastText(colors.primary)} />
                    <Text style={[styles.saveBtnText, { color: contrastText(colors.primary) }]}>Criar projeto</Text>
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
  card: { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  fieldLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  nameInput: { height: 50, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, borderWidth: StyleSheet.hairlineWidth },
  valueBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 10, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth },
  rsCurrency: { fontSize: 18, fontWeight: '800', marginRight: 8 },
  valueInput: { flex: 1, height: 56, fontSize: 24, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  saveBtn: { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { fontSize: 17, fontWeight: '800' },
  cancelBtn: { height: 36, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
