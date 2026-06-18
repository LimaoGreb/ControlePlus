// FAB da aba Controle — abre modal flutuante estilo aporte para ações de categoria.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { hapticTap } from '../utils/haptics';

export default function ControleFab() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const handleAction = (openAdd) => {
    setOpen(false);
    navigation.navigate('SettingsCategories', { openAdd });
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 86 }]}
        activeOpacity={0.85}
        onPress={() => { hapticTap(); setOpen(true); }}
      >
        <Ionicons name="wallet-outline" size={26} color={contrastText(colors.primary)} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + '80' }]}>
            <Text style={[styles.title, { color: colors.text }]}>Categorias</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>O que você deseja fazer?</Text>

            <View style={styles.btns}>
              <TouchableOpacity
                onPress={() => handleAction(true)}
                style={[styles.btn, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
              >
                <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
                <Text style={[styles.btnTxt, { color: colors.primary }]}>Nova{'\n'}categoria</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleAction(false)}
                style={[styles.btn, { backgroundColor: colors.textSecondary + '14', borderColor: colors.textSecondary + '80' }]}
              >
                <Ionicons name="pencil-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.btnTxt, { color: colors.textSecondary }]}>Editar{'\n'}categoria</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[styles.cancelBtn, { borderTopColor: colors.border + '40' }]}
            >
              <Text style={[styles.cancelTxt, { color: colors.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  card: { width: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center', paddingTop: 24, paddingHorizontal: 20 },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 4, paddingBottom: 18, paddingHorizontal: 20 },
  btns: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  btn: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 18, alignItems: 'center', gap: 8 },
  btnTxt: { fontSize: 14, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  cancelBtn: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 16, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '700' },
});
