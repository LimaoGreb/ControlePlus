// Lembretes de vencimento via notificação local (expo-notifications).
// OBS: notificações NÃO funcionam no Expo Go — só no APK/build de verdade.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatBRL } from '../utils/currency';

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
      await Notifications.setNotificationChannelAsync('vencimentos', {
        name: 'Vencimentos',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    return granted;
  } catch (e) {
    console.warn('notif permission', e);
    return false;
  }
}

// Reagenda TODOS os lembretes com base nos dados (despesas com data de
// vencimento e ainda não concluídas). Avisa 1 dia antes (às 9h) e no dia.
export async function rescheduleDueReminders(data, year) {
  if (Platform.OS === 'web' || !data) return;
  try {
    configure();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    const horizon = now + 60 * 24 * 3600 * 1000; // próximos 60 dias
    const months = data.months || {};

    for (let mi = 0; mi < 12; mi++) {
      const m = months[mi];
      if (!m) continue;
      const items = [...(m.fixed || []), ...(m.variable || []), ...(m.contributions || [])];
      for (const it of items) {
        if (!it.dueDay || it.concluded) continue;
        const lastDay = new Date(year, mi + 1, 0).getDate();
        const day = Math.min(Math.max(1, it.dueDay), lastDay);
        const due = new Date(year, mi, day, 9, 0, 0).getTime();
        const dayBefore = due - 24 * 3600 * 1000;

        const schedule = async (when, body) => {
          if (when <= now || when > horizon) return;
          await Notifications.scheduleNotificationAsync({
            content: { title: '💸 Vencimento chegando', body, ...(Platform.OS === 'android' ? { channelId: 'vencimentos' } : {}) },
            trigger: new Date(when),
          });
        };

        await schedule(
          dayBefore,
          `${it.name || 'Despesa'} (${formatBRL(it.value)}) vence amanhã, dia ${day}. Não esquece! 📅`
        );
        await schedule(
          due,
          `${it.name || 'Despesa'} (${formatBRL(it.value)}) vence HOJE, dia ${day}. Bora pagar! ✅`
        );
      }
    }
  } catch (e) {
    console.warn('notif reschedule', e);
  }
}
