// Carrossel de gráficos do mês — 3 páginas: Despesas, Por Pagamento, Orçamento
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import ExpensesBreakdown from './ExpensesBreakdown';
import PaymentBreakdown from './PaymentBreakdown';
import BudgetBreakdown from './BudgetBreakdown';

// Virtual: [budget-pre, cats, pay, budget, cats-post]
//           vi=0         vi=1  vi=2  vi=3     vi=4
const REAL = [2, 0, 1, 2, 0];

export default function MonthCharts({ month }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [pageW, setPageW] = useState(0);
  const [heights, setHeights] = useState([0, 0, 0]);
  const scrollRef = useRef(null);
  const isJumping = useRef(false);

  const realPages = [
    { key: 'cats',   label: 'Despesas',      icon: 'pie-chart-outline', render: <ExpensesBreakdown month={month} /> },
    { key: 'pay',    label: 'Por Pagamento', icon: 'card-outline',       render: <PaymentBreakdown month={month} /> },
    { key: 'budget', label: 'Orçamento',     icon: 'wallet-outline',     render: <BudgetBreakdown month={month} /> },
  ];

  // Inicia no vi=1 (cats)
  useEffect(() => {
    if (scrollRef.current && pageW > 0) {
      scrollRef.current.scrollTo({ x: pageW, animated: false });
    }
  }, [pageW]);

  const setH = (realIdx, h) =>
    setHeights((prev) => {
      if (Math.abs((prev[realIdx] || 0) - h) < 1) return prev;
      const n = [...prev]; n[realIdx] = h; return n;
    });

  const onScrollEnd = (e) => {
    if (!pageW || isJumping.current) return;
    const vi = Math.round(e.nativeEvent.contentOffset.x / pageW);
    if (vi === 0) {
      // clone do budget no início → pula para budget real (vi=3)
      isJumping.current = true;
      scrollRef.current.scrollTo({ x: 3 * pageW, animated: false });
      setPage(2);
      setTimeout(() => { isJumping.current = false; }, 50);
    } else if (vi === 4) {
      // clone do cats no fim → pula para cats real (vi=1)
      isJumping.current = true;
      scrollRef.current.scrollTo({ x: pageW, animated: false });
      setPage(0);
      setTimeout(() => { isJumping.current = false; }, 50);
    } else {
      setPage(REAL[vi]);
    }
  };

  const goTo = (realIdx) => {
    setPage(realIdx);
    if (scrollRef.current && pageW)
      scrollRef.current.scrollTo({ x: (realIdx + 1) * pageW, animated: true });
  };

  const activeH = (heights[page] || 0) > 0 ? heights[page] : undefined;

  const virtualItems = [
    { key: 'budget-pre',  realIdx: 2 },
    { key: 'cats',        realIdx: 0 },
    { key: 'pay',         realIdx: 1 },
    { key: 'budget',      realIdx: 2 },
    { key: 'cats-post',   realIdx: 0 },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header: pontinho + ícone do chart + label ALL CAPS */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.titleDot, { backgroundColor: colors.primary }]} />
          <Ionicons name={realPages[page].icon} size={13} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.title, { color: colors.primary }]}>
            {realPages[page].label.toUpperCase()}
          </Text>
        </View>
        <View style={styles.dots}>
          {realPages.map((p, i) => (
            <TouchableOpacity key={p.key} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <View style={[styles.dot, {
                width: i === page ? 22 : 8,
                backgroundColor: i === page ? colors.primary : colors.border,
              }]} />
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
            {virtualItems.map((item) => (
              <View key={item.key} style={{ width: pageW }}>
                <View onLayout={(e) => setH(item.realIdx, e.nativeEvent.layout.height)}>
                  {realPages[item.realIdx].render}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Text style={[styles.hint, { color: colors.textMuted }]}>← arraste para navegar →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { borderRadius: 16, marginBottom: 24, overflow: 'hidden', paddingBottom: 14 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  title:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  dots:   { flexDirection: 'row', alignItems: 'center' },
  dot:    { height: 8, borderRadius: 4, marginLeft: 6 },
  hint:   { fontSize: 10, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});
