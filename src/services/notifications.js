import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatBRL } from '../utils/currency';

const CHANNEL_ID = 'vencimentos';
const NOTIF_COLOR = '#F5A524';

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

function formatNames(items) {
  const names = items.map((it) => it.name || 'Despesa');
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}

function sumValues(items) {
  return items.reduce((s, it) => s + (Number(it.value) || 0), 0);
}

// Escala de urgência: quanto mais perto do vencimento, mais notificações no dia
// e mensagens mais desesperadas.
//   urgency 0 — 7 dias antes, 9h  → gentil
//   urgency 1 — 3 dias antes, 9h  → médio
//   urgency 2 — 1 dia antes, 9h   → urgente (manhã)
//   urgency 3 — 1 dia antes, 19h  → urgente (noite)
//   urgency 4 — dia do vcto, 8h   → crítico (manhã)
//   urgency 5 — dia do vcto, 13h  → crítico (tarde)
const SLOTS = [
  { offset: -7, hour: 9,  urgency: 0 },
  { offset: -3, hour: 9,  urgency: 1 },
  { offset: -1, hour: 9,  urgency: 2 },
  { offset: -1, hour: 19, urgency: 3 },
  { offset:  0, hour: 8,  urgency: 4 },
  { offset:  0, hour: 13, urgency: 5 },
];

function buildTitle(urgency, count, firstName) {
  switch (urgency) {
    case 0: return count === 1 ? `💰 Em 7 dias: ${firstName}` : `💰 ${count} vencimentos em 7 dias`;
    case 1: return count === 1 ? `⏰ Em 3 dias: ${firstName}` : `⏰ ${count} vencimentos em 3 dias`;
    case 2: return count === 1 ? `😬 Amanhã vence: ${firstName}` : `😬 ${count} vencimentos amanhã`;
    case 3: return count === 1 ? `⚠️ Amanhã é dia de pagar!` : `⚠️ ${count} pagamentos amanhã!`;
    case 4: return count === 1 ? `💸 VENCE HOJE: ${firstName}` : `💸 ${count} vencem HOJE`;
    case 5: return count === 1 ? `🔥 Ainda não pagou?` : `🔥 ${count} ainda em aberto hoje!`;
    default: return firstName;
  }
}

function buildBody(urgency, count, total, nameList, day) {
  switch (urgency) {
    case 0: return `${total} · daqui 7 dias é o dia ${day}. Vai separando!`;
    case 1: return count === 1
        ? `${total} · já tá guardado? Faltam 3 dias!`
        : `${total} total · ${nameList} — 3 dias!`;
    case 2: return `${total} · separa o dinheiro hoje para não atrasar amanhã!`;
    case 3: return count === 1
        ? `${total} · amanhã é o dia ${day}. Não vai esquecer?`
        : `${total} total · ${nameList}. Amanhã vence!`;
    case 4: return `${total} · hoje é o dia ${day}, paga o quanto antes!`;
    case 5: return count === 1
        ? `${total} · hoje é o último dia! Corre lá antes que atrase!`
        : `${total} total · ${nameList}. Última chance hoje!`;
    default: return total;
  }
}

async function send(when, title, body) {
  const secondsFromNow = Math.round((when - Date.now()) / 1000);
  if (secondsFromNow < 5) return; // ignora se já passou ou falta menos de 5s
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      color: NOTIF_COLOR,
    },
    trigger: {
      seconds: secondsFromNow,
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

// Mutex: impede execuções concorrentes que causam duplicação de notificações.
let rescheduling = false;

export async function rescheduleDueReminders(data, year) {
  if (Platform.OS === 'web' || !data) return;
  if (rescheduling) return;
  rescheduling = true;
  try {
    configure();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    const horizon = now + 60 * 24 * 3600 * 1000; // próximos 60 dias
    const months = data.months || {};

    const groups = {};
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
      const firstName = items[0].name || 'Despesa';
      const nameList = formatNames(items);

      for (const { offset, hour, urgency } of SLOTS) {
        // new Date com dia negativo funciona corretamente no JS (ex: dia 1 - 7 = 25 do mês anterior)
        const t = new Date(year, mi, day + offset, hour, 0, 0).getTime();
        if (t > now && t <= horizon) {
          const title = buildTitle(urgency, count, firstName);
          const body = buildBody(urgency, count, total, nameList, day);
          await send(t, title, body);
        }
      }
    }
  } catch (e) {
    console.warn('notif reschedule', e);
  } finally {
    rescheduling = false;
  }
}
