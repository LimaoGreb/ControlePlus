// Sistema de notificações push — por despesa, com IDs persistidos no AsyncStorage.
// Isso permite cancelar notificações individualmente (ex: ao concluir uma despesa).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatBRL } from '../utils/currency';

const CHANNEL_ID = 'vencimentos';
const NOTIF_COLOR = '#F5A524';
const IDS_KEY = '@notif_ids_v3'; // { [expenseId]: [notifId, ...] }

// ─── Configuração global do handler (idempotente) ─────────────────────────────
let configured = false;
function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ─── Permissão + canal Android ────────────────────────────────────────────────
export async function ensurePermission() {
  if (Platform.OS === 'web') return false;
  try {
    configure();
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (granted && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Vencimentos',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: NOTIF_COLOR,
      });
    }
    return granted;
  } catch (e) {
    console.warn('[notif] permission error:', e?.message);
    return false;
  }
}

// ─── Escalonamento de slots ───────────────────────────────────────────────────
// level 0 → 7 dias antes: 1 notif (suave)
// level 1 → 3 dias antes: 2 notifs (médio)
// level 2 → 1 dia  antes: 3 notifs (urgente)
// level 3 → dia do vcto:  4 notifs (crítico)
const SLOTS = [
  { daysOffset: -7, hours: [9],           level: 0 },
  { daysOffset: -3, hours: [8, 19],       level: 1 },
  { daysOffset: -1, hours: [8, 14, 20],   level: 2 },
  { daysOffset:  0, hours: [7, 11, 16, 21], level: 3 },
];

function buildNotif(name, value, level, hi) {
  const val = formatBRL(value || 0);
  if (level === 0) {
    return { title: `📅 ${name} vence em 7 dias`, body: `${val} · Vai separando o dinheiro!` };
  }
  if (level === 1) {
    if (hi === 0) return { title: `⏰ ${name} vence em 3 dias!`, body: `${val} · Já separou a grana?` };
    return { title: `💡 Lembrete: ${name}`, body: `${val} · 3 dias para o vencimento!` };
  }
  if (level === 2) {
    if (hi === 0) return { title: `😬 ${name} vence amanhã!`, body: `${val} · Resolve hoje se puder!` };
    if (hi === 1) return { title: `⚠️ Amanhã vence ${name}`, body: `${val} · Não vai esquecer?` };
    return { title: `🔴 Último aviso de amanhã!`, body: `${name} · ${val}` };
  }
  // level 3 — dia do vencimento
  if (hi === 0) return { title: `💸 ${name} vence HOJE!`, body: `${val} · Paga logo cedo!` };
  if (hi === 1) return { title: `🚨 Atenção: ${name}`, body: `${val} · Ainda não foi pago!` };
  if (hi === 2) return { title: `❗ URGENTE: ${name}`, body: `${val} · Vence hoje!` };
  return { title: `🆘 Último aviso! ${name}`, body: `${val} · Não deixa passar!` };
}

// ─── Agendamento por despesa ──────────────────────────────────────────────────
export async function scheduleExpenseNotifications(expense, monthIndex, year) {
  const ids = [];
  for (const { daysOffset, hours, level } of SLOTS) {
    for (let hi = 0; hi < hours.length; hi++) {
      // new Date com dia negativo/>31 é tratado corretamente pelo JS
      const fireAt = new Date(year, monthIndex, (expense.dueDay + daysOffset), hours[hi], 0, 0);
      if (fireAt.getTime() <= Date.now() + 5000) continue;
      const { title, body } = buildNotif(expense.name, expense.value, level, hi);
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title, body, sound: 'default', color: NOTIF_COLOR },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
          },
        });
        ids.push(id);
      } catch (e) {
        console.warn('[notif] schedule error:', title, e?.message);
      }
    }
  }
  // Persiste IDs para poder cancelar individualmente depois
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    stored[expense.id] = ids;
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn('[notif] persist IDs error:', e?.message);
  }
  return ids;
}

// ─── Cancelamento por despesa ─────────────────────────────────────────────────
export async function cancelExpenseNotifications(expenseId) {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    const ids = stored[expenseId] || [];
    for (const id of ids) {
      try { await Notifications.cancelScheduledNotificationAsync(id); }
      catch {} // pode já ter disparado ou sido cancelada
    }
    delete stored[expenseId];
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn('[notif] cancel error:', expenseId, e?.message);
  }
}

// ─── Rebuild completo (chamado só no boot do app) ─────────────────────────────
let rescheduling = false;

export async function rescheduleDueReminders(data, year) {
  if (Platform.OS === 'web' || !data) return;
  if (rescheduling) return;
  rescheduling = true;
  try {
    configure();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    // Cancela tudo e limpa IDs antigos para evitar fantasmas
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(IDS_KEY);

    const months = data.months || {};
    for (let mi = 0; mi < 12; mi++) {
      const m = months[mi];
      if (!m) continue;
      const items = [...(m.fixed || []), ...(m.variable || []), ...(m.contributions || [])];
      for (const it of items) {
        if (!it.dueDay || it.concluded) continue;
        await scheduleExpenseNotifications(it, mi, year);
      }
    }
  } catch (e) {
    console.warn('[notif] rescheduleDueReminders error:', e?.message);
  } finally {
    rescheduling = false;
  }
}
