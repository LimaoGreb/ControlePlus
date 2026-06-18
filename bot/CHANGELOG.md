# CHANGELOG — Cap Bot

## [2025-06-18] Voz no Cap (edge-tts + transcrição Gemini)

### Libs instaladas
- `msedge-tts@^1.3.4` — TTS gratuito via Microsoft Edge, zero custo, vozes neurais

### Arquivos criados
- `ttsService.js` — Geração de áudio MP3 via msedge-tts, flag de voice reply por chatId, preferência de voz persistida em memória por sessão. Exporta: `textToSpeech`, `activateVoiceReply`, `deactivateVoiceReply`, `isVoiceReply`, `setVoiceForChat`, `getVoiceForChat`, `AVAILABLE_VOICES`.

### Arquivos modificados
- `telegramApi.js` — `sendMessage` agora verifica flag de voice reply e, se ativo, converte o texto em áudio MP3 via TTS e envia como `sendVoice`. Novas funções: `sendVoice`, `sendRecordingAction`.
- `geminiClient.js` — Nova função `transcribeAudio(audioBase64, mimeType)` que envia áudio inline para Gemini 2.0 Flash e retorna o texto transcrito.
- `server.js` — Webhook passa a detectar `msg.voice`: baixa arquivo OGG, transcreve via Gemini, ativa flag de voice reply, chama `handleMessage`, desativa flag no `finally`.
- `conversation.js` — Novo comando `/voz` interceptado no topo de `handleMessage`. Sem argumento: lista as 3 vozes disponíveis com destaque na atual. Com argumento (ex: `/voz antonio`): troca a voz do chat.

### Vozes pt-BR disponíveis
- `pt-BR-FranciscaNeural` — feminina, padrão
- `pt-BR-AntonioNeural` — masculino
- `pt-BR-ThalitaNeural` — feminina, jovem

### Comportamento
- Voz entra → transcreve → processa → responde com voz
- Texto entra → processa → responde com texto
- Preferência de voz dura enquanto o servidor estiver ativo; resetar com `/voz <nome>` a qualquer momento
