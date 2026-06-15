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
const YEARS = Array.from({ length: 8 }, (_, i) => YEAR + i); // 2026–2033
const CURRENT_MONTH = new Date().getMonth();

export default function AllMonthsScreen({ navigation }) {
  const { colors } = useTheme();
  const { data, activeYear, switchYear, switching } = useData();
  const { width: SW } = useWindowDimensions();

  const [selMonth, setSelMonth] = useState(CURRENT_MONTH);

  const carouselRef = useRef(null);
  const yearTabsRef = useRef(null);
  useScrollToTop(carouselRef);

  // Duplo toque: conta toques por mês (key = "year-mi")
  const tapCountRef = useRef({});
  const tapTimerRef = useRef({});

  useEffect(() => {
    navigation.setOptions({ title: `Meses de ${activeYear}` });
    // Mantém a aba do ano ativo visível no scroll horizontal
    const idx = YEARS.indexOf(activeYear);
    if (idx >= 0) yearTabsRef.current?.scrollTo({ x: idx * 56, animated: true });
  }, [activeYear, navigation]);

  const getMonthData = (year, mi) =>
    year === activeYear ? (data?.months?.[mi] || {}) : {};

  // ── dados do mês selecionado ──
  const selData = getMonthData(activeYear, selMonth);
  const totals = monthTotals(selData);
  const st = monthStatus(selData);
  const progressPct = totals.rendaTotal > 0
    ? Math.min(totals.outflowTotal / totals.rendaTotal, 1) : 0;

  const STATUS_MAP = {
    done:     { label: 'Concluído',    color: colors.positive, icon: 'checkmark-circle' },
    progress: { label: 'Em andamento', color: colors.warning,  icon: 'time' },
    empty:    { label: 'Vazio',        color: colors.textMuted, icon: 'ellipse-outline' },
  };
  const si = STATUS_MAP[st];

  // ── tamanho dos botões de mês ──
  // SW - 32 (padding horizontal 16×2) - 16 (2 gaps de 8) dividido por 3 colunas
  const btnW = Math.floor((SW - 32 - 16) / 3);
  const btnH = Math.round(btnW * 0.62);

  const handlePickMonth = (year, mi) => {
    if (year !== activeYear) switchYear(year);
    setSelMonth(mi);
  };

  // Duplo toque abre o mês direto; toque simples só seleciona.
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

      {/* ══════ DISPLAY ══════ */}
      <View style={[styles.display, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* cabeçalho: nome do mês + status */}
        <View style={styles.dispHead}>
          <Text style={[styles.dispMonth, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>
            {MONTH_NAMES[selMonth]}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: si.color + '22' }]}>
            <Ionicons name={si.icon} size={12} color={si.color} />
            <Text style={[styles.statusLabel, { color: si.color }]}>{si.label}</Text>
          </View>
        </View>

        {/* stats ou mensagem vazio */}
        {st !== 'empty' ? (
          <>
            <View style={styles.statsRow}>
              {[
                { l: 'Renda',   v: totals.rendaTotal,   c: colors.positive },
                { l: 'Gastos',  v: totals.outflowTotal, c: colors.negative },
                { l: 'Sobra',   v: totals.sobraTotal,   c: totals.sobraTotal < 0 ? colors.negative : colors.text },
              ].map((s, i) => (
                <React.Fragment key={s.l}>
                  {i > 0 && <View style={[styles.vLine, { backgroundColor: colors.border }]} />}
                  <View style={styles.statCol}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.l}</Text>
                    <Text style={[styles.statVal, { color: s.c }]}>{formatBRL(s.v)}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <View style={[styles.progTrack, { backgroundColor: colors.border }]}>
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

        {/* botão abrir */}
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

      {/* ══════ TABS DE ANO (scroll horizontal p/ 8 anos) ══════ */}
      <View style={[styles.yearTabsScroll, { borderBottomColor: colors.border }]}>
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

      {/* ══════ CARROSSEL DE MESES ══════ */}
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
                        backgroundColor: isSel ? colors.primary : colors.card,
                        borderWidth: isCur && !isSel ? 2 : 0,
                        borderColor: colors.primary,
                        elevation: isSel ? 5 : 1,
                        shadowColor: '#000',
                        shadowOpacity: isSel ? 0.18 : 0.05,
                        shadowRadius: isSel ? 6 : 2,
                        shadowOffset: { width: 0, height: isSel ? 3 : 1 },
                      },
                    ]}
                  >
                    <Text style={[styles.mBtnText, { color: isSel ? '#fff' : colors.text }]}>
                      {abbr}
                    </Text>
                    {s !== 'empty' && (
                      <View style={[styles.mDot, { backgroundColor: isSel ? '#ffffff88' : dotC }]} />
                    )}
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

  // ── Display ──
  display: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  dispHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dispMonth: { fontSize: 28, fontWeight: '900', flex: 1, paddingRight: 8 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCol: { flex: 1, alignItems: 'center', gap: 1 },
  vLine: { width: 1, height: 30, marginHorizontal: 4 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  statVal: { fontSize: 14, fontWeight: '800' },

  progTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },

  noData: { fontSize: 13, textAlign: 'center', paddingVertical: 6 },

  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
  },
  openBtnText: { fontSize: 14, fontWeight: '800' },

  // ── Year tabs ──
  yearTabsScroll: {
    marginTop: 14,
    borderBottomWidth: 1,
  },
  yearTabsContent: {
    paddingHorizontal: 16,
  },
  yearTab: { alignItems: 'center', paddingBottom: 8, minWidth: 56 },
  yearTabText: { fontSize: 13 },
  yearTabLine: { position: 'absolute', bottom: 0, left: 6, right: 6, height: 2.5, borderRadius: 2 },

  // ── Month grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  mBtnText: { fontSize: 13, fontWeight: '800' },
  mBtnCurr: { fontSize: 7, lineHeight: 9 },
  mDot: { width: 5, height: 5, borderRadius: 3 },

  futureNote: { fontSize: 12, textAlign: 'center', marginTop: 18, fontStyle: 'italic' },
});
