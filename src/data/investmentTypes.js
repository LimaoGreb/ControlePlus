// Tipos de investimento suportados, agrupados por classe.
// group: 'Renda Fixa' | 'Renda Variável' | 'Outros'

export const INVESTMENT_TYPES = [
  { id: 'tesouro', label: 'Tesouro Direto', group: 'Renda Fixa' },
  { id: 'cdb', label: 'CDB', group: 'Renda Fixa' },
  { id: 'lci_lca', label: 'LCI/LCA', group: 'Renda Fixa' },
  { id: 'poupanca', label: 'Poupança', group: 'Renda Fixa' },
  { id: 'acoes', label: 'Ações', group: 'Renda Variável' },
  { id: 'fiis', label: 'FIIs', group: 'Renda Variável' },
  { id: 'etf', label: 'ETF', group: 'Renda Variável' },
  { id: 'cripto', label: 'Cripto', group: 'Renda Variável' },
  { id: 'outros', label: 'Outros', group: 'Outros' },
];

export const GROUPS = ['Renda Fixa', 'Renda Variável', 'Outros'];

export function getType(id) {
  return INVESTMENT_TYPES.find((t) => t.id === id) || null;
}

export function typeLabel(id) {
  const t = getType(id);
  return t ? t.label : 'Outros';
}

export function typeGroup(id) {
  const t = getType(id);
  return t ? t.group : 'Outros';
}
