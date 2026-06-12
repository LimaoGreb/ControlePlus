// Máquina de estados da conversa do Jarvis.
// Cada chat tem seu próprio estado independente (Map em memória).
import { parseExpenseMessage, extractField } from './claudeClient.js';
import { addPendingExpense } from './firebaseWriter.js';
import { sendMessage, sendTyping } from './telegramApi.js';

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// { [chatId]: { step, data, askingFor, firstName } }
const sessions = new Map();

function getSession(chatId, firstName) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { step: 'idle', data: {}, firstName: firstName || 'você' });
  }
  return sessions.get(chatId);
}

export async function handleMessage(chatId, text, firstName) {
  const session = getSession(chatId, firstName);
  await sendTyping(chatId);

  // ── IDLE ou DONE: espera nova despesa ──────────────────────────────────────
  if (session.step === 'idle' || session.step === 'done') {
    const parsed = await parseExpenseMessage(text);

    if (!parsed?.isExpense) {
      await sendMessage(chatId,
        `Oi ${session.firstName}! 👋 Me conta uma despesa e eu já adiciono no Controle+.\n\nExemplo: _"Jarvis, gastei 35 reais no mercado no débito"_`
      );
      return;
    }

    session.data = {
      name: parsed.name,
      value: parsed.value,
      payment: parsed.payment,
      monthIndex: parsed.monthIndex,
    };
    session.step = 'collecting';
    await askNextMissing(chatId, session);
    return;
  }

  // ── COLLECTING: coleta campos faltantes ────────────────────────────────────
  if (session.step === 'collecting') {
    if (session.askingFor === 'value') {
      const val = await extractField('value', text);
      if (!val) {
        await sendMessage(chatId, 'Não entendi o valor. Pode repetir? Ex: _"50 reais"_ ou _"R$ 50"_');
        return;
      }
      session.data.value = val;
    }
    if (session.askingFor === 'payment') {
      // Usuário pode pular forma de pagamento
      const lower = text.toLowerCase().trim();
      if (lower === 'pular' || lower === 'não sei' || lower === 'nao sei' || lower === '-') {
        session.data.payment = false; // false = usuario pulou explicitamente
      } else {
        const pay = await extractField('payment', text);
        session.data.payment = pay;
      }
    }

    await askNextMissing(chatId, session);
    return;
  }

  // ── CONFIRMING: usuário confirma ou corrige ────────────────────────────────
  if (session.step === 'confirming') {
    const lower = text.toLowerCase().trim();
    const confirmed = ['sim','s','ok','pode','yes','pode ser','isso','certo','confirma'].some(w => lower.includes(w));
    const denied = ['não','nao','n','errado','cancela','cancelar','errei'].some(w => lower.includes(w));

    if (confirmed) {
      const expId = await addPendingExpense(chatId, session.data);
      const payFinal = (session.data.payment && session.data.payment !== false) ? session.data.payment : null;
      const pm = payFinal ? `\n💳 ${payFinal}` : '';
      session.data.payment = payFinal;
      await sendMessage(chatId,
        `✅ *Adicionado!*\n\n📝 *${session.data.name}*\n💰 *R$ ${session.data.value.toFixed(2)}*${pm}\n📅 ${MONTH_NAMES[session.data.monthIndex]}\n\n_Abre o Controle+ para ver_ 🚀`
      );
      session.step = 'done';
      session.data = {};
    } else if (denied) {
      await sendMessage(chatId, 'OK, cancelado! Me conta de novo se quiser. 😊');
      session.step = 'idle';
      session.data = {};
    } else {
      // Talvez o usuário esteja corrigindo algo
      const parsed = await parseExpenseMessage(text);
      if (parsed?.isExpense) {
        // Nova despesa mencionada — reseta
        session.data = { name: parsed.name, value: parsed.value, payment: parsed.payment, monthIndex: parsed.monthIndex };
        session.step = 'collecting';
        await askNextMissing(chatId, session);
      } else {
        await sendMessage(chatId, 'Confirma a despesa? Responde *sim* ou *não* 😊');
      }
    }
    return;
  }
}

// Verifica o próximo campo obrigatório faltando e pergunta ao usuário.
async function askNextMissing(chatId, session) {
  const { data } = session;

  // Nome nunca vai faltar (vem sempre do primeiro parseExpenseMessage)
  if (!data.value) {
    session.askingFor = 'value';
    await sendMessage(chatId, `💰 Quanto você gastou em *${data.name}*?`);
    return;
  }

  if (data.payment == null) { // null = nao mencionado; undefined = campo ausente
    session.askingFor = 'payment';
    await sendMessage(chatId,
      `💳 Como foi o pagamento? _(Pix, débito, crédito Nubank...)_\nOu manda _"pular"_ para deixar em branco.`
    );
    return;
  }

  // Tudo preenchido — pede confirmação
  session.step = 'confirming';
  session.askingFor = null;

  const payLabel = (data.payment && data.payment !== false) ? data.payment : null;
  const pm = payLabel ? `\n💳 ${payLabel}` : '';
  await sendMessage(chatId,
    `Confere:\n\n📝 *${data.name}*\n💰 *R$ ${data.value.toFixed(2)}*${pm}\n📅 ${MONTH_NAMES[data.monthIndex]}\n\nConfirma? _(sim/não)_`
  );
}
