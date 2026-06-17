import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
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
  const [expandedId, setExpandedId] = useState(null);
  const [bankSearch, setBankSearch] = useState({});

  useEffect(() => {
    paymentMethods.forEach(pm => {
      const b = getBankForPayment(pm);
      if ((b?.id === 'pix' || b?.id === 'debito') && pm.isCredit) {
        setPaymentCredit(pm.id, false);
      }
    });
  }, []);

  const handleAdd = () => { if (addPaymentMethod(newPayment)) setNewPayment(''); };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>

      {/* ── Lista de formas ── */}
      {paymentMethods.length === 0 ? (
        <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10 }]}>
          Nenhuma cadastrada. Adicione para escolher na hora de lançar despesas.
        </Text>
      ) : (
        <View style={[styles.section, {
          marginHorizontal: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border + '80',
          borderRadius: 12,
          backgroundColor: colors.text + '0D',
          overflow: 'hidden',
        }]}>
          {paymentMethods.map((pm, idx) => {
            const bank = getBankForPayment(pm);
            const isNonCredit = bank?.id === 'pix' || bank?.id === 'debito';
            const isExpanded = expandedId === pm.id;

            return (
              <View
                key={pm.id}
                style={[
                  styles.pmWrap,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '40' },
                ]}
              >
                {/* Linha principal */}
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
                    placeholder="Nome (ex.: Crédito Nubank)"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.pmNameInput, { color: colors.text }]}
                  />
                  {!isNonCredit && (
                    <TouchableOpacity
                      onPress={() => setPaymentCredit(pm.id, !pm.isCredit)}
                      style={[styles.chip, {
                        backgroundColor: pm.isCredit ? colors.primary : 'transparent',
                        borderColor: pm.isCredit ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={[styles.chipText, { color: pm.isCredit ? contrastText(colors.primary) : colors.textMuted }]}>
                        Crédito
                      </Text>
                    </TouchableOpacity>
                  )}
                  {pm.isCredit && !isNonCredit && (
                    <TouchableOpacity
                      onPress={() => setExpandedId(isExpanded ? null : pm.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      style={{ marginRight: 6 }}
                    >
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removePaymentMethod(pm.id)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.negative} />
                  </TouchableOpacity>
                </View>

                {/* Painel expandido — banco + limite */}
                {pm.isCredit && isExpanded && (
                  <View style={[styles.expandPanel, { borderTopColor: colors.border + '40' }]}>
                    <Text style={[styles.panelLabel, { color: colors.textMuted }]}>Banco emissor</Text>
                    <View style={[styles.bankSearchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons name="search-outline" size={15} color={colors.textMuted} />
                      <TextInput
                        value={bankSearch[pm.id] || ''}
                        onChangeText={t => setBankSearch(prev => ({ ...prev, [pm.id]: t }))}
                        placeholder="Buscar banco..."
                        placeholderTextColor={colors.textMuted}
                        style={[styles.bankSearchInput, { color: colors.text }]}
                      />
                      {!!bankSearch[pm.id] && (
                        <TouchableOpacity onPress={() => setBankSearch(prev => ({ ...prev, [pm.id]: '' }))}>
                          <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankScroll}>
                      {BANKS
                        .filter(b => b.name.toLowerCase().includes((bankSearch[pm.id] || '').toLowerCase()))
                        .map((b) => {
                          const selected = pm.bank === b.id;
                          return (
                            <TouchableOpacity
                              key={b.id}
                              onPress={() => setPaymentBank(pm.id, selected ? null : b.id)}
                              style={[styles.bankChip, {
                                backgroundColor: selected ? b.color : b.color + '18',
                                borderColor: b.color,
                              }]}
                            >
                              <BankBadge bank={b} size={20} />
                              <Text style={[styles.bankChipText, { color: selected ? '#fff' : b.color, marginLeft: 6 }]}>
                                {b.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>

                    <Text style={[styles.panelLabel, { color: colors.textMuted, marginTop: 12 }]}>
                      Limite de crédito <Text style={{ fontStyle: 'italic' }}>(opcional)</Text>
                    </Text>
                    <TextInput
                      value={pm.creditLimit ? String(pm.creditLimit) : ''}
                      onChangeText={(t) => {
                        const n = parseFloat(t.replace(',', '.'));
                        setPaymentLimit(pm.id, isNaN(n) ? null : n);
                      }}
                      placeholder="Ex.: 5000"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.limitInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                    />
                    {pm.creditLimit > 0 && (
                      <Text style={[styles.limitHint, { color: colors.textMuted }]}>
                        Limite: {formatBRL(pm.creditLimit)} · alerta ao atingir 80%
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
        Marque "Crédito" e expanda (▾) para definir banco e limite.
      </Text>
      <View style={[styles.addRow, { paddingHorizontal: 16 }]}>
        <TextInput
          value={newPayment}
          onChangeText={setNewPayment}
          placeholder="Ex.: PIX, Crédito Nubank, Boleto"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAdd}
          style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text }]}
        />
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={24} color={contrastText(colors.primary)} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  section: { marginBottom: 12 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  pmWrap: { paddingHorizontal: 14 },
  pmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  pmIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pmNameInput: { flex: 1, fontSize: 14, fontWeight: '600', marginLeft: 10, paddingVertical: 0, height: 24 },

  chip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, borderWidth: 1 },
  chipText: { fontSize: 11.5, fontWeight: '700' },

  expandPanel: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 12 },
  panelLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  bankSearchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, gap: 6, marginBottom: 10, borderWidth: 1 },
  bankSearchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  bankScroll: { flexGrow: 0 },
  bankChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1 },
  bankChipText: { fontSize: 12, fontWeight: '700' },
  limitInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, marginBottom: 4 },
  limitHint: { fontSize: 11, fontStyle: 'italic' },
});
