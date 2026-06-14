// Gerenciador de notificações e mensagens internas do Cap.
// – No primeiro load: rebuild completo de notificações agendadas + checagem de msgs do Cap.
// – Nas mudanças de dados: diff para cancelar/reagendar só o que mudou.
// – No retorno ao primeiro plano: checagem das msgs do Cap (throttle 6h).
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from '../context/DataContext';
import { useCapMessages } from '../context/CapContext';
import {
  ensurePermission,
  scheduleExpenseNotifications,
  cancelExpenseNotifications,
  rescheduleDueReminders,
} from '../services/notifications';
import { formatBRL } from '../utils/currency';
import { YEAR } from '../data/initialData';

const CAP_SENT_KEY  = '@cap_sent_v2';   // { [expenseId_bucket]: timestamp }
const CAP_CHECK_KEY = '@cap_last_check'; // timestamp da última checagem

// ─── Checagem de msgs do Cap por proximidade de vencimento ───────────────────
async function checkCapDueMessages(data, year, addCapMessage) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  let sent = {};
  try {
    const raw = await AsyncStorage.getItem(CAP_SENT_KEY);
    sent = raw ? JSON.parse(raw) : {};
  } catch {}

  const months = data?.months || {};
  for (let mi = 0; mi < 12; mi++) {
    for (const section of ['fixed', 'variable', 'contributions']) {
      const items = months[mi]?.[section] || [];
      for (const item of items) {
        if (!item.dueDay || item.concluded) continue;
        const due = new Date(year, mi, item.dueDay);
        due.setHours(0, 0, 0, 0);
        const diff = Math.round((due.getTime() - todayMs) / 86400000);

        let bucket = null;
        if (diff === 7) bucket = '7d';
        else if (diff === 3) bucket = '3d';
        else if (diff === 1) bucket = '1d';
        else if (diff === 0) bucket = '0d';
        if (!bucket) continue;

        const k = `${item.id}_${bucket}`;
        if (sent[k]) continue;

        const v = formatBRL(item.value || 0);
        const n = item.name || 'Despesa';
        const msgMap = {
          '7d': `🗓️ *${n}* vence em 7 dias (dia ${item.dueDay}) — ${v}. Vai separando a grana!`,
          '3d': `⏰ *${n}* vence em 3 dias! ${v} — já separou o dinheiro?`,
          '1d': `🔴 *${n}* vence amanhã! ${v} — não vai esquecer, né?`,
          '0d': `🚨 *${n}* vence HOJE! ${v} — vai lá pagar antes que passe!`,
        };
        addCapMessage(msgMap[bucket]);
        sent[k] = Date.now();
      }
    }
  }

  // Limpa entradas com mais de 90 dias para não acumular lixo
  const cutoff = Date.now() - 90 * 86400000;
  for (const [k, ts] of Object.entries(sent)) {
    if (ts < cutoff) delete sent[k];
  }
  try {
    await AsyncStorage.setItem(CAP_SENT_KEY, JSON.stringify(sent));
    await AsyncStorage.setItem(CAP_CHECK_KEY, String(Date.now()));
  } catch (e) {
    console.warn('[cap] checkCapDueMessages save error:', e?.message);
  }
}

async function shouldCheck() {
  try {
    const raw = await AsyncStorage.getItem(CAP_CHECK_KEY);
    if (!raw) return true;
    return Date.now() - parseInt(raw, 10) > 6 * 3600000; // 6h
  } catch { return true; }
}

// ─── Diff: atualiza apenas as despesas que mudaram ───────────────────────────
async function diffAndUpdate(prevData, nextData, year, addCapMessage) {
  let permGranted = false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    permGranted = perm.granted;
  } catch {}

  const prevMonths = prevData?.months || {};
  const nextMonths = nextData?.months || {};

  for (let mi = 0; mi < 12; mi++) {
    for (const section of ['fixed', 'variable', 'contributions']) {
      const prevItems = prevMonths[mi]?.[section] || [];
      const nextItems = nextMonths[mi]?.[section] || [];
      const prevMap = Object.fromEntries(prevItems.map(it => [it.id, it]));
      const nextIds = new Set(nextItems.map(it => it.id));

      // Itens removidos — cancela notificações agendadas
      for (const prev of prevItems) {
        if (!nextIds.has(prev.id) && prev.dueDay) {
          await cancelExpenseNotifications(prev.id);
        }
      }

      for (const item of nextItems) {
        const prev = prevMap[item.id];

        // Item novo com dueDay
        if (!prev) {
          if (item.dueDay && !item.concluded) {
            if (permGranted) await scheduleExpenseNotifications(item, mi, year);
            addCapMessage(`📅 *${item.name}* adicionada com vencimento no dia *${item.dueDay}*! Vou te lembrar conforme chegar. 😊`);
          }
          continue;
        }

        // dueDay foi alterado
        if (prev.dueDay !== item.dueDay) {
          if (prev.dueDay) await cancelExpenseNotifications(item.id);
          if (item.dueDay && !item.concluded) {
            if (permGranted) await scheduleExpenseNotifications(item, mi, year);
            const msg = prev.dueDay
              ? `📅 Vencimento de *${item.name}* atualizado para dia *${item.dueDay}*. Anotei! ✏️`
              : `📅 *${item.name}* marcada para vencer no dia *${item.dueDay}*! Já vou te avisando. 😊`;
            addCapMessage(msg);
          }
        }

        // Concluída → cancela notificações pendentes
        if (!prev.concluded && item.concluded && item.dueDay) {
          await cancelExpenseNotifications(item.id);
        }

        // Reaberta → reagenda
        if (prev.concluded && !item.concluded && item.dueDay && permGranted) {
          await scheduleExpenseNotifications(item, mi, year);
        }
      }
    }
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function NotificationsManager() {
  const { data, ready } = useData();
  const { addCapMessage } = useCapMessages();
  const prevRef = useRef(null);
  const boosted = useRef(false);

  // Boot: rebuild completo + checagem inicial do Cap
  useEffect(() => {
    if (!ready || !data || boosted.current) return;
    boosted.current = true;
    prevRef.current = data;
    ensurePermission().then(granted => {
      if (granted) rescheduleDueReminders(data, YEAR);
    });
    checkCapDueMessages(data, YEAR, addCapMessage);
  // addCapMessage é estável (useCallback), mas não precisa estar na lista
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data]);

  // Diff incremental a cada mudança de dados
  useEffect(() => {
    if (!ready || !data) return;
    if (!prevRef.current || prevRef.current === data) return;
    const prev = prevRef.current;
    prevRef.current = data;
    diffAndUpdate(prev, data, YEAR, addCapMessage);
  }, [data, ready, addCapMessage]);

  // Retorno ao primeiro plano: checa msgs do Cap (throttle 6h)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !data) return;
      const ok = await shouldCheck();
      if (ok) checkCapDueMessages(data, YEAR, addCapMessage);
    });
    return () => sub.remove();
  }, [data, addCapMessage]);

  return null;
}
