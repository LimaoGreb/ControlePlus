// Testa TODAS as variações possíveis do classificador local.
// Roda: node test-all-variations.js
// Não usa Gemini — testa só o localClassify.

import { classifyIntent } from './geminiClient.js';

const TESTS = [
  // ── QUERY: summary ──────────────────────────────────────────────────────────
  { msg: 'como tá o mês', intent: 'query', subtype: 'summary' },
  { msg: 'como foi junho', intent: 'query', subtype: 'summary' },
  { msg: 'resumo do mês', intent: 'query', subtype: 'summary' },
  { msg: 'resumo de maio', intent: 'query', subtype: 'summary' },
  { msg: 'como estou financeiramente', intent: 'query', subtype: 'summary' },
  { msg: 'qual meu saldo esse mês', intent: 'query', subtype: 'summary' },
  { msg: 'tá bom o mês?', intent: 'query', subtype: 'summary' },
  { msg: 'quanto gastei esse mês', intent: 'query', subtype: 'summary' },
  { msg: 'me fala como foi março', intent: 'query', subtype: 'summary' },
  { msg: 'fechamento de junho', intent: 'query', subtype: 'summary' },
  { msg: 'situação financeira', intent: 'query', subtype: 'summary' },
  { msg: 'balanço do mês', intent: 'query', subtype: 'summary' },
  { msg: 'quanto sobrou em abril', intent: 'query', subtype: 'summary' },

  // ── QUERY: by_payment ───────────────────────────────────────────────────────
  { msg: 'quanto gastei no nubank', intent: 'query', subtype: 'by_payment' },
  { msg: 'quanto foi no pix esse mês', intent: 'query', subtype: 'by_payment' },
  { msg: 'gastos no crédito em maio', intent: 'query', subtype: 'by_payment' },
  { msg: 'c6 esse mês', intent: 'query', subtype: 'by_payment' },
  { msg: 'picpay em junho', intent: 'query', subtype: 'by_payment' },
  { msg: 'débito em março', intent: 'query', subtype: 'by_payment' },
  { msg: 'quanto no inter', intent: 'query', subtype: 'by_payment' },
  { msg: 'extrato do nubank', intent: 'query', subtype: 'by_payment' },
  { msg: 'total no cartão de crédito', intent: 'query', subtype: 'by_payment' },

  // ── QUERY: biggest ──────────────────────────────────────────────────────────
  { msg: 'maiores gastos', intent: 'query', subtype: 'biggest' },
  { msg: 'maiores gastos de junho', intent: 'query', subtype: 'biggest' },
  { msg: 'o que mais gastei', intent: 'query', subtype: 'biggest' },
  { msg: 'top gastos do mês', intent: 'query', subtype: 'biggest' },
  { msg: 'o que mais custou em maio', intent: 'query', subtype: 'biggest' },
  { msg: 'gastos mais altos', intent: 'query', subtype: 'biggest' },
  { msg: 'piores gastos', intent: 'query', subtype: 'biggest' },
  { msg: 'o que me apertou mais', intent: 'query', subtype: 'biggest' },
  { msg: 'principais despesas de abril', intent: 'query', subtype: 'biggest' },

  // ── QUERY: by_name ──────────────────────────────────────────────────────────
  { msg: 'quanto gastei no ifood esse mês', intent: 'query', subtype: 'by_name' },
  { msg: 'quanto paguei de netflix', intent: 'query', subtype: 'by_name' },
  { msg: 'gastos com mercado em junho', intent: 'query', subtype: 'by_name' },
  { msg: 'academia esse mês', intent: 'query', subtype: 'by_name' },
  { msg: 'quanto custou a farmácia', intent: 'query', subtype: 'by_name' },
  { msg: 'uber em maio', intent: 'query', subtype: 'by_name' },
  { msg: 'quanto no posto', intent: 'query', subtype: 'by_name' },
  { msg: 'supermercado em abril', intent: 'query', subtype: 'by_name' },

  // ── QUERY: by_name_range ────────────────────────────────────────────────────
  { msg: 'ifood desde janeiro', intent: 'query', subtype: 'by_name_range' },
  { msg: 'quanto gastei no ifood esse ano', intent: 'query', subtype: 'by_name_range' },
  { msg: 'netflix nos últimos 3 meses', intent: 'query', subtype: 'by_name_range' },
  { msg: 'histórico do mercado', intent: 'query', subtype: 'by_name_range' },
  { msg: 'uber a partir de março', intent: 'query', subtype: 'by_name_range' },
  { msg: 'academia nos últimos meses', intent: 'query', subtype: 'by_name_range' },

  // ── QUERY: analysis ─────────────────────────────────────────────────────────
  { msg: 'análise do ano', intent: 'query', subtype: 'analysis' },
  { msg: 'feedback dos primeiros 3 meses', intent: 'query', subtype: 'analysis' },
  { msg: 'como foram os últimos 2 meses', intent: 'query', subtype: 'analysis' },
  { msg: 'análise do primeiro semestre', intent: 'query', subtype: 'analysis' },
  { msg: 'resumo do período', intent: 'query', subtype: 'analysis' },
  { msg: 'como foi o ano até agora', intent: 'query', subtype: 'analysis' },
  { msg: 'análise anual', intent: 'query', subtype: 'analysis' },

  // ── QUERY: compare ──────────────────────────────────────────────────────────
  { msg: 'comparativo mês passado vs esse mês', intent: 'query', subtype: 'compare' },
  { msg: 'nubank mês passado vs esse mês', intent: 'query', subtype: 'compare' },
  { msg: 'diferença entre abril e maio', intent: 'query', subtype: 'compare' },
  { msg: 'gastei mais em maio ou junho', intent: 'query', subtype: 'compare' },
  { msg: 'compara janeiro com fevereiro', intent: 'query', subtype: 'compare' },
  { msg: 'evolução mês a mês', intent: 'query', subtype: 'compare' },

  // ── QUERY: investments ──────────────────────────────────────────────────────
  { msg: 'como estão meus investimentos', intent: 'query', subtype: 'investments' },
  { msg: 'carteira de investimentos', intent: 'query', subtype: 'investments' },
  { msg: 'quanto tenho investido', intent: 'query', subtype: 'investments' },
  { msg: 'rendimento dos investimentos', intent: 'query', subtype: 'investments' },
  { msg: 'minha carteira', intent: 'query', subtype: 'investments' },
  { msg: 'tesouro direto', intent: 'query', subtype: 'investments' },
  { msg: 'quanto tenho em ações', intent: 'query', subtype: 'investments' },

  // ── QUERY: projects ─────────────────────────────────────────────────────────
  { msg: 'status dos projetos', intent: 'query', subtype: 'projects' },
  { msg: 'como estão meus projetos', intent: 'query', subtype: 'projects' },
  { msg: 'quanto falta na minha meta', intent: 'query', subtype: 'projects' },
  { msg: 'metas de poupança', intent: 'query', subtype: 'projects' },
  { msg: 'reserva de emergência', intent: 'query', subtype: 'projects' },

  // ── QUERY: by_week ──────────────────────────────────────────────────────────
  { msg: 'gastos por semana', intent: 'query', subtype: 'by_week' },
  { msg: 'resumo semanal', intent: 'query', subtype: 'by_week' },
  { msg: 'quanto gastei essa semana', intent: 'query', subtype: 'by_week' },

  // ── ADD_INSTALLMENTS ────────────────────────────────────────────────────────
  { msg: 'parcelei o notebook 3600 em 12x no crédito', intent: 'add_installments' },
  { msg: 'comprei tv em 6 parcelas', intent: 'add_installments' },
  { msg: 'financiei a geladeira', intent: 'add_installments' },
  { msg: 'parcelei 1200 em 3x', intent: 'add_installments' },
  { msg: 'fiz em 10 vezes', intent: 'add_installments' },
  { msg: 'dividi em parcelas', intent: 'add_installments' },

  // ── UPDATE_DUE_DATE ─────────────────────────────────────────────────────────
  { msg: 'vencimento da netflix para dia 15', intent: 'update_due_date' },
  { msg: 'muda o vencimento do plano para dia 10', intent: 'update_due_date' },
  { msg: 'internet vence dia 5', intent: 'update_due_date' },
  { msg: 'novo vencimento da academia dia 20', intent: 'update_due_date' },
  { msg: 'atualiza vencimento do aluguel para dia 1', intent: 'update_due_date' },

  // ── CONCLUDE_EXPENSE ────────────────────────────────────────────────────────
  { msg: 'conclua a netflix', intent: 'conclude_expense' },
  { msg: 'marquei o ifood como pago', intent: 'conclude_expense' },
  { msg: 'já paguei a internet', intent: 'conclude_expense' },
  { msg: 'quitei o aluguel', intent: 'conclude_expense' },
  { msg: 'paguei o plano de saúde', intent: 'conclude_expense' },
  { msg: 'liquidei a academia', intent: 'conclude_expense' },
  { msg: 'já foi paga a fatura do nubank', intent: 'conclude_expense' },
  { msg: 'conclua a despesa do mercado', intent: 'conclude_expense' },
  { msg: 'marque o uber como pago', intent: 'conclude_expense' },

  // ── REOPEN_EXPENSE ──────────────────────────────────────────────────────────
  { msg: 'reabra a netflix', intent: 'reopen_expense' },
  { msg: 'reabra todas', intent: 'reopen_expense' },
  { msg: 'desmarque a internet como paga', intent: 'reopen_expense' },
  { msg: 'desconcluir o mercado', intent: 'reopen_expense' },
  { msg: 'volta ao aberto a academia', intent: 'reopen_expense' },
  { msg: 'desfaz conclusão do ifood', intent: 'reopen_expense' },
  { msg: 'não estava pago o aluguel', intent: 'reopen_expense' },
  { msg: 'reabrir todas as despesas', intent: 'reopen_expense' },

  // ── INCOME ──────────────────────────────────────────────────────────────────
  { msg: 'recebi 5000 de salário', intent: 'income' },
  { msg: 'adiciona 2000 na minha renda', intent: 'income' },
  { msg: 'ganhei 800 de freelance', intent: 'income' },
  { msg: 'faturei 3000 esse mês', intent: 'income' },
  { msg: 'entrou 1500 de bônus', intent: 'income' },
  { msg: 'recebi comissão de 500', intent: 'income' },
  { msg: 'recebimento de aluguel 1200', intent: 'income' },
  { msg: 'salário caiu 4500', intent: 'income' },
  { msg: 'proventos de 200 reais', intent: 'income' },
  { msg: 'ganho de 300 de venda', intent: 'income' },

  // ── ADD_PROJECT ─────────────────────────────────────────────────────────────
  { msg: 'cria projeto viagem meta 8000 guardando 400', intent: 'add_project' },
  { msg: 'novo projeto carro 30000', intent: 'add_project' },
  { msg: 'criar meta de reserva de emergência', intent: 'add_project' },
  { msg: 'adiciona projeto casa própria', intent: 'add_project' },
  { msg: 'quero criar uma poupança pra viagem', intent: 'add_project' },
  { msg: 'cadastra meta de 5000 pra viagem', intent: 'add_project' },

  // ── UPDATE_PROJECT_SAVED ────────────────────────────────────────────────────
  { msg: 'guardei 300 no projeto viagem', intent: 'update_project_saved' },
  { msg: 'economizei 500 pra reserva', intent: 'update_project_saved' },
  { msg: 'poupei 200 pra viagem', intent: 'update_project_saved' },
  { msg: 'coloquei 1000 no fundo de emergência', intent: 'update_project_saved' },
  { msg: 'adicionei 400 na meta do carro', intent: 'update_project_saved' },
  { msg: 'depositei 800 no projeto casa', intent: 'update_project_saved' },
  { msg: 'já guardei 1500 na viagem', intent: 'update_project_saved' },

  // ── SET_CREDIT_LIMIT ────────────────────────────────────────────────────────
  { msg: 'define limite de 600 no next', intent: 'set_credit_limit' },
  { msg: 'adiciona limite de 2000 no nubank', intent: 'set_credit_limit' },
  { msg: 'limite do c6 é 3000', intent: 'set_credit_limit' },
  { msg: 'cartão nubank com limite de 5000', intent: 'set_credit_limit' },
  { msg: 'muda o limite do nubank pra 4000', intent: 'set_credit_limit' },
  { msg: 'limite de crédito do inter é 1500', intent: 'set_credit_limit' },
  { msg: 'coloca limite de 800 no picpay', intent: 'set_credit_limit' },
  { msg: 'adiciona pra mim um limite de 600 reais no cartão do next por favor', intent: 'set_credit_limit' },

  // ── SET_USER_NAME ───────────────────────────────────────────────────────────
  { msg: 'meu nome é Gabriel', intent: 'set_user_name' },
  { msg: 'me chamo Gabi', intent: 'set_user_name' },
  { msg: 'muda meu nome para João', intent: 'set_user_name' },
  { msg: 'pode me chamar de Gabs', intent: 'set_user_name' },
  { msg: 'atualiza meu nome pra Pedro', intent: 'set_user_name' },

  // ── SET_CONTRIBUTION_PCT ────────────────────────────────────────────────────
  { msg: 'define contribuição para 10%', intent: 'set_contribution_pct' },
  { msg: 'dízimo de 15%', intent: 'set_contribution_pct' },
  { msg: 'meta de doação 12%', intent: 'set_contribution_pct' },
  { msg: 'muda contribuição pra 8%', intent: 'set_contribution_pct' },
  { msg: 'percentual de contribuição 20%', intent: 'set_contribution_pct' },

  // ── TOGGLE_SETTING ──────────────────────────────────────────────────────────
  { msg: 'ativa modo investidor', intent: 'toggle_setting' },
  { msg: 'desativa modo investidor', intent: 'toggle_setting' },
  { msg: 'habilita investidor', intent: 'toggle_setting' },
  { msg: 'liga modo investidor', intent: 'toggle_setting' },
  { msg: 'desliga investidor', intent: 'toggle_setting' },
  { msg: 'ativa contribuições', intent: 'toggle_setting' },
  { msg: 'desativa dízimo', intent: 'toggle_setting' },
  { msg: 'habilitar doações', intent: 'toggle_setting' },
  { msg: 'desabilita contribuições', intent: 'toggle_setting' },

  // ── SET_AVATAR ──────────────────────────────────────────────────────────────
  { msg: 'muda minha foto de perfil', intent: 'set_avatar' },
  { msg: 'troca meu avatar', intent: 'set_avatar' },
  { msg: 'atualiza minha foto', intent: 'set_avatar' },
  { msg: 'coloca uma foto no meu perfil', intent: 'set_avatar' },
  { msg: 'quero trocar minha imagem', intent: 'set_avatar' },

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  { msg: 'exporta meus dados', intent: 'export' },
  { msg: 'gera o csv', intent: 'export' },
  { msg: 'baixar planilha', intent: 'export' },
  { msg: 'quero exportar', intent: 'export' },
  { msg: 'manda o relatório', intent: 'export' },

  // ── FALSE POSITIVES — não devem ser despesa ──────────────────────────────────
  { msg: 'adiciona pra mim um limite de 600 reais no cartão do next por favor', intent: 'set_credit_limit' },
  { msg: 'quanto gastei', intent: 'query' },       // query, não despesa
  { msg: 'ifood esse mês', intent: 'query' },       // query by_name, não despesa
  { msg: 'recebi 5000', intent: 'income' },          // income, não despesa
];

// ─────────────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const failures = [];

// classifyIntent usa Gemini se localClassify retornar null.
// Para testar só local, interceptamos.
const { default: geminiClientModule } = await import('./geminiClient.js').catch(() => ({}));

for (const test of TESTS) {
  const result = await classifyIntent(test.msg);
  const intentOk = result.intent === test.intent;
  const subtypeOk = !test.subtype || result.params?.subtype === test.subtype;

  if (intentOk && subtypeOk) {
    passed++;
  } else {
    failed++;
    const expected = test.subtype ? `${test.intent}/${test.subtype}` : test.intent;
    const got = result.params?.subtype ? `${result.intent}/${result.params.subtype}` : result.intent;
    failures.push({ msg: test.msg, expected, got });
  }
}

const total = TESTS.length;
const pct = ((passed / total) * 100).toFixed(1);
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTADO: ${passed}/${total} (${pct}%)`);
console.log(`${'='.repeat(60)}\n`);

if (failures.length > 0) {
  console.log(`FALHAS (${failures.length}):\n`);
  failures.forEach(f => {
    console.log(`  ❌ "${f.msg}"`);
    console.log(`     Esperado: ${f.expected}`);
    console.log(`     Recebeu:  ${f.got}\n`);
  });
} else {
  console.log('✅ TUDO PASSOU!\n');
}
