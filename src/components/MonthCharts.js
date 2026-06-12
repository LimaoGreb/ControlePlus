// Carrossel de gráficos do mês — 2 páginas: Despesas e Por Pagamento
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import ExpensesBreakdown from './ExpensesBreakdown';
import PaymentBreakdown from './PaymentBreakdown';

// Virtual: [pay-clone, cats, pay, cats-clone]
//           vi=0       vi=1  vi=2  vi=3
const REAL = [1, 0, 1, 0];

export default function MonthCharts({ month }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [pageW, setPageW] = useState(0);
  const [heights, setHeights] = useState([0, 0]);
  const scrollRef = useRef(null);
  const isJumping = useRef(false);

  const realPages = [
    { key: 'cats', label: 'Despesas',      icon: 'pie-chart-outline', render: <ExpensesBreakdown month={month} /> },
    { key: 'pay',  label: 'Por Pagamento', icon: 'card-outline',       render: <PaymentBreakdown month={month} /> },
  ];

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
      isJumping.current = true;
      scrollRef.current.scrollTo({ x: 2 * pageW, animated: false });
      setPage(1);
      setTimeout(() => { isJumping.current = false; }, 50);
    } else if (vi === 3) {
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
    { key: 'pay-pre',   realIdx: 1 },
    { key: 'cats',      realIdx: 0 },
    { key: 'pay',       realIdx: 1 },
    { key: 'cats-post', realIdx: 0 },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={realPages[page].icon} size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{realPages[page].label}</Text>
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { height: 8, borderRadius: 4, marginLeft: 6 },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});
