// Chip de forma de pagamento. Mesmo padrão do DueDayChip e CategoryChip.
// Chip único → toque → Modal com lista de métodos cadastrados.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getBankForPayment } from '../data/banks';
import BankBadge from './BankBadge';

export default function PaymentChip({ payment, paymentMethods = [], onChange }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = paymentMethods.find(pm => pm.name === payment) || null;
  const bank = selected ? getBankForPayment(selected) : null;
  const activeColor = bank?.color || colors.primary;
  const has = !!selected;

  const choose = (pm) => {
    onChange?.(pm ? pm.name : null);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          styles.chip,
          {
            backgroundColor: has ? activeColor + '22' : 'transparent',
            borderColor: has ? activeColor : colors.border,
          },
        ]}
      >
        {has && bank
          ? <BankBadge bank={bank} size={14} />
          : <Ionicons name="card-outline" size={13} color={has ? activeColor : colors.textMuted} style={{ marginRight: 4 }} />
        }
        <Text style={[styles.chipText, { color: has ? activeColor : colors.textMuted }]}>
          {has ? selected.name : 'Pagamento'}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Forma de pagamento</Text>

                {paymentMethods.map((pm) => {
                  const isSel = payment === pm.name;
                  const pmBank = getBankForPayment(pm);
                  const pmColor = pmBank?.color || colors.primary;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      onPress={() => choose(pm)}
                      style={[
                        styles.option,
                        {
                          backgroundColor: isSel ? pmColor + '18' : colors.background,
                          borderColor: isSel ? pmColor : colors.border,
                        },
                      ]}
                    >
                      {pmBank
                        ? <BankBadge bank={pmBank} size={22} />
                        : <Ionicons name="card-outline" size={20} color={isSel ? pmColor : colors.textMuted} />
                      }
                      <Text style={[styles.optionTxt, {
                        color: isSel ? pmColor : colors.text,
                        fontWeight: isSel ? '800' : '600',
                      }]}>
                        {pm.name}
                      </Text>
                      <View style={{ flex: 1 }} />
                      {isSel && <Ionicons name="checkmark-circle" size={18} color={pmColor} />}
                    </TouchableOpacity>
                  );
                })}

                {has && (
                  <TouchableOpacity onPress={() => choose(null)} style={styles.clearBtn}>
                    <Text style={[styles.clearText, { color: colors.negative }]}>Remover pagamento</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 20, padding: 18, gap: 8 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  optionTxt: { fontSize: 14 },
  clearBtn: { alignItems: 'center', paddingVertical: 6, marginTop: 4 },
  clearText: { fontSize: 13, fontWeight: '700' },
});
