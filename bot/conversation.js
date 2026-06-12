// Maquina de estados do Jarvis — gerencia todos os fluxos de conversa.
import { parseExpenseMessage, extractField } from './claudeClient.js';
import { classifyIntent } from './geminiClient.js';
import { answerQuery } from './queryHandler.js';
import { generateCSV } from './exportHandler.js';
import { addPendingExpense, readUserSnapshot, writeCommand, pollCommandResult, writeSessionContext, readSessionContext } from './firebaseWriter.js';
import { sendMessage, sendTyping, sendDocument, getFile, downloadFileAsBase64 } from './telegramApi.js';

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const MONTH_PT = MONTH_NAMES.map(m => m.toLowerCase());

// { [chatId]: { step, data, askingFor, firstName, snapshot, pendingCmd, lastQuery, lastActivity, _contextLoaded } }
const sessions = new Map();
const SESSION_STEP_TTL = 5 * 60 * 1000; // 5 min — expira estados ativos (confirming/collecting)
const ACTIVE_STEPS = new Set(['confirming', 'confirming_cmd', 'collecting', 'collecting_cmd', 'collecting_income', 'collecting_project', 'collecting_photo']);

function getSession(chatId, firstName) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { step: 'idle', data: {}, firstName: firstName || 'você', lastActivity: Date.now() });
  }
  return sessions.get(chatId);
}

function resolveMonth(monthName) {
  if (!monthName) return new Date().getMonth();
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase().includes(monthName.toLowerCase().substring(0, 3)));
  return idx >= 0 ? idx : new Date().getMonth();
}

// ─── Follow-up detector ───────────────────────────────────────────────────────
// Detecta mensagens curtas/contextuais que são continuação da última query.
// Ex: "e este mês?", "e no nubank?", "e janeiro?"

const FOLLOWUP_PREFIX = /^(e\s|e\s+a[ií]?\s|e\s+o\s|e\s+a\s|mas\s+e\s|e\s+pra\s|que\s+tal\s|e\s+no\s|e\s+na\s|e\s+em\s)/i;
const CARD_RE = /nubank|nu\b|c6|picpay|next|inter|bradesco|ita[uú]|santander|recargapay|pagbank|mercado\s*pago|sicoob|neon|pix|d[eé]bito|cr[eé]dito/i;

function resolveFollowUpMonth(t) {
  const now = new Date().getMonth();
  if (/m[eê]s\s*(passado|anterior|[uú]ltimo)|[uú]ltimo\s*m[eê]s/i.test(t))
    return MONTH_PT[((now - 1) + 12) % 12];
  if (/esse\s*m[eê]s|este\s*m[eê]s|m[eê]s\s*(atual|corrente)/i.test(t))
    return MONTH_PT[now];
  return MONTH_PT.find(m => t.includes(m)) || null;
}

function detectFollowUp(text, lastQuery) {
  if (!lastQuery) return null;
  const t = text.toLowerCase().trim();

  // Só considera follow-up se for curto OU começa com "e "
  if (t.length > 35 && !FOLLOWUP_PREFIX.test(t)) return null;

  const month = resolveFollowUpMonth(t);
  if (month) {
    // "e este mês?" → mesma query, mês diferente
    if (lastQuery.subtype === 'compare') {
      const now = new Date().getMonth();
      const m2i = MONTH_PT.indexOf(month);
      return { intent: 'query', params: { ...lastQuery, month2: m2i >= 0 ? m2i : now } };
    }
    return { intent: 'query', params: { ...lastQuery, month } };
  }

  const cardMatch = t.match(CARD_RE);
  if (cardMatch) {
    // "e no nubank?" → filtrar por cartão com mesmo tipo de query
    const base = ['summary', 'by_payment', 'biggest'].includes(lastQuery.subtype)
      ? lastQuery.subtype
      : 'by_payment';
    return { intent: 'query', params: { ...lastQuery, subtype: base === 'summary' ? 'by_payment' : base, filter: cardMatch[0].trim() } };
  }

  // "mais detalhes" / "detalha" / "tente novamente" → repete a mesma query
  if (/mais\s*detalhe|detalha|mostra\s*tudo|lista\s*tudo|detalhado|tente?\s*(novamente|de\s*novo|outra\s*vez)|repete?|de\s*novo\b/i.test(t)) {
    return { intent: 'query', params: { ...lastQuery } };
  }

  return null;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function handleMessage(chatId, text, firstName) {
  const session = getSession(chatId, firstName);

  // Expira estados ativos após 5 min de silêncio
  if (ACTIVE_STEPS.has(session.step) && Date.now() - (session.lastActivity || 0) > SESSION_STEP_TTL) {
    session.step = 'idle';
    session.data = {};
    session.pendingCmd = null;
  }
  session.lastActivity = Date.now();

  // Recupera contexto do Firebase ao criar sessão nova (bot restart)
  if (!session._contextLoaded) {
    session._contextLoaded = true;
    const ctx = await readSessionContext(chatId);
    if (ctx?.lastQuery) session.lastQuery = ctx.lastQuery;
  }

  await sendTyping(chatId);

  if (session.step === 'confirming') { await handleConfirmingExpense(chatId, text, session); return; }
  if (session.step === 'confirming_cmd') { await handleConfirmingCommand(chatId, text, session); return; }
  if (session.step === 'collecting') { await handleCollecting(chatId, text, session); return; }
  if (session.step === 'collecting_cmd') { await handleCollectingCmd(chatId, text, session); return; }
  if (session.step === 'collecting_income') { await handleCollectingIncome(chatId, text, session); return; }
  if (session.step === 'collecting_project') { await handleCollectingProject(chatId, text, session); return; }
  if (session.step === 'collecting_photo') {
    if (/\b(cancela|cancelar|n[aã]o|nao|pare)\b/i.test(text.toLowerCase())) {
      session.step = 'idle';
      await sendMessage(chatId, 'OK, cancelado! 😊');
    } else {
      await sendMessage(chatId, `📸 Me *envie a foto* diretamente no chat!\n\nOu manda _"cancelar"_ para desistir.`);
    }
    return;
  }

  // Tenta follow-up da última query antes de qualquer classificação
  const followUp = detectFollowUp(text, session.lastQuery);
  if (followUp) {
    await dispatchIntent(chatId, session, followUp);
    return;
  }

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
    session.lastQuery = { ...params };
    session.step = 'done';
    // Persiste contexto no Firebase para sobreviver a restarts do bot
    writeSessionContext(chatId, { lastQuery: session.lastQuery }).catch(() => {});
    return;
  }

  if (intent === 'income') {
    const { name = 'Renda', value, month } = params || {};
    const mi = resolveMonth(month);
    if (!value) {
      session.step = 'collecting_income';
      session.data = { incomeName: name, monthIndex: mi };
      await sendMessage(chatId, `💰 Qual o valor que você recebeu de *${name}* em ${MONTH_NAMES[mi]}?`);
      return;
    }
    const label = `💰 *${name}* — R$ ${value.toFixed(2)} · ${MONTH_NAMES[mi]}`;
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'ADD_INCOME', params: { name, value, monthIndex: mi }, label };
    await sendMessage(chatId, `Confirma a entrada de renda:\n\n${label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'set_credit_limit') {
    const { card_name, limit } = params || {};
    if (!card_name) {
      await sendMessage(chatId, `💳 Qual cartão você quer definir o limite?\nEx: _"define limite de 2000 no Nubank"_`);
      return;
    }
    if (!limit) {
      await sendMessage(chatId, `💳 Qual o limite do *${card_name}*? _(ex: "2000")_`);
      return;
    }
    const label = `💳 Limite de *${card_name}* → R$ ${limit.toFixed(2)}`;
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'SET_PAYMENT_LIMIT', params: { card_name, limit }, label };
    await sendMessage(chatId, `${label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'set_user_name') {
    const { name } = params || {};
    if (!name || name.length < 2) {
      await sendMessage(chatId, `✏️ Qual o nome que você quer usar no Controle+?`);
      return;
    }
    const label = `✏️ Seu nome no app: *${name}*`;
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'SET_USER_NAME', params: { name }, label };
    await sendMessage(chatId, `${label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'set_contribution_pct') {
    const { pct } = params || {};
    if (!pct || pct < 0 || pct > 100) {
      await sendMessage(chatId, `💜 Qual o percentual de contribuição/dízimo? _(ex: "10%")_`);
      return;
    }
    const label = `💜 Meta de contribuição: *${pct}%*`;
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'SET_CONTRIBUTION_PCT', params: { pct }, label };
    await sendMessage(chatId, `${label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'update_project_saved') {
    const { project_name, amount, mode } = params || {};
    if (!project_name || project_name.length < 2) {
      await sendMessage(chatId, `🎯 Qual projeto você guardou dinheiro?\nEx: _"guardei 300 no projeto viagem"_`);
      return;
    }
    if (!amount || amount <= 0) {
      await sendMessage(chatId, `🎯 Qual o valor guardado no projeto *${project_name}*?`);
      return;
    }
    const modeLabel = mode === 'set' ? `Definir guardado` : `Adicionar`;
    const label = `🎯 *${project_name}* — ${modeLabel} R$ ${amount.toFixed(2)}`;
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'UPDATE_PROJECT_SAVED', params: { project_name, amount, mode: mode || 'add' }, label };
    await sendMessage(chatId, `${label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'toggle_setting') {
    const { key, value } = params || {};
    const labels = {
      isInvestor: value ? '📈 Ativar modo investidor' : '📈 Desativar modo investidor',
      makesContributions: value ? '💜 Ativar contribuições/dízimo' : '💜 Desativar contribuições/dízimo',
    };
    const label = labels[key];
    if (!label) {
      await sendMessage(chatId, 'Qual configuração você quer alterar?\nEx: _"ativa modo investidor"_ ou _"desativa contribuições"_');
      return;
    }
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'TOGGLE_SETTING', params: { key, value }, label };
    await sendMessage(chatId, `${label}\n\nConfirma? _(sim/não)_`);
    return;
  }

  if (intent === 'add_project') {
    const { name, target, monthly, saved = 0 } = params || {};
    if (!name || name.length < 2) {
      session.step = 'collecting_project';
      session.data = { projectTarget: target, projectMonthly: monthly, projectSaved: saved, projectStage: 0 };
      await sendMessage(chatId, `🎯 Boa ideia! Qual o nome desse projeto/meta?\n_Ex: "Viagem", "Carro novo", "Reserva de emergência"_`);
      return;
    }
    if (!target) {
      session.step = 'collecting_project';
      session.data = { projectName: name, projectMonthly: monthly, projectSaved: saved, projectStage: 1 };
      await sendMessage(chatId, `🎯 Projeto *${name}*!\n\n💰 Qual o valor total da meta? _(ex: "8000")_`);
      return;
    }
    if (!monthly) {
      session.step = 'collecting_project';
      session.data = { projectName: name, projectTarget: target, projectSaved: saved, projectStage: 2 };
      await sendMessage(chatId, `🎯 Projeto *${name}* — Meta R$ ${target.toFixed(2)}\n\n📅 Quanto guardar por mês? _(ex: "300")_`);
      return;
    }
    await confirmProject(chatId, session, name, target, monthly, saved);
    return;
  }

  if (intent === 'set_avatar') {
    session.step = 'collecting_photo';
    session.lastActivity = Date.now();
    await sendMessage(chatId, `📸 Me manda a foto que quer usar como avatar no Controle+!\n\n_Qualquer foto serve — quadrada fica melhor_ 😊`);
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

  if (intent === 'reopen_expense') {
    const { expense_name, all } = params || {};
    const snapshot = await readUserSnapshot(chatId);
    const months = snapshot?.months || {};
    const mi = new Date().getMonth();

    if (all) {
      // Reabrir TODAS as despesas do mês atual
      const concluded = [];
      for (const section of ['fixed', 'variable']) {
        for (const item of (months[mi]?.[section] || [])) {
          if (item.concluded) concluded.push({ mi, section, item });
        }
      }
      if (concluded.length === 0) {
        await sendMessage(chatId, `✅ Não há despesas concluídas em ${MONTH_NAMES[mi]} pra reabrir.`);
        session.step = 'done';
        return;
      }
      const label = concluded.map(m => `• *${m.item.name}* — R$ ${(m.item.value||0).toFixed(2)}`).join('\n');
      session.step = 'confirming_cmd';
      session.pendingCmd = {
        type: 'REOPEN_EXPENSE',
        params: { expense_name: null, monthIndex: mi, all: true },
        label: `🔓 Reabrir *${concluded.length} despesa(s)* de ${MONTH_NAMES[mi]}:\n${label}`,
      };
      await sendMessage(chatId, `${session.pendingCmd.label}\n\nConfirma? _(sim/não)_`);
      return;
    }

    if (!expense_name || expense_name.length < 2) {
      await sendMessage(chatId, `Qual despesa quer reabrir? Ex: _"reabra a Netflix"_ ou _"reabra todas"_`);
      return;
    }

    const query = expense_name.toLowerCase();
    const matches = [];
    for (let m = 0; m < 12; m++) {
      for (const section of ['fixed', 'variable']) {
        for (const item of (months[m]?.[section] || [])) {
          if ((item.name || '').toLowerCase().includes(query) && item.concluded) {
            matches.push({ mi: m, section, item });
          }
        }
      }
    }
    if (matches.length === 0) {
      await sendMessage(chatId, `❌ Não encontrei despesas concluídas com *"${expense_name}"*.`);
      session.step = 'done';
      return;
    }
    const R = (v) => `R$ ${(v||0).toFixed(2)}`;
    if (matches.length === 1) {
      const m = matches[0];
      const label = `🔓 *${m.item.name}* — ${R(m.item.value)} · ${MONTH_NAMES[m.mi]}`;
      session.step = 'confirming_cmd';
      session.pendingCmd = { type: 'REOPEN_EXPENSE', params: { expense_name: query, monthIndex: m.mi }, label };
      await sendMessage(chatId, `${label}\n\nReabrir esta despesa? _(sim/não)_`);
      return;
    }
    const list = matches.map((m, i) => `${i+1}. *${m.item.name}* — ${R(m.item.value)} · ${MONTH_NAMES[m.mi]}`).join('\n');
    session.step = 'confirming_cmd';
    session.pendingCmd = { type: 'REOPEN_EXPENSE', params: { expense_name: query }, label: list, multiSelect: true, matches };
    await sendMessage(chatId, `🔓 Encontrei *${matches.length}* despesas concluídas:\n\n${list}\n\nQual reabrir? Número, _"todos"_ ou _"não"_`);
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

    if (matches.length === 1) {
      const m = matches[0];
      const label = `• *${m.item.name}* — ${R(m.item.value)} · ${m.section === 'fixed' ? 'Fixo' : 'Variável'} · ${MONTH_NAMES[m.mi]}`;
      session.step = 'confirming_cmd';
      session.pendingCmd = {
        type: 'CONCLUDE_EXPENSE',
        params: { expense_name: query, monthIndex: m.mi },
        label,
      };
      await sendMessage(chatId, `📝 Encontrei esta despesa:\n\n${label}\n\nMarcar como pago? _(sim/não)_`);
      return;
    }

    // Múltiplos matches — lista numerada para o usuário escolher
    const list = matches.map((m, i) =>
      `${i + 1}. *${m.item.name}* — ${R(m.item.value)} · ${MONTH_NAMES[m.mi]}`
    ).join('\n');
    session.step = 'confirming_cmd';
    session.pendingCmd = {
      type: 'CONCLUDE_EXPENSE',
      params: { expense_name: query },
      label: list,
      multiSelect: true,
      matches,
    };
    await sendMessage(chatId,
      `📝 Encontrei *${matches.length} despesas* com _"${expenseName}"_:\n\n${list}\n\nQual marcar como pago?\nResponda com o *número*, _"todos"_ ou _"não"_`
    );
    return;
  }

  // Comandos não suportados via bot (gerenciados direto no app)
  if (intent === 'unsupported') {
    const feature = params?.feature;
    if (feature === 'payment_method') {
      await sendMessage(chatId, `💳 Para adicionar ou editar formas de pagamento e cartões, use o Controle\\+ diretamente:\n\n_Configurações → Formas de Pagamento_\n\nPelo bot só consigo *definir o limite* de um cartão já cadastrado:\n_"define limite de 2000 no Nubank"_`);
    } else {
      await sendMessage(chatId, `Hmm, não consigo fazer isso pelo chat 🤔\n\nUse o app Controle\\+ diretamente para esta ação.`);
    }
    session.step = 'done';
    return;
  }

  // Chat — greeting mostra menu completo; mensagem não-entendida recebe resposta curta
  const lower2 = (typeof text === 'string' ? text : '').toLowerCase().trim();
  const isGreeting = /^(jarvis\b|oi\b|ol[aá]\b|e\s*a[ií]\b|bom\s*dia|boa\s*tarde|boa\s*noite|hey\b|opa\b|salve\b|tudo\s*bem|help\b|ajuda\b|\/start|inicio\b)/.test(lower2);
  if (!isGreeting) {
    await sendMessage(chatId, `Hmm, não entendi 🤔 Pode reformular?\n\nExemplos:\n• _"como tá o mês?"_\n• _"quanto gastei no ifood esse mês?"_\n• _"conclua a Netflix"_`);
    session.step = 'done';
    return;
  }

  await sendMessage(chatId,
    `Oi ${session.firstName}! 👋 Sou o Jarvis, seu assistente financeiro.\n\n` +
    `💸 *Despesa:* _"gastei 50 no mercado no pix"_\n` +
    `📦 *Parcelar:* _"parcelei a TV 1200 em 6x no crédito"_\n` +
    `💰 *Renda:* _"recebi 5000 de salário"_\n` +
    `✅ *Concluir:* _"conclua a Netflix"_\n` +
    `🔓 *Reabrir:* _"reabra a Netflix"_ / _"reabra todas"_\n` +
    `📅 *Vencimento:* _"vencimento da Netflix para dia 15"_\n\n` +
    `📊 *Resumo do mês:* _"como tá o mês?"_\n` +
    `💳 *Por cartão:* _"quanto no Nubank esse mês?"_\n` +
    `🏆 *Maiores gastos:* _"maiores gastos de junho"_\n` +
    `🔍 *Multi-mês:* _"ifood desde janeiro"_\n` +
    `📋 *Análise:* _"feedback dos primeiros 3 meses"_\n` +
    `📊 *Comparativo:* _"nubank mês passado vs esse mês"_\n\n` +
    `📈 *Investimentos:* _"como estão meus investimentos?"_\n` +
    `🎯 *Criar projeto:* _"cria projeto viagem meta 8000 guardando 400"_\n` +
    `🎯 *Ver projetos:* _"status dos projetos"_\n\n` +
    `📸 *Foto de perfil:* _"muda minha foto de perfil"_\n` +
    `⚙️ *Configurações:* _"ativa modo investidor"_ / _"desativa contribuições"_\n` +
    `📁 *Exportar CSV:* _"exporta meus dados"_`
  );
  session.step = 'done';
}

// ─── Photo handler (chamado pelo server.js quando msg.photo chega) ────────────

export async function handlePhotoMessage(chatId, photos, firstName) {
  const session = getSession(chatId, firstName);
  session.lastActivity = Date.now();

  if (session.step !== 'collecting_photo') {
    await sendMessage(chatId, `📸 Para trocar sua foto, primeiro me peça:\n_"muda minha foto de perfil"_`);
    return;
  }

  const largest = photos[photos.length - 1];
  await sendTyping(chatId);
  const filePath = await getFile(largest.file_id);
  if (!filePath) {
    await sendMessage(chatId, '❌ Não consegui acessar a foto. Tenta mandar de novo!');
    return;
  }
  const b64 = await downloadFileAsBase64(filePath);
  if (!b64) {
    await sendMessage(chatId, '❌ Erro ao baixar a foto. Tenta de novo!');
    return;
  }

  const avatarData = { kind: 'photo', value: `data:image/jpeg;base64,${b64}` };
  session.step = 'confirming_cmd';
  session.pendingCmd = {
    type: 'SET_AVATAR',
    params: { avatar: avatarData },
    label: '📸 Nova foto de perfil no Controle+',
  };
  await sendMessage(chatId, `📸 Foto recebida!\n\nUsar como sua foto de perfil no Controle+?\n\n_(sim/não)_`);
}

// ─── Project collection ───────────────────────────────────────────────────────

async function handleCollectingProject(chatId, text, session) {
  const numMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  const num = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;
  const stage = session.data.projectStage || 0;

  if (stage === 0) {
    const name = text.trim().replace(/[?!.,;]/g, '').trim();
    if (!name || name.length < 2) {
      await sendMessage(chatId, '🎯 Nome muito curto. Tenta de novo! _(ex: "Viagem", "Carro novo")_');
      return;
    }
    session.data.projectName = name;
    session.data.projectStage = 1;
    await sendMessage(chatId, `🎯 Projeto *${name}*!\n\n💰 Qual o valor total da meta? _(ex: "8000" ou "R$ 5.000")_`);
    return;
  }

  if (stage === 1) {
    if (!num || num <= 0) {
      await sendMessage(chatId, '💰 Não entendi o valor. Tenta: _"8000"_ ou _"R$ 5.000"_');
      return;
    }
    session.data.projectTarget = num;
    session.data.projectStage = 2;
    await sendMessage(chatId, `💰 Meta: R$ ${num.toFixed(2)}\n\n📅 Quanto você pretende guardar por mês? _(ex: "300")_`);
    return;
  }

  if (stage === 2) {
    if (!num || num <= 0) {
      await sendMessage(chatId, '📅 Não entendi o valor. Tenta: _"300"_ ou _"500 reais"_');
      return;
    }
    session.data.projectMonthly = num;
    const { projectName: name, projectTarget: target, projectSaved: saved = 0 } = session.data;
    session.data = {};
    await confirmProject(chatId, session, name, target, num, saved);
    return;
  }
}

async function confirmProject(chatId, session, name, target, monthly, saved = 0) {
  const remaining = Math.max(0, target - saved);
  const monthsNeeded = monthly > 0 ? Math.ceil(remaining / monthly) : null;
  const timeStr = monthsNeeded
    ? (monthsNeeded <= 12 ? `~${monthsNeeded} ${monthsNeeded === 1 ? 'mês' : 'meses'}` : `~${(monthsNeeded / 12).toFixed(1)} anos`)
    : '';
  const savedStr = saved > 0 ? `\n💾 Já guardado: R$ ${saved.toFixed(2)}` : '';
  const label = `🎯 *${name}*\n💰 Meta: R$ ${target.toFixed(2)}\n📅 Guardar: R$ ${monthly.toFixed(2)}/mês${savedStr}${timeStr ? `\n⏱ Estimado: ${timeStr}` : ''}`;
  session.step = 'confirming_cmd';
  session.pendingCmd = { type: 'ADD_PROJECT', params: { name, target, monthly, saved }, label };
  await sendMessage(chatId, `Confirma o projeto:\n\n${label}\n\nConfirma? _(sim/não)_`);
}

// ─── Income collection ────────────────────────────────────────────────────────

async function handleCollectingIncome(chatId, text, session) {
  const numMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!numMatch) {
    await sendMessage(chatId, 'Não entendi o valor. Tente: _"1500"_ ou _"R$ 1.500,00"_');
    return;
  }
  const value = parseFloat(numMatch[1].replace(',', '.'));
  const { incomeName: name, monthIndex: mi } = session.data;
  const label = `💰 *${name}* — R$ ${value.toFixed(2)} · ${MONTH_NAMES[mi]}`;
  session.step = 'confirming_cmd';
  session.data = {};
  session.pendingCmd = { type: 'ADD_INCOME', params: { name, value, monthIndex: mi }, label };
  await sendMessage(chatId, `Confirma a entrada de renda:\n\n${label}\n\nConfirma? _(sim/não)_`);
}

// ─── Expense flow ─────────────────────────────────────────────────────────────

async function handleCollecting(chatId, text, session) {
  const lower = text.toLowerCase().trim();

  // Escape: frustração, cancelamento ou repetição óbvia → cancela o fluxo
  const isFrustration = /\b(cancela|cancelar|cancelo|sair|sai|para|pare|chega|n[aã]o\s*quero|burro|idiota|lixo|merda|bosta)\b/i.test(lower) ||
    /^(\w+)[,\s]+\1[,\s]+\1/.test(lower); // mesma palavra 3x = frustração (ex: "burro, burro, burro")
  if (isFrustration && !/\d/.test(text)) {
    session.step = 'idle';
    session.data = {};
    await sendMessage(chatId, 'OK, cancelado! 😊 Pode mandar uma nova mensagem quando quiser.');
    return;
  }

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
  const yes = /\b(sim|ok|pode|yes|isso|certo|confirma)\b/.test(lower) || lower === 's';
  const no = /\b(n[aã]o|nao|errado|cancela|cancelar)\b/.test(lower) || lower === 'n';

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

  // Fluxo de seleção numerada (múltiplos matches no conclude_expense)
  if (session.pendingCmd?.multiSelect) {
    const matches = session.pendingCmd.matches || [];
    if (/\b(n[aã]o|nao|cancelar|cancela)\b/.test(lower) || lower === 'n') {
      await sendMessage(chatId, 'OK, cancelado! 😊');
      session.step = 'idle';
      session.pendingCmd = null;
      return;
    }
    const isTodos = /\btodos?\b|\ball\b|tudo/.test(lower);
    const nums = isTodos
      ? matches.map((_, i) => i + 1)
      : [...lower.matchAll(/\d+/g)].map(m => parseInt(m[0])).filter(n => n >= 1 && n <= matches.length);

    if (!nums.length) {
      const example = matches.map((_, i) => i + 1).join(' ou ');
      await sendMessage(chatId, `Responda com o número (${example}), _"todos"_ ou _"não"_`);
      return;
    }

    const selected = nums.map(n => matches[n - 1]);
    const baseQuery = session.pendingCmd.params.expense_name;
    const R = (v) => `R$ ${(v || 0).toFixed(2)}`;
    const label = selected.map(m =>
      `• *${m.item.name}* — ${R(m.item.value)} · ${MONTH_NAMES[m.mi]}`
    ).join('\n');

    session.step = 'done';
    session.pendingCmd = null;
    await sendMessage(chatId, '⏳ Executando...');

    try {
      for (const m of selected) {
        const cmdId = await writeCommand(chatId, 'CONCLUDE_EXPENSE', {
          expense_name: baseQuery,
          monthIndex: m.mi,
        });
        await pollCommandResult(chatId, cmdId, 25000);
      }
      await sendMessage(chatId, `✅ *Despesa(s) concluída(s)!*\n\n${label}\n\n_Atualizado no Controle+_ 🚀`);
    } catch (e) {
      console.error('[Jarvis] conclude multi error:', e.message);
      await sendMessage(chatId, `✅ Agendado! Abre o Controle+ para aplicar. 📱`);
    }
    return;
  }

  const yes = /\b(sim|ok|pode|yes|isso|certo|confirma)\b/.test(lower) || lower === 's';
  const no = /\b(n[aã]o|nao|errado|cancela|cancelar)\b/.test(lower) || lower === 'n';

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
      const errMsg = result.error || '';
      if (errMsg.includes('Comando desconhecido') || errMsg.includes('não disponível')) {
        await sendMessage(chatId, `📱 Este comando requer a versão mais recente do Controle\\+!\n\nBaixe o APK atualizado para usar esta função.`);
      } else {
        await sendMessage(chatId, `⚠️ ${errMsg || 'Ocorreu um erro. Tente novamente.'}`);
      }
      return;
    }
    if (cmd.type === 'ADD_INSTALLMENTS') {
      await sendMessage(chatId, `✅ *Parcelamento adicionado!*\n\n${cmd.label}\n\n_Meses atualizados no Controle+_ 🚀`);
    } else if (cmd.type === 'UPDATE_DUE_DATE') {
      await sendMessage(chatId, `✅ *Vencimento atualizado!*\n\n${cmd.label}\n\n_Notificações reagendadas_ ✅`);
    } else if (cmd.type === 'CONCLUDE_EXPENSE') {
      await sendMessage(chatId, `✅ *Despesa(s) concluída(s)!*\n\n${cmd.label}\n\n_Atualizado no Controle+_ 🚀`);
    } else if (cmd.type === 'ADD_INCOME') {
      await sendMessage(chatId, `✅ *Renda adicionada!*\n\n${cmd.label}\n\n_Atualizado no Controle+_ 🚀`);
    } else if (cmd.type === 'REOPEN_EXPENSE') {
      await sendMessage(chatId, `🔓 *Despesa(s) reabertas!*\n\n${cmd.label}\n\n_Atualizado no Controle+_ 🚀`);
    } else if (cmd.type === 'ADD_PROJECT') {
      await sendMessage(chatId, `✅ *Projeto criado!*\n\n${cmd.label}\n\n_Aparece nos seus projetos no Controle+_ 🚀`);
    } else if (cmd.type === 'TOGGLE_SETTING') {
      await sendMessage(chatId, `✅ *Configuração atualizada!*\n\n${cmd.label}\n\n_Aplicado no Controle+_ ✅`);
    } else if (cmd.type === 'SET_AVATAR') {
      await sendMessage(chatId, `✅ *Foto atualizada!*\n\nSua nova foto de perfil já está no Controle+ 📸`);
    } else if (cmd.type === 'SET_PAYMENT_LIMIT') {
      await sendMessage(chatId, `✅ *Limite atualizado!*\n\n${cmd.label}\n\n_Aplicado no Controle+_ 💳`);
    } else if (cmd.type === 'SET_USER_NAME') {
      await sendMessage(chatId, `✅ *Nome atualizado!*\n\n${cmd.label}\n\n_Aplicado no Controle+_ ✏️`);
    } else if (cmd.type === 'SET_CONTRIBUTION_PCT') {
      await sendMessage(chatId, `✅ *Meta de contribuição atualizada!*\n\n${cmd.label}\n\n_Aplicado no Controle+_ 💜`);
    } else if (cmd.type === 'UPDATE_PROJECT_SAVED') {
      await sendMessage(chatId, `✅ *Projeto atualizado!*\n\n${cmd.label}\n\n_Guardado atualizado no Controle+_ 🎯`);
    }
  } catch (e) {
    console.error('[Jarvis] comando error:', e.message);
    await sendMessage(chatId, `✅ Agendado! Abre o Controle+ para aplicar. 📱`);
  }
}
