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
  const { telegramChatId, investments, projects, userName, paymentMethods, setIsInvestor, setMakesContributions, addProjectFull, setAvatar, setPaymentLimit, setUserName, setContributionGoalPct, updateProject } = useSettings();

  const dataRef = useRef(data);
  const addItemRef = useRef(addItem);
  const updateItemRef = useRef(updateItem);
  const addInstallmentsRef = useRef(addInstallments);
  const settingsOpsRef = useRef({});
  dataRef.current = data;
  addItemRef.current = addItem;
  updateItemRef.current = updateItem;
  addInstallmentsRef.current = addInstallments;
  settingsOpsRef.current = { setIsInvestor, setMakesContributions, addProjectFull, setAvatar, setPaymentLimit, setUserName, setContributionGoalPct, updateProject, paymentMethods, projects };

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
          const result = await executeCommand(cmd, dataRef.current, addItemRef.current, updateItemRef.current, addInstallmentsRef.current, settingsOpsRef.current);
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

async function executeCommand(cmd, data, addItem, updateItem, addInstallments, settings = {}) {
  if (cmd.type === 'REOPEN_EXPENSE') {
    const { expense_name, monthIndex, all } = cmd.params;
    const months = data?.months || {};
    let reopened = 0;
    const startMi = monthIndex != null ? monthIndex : 0;
    const endMi = monthIndex != null ? monthIndex : 11;
    for (let mi = startMi; mi <= endMi; mi++) {
      for (const section of ['fixed', 'variable']) {
        for (const item of (months[mi]?.[section] || [])) {
          const nameMatch = all || (item.name || '').toLowerCase().includes((expense_name || '').toLowerCase());
          if (nameMatch && item.concluded) {
            updateItem(mi, section, item.id, 'concluded', false);
            reopened++;
          }
        }
      }
    }
    if (reopened === 0) throw new Error(`Nenhuma despesa concluída encontrada com "${expense_name}"`);
    return { reopened, expense_name };
  }

  if (cmd.type === 'ADD_INCOME') {
    const { name, value, monthIndex } = cmd.params;
    addItem(monthIndex, 'incomes', name, value, null);
    return { name, value, monthIndex };
  }

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

  if (cmd.type === 'CONCLUDE_EXPENSE') {
    const { expense_name, monthIndex } = cmd.params;
    const query = (expense_name || '').toLowerCase();
    const months = data?.months || {};
    let concluded = 0;
    let alreadyDone = 0;

    // Busca no mês especificado primeiro; se não achar item aberto,
    // percorre todos os outros meses (cobre snapshot desatualizado).
    const allMonths = Array.from({ length: 12 }, (_, i) => i);
    const searchOrder = monthIndex != null
      ? [monthIndex, ...allMonths.filter(i => i !== monthIndex)]
      : allMonths;

    for (const mi of searchOrder) {
      for (const section of ['fixed', 'variable']) {
        for (const item of (months[mi]?.[section] || [])) {
          if ((item.name || '').toLowerCase().includes(query)) {
            if (!item.concluded) {
              updateItem(mi, section, item.id, 'concluded', true);
              concluded++;
            } else {
              alreadyDone++;
            }
          }
        }
      }
      if (concluded > 0) break;
    }

    if (concluded === 0) {
      if (alreadyDone > 0)
        throw new Error(`Despesa "${expense_name}" já está concluída no app`);
      throw new Error(`Nenhuma despesa encontrada com "${expense_name}"`);
    }
    return { concluded, expense_name };
  }

  if (cmd.type === 'SET_PAYMENT_LIMIT') {
    const { card_name, limit } = cmd.params;
    const query = (card_name || '').toLowerCase();
    const pm = (settings.paymentMethods || []).find(p => p.name.toLowerCase().includes(query) || query.includes(p.name.toLowerCase()));
    if (!pm) throw new Error(`Cartão "${card_name}" não encontrado. Verifique o nome no app.`);
    settings.setPaymentLimit(pm.id, limit);
    return { cardName: pm.name, limit };
  }

  if (cmd.type === 'SET_USER_NAME') {
    const { name } = cmd.params;
    if (!name) throw new Error('Nome não informado');
    settings.setUserName(name);
    return { name };
  }

  if (cmd.type === 'SET_CONTRIBUTION_PCT') {
    const { pct } = cmd.params;
    if (pct == null) throw new Error('Percentual não informado');
    settings.setContributionGoalPct(pct);
    return { pct };
  }

  if (cmd.type === 'UPDATE_PROJECT_SAVED') {
    const { project_name, amount, mode } = cmd.params;
    const query = (project_name || '').toLowerCase();
    const proj = (settings.projects || []).find(p => p.name.toLowerCase().includes(query) || query.includes(p.name.toLowerCase()));
    if (!proj) throw new Error(`Projeto "${project_name}" não encontrado. Verifique o nome no app.`);
    const newSaved = mode === 'set' ? amount : (proj.saved || 0) + amount;
    settings.updateProject(proj.id, 'saved', newSaved);
    return { projectName: proj.name, newSaved };
  }

  if (cmd.type === 'TOGGLE_SETTING') {
    const { key, value } = cmd.params;
    if (key === 'isInvestor' && settings.setIsInvestor) settings.setIsInvestor(value);
    else if (key === 'makesContributions' && settings.setMakesContributions) settings.setMakesContributions(value);
    else throw new Error(`Chave de configuração desconhecida: ${key}`);
    return { key, value };
  }

  if (cmd.type === 'ADD_PROJECT') {
    const { name, target, monthly, saved } = cmd.params;
    if (!settings.addProjectFull) throw new Error('addProjectFull não disponível');
    const id = settings.addProjectFull({ name, target, monthly, saved: saved || 0 });
    return { id, name };
  }

  if (cmd.type === 'SET_AVATAR') {
    const { avatar } = cmd.params;
    if (!settings.setAvatar) throw new Error('setAvatar não disponível');
    settings.setAvatar(avatar);
    return { kind: avatar?.kind };
  }

  throw new Error(`Comando desconhecido: ${cmd.type}`);
}
