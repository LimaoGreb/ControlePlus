// Estado central de todos os dados financeiros, com salvamento automático.
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadData, saveData, replaceData, loadYearData, saveYearData, getYearKey } from '../services/storage';
import { YEAR, buildInitialMonths } from '../data/initialData';

export const DataContext = createContext(null);
// Contexto dedicado para a aba Casal — prioridade sobre DataContext em useData().
// Não afeta nenhuma outra tela; SharedMonthData é o único provider deste contexto.
export const CasalDataContext = createContext(null);
// Contexto blindado — sempre aponta para os dados pessoais do usuário logado.
// PartnerDataProvider NÃO sobrescreve este contexto, então é seguro ler aqui
// mesmo quando o modo parceiro global está ativo.
export const PersonalDataContext = createContext(null);

let idCounter = 0;
function uid(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

// Garante que um mês tenha a estrutura esperada.
function ensureMonth(m) {
  return {
    incomes: (m && m.incomes) || [],
    fixed: (m && m.fixed) || [],
    variable: (m && m.variable) || [],
    contributions: (m && m.contributions) || [],
    completed: !!(m && m.completed),
  };
}

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [activeYear, setActiveYear] = useState(YEAR);
  const [switching, setSwitching] = useState(false);
  const skipNextSave = useRef(true);
  const activeYearRef = useRef(YEAR);
  const switchingRef = useRef(false);
  const dataRef = useRef(null);
  const yearCache = useRef({});       // cache em memória: { ano: data } — troca instantânea

  useEffect(() => {
    loadData().then((d) => {
      dataRef.current = d;
      yearCache.current[YEAR] = d;
      setData(d);
      setReady(true);
    });
  }, []);

  // Mantém dataRef e cache sempre atualizados com o dado mais recente.
  useEffect(() => {
    dataRef.current = data;
    if (data) yearCache.current[activeYearRef.current] = data;
  }, [data]);

  // Salvamento automático com debounce de 400ms — reduz writes durante digitação.
  const saveTimer = useRef(null);
  useEffect(() => {
    if (!data) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveYearData(activeYearRef.current, dataRef.current);
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data]);

  // Troca de ano com cache em memória — sem await quando o ano já foi carregado.
  const switchYear = async (year) => {
    if (year === activeYearRef.current || switchingRef.current) return;
    switchingRef.current = true;

    // Salva o ano atual no cache e dispara write em background (não bloqueia)
    yearCache.current[activeYearRef.current] = dataRef.current;
    saveYearData(activeYearRef.current, dataRef.current);

    const cached = yearCache.current[year];
    if (cached) {
      // Cache hit: troca instantânea, sem AsyncStorage
      activeYearRef.current = year;
      skipNextSave.current = true;
      dataRef.current = cached;
      setData(cached);
      setActiveYear(year);
      switchingRef.current = false;
    } else {
      // Cache miss: carrega do AsyncStorage (só na primeira vez)
      setSwitching(true);
      try {
        const newData = await loadYearData(year);
        yearCache.current[year] = newData;
        activeYearRef.current = year;
        skipNextSave.current = true;
        dataRef.current = newData;
        setData(newData);
        setActiveYear(year);
      } catch (e) {
        console.warn('[DataContext] switchYear error:', e?.message);
      } finally {
        switchingRef.current = false;
        setSwitching(false);
      }
    }
  };

  const updateMonth = (monthIndex, updater) => {
    setData((prev) => {
      const months = { ...prev.months };
      const current = ensureMonth(months[monthIndex]);
      months[monthIndex] = updater(current);
      return { ...prev, months };
    });
  };

  // section: 'incomes' | 'fixed' | 'variable'
  const addItem = (monthIndex, section, name = '', value = 0, payment = null, extras = {}) => {
    updateMonth(monthIndex, (m) => ({
      ...m,
      [section]: [...m[section], { id: uid(section), name, value, payment, date: new Date().toISOString(), ...extras }],
    }));
  };

  const removeItem = (monthIndex, section, id) => {
    updateMonth(monthIndex, (m) => ({
      ...m,
      [section]: m[section].filter((it) => it.id !== id),
    }));
  };

  const updateItem = (monthIndex, section, id, field, value) => {
    updateMonth(monthIndex, (m) => ({
      ...m,
      [section]: m[section].map((it) =>
        it.id === id ? { ...it, [field]: value } : it
      ),
    }));
  };

  const copyFixedFromPrevious = (monthIndex) => {
    if (monthIndex <= 0) return false;
    const prevMonth = ensureMonth(data.months[monthIndex - 1]);
    if (!prevMonth.fixed.length) return false;
    let added = 0;
    updateMonth(monthIndex, (m) => {
      const existingNames = new Set(m.fixed.map((it) => it.name.toLowerCase().trim()));
      const toAdd = prevMonth.fixed
        .filter((it) => !existingNames.has(it.name.toLowerCase().trim()))
        .map((it) => ({ id: uid('fixed'), name: it.name, value: it.value, payment: it.payment || null }));
      added = toAdd.length;
      if (!toAdd.length) return m;
      return { ...m, fixed: [...m.fixed, ...toAdd] };
    });
    return added;
  };

  // Adiciona uma compra parcelada: espalha as parcelas nos meses seguintes,
  // cruzando anos se necessário. Retorna o total de parcelas adicionadas.
  const addInstallments = async (purchaseMonthIndex, name, parcelaValue, count, payment) => {
    const currentYearItems = [];
    const futureByYear = {}; // { yearOffset: [{month, k}] }

    for (let k = 1; k <= count; k++) {
      const absMonth = purchaseMonthIndex + k;
      const yearOffset = Math.floor(absMonth / 12);
      const month = absMonth % 12;
      if (yearOffset === 0) {
        currentYearItems.push({ month, k });
      } else {
        if (!futureByYear[yearOffset]) futureByYear[yearOffset] = [];
        futureByYear[yearOffset].push({ month, k });
      }
    }

    // Parcelas do ano atual (síncrono)
    setData((prev) => {
      const months = { ...prev.months };
      for (const { month, k } of currentYearItems) {
        const m = ensureMonth(months[month]);
        months[month] = {
          ...m,
          fixed: [...m.fixed, {
            id: uid('fixed'),
            name: `${name} (${k}/${count})`,
            value: parcelaValue,
            payment: payment || null,
            parcela: true,
          }],
        };
      }
      return { ...prev, months };
    });

    // Parcelas de anos futuros (assíncrono, cada ano em sequência)
    for (const [offsetStr, items] of Object.entries(futureByYear)) {
      const targetYear = activeYearRef.current + Number(offsetStr);
      try {
        const yearData = await loadYearData(targetYear);
        const months = { ...yearData.months };
        for (const { month, k } of items) {
          const m = ensureMonth(months[month]);
          months[month] = {
            ...m,
            fixed: [...m.fixed, {
              id: uid('fixed'),
              name: `${name} (${k}/${count})`,
              value: parcelaValue,
              payment: payment || null,
              parcela: true,
            }],
          };
        }
        await saveYearData(targetYear, { ...yearData, months });
      } catch (e) {
        console.warn(`[installments] erro ao salvar no ano ${targetYear}:`, e?.message);
      }
    }

    return count;
  };

  // Marca/desmarca o mês como concluído (conclusão manual).
  const setMonthCompleted = (monthIndex, completed) => {
    updateMonth(monthIndex, (m) => ({ ...m, completed }));
  };

  // Conclui/reabre TODAS as despesas do mês de uma vez (e o flag do mês).
  const concludeAllItems = (monthIndex, value) => {
    updateMonth(monthIndex, (m) => ({
      ...m,
      fixed: m.fixed.map((it) => ({ ...it, concluded: value })),
      variable: m.variable.map((it) => ({ ...it, concluded: value })),
      contributions: m.contributions.map((it) => ({ ...it, concluded: value })),
      completed: value,
    }));
  };

  // Replica as fontes de renda para os meses SEGUINTES ao monthIndex.
  // Não replica para meses anteriores. Não duplica: se o mês destino
  // já tem uma renda com o mesmo nome, ignora (não sobrescreve).
  const replicateIncomeToAllMonths = (monthIndex, sourceIncomes) => {
    const toReplicate = (sourceIncomes || []).filter((it) => it.value > 0);
    if (!toReplicate.length) return 0;
    setData((prev) => {
      const months = { ...prev.months };
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
      return { ...prev, months };
    });
    return toReplicate.length;
  };

  // Apaga todos os lançamentos de um mês (renda, fixos e variáveis).
  const clearMonth = (monthIndex) => {
    updateMonth(monthIndex, () => ({
      incomes: [],
      fixed: [],
      variable: [],
      contributions: [],
      completed: false,
    }));
  };

  // Apaga dados de todos os anos futuros (remove chaves do AsyncStorage).
  // Usado para corrigir corrupção por race condition no carrossel.
  const clearFutureYears = async () => {
    const keys = [];
    for (let i = 1; i <= 7; i++) {
      const y = YEAR + i;
      keys.push(getYearKey(y));
      delete yearCache.current[y];
    }
    try {
      await AsyncStorage.multiRemove(keys);
      console.warn('[DataContext] clearFutureYears: removidos', keys);
    } catch (e) {
      console.warn('[DataContext] clearFutureYears error:', e?.message);
    }
  };

  const importData = async (newData) => {
    if (!newData || !newData.months) {
      throw new Error('Arquivo inválido: estrutura de dados não reconhecida.');
    }
    await replaceData(newData);
    skipNextSave.current = true;
    setData(newData);
  };

  const value = {
    data,
    ready,
    activeYear,
    switching,
    switchYear,
    addItem,
    removeItem,
    updateItem,
    copyFixedFromPrevious,
    addInstallments,
    setMonthCompleted,
    concludeAllItems,
    replicateIncomeToAllMonths,
    clearMonth,
    importData,
    clearFutureYears,
  };

  return (
    <PersonalDataContext.Provider value={value}>
      <DataContext.Provider value={value}>{children}</DataContext.Provider>
    </PersonalDataContext.Provider>
  );
}

export function useData() {
  const casalCtx = useContext(CasalDataContext);
  if (casalCtx) return casalCtx;
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
