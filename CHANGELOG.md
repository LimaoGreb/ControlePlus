# CHANGELOG — Controle+

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
