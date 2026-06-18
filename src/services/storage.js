// Persistência local com AsyncStorage. Salva/carrega todos os dados do app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildInitialData, buildInitialMonths, YEAR } from '../data/initialData';
import { DEFAULT_PALETTE_ID } from '../theme/palettes';

const DATA_KEY = `@financas:dados:${YEAR}`;
const THEME_KEY = '@financas:tema';
const PALETTE_KEY = '@financas:paleta';
const NAME_KEY = '@financas:nome';
const AVATAR_KEY = '@financas:avatar';
const PAYMETHODS_KEY = '@financas:formasPagamento';
const INVESTOR_KEY = '@financas:investidor';
const INVESTMENTS_KEY = '@financas:investimentos';
const PROJECTS_KEY = '@financas:projetos';
const CONTRIB_KEY = '@financas:contribuicoes';
const CONTRIB_GOAL_KEY = '@financas:contribuicoesMeta';
const TELEGRAM_CHAT_ID_KEY = '@financas:telegramChatId';

export async function loadTelegramChatId() {
  try { return await AsyncStorage.getItem(TELEGRAM_CHAT_ID_KEY) || null; } catch { return null; }
}
export async function saveTelegramChatId(id) {
  try {
    if (id) await AsyncStorage.setItem(TELEGRAM_CHAT_ID_KEY, String(id));
    else await AsyncStorage.removeItem(TELEGRAM_CHAT_ID_KEY);
  } catch {}
}

// Carrega os dados salvos. Na primeira execução, semeia com a estrutura vazia.
export async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.months) return parsed;
    }
  } catch (err) {
    console.warn('Falha ao carregar dados:', err);
  }
  const initial = buildInitialData();
  await saveData(initial);
  return initial;
}

// Salva todos os dados (chamado a cada alteração — salvamento automático).
export async function saveData(data) {
  try {
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Falha ao salvar dados:', err);
    return false;
  }
}

export async function loadTheme() {
  try {
    const t = await AsyncStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'dark';
  } catch {
    return 'dark';
  }
}

export async function saveTheme(mode) {
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch (err) {
    console.warn('Falha ao salvar tema:', err);
  }
}

export async function loadPalette() {
  try {
    const p = await AsyncStorage.getItem(PALETTE_KEY);
    return p || DEFAULT_PALETTE_ID;
  } catch {
    return DEFAULT_PALETTE_ID;
  }
}

export async function savePalette(id) {
  try {
    await AsyncStorage.setItem(PALETTE_KEY, id);
  } catch (err) {
    console.warn('Falha ao salvar paleta:', err);
  }
}

export async function loadUserName() {
  try {
    return (await AsyncStorage.getItem(NAME_KEY)) || '';
  } catch {
    return '';
  }
}

export async function saveUserName(name) {
  try {
    await AsyncStorage.setItem(NAME_KEY, name || '');
  } catch (err) {
    console.warn('Falha ao salvar nome:', err);
  }
}

export async function loadAvatar() {
  try {
    const raw = await AsyncStorage.getItem(AVATAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveAvatar(avatar) {
  try {
    if (avatar) await AsyncStorage.setItem(AVATAR_KEY, JSON.stringify(avatar));
    else await AsyncStorage.removeItem(AVATAR_KEY);
  } catch (err) {
    console.warn('Falha ao salvar avatar:', err);
  }
}

export async function loadPaymentMethods() {
  try {
    const raw = await AsyncStorage.getItem(PAYMETHODS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function savePaymentMethods(list) {
  try {
    await AsyncStorage.setItem(PAYMETHODS_KEY, JSON.stringify(list || []));
  } catch (err) {
    console.warn('Falha ao salvar formas de pagamento:', err);
  }
}

export async function loadIsInvestor() {
  try {
    return (await AsyncStorage.getItem(INVESTOR_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function saveIsInvestor(value) {
  try {
    await AsyncStorage.setItem(INVESTOR_KEY, value ? 'true' : 'false');
  } catch (err) {
    console.warn('Falha ao salvar perfil investidor:', err);
  }
}

export async function loadInvestments() {
  try {
    const raw = await AsyncStorage.getItem(INVESTMENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveInvestments(list) {
  try {
    await AsyncStorage.setItem(INVESTMENTS_KEY, JSON.stringify(list || []));
  } catch (err) {
    console.warn('Falha ao salvar investimentos:', err);
  }
}

export async function loadProjects() {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveProjects(list) {
  try {
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(list || []));
  } catch (err) {
    console.warn('Falha ao salvar projetos:', err);
  }
}

export async function loadMakesContributions() {
  try {
    return (await AsyncStorage.getItem(CONTRIB_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function saveMakesContributions(value) {
  try {
    await AsyncStorage.setItem(CONTRIB_KEY, value ? 'true' : 'false');
  } catch (err) {
    console.warn('Falha ao salvar perfil de contribuições:', err);
  }
}

export async function loadContributionGoal() {
  try {
    const raw = await AsyncStorage.getItem(CONTRIB_GOAL_KEY);
    const n = raw == null ? 10 : Number(raw);
    return Number.isFinite(n) ? n : 10;
  } catch {
    return 10;
  }
}

export async function saveContributionGoal(pct) {
  try {
    await AsyncStorage.setItem(CONTRIB_GOAL_KEY, String(pct));
  } catch (err) {
    console.warn('Falha ao salvar meta de contribuições:', err);
  }
}

// Substitui todos os dados (usado na importação de backup).
export async function replaceData(data) {
  await saveData(data);
  return data;
}

// ─── Orçamento por categoria ──────────────────────────────────────────────────
const CATEGORY_BUDGETS_KEY = '@financas:orcamentoCategorias';

export async function loadCategoryBudgets() {
  try {
    const raw = await AsyncStorage.getItem(CATEGORY_BUDGETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveCategoryBudgets(budgets) {
  try {
    await AsyncStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(budgets || {}));
  } catch (e) {
    console.warn('Falha ao salvar orçamentos:', e);
  }
}

// ─── Categorias personalizadas ───────────────────────────────────────────────
const CUSTOM_CATS_KEY = '@financas:categoriasCustom';

export async function loadCustomCategories() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveCustomCategories(cats) {
  try {
    await AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(cats || []));
  } catch (e) {
    console.warn('Falha ao salvar categorias customizadas:', e);
  }
}

// ─── Multi-ano ────────────────────────────────────────────────────────────────
export const getYearKey = (year) => `@financas:dados:${year}`;

export async function loadYearData(year) {
  try {
    const raw = await AsyncStorage.getItem(getYearKey(year));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.months) return { ...parsed, year };
    }
  } catch (err) {
    console.warn(`[storage] loadYearData ${year} error:`, err?.message);
  }
  return { year, months: buildInitialMonths() };
}

export async function saveYearData(year, data) {
  try {
    await AsyncStorage.setItem(getYearKey(year), JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`[storage] saveYearData ${year} error:`, err?.message);
    return false;
  }
}
