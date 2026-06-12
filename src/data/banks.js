export const BANKS = [
  { id: 'nubank',      name: 'Nubank',        color: '#8A05BE' },
  { id: 'c6',          name: 'C6 Bank',        color: '#3D3D3D' },
  { id: 'inter',       name: 'Inter',          color: '#FF7A00' },
  { id: 'picpay',      name: 'PicPay',         color: '#21C25E' },
  { id: 'recargapay',  name: 'RecargaPay',     color: '#0052CC' },
  { id: 'itau',        name: 'Itaú',           color: '#EC7000' },
  { id: 'bradesco',    name: 'Bradesco',       color: '#CC092F' },
  { id: 'santander',   name: 'Santander',      color: '#EC0000' },
  { id: 'bb',          name: 'Banco do Brasil',color: '#F5C400' },
  { id: 'caixa',       name: 'Caixa',          color: '#005CA9' },
  { id: 'sicoob',      name: 'Sicoob',         color: '#00703C' },
  { id: 'neon',        name: 'Neon',           color: '#00C4E0' },
  { id: 'next',        name: 'Next',           color: '#00D45E' },
  { id: 'pagbank',     name: 'PagBank',        color: '#00A859' },
  { id: 'mercadopago', name: 'Mercado Pago',   color: '#009EE3' },
  { id: 'will',        name: 'Will Bank',      color: '#430091' },
  { id: 'outro',       name: 'Outro',          color: '#888888' },
];

export function getBankById(id) {
  return BANKS.find(b => b.id === id) || null;
}
