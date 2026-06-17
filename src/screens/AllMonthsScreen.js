// Grade estilo calculadora: display superior mostra o mês selecionado,
// grade 4×3 embaixo são os meses como botões. Swipe lateral = ano seguinte.
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme/ThemeContext';
import { monthStatus, monthTotals } from '../utils/calculations';
import { MONTH_NAMES, YEAR } from '../data/initialData';
import { formatBRL } from '../utils/currency';

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const YEARS = Array.from({ length: 8 }, (_, i) => YEAR + i);
const CURRENT_MONTH = new Date().getMonth();

const STATS = (totals, colors) => [
  { l: 'Renda',  v: totals.rendaTotal,   c: colors.positive },
  { l: 'Gastos', v: totals.outflowTotal, c: colors.negative },
  { l: 'Sobra',  v: totals.sobraTotal,   c: totals.sobraTotal < 0 ? colors.negative : colors.positive },
];

export default function AllMonthsScreen({ navigation }) {
  const { colors } = useTheme();
  const { data, activeYear, switchYear, switching } = useData();
  const { width: SW } = useWindowDimensions();

  const [selMonth, setSelMonth] = useState(CURRENT_MONTH);

  const carouselRef = useRef(null);
  const yearTabsRef = useRef(null);
  useScrollToTop(carouselRef);

  const tapCountRef = useRef({});
  const tapTimerRef = useRef({});

  useEffect(() => {
    navigation.setOptions({ title: `Meses de ${activeYear}` });
    const idx = YEARS.indexOf(activeYear);
    if (idx >= 0) yearTabsRef.current?.scrollTo({ x: idx * 56, animated: true });
  }, [activeYear, navigation]);

  const getMonthData = (year, mi) =>
    year === activeYear ? (data?.months?.[mi] || {}) : {};

  const selData = getMonthData(activeYear, selMonth);
  const totals  = monthTotals(selData);
  const st      = monthStatus(selData);
  const progressPct = totals.rendaTotal > 0
    ? Math.min(totals.outflowTotal / totals.rendaTotal, 1) : 0;
  const sobraColor = totals.sobraTotal < 0 ? colors.negative : colors.positive;

  const STATUS_MAP = {
    done:     { label: 'Concluído',    color: colors.positive, icon: 'checkmark-circle' },
    progress: { label: 'Em andamento', color: colors.warning,  icon: 'time' },
    empty:    { label: 'Vazio',        color: colors.textMuted, icon: 'ellipse-outline' },
  };
  const si = STATUS_MAP[st];

  const btnW = Math.floor((SW - 32 - 16) / 3);
  const btnH = Math.round(btnW * 0.62);

  const handlePickMonth = (year, mi) => {
    if (year !== activeYear) switchYear(year);
    setSelMonth(mi);
  };

  const handleMonthTap = (year, mi) => {
    const key = `${year}-${mi}`;
    const prev = tapCountRef.current[key] || 0;
    if (tapTimerRef.current[key]) {
      clearTimeout(tapTimerRef.current[key]);
      tapTimerRef.current[key] = null;
    }
    if (prev >= 1) {
      tapCountRef.current[key] = 0;
      handlePickMonth(year, mi);
      if (year === activeYear && !switching) {
        navigation.navigate('MonthDetail', { monthIndex: mi, title: MONTH_NAMES[mi] });
      }
    } else {
      tapCountRef.current[key] = 1;
      tapTimerRef.current[key] = setTimeout(() => {
        tapCountRef.current[key] = 0;
        tapTimerRef.current[key] = null;
        handlePickMonth(year, mi);
      }, 280);
    }
  };

  const handleOpen = () => {
    navigation.navigate('MonthDetail', {
      monthIndex: selMonth,
      title: MONTH_NAMES[selMonth],
    });
  };

  const goToYear = (y) => {
    const idx = YEARS.indexOf(y);
    if (idx >= 0) carouselRef.current?.scrollToIndex({ index: idx, animated: true });
    switchYear(y);
  };

  const onScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (YEARS[idx] !== undefined) switchYear(YEARS[idx]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ══════ DISPLAY: flat, sem card ══════ */}
      <View style={[styles.display, { borderBottomColor: colors.border + '50' }]}>

        {/* Cabeçalho: nome do mês + chip de status */}
        <View style={styles.dispHead}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.dispMonth, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>
              {MONTH_NAMES[selMonth]}
            </Text>
            <Text style={[styles.monthNum, { color: colors.textMuted }]}>
              {String(selMonth + 1).padStart(2, '0')}/12
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: si.color + '22' }]}>
            <Ionicons name={si.icon} size={12} color={si.color} />
            <Text style={[styles.statusLabel, { color: si.color }]}>{si.label}</Text>
          </View>
        </View>

        {st !== 'empty' ? (
          <>
            {/* Stats com dot colorido antes do label */}
            <View style={styles.statsRow}>
              {STATS(totals, colors).map((s, i) => (
                <React.Fragment key={s.l}>
                  {i > 0 && <View style={[styles.vLine, { backgroundColor: colors.border + '80' }]} />}
                  <View style={styles.statCol}>
                    <View style={styles.statLabelRow}>
                      <View style={[styles.statDot, { backgroundColor: s.c }]} />
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.l.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.statVal, { color: s.c }]} numberOfLines={1} adjustsFontSizeToFit>
                      {formatBRL(s.v)}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Barra de progresso */}
            <View style={[styles.progTrack, { backgroundColor: colors.border + '50' }]}>
              <View style={[
                styles.progFill,
                { width: `${progressPct * 100}%`, backgroundColor: progressPct >= 1 ? colors.negative : colors.primary },
              ]} />
            </View>


          </>
        ) : (
          <Text style={[styles.noData, { color: colors.textMuted }]}>
            {`Nenhum dado registrado em ${activeYear}`}
          </Text>
        )}

        {/* Botão abrir */}
        <TouchableOpacity
          style={[styles.openBtn, { backgroundColor: switching ? colors.cardAlt : colors.primary }]}
          onPress={handleOpen}
          disabled={switching}
          activeOpacity={0.85}
        >
          <Text style={[styles.openBtnText, { color: switching ? colors.textMuted : '#fff' }]}>
            {switching ? 'Carregando...' : `Abrir ${MONTH_NAMES[selMonth].toLowerCase()}`}
          </Text>
          {!switching && <Ionicons name="arrow-forward" size={15} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* ══════ TABS DE ANO ══════ */}
      <View style={[styles.yearTabsScroll, { borderBottomColor: colors.border + '50' }]}>
        <ScrollView
          ref={yearTabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearTabsContent}
        >
          {YEARS.map((y) => {
            const active = y === activeYear;
            return (
              <TouchableOpacity
                key={y}
                onPress={() => goToYear(y)}
                style={styles.yearTab}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={[styles.yearTabText, {
                  color: active ? colors.primary : colors.textMuted,
                  fontWeight: active ? '900' : '500',
                }]}>
                  {y}
                </Text>
                {active && <View style={[styles.yearTabLine, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══════ GRID DE MESES ══════ */}
      <FlatList
        ref={carouselRef}
        data={YEARS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(y) => String(y)}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
        decelerationRate="fast"
        style={{ flex: 1 }}
        renderItem={({ item: year }) => (
          <View style={{ width: SW, flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
            {switching && year === activeYear && (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={[styles.futureNote, { color: colors.primary }]}>Carregando {activeYear}...</Text>
              </View>
            )}
            <View style={styles.grid}>
              {MONTH_ABBR.map((abbr, mi) => {
                const mData = getMonthData(year, mi);
                const s     = monthStatus(mData);
                const isSel = year === activeYear && mi === selMonth;
                const isCur = year === YEAR && mi === CURRENT_MONTH;
                const dotC  = { done: colors.positive, progress: colors.warning, empty: 'transparent' }[s];

                return (
                  <TouchableOpacity
                    key={mi}
                    onPress={() => handleMonthTap(year, mi)}
                    activeOpacity={0.75}
                    style={[
                      styles.mBtn,
                      {
                        width: btnW,
                        height: btnH,
                        backgroundColor: isSel ? colors.primary : colors.text + '0D',
                        borderColor: isSel ? colors.primary : colors.border + '80',
                        borderWidth: isCur && !isSel ? 1.5 : StyleSheet.hairlineWidth,
                        ...(isCur && !isSel ? { borderColor: colors.primary } : {}),
                      },
                    ]}
                  >
                    <Text style={[styles.mBtnText, { color: isSel ? '#fff' : colors.text }]}>
                      {abbr}
                    </Text>
                    {s !== 'empty' && (
                      <View style={[styles.mDot, { backgroundColor: isSel ? '#ffffff88' : dotC }]} />
                    )}
                    <Text style={[styles.mBtnNum, { color: isSel ? 'rgba(255,255,255,0.55)' : colors.textMuted }]}>
                      {String(mi + 1).padStart(2, '0')}/12
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {year !== activeYear && (
              <Text style={[styles.futureNote, { color: colors.textMuted }]}>
                Toque num mês para navegar a {year}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Display flat ──
  display: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dispHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dispMonth: { fontSize: 28, fontWeight: '900' },
  monthNum:  { fontSize: 11, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCol: { flex: 1, alignItems: 'center', gap: 2 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot: { width: 5, height: 5, borderRadius: 3 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  statVal: { fontSize: 14, fontWeight: '800' },
  vLine: { width: StyleSheet.hairlineWidth, height: 30, marginHorizontal: 4 },

  // Progress
  progTrack: { height: 4, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },

  // Sobra box — mesma linguagem do MonthlySummaryCard
  sobraBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  sobraLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  sobraVal: { fontSize: 20, fontWeight: '900' },

  noData: { fontSize: 13, textAlign: 'center', paddingVertical: 6 },

  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
  },
  openBtnText: { fontSize: 14, fontWeight: '800' },

  // ── Year tabs ──
  yearTabsScroll: {
    marginTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  yearTabsContent: { paddingHorizontal: 16 },
  yearTab: { alignItems: 'center', paddingBottom: 8, minWidth: 56 },
  yearTabText: { fontSize: 13 },
  yearTabLine: { position: 'absolute', bottom: 0, left: 6, right: 6, height: 2.5, borderRadius: 2 },

  // ── Month grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mBtn:    { borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  mBtnText:{ fontSize: 13, fontWeight: '800' },
  mDot:    { width: 5, height: 5, borderRadius: 3 },
  mBtnNum: { position: 'absolute', bottom: 5, right: 7, fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },

  futureNote: { fontSize: 12, textAlign: 'center', marginTop: 18, fontStyle: 'italic' },
});
