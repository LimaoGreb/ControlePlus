// Gera CSV com todos os dados do snapshot para envio via Telegram.
const MN = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function generateCSV(snapshot) {
  const rows = [['Mes', 'Tipo', 'Nome', 'Valor', 'Pagamento', 'Vencimento']];
  const months = snapshot?.months || {};

  for (let mi = 0; mi < 12; mi++) {
    const m = months[mi];
    if (!m) continue;
    const mn = MN[mi];
    const add = (tipo, arr) => (arr || []).forEach(i =>
      rows.push([mn, tipo, i.name || '', (i.value || 0).toFixed(2), i.payment || '', i.dueDay || ''])
    );
    add('Renda', m.incomes);
    add('Fixo', m.fixed);
    add('Variavel', m.variable);
    add('Contribuicao', m.contributions);
  }

  // BOM para Excel abrir UTF-8 corretamente
  return '﻿' + rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}
