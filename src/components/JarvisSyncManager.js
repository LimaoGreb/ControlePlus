// Sincroniza snapshot do app com Firebase (para Jarvis consultar)
// e executa comandos enviados pelo bot (parcelas, vencimento).
import { useEffect, useRef } from 'react';
import { getDatabase, ref, set, onValue, off, update } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

const firebaseConfig = {
  apiKey: 'AIzaSyAw-ooawiawK-NL5uqE4i4lKzok1zbdbwE',
  authDomain: 'my-app-534a8.firebaseapp.com',
  databaseURL: 'https://my-app-534a8-default-rtdb.firebaseio.com',
  projectId: 'my-app-534a8',
  storageBucket: 'my-app-534a8.firebasestorage.app',
  messagingSenderId: '12573871088',
  appId: '1:12573871088:web:8a3d05edd5ce1925202b35',
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getDatabase();
}

export default function JarvisSyncManager() {
  const { data, addItem, updateItem, addInstallments } = useData();
  const { telegramChatId, investments, projects, userName, paymentMethods } = useSettings();

  const dataRef = useRef(data);
  const addItemRef = useRef(addItem);
  const updateItemRef = useRef(updateItem);
  const addInstallmentsRef = useRef(addInstallments);
  dataRef.current = data;
  addItemRef.current = addItem;
  updateItemRef.current = updateItem;
  addInstallmentsRef.current = addInstallments;

  const snapshotTimer = useRef(null);

  // Push snapshot ao Firebase sempre que os dados mudam (debounce 6s)
  useEffect(() => {
    if (!telegramChatId || !data) return;
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(async () => {
      try {
        const db = getDb();
        const snapshot = {
          months: data.months || {},
          investments: investments || [],
          projects: projects || [],
          paymentMethods: paymentMethods || [],
          userName: userName || '',
          ts: new Date().toISOString(),
        };
        await set(ref(db, `jarvis/${telegramChatId}/snapshot`), snapshot);
      } catch (e) {
        console.warn('[JarvisSync] push snapshot error:', e.message);
      }
    }, 6000);
    return () => snapshotTimer.current && clearTimeout(snapshotTimer.current);
  }, [data, investments, projects, paymentMethods, telegramChatId]);

  // Escuta e executa comandos do bot
  useEffect(() => {
    if (!telegramChatId) return;
    const db = getDb();
    const cmdRef = ref(db, `jarvis/${telegramChatId}/commands`);

    const unsub = onValue(cmdRef, async (snap) => {
      if (!snap.exists()) return;
      const commands = snap.val();
      for (const [cmdId, cmd] of Object.entries(commands)) {
        if (cmd.status !== 'pending') continue;
        try {
          const result = await executeCommand(cmd, dataRef.current, addItemRef.current, updateItemRef.current, addInstallmentsRef.current);
          await update(ref(db, `jarvis/${telegramChatId}/commands/${cmdId}`), {
            status: 'done',
            result,
            processedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[JarvisSync] command error:', e.message);
          await update(ref(db, `jarvis/${telegramChatId}/commands/${cmdId}`), {
            status: 'error',
            error: e.message,
          });
        }
      }
    });

    return () => off(cmdRef, 'value', unsub);
  }, [telegramChatId]);

  return null;
}

async function executeCommand(cmd, data, addItem, updateItem, addInstallments) {
  if (cmd.type === 'ADD_INSTALLMENTS') {
    const { name, parcelaValue, installments, payment, monthIndex } = cmd.params;
    const count = addInstallments(monthIndex, name, parcelaValue, installments, payment);
    return { count, name };
  }

  if (cmd.type === 'UPDATE_DUE_DATE') {
    const { expense_name, new_day } = cmd.params;
    const query = (expense_name || '').toLowerCase();
    const months = data?.months || {};
    let updated = 0;
    for (let mi = 0; mi < 12; mi++) {
      const fixed = (months[mi]?.fixed || []);
      for (const item of fixed) {
        if ((item.name || '').toLowerCase().includes(query)) {
          updateItem(mi, 'fixed', item.id, 'dueDay', new_day);
          updated++;
        }
      }
    }
    if (updated === 0) throw new Error(`Nenhuma despesa encontrada com "${expense_name}"`);
    return { updated, expense_name, new_day };
  }

  throw new Error(`Comando desconhecido: ${cmd.type}`);
}
