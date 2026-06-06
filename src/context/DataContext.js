// Estado central de todos os dados financeiros, com salvamento automático.
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { loadData, saveData, replaceData } from '../services/storage';

const DataContext = createContext(null);

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
  const skipNextSave = useRef(true);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setReady(true);
    });
  }, []);

  // Salvamento automático sempre que os dados mudam (exceto na carga inicial).
  useEffect(() => {
    if (!data) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveData(data);
  }, [data]);

  const updateMonth = (monthIndex, updater) => {
    setData((prev) => {
      const months = { ...prev.months };
      const current = ensureMonth(months[monthIndex]);
      months[monthIndex] = updater(current);
      return { ...prev, months };
    });
  };

  // section: 'incomes' | 'fixed' | 'variable'
  const addItem = (monthIndex, section, name = '', value = 0, payment = null) => {
    updateMonth(monthIndex, (m) => ({
      ...m,
      [section]: [...m[section], { id: uid(section), name, value, payment }],
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
    updateMonth(monthIndex, (m) => ({
      ...m,
      fixed: prevMonth.fixed.map((it) => ({
        id: uid('fixed'),
        name: it.name,
        value: it.value,
        payment: it.payment || null,
      })),
    }));
    return true;
  };

  // Adiciona uma compra parcelada: cria N Gastos Fixos nos meses SEGUINTES
  // (mês da compra + 1, +2, ...), cada um com o valor da parcela. Cap em Dezembro.
  // Retorna quantas parcelas couberam no ano.
  const addInstallments = (purchaseMonthIndex, name, parcelaValue, count, payment) => {
    let added = 0;
    setData((prev) => {
      const months = { ...prev.months };
      for (let k = 1; k <= count; k++) {
        const mi = purchaseMonthIndex + k;
        if (mi > 11) break;
        const m = ensureMonth(months[mi]);
        months[mi] = {
          ...m,
          fixed: [
            ...m.fixed,
            {
              id: uid('fixed'),
              name: `${name} (${k}/${count})`,
              value: parcelaValue,
              payment: payment || null,
              parcela: true,
            },
          ],
        };
        added++;
      }
      return { ...prev, months };
    });
    // added só reflete dentro do setData; o chamador calcula o esperado por conta.
    return Math.min(count, 11 - purchaseMonthIndex);
  };

  // Marca/desmarca o mês como concluído (conclusão manual).
  const setMonthCompleted = (monthIndex, completed) => {
    updateMonth(monthIndex, (m) => ({ ...m, completed }));
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
    addItem,
    removeItem,
    updateItem,
    copyFixedFromPrevious,
    addInstallments,
    setMonthCompleted,
    importData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
