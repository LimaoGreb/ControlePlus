// Maquina de estados do Jarvis — gerencia todos os fluxos de conversa.
import { parseExpenseMessage, extractField } from './claudeClient.js';
import { classifyIntent } from './geminiClient.js';
import { answerQuery } from './queryHandler.js';
import { generateCSV } from './exportHandler.js';
import { addPendingExpense, readUserSnapshot, writeCommand, pollCommandResult } from './firebaseWriter.js';
import { sendMessage, sendTyping, sendDocument } from './telegramApi.js';

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// { [chatId]: { step, data, askingFor, firstName, snapshot, pendingCmd } }
const sessions = new Map();

function getSession(chatId, firstName) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { step: 'idle', data: {}, firstName: firstName || 'você' });
  }
  return sessions.get(chatId);
}

function resolveMonth(monthName) {
  if (!monthName) return new Date().getMonth();
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase().includes(monthName.toLowerCase().substring(0, 3)));
  return idx >= 0 ? idx : new Date().getMonth();
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function handleMessage(chatId, text, firstName) {
  const session = getSession(chatId, firstName);
  await sendTyping(chatId);

  if (session.step === 'confirming') { await handleConfirmingExpense(chatId, text, session); return; }
  if (session.step === 'confirming_cmd') { await handleConfirmingCommand(chatId, text, session); return; }
  if (session.step === 'collecting') { await handleCollecting(chatId, text, session); return; }
  if (session.step === 'collecting_cmd') { await handleCollectingCmd(chatId, text, session); return; }

  // IDLE / DONE — tenta parser local primeiro (rápido, sem API)
  const parsed = await parseExpenseMessage(text);
  if (parsed?.isExpense) {
    const snapshot = await readUserSnapshot(chatId);
    session.snapshot = snapshot;
    session.data = {
      name: parsed.name,
      value: parsed.value,
      payment: parsed.payment,
      dueDay: undefined, // undefined = ainda nao perguntamos
      monthIndex: parsed.monthIndex,
    };
    session.step = 'collecting';
    await askNextMissing(chatId, session);
    return;
  }

  // Classifica com Gemini para queries e comandos
  const classified = await classifyIntent(text);
  await dispatchIntent(chatId, session, classified);
}

// ─── Intent dispatcher ────────────────────────────────────────────────────────

async function dispatchIntent(chatId, session, classified) {
  const { intent, params } = classified;

  if (intent === 'query') {
    const snapshot = await readUserSnapshot(chatId);
    await sendMessage(chatId, answerQuery(snapshot, params));
    session.step = 'done';
    return;
  }

  if (intent === 'export') {
    const snapshot = await readUserSnapshot(chatId);
    if (!snapshot) {
      await sendMessage(chatId, '❌ Sem dados para exportar. Abra o Controle+ primeiro.');
      return;
    }
    await sendMessage(chatId, '⏳ Gerando seu CSV...');
    const year = new Date().getFullYear();
    const csv = generateCSV(snapshot);
    await sendDocument(chatId, `controle-${year}.csv`, csv, `📊 Seus dados de ${year}`);
    session.step = 'done';
    return;
  }

  if (intent === 'add_installments') {
    const p = params || {};
    const missing = [];
    if (!p.name) missing.push('nome da compra');
    if (!p.total_value) missing.push('valor total');
    if (!p.installments) missing.push('número de parcelas');

    if (missing.length > 0) {
      const snapshot = await readUserSnapshot(chatId);
      session.snapshot = snapshot;
      session.pendingCmd = { type: 'ADD_INSTALLMENTS', known: p };
      session.step = 'collecting_cmd';
      await sendMessage(chatId,
        `📦 Para parcelar, preciso de:\n\n${missing.map(f => `• ${f}`).join('\n')}\n\nEx: _"parcelei a TV 1200 reais em 6x no crédito"_`
      );
      return;
    }

    await prepareInstallmentConfirmation(chatId, session, p);
    return;
  }

  if (intent === 'update_due_date') {
    const p = params || {};
    if (!p.expense_name || !p.new_day) {
      await sendMessage(chatId,
        `📅 Me diz qual despesa e qual dia:\n_"vencimento da Netflix para dia 15"_`
      );
      return;
    }
    session.step = 'confirming_cmd';
    session.pendingCmd = {
      type: 'UPDATE_DUE_DATE',
      params: { expense_name: p.expense_name, new_day: p.new_day },
      label: `📅 Vencimento de *${p.expense_name}* → dia ${p.new_day}`,
    };
    await sendMessage(chatId, `${session.pendingCmd.label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'conclude_expense') {
    const expenseName = (params?.expense_name || '').trim();
    if (!expenseName || expenseName.length < 2) {
      await sendMessage(chatId, `Qual despesa quer concluir? Ex: _"conclua a Netflix"_`);
      return;
    }
    const snapshot = await readUserSnapshot(chatId);
    session.snapshot = snapshot;
    const query = expenseName.toLowerCase();
    const months = snapshot?.months || {};
    const matches = [];
    for (let mi = 0; mi < 12; mi++) {
      for (const section of ['fixed', 'variable']) {
        for (const item of (months[mi]?.[section] || [])) {
          if ((item.name || '').toLowerCase().includes(query) && !item.concluded) {
            matches.push({ mi, section, item });
          }
        }
      }
    }
    if (matches.length === 0) {
      await sendMessage(chatId, `❌ Não encontrei despesas com *"${expenseName}"* em aberto.`);
      session.step = 'done';
      return;
    }
    const R = (v) => `R$ ${(v || 0).toFixed(2)}`;
    const list = matches.map(m =>
      `• *${m.item.name}* — ${R(m.item.value)} · ${m.section === 'fixed' ? 'Fixo' : 'Variável'} · ${MONTH_NAMES[m.mi]}`
    ).join('\n');
    session.step = 'confirming_cmd';
    session.pendingCmd = {
      type: 'CONCLUDE_EXPENSE',
      params: { expense_name: query },
      label: list,
    };
    const header = matches.length === 1
      ? `📝 Encontrei esta despesa:`
      : `📝 Encontrei *${matches.length} despesas* com _"${expenseName}"_:`;
    await sendMessage(chatId, `${header}\n\n${list}\n\nMarcar como pago? _(sim/não)_`);
    return;
  }

  // Chat / help
  await sendMessage(chatId,
    `Oi ${session.firstName}! 👋 O que posso fazer:\n\n` +
    `💸 *Adicionar despesa:* _"gastei 50 no mercado no pix"_\n` +
    `📦 *Parcelar compra:* _"parcelei a TV 1200 em 6x no crédito"_\n` +
    `📅 *Mudar vencimento:* _"vencimento da Netflix para dia 15"_\n` +
    `✅ *Concluir despesa:* _"conclua a despesa do Carteiro"_\n` +
    `📊 *Resumo do mês:* _"como tá o mês?"_\n` +
    `💳 *Por cartão:* _"quanto gastei no Nubank?"_\n` +
    `🏆 *Maiores gastos:* _"maiores gastos de junho"_\n` +
    `📈 *Investimentos:* _"como estão meus investimentos?"_\n` +
    `🎯 *Projetos:* _"status dos projetos"_\n` +
    `📁 *Exportar CSV:* _"exporta meus dados"_\n\n` +
    `🔍 *Busca multi-mês:* _"quanto gastei em ifood desde janeiro?"_\n` +
    `📋 *Análise do período:* _"feedback dos primeiros 3 meses"_\n` +
    `📊 *Comparativo:* _"comparativo do nubank mês passado vs esse mês"_`
  );
  session.step = 'done';
}

// ─── Expense flow ─────────────────────────────────────────────────────────────

async function handleCollecting(chatId, text, session) {
  const lower = text.toLowerCase().trim();

  // Escape: se parece consulta ou comando (sem número), abandona o fluxo atual
  const QUERY_ESCAPE = /\b(quanto|gastos?|resumo|investimento|projeto|exporta|exportar|parcela|vencimento|maior|menor)\b/i;
  if (QUERY_ESCAPE.test(lower) && !/\d/.test(text)) {
    session.step = 'idle';
    session.data = {};
    const classified = await classifyIntent(text);
    await dispatchIntent(chatId, session, classified);
    return;
  }

  if (session.askingFor === 'value') {
    const isSame = /\bmesmo\b|\bigual\b|\bsame\b/i.test(text);
    if (isSame && session.lastExpense?.value) {
      session.data.value = session.lastExpense.value;
    } else {
      const val = await extractField('value', text);
      if (!val) {
        await sendMessage(chatId, 'Não entendi o valor. Tente: _"50 reais"_ ou _"R$ 50"_');
        return;
      }
      session.data.value = val;
    }
  }

  if (session.askingFor === 'payment') {
    const isSame = /\bmesmo\b|\bigual\b|\bsame\b/i.test(text);
    if (isSame && session.lastExpense?.payment) {
      session.data.payment = session.lastExpense.payment;
    } else if (['pular', 'não sei', 'nao sei', '-'].includes(lower)) {
      session.data.payment = false;
    } else {
      session.data.payment = await extractField('payment', text);
    }
  }

  if (session.askingFor === 'creditCard') {
    if (['pular', '-'].includes(lower)) {
      // Mantém 'Crédito' genérico
    } else {
      const cards = (session.snapshot?.paymentMethods || []).filter(pm => pm.isCredit);
      const matched = cards.find(c =>
        c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
      );
      if (matched) {
        session.data.payment = matched.name;
      } else if (text.trim().length > 0 && text.trim().length < 30) {
        session.data.payment = text.trim();
      }
    }
    session.data.creditCardAsked = true;
  }

  if (session.askingFor === 'dueDay') {
    if (['pular', 'não', 'nao', '-', 'n', 'nn'].includes(lower)) {
      session.data.dueDay = null;
    } else {
      const dayMatch = text.match(/\b(\d{1,2})\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        session.data.dueDay = (day >= 1 && day <= 31) ? day : null;
      } else {
        session.data.dueDay = null;
      }
    }
  }

  await askNextMissing(chatId, session);
}

async function askNextMissing(chatId, session) {
  const { data } = session;

  if (!data.value) {
    session.askingFor = 'value';
    await sendMessage(chatId, `💰 Quanto você gastou em *${data.name}*?`);
    return;
  }

  if (data.payment == null) {
    session.askingFor = 'payment';
    await sendMessage(chatId,
      `💳 Como foi o pagamento? _(Pix, débito, crédito, Nubank...)_\nOu manda _"pular"_ para deixar em branco.`
    );
    return;
  }

  // Se pagamento é crédito genérico e usuário tem cartões de crédito cadastrados
  if (data.payment === 'Crédito' && !data.creditCardAsked) {
    const cards = (session.snapshot?.paymentMethods || []).filter(pm => pm.isCredit);
    if (cards.length > 0) {
      session.askingFor = 'creditCard';
      const list = cards.map(c => `• ${c.name}`).join('\n');
      await sendMessage(chatId,
        `💳 No crédito — qual cartão?\n\n${list}\n\nOu manda _"pular"_ para Crédito genérico.`
      );
      return;
    }
    data.creditCardAsked = true;
  }

  // Pergunta data de vencimento uma vez
  if (data.dueDay === undefined) {
    session.askingFor = 'dueDay';
    await sendMessage(chatId,
      `📅 Tem data de vencimento? _(ex: "dia 15")_\nOu manda _"pular"_ para deixar sem.`
    );
    return;
  }

  // Tudo preenchido — confirmar
  session.step = 'confirming';
  session.askingFor = null;
  const payLabel = (data.payment && data.payment !== false) ? data.payment : null;
  const pm = payLabel ? `\n💳 ${payLabel}` : '';
  const dd = data.dueDay ? `\n📅 Vence dia ${data.dueDay}` : '';
  const tipo = data.dueDay ? 'fixa' : 'variável';
  await sendMessage(chatId,
    `Confere:\n\n📝 *${data.name}*\n💰 *R$ ${data.value.toFixed(2)}*${pm}${dd}\n📅 ${MONTH_NAMES[data.monthIndex]} _(${tipo})_\n\nConfirma? _(sim/não)_`
  );
}

async function handleConfirmingExpense(chatId, text, session) {
  const lower = text.toLowerCase().trim();
  const yes = ['sim', 's', 'ok', 'pode', 'yes', 'isso', 'certo', 'confirma'].some(w => lower.includes(w));
  const no = ['não', 'nao', 'n', 'errado', 'cancela', 'cancelar'].some(w => lower.includes(w));

  if (yes) {
    const payFinal = (session.data.payment && session.data.payment !== false) ? session.data.payment : null;
    await addPendingExpense(chatId, { ...session.data, payment: payFinal });
    const pm = payFinal ? `\n💳 ${payFinal}` : '';
    const dd = session.data.dueDay ? `\n📅 Vence dia ${session.data.dueDay}` : '';
    await sendMessage(chatId,
      `✅ *Adicionado!*\n\n📝 *${session.data.name}*\n💰 *R$ ${session.data.value.toFixed(2)}*${pm}${dd}\n📅 ${MONTH_NAMES[session.data.monthIndex]}\n\n_Abre o Controle+ para ver_ 🚀`
    );
    session.lastExpense = { value: session.data.value, payment: payFinal };
    session.step = 'done';
    session.data = {};
    return;
  }
  if (no) {
    await sendMessage(chatId, 'OK, cancelado! Me conta de novo se quiser. 😊');
    session.step = 'idle';
    session.data = {};
    return;
  }
  const parsed = await parseExpenseMessage(text);
  if (parsed?.isExpense) {
    const snapshot = await readUserSnapshot(chatId);
    session.snapshot = snapshot;
    session.data = { name: parsed.name, value: parsed.value, payment: parsed.payment, dueDay: undefined, monthIndex: parsed.monthIndex };
    session.step = 'collecting';
    await askNextMissing(chatId, session);
  } else {
    await sendMessage(chatId, 'Confirma? Responde *sim* ou *não* 😊');
  }
}

// ─── Command flow ─────────────────────────────────────────────────────────────

async function handleCollectingCmd(chatId, text, session) {
  const classified = await classifyIntent(text);
  if (classified.intent === 'add_installments') {
    const merged = { ...(session.pendingCmd?.known || {}), ...classified.params };
    if (merged.name && merged.total_value && merged.installments) {
      await prepareInstallmentConfirmation(chatId, session, merged);
      return;
    }
  }
  await sendMessage(chatId,
    `Não entendi. Tente:\n_"parcelei a [nome] em [N]x de [valor] no [pagamento]"_`
  );
  session.step = 'idle';
  session.pendingCmd = null;
}

async function prepareInstallmentConfirmation(chatId, session, p) {
  const parcelaValue = p.total_value / p.installments;
  const mi = resolveMonth(p.month);

  // Se crédito genérico, verifica se há cartões cadastrados
  let payment = p.payment || null;
  if (payment === 'Crédito' || payment?.toLowerCase() === 'credito') {
    const cards = (session.snapshot?.paymentMethods || []).filter(pm => pm.isCredit);
    if (cards.length > 0) {
      // Pede qual cartão na próxima mensagem
      session.pendingCmd = {
        type: 'ADD_INSTALLMENTS',
        params: { name: p.name, parcelaValue, installments: p.installments, payment: 'Crédito', monthIndex: mi },
        awaitingCard: true,
        cards,
      };
      session.step = 'collecting_cmd';
      session.askingFor = 'installmentCard';
      const list = cards.map(c => `• ${c.name}`).join('\n');
      await sendMessage(chatId,
        `📦 Para parcelar no crédito — qual cartão?\n\n${list}\n\nOu _"pular"_ para Crédito genérico.`
      );
      return;
    }
  }

  session.step = 'confirming_cmd';
  session.pendingCmd = {
    type: 'ADD_INSTALLMENTS',
    params: { name: p.name, parcelaValue, installments: p.installments, payment, monthIndex: mi },
    label: `📦 *${p.name}*\n${p.installments}x de R$ ${parcelaValue.toFixed(2)}${payment ? ` · ${payment}` : ''}\nA partir de ${MONTH_NAMES[mi]}`,
  };
  await sendMessage(chatId, `Confere o parcelamento:\n\n${session.pendingCmd.label}\n\nConfirma? _(sim/não)_`);
}

async function handleConfirmingCommand(chatId, text, session) {
  // Caso especial: aguardando qual cartão para parcelamento
  if (session.pendingCmd?.awaitingCard) {
    const lower = text.toLowerCase().trim();
    const cards = session.pendingCmd.cards || [];
    const matched = cards.find(c =>
      c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
    );
    const cardName = matched ? matched.name : (['pular', '-'].includes(lower) ? 'Crédito' : text.trim());
    session.pendingCmd.params.payment = cardName;
    session.pendingCmd.awaitingCard = false;
    const p = session.pendingCmd.params;
    session.pendingCmd.label = `📦 *${p.name}*\n${p.installments}x de R$ ${p.parcelaValue.toFixed(2)} · ${cardName}\nA partir de ${MONTH_NAMES[p.monthIndex]}`;
    await sendMessage(chatId, `Confere o parcelamento:\n\n${session.pendingCmd.label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  const lower = text.toLowerCase().trim();
  const yes = ['sim', 's', 'ok', 'pode', 'yes', 'isso', 'certo', 'confirma'].some(w => lower.includes(w));
  const no = ['não', 'nao', 'n', 'errado', 'cancela', 'cancelar'].some(w => lower.includes(w));

  if (!yes && !no) {
    await sendMessage(chatId, 'Confirma? Responde *sim* ou *não* 😊');
    return;
  }
  if (no) {
    await sendMessage(chatId, 'OK, cancelado! 😊');
    session.step = 'idle';
    session.pendingCmd = null;
    return;
  }

  const cmd = session.pendingCmd;
  session.step = 'done';
  session.pendingCmd = null;

  await sendMessage(chatId, '⏳ Executando...');

  try {
    const cmdId = await writeCommand(chatId, cmd.type, cmd.params);
    const result = await pollCommandResult(chatId, cmdId, 25000);

    if (!result) {
      await sendMessage(chatId, `✅ Agendado!\n\n${cmd.label}\n\n_Abre o Controle+ para aplicar_ 📱`);
      return;
    }
    if (result.status === 'error') {
      await sendMessage(chatId, `⚠️ ${result.error || 'Ocorreu um erro. Tente novamente.'}`);
      return;
    }
    if (cmd.type === 'ADD_INSTALLMENTS') {
      await sendMessage(chatId, `✅ *Parcelamento adicionado!*\n\n${cmd.label}\n\n_Meses atualizados no Controle+_ 🚀`);
    } else if (cmd.type === 'UPDATE_DUE_DATE') {
      await sendMessage(chatId, `✅ *Vencimento atualizado!*\n\n${cmd.label}\n\n_Notificações reagendadas_ ✅`);
    } else if (cmd.type === 'CONCLUDE_EXPENSE') {
      await sendMessage(chatId, `✅ *Despesa(s) concluída(s)!*\n\n${cmd.label}\n\n_Atualizado no Controle+_ 🚀`);
    }
  } catch (e) {
    console.error('[Jarvis] comando error:', e.message);
    await sendMessage(chatId, `✅ Agendado! Abre o Controle+ para aplicar. 📱`);
  }
}
