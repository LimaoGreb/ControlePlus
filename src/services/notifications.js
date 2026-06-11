// Lembretes de vencimento via notificação local (expo-notifications).
// Agrupa itens por dia para evitar spam — 1 notif por data de vencimento.
// Véspera: 20h (noite de preparação). Dia do vencimento: 9h.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatBRL } from '../utils/currency';

const CHANNEL_ID = 'vencimentos';
const NOTIF_COLOR = '#F5A524'; // dourado — identidade visual do app

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
    console.warn('notif permission', e);
    return false;
  }
}

// "Aluguel", "Aluguel e Netflix", "Aluguel, Netflix e mais 2"
function formatNames(items) {
  const names = items.map((it) => it.name || 'Despesa');
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}

function sumValues(items) {
  return items.reduce((s, it) => s + (Number(it.value) || 0), 0);
}

async function send(when, title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      color: NOTIF_COLOR,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      date: new Date(when),
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

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

    // Agrupa todos os itens pendentes por (mês, dia)
    const groups = {}; // chave: `${mi}-${day}`
    for (let mi = 0; mi < 12; mi++) {
      const m = months[mi];
      if (!m) continue;
      const items = [...(m.fixed || []), ...(m.variable || []), ...(m.contributions || [])];
      for (const it of items) {
        if (!it.dueDay || it.concluded) continue;
        const lastDay = new Date(year, mi + 1, 0).getDate();
        const day = Math.min(Math.max(1, it.dueDay), lastDay);
        const key = `${mi}-${day}`;
        if (!groups[key]) groups[key] = { mi, day, items: [] };
        groups[key].items.push(it);
      }
    }

    for (const { mi, day, items } of Object.values(groups)) {
      const count = items.length;
      const total = formatBRL(sumValues(items));
      const nameList = formatNames(items);

      // Véspera às 20h — new Date(year, mi, day-1, 20, 0, 0)
      // day-1 = 0 funciona corretamente (último dia do mês anterior).
      const tEve = new Date(year, mi, day - 1, 20, 0, 0).getTime();
      if (tEve > now && tEve <= horizon) {
        const title = count === 1
          ? `💡 Vence amanhã · ${items[0].name || 'Despesa'}`
          : `💡 ${count} vencimentos amanhã`;
        const body = count === 1
          ? `${total} — separa o dinheiro hoje para o dia ${day}!`
          : `${total} no total · ${nameList}. Organiza hoje!`;
        await send(tEve, title, body);
      }

      // Dia do vencimento às 9h
      const tDue = new Date(year, mi, day, 9, 0, 0).getTime();
      if (tDue > now && tDue <= horizon) {
        const title = count === 1
          ? `💸 Pagar hoje · ${items[0].name || 'Despesa'}`
          : `💸 ${count} pagamentos hoje`;
        const body = count === 1
          ? `${total} · dia ${day} — não deixa pra depois!`
          : `${total} no total · ${nameList}.`;
        await send(tDue, title, body);
      }
    }
  } catch (e) {
    console.warn('notif reschedule', e);
  }
}
