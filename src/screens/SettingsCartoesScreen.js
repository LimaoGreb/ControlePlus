import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { contrastText } from '../utils/colorUtils';
import { BANKS, getBankForPayment } from '../data/banks';
import BankBadge from '../components/BankBadge';
import { formatBRL } from '../utils/currency';

export default function SettingsCartoesScreen() {
  const { colors } = useTheme();
  const {
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    updatePaymentMethod,
    setPaymentCredit,
    setPaymentBank,
    setPaymentLimit,
  } = useSettings();
  const [newPayment, setNewPayment] = useState('');
  const [bankModalId, setBankModalId] = useState(null);
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => {
    paymentMethods.forEach(pm => {
      const b = getBankForPayment(pm);
      if ((b?.id === 'pix' || b?.id === 'debito') && pm.isCredit) {
        setPaymentCredit(pm.id, false);
      }
    });
  }, []);

  const handleAdd = () => { if (addPaymentMethod(newPayment)) setNewPayment(''); };

  const modalPm = paymentMethods.find(p => p.id === bankModalId);
  const filteredBanks = BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* ── Lista de formas ── */}
      {paymentMethods.length === 0 ? (
        <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10, paddingHorizontal: 16 }]}>
          Nenhuma cadastrada. Adicione para escolher na hora de lançar despesas.
        </Text>
      ) : (
        <View style={styles.section}>
          {paymentMethods.map((pm) => {
            const bank = getBankForPayment(pm);
            const isNonCredit = bank?.id === 'pix' || bank?.id === 'debito';

            return (
              <View
                key={pm.id}
                style={[styles.pmWrap, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}
              >
                {/* ── Linha 1: ícone + nome + chip crédito + lixo ── */}
                <View style={styles.pmRow}>
                  {bank
                    ? <BankBadge bank={bank} size={28} />
                    : <View style={[styles.pmIcon, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="card-outline" size={17} color={colors.primary} />
                      </View>
                  }
                  <TextInput
                    value={pm.name}
                    onChangeText={(t) => updatePaymentMethod(pm.id, t)}
                    placeholder="Nome do cartão"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.pmNameInput, { color: colors.text }]}
                  />
                  {!isNonCredit && (
                    <TouchableOpacity
                      onPress={() => setPaymentCredit(pm.id, !pm.isCredit)}
                      style={[styles.chip, {
                        backgroundColor: pm.isCredit ? colors.primary : 'transparent',
                        borderColor: pm.isCredit ? colors.primary : colors.border + '80',
                      }]}
                    >
                      <Text style={[styles.chipText, { color: pm.isCredit ? contrastText(colors.primary) : colors.textMuted }]}>
                        Crédito
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => removePaymentMethod(pm.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.negative} />
                  </TouchableOpacity>
                </View>

                {/* ── Linha 2: Banco (só se crédito) ── */}
                {pm.isCredit && !isNonCredit && (
                  <TouchableOpacity
                    style={[styles.fieldRow, { borderTopColor: colors.border + '40' }]}
                    onPress={() => { setBankSearch(''); setBankModalId(pm.id); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Banco</Text>
                    {pm.bank && bank ? (
                      <View style={styles.bankSelected}>
                        <BankBadge bank={bank} size={20} />
                        <Text style={[styles.bankSelectedText, { color: colors.text }]}>{bank.name}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.fieldPlaceholder, { color: colors.textMuted }]}>Selecionar banco</Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}

                {/* ── Linha 3: Limite (só se crédito) ── */}
                {pm.isCredit && !isNonCredit && (
                  <View style={[styles.fieldRow, { borderTopColor: colors.border + '40' }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Limite</Text>
                    <TextInput
                      value={pm.creditLimit ? String(pm.creditLimit) : ''}
                      onChangeText={(t) => {
                        const n = parseFloat(t.replace(',', '.'));
                        setPaymentLimit(pm.id, isNaN(n) ? null : n);
                      }}
                      placeholder="Ex.: 5000"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.limitInput, { color: colors.text }]}
                    />
                    {pm.creditLimit > 0 && (
                      <Text style={[styles.limitValue, { color: colors.textSecondary }]}>
                        {formatBRL(pm.creditLimit)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Adicionar nova ── */}
      <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10, paddingHorizontal: 16 }]}>
        Adicione e marque "Crédito" para definir banco e limite.
      </Text>
      <View style={[styles.addRow, { paddingHorizontal: 16 }]}>
        <TextInput
          value={newPayment}
          onChangeText={setNewPayment}
          placeholder="Ex.: PIX, Crédito Nubank, Débito"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAdd}
          style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text }]}
        />
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={24} color={contrastText(colors.primary)} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* ── Modal de seleção de banco ── */}
      <Modal
        transparent
        visible={!!bankModalId}
        animationType="slide"
        onRequestClose={() => setBankModalId(null)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setBankModalId(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
                <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border + '60' }]}>

                  {/* Handle */}
                  <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

                  {/* Header */}
                  <View style={[styles.modalHeader, { borderBottomColor: colors.border + '40' }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Banco emissor</Text>
                    <TouchableOpacity onPress={() => setBankModalId(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Busca */}
                  <View style={[styles.searchBox, { backgroundColor: colors.text + '0D', borderColor: colors.border + '80' }]}>
                    <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      value={bankSearch}
                      onChangeText={setBankSearch}
                      placeholder="Buscar banco..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.searchInput, { color: colors.text }]}
                    />
                    {!!bankSearch && (
                      <TouchableOpacity onPress={() => setBankSearch('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Grid de bancos */}
                  <ScrollView style={styles.bankScroll} keyboardShouldPersistTaps="handled">
                    {modalPm?.bank && (
                      <TouchableOpacity
                        style={[styles.removeRow, { borderBottomColor: colors.border + '30' }]}
                        onPress={() => { setPaymentBank(bankModalId, null); setBankModalId(null); }}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={colors.negative} />
                        <Text style={[styles.removeText, { color: colors.negative }]}>Remover banco</Text>
                      </TouchableOpacity>
                    )}
                    <View style={styles.bankGrid}>
                      {filteredBanks.map((b) => {
                        const selected = modalPm?.bank === b.id;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            style={[
                              styles.bankCell,
                              selected && { backgroundColor: b.color + '15' },
                            ]}
                            onPress={() => { setPaymentBank(bankModalId, b.id); setBankModalId(null); }}
                            activeOpacity={0.7}
                          >
                            <View style={[
                              styles.badgeWrap,
                              selected && { borderWidth: 2.5, borderColor: b.color, borderRadius: 16 },
                            ]}>
                              <BankBadge bank={b} size={44} />
                              {selected && (
                                <View style={[styles.checkDot, { backgroundColor: b.color }]}>
                                  <Ionicons name="checkmark" size={9} color="#fff" />
                                </View>
                              )}
                            </View>
                            <Text numberOfLines={1} style={[
                              styles.bankCellText,
                              { color: selected ? b.color : colors.text, fontWeight: selected ? '800' : '500' },
                            ]}>
                              {b.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Card de cada forma de pagamento
  pmWrap: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8, overflow: 'hidden' },
  pmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 8 },
  pmIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pmNameInput: { flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 0, height: 24 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontSize: 11.5, fontWeight: '700' },

  // Linhas de campo (banco / limite)
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, width: 52 },
  fieldPlaceholder: { flex: 1, fontSize: 14 },
  bankSelected: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankSelectedText: { fontSize: 14, fontWeight: '700' },
  limitInput: { flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  limitValue: { fontSize: 12, fontWeight: '600' },

  // Modal de banco
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    maxHeight: '84%',
    overflow: 'hidden',
    paddingBottom: 28,
  },
  modalHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2, opacity: 0.35 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  bankScroll: { maxHeight: 420 },
  removeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  removeText: { fontSize: 13, fontWeight: '700' },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 20 },
  bankCell: { width: '33.33%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14 },
  badgeWrap: { position: 'relative', marginBottom: 7 },
  checkDot: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  bankCellText: { fontSize: 11, textAlign: 'center' },
});
