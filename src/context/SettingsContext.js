// Configurações do usuário: nome, formas de pagamento, perfil investidor e carteira.
import React, { createContext, useContext, useEffect, useState } from 'react';
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
} from '../services/storage';

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
    ]).then(([n, pms, inv, invts, mc, goal, av, projs, tgId]) => {
      setUserNameState(n);
      setPaymentMethods(pms);
      setIsInvestorState(inv);
      setInvestments(invts);
      setMakesContributionsState(mc);
      setContributionGoalPctState(goal);
      setAvatarState(av);
      setProjects(projs);
      if (tgId) setTelegramChatIdState(tgId);
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
    return true;
  };

  const removePaymentMethod = (id) => {
    const next = paymentMethods.filter((p) => p.id !== id);
    setPaymentMethods(next);
    savePaymentMethods(next);
  };

  const updatePaymentMethod = (id, name) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, name } : p));
    setPaymentMethods(next);
    savePaymentMethods(next);
  };

  // Marca/desmarca uma forma de pagamento como cartão de crédito (ativa o parcelamento).
  const setPaymentCredit = (id, isCredit) => {
    const next = paymentMethods.map((p) => (p.id === id ? { ...p, isCredit } : p));
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
  };

  const updateInvestment = (id, field, value) => {
    persistInvestments(
      investments.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const removeInvestment = (id) => {
    persistInvestments(investments.filter((it) => it.id !== id));
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
  };

  const updateProject = (id, field, value) => {
    persistProjects(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProject = (id) => {
    persistProjects(projects.filter((p) => p.id !== id));
  };

  const importSettings = async (s) => {
    if (!s) return;
    if (s.userName !== undefined) { setUserNameState(s.userName); await saveUserName(s.userName); }
    if (s.avatar !== undefined) { setAvatarState(s.avatar); await saveAvatar(s.avatar); }
    if (s.paymentMethods !== undefined) { setPaymentMethods(s.paymentMethods); await savePaymentMethods(s.paymentMethods); }
    if (s.isInvestor !== undefined) { setIsInvestorState(s.isInvestor); await saveIsInvestor(s.isInvestor); }
    if (s.investments !== undefined) { setInvestments(s.investments); await saveInvestments(s.investments); }
    if (s.projects !== undefined) { setProjects(s.projects); await saveProjects(s.projects); }
    if (s.makesContributions !== undefined) { setMakesContributionsState(s.makesContributions); await saveMakesContributions(s.makesContributions); }
    if (s.contributionGoalPct !== undefined) { setContributionGoalPctState(s.contributionGoalPct); await saveContributionGoal(s.contributionGoalPct); }
  };

  return (
    <SettingsContext.Provider
      value={{
        userName,
        setUserName,
        avatar,
        setAvatar,
        paymentMethods,
        addPaymentMethod,
        removePaymentMethod,
        updatePaymentMethod,
        setPaymentCredit,
        isInvestor,
        setIsInvestor,
        investments,
        addInvestment,
        updateInvestment,
        removeInvestment,
        projects,
        addProject,
        updateProject,
        removeProject,
        makesContributions,
        setMakesContributions,
        contributionGoalPct,
        setContributionGoalPct,
        importSettings,
        telegramChatId,
        setTelegramChatId,
        ready,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider');
  return ctx;
}
