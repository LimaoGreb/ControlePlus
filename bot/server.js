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
import { handleMessage } from './conversation.js';
import { setWebhook } from './telegramApi.js';

const app = express();
app.use(express.json());

// Recebe updates do Telegram
app.post('/webhook', async (req, res) => {
  // Responde 200 imediatamente - Telegram exige resposta em <5s
  res.sendStatus(200);

  const update = req.body;
  const msg = update?.message;
  if (!msg?.text) return;

  const chatId = String(msg.chat.id);
  const text = msg.text;
  const firstName = msg.from?.first_name || 'voce';

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis bot rodando na porta ${PORT}`);
  console.log(`Apos deploy, acesse /setup-webhook para registrar no Telegram`);
});
