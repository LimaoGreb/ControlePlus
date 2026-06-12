// ─────────────────────────────────────────────────────────────────────────────
// Telegram Bot — integração futura para envio de alertas financeiros.
//
// COMO ATIVAR:
//   1. Abra o Telegram e fale com @BotFather → /newbot → siga as instruções.
//   2. Copie o token gerado (ex: 123456789:AAF...) e cole em BOT_TOKEN abaixo.
//   3. O usuário abre o app Telegram, busca o seu bot e manda /start.
//   4. Use getUpdates() para descobrir o chat_id do usuário.
//   5. Salve o chat_id no AsyncStorage/Configurações e passe nas chamadas.
//
// FEATURES PLANEJADAS:
//   - Lembrete de vencimentos (integração com o sistema de notificações)
//   - Resumo mensal automático
//   - Alertas de limite de cartão
//   - Resumo semanal de gastos
// ─────────────────────────────────────────────────────────────────────────────

// TODO: preencher após criar o bot no @BotFather
const BOT_TOKEN = '';

const BASE_URL = () => `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Envia uma mensagem de texto para um chat do Telegram.
 * @param {string} chatId  — ID do chat do usuário (obtido via /start no bot)
 * @param {string} text    — Texto da mensagem (suporta Markdown básico)
 */
export async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return; // inativo enquanto não configurado
  try {
    const res = await fetch(`${BASE_URL()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok) console.warn('[Telegram] sendMessage falhou:', res.status);
    return await res.json();
  } catch (e) {
    console.warn('[Telegram] erro ao enviar:', e.message);
  }
}

/**
 * Descobre o chat_id mais recente que enviou /start ao bot.
 * Usar uma vez para configurar o chat_id do usuário.
 */
export async function getTelegramChatId() {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${BASE_URL()}/getUpdates`);
    const json = await res.json();
    const updates = json?.result || [];
    if (!updates.length) return null;
    return updates[updates.length - 1]?.message?.chat?.id || null;
  } catch (e) {
    console.warn('[Telegram] getUpdates falhou:', e.message);
    return null;
  }
}

// ─── Templates de mensagem prontos para usar ─────────────────────────────────

export function msgVencimentoHoje(nome, valor) {
  return `💸 *VENCE HOJE: ${nome}*\nValor: *${valor}*\nPague o quanto antes para não atrasar!`;
}

export function msgVencimentoAmanha(nome, valor, dia) {
  return `⚠️ *Amanhã vence: ${nome}*\nValor: *${valor}*\nDia ${dia} — separa o dinheiro hoje!`;
}

export function msgLimiteMetade(banco, gasto, limite) {
  return `🔔 *${banco}* — você já usou mais da metade do limite.\nGasto: *${gasto}* de *${limite}*`;
}

export function msgLimiteEsgotando(banco, restante) {
  return `🚨 *${banco}* — faltam apenas *${restante}* no seu limite!\nCuidado para não estourar.`;
}

export function msgResumoMensal(mes, renda, gastos, sobra) {
  const emoji = sobra >= 0 ? '✅' : '🔴';
  return `${emoji} *Resumo de ${mes}*\n\n📈 Renda: *${renda}*\n📉 Gastos: *${gastos}*\n💰 Sobra: *${sobra}*`;
}
