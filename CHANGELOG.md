# CHANGELOG — Controle+

---

## v2.1.0 — 2026-06-12

### Fixes — Formas de Pagamento
**`src/screens/SettingsCartoesScreen.js`**
- Substituído `getBankById(pm.bank)` por `getBankForPayment(pm)` → Débito agora exibe badge corretamente (auto-detectado pelo nome).
- PIX e Débito não exibem o chip "Crédito" (`isNonCredit` flag).
- `useEffect` no mount limpa `isCredit: true` em entradas PIX/Débito que existiam por engano.

### Telegram Logo no Jarvis
**`src/data/bankLogos.js`**
- Adicionado `export const telegram` com SVG oficial do Telegram (gradiente azul, avião branco).
**`assets/banks/telegram.svg`** — cópia de `telegram_logo.svg` para compatibilidade com o script de geração.
**`scripts/generate-bank-logos.js`** — adicionado `'telegram'` ao BANK_IDS.
**`src/screens/SettingsPerfilScreen.js`**
- Ícone Jarvis: substituído `<Ionicons name="logo-telegram">` (renderizava "?") por `<SvgXml xml={telegram}>` com o SVG real.

### Jarvis — Comparativo entre meses
**`bot/queryHandler.js`**
- Novo subtype `compare`: recebe `month1`, `month2`, `filter` (opcional).
- Mostra totais dos dois meses lado a lado, lista items se filtrado, calcula diferença em R$ e % com seta de tendência.
**`bot/geminiClient.js`**
- Novo bloco de detecção: "comparativo", "comparar", "vs", "versus", "diferença entre" → `{ subtype: 'compare', month1, month2, filter }`.
- Auto-resolve "mês passado e esse mês" para índices corretos.
- Prompt Gemini atualizado com subtype `compare`, `month1`, `month2`.
**`bot/conversation.js`**
- Help message atualizado com exemplo do comparativo.

---

## v2.0.9 — 2026-06-12

### Correções Críticas

**Notificações (`src/services/notifications.js`)**
- Fix: trigger agora usa `SchedulableTriggerInputTypes.DATE` explícito (expo-notifications v0.29 requer o campo `type`, sem ele o trigger era ignorado e as notificações disparavam imediatamente).

**Google OAuth (`src/context/GoogleAuthContext.js`)**
- Fix: adicionado `redirectUri: ANDROID_REDIRECT_URI` explícito no `useAuthRequest`. O expo-auth-session calculava o redirect para o scheme do app (`com.mautic.financeapp://`) mas o Android OAuth client do Google exige o formato `com.googleusercontent.apps.<id>:/oauth2redirect/google`.

### Logos PIX e Débito

**`src/data/banks.js`**
- Adicionados `{ id: 'pix', color: '#32BCAD' }` e `{ id: 'debito', color: '#1E3A5F' }`.
- Nova função `getBankForPayment(pm)`: auto-detecta PIX/Débito pelo nome quando `pm.bank` não está definido. Centraliza a lógica que estava duplicada em ItemRow e PaymentBreakdown.

**`src/data/bankLogos.js`**
- Adicionados exports `pix` (ícone quadrado extraído do SVG oficial, viewBox recortado ao símbolo) e `debito` (card icon minimalista).

**`assets/banks/pix.svg`** + **`assets/banks/debito.svg`** — novos arquivos de origem para o script de geração.

**`scripts/generate-bank-logos.js`** — adicionados `'pix'` e `'debito'` em `BANK_IDS`.

### ItemRow + PaymentBreakdown
- Substituído `getBankById(pm.bank)` por `getBankForPayment(pm)` em `ItemRow.js` e `PaymentBreakdown.js` — PIX e Débito agora mostram logo/cor mesmo quando vinculados pelo nome.
- Overlay vermelho em despesas vencidas: opacidade reduzida de `0.38` → `0.22`.

### Jarvis — movido para Perfil
- `SettingsScreen.js`: card Jarvis removido. Imports `useState`, `TextInput`, `Alert` limpados.
- `SettingsPerfilScreen.js`: seção "JARVIS" adicionada abaixo de Modo Casal, com ícone Telegram dourado e label "Jarvis — Telegram".

---

## v2.0.5 — 2026-06-12

### Infraestrutura / Build
- **Codemagic** substituiu EAS (plano gratuito do EAS esgotado). Build 100% na nuvem via `codemagic.yaml`.
- **Keystore fixo**: `codemagic.yaml` suporta `KEYSTORE_BASE64` env var — usa keystore salvo ou gera novo e printa base64 + SHA-1 nos logs. Senha: `Brenda.1011`. ⚠️ Ainda pendente: extrair base64 do build #8 e salvar no Codemagic → Settings → Environment variables.
- **SVG transformer**: instalado `react-native-svg-transformer`; `metro.config.js` configurado para tratar `.svg` como source extension.

### BankBadge (`src/components/BankBadge.js`) — novo componente
- Exibe logo SVG do banco quando disponível, fallback para badge de iniciais coloridas.
- `assets/banks/` com 15 SVGs: bb, bradesco, c6, caixa, inter, itau, mercadopago, neon, next, nubank, pagbank, picpay, recargapay, santander, sicoob.
- `src/data/banks.js`: campo `abbr` adicionado em todos os 17 bancos.
- Try/catch em todo carregamento de SVG — nunca crasha o app se logo não carregar.

### SettingsCartoesScreen (`src/screens/SettingsCartoesScreen.js`)
- `BankBadge` substituiu pontos coloridos no seletor de banco.
- Campo de busca em tempo real no seletor de banco (filtra por nome, botão de limpar).

### ItemRow (`src/components/ItemRow.js`) + CurrencyInput (`src/components/CurrencyInput.js`)
- **Overlay vermelho nítido** em despesas vencidas: `rgba(255,59,48,0.18)` no card + inputs com fundo vermelho.
- Ambos os campos (nome e valor) com `editable={false}` em despesas concluídas — sem borda, sem fundo.

### NotificationsManager (`src/components/NotificationsManager.js`)
- Fix de notificações disparando 8x: removido call imediato duplicado + cooldown de 15s via ref `lastScheduled`.

### SettingsScreen (`src/screens/SettingsScreen.js`)
- Versão agora lida dinamicamente via `Constants.expoConfig.version` — nunca mais hardcoded.

### Jarvis Bot (`bot/`)
- **Análise multi-mês** (`queryHandler.js`): novo subtype `analysis` — mês a mês com renda/gastos/saldo, totais do período, nota A→F, melhor e pior mês.
- **Busca por range** (`queryHandler.js`): novo subtype `by_name_range` — busca despesa por nome em múltiplos meses ("quanto gastei em ifood desde janeiro?").
- **Classificador** (`geminiClient.js`): `parseMonthRange()` detecta "desde janeiro", "primeiros N meses", "últimos N meses", "ano completo". "feedback" com mês único → summary do mês (não análise anual).
- Mensagem de ajuda atualizada com os novos comandos.

### Pendências para próxima sessão
- Salvar `KEYSTORE_BASE64` (pegar do log do build #8, passo "Configura keystore") e registrar SHA-1 no Google Cloud Console para Google OAuth funcionar no APK.
- Remover terceiro gráfico da dashboard (BankBreakdown como gráfico separado).
- Google Auth + backup Firebase + Modo Casal por email (sessão dedicada — ver `project-feature-google-auth.md`).

---

## v2.0.4 — 2026-06-12

### Jarvis Bot
- **Nova intent `conclude_expense`** (`bot/geminiClient.js`, `bot/conversation.js`, `src/components/JarvisSyncManager.js`): "conclua a despesa do Carteiro" detecta o nome, lista todas as ocorrências em aberto em todos os meses, pede confirmação e executa via command queue no Firebase. Marca TODAS as despesas com aquele nome, não só a primeira.

### AnnualSummaryScreen (`src/screens/AnnualSummaryScreen.js`)
- **Destaques do Ano**: agora só contabiliza meses com `completed = true` — evita distorção por meses futuros com salário já lançado.
- **Carrossel de Saúde (Mês → Ano)**: dois cards deslizáveis — Página 0 = saúde do mês atual, Página 1 = saúde anual. `ScoreRing` + gradient colorido + barra de progresso.
- **Carrossel de Donut (Mês → Ano)**: Página 0 = "Onde foi o dinheiro este mês?" usando `categorize` no mês atual; Página 1 = "... este ano?" com dados anuais completos. Ambos com PeekCard, pills e bottom sheet.
- **Escala de cores de saúde** (`HEALTH_SCALE`): A=`#2ECC71` (verde), B=`#A8D060` (limão), C=`#F5C518` (âmbar), D=`#F39C12` (laranja), F=`#E74C3C` (vermelho). Legenda A→F exibida em ambos os cards do carrossel; grau atual em destaque.
- **PeekCard redesenhado**: emoji ring colorido, stats row (pico de mês, média/mês, nº de ocorrências), top 5 itens com medalhas 🥇🥈🥉.
- **CarouselDots**: componente de bolinhas (pill ativa + ponto inativo) para ambos os carrosséis.

### ProjectCard (`src/components/ProjectCard.js`)
- Donut ampliado para 120 px.
- Emoji automático via `getEmoji(name)` (EMOJI_MAP com 20 categorias): aparece no centro do donut.
- **Modo toggle**: `⏱ Meta + Aporte` (quanto guardar/mês → calcula prazo) vs `🎯 Meta + Prazo` (quantos meses → calcula mensalidade), função `calcPrazo`.
- "Já guardado" oculto quando `saved === 0`; botão "Já tenho algo guardado" para revelar.
- `InfoBlock` com espaçamento `marginBottom: 10` entre label e valor.

### CurrencyInput (`src/components/CurrencyInput.js`)
- Reescrito com padrão "centavos por dígito" (estilo Nubank/PicPay): ao focar zera, cada dígito digitado empurra centavos da direita pra esquerda.
- Novo prop `editable` (default `true`): quando `false`, campo fica visual "fantasma" (sem borda, sem fundo, sem teclado).

### InvestmentsScreen (`src/screens/InvestmentsScreen.js`)
- "Resumo da carteira" só aparece quando `investments.length > 0`.
- Card de onboarding ("Você já está investindo?") no primeiro acesso sem dados, com dois CTAs: "Sim, já invisto!" e "Quero começar agora".

### ItemRow (`src/components/ItemRow.js`)
- Nome e valor bloqueados para edição quando `item.concluded === true` (`editable={!concluded}`). Campo de nome perde borda/fundo; valor passa `editable` para `CurrencyInput`.

---

## v2.0.3 — (anterior)
- Build anterior — ver commits git para histórico.
