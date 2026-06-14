// Bridge entre o localClassify do bot e os dados locais do app.
// Não precisa de Firebase nem Telegram — lê direto do contexto React.
import { localClassify } from '../../bot/geminiClient';
import { answerQuery } from '../../bot/queryHandler';

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

export function processMessage(text, contextData, dataOps, settingsOps) {
  const { data, investments, projects, paymentMethods, userName } = contextData;
  const snapshot = buildSnapshot(data, investments, projects, paymentMethods, userName);
  const t = (text || '').toLowerCase().trim();
  const classified = localClassify(t);

  if (!classified) {
    return {
      botText: 'Não entendi muito bem 🤔\nTenta: _"como tá o mês?"_ · _"maiores gastos"_ · _"conclua a Netflix"_',
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
    const first = (userName || 'você').split(' ')[0];
    return {
      botText: `Oi ${first}! 👋 Aqui é o *Cap*, seu capitão financeiro.\n\n📊 _"como tá o mês?"_\n💸 _"maiores gastos de junho"_\n✅ _"conclua a Netflix"_\n💰 _"recebi 3000 de salário"_\n🎯 _"cria projeto viagem meta 8000"_`,
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
      if (!pending.length) return { botText: `✅ Nenhuma despesa em aberto em ${MONTHS[mi]}.`, pendingOp: null };
      const lines = pending.slice(0, 5).map(({ it }) => `• ${it.name} — ${R(it.value)}`).join('\n');
      const extra = pending.length > 5 ? `\n_+${pending.length - 5} mais..._` : '';
      return {
        botText: `Concluir *${pending.length} despesa(s)* de ${MONTHS[mi]}?\n\n${lines}${extra}\n\n_(sim/não)_`,
        pendingOp: {
          fn: () => pending.forEach(({ sec, it }) => dataOps.updateItem(mi, sec, it.id, 'concluded', true)),
          successText: `✅ *${pending.length} despesas de ${MONTHS[mi]}* concluídas! 🎉`,
        },
      };
    }
    if (!expense_name || expense_name.length < 2) {
      return { botText: 'Qual despesa quer concluir? Ex: _"conclua a Netflix"_', pendingOp: null };
    }
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `❌ Não encontrei *"${expense_name}"* nas despesas.`, pendingOp: null };
    if (found.item.concluded) return { botText: `ℹ️ *${found.item.name}* já está concluída.`, pendingOp: null };
    return {
      botText: `📝 *${found.item.name}* — ${R(found.item.value)} · ${MONTHS[found.mi]}\n\nMarcar como pago? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'concluded', true),
        successText: `✅ *${found.item.name}* marcada como paga! 🎉`,
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
      if (!concluded.length) return { botText: `🔓 Nenhuma despesa concluída em ${MONTHS[mi]}.`, pendingOp: null };
      return {
        botText: `Reabrir *${concluded.length} despesa(s)* de ${MONTHS[mi]}?\n\n_(sim/não)_`,
        pendingOp: {
          fn: () => concluded.forEach(({ sec, it }) => dataOps.updateItem(mi, sec, it.id, 'concluded', false)),
          successText: `🔓 *${concluded.length} despesas de ${MONTHS[mi]}* reabertas!`,
        },
      };
    }
    if (!expense_name || expense_name.length < 2) {
      return { botText: 'Qual despesa quer reabrir? Ex: _"reabra a Netflix"_', pendingOp: null };
    }
    const found = findExpense(data, expense_name);
    if (!found || !found.item.concluded) return { botText: `❌ Não encontrei *"${expense_name}"* concluída pra reabrir.`, pendingOp: null };
    return {
      botText: `🔓 *${found.item.name}* — ${R(found.item.value)} · ${MONTHS[found.mi]}\n\nReabrir? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'concluded', false),
        successText: `🔓 *${found.item.name}* reaberta!`,
      },
    };
  }

  // ── Renda ────────────────────────────────────────────────────────────────────
  if (intent === 'income') {
    const { name, value, month } = params;
    if (!value || value <= 0) return { botText: `💰 Qual o valor da ${name || 'renda'}?`, pendingOp: null };
    const idx = month ? MONTH_PT.findIndex(m => month.startsWith(m.substring(0, 3))) : new Date().getMonth();
    const mi = idx >= 0 ? idx : new Date().getMonth();
    return {
      botText: `💰 *${name || 'Renda'}* — ${R(value)} · ${MONTHS[mi]}\n\nConfirmar entrada? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.addItem(mi, 'incomes', name || 'Renda', value, null),
        successText: `✅ *${name || 'Renda'} de ${R(value)}* adicionada a ${MONTHS[mi]}! 💰`,
      },
    };
  }

  // ── Criar projeto ────────────────────────────────────────────────────────────
  if (intent === 'add_project') {
    const { name, target, monthly, saved = 0 } = params;
    if (!name || name.length < 2) return { botText: '🎯 Qual o nome do projeto? Ex: _"cria projeto viagem meta 8000 guardando 400 por mês"_', pendingOp: null };
    if (!target) return { botText: `🎯 Qual a meta total do projeto *${name}*?`, pendingOp: null };
    const lines = [`🎯 *${name}*`, `Meta: ${R(target)}`];
    if (monthly) lines.push(`Aporte mensal: ${R(monthly)}`);
    if (saved) lines.push(`Já guardado: ${R(saved)}`);
    return {
      botText: `${lines.join('\n')}\n\nCriar projeto? _(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.addProjectFull({ name, target, monthly: monthly || 0, saved: saved || 0 }),
        successText: `✅ Projeto *${name}* criado! Veja na aba Projetos 🎯`,
      },
    };
  }

  // ── Guardado no projeto ──────────────────────────────────────────────────────
  if (intent === 'update_project_saved') {
    const { project_name, amount, mode } = params;
    if (!project_name || project_name.length < 2) return { botText: '🎯 Qual projeto? Ex: _"guardei 500 no projeto viagem"_', pendingOp: null };
    if (!amount || amount <= 0) return { botText: `🎯 Qual o valor guardado no projeto *${project_name}*?`, pendingOp: null };
    const q = project_name.toLowerCase();
    const proj = (projects || []).find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    if (!proj) return { botText: `❌ Não encontrei o projeto *"${project_name}"*. Confere o nome na aba Projetos.`, pendingOp: null };
    const newSaved = mode === 'set' ? amount : (proj.saved || 0) + amount;
    return {
      botText: `🎯 *${proj.name}*\n${mode === 'set' ? 'Definir' : 'Adicionar'} ${R(amount)} → total guardado: *${R(newSaved)}*\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.updateProject(proj.id, 'saved', newSaved),
        successText: `✅ *${proj.name}* atualizado! Guardado: *${R(newSaved)}* 🎯`,
      },
    };
  }

  // ── Toggle configuração ──────────────────────────────────────────────────────
  if (intent === 'toggle_setting') {
    const { key, value } = params;
    const LABEL = {
      isInvestor: [value ? 'Ativar' : 'Desativar', 'modo investidor', value ? '📈 Modo investidor ativado!' : '📈 Modo investidor desativado.'],
      makesContributions: [value ? 'Ativar' : 'Desativar', 'contribuições/dízimo', value ? '💜 Contribuições ativadas!' : '💜 Contribuições desativadas.'],
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
    if (!name || name.length < 2) return { botText: '✏️ Qual o nome que quer usar no app?', pendingOp: null };
    return {
      botText: `✏️ Mudar seu nome para *${name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.setUserName(name),
        successText: `✅ Nome atualizado para *${name}*!`,
      },
    };
  }

  // ── Vencimento ───────────────────────────────────────────────────────────────
  if (intent === 'update_due_date') {
    const { expense_name, new_day } = params;
    if (!expense_name || !new_day) return { botText: '📅 Me diz qual despesa e qual dia:\n_"vencimento da Netflix para dia 15"_', pendingOp: null };
    const months = data?.months || {};
    let found = null;
    for (let mi = 0; mi < 12 && !found; mi++) {
      const item = (months[mi]?.fixed || []).find(it => (it.name || '').toLowerCase().includes(expense_name.toLowerCase()));
      if (item) found = { mi, item };
    }
    if (!found) return { botText: `❌ Não encontrei *"${expense_name}"* nas despesas fixas.`, pendingOp: null };
    return {
      botText: `📅 *${found.item.name}* → vence dia *${new_day}*\n\nConfirma? _(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, 'fixed', found.item.id, 'dueDay', new_day),
        successText: `✅ Vencimento de *${found.item.name}* → dia *${new_day}*!`,
      },
    };
  }

  // ── Percentual contribuição ──────────────────────────────────────────────────
  if (intent === 'set_contribution_pct') {
    const { pct } = params;
    if (!pct || pct < 0 || pct > 100) return { botText: '💜 Qual o percentual? Ex: _"dízimo 10%"_', pendingOp: null };
    return {
      botText: `💜 Definir meta de contribuição para *${pct}%*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.setContributionGoalPct(pct),
        successText: `✅ Meta de contribuição: *${pct}%* 💜`,
      },
    };
  }

  // ── Renomear despesa ─────────────────────────────────────────────────────────
  if (intent === 'rename_expense') {
    const { expense_name, new_name } = params;
    if (!expense_name) return { botText: 'Qual despesa quer renomear? Ex: _"renomeia a Netflix para Streaming"_', pendingOp: null };
    if (!new_name) return { botText: `Qual o novo nome para *${expense_name}*?`, pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `❌ Não encontrei *"${expense_name}"* nas despesas.`, pendingOp: null };
    return {
      botText: `✏️ Renomear *${found.item.name}* → *${new_name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'name', new_name),
        successText: `✅ Renomeado para *${new_name}*!`,
      },
    };
  }

  // ── Editar despesa (valor ou pagamento) ──────────────────────────────────────
  if (intent === 'edit_expense') {
    const { expense_name, field, new_value, new_payment } = params;
    if (!expense_name) return { botText: 'Qual despesa quer editar?', pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `❌ Não encontrei *"${expense_name}"* nas despesas.`, pendingOp: null };
    if (field === 'value') {
      if (!new_value || new_value <= 0) return { botText: `Qual o novo valor de *${found.item.name}*?`, pendingOp: null };
      return {
        botText: `💰 *${found.item.name}* — ${R(found.item.value)} → *${R(new_value)}*\n\nConfirma? _(sim/não)_`,
        pendingOp: {
          fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'value', new_value),
          successText: `✅ Valor de *${found.item.name}* atualizado para *${R(new_value)}*!`,
        },
      };
    }
    if (field === 'payment') {
      if (!new_payment) return { botText: `Qual a nova forma de pagamento de *${found.item.name}*?`, pendingOp: null };
      const pm = (paymentMethods || []).find(p => p.name.toLowerCase().includes(new_payment.toLowerCase()));
      const pmId = pm?.id || null;
      const pmLabel = pm?.name || new_payment;
      return {
        botText: `💳 *${found.item.name}* → pagamento *${pmLabel}*\n\nConfirma? _(sim/não)_`,
        pendingOp: {
          fn: () => dataOps.updateItem(found.mi, found.section, found.item.id, 'payment', pmId),
          successText: `✅ Pagamento de *${found.item.name}* → *${pmLabel}*!`,
        },
      };
    }
    return { botText: 'O que quer editar? O valor ou a forma de pagamento?', pendingOp: null };
  }

  // ── Apagar despesa ───────────────────────────────────────────────────────────
  if (intent === 'delete_expense') {
    const { expense_name } = params;
    if (!expense_name) return { botText: 'Qual despesa quer apagar?', pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `❌ Não encontrei *"${expense_name}"* nas despesas.`, pendingOp: null };
    return {
      botText: `⚠️ Apagar *${found.item.name}* — ${R(found.item.value)} · ${MONTHS[found.mi]} permanentemente?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => dataOps.removeItem(found.mi, found.section, found.item.id),
        successText: `🗑️ *${found.item.name}* apagada.`,
      },
    };
  }

  // ── Mover despesa (fixo ↔ variável) ─────────────────────────────────────────
  if (intent === 'move_expense') {
    const { expense_name, to_section } = params;
    if (!expense_name) return { botText: 'Qual despesa quer mover?', pendingOp: null };
    const found = findExpense(data, expense_name);
    if (!found) return { botText: `❌ Não encontrei *"${expense_name}"* nas despesas.`, pendingOp: null };
    const target = to_section === 'fixed' ? 'fixed' : 'variable';
    if (found.section === target) return { botText: `ℹ️ *${found.item.name}* já é ${target === 'fixed' ? 'fixa' : 'variável'}.`, pendingOp: null };
    const label = target === 'fixed' ? 'Fixa' : 'Variável';
    return {
      botText: `🔀 Mover *${found.item.name}* para *${label}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => {
          dataOps.addItem(found.mi, target, found.item.name, found.item.value, found.item.payment);
          dataOps.removeItem(found.mi, found.section, found.item.id);
        },
        successText: `✅ *${found.item.name}* movida para ${label}!`,
      },
    };
  }

  // ── Renomear projeto ─────────────────────────────────────────────────────────
  if (intent === 'rename_project') {
    const { project_name, new_name } = params;
    if (!project_name) return { botText: 'Qual projeto quer renomear?', pendingOp: null };
    if (!new_name) return { botText: `Qual o novo nome para o projeto *${project_name}*?`, pendingOp: null };
    const q = project_name.toLowerCase();
    const proj = (projects || []).find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    if (!proj) return { botText: `❌ Não encontrei o projeto *"${project_name}"*.`, pendingOp: null };
    return {
      botText: `✏️ Renomear projeto *${proj.name}* → *${new_name}*?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.updateProject(proj.id, 'name', new_name),
        successText: `✅ Projeto renomeado para *${new_name}*!`,
      },
    };
  }

  // ── Editar projeto ───────────────────────────────────────────────────────────
  if (intent === 'edit_project') {
    const { project_name, field, new_value } = params;
    if (!project_name) return { botText: 'Qual projeto quer editar?', pendingOp: null };
    if (!new_value || new_value <= 0) return { botText: `Qual o novo valor para o projeto *${project_name}*?`, pendingOp: null };
    const q = project_name.toLowerCase();
    const proj = (projects || []).find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    if (!proj) return { botText: `❌ Não encontrei o projeto *"${project_name}"*.`, pendingOp: null };
    const fieldLabel = field === 'target' ? 'Meta total' : 'Aporte mensal';
    return {
      botText: `🎯 *${proj.name}* — ${fieldLabel}: *${R(new_value)}*\n\nConfirma? _(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.updateProject(proj.id, field, new_value),
        successText: `✅ *${proj.name}* atualizado — ${fieldLabel}: *${R(new_value)}*`,
      },
    };
  }

  // ── Apagar projeto ───────────────────────────────────────────────────────────
  if (intent === 'delete_project') {
    const { project_name } = params;
    if (!project_name) return { botText: 'Qual projeto quer apagar?', pendingOp: null };
    const q = project_name.toLowerCase();
    const proj = (projects || []).find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    if (!proj) return { botText: `❌ Não encontrei o projeto *"${project_name}"*.`, pendingOp: null };
    return {
      botText: `⚠️ Apagar o projeto *${proj.name}* permanentemente?\n\n_(sim/não)_`,
      pendingOp: {
        fn: () => settingsOps.removeProject(proj.id),
        successText: `🗑️ Projeto *${proj.name}* apagado.`,
      },
    };
  }

  // ── Parcelamento / export — guia para o app ──────────────────────────────────
  if (intent === 'add_installments') {
    return { botText: `📦 Para parcelamentos, toque no botão *"+"* na tela principal e escolha _"Parcelar compra"_.`, pendingOp: null };
  }
  if (intent === 'export') {
    return { botText: `📁 Para exportar, vá em _Configurações → Backup → Exportar CSV_.`, pendingOp: null };
  }

  return {
    botText: 'Não entendi muito bem 🤔\nTenta: _"como tá o mês?"_ · _"gastei no ifood?"_ · _"conclua a Netflix"_',
    pendingOp: null,
  };
}
