// Registro de ações do app — salvo no AsyncStorage, máximo 500 entradas, LIFO.
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = '@activityLog_v1';
const MAX_ENTRIES = 500;

/**
 * Registra uma ação no histórico.
 * Fire-and-forget (não bloqueia o chamador).
 *
 * @param {object} opts
 * @param {string} opts.type      - slug do tipo de evento (ex: 'expense_add')
 * @param {string} opts.title     - texto principal exibido no card
 * @param {string} [opts.detail]  - detalhe opcional (nome do item, valor etc.)
 * @param {string} [opts.actor]   - 'user' | 'cap' | 'casal'
 * @param {string} [opts.icon]    - nome do Ionicons
 * @param {string} [opts.color]   - cor hex do dot/acento
 */
export async function logActivity({ type, title, detail, actor, icon, color }) {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    const entry = {
      id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      type: type || 'generic',
      title: title || 'Ação',
      detail: detail || '',
      actor: actor || 'user',
      icon: icon || 'ellipse',
      color: color || '#888888',
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...log].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[activityLog] erro ao salvar:', e?.message);
  }
}

export async function getActivityLog() {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[activityLog] erro ao carregar:', e?.message);
    return [];
  }
}

export async function clearActivityLog() {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch (e) {
    console.warn('[activityLog] erro ao limpar:', e?.message);
  }
}
