// Jarvis Bot - servidor Express para webhook do Telegram
//
// DEPLOY GRATUITO (Render.com):
//   1. Cria conta em render.com > New Web Service > conecta o repositorio
//   2. Root Directory: bot
//   3. Build Command: npm install
//   4. Start Command: npm start
//   5. Variaveis de ambiente (aba "Environment"):
//        BOT_TOKEN                 -> token do @BotFather no Telegram
//        GEMINI_API_KEY            -> chave gratuita em aistudio.google.com (Get API key)
//        FIREBASE_SERVICE_ACCOUNT  -> conteudo do serviceAccount.json como string JSON
//   6. Apos deploy, acesse: GET https://sua-url.onrender.com/setup-webhook
//      Isso registra o webhook no Telegram automaticamente.
//
// APOS DEPLOY:
//   - Abra o Telegram, mande qualquer msg pro seu bot
//   - Copie o chatId que aparecer no log do servidor (aba Logs do Render)
//   - Cole nas Configuracoes do Controle+ (campo "ID do Telegram Jarvis")

import express from 'express';
import { handleMessage, handlePhotoMessage } from './conversation.js';
import { setWebhook, sendMessage, getFile, downloadFileAsBase64 } from './telegramApi.js';
import { activateVoiceReply, deactivateVoiceReply } from './ttsService.js';
import { getAllChatIds, readUserSnapshot } from './firebaseWriter.js';
import { classifyIntent, transcribeAudio } from './geminiClient.js';

const app = express();
app.use(express.json());

// Recebe updates do Telegram
app.post('/webhook', async (req, res) => {
  // Responde 200 imediatamente - Telegram exige resposta em <5s
  res.sendStatus(200);

  const update = req.body;
  const msg = update?.message;
  if (!msg) return;

  const chatId = String(msg.chat.id);
  const firstName = msg.from?.first_name || 'voce';

  // Mensagem de foto
  if (msg.photo && msg.photo.length > 0) {
    console.log(`[${new Date().toISOString()}] ${firstName} (${chatId}): [FOTO]`);
    try {
      await handlePhotoMessage(chatId, msg.photo, firstName);
    } catch (e) {
      console.error('[Jarvis] erro no handlePhotoMessage:', e.message);
    }
    return;
  }

  // Mensagem de voz
  if (msg.voice) {
    console.log(`[${new Date().toISOString()}] ${firstName} (${chatId}): [VOZ ${msg.voice.duration}s]`);
    try {
      const filePath = await getFile(msg.voice.file_id);
      if (!filePath) return;
      const audioB64 = await downloadFileAsBase64(filePath);
      if (!audioB64) return;
      const transcribed = await transcribeAudio(audioB64, 'audio/ogg');
      if (!transcribed) {
        await sendMessage(chatId, '🎙️ Não consegui entender o áudio. Pode repetir?');
        return;
      }
      console.log(`[${new Date().toISOString()}] ${firstName} (${chatId}) [transcrito]: ${transcribed}`);
      activateVoiceReply(chatId);
      await handleMessage(chatId, transcribed, firstName);
    } catch (e) {
      console.error('[Jarvis] erro no voice handling:', e.message);
    } finally {
      deactivateVoiceReply(chatId);
    }
    return;
  }

  if (!msg.text) return;

  const text = msg.text;
  console.log(`[${new Date().toISOString()}] ${firstName} (${chatId}): ${text}`);

  try {
    await handleMessage(chatId, text, firstName);
  } catch (e) {
    console.error('[Jarvis] erro no handleMessage:', e.message);
  }
});

// Rota para registrar o webhook (chamar 1x apos deploy)
app.get('/setup-webhook', async (req, res) => {
  const host = req.get('host');
  if (!host) return res.status(400).json({ error: 'host nao encontrado' });
  const result = await setWebhook(`https://${host}`);
  console.log('[Jarvis] webhook registrado:', result);
  res.json(result);
});

// Health check
app.get('/', (req, res) => res.json({ status: 'Jarvis online' }));

// ─── Endpoint para o Cap (chat in-app) ───────────────────────────────────────
// Recebe texto e retorna a classificação via Gemini quando o localClassify falha.
// Chave API fica só no servidor — o app não precisa guardar nada sensível.
app.post('/cap-classify', async (req, res) => {
  try {
    const { text, history } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });
    const result = await classifyIntent(text.slice(0, 500), Array.isArray(history) ? history : []);
    res.json({ result });
  } catch (e) {
    console.error('[Cap classify]', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis bot rodando na porta ${PORT}`);
  console.log(`Apos deploy, acesse /setup-webhook para registrar no Telegram`);
});

// ─── Lembretes de vencimento ──────────────────────────────────────────────────
const sentRemindersToday = new Set();
let lastReminderDay = -1;

async function checkDueDateReminders() {
  try {
    const now = new Date();
    const day = now.getDate();
    const mi = now.getMonth();

    // Limpa o set quando muda o dia
    if (day !== lastReminderDay) {
      sentRemindersToday.clear();
      lastReminderDay = day;
    }

    const chatIds = await getAllChatIds();
    for (const chatId of chatIds) {
      const snapshot = await readUserSnapshot(chatId);
      if (!snapshot?.months) continue;

      const fixed = snapshot.months[mi]?.fixed || [];
      for (const expense of fixed) {
        if (expense.dueDay !== day) continue;
        if (expense.concluded) continue;

        const key = `${chatId}_${mi}_${expense.id || expense.name}`;
        if (sentRemindersToday.has(key)) continue;
        sentRemindersToday.add(key);

        const value = (expense.value || 0).toFixed(2);
        await sendMessage(chatId,
          `🔔 *Lembrete de vencimento!*\n\n` +
          `📝 *${expense.name}*\n` +
          `💰 R$ ${value}\n` +
          `📅 Vence *hoje* (dia ${day})\n\n` +
          `Já pagou? Me diz:\n_"conclua ${expense.name.toLowerCase()}"_ ✅`
        );
        console.log(`[Jarvis] lembrete enviado para ${chatId}: ${expense.name}`);
      }
    }
  } catch (e) {
    console.warn('[Jarvis] reminder check error:', e.message);
  }
}

// Verifica vencimentos a cada hora; primeira checagem após 12s (aguarda Firebase)
setTimeout(checkDueDateReminders, 12000);
setInterval(checkDueDateReminders, 60 * 60 * 1000);
