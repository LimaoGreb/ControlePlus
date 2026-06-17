// Base de conhecimento de suporte do Cap.
// Responde "como usar o app" — 100% offline, sem API, com personalidade.

function norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ');
}

function any(t, ...words) { return words.some(w => t.includes(w)); }
function has(t, ...words) { return words.every(w => t.includes(w)); }

// n = firstName do usuário (já vem como primeiro nome)
const KB = [

  // ── FAB / Botão + ─────────────────────────────────────────────────────────
  {
    match: t => any(t, 'botao +', 'botao mais', 'fab', 'botao flutuante', 'botao central', 'botao redondo', 'botao do meio', 'botaozinho'),
    answer: n => `Esse botão é o coração do app, ${n}! 🫀\n\nO *+* dourado no centro da tela abre o menu de lançamento rápido:\n\n• *Gasto fixo* — repete todo mês (aluguel, academia, Netflix)\n• *Gasto variável* — pontual (iFood, farmácia, rolê)\n• *Parcelar compra* — divide em X meses automaticamente\n• *Renda* — salário, freela, renda extra\n\nSó toca e escolhe! 👆`,
  },

  // ── Adicionar despesa ──────────────────────────────────────────────────────
  {
    match: t => any(t, 'adicionar despesa', 'adicionar gasto', 'lancar despesa', 'lancar gasto', 'nova despesa', 'novo gasto', 'criar despesa', 'colocar despesa', 'registrar gasto', 'incluir despesa')
      || (any(t, 'como faco', 'como coloco', 'como adiciono', 'como lanço', 'como registro', 'como incluo') && any(t, 'despesa', 'gasto', 'conta')),
    answer: n => `Fácil, ${n}! Para lançar uma despesa:\n\n1️⃣ Na tela *Atual* (aba do mês corrente)\n2️⃣ Toca no *botão +* no centro\n3️⃣ Escolhe *Gasto fixo* ou *Gasto variável*\n4️⃣ Preenche nome, valor e forma de pagamento\n5️⃣ Salva!\n\n💡 _Fixo = repete todo mês. Variável = foi uma vez, tá bom._\n\nOu me fala aqui que eu registro pra você! Tipo: _"gastei 45 no iFood"_`,
  },

  // ── Fixo vs variável ───────────────────────────────────────────────────────
  {
    match: t => (any(t, 'diferenca', 'diferente', 'qual e a diferenca', 'o que e') && any(t, 'fixo', 'variavel', 'fixa'))
      || (any(t, 'fixo', 'variavel') && any(t, 'o que', 'qual', 'diferenca', 'quando usar')),
    answer: n => `Boa pergunta, ${n}! A diferença é simples:\n\n🔒 *Gasto Fixo* — valor previsível, todo mês.\nEx: aluguel, academia, Netflix, parcela do carro.\nTem data de vencimento e o app avisa quando vence.\n\n🔀 *Gasto Variável* — valor muda ou é esporádico.\nEx: iFood, Uber, farmácia, supermercado, rolê.\n\n💡 _Regra rápida: se vai pagar todo mês → fixo. Se foi só dessa vez → variável._`,
  },

  // ── Concluir / marcar pago ─────────────────────────────────────────────────
  {
    match: t => any(t, 'concluir', 'marcar como pago', 'marcar pago', 'como pago', 'como marco', 'como concluo', 'paguei como', 'arrastar', 'swipe', 'deslizar', 'gestos'),
    answer: n => `Tem três jeitos de marcar como pago, ${n}:\n\n🖐️ *Arrastar* — na lista, desliza o item pra *direita*. Vibra e some da lista!\n\n✅ *Pelo Cap* — me fala: _"conclua a Netflix"_ que eu marco pra você.\n\n📋 *Pelo menu* — pressiona o item → opção Concluir.\n\nEscolhe o que for mais fácil! 😄`,
  },

  // ── Parcelamento ───────────────────────────────────────────────────────────
  {
    match: t => any(t, 'parcela', 'parcelar', 'parcelamento', 'prestacao', 'dividir compra', 'compra parcelada', 'parcelas'),
    answer: n => `Parcelar é bem intuitivo, ${n}!\n\n1️⃣ Toca no *+* central\n2️⃣ Escolhe *Parcelar compra*\n3️⃣ Informa: nome, valor total, nº de parcelas e cartão\n4️⃣ Salva!\n\nO app já cria as parcelas automaticamente nos meses seguintes. Se parcelou em 6x em março, aparece uma em cada mês: abr, mai, jun, jul, ago, set.\n\n💡 _Cada parcela fica marcada como _(1/6)_, _(2/6)_, etc. Organizado demais!_`,
  },

  // ── Renda / entrada ────────────────────────────────────────────────────────
  {
    match: t => (any(t, 'como', 'adicionar', 'lancar', 'registrar', 'colocar', 'incluir') && any(t, 'renda', 'salario', 'receita', 'entrada', 'ganho', 'recebimento'))
      || any(t, 'nova renda', 'adicionar renda', 'lancar renda'),
    answer: n => `Para registrar uma entrada, ${n}:\n\n1️⃣ Toca no *+* central\n2️⃣ Seleciona *Renda*\n3️⃣ Informa nome (ex: Salário) e valor\n4️⃣ Salva!\n\nOu fala direto aqui: _"recebi 3000 de salário"_ e eu já registro! 💰`,
  },

  // ── Projetos / metas ───────────────────────────────────────────────────────
  {
    match: t => (any(t, 'como', 'criar', 'adicionar', 'novo', 'nova') && any(t, 'projeto', 'meta', 'objetivo', 'sonho', 'poupanca'))
      || any(t, 'aba projetos', 'tela projetos', 'como funciona projeto', 'o que e projeto'),
    answer: n => `Projetos são seus sonhos com prazo, ${n}! 🎯\n\nPara criar:\n\n1️⃣ Vá na aba *Projetos* (ícone 🚩)\n2️⃣ Toca em *+ Novo Projeto*\n3️⃣ Define: nome, meta total e aporte mensal\n\nO app calcula o prazo e mostra um *gráfico donut* com o progresso. Tem dois modos:\n\n⏱ *Meta + Aporte* — você diz quanto guarda/mês, o app calcula o prazo\n🎯 *Meta + Prazo* — você diz em quantos meses, o app calcula o aporte mensal\n\nOu me fala: _"cria projeto viagem meta 8000 guardando 500 por mês"_ 🚀`,
  },

  // ── Aporte / guardado no projeto ──────────────────────────────────────────
  {
    match: t => (any(t, 'aporte', 'guardar', 'guardado', 'economizar', 'poupar') && any(t, 'projeto', 'meta', 'sonho'))
      || any(t, 'ja tenho guardado', 'ja guardei', 'como coloco guardado'),
    answer: n => `Para atualizar o que já guardou, ${n}:\n\n*No app:* na aba Projetos, toca em *GUARDADO* no card e informa o valor.\n\n*Pelo Cap:* _"guardei 500 no projeto viagem"_ e eu atualizo na hora! 🎯`,
  },

  // ── Investimentos ──────────────────────────────────────────────────────────
  {
    match: t => (any(t, 'como', 'adicionar', 'registrar', 'lancar', 'cadastrar') && any(t, 'investimento', 'acao', 'fii', 'crypto', 'cripto', 'tesouro', 'renda fixa', 'ativo'))
      || any(t, 'aba investir', 'tela investimentos', 'como ativo investimento', 'modo investidor', 'carteira de investimentos'),
    answer: n => `Pra usar a aba de *Investimentos*, ${n}:\n\n1️⃣ Vai em *Configurações → Perfil* e ativa *Modo Investidor*\n2️⃣ A aba *Investir* 📈 aparece no menu\n3️⃣ Toca em *+ Adicionar* para cadastrar um ativo\n4️⃣ Informa: nome, ticker (ex: PETR4), quantidade e valor investido\n\nO app busca a cotação automaticamente:\n• *Ações e FIIs:* Yahoo Finance\n• *Cripto:* CoinGecko\n• *Dólar e Euro* em tempo real no topo\n\nPull-to-refresh pra atualizar tudo! 📊`,
  },

  // ── Formas de pagamento / cartões ──────────────────────────────────────────
  {
    match: t => any(t, 'forma de pagamento', 'adicionar cartao', 'cadastrar cartao', 'adicionar banco', 'novo cartao', 'metodo de pagamento', 'como adiciono o nubank', 'cadastrar nubank')
      || (any(t, 'como', 'adicionar', 'cadastrar') && any(t, 'cartao', 'banco', 'pagamento')),
    answer: n => `Para cadastrar um cartão/banco, ${n}:\n\n1️⃣ Vai em *Configurações → Formas de Pagamento*\n2️⃣ Toca em *+ Adicionar*\n3️⃣ Digita o nome (ex: Nubank, Pix, Dinheiro)\n4️⃣ Marca se é *cartão de crédito* e define o *limite* (opcional)\n\nO app detecta automaticamente o banco e mostra o logo (Nubank, C6, Itaú, PicPay e mais).\n\nAo lançar uma despesa, as formas cadastradas aparecem pra você escolher! 💳`,
  },

  // ── Nome / perfil ──────────────────────────────────────────────────────────
  {
    match: t => (any(t, 'mudar', 'alterar', 'trocar', 'editar', 'meu nome') && any(t, 'nome', 'apelido'))
      || any(t, 'como mudo meu nome', 'nome no app'),
    answer: n => `Para mudar seu nome, ${n}:\n\n*No app:* Vai em *Configurações → Perfil* e edita o nome.\n\n*Pelo Cap:* _"meu nome é [novo nome]"_ e eu atualizo agora! ✏️`,
  },

  // ── Avatar / foto ──────────────────────────────────────────────────────────
  {
    match: t => any(t, 'avatar', 'foto perfil', 'imagem perfil', 'mudar foto', 'trocar foto', 'foto do perfil', 'como mudo a foto'),
    answer: n => `Para trocar seu avatar, ${n}:\n\n1️⃣ Vai em *Configurações → Perfil*\n2️⃣ Toca na sua foto/avatar atual\n3️⃣ Escolhe entre *galeria de emojis* ou *foto da câmera/galeria*\n\nO avatar aparece na tela principal e no Modo Casal. Fica bonito! 🖼️`,
  },

  // ── Tema / cores ───────────────────────────────────────────────────────────
  {
    match: t => any(t, 'tema', 'mudar cor', 'mudar tema', 'modo escuro', 'modo claro', 'dark mode', 'aparencia', 'visual do app', 'cores do app'),
    answer: n => `Para customizar o visual, ${n}:\n\n1️⃣ Vai em *Configurações → Temas*\n2️⃣ Escolhe *Claro* ou *Escuro*\n3️⃣ Escolhe a cor de destaque (6 paletas: azul, verde, roxo, laranja, rosa, dourado)\n\nAs mudanças aplicam na hora, sem precisar reiniciar! 🎨`,
  },

  // ── Backup ─────────────────────────────────────────────────────────────────
  {
    match: t => any(t, 'backup', 'exportar dados', 'importar dados', 'salvar dados', 'restaurar dados', 'recuperar dados', 'fazer backup', 'perdi os dados', 'salvamento'),
    answer: n => `Backup é importante, ${n} — o app é 100% offline então não tem nuvem automática!\n\n📤 *Exportar (salvar):*\n1️⃣ Vai em *Configurações → Backup*\n2️⃣ Toca em *Exportar JSON*\n3️⃣ Salva no celular ou no Drive\n\n📥 *Importar (restaurar):*\n1️⃣ Vai em *Configurações → Backup*\n2️⃣ Toca em *Importar JSON*\n3️⃣ Seleciona o arquivo\n\n⚠️ _Faz backup regularmente! Se desinstalar sem backup, perde tudo._`,
  },

  // ── Concluir mês ───────────────────────────────────────────────────────────
  {
    match: t => any(t, 'concluir mes', 'fechar mes', 'finalizar mes', 'encerrar mes', 'como fecho o mes'),
    answer: n => `Para fechar o mês, ${n}:\n\nNa aba *Atual*, desliza o *header do mês* para a *esquerda* — aparece o botão de concluir (check ✅).\n\nIsso marca o mês como finalizado no histórico. Você ainda consegue editar depois se precisar! 📅`,
  },

  // ── Ver outros meses ───────────────────────────────────────────────────────
  {
    match: t => any(t, 'ver mes passado', 'historico', 'meses anteriores', 'mes anterior', 'como vejo outro mes', 'ver outros meses', 'mes anterior', 'meses anteriores'),
    answer: n => `Fácil, ${n}! Tem duas formas:\n\n📆 *Aba Meses* — vê todos os 12 meses do ano com resumo. Toca em qualquer um pra abrir.\n\n💬 *Pelo Cap* — me pergunta: _"resumo de abril"_ ou _"maiores gastos de março"_ e eu respondo na hora!\n\nSem complicação! 😄`,
  },

  // ── Notificações ───────────────────────────────────────────────────────────
  {
    match: t => any(t, 'notificac', 'alarme', 'aviso', 'lembrete', 'nao recebi notificacao', 'como ativo notificac', 'notificacao de vencimento'),
    answer: n => `O app manda notificações automáticas pra despesas fixas com vencimento, ${n}:\n\n🔔 *No dia do vencimento* — lembrete de hoje\n🔔 *3 dias antes* — aviso antecipado\n\nAs notificações são douradas e agrupadas por dia.\n\nSe não tiver chegando, checa se a permissão de notificações está ativada nas configurações do celular.\n\nQuer mudar o dia de vencimento de alguma despesa? Me diz: _"vencimento da Netflix pra dia 15"_! 📅`,
  },

  // ── Dízimo / contribuição ──────────────────────────────────────────────────
  {
    match: t => any(t, 'dizimo', 'contribuicao', 'oferta', 'dizimar', 'porcentagem dizimo', 'como ativo dizimo', 'como coloco dizimo'),
    answer: n => `Para ativar o controle de dízimo/contribuição, ${n}:\n\n1️⃣ Vai em *Configurações → Perfil*\n2️⃣ Ativa *Faz contribuições/dízimo*\n3️⃣ Define a porcentagem (ex: 10%)\n\nO app calcula quanto você deveria guardar baseado na sua renda do mês.\n\nOu me fala: _"ativa dízimo"_ e _"meta de dízimo 10%"_ que eu configuro na hora! 💜`,
  },

  // ── Modo Casal ─────────────────────────────────────────────────────────────
  {
    match: t => any(t, 'modo casal', 'casal', 'parceiro', 'parceira', 'namorado', 'namorada', 'compartilhar com', 'codigo casal', 'conectar parceiro', 'como conecto'),
    answer: n => `O *Modo Casal* é bem legal, ${n}! Você consegue ver as finanças do parceiro(a) sem misturar as contas:\n\n1️⃣ Vai em *Configurações → Modo Casal*\n2️⃣ Gera um *código* e manda pro seu parceiro(a)\n3️⃣ Quem receber, insere o código no app dele(a)\n4️⃣ Pronto — a aba *Casal* 💑 aparece no menu!\n\n_Cada um tem seus dados separados. O modo casal é só leitura — não mexe nas finanças do outro._\n\nTem um mini-avatar no canto pra trocar de perfil rapidamente! 👥`,
  },

  // ── Aba Controle ───────────────────────────────────────────────────────────
  {
    match: t => any(t, 'aba controle', 'tela controle', 'controle geral', 'resumo anual', 'saude financeira', 'nota financeira', 'o que e a nota'),
    answer: n => `A aba *Controle* é seu raio-X financeiro anual, ${n}! 📊\n\n📊 *Nota de saúde* — de A (ótimo) a F (gastou mais que ganhou)\n🍩 *Donut por categoria* — quanto foi fixo, variável e contribuição\n📈 *Evolução mensal* — seus gastos mês a mês no ano\n\nÉ bom dar uma olhada aqui de vez em quando pra ver a tendência! 👀`,
  },

  // ── Telegram / Jarvis ──────────────────────────────────────────────────────
  {
    match: t => any(t, 'telegram', 'jarvis', 'bot telegram', 'bot do telegram', 'como conecto telegram'),
    answer: n => `Além de mim (o Cap 😄), você também pode usar o *Jarvis* — meu irmão no Telegram!\n\nPara conectar, ${n}:\n1️⃣ Vai em *Configurações → Perfil*\n2️⃣ Toca em *Conectar Telegram*\n3️⃣ Segue as instruções\n\nCom o Jarvis no Telegram, você consulta e controla suas finanças sem nem abrir o app. Dois assistentes, mais conveniência! 📱`,
  },

  // ── Listar / editar despesas em bulk ──────────────────────────────────────
  {
    match: t => any(t, 'editar tudo', 'editar o mes', 'editar todas', 'listar despesas', 'ver todas as despesas', 'ver tudo do mes', 'listar tudo', 'lista todas', 'quero editar'),
    answer: n => `Para ver e editar o mês todo rapidinho, ${n}:\n\n📋 *"lista todas as despesas"* — exibe tudo com categoria e pagamento\n📋 *"despesas sem categoria"* — filtra as que precisam de categoria\n📋 *"despesas sem pagamento"* — filtra as sem forma de pagamento\n\nDepois de ver a lista, é só me falar o que quer:\n_"muda o valor da Netflix pra 45"_\n_"muda o pagamento do iFood pra Nubank"_\n_"categoriza o iFood como alimentação"_\n_"renomeia iFood pra Delivery"_ 📝`,
  },

  // ── Categorias de despesa ──────────────────────────────────────────────────
  {
    match: t => any(t, 'categoria', 'categorias', 'categorizar', 'categorizado', 'classificar', 'classificacao', 'orcamento categoria', 'orcamento por categoria', 'limite categoria', 'limite por categoria', 'como uso categoria', 'como funciona categoria', 'o que e categoria', 'o que sao categorias', 'como categorizo', 'como coloco categoria'),
    answer: n => `As *categorias* ajudam a organizar seus gastos por tipo, ${n}! 🏷️\n\n*9 categorias disponíveis:*\n🍔 Alimentação · 🚗 Transporte · 🏠 Moradia\n💊 Saúde · 🎮 Lazer · 📚 Educação\n👕 Vestuário · 📺 Assinaturas · 💻 Tech\n\n*Como categorizar:*\n• Ao adicionar uma despesa, o app já auto-detecta a categoria pelo nome!\n• Na lista, toca em qualquer despesa → _editar_ → categoria\n\n*Pelo Cap:*\n_"categoriza o iFood como alimentação"_\n_"coloca a academia na categoria saúde"_\n_"tira a categoria do Uber"_\n\n*Consultar gastos por categoria:*\n_"quanto gastei em alimentação?"_\n_"total em lazer esse mês?"_\n\n*Orçamento por categoria:*\nVai em *Configurações → Orçamento* pra definir limites. O gráfico de Orçamento na tela principal mostra o progresso! 📊`,
  },

  // ── O que o Cap pode fazer ─────────────────────────────────────────────────
  {
    match: t => any(t, 'o que voce faz', 'o que pode fazer', 'o que o cap', 'quais comandos', 'comandos disponiveis', 'o que posso perguntar', 'como usar o cap', 'ajuda', 'help', 'o que faz'),
    answer: n => `Pode deixar que eu cuido, ${n}! Aqui vai tudo que o *Cap* sabe fazer:\n\n*📊 Consultas:*\n_"como tá o mês?"_ · _"maiores gastos de junho"_\n_"quanto no nubank?"_ · _"gastos essa semana"_\n_"status dos projetos"_ · _"análise do ano"_\n_"quanto gastei em alimentação?"_ · _"total em lazer?"_\n\n*📋 Listar & editar em bulk:*\n_"lista todas as despesas"_ · _"despesas sem categoria"_\n_"despesas sem pagamento"_\n\n*✅ Ações:*\n_"conclua a Netflix"_ · _"reabra o aluguel"_\n_"recebi 3000 de salário"_ · _"gastei 45 no iFood"_\n_"cria projeto viagem meta 8000"_ · _"guardei 500 no projeto viagem"_\n_"apaga o iFood"_ · _"muda o valor da Netflix pra 55"_\n_"muda o pagamento do iFood pra Nubank"_ · _"renomeia iFood pra Delivery"_\n\n*🏷️ Categorias:*\n_"categoriza o iFood como alimentação"_\n_"coloca a academia na categoria saúde"_\n_"tira a categoria do Uber"_\n\n*⚙️ Configurações:*\n_"meu nome é Gabriel"_ · _"ativa modo investidor"_ · _"dízimo 10%"_\n\n*❓ Suporte:*\nPergunta qualquer coisa sobre como usar o app!`,
  },

  // ── Abas do app ────────────────────────────────────────────────────────────
  {
    match: t => any(t, 'o que e cada aba', 'para que serve cada aba', 'quais sao as abas', 'navegacao', 'como navegar', 'explicar abas'),
    answer: n => `As abas do *Controle+*, ${n}:\n\n📅 *Atual* — mês em andamento, lançamentos e arrastar pra pagar\n📆 *Meses* — histórico dos 12 meses do ano\n📊 *Controle* — saúde financeira anual\n📈 *Investir* — sua carteira (ative em Configurações)\n💑 *Casal* — finanças do parceiro(a) (ative com código)\n🚩 *Projetos* — metas e sonhos\n💬 *Cap* — aqui, seu assistente!`,
  },

  // ── Resetar / zerar ────────────────────────────────────────────────────────
  {
    match: t => any(t, 'apagar tudo', 'resetar', 'zerar app', 'limpar dados', 'comecar do zero', 'excluir tudo', 'como reseto'),
    answer: n => `Cuidado aí, ${n}! 😅 Não tem um botão de "resetar tudo" por segurança.\n\nSe quiser começar do zero:\n• *Desinstalar e reinstalar* — perde todos os dados (sem recuperação!)\n• *Apagar mês a mês* manualmente\n\nSe for começar um novo ano, os meses anteriores ficam no histórico e não atrapalham em nada.\n\n💡 _Faz um backup antes de qualquer coisa, só pra garantir!_`,
  },

  // ── App offline ─────────────────────────────────────────────────────────────
  {
    match: t => any(t, 'sem internet', 'offline', 'funciona sem internet', 'dados na nuvem', 'nuvem', 'sincroniza automaticamente', 'precisa de internet'),
    answer: n => `O *Controle+* é quase totalmente offline, ${n}! 💪\n\nTudo fica no seu celular — sem login, sem conta, sem servidor.\n\nAs únicas coisas que precisam de internet:\n• 📈 Cotações de ações/cripto/câmbio\n• 💑 Sincronização do Modo Casal\n• 🤖 Jarvis Bot no Telegram\n\nO resto funciona sem sinal nenhum! Só não esquece de fazer backup de vez em quando. 😄`,
  },

  // ── O que é o app ──────────────────────────────────────────────────────────
  {
    match: t => any(t, 'o que e o app', 'o que e o controle', 'como funciona o app', 'para que serve o app', 'sobre o app'),
    answer: n => `O *Controle+* é seu parceiro de finanças pessoais, ${n}! 💪\n\n• 📅 Registre *receitas e despesas* mês a mês\n• 🎯 Crie *projetos/metas* com progresso visual\n• 📈 Acompanhe *investimentos* com cotações automáticas\n• 💑 *Modo Casal* para ver as finanças do parceiro\n• 💬 *Cap* (eu!) para qualquer dúvida ou ação rápida\n\n100% offline, sem cadastro e sem assinatura. É gratuito! 🎉`,
  },
];

// ─── Função principal ─────────────────────────────────────────────────────────
export function capSupport(text, firstName) {
  const t = norm(text);
  const n = (firstName || 'você').split(' ')[0];
  const entry = KB.find(e => e.match(t));
  if (!entry) return null;
  const ans = entry.answer;
  return typeof ans === 'function' ? ans(n) : ans;
}
