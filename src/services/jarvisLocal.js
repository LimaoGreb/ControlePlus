// Bridge entre o classificador do bot e os dados locais do app.
// Não precisa de Firebase nem Telegram — lê direto do contexto React.
import { localClassify } from '../../bot/geminiClient';
import { answerQuery } from '../../bot/queryHandler';
import { capSupport } from './capSupport';
import { BOT_SERVER_URL } from '../config/cap';
import { triggerBulkUnlock } from '../utils/editModeSignal';

const R = (v) => `R$ ${(v || 0).toFixed(2)}`;
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_PT = MONTHS.map(m => m.toLowerCase());

const CAT_LABELS = {
  alimentacao:'🍔 Alimentação', transporte:'🚗 Transporte', moradia:'🏠 Moradia',
  saude:'💊 Saúde', lazer:'🎮 Lazer', educacao:'📚 Educação',
  vestuario:'👕 Vestuário', assinaturas:'📺 Assinaturas', tech:'💻 Tecnologia', outros:'🔮 Outros',
};

// Keyword matching para auto-detectar categoria pelo nome da despesa
const AUTO_CAT = [
  { id:'alimentacao', keys:['ifood','rappi','uber eat','supermercado','mercado','restaurante','lanche','pizza','sushi','hamburguer','comida','padaria','acai','açaí','carrefour','marmita','churrasco','refeicao','refeição','boteco','fast food','delivery'] },
  { id:'moradia', keys:['aluguel','condominio','condomínio','enel','sabesp','cemig','copel','cosern','coelba','eletropaulo','iptu'] },
  { id:'transporte', keys:['uber ','gasolina','posto ','99 ','estacionamento','ônibus','onibus','metrô','metro','passagem','combustivel','pedágio','pedagio','ipva','brt','táxi','taxi','99pop'] },
  { id:'saude', keys:['farmacia','farmácia','remédio','remedio','médico','medico','consulta','plano de saude','dentista','academia','gym','smart fit','smartfit','fisio','exame','hospital','vitamina','suplemento','panvel','droga raia','drogasil'] },
  { id:'tech', keys:['mouse','teclado','notebook','iphone','samsung','kabum','steam','psn','xbox','headset','monitor','impressora','celular '] },
  { id:'assinaturas', keys:['netflix','spotify','prime video','amazon prime','hbo','disney','youtube premium','apple tv','deezer','globoplay','canva','notion','chatgpt','openai','internet ','tim ','claro ','vivo ','oi '] },
  { id:'lazer', keys:['cinema','show ','viagem','ingresso','parque','festa ','pub ','balada','boliche','bar '] },
  { id:'educacao', keys:['curso','faculdade','escola','udemy','alura','apostila','material escolar','livraria'] },
  { id:'vestuario', keys:['roupa','calca','calça','camiseta','camisa','sapato','tenis ','tênis ','sandalia','renner','riachuelo','zara','shein','c&a'] },
];

function autoDetectCategory(name) {
  const n = (name || '').toLowerCase();
  for (const cat of AUTO_CAT) {
    if (cat.keys.some(k => n.includes(k))) return cat.id;
  }
  return null;
}

function buildSnapshot(data, investments, projects, paymentMethods, userName) {
  return {
    months: data?.months || {},
    investments: investments || [],
    projects: projects || [],
    paymentMethods: paymentMethods || [],
    userName: userName || '',
  };
}

function findExpense(data, query) {
  const q = (query || '').toLowerCase();
  const months = data?.months || {};
  const mi = new Date().getMonth();
  const order = [mi, ...Array.from({ length: 12 }, (_, i) => i).filter(i => i !== mi)];
  for (const m of order) {
    for (const section of ['fixed', 'variable']) {
      const match = (months[m]?.[section] || []).find(it =>
        (it.name || '').toLowerCase().includes(q)
      );
      if (match) return { mi: m, section, item: match };
    }
  }
  return null;
}

function findProject(projects, query) {
  const q = (query || '').toLowerCase();
  return (projects || []).find(p =>
    p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())
  ) || null;
}

// Fallback via servidor: classifica com Gemini quando localClassify retorna null.
async function classifyViaServer(text, history = []) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BOT_SERVER_URL}/cap-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, history: history.slice(-6) }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const { result } = await res.json();
    return result || null;
  } catch {
    return null; // offline ou timeout — não trava o chat
  }
}

export async function processMessage(text, contextData, dataOps, settingsOps, history = []) {
  const { data, investments, projects, paymentMethods, userName } = contextData;
  const snapshot = buildSnapshot(data, investments, projects, paymentMethods, userName);
  const n = (userName || 'você').split(' ')[0]; // primeiro nome
  const t = (text || '').toLowerCase().trim();

  // ── 1. Base de conhecimento de suporte (offline, sobre como usar o app) ────
  const supportAnswer = capSupport(t, userName);
  if (supportAnswer) return { botText: supportAnswer, pendingOp: null };

  // ── 1b. "quanto no cartão" sem cartão específico → lista as opções do usuário ─
  const SPECIFIC_CARD_RE = /nubank|\bnu\b|c6|picpay|next|\binter\b|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|will/i;
  if (/\bcart[aã]o\b/i.test(t) && !SPECIFIC_CARD_RE.test(t) &&
      /\bquanto\b|\bgastos?\b|\bgastei\b|\bvejam?\b|\bmostr[ae]\b|\bquero\s+ver\b|\bver\b/i.test(t) &&
      paymentMethods?.length > 0) {
    const cards = paymentMethods.map(pm => pm.name);
    return {
      botText: `Qual cartão quer ver, ${n}? 💳\n\n${cards.map(c => `• ${c}`).join('\n')}\n\n_Fala só o nome, tipo: "${cards[0]}"_`,
      pendingOp: null,
    };
  }

  // ── 2. Classificador local (regex, >99% dos casos financeiros) ─────────────
  let classified = localClassify(t);

  // ── 3. Fallback Gemini via servidor (quando localClassify retorna null) ─────
  if (!classified) {
    classified = await classifyViaServer(text, history);
  }

  if (!classified) {
    return {
      botText: `Hmm, não entendi bem essa 🤔\n\nTenta de outro jeito, ${n}? Tipo _"como tá o mês?"_ ou _"maiores gastos"_. Se quiser ver tudo que sei fazer, manda _"o que você faz?"_`,
      pendingOp: null,
    };
  }

  const { intent, params } = classified;

  // ── Queries ──────────────────────────────────────────────────────────────────
  if (intent === 'query') {
    return { botText: answerQuery(snapshot, params), pendingOp: null };
  }

  // ── Listar despesas ──────────────────────────────────────────────────────────
  if (intent === 'list_expenses') {
    const { subtype, month: mName } = params;
    const miRaw = mName ? MONTH_PT.findIndex(m => mName.startsWith(m.substring(0, 3))) : new Date().getMonth();
    const mi = miRaw >= 0 ? miRaw : new Date().getMonth();
    const months = data?.months || {};
    const monthData = months[mi] || {};

    const allItems = [
      ...(monthData.fixed || []).filter(i => !i.isInstallmentRef).map(i => ({ ...i, _sec: 'fixed' })),
      ...(monthData.variable || []).filter(i => !i.isInstallmentRef).map(i => ({ ...i, _sec: 'variable' })),
    ];

    let items = allItems;
    if (subtype === 'uncategorized') items = allItems.filter(i => !i.category);
    else if (subtype === 'no_payment') items = allItems.filter(i => !i.payment);

    const monthName = MONTHS[mi];

    if (!items.length) {
      const msg = subtype === 'uncategorized'
        ? `Todas as despesas de ${monthName} já têm categoria! ✅`
        : subtype === 'no_payment'
        ? `Todas as despesas de ${monthName} já têm forma de pagamento! ✅`
        : `Nenhuma despesa em ${monthName} ainda, ${n}.`;
      return { botText: msg, pendingOp: null };
    }

    const fixed = items.filter(i => i._sec === 'fixed');
    const variable = items.filter(i => i._sec === 'variable');

    const fmtItem = (i) => {
      const cat = i.category ? ` · ${CAT_LABELS[i.category] || i.category}` : '';
      const pay = i.payment ? ` · 💳 ${i.payment}` : '';
      const done = i.concluded ? ' ✅' : '';
      return `• *${i.name}* — ${R(i.value)}${cat}${pay}${done}`;
    };

    const parts = [];
    if (fixed.length) parts.push(`📌 *Fixos (${fixed.length})*\n${fixed.map(fmtItem).join('\n')}`);
    if (variable.length) parts.push(`💸 *Variáveis (${variable.length})*\n${variable.map(fmtItem).join('\n')}`);

    const title = subtype === 'uncategorized'
      ? `Sem categoria em ${monthName}`
      : subtype === 'no_payment'
      ? `Sem pagamento em ${monthName}`
      : `Despesas de ${monthName}`;

    const hint = subtype === 'all'
      ? `\n\n_Editar: "muda o valor da Netflix pra 45" · "muda o pagamento do iFood pra Nubank" · "renomeia iFood pra Delivery"_`
      : subtype === 'uncategorized'
      ? `\n\n_Categorizar: "categoriza o iFood como alimentação"_`
      : `\n\n_Adicionar pagamento: "muda o pagamento da Netflix pra Nubank"_`;

    return {
      botText: `📋 *${title}* (${items.length})\n\n${parts.join('\n\n')}${hint}`,
      pendingOp: null,
    };
  }

  // ── Desbloquear todas as despesas para edição ────────────────────────────────
  if (intent === 'unlock_expenses') {
    const mi = new Date().getMonth();
    const months = data?.months || {};
    const m = months[mi] || {};
    const count = [...(m.fixed || []), ...(m.variable || [])].filter(i => !i.isInstallmentRef).length;
    if (count === 0) return { botText: `Nenhuma despesa em ${MONTHS[mi]} ainda, ${n}.`, pendingOp: null };
    triggerBulkUnlock();
    return {
      botText: `🔓 *${count} despesas de ${MONTHS[mi]}* desbloqueadas!\n\nAgora é só ir na tela e editar direto. Ou me fala aqui: _"muda o valor da Netflix pra 45"_ 📝`,
      pendingOp: null,
    };
  }

  // ── Chat / saudação ──────────────────────────────────────────────────────────
  if (intent === 'chat') {
    const chatReplies = [
      `Oi, ${n}! 😄 Tô aqui. Pergunta o que quiser sobre suas finanças!`,
      `Eai, ${n}! 👋 Pode mandar — tô de olho em tudo pra você.`,
      `Oi! Tudo certo por aqui, ${n} ✌️ O que quer saber?`,
      `${n}! 👊 Tô ligado. Alguma dúvida das finanças?`,
    ];
    return {
      botText: chatReplies[Math.floor(Math.random() * chatReplies.length)],
      pendingOp: null,
    };
  }

  // ── Concluir despesa ─────────────────────────────────────────────────────────
  if (intent === 'conclude_expense') {
    const { expense_name, all } = params;
    const mi = new Date().getMonth();
    if (all) {
      const months = data?.months || {};
      const pending = ['fixed','variable'].flatMap(sec =>
        (months[mi]?.[sec] || []).filter(it => !it.concluded).map(it => ({ sec, it }))
      );
      if (!pending.length) return { botText: `Tá tudo em dia, ${n}! ✅ Nenhuma despesa em aberto em ${MONTHS[mi]}.`, pendingOp: null };
      const lines = pending.slice(0, 5).map(({ it }) => `• ${it.name} — ${R(it.value)}`).join('\n');
      const extra = pending.length > 5 ? `\n_+${pending.length - 5} mais..._` : '';
      return {
        botText: `Concluir *${pending.length} despesa(s)* de ${MONTHS[mi]}?\n\n${lines}${extra}\n\n_(sim/não)_`,
        pendingOp: {
          fn: () => pending.forEach(({ sec, it }) => dataOps.updateItem(mi, sec, it.id, 'concluded', true)),
          successText: `Arrasou, ${n}! ✅ *${pending.length} despesas de ${MONTHS[mi]}* concluídas! 🎉`,
        },
      };
    }
    if (!expense_name || expense_name.length < 2) {
      return { botText: `Qual despesa quer concluir, ${n}? Ex: _"conclua a Netflix"_`, pendingOp: null };
    }
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Poxa, ${n}, não achei nenhuma despesa com *"${expense_name}"*. Checa como tá cadastrada!`, pendingOp: null };
    if (found.item.concluded) return { botText: `Essa já tá paga, ${n}! ✅ *${found.item.name}* já foi concluída.`, pendingOp: null };
    return {
      botText: `📝 *${found.item.name}* — ${R(found.item.value)} · ${MONTHS[found.mi]}\n\nMarcar como pago? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'concluded', true),
        successText: `Boa, ${n}! ✅ *${found.item.name}* marcada como paga! 🎉`,
      },
    };
  }

  // ── Reabrir despesa ──────────────────────────────────────────────────────────
  if (intent === 'reopen_expense') {
    const { expense_name, all } = params;
    const mi = new Date().getMonth();
    if (all) {
      const months = data?.months || {};
      const concluded = ['fixed','variable'].flatMap(sec =>
        (months[mi]?.[sec] || []).filter(it => it.concluded).map(it => ({ sec, it }))
      );
      if (!concluded.length) return { botText: `Nenhuma despesa concluída pra reabrir em ${MONTHS[mi]}, ${n}.`, pendingOp: null };
      return {
        botText: `Reabrir *${concluded.length} despesa(s)* de ${MONTHS[mi]}?\n\n_(sim/não)_`,
        pendingOp: {
          fn: () => { triggerBulkUnlock(); concluded.forEach(({ sec, it }) => dataOps.updateItem(mi, sec, it.id, 'concluded', false)); },
          successText: `🔓 Pronto, ${n}! *${concluded.length} despesas de ${MONTHS[mi]}* reabertas e desbloqueadas pra editar!`,
        },
      };
    }
    if (!expense_name || expense_name.length < 2) {
      return { botText: `Qual despesa quer reabrir, ${n}? Ex: _"reabra a Netflix"_`, pendingOp: null };
    }
    const found = findExpense(data, expense_name);
    if (!found || !found.item.concluded) return { botText: `Não encontrei *"${expense_name}"* concluída pra reabrir, ${n}. Tá certa a grafia?`, pendingOp: null };
    return {
      botText: `🔓 *${found.item.name}* — ${R(found.item.value)} · ${MONTHS[found.mi]}\n\nReabrir? _(sim/não)_`,
      pendingOp: {
        fn: () => { triggerBulkUnlock(); dataOps.updateItem(found.mi, found.section, found.item.id, 'concluded', false); },
        successText: `🔓 Feito! *${found.item.name}* reaberta e desbloqueada pra editar, ${n}!`,
      },
    };
  }

  // ── Renda ────────────────────────────────────────────────────────────────────
  if (intent === 'income') {
    const { name, value, month } = params;
    if (!value || value <= 0) return { botText: `Qual o valor da ${name || 'renda'}, ${n}?`, pendingOp: null };
    const idx = month ? MONTH_PT.findIndex(m => month.startsWith(m.substring(0, 3))) : new Date().getMonth();
    const mi = idx >= 0 ? idx : new Date().getMonth();
    return {
      botText: `💰 *${name || 'Renda'}* — ${R(value)} · ${MONTHS[mi]}\n\nConfirmar entrada? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.addItem(mi, 'incomes', name || 'Renda', value, null),
        successText: `Chegou o dinheiro! 💰 *${name || 'Renda'} de ${R(value)}* adicionada a ${MONTHS[mi]}, ${n}!`,
      },
    };
  }

  // ── Adicionar despesa ────────────────────────────────────────────────────────
  if (intent === 'add_expense') {
    const { name, value, section = 'variable', month: mName, category: explicitCat } = params;
    if (!value || value <= 0) return { botText: `Qual o valor da despesa, ${n}? Ex: _"gastei 45 no iFood"_`, pendingOp: null };
    const idx = mName ? MONTH_PT.findIndex(m => mName.startsWith(m.substring(0, 3))) : new Date().getMonth();
    const mi = idx >= 0 ? idx : new Date().getMonth();
    // Categoria: explícita no texto > auto-detectada pelo nome
    const catId = explicitCat || (name ? autoDetectCategory(name) : null);
    const catLabel = catId ? CAT_LABELS[catId] : null;
    const capName = name ? name.charAt(0).toUpperCase() + name.slice(1) : null;
    const sectionLabel = section === 'fixed' ? 'Fixa' : 'Variável';
    const catLine = catLabel ? `\n🏷️ ${catLabel}` : '';
    if (!capName) {
      return { botText: `Qual o nome da despesa, ${n}? Ex: _"gastei ${R(value)} no iFood"_`, pendingOp: null };
    }
    return {
      botText: `📝 *${capName}* — ${R(value)} · ${MONTHS[mi]} · ${sectionLabel}${catLine}\n\nConfirmar? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.addItem(mi, section, capName, value, null, catId ? { category: catId } : {}),
        successText: `✅ *${capName}* adicionada${catLabel ? ` em ${catLabel}` : ''}! ${R(value)} no ${MONTHS[mi]}, ${n} 🎉`,
      },
    };
  }

  // ── Criar projeto ────────────────────────────────────────────────────────────
  if (intent === 'add_project') {
    const { name, target, monthly, saved = 0 } = params;
    if (!name || name.length < 2) return { botText: `Qual o nome do projeto, ${n}? Ex: _"cria projeto viagem meta 8000 guardando 400 por mês"_`, pendingOp: null };
    if (!target) return { botText: `Qual a meta total do projeto *${name}*, ${n}?`, pendingOp: null };
    const lines = [`🎯 *${name}*`, `Meta: ${R(target)}`];
    if (monthly) lines.push(`Aporte mensal: ${R(monthly)}`);
    if (saved) lines.push(`Já guardado: ${R(saved)}`);
    return {
      botText: `${lines.join('\n')}\n\nCriar projeto? _(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.addProjectFull({ name, target, monthly: monthly || 0, saved: saved || 0 }),
        successText: `Projeto criado, ${n}! 🎯 *${name}* tá na aba Projetos. Bora nessa!`,
      },
    };
  }

  // ── Guardado no projeto ──────────────────────────────────────────────────────
  if (intent === 'update_project_saved') {
    const { project_name, amount, mode } = params;
    if (!project_name || project_name.length < 2) return { botText: `Qual projeto, ${n}? Ex: _"guardei 500 no projeto viagem"_`, pendingOp: null };
    if (!amount || amount <= 0) return { botText: `Qual o valor guardado no projeto *${project_name}*, ${n}?`, pendingOp: null };
    const proj = findProject(projects, project_name);
    if (!proj) return { botText: `Poxa, ${n}, não achei o projeto *"${project_name}"*. Checa o nome na aba Projetos!`, pendingOp: null };
    const newSaved = mode === 'set' ? amount : (proj.saved || 0) + amount;
    return {
      botText: `🎯 *${proj.name}*\n${mode === 'set' ? 'Definir' : 'Adicionar'} ${R(amount)} → total guardado: *${R(newSaved)}*\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.updateProject(proj.id, 'saved', newSaved),
        successText: `Massa, ${n}! 🎯 *${proj.name}* atualizado. Guardado agora: *${R(newSaved)}*`,
      },
    };
  }

  // ── Toggle configuração ──────────────────────────────────────────────────────
  if (intent === 'toggle_setting') {
    const { key, value } = params;
    const LABEL = {
      isInvestor: [value ? 'Ativar' : 'Desativar', 'modo investidor', value ? `📈 Modo investidor ativado! A aba Investir aparece no menu, ${n}!` : `📈 Modo investidor desativado, ${n}.`],
      makesContributions: [value ? 'Ativar' : 'Desativar', 'contribuições/dízimo', value ? `💜 Contribuições ativadas, ${n}! Não esquece de definir a porcentagem.` : `💜 Contribuições desativadas, ${n}.`],
    };
    if (!LABEL[key]) return { botText: 'Configuração não reconhecida.', pendingOp: null };
    const [verb, what, success] = LABEL[key];
    return {
      botText: `${verb} *${what}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => key === 'isInvestor' ? settingsOps.setIsInvestor(value) : settingsOps.setMakesContributions(value),
        successText: `✅ ${success}`,
      },
    };
  }

  // ── Nome do usuário ──────────────────────────────────────────────────────────
  if (intent === 'set_user_name') {
    const { name } = params;
    if (!name || name.length < 2) return { botText: `Qual nome quer usar no app, ${n}?`, pendingOp: null };
    return {
      botText: `✏️ Mudar seu nome para *${name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.setUserName(name),
        successText: `✅ Feito! Agora você é *${name}* por aqui! 😄`,
      },
    };
  }

  // ── Vencimento ───────────────────────────────────────────────────────────────
  if (intent === 'update_due_date') {
    const { expense_name, new_day } = params;
    if (!expense_name || !new_day) return { botText: `Me diz qual despesa e qual dia, ${n}:\n_"vencimento da Netflix para dia 15"_`, pendingOp: null };
    const months = data?.months || {};
    let found = null;
    for (let mi = 0; mi < 12 && !found; mi++) {
      const item = (months[mi]?.fixed || []).find(it => (it.name || '').toLowerCase().includes(expense_name.toLowerCase()));
      if (item) found = { mi, item };
    }
    if (!found) return { botText: `Não achei *"${expense_name}"* nas despesas fixas, ${n}. Checa o nome!`, pendingOp: null };
    return {
      botText: `📅 *${found.item.name}* → vence dia *${new_day}*\n\nConfirma? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, 'fixed', found.item.id, 'dueDay', new_day),
        successText: `✅ Vencimento de *${found.item.name}* → dia *${new_day}*! Notificações atualizadas, ${n}.`,
      },
    };
  }

  // ── Percentual contribuição ──────────────────────────────────────────────────
  if (intent === 'set_contribution_pct') {
    const { pct } = params;
    if (!pct || pct < 0 || pct > 100) return { botText: `Qual o percentual, ${n}? Ex: _"dízimo 10%"_`, pendingOp: null };
    return {
      botText: `💜 Definir meta de contribuição para *${pct}%*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.setContributionGoalPct(pct),
        successText: `💜 Meta de contribuição: *${pct}%* definida, ${n}!`,
      },
    };
  }

  // ── Renomear despesa ─────────────────────────────────────────────────────────
  if (intent === 'rename_expense') {
    const { expense_name, new_name } = params;
    if (!expense_name) return { botText: `Qual despesa quer renomear, ${n}? Ex: _"renomeia a Netflix para Streaming"_`, pendingOp: null };
    if (!new_name) return { botText: `Qual o novo nome para *${expense_name}*, ${n}?`, pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Não achei *"${expense_name}"* nas despesas, ${n}. Tá certo o nome?`, pendingOp: null };
    return {
      botText: `✏️ Renomear *${found.item.name}* → *${new_name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'name', new_name),
        successText: `✅ Renomeado para *${new_name}*! Atualizado, ${n}!`,
      },
    };
  }

  // ── Editar despesa ───────────────────────────────────────────────────────────
  if (intent === 'edit_expense') {
    const { expense_name, field, new_value, new_payment } = params;
    if (!expense_name) return { botText: `Qual despesa quer editar, ${n}?`, pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Não achei *"${expense_name}"*, ${n}. Checa como tá cadastrada!`, pendingOp: null };
    if (field === 'value') {
      if (!new_value || new_value <= 0) return { botText: `Qual o novo valor de *${found.item.name}*, ${n}?`, pendingOp: null };
      return {
        botText: `💰 *${found.item.name}*: ${R(found.item.value)} → *${R(new_value)}*\n\nConfirma? _(sim/não)_`,
        pendingOp: {
          fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'value', new_value),
          successText: `✅ Valor de *${found.item.name}* atualizado para *${R(new_value)}*, ${n}!`,
        },
      };
    }
    if (field === 'payment') {
      if (!new_payment) return { botText: `Qual a nova forma de pagamento de *${found.item.name}*, ${n}?`, pendingOp: null };
      const pm = (paymentMethods || []).find(p => p.name.toLowerCase().includes(new_payment.toLowerCase()));
      const pmName = pm?.name || new_payment;
      return {
        botText: `💳 *${found.item.name}* → pagamento *${pmName}*\n\nConfirma? _(sim/não)_`,
        pendingOp: {
          fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'payment', pmName),
          successText: `✅ Pagamento de *${found.item.name}* → *${pmName}*! Atualizado, ${n}!`,
        },
      };
    }
    return { botText: `O que quer editar de *${found.item.name}*, ${n}? O valor ou a forma de pagamento?`, pendingOp: null };
  }

  // ── Apagar despesa ───────────────────────────────────────────────────────────
  if (intent === 'delete_expense') {
    const { expense_name } = params;
    if (!expense_name) return { botText: `Qual despesa quer apagar, ${n}?`, pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Não achei *"${expense_name}"*, ${n}. Tá certo o nome?`, pendingOp: null };
    return {
      botText: `⚠️ Apagar *${found.item.name}* — ${R(found.item.value)} · ${MONTHS[found.mi]} permanentemente?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.removeItem(found.mi, found.section, found.item.id),
        successText: `🗑️ *${found.item.name}* apagada, ${n}!`,
      },
    };
  }

  // ── Tag de categoria em despesa ──────────────────────────────────────────────
  if (intent === 'tag_category') {
    const { expense_name, category } = params;
    if (!expense_name || expense_name.length < 2)
      return { botText: `Qual despesa quer categorizar, ${n}?\nEx: _"categoriza o iFood como alimentação"_`, pendingOp: null };
    if (!category) {
      return {
        botText: `Qual categoria pra *${expense_name}*, ${n}?\n\n🍔 Alimentação · 🚗 Transporte · 🏠 Moradia\n💊 Saúde · 🎮 Lazer · 📚 Educação\n👕 Vestuário · 📺 Assinaturas · 💻 Tech`,
        pendingOp: null,
      };
    }
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Não achei *"${expense_name}"* nas despesas, ${n}. Confere o nome!`, pendingOp: null };
    const catLabel = CAT_LABELS[category] || category;
    return {
      botText: `🏷️ *${found.item.name}* → ${catLabel}\n\nConfirmar? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'category', category),
        successText: `✅ *${found.item.name}* categorizada como ${catLabel}! Aparece nos gráficos agora, ${n} 📊`,
      },
    };
  }

  // ── Remover categoria de despesa ─────────────────────────────────────────────
  if (intent === 'remove_category') {
    const { expense_name } = params;
    if (!expense_name || expense_name.length < 2)
      return { botText: `Qual despesa quer tirar a categoria, ${n}?`, pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Não achei *"${expense_name}"*, ${n}. Confere o nome!`, pendingOp: null };
    if (!found.item.category)
      return { botText: `*${found.item.name}* ainda não tem categoria, ${n}.`, pendingOp: null };
    const catLabel = CAT_LABELS[found.item.category] || found.item.category;
    return {
      botText: `🏷️ Remover categoria *${catLabel}* de *${found.item.name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'category', null),
        successText: `✅ Categoria removida de *${found.item.name}*, ${n}!`,
      },
    };
  }

  // ── Mover despesa ────────────────────────────────────────────────────────────
  if (intent === 'move_expense') {
    const { expense_name, to_section } = params;
    if (!expense_name) return { botText: `Qual despesa quer mover, ${n}?`, pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `Não achei *"${expense_name}"*, ${n}. Checa o nome!`, pendingOp: null };
    const target = to_section === 'fixed' ? 'fixed' : 'variable';
    if (found.section === target) return { botText: `*${found.item.name}* já é ${target === 'fixed' ? 'fixa' : 'variável'}, ${n}!`, pendingOp: null };
    const label = target === 'fixed' ? 'Fixa' : 'Variável';
    return {
      botText: `🔀 Mover *${found.item.name}* para *${label}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => {
          dataOps.addItem(found.mi, target, found.item.name, found.item.value, found.item.payment);
          dataOps.removeItem(found.mi, found.section, found.item.id);
        },
        successText: `✅ *${found.item.name}* movida para ${label}, ${n}!`,
      },
    };
  }

  // ── Renomear projeto ─────────────────────────────────────────────────────────
  if (intent === 'rename_project') {
    const { project_name, new_name } = params;
    if (!project_name) return { botText: `Qual projeto quer renomear, ${n}?`, pendingOp: null };
    if (!new_name) return { botText: `Qual o novo nome para o projeto *${project_name}*, ${n}?`, pendingOp: null };
    const proj = findProject(projects, project_name);
    if (!proj) return { botText: `Não achei o projeto *"${project_name}"*, ${n}. Checa na aba Projetos!`, pendingOp: null };
    return {
      botText: `✏️ Renomear projeto *${proj.name}* → *${new_name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.updateProject(proj.id, 'name', new_name),
        successText: `✅ Projeto renomeado para *${new_name}*, ${n}!`,
      },
    };
  }

  // ── Editar projeto ───────────────────────────────────────────────────────────
  if (intent === 'edit_project') {
    const { project_name, field, new_value } = params;
    if (!project_name) return { botText: `Qual projeto quer editar, ${n}?`, pendingOp: null };
    if (!new_value || new_value <= 0) return { botText: `Qual o novo valor para o projeto *${project_name}*, ${n}?`, pendingOp: null };
    const proj = findProject(projects, project_name);
    if (!proj) return { botText: `Não achei o projeto *"${project_name}"*, ${n}. Checa na aba Projetos!`, pendingOp: null };
    const fieldLabel = field === 'target' ? 'Meta total' : 'Aporte mensal';
    return {
      botText: `🎯 *${proj.name}* — ${fieldLabel}: *${R(new_value)}*\n\nConfirma? _(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.updateProject(proj.id, field, new_value),
        successText: `✅ *${proj.name}* atualizado — ${fieldLabel}: *${R(new_value)}*, ${n}!`,
      },
    };
  }

  // ── Apagar projeto ───────────────────────────────────────────────────────────
  if (intent === 'delete_project') {
    const { project_name } = params;
    if (!project_name) return { botText: `Qual projeto quer apagar, ${n}?`, pendingOp: null };
    const proj = findProject(projects, project_name);
    if (!proj) return { botText: `Não achei o projeto *"${project_name}"*, ${n}.`, pendingOp: null };
    return {
      botText: `⚠️ Apagar o projeto *${proj.name}* permanentemente?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.removeProject(proj.id),
        successText: `🗑️ Projeto *${proj.name}* apagado, ${n}.`,
      },
    };
  }

  // ── Parcelamento / export — guia pro app ─────────────────────────────────────
  if (intent === 'add_installments') {
    return { botText: `📦 Para parcelamentos, ${n}, toca no *"+"* central e escolhe _"Parcelar compra"_. O app divide automaticamente nos meses!`, pendingOp: null };
  }
  if (intent === 'export') {
    return { botText: `📁 Para exportar seus dados, ${n}: _Configurações → Backup → Exportar JSON_.`, pendingOp: null };
  }

  return {
    botText: `Não peguei essa, ${n} 🤔\nTenta: _"como tá o mês?"_ · _"gastei no ifood?"_ · _"conclua a Netflix"_\n\nOu pergunta _"o que você faz?"_ pra ver tudo que sei!`,
    pendingOp: null,
  };
}
