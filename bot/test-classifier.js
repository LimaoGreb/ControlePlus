#!/usr/bin/env node
/**
 * JARVIS — Suite de testes exaustiva do classificador de intenções
 * ─────────────────────────────────────────────────────────────────
 * Rodar:
 *   node bot/test-classifier.js                → golden set fixo (~3000 seeds)
 *   node bot/test-classifier.js --gemini       → inclui expansão via Gemini
 *   node bot/test-classifier.js --only <tag>   → roda só os grupos com essa tag
 *   node bot/test-classifier.js --fail         → imprime só as falhas
 *
 * Arquitetura:
 *   1. GERAÇÃO PROGRAMÁTICA: templates × expenses × months × phrasings
 *   2. SEEDS MANUAIS: casos específicos, slang, typos, emojis, adversariais
 *   3. NEGATIVOS: inputs que NÃO devem retornar uma intent específica
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { classifyIntent } from './geminiClient.js';

// ── Carrega .env ──────────────────────────────────────────────────────────────
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  readFileSync(join(__dir, '.env'), 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
} catch {}

const USE_GEMINI = process.argv.includes('--gemini');
const ONLY_TAG   = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const ONLY_FAIL  = process.argv.includes('--fail');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Dados de domínio ──────────────────────────────────────────────────────────
const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const CARDS = ['nubank','c6','picpay','inter','next','bradesco','itaú','santander','will','neon'];
const EXPENSES_QRY = [
  'netflix','spotify','ifood','uber','academia','gasolina','internet',
  'farmácia','mercado','condomínio','escola','seguro','rappi','amazon prime',
];

// ─────────────────────────────────────────────────────────────────────────────
//  SEÇÃO 1: SEEDS GERADOS PROGRAMATICAMENTE
// ─────────────────────────────────────────────────────────────────────────────

const GENERATED = [];

// ── 1a. QUERY: summary ───────────────────────────────────────────────────────
{
  const MONTH_TMPLS = [
    'resumo de {m}', 'como foi {m}', 'balanço de {m}', 'gastos de {m}',
    'total de {m}', 'quanto gastei em {m}', 'extrato de {m}', 'situação em {m}',
    'fechamento de {m}', 'o que saiu em {m}',
  ];
  for (const tpl of MONTH_TMPLS)
    for (const m of MONTH_PT)
      GENERATED.push({ input: tpl.replace('{m}', m), intent: 'query', subtype: 'summary', month: m });

  const GENERIC_SUMMARY = [
    'como tá o mês','resumo do mês','balanço geral','tô bem esse mês?','como estou financeiramente',
    'situação do mês','fechamento do mês','quanto sobrou','qual o saldo','me mostra o mês',
    'como anda o dinheiro','relatório do mês','extrato do mês','como to esse mês','gastos do mês',
    'total gasto','total do mês','quanto gastei esse mês','qual meu saldo atual','sobrou quanto',
    'to bem ou mal','fala do mês pra mim','como foi o mês atual','resumo financeiro',
    'o que saiu esse mês','resume o mes','qto gastei','ta bom o mes?','balanco',
    'to bem financeiramente?','quantos reais sobrou','como to no financeiro',
    'quanto sobrou no mês','qual o saldo atual','o mês ta bom?','como anda o bolso',
    'dinheiro esse mês','situação financeira','status financeiro','como estou esse mês',
    'como foi o mês passado','gastos gerais','o que consumiu esse mês','visão geral',
    'quanto saiu esse mês','resultado do mês','como vai o dinheiro','tô no vermelho?',
    'tô no azul?','saldo do mês','quero ver o mês','me fala do mês','visão do mês',
    'me mostra tudo','o que aconteceu esse mês','balanço do mês','resumão do mês',
  ];
  for (const input of GENERIC_SUMMARY) GENERATED.push({ input, intent: 'query', subtype: 'summary' });
}

// ── 1b. QUERY: by_payment ────────────────────────────────────────────────────
{
  const TPL_NO_MONTH = [
    'quanto gastei no {c}','gastos {c} esse mês','{c} esse mês','total {c}',
    'o que foi no {c}','fatura do {c}','quanto no {c}','extrato do {c}',
    'despesas no {c}','o que saiu no {c}','gastei no {c}','{c} mes',
  ];
  const TPL_WITH_MONTH = [
    '{c} em {m}','{c} de {m}','quanto gastei no {c} em {m}',
    'gastos {c} de {m}','total {c} de {m}',
  ];
  for (const c of CARDS) {
    for (const tpl of TPL_NO_MONTH)
      GENERATED.push({ input: tpl.replace('{c}', c), intent: 'query', subtype: 'by_payment', filter: c });
    for (const m of ['janeiro','abril','julho','outubro'])
      for (const tpl of TPL_WITH_MONTH)
        GENERATED.push({ input: tpl.replace('{c}', c).replace('{m}', m), intent: 'query', subtype: 'by_payment', filter: c, month: m });
  }
  const GP = [
    { input: 'gastos no crédito', filter: 'crédito' },{ input: 'total débito', filter: 'débito' },
    { input: 'gastos no pix', filter: 'pix' },{ input: 'pix esse mês', filter: 'pix' },
    { input: 'quanto no pix', filter: 'pix' },{ input: 'total de pix', filter: 'pix' },
    { input: 'pix do mes', filter: 'pix' },{ input: 'saiu no pix', filter: 'pix' },
    { input: 'quanto saiu no pix', filter: 'pix' },{ input: 'o que paguei no pix', filter: 'pix' },
    { input: 'crédito esse mês', filter: 'crédito' },{ input: 'débito esse mês', filter: 'débito' },
    { input: 'cartão de crédito', filter: 'crédito' },{ input: 'total no crédito', filter: 'crédito' },
    { input: 'no débito quanto', filter: 'débito' },{ input: 'gastei no débito', filter: 'débito' },
  ];
  for (const s of GP) GENERATED.push({ input: s.input, intent: 'query', subtype: 'by_payment', filter: s.filter });
}

// ── 1c. QUERY: biggest ───────────────────────────────────────────────────────
{
  const BIGGEST_G = [
    'maiores gastos','top gastos do mês','o que mais gastei','pior gasto do mês',
    'o que custou mais','maior despesa','top 5 gastos','o que foi mais caro',
    'gastos mais pesados','o que mais saiu','mais pesado do mês','principais despesas',
    'gastos mais elevados','o que me apertou','apertou no bolso','me apertou',
    'qual meu maior gasto','o que mais pesou esse mês','top gastos','maiores saídas',
    'o que mais consumiu','o que levou mais dinheiro','gastei mais com quê',
    'onde foi mais dinheiro','o que sangrou','o que mais custou','onde gastei mais',
    'despesa mais cara','maiores despesas','pior gasto','qual o vilão do mês',
    'top despesas','gastos que pesaram','o que mais tirou do bolso','itens mais caros',
    'maior saída','o que mais foi','onde escapou mais',
  ];
  for (const input of BIGGEST_G) GENERATED.push({ input, intent: 'query', subtype: 'biggest' });
  for (const m of MONTH_PT) {
    GENERATED.push({ input: `maiores gastos de ${m}`, intent: 'query', subtype: 'biggest', month: m });
    GENERATED.push({ input: `o que mais gastei em ${m}`, intent: 'query', subtype: 'biggest', month: m });
    GENERATED.push({ input: `top gastos de ${m}`, intent: 'query', subtype: 'biggest', month: m });
  }
}

// ── 1d. QUERY: investments ───────────────────────────────────────────────────
{
  const INV = [
    'como estão meus investimentos','minha carteira','quanto tenho investido','rendimento da carteira',
    'status dos investimentos','como estão as ações','portfólio','meus fundos','cripto hoje',
    'bitcoin quanto tá','tesouro direto','fii','cdb','renda fixa','quanto investi','meus ativos',
    'como tá o invest','previdência','retorno da carteira','holdings','como vai a bolsa',
    'quanto rendeu','quanto valorizou','rentabilidade','carteira de ações','fundo imobiliário',
    'lci lca','ipca+','selic hoje','como está o tesouro','bitcoin valor','ethereum',
    'cripto como tá','quanto tenho em ações','quanto tenho em fundos','aporte do mês',
    'rendimento mensal','dividendos recebidos','proventos','minhas aplicações',
    'renda variável','renda fixa hoje','patrimônio','patrimônio total','total investido',
    'quanto está rendendo','retorno mensal','como vai a renda fixa','quanto apliquei',
    'ativos financeiros','quanto ta valendo','quanto no tesouro',
    'posição da carteira','resumo da carteira','como ta o btc','quanto ta o eth',
    'performance dos investimentos','retorno acumulado','quanto cresceu',
    'carteira consolidada','investimento mensal','como foi a rentabilidade',
    'cripto quanto vale','meus fundos imobiliários','fii esse mês','ações esse mês',
    'bolsa hoje','como vai meu portfolio','retorno do portfolio',
    'quanto no cdb','cdb rendeu','lci rendeu','rendimento do cdb',
  ];
  for (const input of INV) GENERATED.push({ input, intent: 'query', subtype: 'investments' });
}

// ── 1e. QUERY: projects ──────────────────────────────────────────────────────
{
  const PROJ = [
    'status dos projetos','como estão minhas metas','projetos','quanto falta pras metas',
    'meus objetivos','como vai a poupança','minhas metas','quanto já guardei',
    'estou juntando dinheiro','reserva','quanto falta','economizando para o quê',
    'como andam os projetos','quais são minhas metas','status das metas',
    'quanto falta pro objetivo','projetos financeiros','minhas reservas',
    'meta de poupança','objetivo financeiro','como estão meus objetivos',
    'resumo dos projetos','minha poupança','juntando dinheiro pra quê',
    'guardando para quê','poupança atual','objetivo de poupança',
    'metas financeiras','quanto poupei','quanto economizei ao todo',
    'quanto reservei','fundo de emergência','reserva de emergência status',
    'como ta o fundo de emergência','meta carro andamento',
    'como vai o projeto casa','objetivo notebook andamento',
    'quanto falta pra viagem','quanto falta pro carro','quanto falta pra casa',
    'meu progresso financeiro','quanto já alcancei',
  ];
  for (const input of PROJ) GENERATED.push({ input, intent: 'query', subtype: 'projects' });
}

// ── 1f. QUERY: by_name ───────────────────────────────────────────────────────
{
  const BY_NAME_TPL = [
    'quanto gastei no {e}','gastos no {e}','{e} esse mês','total do {e}',
    'o que gastei no {e}','quanto foi {e}','{e} no mês','despesa {e}',
    'quanto saiu no {e}','gasto com {e}','quanto é {e}','valor do {e}',
  ];
  const PREPS = ['no ','na ','de ','do ','da ',''];
  for (const e of EXPENSES_QRY) {
    for (const tpl of BY_NAME_TPL)
      GENERATED.push({ input: tpl.replace('{e}', e), intent: 'query', subtype: 'by_name', filter: e });
    for (const m of ['janeiro','junho','dezembro'])
      GENERATED.push({ input: `${e} em ${m}`, intent: 'query', subtype: 'by_name', filter: e, month: m });
  }
}

// ── 1g. QUERY: by_name_range ─────────────────────────────────────────────────
{
  const RANGE_EXP = ['ifood','netflix','uber','academia','gasolina','internet','mercado'];
  const RANGE_TPL = [
    '{e} desde janeiro','histórico de {e}','{e} nos últimos meses',
    '{e} esse ano','quanto gastei em {e} esse ano','{e} a partir de janeiro',
    '{e} nos últimos 3 meses','histórico do {e}','{e} ao longo do ano',
    'quanto foi {e} esse ano', 'total de {e} esse ano', 'gasto {e} desde o início do ano',
  ];
  for (const e of RANGE_EXP)
    for (const tpl of RANGE_TPL)
      GENERATED.push({ input: tpl.replace(/{e}/g, e), intent: 'query', subtype: 'by_name_range' });
}

// ── 1h. QUERY: analysis ──────────────────────────────────────────────────────
{
  const ANALYSIS = [
    'análise do ano','feedback dos primeiros 3 meses','como foi o ano',
    'análise dos últimos 4 meses','resumo do período','como foram os últimos meses',
    'análise do semestre','como foi o trimestre','resumo do ano inteiro',
    'análise do primeiro semestre','me dá um feedback desse ano',
    'como estou financeiramente esse ano','avaliação do período',
    'como andaram as finanças nos últimos 3 meses','análise dos primeiros dois meses',
    'histórico anual','resumo dos últimos meses','como estão minhas finanças desde janeiro',
    'balanço do ano','análise do ano todo','feedback financeiro anual',
    'resumo do ano','como foi o período','análise dos últimos 6 meses',
    'performance financeira','como foi o primeiro semestre','análise trimestral',
    'relatório semestral','como foram os primeiros 4 meses','retrospectiva do ano',
    'visão geral do ano','evolução financeira','tendência dos últimos meses',
    'feedback dos últimos 3 meses','análise de todo o período','balanço semestral',
    'análise anual','como foi o ano todo','primeiros 2 meses como foram',
    'como andei esse ano','resumo dos 6 meses','feedback anual',
    'análise dos últimos dois meses','como foi o semestre inteiro',
    'rendimento do período','balanço dos últimos meses','visão do período',
    'resumo do semestre','análise financeira do ano',
  ];
  for (const input of ANALYSIS) GENERATED.push({ input, intent: 'query', subtype: 'analysis' });
}

// ── 1i. QUERY: compare ───────────────────────────────────────────────────────
{
  const COMPARE = [
    'comparativo nubank mês passado vs esse mês',
    'compara gastos do nubank entre os meses','nubank evoluiu esse mês?',
    'gastei mais no nubank esse mês ou no anterior',
    'diferença nubank mês passado e atual','comparativo de maio vs junho',
    'gastos maio versus junho','pix mês passado vs esse','evoluí esse mês?',
    'aumentei os gastos?','cresceu meu gasto','gastei mais ou menos que o mês passado',
    'mes a mes','diferença de gastos entre os meses','piorou ou melhorou',
    'como evoluiu o nubank','comparação entre meses','março vs abril',
    'variação dos gastos','nubank melhorou?','gastei mais em crédito?',
    'comparativo c6 mês a mês','diferença de gastos no pix','evoluí no crédito?',
    'variação entre meses','nubank cresceu','diminuí os gastos?',
    'gastos maiores ou menores?','o que mudou nos gastos','cresci nos gastos',
    'reduzi os gastos?','gastei mais em março ou abril','junho foi pior que maio?',
    'agosto melhorou em relação a julho','como mudou o nubank',
    'tendência de gastos','o crédito subiu?','pix variou?',
    'mês passado foi pior?','esse mês tá melhor?',
    'diferença entre fevereiro e março','comparação de julho e agosto',
    'variação mensal do nubank','tendência de crédito',
    'aumentou ou diminuiu o gasto','c6 melhorou?','variação no débito',
    'compara o mês passado com esse','diferença de gastos mensais',
    'como mudou o débito','crescimento dos gastos','o que mudou entre os meses',
  ];
  for (const input of COMPARE) GENERATED.push({ input, intent: 'query', subtype: 'compare' });
}

// ── 1j. QUERY: by_week ───────────────────────────────────────────────────────
{
  const WEEK = [
    'gastos essa semana','o que gastei essa semana','resumo da semana',
    'quanto saiu essa semana','semana atual','gastos semanais',
    'desta semana','total semanal','o que saiu essa semana',
    'quanto gastei essa semana','semana corrente','despesas semanais',
    'semana em resumo','o que foi essa semana','total da semana',
    'extrato da semana','quanto saiu na semana','saídas semanais',
    'o que consumiu essa semana','quanto consumi essa semana',
    'gastos da semana passada','o que foi esta semana',
    'resumo semanal','total dos últimos 7 dias','gastos recentes',
    'o que saiu nos últimos dias','despesas da semana','balanço semanal',
    'o mês por semana','quanto por semana','semana como foi',
  ];
  for (const input of WEEK) GENERATED.push({ input, intent: 'query', subtype: 'by_week' });
}

// ── 1k. ADD_INSTALLMENTS ─────────────────────────────────────────────────────
{
  const INST_ITEMS = [
    ['TV','1200','6'], ['notebook','3600','12'], ['celular','2400','10'],
    ['geladeira','1800','8'], ['sofá','2000','6'], ['iPhone','6000','12'],
    ['Smart TV','3000','10'], ['moto','8000','24'], ['tablet','1200','6'],
    ['PlayStation','4000','12'], ['câmera','2500','10'], ['colchão','1200','6'],
  ];
  const INST_TPL = [
    'parcelei {i} em {n}x','parcelei {i} em {n} vezes',
    'comprei {i} parcelado em {n}x','parcelei {v} em {n}x',
    '{n}x no crédito o {i}','dividi {i} em {n} parcelas',
    'financiei {i} em {n}x',
  ];
  for (const [i, v, n] of INST_ITEMS)
    for (const tpl of INST_TPL)
      GENERATED.push({ input: tpl.replace('{i}', i).replace('{v}', v).replace('{n}', n), intent: 'add_installments' });

  const INST_G = [
    'parcelei a compra em 6x','parcelei em 12 vezes','dividi em 4 vezes',
    'comprei parcelado em 5x','parcelei 500 em 3x no nubank',
    '6x no crédito','comprei em parcelas','prestação em 10 meses',
    'crediário em 6 vezes','em 12x no c6','dividi a compra em 4 parcelas',
    'parcelei a cirurgia em 24x','parcelei o curso em 12 meses',
    'parcelei a viagem em 10x no crédito','parcelei roupa 200 em 2x',
    'dívida em 10 parcelas','financiamento em 48x',
    'parcelei a academia em 6x','prestação do notebook em 8x',
    'em 3x no débito','compra dividida em 5 vezes',
    'fiz 12 parcelas no nubank','dividi o iPhone em 10x',
    'parcelamento de 24 meses','em 6x sem juros',
    'parcelei a smart tv 3000 em 10x no inter',
    'parcelei o computador em 12x no c6',
    'comprei o sofá parcelado em 8 vezes no crédito',
    'financiei uma moto em 36 parcelas',
    'parcelei a reforma da cozinha em 12x',
    'compra parcelada de 1500 em 5x',
    'parcelei o plano de saúde em 12 meses',
    'dividi a conta do cartão em 3x',
    'parcelei o tênis em 3 vezes',
    '24x no crédito o notebook',
    'parcelei a viagem pra europa em 12x',
  ];
  for (const input of INST_G) GENERATED.push({ input, intent: 'add_installments' });
}

// ── 1l. UPDATE_DUE_DATE ──────────────────────────────────────────────────────
{
  const DUE_EXP = ['netflix','internet','aluguel','luz','água','spotify','academia','plano de saúde','condomínio'];
  const DUE_TPL = [
    'vencimento da {e} para dia {d}','muda o vencimento da {e} pra dia {d}',
    '{e} vence dia {d} agora','atualiza o vencimento da {e} pra {d}',
    'novo vencimento da {e}: dia {d}','muda o dia da {e} pra {d}',
  ];
  const DAYS = ['1','5','8','10','12','15','20','25'];
  for (const e of DUE_EXP)
    for (const tpl of DUE_TPL) {
      const d = DAYS[Math.floor(Math.random() * DAYS.length)];
      GENERATED.push({ input: tpl.replace('{e}', e).replace('{d}', d), intent: 'update_due_date' });
    }
  const DUE_G = [
    'muda o vencimento da netflix pra dia 15','netflix vence dia 20',
    'vencimento do aluguel é dia 5','muda o vencimento pra dia 10',
    'atualiza vencimento internet para dia 12','a fatura vence dia 15',
    'boleto vence dia 10','nova data de vencimento para dia 8',
    'data de vencimento é o dia 5','dia de pagamento novo: 25',
    'vence no dia 15 agora','muda a data de vencimento',
    'novo dia de pagamento: 1','boleto de energia vence dia 12',
    'nova data de vencimento do spotify: dia 1',
  ];
  for (const input of DUE_G) GENERATED.push({ input, intent: 'update_due_date' });
}

// ── 1m. CONCLUDE_EXPENSE ─────────────────────────────────────────────────────
{
  const CONC_EXP = [
    'netflix','aluguel','internet','academia','ifood','spotify','luz','água',
    'condomínio','nubank','c6','escola','seguro','plano de saúde','gas',
    'cartão','celular','uber','mercado','fatura',
  ];
  const CONC_TPL = [
    'conclua {p}{e}','marca {p}{e} como pago','paguei {p}{e}',
    'já paguei {p}{e}','quita {p}{e}','quitei {p}{e}',
    'deu baixa {p}{e}','ta pago {p}{e}','liquidei {p}{e}','concluir {p}{e}',
  ];
  const CP = ['a ','o ','da ','do ','na ','no ',''];
  for (const e of CONC_EXP)
    for (const tpl of CONC_TPL) {
      const p = CP[Math.floor(Math.random() * CP.length)];
      const input = tpl.replace('{p}', p).replace('{e}', e).replace(/\s+/g, ' ').trim();
      GENERATED.push({ input, intent: 'conclude_expense' });
    }
  const CONC_G = [
    'conclua a conta','marque o boleto como pago','paguei a fatura',
    'quita a fatura do cartão','foi pago','ta quitado',
    'liquidei a conta','marcar como concluído','paguei tudo',
    'da baixa no pagamento','conclui a assinatura','quita a assinatura',
    'foi liquidado','já está quitado','concluído o pagamento',
  ];
  for (const input of CONC_G) GENERATED.push({ input, intent: 'conclude_expense' });
}

// ── 1n. REOPEN_EXPENSE ───────────────────────────────────────────────────────
{
  const REOPEN_EXP = ['netflix','aluguel','internet','academia','ifood','spotify','luz','condomínio'];
  const REOPEN_TPL = [
    'reabra {p}{e}','reabre {p}{e}','desconclui {p}{e}',
    'reabrir {p}{e}','desmarque {p}{e} como pago','volta {p}{e} pra aberto',
  ];
  const RP = ['a ','o ','da ','do ',''];
  for (const e of REOPEN_EXP)
    for (const tpl of REOPEN_TPL) {
      const p = RP[Math.floor(Math.random() * RP.length)];
      const input = tpl.replace('{p}', p).replace('{e}', e).replace(/\s+/g, ' ').trim();
      GENERATED.push({ input, intent: 'reopen_expense' });
    }
  const REOPEN_ALL = [
    'reabra todas','reabre tudo','desconcluir todas',
    'desmarcar tudo como pago','volta tudo pra aberto',
    'reabre todos os gastos','reabrir todas as despesas',
    'desfaz tudo','desconclui tudo','reabre tudo que estava pago',
  ];
  for (const input of REOPEN_ALL) GENERATED.push({ input, intent: 'reopen_expense' });
}

// ── 1o. INCOME ───────────────────────────────────────────────────────────────
{
  const INCOME_ROWS = [
    ['salário','Salário',['recebi meu salário','salário caiu','salário depositado','meu salário chegou']],
    ['freela','Freelance',['fiz uma freela','recebi uma freela','freela foi pago']],
    ['aluguel','Aluguel',['recebi aluguel do imóvel','aluguel do ap entrou']],
    ['bônus','Bônus',['recebi um bônus','bônus caiu','gratificação recebida']],
    ['dividendos','Dividendos',['recebi dividendos','proventos chegaram']],
    ['13','13o',['recebi o décimo terceiro','13 salário chegou']],
  ];
  const INCOME_TPL = [
    'recebi {s} de {v}','recebi {v} de {s}','{s} caiu {v}',
    'ganhei {v} de {s}','entrou {v} de {s}','faturei {v} com {s}','{s} {v}',
  ];
  const VALS = ['2000','3500','4500','5000','800','1200','6000'];
  for (const [s,, seeds] of INCOME_ROWS) {
    for (const seed of seeds) GENERATED.push({ input: seed, intent: 'income' });
    for (const tpl of INCOME_TPL.slice(0, 4)) {
      const v = VALS[Math.floor(Math.random() * VALS.length)];
      GENERATED.push({ input: tpl.replace('{s}', s).replace('{v}', v), intent: 'income' });
    }
  }
  const INCOME_G = [
    'recebi 5000 de salário','salário caiu hoje 3500','ganhei 2000 de freelance',
    'fiz uma freela de 800','recebi comissão de 600','ganhei uma grana extra',
    'renda extra de 400','entrou 3000 na conta','faturei 1500 esse mês',
    'honorários de 2000','recebi benefício de 500','ganhei férias 4000',
    'proventos de 200','recebi pensão de 1000','salário de 4500 reais',
    'bônus de fim de ano 5000','recebimento de 3000','ganho extra de 1500',
    'recebi meu 13','férias caiu 3000','recebi a freela de 1500',
    'freelance pago 800','renda mensal chegou','recebi mais 500 de freelance',
    'ganho mensal de 4500','honorários pagos 2500','ganho de 4000 esse mês',
    'entrada de 3000 na conta','recebi a comissão de 1000',
  ];
  for (const input of INCOME_G) GENERATED.push({ input, intent: 'income' });
}

// ── 1p. ADD_PROJECT ──────────────────────────────────────────────────────────
{
  const PROJ_NAMES = ['viagem','carro','casa','notebook','iPhone','reserva','casamento','faculdade','moto','reforma'];
  const PROJ_TPL = [
    'cria projeto {n} meta {t} guardando {m}','nova meta {n} {t} por {m} por mês',
    'cria uma meta de poupança pra {n}','adiciona projeto {n} {t}',
    'novo objetivo {n}','quero criar um projeto pra {n}',
    'novo projeto: {n}','cria meta {n} {t}',
    'adicionar objetivo {n}','cria objetivo de poupança {n}',
  ];
  const TARGETS = ['5000','8000','10000','15000','20000','30000'];
  const MONTHLIES = ['200','300','400','500','800','1000'];
  for (const n of PROJ_NAMES)
    for (const tpl of PROJ_TPL.slice(0, 5)) {
      const t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
      const m = MONTHLIES[Math.floor(Math.random() * MONTHLIES.length)];
      GENERATED.push({ input: tpl.replace('{n}', n).replace('{t}', t).replace('{m}', m), intent: 'add_project' });
    }
  const PROJ_G = [
    'adiciona objetivo de reserva de emergência','criar meta de viagem europa',
    'novo objetivo financeiro: reserva de 20000','nova poupança pra reforma',
    'adiciona projeto casamento 50000','meta nova: faculdade 12000',
    'adicione projeto moto 8000 pagando 500 por mês',
    'criar meta de investimento 100000','cria projeto iphone meta 6000',
    'nova meta de poupança','quero juntar dinheiro pra viagem',
    'criar objetivo de poupança','novo projeto de economia',
  ];
  for (const input of PROJ_G) GENERATED.push({ input, intent: 'add_project' });
}

// ── 1q. TOGGLE_SETTING ───────────────────────────────────────────────────────
{
  const TOGGLE = [
    'ativa modo investidor','ativar investidor','liga modo investidor',
    'habilita investimentos','habilitar modo investidor','ativa o modo investidor',
    'ligar o investidor','ativa invest','ativar o modo de investidor',
    'habilita modo invest','liga investimentos','ativa investimento',
    'ligar modo investidor','ativar perfil investidor',
    'desativa modo investidor','desligar investidor','desabilita o modo investidor',
    'tirar o modo investidor','desativar investidor','desabilitar investimentos',
    'desliga modo investidor','desativar o modo invest','remove o modo investidor',
    'desativa invest',
    'ativa contribuições','ligar dízimo','habilita dízimo','ativar doações',
    'ativar contribuições mensais','liga contribuição','habilita contribuição',
    'ativa o dízimo','ativar o dízimo','ativa doação',
    'liga dízimo mensal','habilitar contribuições','quero ativar o dízimo',
    'desativa contribuições','desligar dízimo','desabilita as contribuições',
    'remove dízimo','desativar contribuições','desliga contribuição',
    'desabilitar dízimo','desativa doações','tirar contribuições',
    'desativar o dízimo',
  ];
  for (const input of TOGGLE) GENERATED.push({ input, intent: 'toggle_setting' });
}

// ── 1r. SET_AVATAR ───────────────────────────────────────────────────────────
{
  const AVATAR = [
    'muda minha foto de perfil','quero trocar meu avatar','atualiza minha foto',
    'troca a foto do perfil','minha foto nova','coloca uma foto de perfil',
    'define meu avatar','trocar imagem de perfil','quero mudar minha imagem',
    'muda foto','trocar avatar','atualiza o avatar','nova foto de perfil',
    'muda meu perfil foto','quero uma foto nova','atualiza minha imagem de perfil',
    'troca minha foto','muda a foto','coloca nova foto','define nova imagem',
    'quero trocar a foto','mudar imagem do perfil','nova imagem',
    'quero atualizar meu avatar','muda avatar','foto de perfil nova',
    'atualizar foto do perfil','trocar imagem','colocar foto',
    'mudar meu avatar','nova foto',
  ];
  for (const input of AVATAR) GENERATED.push({ input, intent: 'set_avatar' });
}

// ── 1s. SET_CREDIT_LIMIT ─────────────────────────────────────────────────────
{
  const LIMIT_CARDS = ['nubank','c6','picpay','inter','next','bradesco','itaú'];
  const LIMIT_TPL = [
    'define limite de {v} no {c}','coloca limite de {v} no {c}',
    'cartão {c} com limite de {v}','limite do {c} é {v}',
    'ajusta o limite do {c} pra {v}','muda o limite do {c} pra {v}',
  ];
  const LV = ['500','600','1000','1500','2000','2500','3000','4000','5000'];
  for (const c of LIMIT_CARDS)
    for (const tpl of LIMIT_TPL) {
      const v = LV[Math.floor(Math.random() * LV.length)];
      GENERATED.push({ input: tpl.replace('{c}', c).replace('{v}', v), intent: 'set_credit_limit' });
    }
  const LIMIT_G = [
    'limite do cartão 2000','meu limite é 3000','define limite para 5000',
    'coloca 1500 de limite','limite de crédito 2500',
    'atualiza limite para 4000','quero definir o limite',
    'ajustar o limite para 1000',
  ];
  for (const input of LIMIT_G) GENERATED.push({ input, intent: 'set_credit_limit' });
}

// ── 1t. SET_USER_NAME ────────────────────────────────────────────────────────
{
  const NAMES = ['Gabriel','Luk','Ana','João','Maria','Pedro','Carlos','Bia','Rafael','Gabi','Lucas'];
  const NAME_TPL = [
    'meu nome é {n}','me chamo {n}','pode me chamar de {n}',
    'muda meu nome para {n}','meu nome vai ser {n}',
    'troca meu nome pra {n}','atualiza meu nome para {n}',
    'coloca meu nome como {n}','me chamo {n} agora','meu nome agora é {n}',
  ];
  for (const n of NAMES)
    for (const tpl of NAME_TPL)
      GENERATED.push({ input: tpl.replace('{n}', n), intent: 'set_user_name' });
}

// ── 1u. SET_CONTRIBUTION_PCT ─────────────────────────────────────────────────
{
  const PCT = [
    'define contribuição para 10%','dízimo de 15%','contribuição de 10 por cento',
    'coloca dízimo em 12%','meta de contribuição 8%','doação de 5%',
    'dízimo para 10%','percentual de contribuição 15','define dízimo 12%',
    'quero contribuir 10% da renda','contribuição mensal de 8%',
    'dízimo de 10 por cento','define 15% para dízimo','contribuição 5%',
    '10% de contribuição','12% de dízimo','contribui 10%',
    'minha contribuição é 10%','coloca contribuição em 15%',
    'percentual de dízimo 10','taxa de contribuição 8%',
    'contribuição de 10%','defina o dízimo em 10%',
    'meta de doação 5%','percentual de doação 10%',
    'coloca 12% de contribuição','define 10 por cento de dízimo',
    'taxa de dízimo 10%','contribuição para 15%',
    'define 8% de contribuição mensal',
  ];
  for (const input of PCT) GENERATED.push({ input, intent: 'set_contribution_pct' });
}

// ── 1v. UPDATE_PROJECT_SAVED ─────────────────────────────────────────────────
{
  const SAVED_NAMES = ['viagem','carro','casa','reserva','casamento','notebook','moto','faculdade'];
  const SAVED_TPL = [
    'guardei {v} no projeto {p}','economizei {v} pra {p}',
    'poupei {v} pra {p}','coloquei {v} no projeto {p}',
    'guardei {v} pra {p}','adicionei {v} na meta {p}',
    'depositei {v} no fundo {p}','guardei mais {v} pro {p}',
  ];
  const SV = ['100','200','300','400','500','600','800','1000','1500'];
  for (const p of SAVED_NAMES)
    for (const tpl of SAVED_TPL) {
      const v = SV[Math.floor(Math.random() * SV.length)];
      GENERATED.push({ input: tpl.replace('{v}', v).replace('{p}', p), intent: 'update_project_saved' });
    }
  const SAVED_G = [
    'guardei 500 pra viagem','economizei 300 pro carro',
    'coloquei 1000 na reserva','poupei 200 pra casa',
    'guardei 400 pra o casamento','adicionei 600 pro fundo de emergência',
    'guardei pra viagem 700','economizei 250 pra o carro',
    'guardei mais 500 pro projeto casamento','já guardei 1500 na meta carro',
  ];
  for (const input of SAVED_G) GENERATED.push({ input, intent: 'update_project_saved' });
}

// ── 1w. EXPORT ───────────────────────────────────────────────────────────────
{
  const EXPORT = [
    'exporta meus dados','quero um CSV','baixar planilha','exportar relatório',
    'me manda os dados em planilha','gera o csv','quero exportar tudo',
    'download dos meus dados','planilha do ano','exportar meus gastos',
    'quero exportar em csv','exportação de dados','gera planilha',
    'exportar histórico','gera relatório','baixa os dados',
    'meus dados em planilha','csv dos gastos','exportar tudo',
    'relatório em csv','exportar os dados do mês','quero baixar meus dados',
    'exporta tudo','gera o relatório','baixar o histórico',
    'planilha de gastos','exportar despesas','quero o csv','exportar em planilha',
  ];
  for (const input of EXPORT) GENERATED.push({ input, intent: 'export' });
}

// ── 1x. UNSUPPORTED ──────────────────────────────────────────────────────────
{
  const UNSUP = [
    { input: 'conclua todas as despesas', intent: 'conclude_expense' },
    { input: 'conclui todos os gastos', intent: 'conclude_expense' },
    { input: 'marca tudo como pago', intent: 'conclude_expense' },
    { input: 'conclua tudo', intent: 'conclude_expense' },
    { input: 'concluir todas as despesas do mês', intent: 'conclude_expense' },
    { input: 'fechar todos os meses', intent: 'unsupported' },
    { input: 'concluir tudo', intent: 'conclude_expense' },
    { input: 'marca todas as despesas como pagas', intent: 'conclude_expense' },
    { input: 'concluir todas as contas', intent: 'conclude_expense' },
    { input: 'reabra todos os meses', intent: 'unsupported' },
    { input: 'reabre todos os meses do ano', intent: 'unsupported' },
    { input: 'reabrir todos os meses', intent: 'unsupported' },
    { input: 'adiciona um cartão novo', intent: 'unsupported' },
    { input: 'cria forma de pagamento', intent: 'unsupported' },
    { input: 'adicionar novo cartão de crédito', intent: 'unsupported' },
    { input: 'novo método de pagamento', intent: 'unsupported' },
    { input: 'cria um novo cartão', intent: 'unsupported' },
    { input: 'adiciona bandeira nova', intent: 'unsupported' },
    { input: 'criar nova forma de pagamento', intent: 'unsupported' },
  ];
  for (const s of UNSUP) GENERATED.push(s);
}

// ── 1y. CHAT ─────────────────────────────────────────────────────────────────
{
  const CHAT = [
    'oi jarvis','ola','e ai','bom dia','boa tarde','boa noite',
    'ajuda','help','/start','/help','obrigado','valeu','blz',
    'tudo bem?','tudo certo?','oi tudo bem','oi bot','oi','hey',
    'como vai?','tá bom?','o que você faz','me ajuda',
    'como funciona','o que você consegue fazer','posso perguntar algo',
    'me conta','fala aí','e você','legal','entendi','ok','certo',
    'sim','não','talvez','muito bom','show','perfeito','exatamente',
    'isso mesmo','me ajuda com algo','pode ajudar','preciso de ajuda',
    'oi, preciso de ajuda','oi jarvis tudo bem','bom dia jarvis',
    'boa tarde bot','oi, estou perdido','não entendi nada',
    'o que posso fazer aqui','como usar','como usar o app',
  ];
  for (const input of CHAT) GENERATED.push({ input, intent: 'chat' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEÇÃO 2: SEEDS MANUAIS
// ─────────────────────────────────────────────────────────────────────────────

const MANUAL = [
  // ─── Adversariais ─────────────────────────────────────────────────────────
  { input: 'quanto pago de aluguel', intent: 'query', subtype: 'by_name', filter: 'aluguel', tag: 'adversarial' },
  { input: 'quanto custa o aluguel', intent: 'query', subtype: 'by_name', filter: 'aluguel', tag: 'adversarial' },
  { input: 'total do aluguel esse mês', intent: 'query', subtype: 'by_name', filter: 'aluguel', tag: 'adversarial' },
  { input: 'parcelei no crédito', intent: 'add_installments', tag: 'adversarial' },
  { input: 'parcelei no nubank', intent: 'add_installments', tag: 'adversarial' },
  { input: 'parcelei no c6', intent: 'add_installments', tag: 'adversarial' },
  { input: 'cria projeto viagem', intent: 'add_project', tag: 'adversarial' },
  { input: 'nova meta carro', intent: 'add_project', tag: 'adversarial' },
  { input: 'como estão meus projetos', intent: 'query', subtype: 'projects', tag: 'adversarial' },
  { input: 'recebi dividendos de 300', intent: 'income', tag: 'adversarial' },
  { input: 'conclua todas', intent: 'conclude_expense', tag: 'adversarial' },
  { input: 'reabra todos os meses', intent: 'unsupported', tag: 'adversarial' },
  { input: 'o que gastei no ifood esse mês', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'adversarial' },
  { input: 'gastos nubank junho', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'adversarial' },
  { input: 'histórico do ifood', intent: 'query', subtype: 'by_name_range', tag: 'adversarial' },
  { input: 'como foi o ano', intent: 'query', subtype: 'analysis', tag: 'adversarial' },
  { input: 'netflix vence dia 15', intent: 'update_due_date', tag: 'adversarial' },
  { input: 'projetos', intent: 'query', subtype: 'projects', tag: 'adversarial' },
  { input: 'investimentos', intent: 'query', subtype: 'investments', tag: 'adversarial' },
  { input: 'metas', intent: 'query', subtype: 'projects', tag: 'adversarial' },
  { input: 'pix', intent: 'query', subtype: 'by_payment', filter: 'pix', tag: 'adversarial' },
  { input: 'nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'adversarial' },
  { input: 'ifood', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'adversarial' },
  { input: 'guardei 400 no projeto viagem', intent: 'update_project_saved', tag: 'adversarial' },
  { input: 'o dia de vencimento do aluguel é 5', intent: 'update_due_date', tag: 'adversarial' },
  { input: 'conclua todas as despesas do mês', intent: 'conclude_expense', tag: 'adversarial' },
  { input: 'reabre o ifood', intent: 'reopen_expense', tag: 'adversarial' },
  { input: 'reabra o aluguel', intent: 'reopen_expense', tag: 'adversarial' },
  { input: 'queria ver o nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'adversarial' },
  { input: 'o nubank tá pesado', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'adversarial' },

  // ─── Typos ────────────────────────────────────────────────────────────────
  { input: 'concluiir a netflix', intent: 'conclude_expense', tag: 'typo' },
  { input: 'parceleii o celular em 12x', intent: 'add_installments', tag: 'typo' },
  { input: 'resumo do mez', intent: 'query', subtype: 'summary', tag: 'typo' },
  { input: 'gastei no nubankk', intent: 'query', subtype: 'by_payment', tag: 'typo' },
  { input: 'reabrir a netfliix', intent: 'reopen_expense', tag: 'typo' },
  { input: 'vencimento da netlix dia 15', intent: 'update_due_date', tag: 'typo' },
  { input: 'ativaa modo investidor', intent: 'toggle_setting', tag: 'typo' },
  { input: 'recebi meu salrio', intent: 'income', tag: 'typo' },
  { input: 'mais gastos do mes', intent: 'query', subtype: 'biggest', tag: 'typo' },
  { input: 'gstei no ifood', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'typo' },
  { input: 'exporta meus dadoos', intent: 'export', tag: 'typo' },
  { input: 'quanto gstei', intent: 'query', subtype: 'summary', tag: 'typo' },
  { input: 'parceleii em 6x', intent: 'add_installments', tag: 'typo' },
  { input: 'ifood desde janiero', intent: 'query', subtype: 'by_name_range', tag: 'typo' },
  { input: 'dizimo de 10%', intent: 'set_contribution_pct', tag: 'typo' },
  { input: 'contribuicao de 10%', intent: 'set_contribution_pct', tag: 'typo' },
  { input: 'historico de ifood', intent: 'query', subtype: 'by_name_range', tag: 'typo' },
  { input: 'analise do ano', intent: 'query', subtype: 'analysis', tag: 'typo' },
  { input: 'balanco do mes', intent: 'query', subtype: 'summary', tag: 'typo' },
  { input: 'recebimento de salario', intent: 'income', tag: 'typo' },

  // ─── CAPS ─────────────────────────────────────────────────────────────────
  { input: 'QUANTO GASTEI NO NUBANK', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'caps' },
  { input: 'RESUMO DO MÊS', intent: 'query', subtype: 'summary', tag: 'caps' },
  { input: 'MAIORES GASTOS', intent: 'query', subtype: 'biggest', tag: 'caps' },
  { input: 'CONCLUA A NETFLIX', intent: 'conclude_expense', tag: 'caps' },
  { input: 'RECEBI 5000 DE SALÁRIO', intent: 'income', tag: 'caps' },
  { input: 'PARCELEI A TV EM 12X', intent: 'add_installments', tag: 'caps' },
  { input: 'ATIVA MODO INVESTIDOR', intent: 'toggle_setting', tag: 'caps' },
  { input: 'MUDA MINHA FOTO', intent: 'set_avatar', tag: 'caps' },
  { input: 'EXPORTA MEUS DADOS', intent: 'export', tag: 'caps' },
  { input: 'QUANTO GASTEI ESSE MÊS', intent: 'query', subtype: 'summary', tag: 'caps' },
  { input: 'ANÁLISE DO ANO', intent: 'query', subtype: 'analysis', tag: 'caps' },
  { input: 'MEU NOME É GABRIEL', intent: 'set_user_name', tag: 'caps' },

  // ─── Emojis ───────────────────────────────────────────────────────────────
  { input: '💸 quanto gastei esse mês?', intent: 'query', subtype: 'summary', tag: 'emoji' },
  { input: '📊 resumo do mes', intent: 'query', subtype: 'summary', tag: 'emoji' },
  { input: '💳 quanto no nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'emoji' },
  { input: '📈 como estão os investimentos', intent: 'query', subtype: 'investments', tag: 'emoji' },
  { input: '✅ conclua a netflix', intent: 'conclude_expense', tag: 'emoji' },
  { input: '💰 recebi 5000 de salário', intent: 'income', tag: 'emoji' },
  { input: '🎯 status dos projetos', intent: 'query', subtype: 'projects', tag: 'emoji' },
  { input: '📅 resumo do mês 📅', intent: 'query', subtype: 'summary', tag: 'emoji' },
  { input: '💰💰 salário caiu', intent: 'income', tag: 'emoji' },
  { input: '📁 exporta meus dados', intent: 'export', tag: 'emoji' },
  { input: '🔄 reabre a netflix', intent: 'reopen_expense', tag: 'emoji' },
  { input: '📱 muda meu nome pra João 😊', intent: 'set_user_name', tag: 'emoji' },
  { input: '📊 análise do semestre', intent: 'query', subtype: 'analysis', tag: 'emoji' },
  { input: '🏆 maiores gastos esse mês', intent: 'query', subtype: 'biggest', tag: 'emoji' },
  { input: '🏠 quanto de aluguel', intent: 'query', subtype: 'by_name', filter: 'aluguel', tag: 'emoji' },

  // ─── Curtos ───────────────────────────────────────────────────────────────
  { input: 'o mês', intent: 'query', subtype: 'summary', tag: 'short' },
  { input: 'saldo?', intent: 'query', subtype: 'summary', tag: 'short' },
  { input: 'c6', intent: 'query', subtype: 'by_payment', filter: 'c6', tag: 'short' },
  { input: 'inter', intent: 'query', subtype: 'by_payment', filter: 'inter', tag: 'short' },
  { input: 'netflix?', intent: 'query', subtype: 'by_name', filter: 'netflix', tag: 'short' },
  { input: 'uber?', intent: 'query', subtype: 'by_name', filter: 'uber', tag: 'short' },
  { input: 'academia?', intent: 'query', subtype: 'by_name', filter: 'academia', tag: 'short' },
  { input: 'carteira', intent: 'query', subtype: 'investments', tag: 'short' },
  { input: 'exportar', intent: 'export', tag: 'short' },
  { input: 'csv', intent: 'export', tag: 'short' },
  { input: 'oi', intent: 'chat', tag: 'short' },

  // ─── Longos ───────────────────────────────────────────────────────────────
  { input: 'pode me dar um resumo completo de como estão minhas finanças esse mês por favor?', intent: 'query', subtype: 'summary', tag: 'long' },
  { input: 'quero saber quanto estou gastando no nubank esse mês para controlar melhor meu dinheiro', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'long' },
  { input: 'me mostra os maiores gastos desse mês para eu poder cortar onde está saindo mais dinheiro', intent: 'query', subtype: 'biggest', tag: 'long' },
  { input: 'preciso saber o resumo de como foi minha situação financeira ao longo desse ano todo', intent: 'query', subtype: 'analysis', tag: 'long' },
  { input: 'recebi hoje o meu salário de 5000 reais referente ao mês de junho', intent: 'income', tag: 'long' },
  { input: 'por favor marque a netflix como paga pois eu já realizei o pagamento da assinatura', intent: 'conclude_expense', tag: 'long' },
  { input: 'quero criar um projeto de poupança pra viagem à europa com meta de 15000 reais guardando 500 por mês', intent: 'add_project', tag: 'long' },
  { input: 'parcelei a compra de um novo notebook no cartão nubank em 12 vezes de 400 reais cada parcela', intent: 'add_installments', tag: 'long' },
  { input: 'pode mudar o dia de vencimento da minha conta de internet para o dia 10 de cada mês por favor', intent: 'update_due_date', tag: 'long' },

  // ─── Slang / gíria ────────────────────────────────────────────────────────
  { input: 'cara quanto tô gastando', intent: 'query', subtype: 'summary', tag: 'slang' },
  { input: 'irmão como tá o mês', intent: 'query', subtype: 'summary', tag: 'slang' },
  { input: 'mano me fala do mês', intent: 'query', subtype: 'summary', tag: 'slang' },
  { input: 'que saldo brow', intent: 'query', subtype: 'summary', tag: 'slang' },
  { input: 'to no vermelho?', intent: 'query', subtype: 'summary', tag: 'slang' },
  { input: 'sangrou no nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'slang' },
  { input: 'o ifood me arruinou', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'slang' },
  { input: 'caiu meu salário', intent: 'income', tag: 'slang' },
  { input: 'trampo pagou hoje', intent: 'income', tag: 'slang' },
  { input: 'tá pago o negócio do aluguel', intent: 'conclude_expense', tag: 'slang' },
  { input: 'fechei a conta do nubank', intent: 'conclude_expense', tag: 'slang' },
  { input: 'limpei a fatura', intent: 'conclude_expense', tag: 'slang' },
  { input: 'tô economizando pra viagem', intent: 'query', subtype: 'projects', tag: 'slang' },
  { input: 'juntando pra comprar um carro', intent: 'query', subtype: 'projects', tag: 'slang' },
  { input: 'chega de ifood vou ver quanto to gastando', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'slang' },
  { input: 'oxente quanto saiu no nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'slang' },
  { input: 'po quanto saiu esse mês', intent: 'query', subtype: 'summary', tag: 'slang' },

  // ─── Inglês / misto ───────────────────────────────────────────────────────
  { input: 'show me my balance', intent: 'query', subtype: 'summary', tag: 'english' },
  { input: 'how much did I spend on nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'english' },
  { input: 'how are my investments', intent: 'query', subtype: 'investments', tag: 'english' },
  { input: 'my monthly summary', intent: 'query', subtype: 'summary', tag: 'english' },
  { input: 'check my portfolio', intent: 'query', subtype: 'investments', tag: 'english' },

  // ─── Regex edge cases ─────────────────────────────────────────────────────
  { input: 'ifood desde março', intent: 'query', subtype: 'by_name_range', tag: 'regex' },
  { input: 'análise das minhas finanças', intent: 'query', subtype: 'analysis', tag: 'regex' },
  { input: 'resumo do ano', intent: 'query', subtype: 'analysis', tag: 'regex' },
  { input: 'o que saiu essa semana?', intent: 'query', subtype: 'by_week', tag: 'regex' },
  { input: 'maio vs junho', intent: 'query', subtype: 'compare', tag: 'regex' },
  { input: 'janeiro versus fevereiro', intent: 'query', subtype: 'compare', tag: 'regex' },
  { input: 'o nubank evoluiu', intent: 'query', subtype: 'compare', tag: 'regex' },
  { input: 'top 10 gastos', intent: 'query', subtype: 'biggest', tag: 'regex' },
  { input: 'ganhei uma comissão', intent: 'income', tag: 'regex' },
  { input: 'quero definir um limite no nubank', intent: 'set_credit_limit', tag: 'regex' },
  { input: 'parcelei no cartão de crédito', intent: 'add_installments', tag: 'regex' },

  // ═══════════════════════════════════════════════════════════════════════════
  //  MEGA EXPANSÃO — cobertura máxima de linguagem natural brasileira
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── COMPARE — todas as formas de comparar meses ─────────────────────────
  { input: 'gastei mais em maio ou junho?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'gastei mais em janeiro ou fevereiro?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparar janeiro com fevereiro', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparar abril com maio', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'mês passado vs esse mês', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparativo de maio e junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'esse mês foi melhor que o passado?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'como junho comparado com maio', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'compare maio com junho pra mim', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'diferença entre janeiro e março', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'qual mês destruiu mais meu bolso, março ou abril?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'fevereiro foi pior que janeiro?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'entre março e abril qual gastei mais', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparação mês passado e esse', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'qual foi mais caro, janeiro ou fevereiro', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'tô gastando mais agora do que no mês passado?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'melhorei de janeiro pra fevereiro?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'qual foi o pior mês, abril ou maio', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'maio ou junho: qual foi pior financeiramente', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'fui melhor ou pior que o mês passado', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'compara esse mês com o anterior', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparativo maio junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'compara março e junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'qual o delta entre abril e junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'o que mudou de maio pra junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'variação de março pra abril', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'esse mês vs mês passado', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparar despesas de maio e junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'em qual mês gastei menos, março ou abril', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'agosto foi pior que julho?', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'diferença de gastos entre março e abril', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'quanto variou de abril para maio', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'nubank em maio vs junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'ifood esse mês vs mês passado', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'gastei mais no credito em maio ou junho', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'comparar credito de dois meses', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'esse mes melhorou em relacao ao passado', intent: 'query', subtype: 'compare', tag: 'mega' },
  { input: 'fevereiro foi melhor que janeiro?', intent: 'query', subtype: 'compare', tag: 'mega' },

  // ─── BIGGEST — maiores gastos em todas as variações ──────────────────────
  { input: 'maiores gastos de junho', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'maiores gastos desse mês', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'top 5 gastos de maio', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'o que mais gastei esse mês', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'onde foi mais dinheiro esse mês', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'qual foi meu maior gasto', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'ranking de gastos de junho', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'quais as maiores despesas', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'me mostra os maiores gastos', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'qual despesa mais pesou no bolso', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'top gastos de março', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'maiores despesas do mês passado', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'maiores gastos em julho', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'gastos mais altos de fevereiro', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'quais minhas maiores despesas desse mês', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'o que pesou mais no mês', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'maior gasto de abril', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'despesas mais altas', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'me mostra o top 5 de gastos', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'quais foram os maiores gastos de maio', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'quanto foi o maior gasto', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'maiores gastos do trimestre', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'me fala os top gastos', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'qual conta mais pesada', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'detalha os maiores gastos', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'mostre o ranking de despesas desse mês', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'quero ver os maiores gastos de julho', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'quais gastos foram maiores em março', intent: 'query', subtype: 'biggest', tag: 'mega' },
  { input: 'me mostra os maiores de agosto', intent: 'query', subtype: 'biggest', tag: 'mega' },

  // ─── ANALYSIS — análise financeira em linguagem emocional/informal ────────
  { input: 'como estão minhas finanças desde janeiro', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'como foi meu ano financeiro', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'balanço geral do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'como estou financeiramente esse ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'situação das minhas finanças no ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'faz uma análise de como estão minhas finanças', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'análise detalhada dos 6 meses', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'como andou meu financeiro desde março', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'evolução financeira do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'performance financeira do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'resumo dos primeiros 6 meses do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'como estão andando minhas finanças', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'analise financeira desde fevereiro', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'balanço financeiro dos ultimos meses', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'estou me saindo bem com o dinheiro', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'balanço geral do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'análise financeira de janeiro a junho', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'resumo dos gastos do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'overview financeiro do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'avaliação das minhas finanças', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'análise da saúde financeira do ano', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'como foi meu ano financeiro', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'feedback financeiro dos ultimos meses', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'resumo anual das finanças', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'resumo anual', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'como foram os ultimos 3 meses', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'tendencia dos meus gastos', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'preciso ver como andam as financas', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'situacao financeira geral', intent: 'query', subtype: 'analysis', tag: 'mega' },
  { input: 'balanço dos ultimos 4 meses', intent: 'query', subtype: 'analysis', tag: 'mega' },

  // ─── SUMMARY — resumo do mês em todas as variações ───────────────────────
  { input: 'cadê meu dinheiro', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'to no zero esse mês?', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'como ta minha situacao financeira', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'sobrou alguma coisa esse mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto tenho disponível', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'como foi o mês de junho', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'financeiro do mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'visão geral do mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'o que saiu esse mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'qual meu saldo atual', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto saiu no total', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'resumo de junho', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'como foi maio', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'me mostra o mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto foi o gasto total', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'despesas do mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto custou esse mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'overview do mes', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'como foi o financeiro esse mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'to no vermelho esse mês', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto ja gastei', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'resumo detalhado do mes', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'o financeiro ta bom?', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto de saldo sobrou em junho', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'qual meu saldo de maio', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'situacao desse mes', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'quanto saiu em abril', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'relatorio do mes atual', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'como to em março', intent: 'query', subtype: 'summary', tag: 'mega' },
  { input: 'balanço de fevereiro', intent: 'query', subtype: 'summary', tag: 'mega' },

  // ─── BY_PAYMENT — gastos por forma de pagamento ───────────────────────────
  { input: 'quanto no nubank esse mês', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'extrato do nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'quanto fui no credito', intent: 'query', subtype: 'by_payment', tag: 'mega' },
  { input: 'gastos no debito esse mês', intent: 'query', subtype: 'by_payment', tag: 'mega' },
  { input: 'quanto saiu no pix', intent: 'query', subtype: 'by_payment', filter: 'pix', tag: 'mega' },
  { input: 'fatura do c6', intent: 'query', subtype: 'by_payment', filter: 'c6', tag: 'mega' },
  { input: 'gastei quanto no inter', intent: 'query', subtype: 'by_payment', filter: 'inter', tag: 'mega' },
  { input: 'tudo que saiu no nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'quais despesas no credito', intent: 'query', subtype: 'by_payment', tag: 'mega' },
  { input: 'total no nubank de junho', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'quanto foi pelo pix esse mes', intent: 'query', subtype: 'by_payment', filter: 'pix', tag: 'mega' },
  { input: 'me fala o c6', intent: 'query', subtype: 'by_payment', filter: 'c6', tag: 'mega' },
  { input: 'o inter ta alto?', intent: 'query', subtype: 'by_payment', filter: 'inter', tag: 'mega' },
  { input: 'gastei quanto no cartão de credito', intent: 'query', subtype: 'by_payment', tag: 'mega' },
  { input: 'compras no debito', intent: 'query', subtype: 'by_payment', tag: 'mega' },
  { input: 'transacoes do nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'saiu quanto no next', intent: 'query', subtype: 'by_payment', filter: 'next', tag: 'mega' },
  { input: 'gastos do bradesco', intent: 'query', subtype: 'by_payment', filter: 'bradesco', tag: 'mega' },
  { input: 'nubank de maio', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'despesas no c6 bank', intent: 'query', subtype: 'by_payment', filter: 'c6', tag: 'mega' },
  { input: 'quanto gastei pelo pix em junho', intent: 'query', subtype: 'by_payment', filter: 'pix', tag: 'mega' },
  { input: 'gastos com credito em maio', intent: 'query', subtype: 'by_payment', tag: 'mega' },
  { input: 'o que saiu no nubank', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'fatura nubank de junho', intent: 'query', subtype: 'by_payment', filter: 'nubank', tag: 'mega' },
  { input: 'total do pix no mes', intent: 'query', subtype: 'by_payment', filter: 'pix', tag: 'mega' },

  // ─── BY_NAME — despesas específicas ──────────────────────────────────────
  { input: 'quanto no ifood esse mês', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'mega' },
  { input: 'o ifood ta caro?', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'mega' },
  { input: 'netflix esse mês', intent: 'query', subtype: 'by_name', filter: 'netflix', tag: 'mega' },
  { input: 'uber de junho', intent: 'query', subtype: 'by_name', filter: 'uber', tag: 'mega' },
  { input: 'quanto de mercado', intent: 'query', subtype: 'by_name', filter: 'mercado', tag: 'mega' },
  { input: 'academia esse mês', intent: 'query', subtype: 'by_name', filter: 'academia', tag: 'mega' },
  { input: 'quanto foi o aluguel esse mês', intent: 'query', subtype: 'by_name', filter: 'aluguel', tag: 'mega' },
  { input: 'farmácia em junho', intent: 'query', subtype: 'by_name', filter: 'farmácia', tag: 'mega' },
  { input: 'quanto do spotify', intent: 'query', subtype: 'by_name', filter: 'spotify', tag: 'mega' },
  { input: 'total de combustivel', intent: 'query', subtype: 'by_name', filter: 'combustivel', tag: 'mega' },
  { input: 'quanto de agua e luz', intent: 'query', subtype: 'by_name', filter: 'agua', tag: 'mega' },
  { input: 'o que sai com supermercado', intent: 'query', subtype: 'by_name', filter: 'supermercado', tag: 'mega' },
  { input: 'seguro do carro de maio', intent: 'query', subtype: 'by_name', filter: 'seguro', tag: 'mega' },
  { input: 'quanto foi o aluguel em março', intent: 'query', subtype: 'by_name', filter: 'aluguel', tag: 'mega' },
  { input: 'gastos com restaurante', intent: 'query', subtype: 'by_name', filter: 'restaurante', tag: 'mega' },
  { input: 'quanto de luz esse mes', intent: 'query', subtype: 'by_name', filter: 'luz', tag: 'mega' },
  { input: 'me fala do ifood', intent: 'query', subtype: 'by_name', filter: 'ifood', tag: 'mega' },
  { input: 'corrida de taxi esse mês', intent: 'query', subtype: 'by_name', filter: 'taxi', tag: 'mega' },
  { input: 'conta de internet', intent: 'query', subtype: 'by_name', filter: 'internet', tag: 'mega' },
  { input: 'plano de saude de maio', intent: 'query', subtype: 'by_name', filter: 'saude', tag: 'mega' },
  { input: 'o condomínio esse mês', intent: 'query', subtype: 'by_name', filter: 'condomínio', tag: 'mega' },
  { input: 'gastos com delivery', intent: 'query', subtype: 'by_name', filter: 'delivery', tag: 'mega' },
  { input: 'quanto de steam esse mes', intent: 'query', subtype: 'by_name', filter: 'steam', tag: 'mega' },
  { input: 'total do combustivel de junho', intent: 'query', subtype: 'by_name', filter: 'combustivel', tag: 'mega' },
  { input: 'o que saiu com netflix', intent: 'query', subtype: 'by_name', filter: 'netflix', tag: 'mega' },

  // ─── BY_NAME_RANGE — histórico de despesas por nome ─────────────────────
  { input: 'ifood desde janeiro', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'netflix esse ano todo', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'quanto de aluguel desde marco', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'historico do ifood', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'uber durante o ano', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'tudo de academia nos ultimos meses', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'quanto gastei com netflix ao longo do ano', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'historico de gastos com ifood', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'spotify desde fevereiro', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'historico do aluguel de janeiro a junho', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'evolucao dos gastos com combustivel', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'tudo que gastei no mercado ao longo do ano', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'quanto de ifood acumulado', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'academia ao longo do ano', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'historico da conta de luz de janeiro ate agora', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'netflix primeiros 3 meses', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'uber nos ultimos 4 meses', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'quanto de condominio nos primeiros 6 meses', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'mercado desde marco', intent: 'query', subtype: 'by_name_range', tag: 'mega' },
  { input: 'ifood de janeiro a maio', intent: 'query', subtype: 'by_name_range', tag: 'mega' },

  // ─── SET_CREDIT_LIMIT — definir limite ───────────────────────────────────
  { input: 'define limite de 600 no inter', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'bota limite de 3000 no nubank', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'quero colocar limite de 2000 no c6', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'ajusta o limite do next para 1500', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'muda limite do nubank pra 4000', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'limite do bradesco é 5000', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'atualiza limite do c6 para 2500', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'coloca 1000 de limite no inter', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'o nubank tem limite de 6000', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'definir limite de credito do next como 800', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'meu limite no c6 é 3500', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'limite do cartao nubank 7000', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'adiciona limite de 900 no picpay', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'define 2000 de limite pro inter', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'o limite do meu nubank é 5500', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'configura limite de 4500 no bradesco', intent: 'set_credit_limit', tag: 'mega' },

  // ─── SET_CREDIT_LIMIT — remover limite ───────────────────────────────────
  { input: 'remova este limite', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'remova o limite do next', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'remove o limite de 400 reais do next', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'zera o limite do nubank', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'limpa o limite do inter', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'tira o limite do c6', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'apaga o limite do bradesco', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'cancela o limite do picpay', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'remova o limite do cartão nubank', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'quero remover o limite do next', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'tira esse limite do inter', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'retira o limite do c6', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'zerar o limite do bradesco', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'limpa esse limite do nubank', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'remover limite do cartao', intent: 'set_credit_limit', tag: 'mega' },
  { input: 'tira meu limite do nubank', intent: 'set_credit_limit', tag: 'mega' },

  // ─── CONCLUDE_EXPENSE — todas as formas de "pagar" ───────────────────────
  { input: 'paguei a netflix', intent: 'conclude_expense', tag: 'mega' },
  { input: 'quitei o aluguel', intent: 'conclude_expense', tag: 'mega' },
  { input: 'liquidei a conta de luz', intent: 'conclude_expense', tag: 'mega' },
  { input: 'finalizei o spotify', intent: 'conclude_expense', tag: 'mega' },
  { input: 'já paguei o condomínio', intent: 'conclude_expense', tag: 'mega' },
  { input: 'foi pago o aluguel', intent: 'conclude_expense', tag: 'mega' },
  { input: 'tá pago o ifood', intent: 'conclude_expense', tag: 'mega' },
  { input: 'marquei a academia como paga', intent: 'conclude_expense', tag: 'mega' },
  { input: 'deu baixa no nubank', intent: 'conclude_expense', tag: 'mega' },
  { input: 'paguei a conta da netflix', intent: 'conclude_expense', tag: 'mega' },
  { input: 'a netflix ta paga', intent: 'conclude_expense', tag: 'mega' },
  { input: 'quita o uber', intent: 'conclude_expense', tag: 'mega' },
  { input: 'fechar a netflix', intent: 'conclude_expense', tag: 'mega' },
  { input: 'marcar o aluguel como pago', intent: 'conclude_expense', tag: 'mega' },
  { input: 'conclua o spotify', intent: 'conclude_expense', tag: 'mega' },
  { input: 'baixa no condomínio', intent: 'conclude_expense', tag: 'mega' },
  { input: 'joga o ifood como concluído', intent: 'conclude_expense', tag: 'mega' },
  { input: 'netflix foi pago hoje', intent: 'conclude_expense', tag: 'mega' },
  { input: 'paga o aluguel', intent: 'conclude_expense', tag: 'mega' },
  { input: 'finaliza a academia', intent: 'conclude_expense', tag: 'mega' },
  { input: 'já quitei a internet', intent: 'conclude_expense', tag: 'mega' },
  { input: 'limpei a conta do nubank', intent: 'conclude_expense', tag: 'mega' },
  { input: 'fechar conta do spotify', intent: 'conclude_expense', tag: 'mega' },
  { input: 'o aluguel ta quitado', intent: 'conclude_expense', tag: 'mega' },
  { input: 'paguei tudo do nubank', intent: 'conclude_expense', tag: 'mega' },
  { input: 'a fatura ta paga', intent: 'conclude_expense', tag: 'mega' },

  // ─── CONCLUDE_EXPENSE — todas / bulk ─────────────────────────────────────
  { input: 'conclua todas as despesas do mês', intent: 'conclude_expense', tag: 'mega' },
  { input: 'paguei tudo esse mês', intent: 'conclude_expense', tag: 'mega' },
  { input: 'marcar tudo como pago', intent: 'conclude_expense', tag: 'mega' },
  { input: 'quitar todas as contas', intent: 'conclude_expense', tag: 'mega' },
  { input: 'concluir todos os gastos', intent: 'conclude_expense', tag: 'mega' },
  { input: 'ja paguei todas as contas', intent: 'conclude_expense', tag: 'mega' },
  { input: 'fechar todas as despesas', intent: 'conclude_expense', tag: 'mega' },
  { input: 'marcar todas como pagas', intent: 'conclude_expense', tag: 'mega' },
  { input: 'conclui todos os gastos do mês', intent: 'conclude_expense', tag: 'mega' },
  { input: 'tudo pago esse mês', intent: 'conclude_expense', tag: 'mega' },
  { input: 'liquidei tudo', intent: 'conclude_expense', tag: 'mega' },
  { input: 'zerei todas as contas', intent: 'conclude_expense', tag: 'mega' },

  // ─── REOPEN_EXPENSE — reabertura ─────────────────────────────────────────
  { input: 'reabre a netflix', intent: 'reopen_expense', tag: 'mega' },
  { input: 'reabrir o aluguel', intent: 'reopen_expense', tag: 'mega' },
  { input: 'desconcluir a academia', intent: 'reopen_expense', tag: 'mega' },
  { input: 'a netflix nao foi paga', intent: 'reopen_expense', tag: 'mega' },
  { input: 'volta o aluguel', intent: 'reopen_expense', tag: 'mega' },
  { input: 'reabra o spotify', intent: 'reopen_expense', tag: 'mega' },
  { input: 'reabre o ifood que errei', intent: 'reopen_expense', tag: 'mega' },
  { input: 'errei ao concluir netflix', intent: 'reopen_expense', tag: 'mega' },
  { input: 'desfaz o pagamento da netflix', intent: 'reopen_expense', tag: 'mega' },
  { input: 'cancelar pagamento do aluguel', intent: 'reopen_expense', tag: 'mega' },
  { input: 'reabre todas', intent: 'reopen_expense', tag: 'mega' },
  { input: 'reabrir todas as despesas', intent: 'reopen_expense', tag: 'mega' },
  { input: 'volta tudo pra aberto', intent: 'reopen_expense', tag: 'mega' },
  { input: 'desfaz todas as conclusoes', intent: 'reopen_expense', tag: 'mega' },
  { input: 'reabra todas as contas', intent: 'reopen_expense', tag: 'mega' },
  { input: 'a academia nao ta paga ainda', intent: 'reopen_expense', tag: 'mega' },
  { input: 'nao paguei a netflix ainda', intent: 'reopen_expense', tag: 'mega' },
  { input: 'tirar netflix de pago', intent: 'reopen_expense', tag: 'mega' },

  // ─── INCOME — todas as formas de registrar renda ─────────────────────────
  { input: 'recebi meu salário de 5000', intent: 'income', tag: 'mega' },
  { input: 'caiu 3500 na conta', intent: 'income', tag: 'mega' },
  { input: 'entrou meu pagamento de 4200', intent: 'income', tag: 'mega' },
  { input: 'ganhei 2000 de freelance', intent: 'income', tag: 'mega' },
  { input: 'recebi 1500 de comissão', intent: 'income', tag: 'mega' },
  { input: 'salário caiu hoje, 5800', intent: 'income', tag: 'mega' },
  { input: 'depósito de 3000 na conta', intent: 'income', tag: 'mega' },
  { input: 'renda de 2500 esse mês', intent: 'income', tag: 'mega' },
  { input: 'recebi bonus de 1000', intent: 'income', tag: 'mega' },
  { input: 'pagamento do trampo entrou, 4800', intent: 'income', tag: 'mega' },
  { input: 'ganhei 500 de aluguel', intent: 'income', tag: 'mega' },
  { input: 'entrou 700 de dividendos', intent: 'income', tag: 'mega' },
  { input: 'recebi 800 de renda extra', intent: 'income', tag: 'mega' },
  { input: 'salario de junho chegou, 5000', intent: 'income', tag: 'mega' },
  { input: 'adicionei renda de 3000', intent: 'income', tag: 'mega' },
  { input: 'recebi pagamento de servico 2500', intent: 'income', tag: 'mega' },
  { input: 'entrada de 1800 esse mês', intent: 'income', tag: 'mega' },
  { input: 'lancei minha renda de 4500', intent: 'income', tag: 'mega' },
  { input: 'quero registrar que ganhei 3200', intent: 'income', tag: 'mega' },
  { input: 'adicionei ganho de 600 reais', intent: 'income', tag: 'mega' },

  // ─── ADD_INSTALLMENTS — parcelamentos ────────────────────────────────────
  { input: 'parcelei o celular em 12x no nubank', intent: 'add_installments', tag: 'mega' },
  { input: 'comprei a tv parcelado em 6x', intent: 'add_installments', tag: 'mega' },
  { input: 'parcelas de 200 reais em 10x', intent: 'add_installments', tag: 'mega' },
  { input: 'fiz uma compra parcelada em 8x no c6', intent: 'add_installments', tag: 'mega' },
  { input: 'notebook parcelado 12x de 350', intent: 'add_installments', tag: 'mega' },
  { input: 'parcelei o sofá em 10x no bradesco', intent: 'add_installments', tag: 'mega' },
  { input: 'comprei parcelado em 6 vezes', intent: 'add_installments', tag: 'mega' },
  { input: 'fiz um parcelamento de geladeira', intent: 'add_installments', tag: 'mega' },
  { input: 'adicionei parcelas do celular', intent: 'add_installments', tag: 'mega' },
  { input: 'compra parcelada de 2400 em 12x', intent: 'add_installments', tag: 'mega' },
  { input: 'parcelei em 4x a roupa nova', intent: 'add_installments', tag: 'mega' },
  { input: 'parcelei o ar condicionado', intent: 'add_installments', tag: 'mega' },
  { input: 'curso parcelado em 6x de 150', intent: 'add_installments', tag: 'mega' },
  { input: 'registrar parcelamento do iphone', intent: 'add_installments', tag: 'mega' },
  { input: 'parcelei 400 no credito', intent: 'add_installments', tag: 'mega' },

  // ─── ADD_PROJECT — criar meta de poupança ────────────────────────────────
  { input: 'criar projeto viagem', intent: 'add_project', tag: 'mega' },
  { input: 'nova meta: comprar um carro', intent: 'add_project', tag: 'mega' },
  { input: 'cria projeto reforma da casa', intent: 'add_project', tag: 'mega' },
  { input: 'cria uma meta de 10000 pra viagem', intent: 'add_project', tag: 'mega' },
  { input: 'quero criar meta para notebook', intent: 'add_project', tag: 'mega' },
  { input: 'criar projeto reserva de emergencia com meta de 15000', intent: 'add_project', tag: 'mega' },
  { input: 'criar meta de poupança pra casamento', intent: 'add_project', tag: 'mega' },
  { input: 'adicionar meta de investimento', intent: 'add_project', tag: 'mega' },
  { input: 'quero criar um objetivo de poupança', intent: 'add_project', tag: 'mega' },
  { input: 'nova meta financeira: viagem europa', intent: 'add_project', tag: 'mega' },
  { input: 'criar projeto para guardar pro carro', intent: 'add_project', tag: 'mega' },
  { input: 'cria projeto reserva 20000', intent: 'add_project', tag: 'mega' },
  { input: 'meta: juntar pra dar entrada no apê', intent: 'add_project', tag: 'mega' },
  { input: 'novo objetivo de economia', intent: 'add_project', tag: 'mega' },

  // ─── UPDATE_PROJECT_SAVED — atualizar poupança ───────────────────────────
  { input: 'guardei 500 no projeto viagem', intent: 'update_project_saved', tag: 'mega' },
  { input: 'juntei mais 300 pro carro', intent: 'update_project_saved', tag: 'mega' },
  { input: 'adicionei 200 na reserva de emergência', intent: 'update_project_saved', tag: 'mega' },
  { input: 'economizei 400 este mês pro notebook', intent: 'update_project_saved', tag: 'mega' },
  { input: 'coloquei 800 no projeto casa', intent: 'update_project_saved', tag: 'mega' },
  { input: 'já tenho 3000 guardado pra viagem', intent: 'update_project_saved', tag: 'mega' },
  { input: 'atualiza guardado do projeto viagem para 2500', intent: 'update_project_saved', tag: 'mega' },
  { input: 'guardei mais 150 no carro', intent: 'update_project_saved', tag: 'mega' },
  { input: 'poupei 600 pra reserva', intent: 'update_project_saved', tag: 'mega' },
  { input: 'juntei 1000 reais pro projeto casa', intent: 'update_project_saved', tag: 'mega' },
  { input: 'guardei 250 na meta viagem', intent: 'update_project_saved', tag: 'mega' },
  { input: 'adiciona 500 na poupança do carro', intent: 'update_project_saved', tag: 'mega' },
  { input: 'já tenho 5000 na reserva de emergência', intent: 'update_project_saved', tag: 'mega' },

  // ─── UPDATE_DUE_DATE — vencimento ────────────────────────────────────────
  { input: 'vencimento da netflix é dia 20', intent: 'update_due_date', tag: 'mega' },
  { input: 'a academia vence no dia 5', intent: 'update_due_date', tag: 'mega' },
  { input: 'muda o vencimento do aluguel para dia 10', intent: 'update_due_date', tag: 'mega' },
  { input: 'aluguel vence dia 15', intent: 'update_due_date', tag: 'mega' },
  { input: 'atualiza o dia de vencimento do spotify para 12', intent: 'update_due_date', tag: 'mega' },
  { input: 'data de vencimento do nubank é dia 1', intent: 'update_due_date', tag: 'mega' },
  { input: 'o vencimento do condomínio é dia 10', intent: 'update_due_date', tag: 'mega' },
  { input: 'muda netflix para vencer dia 25', intent: 'update_due_date', tag: 'mega' },
  { input: 'colocar vencimento da internet no dia 8', intent: 'update_due_date', tag: 'mega' },
  { input: 'a conta de luz vence dia 7', intent: 'update_due_date', tag: 'mega' },
  { input: 'trocar vencimento da academia para dia 3', intent: 'update_due_date', tag: 'mega' },
  { input: 'definir dia 20 como vencimento do cartao nubank', intent: 'update_due_date', tag: 'mega' },

  // ─── TOGGLE_SETTING — configurações ──────────────────────────────────────
  { input: 'ativa o modo investidor', intent: 'toggle_setting', tag: 'mega' },
  { input: 'desativa modo investidor', intent: 'toggle_setting', tag: 'mega' },
  { input: 'ligar modo investidor', intent: 'toggle_setting', tag: 'mega' },
  { input: 'desligar contribuições', intent: 'toggle_setting', tag: 'mega' },
  { input: 'quero ativar os investimentos', intent: 'toggle_setting', tag: 'mega' },
  { input: 'habilitar contribuições', intent: 'toggle_setting', tag: 'mega' },
  { input: 'desabilitar modo investidor', intent: 'toggle_setting', tag: 'mega' },
  { input: 'liga as contribuições', intent: 'toggle_setting', tag: 'mega' },
  { input: 'desligar dízimo', intent: 'toggle_setting', tag: 'mega' },
  { input: 'ativar portfólio de investimentos', intent: 'toggle_setting', tag: 'mega' },
  { input: 'desativar as contribuições mensais', intent: 'toggle_setting', tag: 'mega' },
  { input: 'desativa o modo investidor', intent: 'toggle_setting', tag: 'mega' },

  // ─── SET_CONTRIBUTION_PCT — percentual de contribuição ───────────────────
  { input: 'meu dízimo é 10%', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'contribuição de 15 porcento', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'defina 8% de contribuição', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'definir dízimo de 10%', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'meta de contribuição 12%', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'mudo o dizimo pra 10%', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'contribuicao mensal de 5 por cento', intent: 'set_contribution_pct', tag: 'mega' },
  { input: 'minha contribuição é 20%', intent: 'set_contribution_pct', tag: 'mega' },

  // ─── SET_USER_NAME — nome do usuário ─────────────────────────────────────
  { input: 'meu nome é Gabriel', intent: 'set_user_name', tag: 'mega' },
  { input: 'pode me chamar de Gabi', intent: 'set_user_name', tag: 'mega' },
  { input: 'me chamo João', intent: 'set_user_name', tag: 'mega' },
  { input: 'muda meu nome para Carlos', intent: 'set_user_name', tag: 'mega' },
  { input: 'troca meu nome pra Pedro', intent: 'set_user_name', tag: 'mega' },
  { input: 'atualiza meu nome para Ana', intent: 'set_user_name', tag: 'mega' },
  { input: 'meu nome agora é Marcos', intent: 'set_user_name', tag: 'mega' },
  { input: 'coloca meu nome como Lucas', intent: 'set_user_name', tag: 'mega' },

  // ─── SET_AVATAR — foto de perfil ─────────────────────────────────────────
  { input: 'quero trocar minha foto', intent: 'set_avatar', tag: 'mega' },
  { input: 'mudar foto de perfil', intent: 'set_avatar', tag: 'mega' },
  { input: 'atualizar meu avatar', intent: 'set_avatar', tag: 'mega' },
  { input: 'nova foto pra minha conta', intent: 'set_avatar', tag: 'mega' },
  { input: 'trocar foto do perfil', intent: 'set_avatar', tag: 'mega' },
  { input: 'quero mudar meu avatar', intent: 'set_avatar', tag: 'mega' },
  { input: 'coloca nova foto pra mim', intent: 'set_avatar', tag: 'mega' },
  { input: 'muda meu avatar', intent: 'set_avatar', tag: 'mega' },
  { input: 'manda nova foto de perfil', intent: 'set_avatar', tag: 'mega' },

  // ─── EXPORT — exportar dados ─────────────────────────────────────────────
  { input: 'exporta meus dados', intent: 'export', tag: 'mega' },
  { input: 'gerar planilha', intent: 'export', tag: 'mega' },
  { input: 'quero baixar meus dados', intent: 'export', tag: 'mega' },
  { input: 'arquivo csv das despesas', intent: 'export', tag: 'mega' },
  { input: 'exportar gastos', intent: 'export', tag: 'mega' },
  { input: 'download dos dados', intent: 'export', tag: 'mega' },
  { input: 'gera um csv', intent: 'export', tag: 'mega' },
  { input: 'exportar relatorio', intent: 'export', tag: 'mega' },
  { input: 'quero ver meus dados em excel', intent: 'export', tag: 'mega' },
  { input: 'backup dos dados', intent: 'export', tag: 'mega' },

  // ─── INVESTMENTS — carteira de investimentos ──────────────────────────────
  { input: 'como estao meus investimentos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'meu portfolio', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'rendimento dos investimentos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'quanto ta minha carteira', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'performance dos investimentos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'saldo de investimentos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'meus ativos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'quanto tenho investido', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'retorno dos meus investimentos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'como vai minha carteira de investimentos', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'ver meu portfolio', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'investimentos estao rendendo', intent: 'query', subtype: 'investments', tag: 'mega' },
  { input: 'mostra minha carteira', intent: 'query', subtype: 'investments', tag: 'mega' },

  // ─── PROJECTS — metas e projetos ─────────────────────────────────────────
  { input: 'como estao os projetos', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'status das metas', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'ver meus projetos', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'quanto falta pra meta da viagem', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'metas de poupança', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'status dos meus projetos', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'como ta o projeto viagem', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'quanto guardei no projeto viagem', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'progresso das metas', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'quanto falta pra juntar o carro', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'overview dos projetos', intent: 'query', subtype: 'projects', tag: 'mega' },
  { input: 'minhas metas financeiras', intent: 'query', subtype: 'projects', tag: 'mega' },

  // ─── BY_WEEK — semana atual ───────────────────────────────────────────────
  { input: 'gastos dessa semana', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'o que saiu essa semana', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'despesas da semana', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'total da semana', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'resumo semanal', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'quanto gastei na semana', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'gastos nos ultimos 7 dias', intent: 'query', subtype: 'by_week', tag: 'mega' },
  { input: 'semana atual financeiro', intent: 'query', subtype: 'by_week', tag: 'mega' },

  // ─── CHAT — conversas que NÃO são consulta financeira ────────────────────
  { input: 'oi tudo bem', intent: 'chat', tag: 'mega' },
  { input: 'bom dia jarvis', intent: 'chat', tag: 'mega' },
  { input: 'boa tarde', intent: 'chat', tag: 'mega' },
  { input: 'o que você consegue fazer', intent: 'chat', tag: 'mega' },
  { input: 'quais são seus comandos', intent: 'chat', tag: 'mega' },
  { input: 'me ajuda', intent: 'chat', tag: 'mega' },
  { input: 'valeu jarvis', intent: 'chat', tag: 'mega' },
  { input: 'obrigado', intent: 'chat', tag: 'mega' },
  { input: 'que bom dia hein', intent: 'chat', tag: 'mega' },
  { input: 'você sabe tudo né', intent: 'chat', tag: 'mega' },
  { input: 'jarvis preciso de ajuda', intent: 'chat', tag: 'mega' },
  { input: 'me conta o que você pode fazer', intent: 'chat', tag: 'mega' },
  { input: 'blz', intent: 'chat', tag: 'mega' },
  { input: 'eai jarvis', intent: 'chat', tag: 'mega' },
  { input: 'tô aqui', intent: 'chat', tag: 'mega' },
  { input: 'opa jarvis', intent: 'chat', tag: 'mega' },
  { input: 'olá', intent: 'chat', tag: 'mega' },
  { input: 'hey', intent: 'chat', tag: 'mega' },
  { input: 'salve jarvis', intent: 'chat', tag: 'mega' },

  // ─── UNSUPPORTED — comandos fora do escopo do bot ────────────────────────
  { input: 'adicionar forma de pagamento', intent: 'unsupported', tag: 'mega' },
  { input: 'criar cartão no app', intent: 'unsupported', tag: 'mega' },
  { input: 'adicionar novo cartão de credito', intent: 'unsupported', tag: 'mega' },
  { input: 'fechar todos os meses de uma vez', intent: 'unsupported', tag: 'mega' },
  { input: 'reabrir todos os meses', intent: 'unsupported', tag: 'mega' },
  { input: 'adicionar nova forma de pagamento', intent: 'unsupported', tag: 'mega' },
  { input: 'remover cartão de crédito do app', intent: 'unsupported', tag: 'mega' },
  { input: 'quero remover uma forma de pagamento', intent: 'unsupported', tag: 'mega' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SEÇÃO 3: NEGATIVOS
// ─────────────────────────────────────────────────────────────────────────────

const NEGATIVE = [
  { input: 'quanto recebi de salário', not_intent: 'income', why: '"quanto" bloqueia income' },
  { input: 'total de renda esse mês', not_intent: 'income', why: '"total" bloqueia income' },
  { input: 'histórico de receita', not_intent: 'income', why: '"histórico" bloqueia income' },
  { input: 'resumo da renda', not_intent: 'income', why: '"resumo" bloqueia income' },
  { input: 'gastos de salário', not_intent: 'income', why: '"gastos" bloqueia income' },
  { input: 'parcelei no nubank', not_intent: 'query', why: 'add_installments tem prioridade sobre by_payment' },
  { input: 'parcelei no crédito em 6x', not_intent: 'query', why: 'add_installments antes de cardMatch' },
  { input: 'fechar todos os meses', not_intent: 'conclude_expense', why: '"todos os meses" → unsupported, não bulk conclude do mês atual' },
  { input: 'reabra todos os meses', not_intent: 'reopen_expense', why: '"todos os meses" → unsupported' },
  { input: 'guardei 500 pra viagem', not_intent: 'query', why: 'update_project_saved intercepta antes de projects' },
  { input: 'cria projeto viagem', not_intent: 'query', why: 'add_project intercepta antes de projects query' },
  { input: 'adiciona cartão novo', not_intent: 'query', why: 'unsupported payment_method' },
  { input: 'como foi o ano', not_intent: 'summary', why: '"ano" → analysis, não summary' },
  { input: 'histórico do ifood', not_intent: 'summary', why: 'by_name_range tem prioridade' },
  { input: 'ifood desde janeiro', not_intent: 'summary', why: '"desde" → by_name_range' },
  { input: 'vencimento da netflix para dia 15', not_intent: 'conclude_expense', why: 'update_due_date intercepta' },
  { input: 'oi jarvis', not_intent: 'query', why: 'saudação = chat' },
  { input: 'obrigado', not_intent: 'query', why: 'agradecimento = chat' },
  { input: 'resumo do ano', not_intent: 'summary', why: '"ano" → analysis' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SEÇÃO 4: EXPANSÃO GEMINI
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_CASES = [
  { label: 'summary informal/slang', expected: { intent: 'query', subtype: 'summary' },
    seeds: ['como tá o mês','to bem financeiramente','resumo do mes','tô no vermelho','balanço geral','quanto sobrou','saldo do mês','situação financeira'] },
  { label: 'by_payment nubank', expected: { intent: 'query', subtype: 'by_payment', filter: 'nubank' },
    seeds: ['quanto gastei no nubank','nubank esse mês','total nubank','gastos nu','fatura do nubank','nubank mes','sangrou no nu'] },
  { label: 'conclude variações', expected: { intent: 'conclude_expense' },
    seeds: ['conclua a netflix','paguei a internet','quita o aluguel','marquei como pago','já paguei','deu baixa','liquidei'] },
  { label: 'income variado', expected: { intent: 'income' },
    seeds: ['recebi 5000 de salário','salário caiu','ganhei freelance de 800','entrou 3000','faturei este mês','bônus caiu','caiu meu salário'] },
  { label: 'analysis multi-mês', expected: { intent: 'query', subtype: 'analysis' },
    seeds: ['análise do ano','como foi o semestre','feedback dos primeiros 3 meses','resumo do período','últimos meses como foram','balanço do ano'] },
  { label: 'compare entre meses', expected: { intent: 'query', subtype: 'compare' },
    seeds: ['nubank mês passado vs esse','gastei mais no nubank?','diferença de gastos','evoluí?','mês a mês','compara os meses','variação mensal'] },
  { label: 'add_installments diverso', expected: { intent: 'add_installments' },
    seeds: ['parcelei TV 1200 em 6x','comprei notebook parcelado em 12x','dividi em 4 vezes','financiei moto','10x no crédito o iPhone','parcelei 500 em 3x'] },
  { label: 'toggle on/off', expected: { intent: 'toggle_setting' },
    seeds: ['ativa modo investidor','desativa investidor','liga contribuições','desliga dízimo','habilita investimentos','desabilita contribuições'] },
  { label: 'reopen variado', expected: { intent: 'reopen_expense' },
    seeds: ['reabra a netflix','reabre o aluguel','desconclui ifood','reabrir academia','desfaz o pagamento','volta tudo pra aberto','reabre todas'] },
  { label: 'add_project detalhado', expected: { intent: 'add_project' },
    seeds: ['cria projeto viagem meta 8000','nova meta carro 30000 por 800','adiciona objetivo reserva 10000','quero poupar pra viagem','novo objetivo carro'] },
  { label: 'biggest gastos', expected: { intent: 'query', subtype: 'biggest' },
    seeds: ['maiores gastos','o que mais gastei','top 5 gastos','o que custou mais','maior despesa','o que sangrou','apertou no bolso'] },
  { label: 'investments variado', expected: { intent: 'query', subtype: 'investments' },
    seeds: ['como estão meus investimentos','minha carteira','cripto hoje','bitcoin quanto tá','fii','cdb','como vai a bolsa'] },
];

// ─────────────────────────────────────────────────────────────────────────────
//  RUNNER
// ─────────────────────────────────────────────────────────────────────────────

function checkResult(result, expected) {
  if (!result) return false;
  if (result.intent !== expected.intent) return false;
  if (expected.subtype && result.params?.subtype !== expected.subtype) return false;
  if (expected.filter) {
    const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const f = deaccent(result.params?.filter || '');
    if (!f.includes(deaccent(expected.filter))) return false;
  }
  if (expected.month) {
    const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const m = deaccent(result.params?.month || '');
    if (!m.includes(deaccent(expected.month))) return false;
  }
  return true;
}

function groupKey(s) {
  if (s.intent === 'query') return `query:${s.subtype || 'unknown'}`;
  return s.intent || 'unknown';
}

async function runSeeds(seeds, label) {
  const groups = {};
  let totalPass = 0, totalFail = 0;
  const failures = [];

  for (const s of seeds) {
    const tag = s.tag || '';
    if (ONLY_TAG && tag !== ONLY_TAG) continue;
    let result;
    try { result = await classifyIntent(s.input); } catch { result = null; }
    const ok = checkResult(result, s);
    const key = groupKey(s);
    if (!groups[key]) groups[key] = { pass: 0, fail: 0, list: [] };
    if (ok) { groups[key].pass++; totalPass++; }
    else {
      groups[key].fail++; totalFail++;
      failures.push({ input: s.input, expected: s, got: result, tag });
      groups[key].list.push({ input: s.input, expected: s, got: result });
    }
  }

  const BW = 26;
  console.log(`\n${'─'.repeat(68)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(68));
  for (const key of Object.keys(groups).sort()) {
    const g = groups[key];
    const total = g.pass + g.fail;
    if (total === 0) continue;
    const pct = Math.round((g.pass / total) * 100);
    const filled = Math.round((pct / 100) * BW);
    const bar = '█'.repeat(filled) + '░'.repeat(BW - filled);
    const icon = pct === 100 ? '✅' : pct >= 80 ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${key.padEnd(30)} ${bar} ${String(pct + '%').padStart(4)} (${g.pass}/${total})`);
    if (g.list.length > 0 && !ONLY_FAIL) {
      g.list.slice(0, 2).forEach(f => {
        const got = f.got ? `${f.got.intent}${f.got.params?.subtype ? ':' + f.got.params.subtype : ''}` : 'null';
        const exp = `${f.expected.intent}${f.expected.subtype ? ':' + f.expected.subtype : ''}`;
        console.log(`       ✗ "${f.input.slice(0, 52)}"`);
        console.log(`         exp:${exp}  got:${got}`);
      });
      if (g.list.length > 2) console.log(`         ... e mais ${g.list.length - 2}`);
    }
  }
  const pct = totalPass + totalFail > 0 ? Math.round((totalPass / (totalPass + totalFail)) * 100) : 100;
  console.log(`\n  TOTAL: ${totalPass}/${totalPass + totalFail} (${pct}%)`);
  return { totalPass, totalFail, pct, failures };
}

async function runNegatives() {
  console.log(`\n${'─'.repeat(68)}`);
  console.log('  NEGATIVOS — inputs que NÃO devem retornar intent específica');
  console.log('─'.repeat(68));
  let pass = 0, fail = 0;
  for (const n of NEGATIVE) {
    const result = await classifyIntent(n.input);
    if (result?.intent !== n.not_intent) { pass++; }
    else {
      fail++;
      console.log(`  ❌ "${n.input}"`);
      console.log(`     ${n.why}`);
      console.log(`     Retornou: ${n.not_intent} (deveria ser qualquer outra coisa)`);
    }
  }
  const pct = Math.round((pass / (pass + fail)) * 100);
  console.log(`\n  TOTAL NEGATIVOS: ${pass}/${pass + fail} (${pct}%)`);
  return { pass, fail, pct };
}

async function runGeminiExpansion() {
  const GU = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.log('  ⚠️  GEMINI_API_KEY não definida — pulando expansão Gemini'); return null; }
  console.log(`\n${'─'.repeat(68)}`);
  console.log('  EXPANSÃO GEMINI — variações geradas dinamicamente');
  console.log('─'.repeat(68));
  let totalPass = 0, totalFail = 0;
  for (const c of GEMINI_CASES) {
    await sleep(4500);
    let variations = [...c.seeds];
    try {
      const prompt = `Você é testador de chatbot financeiro PT-BR. Label: "${c.label}".
Gere 30 variações DISTINTAS das frases abaixo — mesmo significado, formas muito diferentes.
Inclua: gírias BR, abreviações, typos leves, 1-3 palavras, mensagens longas, emojis, caps parcial, inglês misturado, voz ativa/passiva.
Seeds: ${c.seeds.join(' | ')}
Retorne SOMENTE um array JSON de strings. Sem markdown.`;
      const res = await fetch(`${GU}?key=${key}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.97, maxOutputTokens: 1500 } }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      variations = [...new Set([...c.seeds, ...JSON.parse(raw.replace(/```json|```/g, '').trim())])];
    } catch (e) { console.warn(`  ⚠️  Gemini falhou para "${c.label}": ${e.message}`); }
    let pass = 0, fail = 0; const fails = [];
    for (const msg of variations) {
      const result = await classifyIntent(msg);
      if (checkResult(result, c.expected)) { pass++; totalPass++; }
      else { fail++; totalFail++; fails.push({ msg, intent: result?.intent, sub: result?.params?.subtype }); }
    }
    const pct = Math.round((pass / variations.length) * 100);
    console.log(`\n  ${pct >= 90 ? '✅' : pct >= 70 ? '⚠️ ' : '❌'} ${c.label.padEnd(34)} ${pct}% (${pass}/${variations.length})`);
    fails.slice(0, 2).forEach(f => console.log(`     ✗ "${f.msg}" → ${f.intent}:${f.sub || '-'}`));
    if (fails.length > 2) console.log(`     ... e mais ${fails.length - 2}`);
  }
  const pct = Math.round((totalPass / (totalPass + totalFail)) * 100);
  console.log(`\n  GEMINI TOTAL: ${totalPass}/${totalPass + totalFail} (${pct}%)`);
  return { totalPass, totalFail, pct };
}

async function main() {
  const ALL = [...GENERATED, ...MANUAL];
  const tagCounts = {};
  for (const s of MANUAL) tagCounts[s.tag || '-'] = (tagCounts[s.tag || '-'] || 0) + 1;

  console.log('═'.repeat(68));
  console.log('  JARVIS — Suite de Testes Exaustiva do Classificador');
  console.log(`  Seeds gerados:   ${GENERATED.length}`);
  console.log(`  Seeds manuais:   ${MANUAL.length}  [${Object.entries(tagCounts).map(([k,v])=>`${k}:${v}`).join(' ')}]`);
  console.log(`  Negativos:       ${NEGATIVE.length}`);
  console.log(`  TOTAL POSITIVOS: ${ALL.length}`);
  console.log(`  Modo: ${USE_GEMINI ? 'completo (Gemini incluso)' : 'local + golden set'}${ONLY_TAG ? ' | tag:' + ONLY_TAG : ''}`);
  console.log('═'.repeat(68));

  const r1 = await runSeeds(ALL, `POSITIVOS — ${ALL.length} seeds`);
  const r2 = await runNegatives();
  const r3 = USE_GEMINI ? await runGeminiExpansion() : null;

  const totalTests = r1.totalPass + r1.totalFail + r2.pass + r2.fail + (r3 ? r3.totalPass + r3.totalFail : 0);
  const totalPassed = r1.totalPass + r2.pass + (r3 ? r3.totalPass : 0);
  const finalPct = Math.round((totalPassed / totalTests) * 100);

  console.log('\n' + '═'.repeat(68));
  console.log('  RESULTADO FINAL');
  console.log('═'.repeat(68));
  console.log(`  Positivos:  ${r1.totalPass}/${r1.totalPass + r1.totalFail} (${r1.pct}%)`);
  console.log(`  Negativos:  ${r2.pass}/${r2.pass + r2.fail} (${r2.pct}%)`);
  if (r3) console.log(`  Gemini:     ${r3.totalPass}/${r3.totalPass + r3.totalFail} (${r3.pct}%)`);
  console.log(`\n  SCORE GERAL: ${totalPassed}/${totalTests} (${finalPct}%)`);
  const grade = finalPct >= 97 ? '🏆 ELITE' : finalPct >= 93 ? '🥇 EXCELENTE' : finalPct >= 85 ? '✅ BOM' : finalPct >= 70 ? '⚠️  REGULAR' : '❌ PRECISA MELHORAR';
  console.log(`  ${grade}`);
  console.log('═'.repeat(68));

  if (ONLY_FAIL) {
    console.log('\n  FALHAS DETALHADAS:');
    r1.failures.forEach(f => {
      const got = f.got ? `${f.got.intent}${f.got.params?.subtype ? ':' + f.got.params.subtype : ''}` : 'null';
      const exp = `${f.expected.intent}${f.expected.subtype ? ':' + f.expected.subtype : ''}`;
      console.log(`  [${f.tag || '-'}] "${f.input}"`);
      console.log(`    exp:${exp}  got:${got}`);
    });
  }

  writeFileSync(new URL('./test-report.json', import.meta.url),
    JSON.stringify({ date: new Date().toISOString(), totalTests, totalPassed, score: finalPct,
      phase1: r1, phase2: r2, phase3: r3 || null }, null, 2));
  console.log('\n  Relatório salvo em bot/test-report.json\n');
  process.exit(finalPct >= 85 ? 0 : 1);
}

main().catch(console.error);
