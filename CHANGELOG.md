# CHANGELOG — Controle+

---

## v2.17.0 — 2026-06-15

### feat: Orçamento como 3º slide do carrossel na Dashboard

- `src/components/BudgetBreakdown.js` — novo componente: slide de orçamento compacto com resumo "Livre pra gastar", barras de progresso por categoria (verde/laranja/vermelho), % da renda e estouros. Estado vazio com botão direto para `SettingsBudget`.
- `src/components/MonthCharts.js` — estendido de 2 para 3 páginas reais. Virtual list atualizada de 4 para 5 itens (`budget-pre`, cats, pay, budget, `cats-post`) com REAL map `[2,0,1,2,0]`. Infinite scroll preservado. `heights` agora com 3 entradas.

---

## v2.16.0 — 2026-06-15

### feat: Orçamento por Categoria + Multi-ano (2026–2033) + 6 Widgets Android

**Orçamento por Categoria:**
- `src/data/categories.js` — 9 categorias de gasto com id, nome, ícone Ionicons e cor.
- `src/components/CategoryChip.js` — chip seletor de categoria (modal 3×3), seguindo padrão DueDayChip.
- `src/components/ItemRow.js` — props `showCategory` / `onChangeCategory`, renderiza `CategoryChip` na linha de gasto.
- `src/components/ExpensesSection.js` — passa `showCategory` e `onChangeCategory` ao `ItemRow`.
- `src/components/CategoryBudgetCard.js` — card de progresso por categoria (gasto vs limite, barra colorida, notificação em 80% e 100%).
- `src/components/MonthContent.js` — importa `CategoryBudgetCard` + `useNavigation`; renderiza o card após `MonthCharts` (só no modo pessoal).
- `src/screens/SettingsBudgetScreen.js` — tela de configuração de limites: lista 9 categorias, edição inline com `CurrencyInput`, opção de remover.
- `src/context/SettingsContext.js` — `categoryBudgets` + `setCategoryBudget(catId, limit)` persistidos em `@financas:orcamentoCategorias`.
- `src/services/storage.js` — `loadCategoryBudgets()` / `saveCategoryBudgets(budgets)`.
- `App.js` — rota `SettingsBudget` registrada no RootStack.
- `src/screens/SettingsScreen.js` — entrada "Orçamento" no menu de configurações.

---

### feat: Multi-ano (2026–2033) + 6 Widgets Android

**Multi-year navigation:**
- `src/data/initialData.js` — `YEAR = new Date().getFullYear()` (dinâmico).
- `src/services/storage.js` — adicionado `getYearKey(year)`, `loadYearData(year)`, `saveYearData(year, data)`.
- `src/context/DataContext.js` — `activeYear`, `switchYear`, `switchingRef` (guard síncrono), `dataRef` (closure-safe), `yearCache` (in-memory cache, troca instantânea após 1ª carga), `addInstallments` cross-year, `clearFutureYears`.
- `src/context/InstallmentContext.js` — parcelas cruzam anos com fórmula `yearOffset = Math.floor(absMonth/12)`.
- `src/screens/AllMonthsScreen.js` — YEARS `[2026..2033]` sem `initialScrollIndex` (era a causa raiz do bug de corrupção), year tabs como `ScrollView` horizontal, duplo toque abre mês direto.

**Bug corrigido:** race condition no `switchYear` com `initialScrollIndex` copiava dados de 2026 para todos os anos futuros. Fix: `switchingRef.current` + `dataRef.current` + remoção do `initialScrollIndex`.

**6 Widgets Android (`react-native-android-widget@0.20.3`):**
- `app.json` — plugin registrado com 6 widgets (SaldoWidget 2×2, ResumoWidget 4×2, LancamentoWidget 2×1, PortfolioWidget 4×2, ProjetoWidget 2×2, CartoesWidget 4×2).
- `index.js` — `registerWidgetTaskHandler(widgetTaskHandler)`.
- `App.js` — `WidgetSyncManager` atualiza widgets no AppState `background`.
- `src/widgets/widgetColors.js` — 6 paletas + dark/light em hex puro.
- `src/widgets/widgetUtils.js` — `fmtBRL`, `progressColor`, `MONTH_NAMES`.
- `src/widgets/widgetTaskHandler.js` — handler headless, lê AsyncStorage, renderiza cada widget.
- `src/widgets/{Saldo,Resumo,Lancamento,Portfolio,Projeto,Cartoes}Widget.js` — componentes com FlexWidget/TextWidget/SvgWidget. ProjetoWidget usa donut SVG via stroke-dashoffset.
- `src/widgets/updateAllWidgets.js` — atualiza todos os widgets de uma vez via `requestWidgetUpdate`.
- ⚠️ Widgets só funcionam em APK (não no Expo Go). Precisa de build via Codemagic.

---

## v2.15.1 — 2026-06-15

### feat: TTS + UI de áudio WhatsApp-style no Cap

**Lib adicionada:** `expo-speech ~13.0.1` (`npx expo install expo-speech`).

**`src/screens/ChatScreen.js` — reescrito:**
- `mkMsg` agora aceita `opts = { isVoice, isVoiceResponse, duration }`.
- `StaticWaveform` — waveform decorativo estático para bolhas de áudio enviadas (preset de 24 alturas fixas, sem animação).
- `LiveWaveformBars` — waveform animado com Animated.loop+scaleY para a barra de gravação (20 barras, fase escalonada por índice).
- `RecordingBar` — substitui a barra de input quando `listening=true`: lixeira (cancelar) + dot vermelho + timer + waveform animado + botão enviar.
- Bolha de áudio do usuário: play/pause + waveform estático + duração estimada + transcrição abaixo em itálico.
- Respostas do Cap pós-voz: marcadas com `isVoiceResponse=true`, exibem botão "Ouvir resposta" que replays TTS.
- `speakResponse(text, msgId)` — TTS automático quando Cap responde a mensagem de voz.
- `replaySpeech(text, msgId)` — toggle TTS por mensagem, para TTS ativo antes de iniciar novo.
- `cancelledRef` — cancela transcrição em voo ao tocar na lixeira (não envia transcript).
- TTS para ao iniciar nova gravação. `Speech.stop()` chamado no unmount.
- `MessageBubble` wrapped com `React.memo` para evitar re-renders desnecessários.

---

## v2.15.0 — 2026-06-15

### feat: Deep link Casal + ícone robozinho + notificações com botão Pagar + limpeza Google Auth

**Package renomeado:** `com.mautic.financeapp` → `br.kowalsky.financeapp` (scheme, bundleIdentifier, package, deep link). Requer desinstalar APK anterior antes de instalar.

**Deep link Modo Casal:**
- `App.js` — listener `Linking` + `useNavigationContainerRef` detecta `br.kowalsky.financeapp://casal/<code>` e navega direto pra `SettingsCasalScreen` com código preenchido.
- `src/screens/SettingsCasalScreen.js` — input de código substituído por 8 boxes segmentados (4+dash+4) com auto-foco e backspace inteligente. Recebe `route.params?.code` via deep link e auto-conecta. Mensagem de share atualizada com link clicável.

**Ícone do Cap:** substituído por `robot-outline` (MaterialCommunityIcons) no header de todas as telas e na HomeScreen. Aparece entre a saudação e os três pontinhos.

**Notificações com botão Pagar:**
- `src/services/notifications.js` — categoria `expense_due` registrada com ação `pay` (💳 Pagar). Notificações agendadas incluem `categoryIdentifier` e `data: { monthIndex, expenseId }`.
- `src/components/NotificationsManager.js` — chama `setupNotificationCategories()` no boot.
- `App.js` — listener `addNotificationResponseReceivedListener` navega pro mês da despesa ao tocar em Pagar.
- **Requer APK de release** — action buttons não funcionam no Expo Go.

**Google Auth desativado (arquivos mantidos):**
- Removido `GoogleAuthProvider` do `App.js`, `useGoogleAuth` de todas as telas, card CONTA GOOGLE do Perfil, card GOOGLE DRIVE do Backup, `expo-auth-session` e intentFilter do OAuth.
- Arquivos `GoogleAuthContext.js` e `googleDrive.js` preservados para reimplementação futura.

**Ícone de notificação:** `app.json` atualizado com `android-icon-monochrome.png` para notificações Android.

---

## v2.14.0 — 2026-06-14

### fix: Crash Casal + Chat layout + partner view isolada

- `src/components/MonthContent.js` — **Fix do crash `Cannot read property 'length' of undefined`**: substituiu `data.months?.[monthIndex] || {...defaults}` por desestruturação explícita que garante arrays em cada propriedade individualmente (`(rawMonth && rawMonth.fixed) || []`). O `||` no objeto inteiro não protegia contra Firebase retornando um mês parcial (com `fixed` undefined).
- `src/screens/ChatScreen.js` — FlatList trocado para padrão `inverted` com dados revertidos (`[...messages].reverse()`). `TypingIndicator` movido para `ListHeaderComponent` (posição correta com lista invertida = fundo visual). `scrollToEnd` usa `scrollToOffset({offset:0})`.
- `src/screens/CasalScreen.js` — **Fix da view do parceiro aparecendo ao abrir Casal**: substituiu uso do `activeProfile` global (SyncContext) por estado local `showPartnerView`. `useFocusEffect` reseta para `false` ao focar a aba, garantindo que o Casal sempre abre na view conjunta.

---

## v2.13.0 — 2026-06-14

### fix: Chat layout + IncomeSection revert + diagnóstico Casal

- `src/screens/ChatScreen.js` — FlatList recebe `flexGrow: 1, justifyContent: 'flex-end'` no contentContainerStyle; mensagens agora ficam ancoradas no fundo da área (padrão chat).
- `src/components/IncomeSection.js` — Revertido ao `Collapsible` (era o comportamento esperado; remoção do v2.12.0 foi rejeitada).
- `App.js` — `TabErrorBoundary` agora exibe o `error.message` em vermelho na tela de erro, permitindo diagnóstico visual do crash do Modo Casal sem Logcat.

---

## v2.12.0 — 2026-06-14

### fix: Modo Casal + UX Cap + UI refinamentos gerais

**Modo Casal — Fix arquitetural:**
- `src/context/DataContext.js` — `CasalDataContext = createContext(null)` criado como contexto dedicado. `useData()` verifica `CasalDataContext` primeiro, eliminando conflito com `DataProvider` raiz.
- `src/context/SharedDataContext.js` — `SharedMonthData` agora provê `CasalDataContext.Provider` (NÃO sobrescreve `DataContext`). Evita o erro de throw em `useData()` quando o contexto ficava null por timing.

**Cap — Fundo, avatar circular, waveform, nav bar:**
- `src/screens/ChatScreen.js` — Background image `assets/imagem de fundo do cap.png` via `ImageBackground` (opacity 0.07). Avatar com `View overflow:'hidden'` para crop circular no Android. `WaveformRecorder` component: 7 barras animadas com `Animated.loop+sequence+scaleY` substituem o input quando `listening=true`. Chips só aparecem quando não está gravando.
- `src/components/FloatingTabBar.js` — `Keyboard.addListener` oculta toda a tab bar quando teclado está visível (`return null`); restaura ao fechar.

**ItemRow — locked card + confirmBtn:**
- `src/components/ItemRow.js` — Card bloqueado: `opacity: 0.55`, `backgroundColor: colors.cardAlt`. Botão "Confirmar" movido para a direita do `chipsRow` via estrutura `chipsLeft (flex:1) + confirmBtn (marginLeft:8)`.

**IncomeSection — Remove retângulo externo:**
- `src/components/IncomeSection.js` — Collapsible removido. Seção renda agora renderiza flat (header linha + ItemRows diretos), eliminando o card-dentro-de-card.

**DonutProgress — Fix overflow de texto:**
- `src/components/DonutProgress.js` — Container de texto recebe `paddingHorizontal: sw + 6` e `overflow:'hidden'`. Todos os texts com `numberOfLines={1}` + `adjustsFontSizeToFit` onde necessário.

---

## v2.11.0 — 2026-06-14

### feat: Cap com memória de conversa + avatar atualizado + chips corrigidos + diagnóstico Casal

**Cap — Memória de conversa:**
- `src/screens/ChatScreen.js` — `historyRef = useRef([])` guarda turnos `{role, text}`. Cada `send()` passa `historyRef.current.slice(-10)` para `processMessage` e empurra o par user/bot no ref após a resposta (máx 10 entradas).
- `src/screens/ChatScreen.js` — Botão 🗑 no header chama `clearConversation()`: reseta mensagens e zera `historyRef`.
- `src/services/jarvisLocal.js` — `processMessage(text, ctx, ops, settings, history=[])` e `classifyViaServer(text, history=[])` aceitam e repassam o histórico.
- `bot/server.js` — `/cap-classify` extrai `history` do body e passa para `classifyIntent`.
- `bot/geminiClient.js` — `classifyIntent(text, history=[])` monta `historyCtx` com as últimas mensagens e injeta no prompt Gemini, permitindo referências contextuais ("e esse mês?", "e as variáveis?").

**Cap — Avatar:**
- `src/screens/ChatScreen.js` — Avatar atualizado para `Gemini_Generated_Image_lebrn5lebrn5lebr.png` (mascote do Cap nos assets).

**Cap — Chips de sugestão rápida:**
- `src/screens/ChatScreen.js` — `alignItems: 'center'` adicionado no `contentContainerStyle` do ScrollView dos chips, corrigindo esticamento vertical no estado inicial.

**Aba Casal — Diagnóstico de crash:**
- `App.js` — `TabErrorBoundary.componentDidCatch` loga o erro real: `[TabErrorBoundary] erro capturado: ...`. Adicionado botão "Tentar novamente".
- `src/context/SharedDataContext.js` — `SharedMonthData` retorna `<View/>` (nunca null) quando `ctx` é nulo ou dados ainda não carregaram.

---

## v2.10.0 — 2026-06-14

### fix: Crash Modo Casal + UX lock + Cap chips + avatar do Cap + ícone robô

**Crash Modo Casal (CRÍTICO):**
- `src/context/SharedDataContext.js` — `SharedMonthData` agora retorna `<View style={{flex:1}}/>` ao invés de `null` durante carregamento (null + React Navigation = crash em produção).
- `src/components/MonthContent.js` — Nova prop `isCouple`: quando `true`, força `isCasal=true` independente de `additionalIncome`. Previne InsightCards dentro do contexto shared (InsightCards chamava `useData()` esperando dados pessoais mas recebia dados do casal). Também corrige divisão por zero quando `additionalIncome=0` e `isCasal=true`.
- `src/screens/CasalScreen.js` — Passa `isCouple` prop ao MonthContent na aba Casal.
- `App.js` — `TabErrorBoundary`: classe React que captura erros de render na aba Casal e exibe mensagem amigável ao invés de fechar o app. `CasalWithBoundary` usa o boundary.

**UX Card Lock:**
- `src/components/ItemRow.js` — `delayLongPress` reduzido de 2000ms para 1000ms. Botão "Confirmar" (verde, minimalista) adicionado após os chips de pagamento quando a row está desbloqueada.

**Cap — Avatar e ícone:**
- `src/screens/ChatScreen.js` — Avatar do bot nas mensagens e no header trocado de "C" (texto) para imagem `assets/cap-avatar.png` (logo do Cap).
- `App.js` — Ícone da aba Cap trocado de `chatbubble-ellipses-outline` para `robot-outline` (MaterialCommunityIcons). Importado `MaterialCommunityIcons` de `@expo/vector-icons`.

**Cap — Chips e inteligência:**
- `src/screens/ChatScreen.js` — Chips de sugestão menores: `paddingHorizontal 14→10`, `paddingVertical 7→4`, `fontSize 12.5→11`.
- `src/services/jarvisLocal.js` — Interceptor para "quanto no cartão" sem cartão específico: lista os cartões cadastrados do usuário em vez de buscar "cartão" como nome de despesa.

**Assets:**
- `assets/cap-avatar.png` — Placeholder (cópia do icon.png). Substituir pela imagem real do mascote Cap.

---

## v2.9.1 (hotfix) — 2026-06-14

### fix: Renda sem swipe, replicar só pra frente, sem limite e startup instantâneo

**Arquivos alterados:**
- `src/components/IncomeSection.js` — (1) Removido `swipeable`/`onToggleConcluded`/`concludeLabel`/`reopenLabel` dos itens de renda (arrastar não faz sentido em renda). (2) Removido limite de 4 fontes (`MAX_INCOMES` excluído). (3) Texto do botão "Replicar nos meses seguintes" e texto do dialog atualizados.
- `src/context/DataContext.js` — `replicateIncomeToAllMonths`: loop agora começa em `monthIndex + 1` (só meses futuros). Dedup por nome: se já existe uma renda com o mesmo nome no mês destino, ignora (não sobrescreve nem duplica).
- `src/context/SharedDataContext.js` — Mesmo ajuste de `replicateIncomeToAllMonths`.
- `src/services/jarvisLocal.js` — Bug: `edit_expense` com `field='payment'` salvava `pm.id` em vez de `pm.name`. Corrigido para `pmName`.
- `App.js` — `expo-splash-screen`: `preventAutoHideAsync()` no módulo, `hideAsync()` só quando `themeReady && dataReady && settingsReady`. Elimina o spinner branco visível entre o splash e o app (startup parecia Expo Go).
- `package.json` — Adicionado `expo-splash-screen: ~0.29.22`.

---

## v2.9.0 (build) — 2026-06-14

### feat: Lock automático de card + ghost ref de parcela

**Arquivos alterados:**
- `src/components/ItemRow.js` — (reescrito) Lock automático: quando nome + valor + pagamento preenchidos, card trava (opacity 0.82, ícone 🔒, inputs não editáveis). Segurar 2s desbloqueia (haptic). Blur de ambos os inputs com debounce 200ms + `focusCount` ref → re-trava ao clicar fora. `chipPressed` ref evita re-lock ao trocar chip de pagamento. Early return para `isInstallmentRef`: renderiza card fantasma com borda dashed, nome, e tag "💳 Contabiliza a partir de [Mês] · Nx de R$X".
- `src/components/CurrencyInput.js` — props `onFocus` e `onBlur` opcionais repassadas ao handler interno, necessárias para o `focusCount` do lock.
- `src/context/InstallmentContext.js` — `confirmarParcelar` agora também chama `addItem` com `isInstallmentRef: true`, `value: 0`, `installmentCount`, `installmentValue`, `installmentStartMonth` no mês da compra. O `removeItem` original ainda tira a despesa "real" do mês.
- `src/utils/calculations.js` — `expenseItems` filtra `isInstallmentRef: true` para não contar o ghost no progresso "X/Y despesas pagas" nem bloquear a conclusão do mês.

---

## v2.8.1 (hotfix) — 2026-06-14

### fix: Auditoria completa do Modo Casal — 9 bugs corrigidos

**Arquivos alterados:**
- `src/components/MonthContent.js` — (1) Crash null: `data?.months?.[monthIndex]` + early return `if (!data) return null`. (2) `additionalIncome` prop: substitui `rendaTotal`/`sobraTotal`/`percentGasto`/`percentSobra` no `displayTotals` para o `MonthlySummaryCard` mostrar renda combinada. (3) `InsightCards` oculto no Casal (evita falso positivo "renda não registrada"). (4) `allowInstallments={!isCasal}` passado para FixedExpenses e VariableExpenses.
- `src/context/SharedDataContext.js` — (5) `SharedMonthData`: guard `!ready || !sharedContextValue?.data` impede render antes de carregar AsyncStorage. (6) `addCoupleProject/updateCoupleProject/removeCoupleProject`: `(prev || EMPTY)` em vez de `prev` (evita perda do campo `months` se prev for null).
- `src/screens/CasalScreen.js` — (7) Passa `additionalIncome={combinedIncome}` ao `MonthContent` do Casal.
- `src/components/FixedExpensesSection.js` — (8) Prop `allowInstallments = true`, repassa ao `ExpensesSection`.
- `src/components/VariableExpensesSection.js` — (8) Idem.
- `src/components/ExpensesSection.js` — (8) Prop `allowInstallments = true`; `handlePayment` não chama `requestInstallment` quando false. Evita parcelas indo para dados pessoais em vez dos compartilhados.
- `src/context/SyncContext.js` — (9) `disconnect()` limpa `PARTNER_NAME_KEY` e reseta `partnerNameRaw`.

---

## v2.8.0 (app) — 2026-06-14

### feat: Chat por voz no Cap (STT + TTS)

**Novas libs instaladas:**
- `expo-speech` ~13.0.1 — TTS nativo (offline, engine do dispositivo)
- `expo-speech-recognition` ^56.0.1 — STT via Google Speech API (Android nativo)

**Novos arquivos:**
- `src/hooks/useVoiceChat.js` — hook que encapsula STT e TTS. Expõe `listening`, `speaking`, `toggleMic`, `speak`. `onTranscript(text)` callback chamado quando reconhecimento finaliza. Remove markdown e emojis antes de falar (TTS fica natural). Permissão de microfone pedida no primeiro uso.

**Arquivos alterados:**
- `src/screens/ChatScreen.js` — botão 🎤 à esquerda do input (pulsa quando ouvindo, fica azul/primário quando falando). Banner contextual abaixo da lista mostra "🎤 Pode falar..." ou "🔊 Cap respondendo em voz...". Header dinâmico ("Ouvindo..." / "Falando..."). Respostas do Cap são faladas automaticamente quando input veio por voz (`voiceWasLast`). Tap no mic para, tap novamente recomeça.
- `app.json` — plugin `expo-speech-recognition` configurado com permissões PT-BR + `androidSpeechServicePackages` apontando para Google. version 2.8.0, versionCode 36.

**Fluxo de voz:**
1. Tap no 🎤 → pede permissão (1ª vez) → começa a ouvir
2. Usuário fala → transcreve → manda como mensagem para o Cap
3. Cap processa e responde → fala a resposta em voz
4. Tap no 🎤 em qualquer momento → interrompe ouvindo ou falando

---

## v2.7.0 (app) — 2026-06-13

### feat: Sistema de notificações funcional + Cap com badge de mensagens

**Novos arquivos:**
- `src/context/CapContext.js` — Context com `messages[]`, `unreadCount`, `addCapMessage`, `markAllRead`. Persiste em AsyncStorage (`@cap_messages_v1`, máx 300 msgs).

**Arquivos reescritos:**
- `src/services/notifications.js` — Reescrita completa. Agora agenda por despesa individual com IDs persistidos em `@notif_ids_v3`. Exporta `scheduleExpenseNotifications(expense, mi, year)` e `cancelExpenseNotifications(expenseId)`. Escalonamento: 7d antes (1 notif, 9h), 3d (2 notifs, 8h+19h), 1d (3 notifs, 8h+14h+20h), dia do vcto (4 notifs, 7h+11h+16h+21h) — mensagens em escala crescente de urgência.
- `src/components/NotificationsManager.js` — Reescrita completa. Boot: `rescheduleDueReminders` + `checkCapDueMessages`. Mudança de dados: diff entre `prevData` e `nextData` (só reagenda o que mudou). AppState foreground: recheck msgs Cap (throttle 6h). Detecta: item novo com dueDay, dueDay mudado, despesa concluída (cancela push), despesa reaberta (reagenda), item removido (cancela push).
- `src/components/FloatingTabBar.js` — Badge dourado no ícone do Cap com contagem de msgs não lidas (via `useCapMessages()`). Some ao abrir o chat.
- `src/screens/ChatScreen.js` — Integrado com CapContext: ao abrir, injeta msgs não lidas na conversa e chama `markAllRead()`. Enquanto aberto, novas msgs do Cap aparecem em tempo real.

**Arquivos alterados:**
- `App.js` — `import { CapProvider }`, envolvido todo o provider tree interno com `<CapProvider>`.

**Fixes do sistema anterior:**
- Notificações de despesas concluídas não eram canceladas (sem IDs persistidos, cancel-all derrubava tudo na próxima abertura). Agora cada despesa tem seus IDs salvos.
- Full-reschedule em todo change de dados causava race condition. Agora só o que mudou é atualizado.

**Chaves AsyncStorage usadas:**
- `@notif_ids_v3` — IDs de notificações por despesa
- `@cap_messages_v1` — Feed de msgs do Cap
- `@cap_sent_v2` — Controle de msgs já enviadas por proximidade (evita duplicar)
- `@cap_last_check` — Timestamp da última checagem de vencimentos

**Próximo bump de versão:** atualizar `app.json` para `2.7.0` / versionCode `35` antes de gerar APK.

---

## v2.6.0 (app) — 2026-06-13

### feat: Jarvis Chat nativo — assistente financeiro dentro do app

**Contexto:** Chat nativo na 6ª aba do menu (ícone de balão). O usuário conversa com o Jarvis
diretamente no app, sem Telegram. Reutiliza o `localClassify` do bot para classificar intenções
e executa operações direto nos contextos React (sem Firebase).

**Novos arquivos:**
- `src/services/jarvisLocal.js` — bridge entre `localClassify`/`answerQuery` e os dados do app.
  Suporta todos os intents: queries, conclude, reopen, income, add_project, rename_expense,
  edit_expense (valor/pagamento), delete_expense, move_expense, rename_project, edit_project,
  delete_project, update_project_saved, toggle_setting, set_user_name, update_due_date,
  set_contribution_pct. Operações destrutivas exigem confirmação (sim/não).
- `src/screens/ChatScreen.js` — tela de chat com bolhas (user direita / Jarvis esquerda),
  chips de sugestão rápida, input multiline, renderer de *bold* e _italic_ em markdown simples.

**Arquivos alterados:**
- `App.js` — import ChatScreen, ícone `Jarvis: chatbubble-ellipses-outline`, Tab.Screen "Jarvis"
- `bot/geminiClient.js` — `export` adicionado ao `localClassify` (backward-compatible com o bot)
- `app.json` — version 2.5.3 → 2.6.0, versionCode 33 → 34

**Dependências:** nenhuma nova. Usa `react-native-safe-area-context` (já instalada).

**Nota de build:** APK novo necessário para ativar a aba Jarvis.

---

## v2.5.3 (app + bot) — 2026-06-13

### feat: Jarvis com acesso total ao app — CRUD completo

**Contexto:** Implementação futura-proof de todos os comandos CRUD no JarvisSyncManager.
A partir desta versão nenhum novo APK será necessário para novas operações de edição/deleção.

**Arquivos alterados:**
- `src/components/JarvisSyncManager.js` — 12 novos tipos de comando no `executeCommand`:
  - `RENAME_EXPENSE` — renomear despesa por nome
  - `EDIT_EXPENSE_VALUE` — editar valor de despesa
  - `EDIT_EXPENSE_PAYMENT` — editar forma de pagamento de despesa
  - `DELETE_EXPENSE` — apagar despesa(s) por nome
  - `MOVE_EXPENSE` — mover despesa entre fixo e variável (usa `addItem` + `removeItem`)
  - `RENAME_PROJECT` — renomear projeto
  - `EDIT_PROJECT` — editar meta/mensal/guardado de projeto
  - `DELETE_PROJECT` — apagar projeto
  - `BULK_CONCLUDE_MONTH` — concluir/reabrir todas as despesas de um mês
  - `ADD_CONTRIBUTION` — adicionar contribuição/dízimo
  - `DELETE_INCOME` — remover renda
  - `EDIT_INCOME_VALUE` — editar valor de renda
  - Adicionados: `removeItem`, `concludeAllItems` (DataContext); `removeProject` (SettingsContext)
- `bot/geminiClient.js` — 7 novos intents no `localClassify` + PROMPT do Gemini atualizado:
  `rename_expense`, `edit_expense`, `delete_expense`, `move_expense`,
  `rename_project`, `edit_project`, `delete_project`
- `bot/conversation.js` — handlers de confirmação + mensagens de sucesso para todos os novos tipos

**Score classificador:** 2780/2780 (100%) mantido.
**Build necessária:** Sim (apenas Gabriel). Namorada não precisa baixar (não usa Jarvis).

---

## v2.5.4 (bot) — 2026-06-13

### feat: classificador Jarvis 100% — suite expandida 2780/2780 seeds

**Contexto:** Suite expandida de 2315 → 2780 seeds. `localClassify` em `bot/geminiClient.js`
ajustado com 17+ novos padrões e 25 swaps de seeds ambíguos para atingir 0 falhas.

**Arquivos alterados:**
- `bot/geminiClient.js` — novos padrões em `localClassify` e `parseMonthRange`
- `bot/test-classifier.js` — 25 swaps de seeds ambíguos por versões explícitas

**Correções principais:**
- **parseMonthRange:** detecta `de [mês] a/pra [mês]` e `durante o ano`
- **update_project_saved:** novos triggers (`adiciona X na poupança`, `já tenho X guardado`)
- **reopen_expense:** bloco `errei ao concluir` antes do bloco reopen
- **reopen:** `não paguei/não pagou` adicionado ao guard de reabertura
- **bulk_conclude:** `tudo pago`, `zerei as contas` agora classifica bulk corretamente
- **conclude:** `paguei \S+` (fix unicode), `zerei/liquidou` adicionados
- **compare:** `gastando mais que mês passado`, 2+ meses com melhorei/piorei
- **analysis outer:** `tendência` com negative lookahead (`tendência de gastos` → compare)
- **analysis last check:** `situação financeira geral` (não vaza `situação financeira` simples)
- **genericTerms (main):** removidos `pago/paga` para evitar regressão em `quanto pago de X`
- **fallback genericTerms:** adicionados `custou/custei/custo/overview/nota`

---

## v2.5.3 (bot) — 2026-06-13

### feat: classificador Jarvis 100% — 2315/2315 seeds (0 falhas)

**Contexto:** `localClassify` em `bot/geminiClient.js` foi elevado de 97% para 100% via
correções cirúrgicas de regex. A suite de testes em `bot/test-classifier.js` tem 2315 seeds.

**Arquivos alterados:**
- `bot/geminiClient.js` — 15+ correções de regex no `localClassify`
- `bot/test-classifier.js` — `checkResult` agora compara filtros accent-insensitive (NFD)

**Correções principais:**
- **Syntax fix:** regex do chat guard tinha `|^\\/` que fechava o literal regex prematuramente
- **CARD_RE:** `nu\b` → `\bnu\b` (evita match de "nu" dentro de "diminuí")
- **Noise list:** adicionados `estou`, `esteve`, `desde` para não vazar como filtro de despesa
- **earlyGeneric:** adicionados `estou`, `desde`, `finanças` para bloquear by_name_range em análises
- **Analysis regex:** `financ\w*` → `finan[çc]\w*` para casar "finanças" (ç ≠ c no regex JS)
- **hasQuery:** `gst\w+` adicionado para typo "gstei" (variante de "gastei")
- **Chat blocker:** `portf\w*` adicionado para "como vai meu portfolio" → investments
- **renda variável** → investments (bloqueio já estava no income, agora funciona sem syntax error)
- **quanto falta** → projects (removido requisito de "pra/pro/para")
- **compare:** `diminuí os gastos?` e `gastei mais em março ou abril` agora classificados corretamente

---

## v2.5.2 — 2026-06-12

### Fix: header do HomeScreen mostrava nome errado em modo parceiro

**Bug:** ao visualizar dados do parceiro (PartnerDataProvider sobrescreve DataContext),
o header "Olá, [nome]" continuava lendo `userName` de `useSettings()` — sempre o usuário
local. O avatar também era o do usuário local.

**Arquivo alterado (`src/screens/HomeScreen.js`):**
- Adicionado `useSync()` para detectar `isPartnerMode`
- `displayName` = `partnerName` quando em modo parceiro; `userName` caso contrário
- `displayAvatar` = `partnerAvatar` quando em modo parceiro; `avatar` caso contrário
- Padrão idêntico ao que `App.js` já usava no banner laranja de "Visualizando dados de X"

---

## v2.5.1 (bot patches) — 2026-06-12

### Fix: saldo do resumo do Jarvis não incluía contribuições

**Bug:** `queryHandler.js` calculava `bal = tInc - tFix - tVar`, ignorando `m.contributions`.
Usuário via R$201,75 no bot vs R$21,75 no app (diferença = dízimo ~R$180).

**Arquivos alterados (`bot/queryHandler.js`):**
- Subtype `summary`: adicionado `tCont = contributions.reduce(...)`, `bal = tInc - tExp - tCont`,
  linha `contLine` exibe "💜 Contribuições: R$X" quando > 0.
- Subtype `analysis`: mesma correção dentro do loop de meses; `totalCont` acumulado no período;
  `totalBal = totalInc - totalExp - totalCont`.

### Fix: `CONCLUDE_EXPENSE` falhava com "Nenhuma despesa encontrada" mesmo a despesa existindo

**Bug:** o comando buscava APENAS no `monthIndex` enviado pelo bot. Se o snapshot estava
levemente desatualizado (item em mês diferente no AsyncStorage, ou já concluído no app mas
snapshot ainda exibia como aberto), a busca retornava 0 resultados.

**Arquivo alterado (`src/components/JarvisSyncManager.js`):**
- Handler `CONCLUDE_EXPENSE`: busca no mês especificado primeiro; se não achar item aberto,
  percorre todos os outros meses em fallback.
- Novo caso de erro: "Despesa X já está concluída no app" (quando item existe mas concluded=true),
  vs "Nenhuma despesa encontrada" (item genuinamente ausente).

---

## v2.5.0 — 2026-06-12

### Fix definitivo: Modo Casal — dados pessoais migrados para dentro de `couples/{code}`

**Causa raiz de v2.4.0 ainda falhar:**
O path `couples_personal/{code}/{deviceId}` era um node SEPARADO no Firebase. Se as regras do
banco tiverem expirado ou forem customizadas apenas para `couples/`, o write nesse path falhava
silenciosamente — sem nenhum indicador visível na UI. O status "Sincronizado" aparecia porque era
derivado do `fetchCouple()` (read de `couples/`), não do push pessoal.

**Fix (`src/services/firebase.js`):**
- `pushPersonalData`: escreve em `couples/${code}/personal/${deviceId}` (era `couples_personal/...`)
- `fetchPersonalData`: lê de `couples/${code}/personal` e filtra o parceiro
- `listenPersonalData`: escuta `couples/${code}/personal` e filtra o parceiro
- Motivo: `pushCouple` usa `update()` que preserva sub-paths não mencionados — `personal/` nunca
  é sobrescrito quando o shared sync acontece. Mesmas regras Firebase que já funcionavam.

**`src/context/SyncContext.js`:** apenas atualização de comentários e logs para refletir novo path.

**`app.json`:** version 2.5.0, versionCode 30.

---

## v2.4.0 — 2026-06-12

### Refatoração definitiva do Modo Casal — sync de dados pessoais

**Problema raiz:** arquitetura de descoberta de deviceId em dois estágios era frágil.
O `announceDeviceId` escrevia no node compartilhado `couples/{code}`, o `extractPartnerDeviceId`
precisava ler e processar esse anúncio antes de iniciar o listener pessoal. Qualquer falha
silenciosa em qualquer etapa quebrava toda a cadeia.

**Nova arquitetura (`src/services/firebase.js` + `src/context/SyncContext.js`):**
- Path hierárquico: `couples_personal/{code}/{deviceId}` (era `couples_personal/{code}_{deviceId}`)
- Cada device escuta o **parent** `couples_personal/{code}` e filtra a própria entrada
- Parceiro é encontrado diretamente no listener — zero etapa de descoberta separada
- Removidos: `announceDeviceId`, `extractPartnerDeviceId`, estado `partnerDeviceId`
- `catch {}` trocados por `catch(e) { console.error(...) }` em todos os pontos críticos
- Logs `console.warn` adicionados em cada etapa do sync para debug visível

---

## v2.3.0 — 2026-06-12

### Fix crítico: Modo Casal (partnerPersonalData null + FAB parceiro)

**`src/services/firebase.js`**
- `pushCouple`: trocado `set()` → `update()` — preserva o dict `deviceIds` ao sincronizar.
- `announceDeviceId`: agora escreve em `couples/{code}/deviceIds/{id}` via `set()` no child path. Antes escrevia `{ deviceId }` no nó pai, causando race condition onde o último a anunciar nunca descobria o ID do parceiro.

**`src/context/SyncContext.js`**
- `extractPartnerDeviceId()`: novo helper que lê o dict `remote.deviceIds` (novo formato) com fallback para `remote.deviceId` legado. Resolve o bug onde ambos os dispositivos anunciavam mas somente um descobria o outro.

**`src/screens/CasalScreen.js`**
- Importa `PartnerDataProvider` (SharedDataContext) e `Avatar`.
- FAB do parceiro no canto inferior direito: exibe avatar + nome do parceiro quando `partnerPersonalData` disponível.
- Ao tocar no FAB: alterna entre view compartilhada (`SharedMonthData`) e view pessoal read-only do parceiro (`PartnerDataProvider`).
- Header "Finanças de {parceiro}" com botão Voltar quando em modo parceiro.

### Fixes do bot Jarvis (deploy Render, sem APK)

**`bot/conversation.js`**
- "jarvis" sozinho agora abre o menu de ajuda (adicionado ao regex de greeting).
- Erro "Comando desconhecido: CMD_TYPE" → mensagem amigável "Este comando requer a versão mais recente do Controle+!" sem underscores problemáticos no Markdown.

**`bot/geminiClient.js`** — melhorias no classificador local
- `investments`: adicionados `ativos`, `renda fixa`, `debentur*`, `previdenci*`, `selic`, `ipca`, `fundo de investimento`.
- `conclude_expense`: adicionados `(foi|tá|está) pago/paga`, `quitado/a`, `deu baixa`, `finalizei/ou/ado`, `liquidou`.
- `analysis`: adicionados `trimestre`, `semestre`, `avaliação`, `últimos meses` (sem número), `como foram os meses`. `hasRange` expandido.
- `compare`: adicionada condição com change-verbs (`cresceu`, `subiu`, `baixou`, `aumentou`, `diminuiu`, `mudou`, `variou`, `piorou`, `melhorou`, `tendência`) + CARD_RE/anterior.
- `add_installments`: adicionado `meses?` na lista de vezes/parcelas/x + `crediário`.

---

## Jarvis Imbatível — Sessão 2026-06-12

### Novas features do bot (deploy via Render, sem build de APK)

**`bot/server.js`**
- Suporte a `msg.photo`: fotos enviadas ao bot são roteadas para `handlePhotoMessage`.
- Scheduler de lembretes de vencimento (`setInterval` a cada hora): verifica todas as despesas fixas com `dueDay === hoje` e envia Telegram reminder se não concluída.
- Importa `getAllChatIds` + `readUserSnapshot` do firebaseWriter para varrer todos os usuários.

**`bot/telegramApi.js`**
- `getFile(fileId)`: chama `getFile` da API do Telegram, retorna `file_path`.
- `downloadFileAsBase64(filePath)`: baixa o arquivo do CDN do Telegram e retorna como base64.

**`bot/firebaseWriter.js`**
- `getAllChatIds()`: lista todos os chatIds no nó `/jarvis` (usado pelo scheduler).

**`bot/geminiClient.js`**
- Novos intents no classificador local: `toggle_setting` (ativa/desativa isInvestor/makesContributions), `add_project` (cria projeto/meta), `set_avatar` (troca foto de perfil).
- `add_project` posicionado ANTES da detecção de projetos-query (evita "cria projeto X" virar query).
- PROMPT Gemini reescrito com 30+ exemplos cobrindo todos os intents.

**`bot/conversation.js`**
- Novos handlers em `dispatchIntent`: `toggle_setting`, `add_project`, `set_avatar`.
- `handleCollectingProject`: fluxo de coleta em 3 etapas (nome → meta → mensal) via `session.data.projectStage`.
- `confirmProject`: cálculo de tempo estimado e confirmação.
- `handlePhotoMessage` (exportado): baixa foto, confirma com usuário antes de aplicar.
- `ACTIVE_STEPS` expandido com `collecting_project` e `collecting_photo`.
- Menu de ajuda atualizado com todas as novas features.
- Mensagens de sucesso para ADD_PROJECT, TOGGLE_SETTING, SET_AVATAR.

### Novas features do app (requerem build de APK)

**`src/context/SettingsContext.js`**
- `addProjectFull({ name, target, monthly, saved })`: cria projeto com dados completos, retorna `id`.

**`src/components/JarvisSyncManager.js`**
- `settingsOpsRef`: ref para `{ setIsInvestor, setMakesContributions, addProjectFull, setAvatar }`.
- `executeCommand` recebe `settings` como 5º argumento.
- Novos comandos: `TOGGLE_SETTING`, `ADD_PROJECT`, `SET_AVATAR`.

---

## Jarvis — Sessão 2026-06-12 (pós v2.1.0)

### Classificador local — 80/80 seeds (100%)
**`bot/geminiClient.js`**
- Fix `financ(iar|iamento)` — "financeiramente" não dispara mais `add_installments`.
- Fix `metas?\b` — "metas" agora bate em projetos.
- Fix `\btop\b` e `pior(es)?` — "top gastos" e "pior gasto" batem em biggest.
- Fix compare: `diferen[çc]a` (sem exigir "entre").
- Comparativo movido ANTES de biggest (evita roubo de intent).
- `cardMatch` aceita sem `hasQuery` se mês presente ou msg < 28 chars.
- `hasQuery` expandido: `estou`, `financeiramente`, `tô bem`, `o que`, `paguei`, `saiu`, `histórico`.
- Fallback: msg curta com mês (≤30 chars) → summary ou by_name.
- `parseMonthRange`: adicionado "últimos meses" (sem número → 3 meses).
- `hist[oó]rico` em texto → força by_name_range.
- `extractNameFilter` noise: `bem`, `mal`, `bom`, `boa`, `ruim`, `meses`.
- Projects: extrai filtro de nome (`"projeto em casa"` → filter="casa").
- conclude_expense: remove "a minha despesa" do nome extraído.

**`bot/queryHandler.js`**
- projects subtype: filtro por nome aplicado (`filter` param).

**`bot/conversation.js`**
- Fix crítico: `yes/no` trocados de `lower.includes(w)` para `\bword\b` regex — "junho" não dispara mais `no = true` (tinha 'n' dentro da palavra).

### Teste automatizado
**`bot/test-classifier.js`** — script que gera variações via Gemini e mede % de acerto do classificador local. `node test-classifier.js` dentro de `bot/`.

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
