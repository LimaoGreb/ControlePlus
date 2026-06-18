// lightBg: true → logo tem paths coloridos; renderiza em fundo branco pra aparecer
export const BANKS = [
  { id: 'nubank',      name: 'Nubank',         abbr: 'NU',  color: '#8A05BE' },
  { id: 'c6',          name: 'C6 Bank',         abbr: 'C6',  color: '#C9A84C' },
  { id: 'inter',       name: 'Inter',           abbr: 'IN',  color: '#FF7A00', noLogo: true },
  { id: 'picpay',      name: 'PicPay',          abbr: 'PP',  color: '#11C76F' },
  { id: 'recargapay',  name: 'RecargaPay',      abbr: 'RP',  color: '#0052CC' },
  { id: 'itau',        name: 'Itaú',            abbr: 'IT',  color: '#EC7000', noLogo: true },
  { id: 'bradesco',    name: 'Bradesco',        abbr: 'BD',  color: '#CC092F', whiteLogo: true },
  { id: 'santander',   name: 'Santander',       abbr: 'SA',  color: '#EC0000' },
  { id: 'bb',          name: 'Banco do Brasil', abbr: 'BB',  color: '#F5C400' },
  { id: 'caixa',       name: 'Caixa',           abbr: 'CX',  color: '#005CA9' },
  { id: 'sicoob',      name: 'Sicoob',          abbr: 'SC',  color: '#00703C' },
  { id: 'neon',        name: 'Neon',            abbr: 'NE',  color: '#00C4E0' },
  { id: 'next',        name: 'Next',            abbr: 'NX',  color: '#00D45E' },
  { id: 'pagbank',     name: 'PagBank',         abbr: 'PG',  color: '#00A859' },
  { id: 'mercadopago', name: 'Mercado Pago',    abbr: 'MP',  color: '#009EE3' },
  { id: 'will',        name: 'Will Bank',       abbr: 'WB',  color: '#430091' },
  { id: 'outro',       name: 'Outro',           abbr: '??',  color: '#888888' },
  { id: 'pix',         name: 'PIX',             abbr: 'PIX', color: '#32BCAD' },
  { id: 'debito',      name: 'Débito',          abbr: 'DB',  color: '#1E3A5F' },
];

export function getBankById(id) {
  return BANKS.find(b => b.id === id) || null;
}

export function getBankForPayment(pm) {
  if (!pm) return null;
  if (pm.bank) return getBankById(pm.bank);
  const n = (pm.name || '').toLowerCase().trim();
  if (n === 'pix') return getBankById('pix');
  if (n === 'débito' || n === 'debito') return getBankById('debito');
  return null;
}
