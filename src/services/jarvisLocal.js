// Bridge entre o classificador do bot e os dados locais do app.
// Não precisa de Firebase nem Telegram — lê direto do contexto React.
import { localClassify } from '../../bot/geminiClient';
import { answerQuery } from '../../bot/queryHandler';
import { capSupport } from './capSupport';
import { BOT_SERVER_URL } from '../config/cap';

const R = (v) => `R$ ${(v || 0).toFixed(2)}`;
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_PT = MONTHS.map(m => m.toLowerCase());

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
async function classifyViaServer(text) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BOT_SERVER_URL}/cap-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
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

export async function processMessage(text, contextData, dataOps, settingsOps) {
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
      botText: `💳 *Qual cartão/forma de pagamento, ${n}?*\n\n${cards.map(c => `• ${c}`).join('\n')}\n\n_Só falar o nome: "${cards[0]}"_`,
      pendingOp: null,
    };
  }

  // ── 2. Classificador local (regex, >99% dos casos financeiros) ─────────────
  let classified = localClassify(t);

  // ── 3. Fallback Gemini via servidor (quando localClassify retorna null) ─────
  if (!classified) {
    classified = await classifyViaServer(text);
  }

  if (!classified) {
    return {
      botText: `Hmm, não peguei essa, ${n} 🤔\n\nTenta de outro jeito:\n_"como tá o mês?"_ · _"maiores gastos"_ · _"conclua a Netflix"_\n\nOu pergunta _"o que você faz?"_ pra ver tudo que sei!`,
      pendingOp: null,
    };
  }

  const { intent, params } = classified;

  // ── Queries ──────────────────────────────────────────────────────────────────
  if (intent === 'query') {
    return { botText: answerQuery(snapshot, params), pendingOp: null };
  }

  // ── Chat / saudação ──────────────────────────────────────────────────────────
  if (intent === 'chat') {
    return {
      botText: `Oi ${n}! 👋 Aqui é o *Cap*, seu capitão financeiro. Manda ver!\n\n📊 _"como tá o mês?"_\n💸 _"maiores gastos de junho"_\n✅ _"conclua a Netflix"_\n💰 _"recebi 3000 de salário"_\n🎯 _"cria projeto viagem meta 8000"_\n❓ _"como adiciono uma despesa?"_`,
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
          fn: () => concluded.forEach(({ sec, it }) => dataOps.updateItem(mi, sec, it.id, 'concluded', false)),
          successText: `🔓 Pronto, ${n}! *${concluded.length} despesas de ${MONTHS[mi]}* reabertas!`,
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
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'concluded', false),
        successText: `🔓 Feito! *${found.item.name}* reaberta, ${n}!`,
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
