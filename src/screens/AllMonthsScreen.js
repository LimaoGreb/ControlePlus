// Lista dos 12 meses com 3 estados: vazio, em andamento e concluído.
import React, { useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthStatus, monthTotals } from '../utils/calculations';
import { MONTH_NAMES, YEAR } from '../data/initialData';
import { formatBRL } from '../utils/currency';

export default function AllMonthsScreen({ navigation }) {
  const { colors } = useTheme();
  const { data } = useData();
  const currentMonth = new Date().getMonth();
  const listRef = useRef(null);
  useScrollToTop(listRef);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = data.months[i] || {};
    return { index: i, status: monthStatus(m), totals: monthTotals(m) };
  });

  const badgeFor = (status) => {
    switch (status) {
      case 'done':
        return { icon: 'checkmark', bg: colors.positive, fg: '#fff' };
      case 'progress':
        return { icon: 'time-outline', bg: colors.warning, fg: '#fff' };
      default:
        return { icon: 'ellipse-outline', bg: colors.cardAlt, fg: colors.textMuted };
    }
  };

  const renderItem = ({ item }) => {
    const isCurrent = item.index === currentMonth;
    const sobraColor = item.totals.sobraTotal < 0 ? colors.negative : colors.positive;
    const badge = badgeFor(item.status);

    let statusText = 'Vazio — toque para preencher';
    if (item.status === 'progress') statusText = 'Em andamento';
    if (item.status === 'done') statusText = 'Concluído';

    return (
      <TouchableOpacity
        style={[
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: isCurrent ? colors.primary : colors.border,
            borderWidth: isCurrent ? 2 : 1,
          },
        ]}
        onPress={() =>
          navigation.navigate('MonthDetail', {
            monthIndex: item.index,
            title: `${MONTH_NAMES[item.index]} ${YEAR}`,
          })
        }
      >
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Ionicons name={badge.icon} size={18} color={badge.fg} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.month, { color: colors.text }]}>
            {MONTH_NAMES[item.index]}
            {isCurrent ? '  • atual' : ''}
          </Text>
          {item.status === 'empty' ? (
            <Text style={[styles.sub, { color: colors.textMuted }]}>{statusText}</Text>
          ) : (
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {statusText} · Sobra{' '}
              <Text style={{ color: sobraColor, fontWeight: '700' }}>
                {formatBRL(item.totals.sobraTotal)}
              </Text>
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={(item) => String(item.index)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.legend}>
            <LegendDot color={colors.cardAlt} label="Vazio" textColor={colors.textMuted} />
            <LegendDot color={colors.warning} label="Em andamento" textColor={colors.textSecondary} />
            <LegendDot color={colors.positive} label="Concluído" textColor={colors.textSecondary} />
          </View>
        }
      />
    </View>
  );
}

function LegendDot({ color, label, textColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendCircle, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 96 },
  legend: { flexDirection: 'row', justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendCircle: { width: 12, height: 12, borderRadius: 6, marginRight: 5 },
  legendLabel: { fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  month: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
});
