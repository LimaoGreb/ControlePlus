// Área de gráficos do mês em CARROSSEL (arraste pro lado, estilo Instagram):
// página 1 = Despesas (Fixas x Variáveis), página 2 = Por Pagamento.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import ExpensesBreakdown from './ExpensesBreakdown';
import PaymentBreakdown from './PaymentBreakdown';
import BankBreakdown from './BankBreakdown';

export default function MonthCharts({ month }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [pageW, setPageW] = useState(0);
  const [heights, setHeights] = useState([0, 0, 0]);
  const scrollRef = useRef(null);

  const pages = [
    { key: 'cats', label: 'Despesas', icon: 'pie-chart-outline', render: <ExpensesBreakdown month={month} /> },
    { key: 'pay', label: 'Por Pagamento', icon: 'card-outline', render: <PaymentBreakdown month={month} /> },
    { key: 'bank', label: 'Por Banco', icon: 'business-outline', render: <BankBreakdown month={month} /> },
  ];

  const setH = (i, h) =>
    setHeights((prev) => {
      if (Math.abs((prev[i] || 0) - h) < 1) return prev;
      const n = [...prev];
      n[i] = h;
      return n;
    });

  const onScrollEnd = (e) => {
    if (!pageW) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / pageW);
    if (p !== page) setPage(p);
  };

  const goTo = (i) => {
    setPage(i);
    if (scrollRef.current && pageW) scrollRef.current.scrollTo({ x: i * pageW, animated: true });
  };

  const activeH = heights[page] || undefined;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Cabeçalho: título da página atual + bolinhas (tocáveis) */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={pages[page].icon} size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{pages[page].label}</Text>
        </View>
        <View style={styles.dots}>
          {pages.map((p, i) => (
            <TouchableOpacity key={p.key} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <View
                style={[
                  styles.dot,
                  {
                    width: i === page ? 22 : 8,
                    backgroundColor: i === page ? colors.primary : colors.border,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
        {pageW > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            scrollEventThrottle={16}
            style={{ height: activeH }}
          >
            {pages.map((p, i) => (
              <View key={p.key} style={{ width: pageW }}>
                <View onLayout={(e) => setH(i, e.nativeEvent.layout.height)}>{p.render}</View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Text style={[styles.hint, { color: colors.textMuted }]}>arraste para o lado para ver mais →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { height: 8, borderRadius: 4, marginLeft: 6 },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});
