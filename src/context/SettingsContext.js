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
  loadMakesContributions,
  saveMakesContributions,
  loadContributionGoal,
  saveContributionGoal,
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
  const [makesContributions, setMakesContributionsState] = useState(false);
  const [contributionGoalPct, setContributionGoalPctState] = useState(10);
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
    ]).then(([n, pms, inv, invts, mc, goal, av]) => {
      setUserNameState(n);
      setPaymentMethods(pms);
      setIsInvestorState(inv);
      setInvestments(invts);
      setMakesContributionsState(mc);
      setContributionGoalPctState(goal);
      setAvatarState(av);
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
        makesContributions,
        setMakesContributions,
        contributionGoalPct,
        setContributionGoalPct,
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
