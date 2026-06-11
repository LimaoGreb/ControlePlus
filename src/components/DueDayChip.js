// Chip de data de vencimento (dia do mês). Toque abre uma grade pra escolher.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { contrastText } from '../utils/colorUtils';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function DueDayChip({ dueDay, onChange, color }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const accent = color || colors.primary;
  const has = !!dueDay;
  const today = new Date().getDate();

  const choose = (d) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.chip, { backgroundColor: has ? colors.alpha(accent, 0.15) : 'transparent', borderColor: has ? accent : colors.border }]}
      >
        <Ionicons name="calendar-outline" size={13} color={has ? accent : colors.textMuted} style={{ marginRight: 4 }} />
        <Text style={[styles.chipText, { color: has ? accent : colors.textMuted }]}>
          {has ? `Vence dia ${dueDay}` : 'Vencimento'}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Vence em qual dia do mês?</Text>
                <View style={styles.grid}>
                  {DAYS.map((d) => {
                    const sel = dueDay === d;
                    const isToday = d === today;
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => choose(d)}
                        style={[
                          styles.day,
                          { borderColor: colors.border },
                          isToday && !sel && { borderColor: accent, borderWidth: 2 },
                          sel && { backgroundColor: accent, borderColor: accent },
                        ]}
                      >
                        <Text style={[styles.dayText, { color: sel ? contrastText(accent) : isToday ? accent : colors.text }]}>{d}</Text>
                        {isToday && !sel && <View style={[styles.todayDot, { backgroundColor: accent }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {has && (
                  <TouchableOpacity onPress={() => choose(null)} style={styles.clearBtn}>
                    <Text style={[styles.clearText, { color: colors.negative }]}>Remover vencimento</Text>
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
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 6 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 18 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  day: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', margin: 3 },
  dayText: { fontSize: 15, fontWeight: '700' },
  todayDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 4 },
  clearBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },
  clearText: { fontSize: 13, fontWeight: '700' },
});
