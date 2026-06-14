// Dados compartilhados do casal — mesma API do DataContext, storage separado.
//
// Arquitetura:
//  - SharedDataProvider: fica na raiz do app, gerencia os dados compartilhados
//    e expõe via SharedCtx. NÃO sobrescreve DataContext (não afeta abas pessoais).
//  - SharedMonthData: usado APENAS dentro da aba Casal. Re-provê DataContext
//    com os dados compartilhados, fazendo MonthContent e filhos funcionarem sem
//    nenhuma alteração.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataContext, CasalDataContext } from './DataContext';
import { YEAR } from '../data/initialData';

const SHARED_KEY = `@casal:dados:${YEAR}`;
const SharedCtx = createContext(null);

let idCounter = 0;
function uid(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}
function ensureMonth(m) {
  return {
    incomes: (m && m.incomes) || [],
    fixed: (m && m.fixed) || [],
    variable: (m && m.variable) || [],
    contributions: (m && m.contributions) || [],
    completed: !!(m && m.completed),
  };
}

const EMPTY = { months: {}, projects: [] };

export function SharedDataProvider({ children }) {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(SHARED_KEY).then((raw) => {
      try {
        const p = raw ? JSON.parse(raw) : null;
        setData(p && p.months ? p : { ...EMPTY });
      } catch { setData({ ...EMPTY }); }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    AsyncStorage.setItem(SHARED_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const updateMonth = (monthIndex, updater) => {
    setData((prev) => {
      const months = { ...(prev || EMPTY).months };
      months[monthIndex] = updater(ensureMonth(months[monthIndex]));
      return { ...(prev || EMPTY), months };
    });
  };

  const addItem = (monthIndex, section, name = '', value = 0, payment = null) =>
    updateMonth(monthIndex, (m) => ({ ...m, [section]: [...m[section], { id: uid(section), name, value, payment }] }));

  const removeItem = (monthIndex, section, id) =>
    updateMonth(monthIndex, (m) => ({ ...m, [section]: m[section].filter((it) => it.id !== id) }));

  const updateItem = (monthIndex, section, id, field, value) =>
    updateMonth(monthIndex, (m) => ({ ...m, [section]: m[section].map((it) => it.id === id ? { ...it, [field]: value } : it) }));

  const addInstallments = (purchaseMonthIndex, name, parcelaValue, count, payment) => {
    setData((prev) => {
      const months = { ...(prev || EMPTY).months };
      for (let k = 1; k <= count; k++) {
        const mi = purchaseMonthIndex + k;
        if (mi > 11) break;
        const m = ensureMonth(months[mi]);
        months[mi] = { ...m, fixed: [...m.fixed, { id: uid('fixed'), name: `${name} (${k}/${count})`, value: parcelaValue, payment: payment || null, parcela: true }] };
      }
      return { ...(prev || EMPTY), months };
    });
    return Math.min(count, 11 - purchaseMonthIndex);
  };

  const setMonthCompleted = (monthIndex, completed) =>
    updateMonth(monthIndex, (m) => ({ ...m, completed }));

  const concludeAllItems = (monthIndex, value) =>
    updateMonth(monthIndex, (m) => ({
      ...m,
      fixed: m.fixed.map((it) => ({ ...it, concluded: value })),
      variable: m.variable.map((it) => ({ ...it, concluded: value })),
      contributions: m.contributions.map((it) => ({ ...it, concluded: value })),
      completed: value,
    }));

  const clearMonth = (monthIndex) =>
    updateMonth(monthIndex, () => ({ incomes: [], fixed: [], variable: [], contributions: [], completed: false }));

  const copyFixedFromPrevious = (monthIndex) => {
    if (monthIndex <= 0) return false;
    const prevMonth = ensureMonth((data?.months || {})[monthIndex - 1]);
    if (!prevMonth.fixed.length) return false;
    let added = 0;
    updateMonth(monthIndex, (m) => {
      const existingNames = new Set(m.fixed.map((it) => it.name.toLowerCase().trim()));
      const toAdd = prevMonth.fixed.filter((it) => !existingNames.has(it.name.toLowerCase().trim()))
        .map((it) => ({ id: uid('fixed'), name: it.name, value: it.value, payment: it.payment || null }));
      added = toAdd.length;
      return toAdd.length ? { ...m, fixed: [...m.fixed, ...toAdd] } : m;
    });
    return added;
  };

  const replicateIncomeToAllMonths = (monthIndex, sourceIncomes) => {
    const toReplicate = (sourceIncomes || []).filter((it) => it.value > 0);
    if (!toReplicate.length) return 0;
    setData((prev) => {
      const months = { ...(prev || EMPTY).months };
      for (let mi = monthIndex + 1; mi < 12; mi++) {
        const m = ensureMonth(months[mi]);
        let updated = [...m.incomes];
        toReplicate.forEach((src) => {
          const key = src.name.toLowerCase().trim();
          const alreadyExists = updated.some((it) => it.name.toLowerCase().trim() === key);
          if (!alreadyExists) {
            updated.push({ id: uid('incomes'), name: src.name, value: src.value, payment: null });
          }
        });
        months[mi] = { ...m, incomes: updated };
      }
      return { ...(prev || EMPTY), months };
    });
    return toReplicate.length;
  };

  // ── Projetos do casal ──
  const addCoupleProject = () =>
    setData((prev) => {
      const base = prev || EMPTY;
      return { ...base, projects: [...(base.projects || []), { id: uid('proj'), name: '', target: 0, monthly: 0, saved: 0 }] };
    });

  const updateCoupleProject = (id, field, value) =>
    setData((prev) => {
      const base = prev || EMPTY;
      return { ...base, projects: (base.projects || []).map((p) => p.id === id ? { ...p, [field]: value } : p) };
    });

  const removeCoupleProject = (id) =>
    setData((prev) => {
      const base = prev || EMPTY;
      return { ...base, projects: (base.projects || []).filter((p) => p.id !== id) };
    });

  // Recebe dados do Firebase e aplica localmente (sem re-trigger do push).
  const importSharedData = (newData) => {
    if (!newData || !newData.months) return;
    const normalized = { projects: [], ...newData };
    skipNextSave.current = true;
    AsyncStorage.setItem(SHARED_KEY, JSON.stringify(normalized)).catch(() => {});
    setData(normalized);
  };

  const sharedContextValue = {
    data, ready,
    addItem, removeItem, updateItem,
    addInstallments, setMonthCompleted, concludeAllItems,
    clearMonth, copyFixedFromPrevious, replicateIncomeToAllMonths,
    importData: (d) => { importSharedData(d); return Promise.resolve(); },
  };

  // SharedCtx é consumido pelo SyncContext e pelo SharedMonthData
  return (
    <SharedCtx.Provider value={{
      data, ready, importSharedData, sharedContextValue,
      coupleProjects: data?.projects || [],
      addCoupleProject, updateCoupleProject, removeCoupleProject,
    }}>
      {children}
    </SharedCtx.Provider>
  );
}

// Lê o SharedCtx (para SyncContext e outros consumidores internos).
export function useSharedData() {
  return useContext(SharedCtx);
}

// Wrapper usado APENAS na aba Casal — faz useData() retornar dados compartilhados
// via CasalDataContext (contexto dedicado), SEM tocar no DataContext principal.
// Isso evita qualquer conflito de override com o DataProvider raiz.
export function SharedMonthData({ children }) {
  const ctx = useSharedData();
  if (!ctx) return <View style={{ flex: 1 }} />;
  const { sharedContextValue, ready } = ctx;
  if (!ready || !sharedContextValue?.data) return <View style={{ flex: 1 }} />;
  return (
    <CasalDataContext.Provider value={sharedContextValue}>
      {children}
    </CasalDataContext.Provider>
  );
}

// Sobrescreve DataContext com os dados do(a) parceiro(a) — somente leitura.
// Usado quando activeProfile === 'partner' para mostrar as finanças da outra pessoa.
export function PartnerDataProvider({ data: partnerData, children }) {
  const noop = () => {};
  const ctxValue = {
    data: partnerData || { months: {} },
    ready: true,
    addItem: noop,
    removeItem: noop,
    updateItem: noop,
    addInstallments: noop,
    setMonthCompleted: noop,
    concludeAllItems: noop,
    clearMonth: noop,
    copyFixedFromPrevious: () => false,
    replicateIncomeToAllMonths: () => 0,
    importData: () => Promise.resolve(),
  };
  return <DataContext.Provider value={ctxValue}>{children}</DataContext.Provider>;
}
