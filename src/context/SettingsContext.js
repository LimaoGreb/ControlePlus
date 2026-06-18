// Configurações do usuário: nome, formas de pagamento, perfil investidor e carteira.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  loadUserName,
  saveUserName,
  loadAvatar,
  saveAvatar,
  loadPaymentMethods,
  savePaymentMethods,
  loadIsInvestor,
  saveIsInvestor,
  loadInvestments,
  saveInvestments,
  loadProjects,
  saveProjects,
  loadMakesContributions,
  saveMakesContributions,
  loadContributionGoal,
  saveContributionGoal,
  loadTelegramChatId,
  saveTelegramChatId,
  loadCategoryBudgets,
  saveCategoryBudgets,
  loadCustomCategories,
  saveCustomCategories,
} from '../services/storage';

import { logActivity } from '../services/activityLog';

const fmtLog = (v) => {
  if (v == null || isNaN(Number(v))) return '';
  const n = Number(v); const f = n.toFixed(2).split('.');
  f[0] = f[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return `R$ ${f[0]},${f[1]}`;
};

const SettingsContext = createContext(null);

let idCounter = 0;
const genId = (p) => `${p}_${Date.now().toString(36)}_${idCounter++}`;

export function SettingsProvider({ children }) {
  const [userName, setUserNameState] = useState('');
  const [avatar, setAvatarState] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isInvestor, setIsInvestorState] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [makesContributions, setMakesContributionsState] = useState(false);
  const [contributionGoalPct, setContributionGoalPctState] = useState(10);
  const [telegramChatId, setTelegramChatIdState] = useState(null);
  const [categoryBudgets, setCategoryBudgetsState] = useState({});
  const [customCategories, setCustomCategoriesState] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      loadUserName(),
      loadPaymentMethods(),
      loadIsInvestor(),
      loadInvestments(),
      loadMakesContributions(),
      loadContributionGoal(),
      loadAvatar(),
      loadProjects(),
      loadTelegramChatId(),
      loadCategoryBudgets(),
      loadCustomCategories(),
    ]).then(([n, pms, inv, invts, mc, goal, av, projs, tgId, catBudgets, customCats]) => {
      setUserNameState(n);
      setPaymentMethods(pms);
      setIsInvestorState(inv);
      setInvestments(invts);
      setMakesContributionsState(mc);
      setContributionGoalPctState(goal);
      setAvatarState(av);
      setProjects(projs);
      if (tgId) setTelegramChatIdState(tgId);
      setCategoryBudgetsState(catBudgets);
      setCustomCategoriesState(customCats || []);
      setReady(true);
    });
  }, []);

  const setAvatar = (av) => {
    setAvatarState(av);
    saveAvatar(av);
  };

  const setMakesContributions = (value) => {
    setMakesContributionsState(value);
    saveMakesContributions(value);
  };

  const setContributionGoalPct = (pct) => {
    const n = Math.max(0, Math.min(100, Number(pct) || 0));
    setContributionGoalPctState(n);
    saveContributionGoal(n);
  };

  const setUserName = (name) => {
    setUserNameState(name);
    saveUserName(name);
  };

  const addPaymentMethod = (name) => {
    const clean = (name || '').trim();
    if (!clean) return false;
    // Sem limite — o usuário cadastra quantas formas quiser.
    const next = [...paymentMethods, { id: genId('pm'), name: clean }];
    setPaymentMethods(next);
    savePaymentMethods(next);
    logActivity({
      type: 'payment_add', title: 'Forma de pagamento criada',
      detail: clean, icon: 'card-outline', color: '#007AFF',
    });
    return true;
  };

  const removePaymentMethod = (id) => {
    const removed = paymentMethods.find((p) => p.id === id);
    const next = paymentMethods.filter((p) => p.id !== id);
    setPaymentMethods(next);
    savePaymentMethods(next);
    if (removed) {
      logActivity({
        type: 'payment_remove', title: 'Forma de pagamento removida',
        detail: removed.name || null, icon: 'card-outline', color: '#FF3B30',
      });
    }
  };

  const updatePaymentMethod = (id, name) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, name } : p));
    setPaymentMethods(next);
    savePaymentMethods(next);
  };

  const setPaymentCredit = (id, isCredit) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, isCredit } : p));
    setPaymentMethods(next);
    savePaymentMethods(next);
  };

  const setPaymentBank = (id, bank) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, bank } : p));
    setPaymentMethods(next);
    savePaymentMethods(next);
  };

  const setPaymentLimit = (id, creditLimit) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, creditLimit: creditLimit || null } : p));
    setPaymentMethods(next);
    savePaymentMethods(next);
  };

  const setIsInvestor = (value) => {
    setIsInvestorState(value);
    saveIsInvestor(value);
  };

  const setTelegramChatId = (id) => {
    const clean = id ? String(id).trim() : null;
    setTelegramChatIdState(clean);
    saveTelegramChatId(clean);
  };

  // --- Investimentos ---
  const persistInvestments = (next) => {
    setInvestments(next);
    saveInvestments(next);
  };

  const addInvestment = () => {
    const next = [
      ...investments,
      { id: genId('inv'), name: '', typeId: 'tesouro', invested: 0, current: 0 },
    ];
    persistInvestments(next);
    logActivity({
      type: 'investment_add', title: 'Investimento adicionado',
      icon: 'trending-up-outline', color: '#AF52DE',
    });
  };

  const updateInvestment = (id, field, value) => {
    persistInvestments(
      investments.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const removeInvestment = (id) => {
    const removed = investments.find((it) => it.id === id);
    persistInvestments(investments.filter((it) => it.id !== id));
    if (removed?.name) {
      logActivity({
        type: 'investment_remove', title: 'Investimento removido',
        detail: removed.name, icon: 'trending-up-outline', color: '#FF3B30',
      });
    }
  };

  // --- Projetos / metas ---
  const persistProjects = (next) => {
    setProjects(next);
    saveProjects(next);
  };

  const addProject = () => {
    persistProjects([
      ...projects,
      { id: genId('proj'), name: '', target: 0, monthly: 0, saved: 0 },
    ]);
    logActivity({
      type: 'project_create', title: 'Projeto criado',
      icon: 'flag-outline', color: '#007AFF',
    });
  };

  // Usado pelo Jarvis — cria projeto com dados completos e retorna o id.
  const addProjectFull = ({ name, target, monthly, saved }) => {
    const newProj = { id: genId('proj'), name: name || '', target: target || 0, monthly: monthly || 0, saved: saved || 0 };
    persistProjects([...projects, newProj]);
    logActivity({
      type: 'project_create', title: 'Projeto criado',
      detail: name || null, icon: 'flag-outline', color: '#007AFF',
    });
    return newProj.id;
  };

  const updateProject = (id, field, value) => {
    if (field === 'saved' && value > 0) {
      const proj = projects.find((p) => p.id === id);
      logActivity({
        type: 'project_aporte', title: 'Aporte em projeto',
        detail: proj?.name ? `${proj.name} · ${fmtLog(value)}` : fmtLog(value),
        icon: 'flag-outline', color: '#34C759',
      });
    }
    persistProjects(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProject = (id) => {
    const removed = projects.find((p) => p.id === id);
    persistProjects(projects.filter((p) => p.id !== id));
    if (removed) {
      logActivity({
        type: 'project_remove', title: 'Projeto removido',
        detail: removed.name || null, icon: 'flag-outline', color: '#FF3B30',
      });
    }
  };

  const setCategoryBudget = (catId, limit) => {
    const next = { ...categoryBudgets, [catId]: limit };
    setCategoryBudgetsState(next);
    saveCategoryBudgets(next);
    logActivity({
      type: 'budget_set',
      title: limit ? 'Orçamento de categoria definido' : 'Orçamento de categoria removido',
      detail: limit ? `${catId} · ${fmtLog(limit)}` : catId || null,
      icon: 'pie-chart-outline', color: '#FF9500',
    });
  };

  const addCustomCategory = (name, color, emoji) => {
    const cat = { id: genId('cat'), name: (name || '').trim(), color, emoji: (emoji || '🏷️').trim(), isCustom: true };
    const next = [...customCategories, cat];
    setCustomCategoriesState(next);
    saveCustomCategories(next);
    return cat;
  };

  const updateCustomCategory = (id, updates) => {
    const next = customCategories.map(c => c.id === id ? { ...c, ...updates } : c);
    setCustomCategoriesState(next);
    saveCustomCategories(next);
  };

  const removeCustomCategory = (id) => {
    const next = customCategories.filter(c => c.id !== id);
    setCustomCategoriesState(next);
    saveCustomCategories(next);
  };

  const importSettings = async (s) => {
    if (!s) return;
    // Aplica estado em memória primeiro (resposta imediata na UI).
    if (s.userName !== undefined) setUserNameState(s.userName);
    if (s.avatar !== undefined) setAvatarState(s.avatar);
    if (s.paymentMethods !== undefined) setPaymentMethods(s.paymentMethods);
    if (s.isInvestor !== undefined) setIsInvestorState(s.isInvestor);
    if (s.investments !== undefined) setInvestments(s.investments);
    if (s.projects !== undefined) setProjects(s.projects);
    if (s.makesContributions !== undefined) setMakesContributionsState(s.makesContributions);
    if (s.contributionGoalPct !== undefined) setContributionGoalPctState(s.contributionGoalPct);

    // Persiste tudo em paralelo — detecta falhas individuais.
    const tasks = [];
    if (s.userName !== undefined) tasks.push(saveUserName(s.userName));
    if (s.avatar !== undefined) tasks.push(saveAvatar(s.avatar));
    if (s.paymentMethods !== undefined) tasks.push(savePaymentMethods(s.paymentMethods));
    if (s.isInvestor !== undefined) tasks.push(saveIsInvestor(s.isInvestor));
    if (s.investments !== undefined) tasks.push(saveInvestments(s.investments));
    if (s.projects !== undefined) tasks.push(saveProjects(s.projects));
    if (s.makesContributions !== undefined) tasks.push(saveMakesContributions(s.makesContributions));
    if (s.contributionGoalPct !== undefined) tasks.push(saveContributionGoal(s.contributionGoalPct));

    const results = await Promise.allSettled(tasks);
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('[SettingsContext] importSettings: falha ao salvar', failures.length, 'campo(s):', failures.map((f) => f.reason?.message));
      throw new Error(`Importação parcialmente falhou: ${failures.length} campo(s) não foram salvos.`);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctxValue = useMemo(() => ({
    userName, setUserName, avatar, setAvatar,
    paymentMethods, addPaymentMethod, removePaymentMethod, updatePaymentMethod,
    setPaymentCredit, setPaymentBank, setPaymentLimit,
    isInvestor, setIsInvestor,
    investments, addInvestment, updateInvestment, removeInvestment,
    projects, addProject, addProjectFull, updateProject, removeProject,
    makesContributions, setMakesContributions,
    contributionGoalPct, setContributionGoalPct,
    importSettings, telegramChatId, setTelegramChatId,
    categoryBudgets, setCategoryBudget,
    customCategories, addCustomCategory, updateCustomCategory, removeCustomCategory,
    ready,
  }), [
    userName, avatar, paymentMethods, isInvestor, investments, projects,
    makesContributions, contributionGoalPct, telegramChatId,
    categoryBudgets, customCategories, ready,
  ]); // setters e mutators omitidos: usam apenas setState (referência estável)

  return (
    <SettingsContext.Provider value={ctxValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider');
  return ctx;
}
