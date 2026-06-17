// Fluxo de parcelamento: quando uma despesa é paga com cartão de crédito,
// abre uma janelinha flutuante animada perguntando nº de parcelas e valor,
// e espalha as parcelas como Gastos Fixos nos meses seguintes.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from './DataContext';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';
import { formatBRL } from '../utils/currency';
import { MONTH_NAMES } from '../data/initialData';
import CurrencyInput from '../components/CurrencyInput';

const InstallmentContext = createContext({ requestInstallment: () => {} });

export function InstallmentProvider({ children }) {
  const [payload, setPayload] = useState(null);
  const requestInstallment = (p) => setPayload(p);
  const close = () => setPayload(null);

  return (
    <InstallmentContext.Provider value={{ requestInstallment }}>
      {children}
      {payload && <InstallmentModal key={payload.itemId} payload={payload} onClose={close} />}
    </InstallmentContext.Provider>
  );
}

function InstallmentModal({ payload, onClose }) {
  const { colors } = useTheme();
  const { addItem, addInstallments, removeItem, activeYear } = useData();
  const { monthIndex, section, itemId, name, value } = payload;

  const [parcelas, setParcelas] = useState(2);
  const [valorParcela, setValorParcela] = useState(Math.round((value / 2) * 100) / 100);
  const [editedValor, setEditedValor] = useState(false);

  // Sugere o valor da parcela = total / nº de parcelas (até o usuário editar).
  useEffect(() => {
    if (!editedValor) setValorParcela(Math.round((value / parcelas) * 100) / 100);
  }, [parcelas]); // eslint-disable-line

  // Animação de "pop".
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line

  const total = parcelas * valorParcela;

  // Calcula mês/ano de início e fim das parcelas (suporte cross-year)
  const startAbsMonth = monthIndex + 1;
  const endAbsMonth   = monthIndex + parcelas;
  const startYearOff  = Math.floor(startAbsMonth / 12);
  const endYearOff    = Math.floor(endAbsMonth / 12);
  const startM        = startAbsMonth % 12;
  const endM          = endAbsMonth % 12;
  const startYear     = activeYear + startYearOff;
  const endYear       = activeYear + endYearOff;
  const monthsLabel   = startYear === endYear
    ? `${MONTH_NAMES[startM]} a ${MONTH_NAMES[endM]} de ${startYear}`
    : `${MONTH_NAMES[startM]}/${startYear} a ${MONTH_NAMES[endM]}/${endYear}`;

  const changeParcelas = (delta) => {
    setParcelas((p) => Math.max(2, Math.min(24, p + delta)));
    setEditedValor(false);
  };

  const confirmarParcelar = async () => {
    await addInstallments(monthIndex, name || 'Compra', valorParcela, parcelas, payload.payment);
    removeItem(monthIndex, section, itemId);
    // Ghost ref no mês da compra: referência visual, value=0, não conta nos totais
    addItem(monthIndex, section, name || 'Compra', 0, payload.payment, {
      isInstallmentRef: true,
      installmentCount: parcelas,
      installmentValue: valorParcela,
      installmentStartMonth: startAbsMonth % 12,
    });
    onClose();
    Alert.alert(
      'Compra parcelada ✅',
      `${name || 'Compra'} dividida em ${parcelas}x de ${formatBRL(valorParcela)} como Gasto Fixo de ${monthsLabel}.`
    );
  };

  const aVista = () => {
    // Mantém a despesa como está (pagamento já foi marcado), sem parcelar.
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
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
                  <Ionicons name="card" size={20} color={colors.primaryLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]}>Compra no crédito</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {name || 'Despesa'} · {formatBRL(value)}
                  </Text>
                </View>
              </View>

              {/* Nº de parcelas (stepper) */}
              <Text style={[styles.label, { color: colors.text }]}>Em quantas vezes?</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity onPress={() => changeParcelas(-1)} style={[styles.stepBtn, { borderColor: colors.border }]}>
                  <Ionicons name="remove" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.parcelasNum, { color: colors.text }]}>{parcelas}x</Text>
                <TouchableOpacity onPress={() => changeParcelas(1)} style={[styles.stepBtn, { borderColor: colors.border }]}>
                  <Ionicons name="add" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Valor da parcela */}
              <Text style={[styles.label, { color: colors.text }]}>Valor de cada parcela</Text>
              <CurrencyInput
                value={valorParcela}
                onChangeValue={(v) => {
                  setValorParcela(v);
                  setEditedValor(true);
                }}
                style={{ alignSelf: 'stretch', textAlign: 'left' }}
              />

              <Text style={[styles.info, { color: colors.textMuted }]}>
                Total {formatBRL(total)} · vira <Text style={{ color: colors.fixed, fontWeight: '700' }}>Gasto Fixo</Text> de {monthsLabel}.
              </Text>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={confirmarParcelar}>
                <Text style={[styles.primaryText, { color: contrastText(colors.primary) }]}>Parcelar em {parcelas}x</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={aVista}>
                <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Não parcelar (à vista)</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function useInstallment() {
  return useContext(InstallmentContext);
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: 22, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  parcelasNum: { fontSize: 26, fontWeight: '900', marginHorizontal: 28, minWidth: 60, textAlign: 'center' },
  info: { fontSize: 12.5, lineHeight: 18, marginTop: 12, marginBottom: 16 },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondaryBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
