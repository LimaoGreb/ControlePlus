# server/ — Bot WhatsApp (Módulo Futuro / Não Implementado)

Esta pasta é um **placeholder** para um backend separado que, no futuro, vai
permitir registrar despesas pelo WhatsApp com mensagens em linguagem natural,
tipo:

> "gastei 200 na renner"
> "ifood 54,90"
> "recebi 1500 de salário"

O app de finanças (React Native) **não** muda: ele continua lendo/gravando os
dados localmente. Este servidor apenas grava no mesmo backend de dados quando
existir uma camada de sincronização (hoje os dados são locais via AsyncStorage;
para o bot funcionar de verdade será necessário um backend de dados na nuvem).

## Arquitetura planejada

```
WhatsApp do usuário
        │  (mensagem de texto)
        ▼
API do WhatsApp  ──►  Servidor Node.js (esta pasta)
 (Cloud API oficial      │
  ou Baileys)            ├─ 1. Recebe o webhook da mensagem
                         ├─ 2. Faz o parsing ("gastei 200 na renner"
                         │      -> { tipo: 'despesa', valor: 200, nome: 'Renner' })
                         ├─ 3. Classifica fixa x variável (regras/IA)
                         ├─ 4. Grava no banco de dados na nuvem
                         └─ 5. Responde confirmando ("✅ R$200,00 em Renner")
                                  │
                                  ▼
                        App lê os dados sincronizados
```

## Componentes necessários

1. **Camada de mensagens** — uma das opções:
   - **WhatsApp Business Cloud API** (oficial, Meta): exige conta Meta Business,
     número verificado, token de acesso e configuração de webhook. Mais estável
     e dentro dos termos de uso.
   - **Baileys** (biblioteca não-oficial, conecta como WhatsApp Web): mais
     simples de começar, sem custo de API, porém fora dos termos de uso oficiais
     e sujeita a bloqueios.

2. **Servidor** — Node.js + Express (ou Fastify) com um endpoint de webhook
   (`POST /webhook`) e verificação de assinatura.

3. **Parser de mensagens** — extrai valor, descrição e tipo. Pode evoluir de
   regex simples para um modelo de linguagem (ex.: API da Anthropic) para
   entender frases livres e categorizar automaticamente.

4. **Hospedagem** — Railway, Render, Fly.io, VPS, etc. Precisa de URL pública
   (HTTPS) para receber os webhooks do WhatsApp.

5. **Banco de dados na nuvem** — para o app e o bot compartilharem os mesmos
   dados (ex.: Postgres/Supabase/Firebase). Hoje o app é 100% local; esta é a
   peça que falta para o bot ser útil de verdade.

## Esboço de implementação (futuro)

```js
// server/index.js (exemplo conceitual — NÃO implementado)
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const texto = extrairTexto(req.body);          // "gastei 200 na renner"
  const lancamento = parseMensagem(texto);       // { valor, nome, tipo }
  await salvarNoBanco(lancamento);               // grava na nuvem
  await responderWhatsApp(req, '✅ Registrado!'); // confirma pro usuário
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
```

## Status

🚧 **Não implementado.** Esta pasta existe apenas para documentar a arquitetura
planejada. Nenhum código de produção foi adicionado.
