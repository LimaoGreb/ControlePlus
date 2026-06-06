# Finanças — Controle Financeiro Pessoal (Android nativo)

App Android **nativo e standalone** de controle financeiro mensal, feito com
**React Native + Expo (bare workflow)**. O resultado é um arquivo **`.apk`** que
você instala direto no celular e roda sozinho — **sem Expo Go**, sem depender de
nenhum outro app.

Todo o app está em **português brasileiro**, com **tema escuro como padrão**,
valores no formato **R$ 1.500,00** e dados salvos localmente no aparelho
(**AsyncStorage**), com **salvamento automático** a cada alteração.

---

## Funcionalidades

Organização por **12 meses** (Janeiro a Dezembro de 2026). Cada mês tem:

1. **Renda (Entradas)** — até 4 fontes com nome editável (Salário, Freelance, Bico…). Renda Total automática.
2. **Despesas Fixas** — lista dinâmica (adicionar/remover). Total automático. Botão **"Copiar fixas do mês anterior"**.
3. **Despesas Variáveis** — lista dinâmica. Total automático.
4. **Resumo do Mês** — Renda Total, Despesa Total, % Gasto, % Sobra e Sobra Total (vermelho quando negativa).

Outras telas e recursos:

- **Mês Atual** — abre direto no mês corrente, com cards de resumo, barra de progresso e gráfico de pizza (Fixas x Variáveis).
- **Todos os Meses** — lista dos 12 meses com indicador (✓) de quais já têm dados.
- **Resumo Anual** — consolidação do ano + gráfico de barras (Renda x Despesa mês a mês) e gráfico de linha (evolução da Sobra).
- **Configurações** — alternar tema, **exportar/importar backup JSON** e informações do app.
- **Dados de demonstração** já vêm pré-carregados (Jan–Jul/2026 reais; Ago–Dez como template).

---

## Stack técnica

- React Native `0.76.9` + Expo SDK `52` (**bare workflow** via `expo prebuild`)
- React Navigation (bottom tabs + native stack)
- `@react-native-async-storage/async-storage` (persistência local)
- `react-native-chart-kit` + `react-native-svg` (gráficos)
- `expo-file-system`, `expo-sharing`, `expo-document-picker` (backup JSON)

---

## Estrutura de pastas

```
FinanceApp/
├── App.js                      # Navegação + providers
├── index.js                    # Entry point nativo (registerRootComponent)
├── app.json                    # Config Expo (nome, ícone, package Android)
├── eas.json                    # Perfis de build (opção de APK na nuvem)
├── src/
│   ├── screens/                # HomeScreen, MonthScreen, AllMonthsScreen,
│   │                           # AnnualSummaryScreen, SettingsScreen
│   ├── components/             # IncomeSection, FixedExpensesSection,
│   │                           # VariableExpensesSection, MonthlySummaryCard,
│   │                           # ProgressBar, Charts, + auxiliares
│   ├── services/               # storage.js (AsyncStorage), openFinance.js (futuro)
│   ├── utils/                  # currency.js, calculations.js
│   ├── context/                # DataContext.js (estado + autosave)
│   ├── data/                   # initialData.js (dados pré-preenchidos)
│   └── theme/                  # colors.js, ThemeContext.js
└── server/
    └── README.md               # Arquitetura do bot WhatsApp (futuro)
```

---

## 📦 Como gerar o APK

> **Pré-requisitos para build LOCAL:** Node 18+, **JDK 17**, **Android SDK**
> (via Android Studio) e a variável `ANDROID_HOME` configurada. Sem isso, use a
> **Opção B (nuvem)** mais abaixo — não precisa instalar nada do Android.

### Opção A — Build local (gera o `.apk` na sua máquina)

```bash
# 1. Instalar dependências
cd FinanceApp
npm install

# 2. Gerar o projeto nativo Android (bare workflow)
npx expo prebuild --platform android --clean

# 3. Compilar o APK release
#    Windows (PowerShell/CMD):
cd android
.\gradlew.bat assembleRelease

#    Linux/macOS:
cd android
./gradlew assembleRelease
```

**Onde o APK fica depois do build:**

```
FinanceApp/android/app/build/outputs/apk/release/app-release.apk
```

> Esse APK release usa uma chave de debug padrão gerada pelo Expo (suficiente
> para instalar no seu próprio celular). Para publicar na Play Store seria
> necessário gerar uma keystore própria e assinar o app.

### Opção B — Build na nuvem com EAS (não precisa de Android SDK local)

```bash
cd FinanceApp
npm install
npm install -g eas-cli
eas login                       # cria/usa uma conta Expo gratuita
eas build -p android --profile preview
```

Ao terminar, o EAS mostra um **link para baixar o `.apk`** pronto.

---

## 📲 Como instalar no celular

1. Copie o `app-release.apk` para o celular (cabo USB, Google Drive, Telegram, e-mail…).
2. No Android, vá em **Configurações → Apps → Acesso especial → Instalar apps desconhecidos** (ou **Configurações → Segurança → Fontes desconhecidas**) e **autorize** o app que vai abrir o APK (ex.: Arquivos/Chrome).
3. Toque no `app-release.apk` e confirme **Instalar**.
4. Abra o app **Finanças** — ele já vem com os dados de demonstração.

---

## 💾 Backup dos dados

- **Exportar:** Configurações → *Exportar dados (JSON)* → escolha onde salvar/compartilhar.
- **Importar:** Configurações → *Importar dados (JSON)* → selecione o arquivo (substitui os dados atuais).

---

## 🗺️ Roadmap / Funcionalidades Futuras

Os módulos abaixo **não** estão implementados — apenas documentados.

### 1. Integração Open Finance Brasil
Conectar a conta bancária para **importar transações automaticamente**, sem
digitação manual.

- Exige **registro como instituição participante** no Open Finance Brasil (ou
  parceria com uma instituição receptora já habilitada).
- Exige **certificados digitais ICP-Brasil (mTLS)** e processo de
  **homologação/conformidade junto ao Banco Central**.
- Fluxo: consentimento OAuth 2.0 / FAPI → token com mTLS → consumo das APIs de
  contas e transações → normalização → gravação no app.
- A parte sensível (certificados, tokens, chamadas às APIs do banco) deve rodar
  num **backend próprio**, nunca no dispositivo.
- Esqueleto e comentários em [`src/services/openFinance.js`](src/services/openFinance.js).

### 2. Bot WhatsApp
Servidor backend separado que recebe mensagens como *"gastei 200 na renner"* e
registra o lançamento automaticamente.

- Exige **hospedagem de servidor** (URL pública HTTPS) + **API do WhatsApp
  Business** (Cloud API oficial) **ou Baileys** (não-oficial).
- Parser de linguagem natural (regex → modelo de IA) para extrair valor,
  descrição e categoria.
- Precisa de um **banco de dados na nuvem** para o app e o bot compartilharem os
  dados (hoje o app é 100% local).
- Arquitetura detalhada em [`server/README.md`](server/README.md).
```
