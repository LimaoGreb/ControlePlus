// Escuta despesas enviadas pelo Jarvis Bot via Firebase e adiciona ao app.
// Ativa automaticamente quando o usuário tem um Telegram chatId configurado.
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getDatabase, ref, query, orderByChild, equalTo, onValue, off, update } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';

// Mesma config do firebase.js do Modo Casal
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

/**
 * Hook que escuta despesas pendentes do Jarvis Bot e as adiciona ao app.
 *
 * @param {string|null} telegramChatId — ID do chat do usuário no Telegram
 * @param {Function} addItem — função do DataContext para adicionar item
 */
export function useBotSync(telegramChatId, addItem) {
  const addItemRef = useRef(addItem);
  addItemRef.current = addItem;

  useEffect(() => {
    if (!telegramChatId) return;

    const db = getDb();
    const pendingRef = query(
      ref(db, `jarvis/${telegramChatId}/pending`),
      orderByChild('processed'),
      equalTo(false)
    );

    const unsubscribe = onValue(pendingRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const expenses = [];
      snapshot.forEach((child) => {
        expenses.push({ key: child.key, ...child.val() });
      });

      for (const expense of expenses) {
        // Adiciona ao app (seção variável do mês correspondente)
        try {
          addItemRef.current(
            expense.monthIndex,
            expense.section || 'variable',
            expense.name,
            expense.value,
            expense.payment || null,
          );

          // Marca como processado no Firebase
          await update(ref(db, `jarvis/${telegramChatId}/pending/${expense.key}`), {
            processed: true,
          });

          Alert.alert(
            '🤖 Jarvis adicionou',
            `"${expense.name}" — R$ ${expense.value.toFixed(2)}\nfoi adicionado às suas despesas.`,
            [{ text: 'Ok' }],
          );
        } catch (e) {
          console.warn('[BotSync] erro ao adicionar despesa:', e.message);
        }
      }
    });

    return () => off(pendingRef, 'value', unsubscribe);
  }, [telegramChatId]);
}
