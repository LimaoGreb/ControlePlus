#!/usr/bin/env node
// Testa o classificador local do Jarvis.
// Usa Gemini pra gerar variações informais/abreviadas de cada intenção.
// Rodar: node bot/test-classifier.js
//
// Requer GEMINI_API_KEY no ambiente (mesmo do bot).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { classifyIntent } from './geminiClient.js';

// Carrega .env local sem precisar do pacote dotenv
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  readFileSync(join(__dir, '.env'), 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
} catch {}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── Golden set: uma entrada por intenção ──────────────────────────────────────
// Cada caso tem: label, expected (intent + subtype obrigatório + filter/month opcionais),
// e seeds (exemplos canônicos pra Gemini expandir).

const CASES = [
  {
    label: 'summary — mês atual',
    expected: { intent: 'query', subtype: 'summary' },
    seeds: ['como tá o mês', 'resumo do mês', 'balanço geral', 'como estou financeiramente', 'tô bem esse mês?'],
  },
  {
    label: 'summary — mês específico',
    expected: { intent: 'query', subtype: 'summary', month: 'abril' },
    seeds: ['resumo de abril', 'como foi abril', 'balanço de abril', 'mês de abril', 'gastos totais de abril'],
  },
  {
    label: 'by_payment — nubank',
    expected: { intent: 'query', subtype: 'by_payment', filter: 'nubank' },
    seeds: ['quanto gastei no nubank', 'gastos nubank esse mês', 'nubank esse mês', 'total nubank', 'o que foi no nubank'],
  },
  {
    label: 'by_payment — pix',
    expected: { intent: 'query', subtype: 'by_payment', filter: 'pix' },
    seeds: ['quanto saiu no pix', 'gastos no pix', 'pix esse mês', 'total de pix', 'o que paguei no pix'],
  },
  {
    label: 'biggest — mês atual',
    expected: { intent: 'query', subtype: 'biggest' },
    seeds: ['maiores gastos', 'top gastos do mês', 'o que mais gastei', 'pior gasto do mês', 'o que custou mais'],
  },
  {
    label: 'investments',
    expected: { intent: 'query', subtype: 'investments' },
    seeds: ['como estão meus investimentos', 'minha carteira', 'quanto tenho investido', 'rendimento da carteira', 'status dos investimentos'],
  },
  {
    label: 'projects',
    expected: { intent: 'query', subtype: 'projects' },
    seeds: ['status dos projetos', 'como estão minhas metas', 'projetos', 'quanto falta pras metas', 'meus objetivos'],
  },
  {
    label: 'by_name — ifood',
    expected: { intent: 'query', subtype: 'by_name', filter: 'ifood' },
    seeds: ['quanto gastei no ifood', 'gastos ifood', 'ifood esse mês', 'total ifood', 'o que foi pro ifood'],
  },
  {
    label: 'by_name_range — ifood desde janeiro',
    expected: { intent: 'query', subtype: 'by_name_range' },
    seeds: ['quanto gastei em ifood desde janeiro', 'ifood desde o início do ano', 'histórico de ifood', 'ifood nos últimos meses', 'quanto gastei em uber esse ano'],
  },
  {
    label: 'analysis — período',
    expected: { intent: 'query', subtype: 'analysis' },
    seeds: ['análise do ano', 'feedback dos primeiros 3 meses', 'como foi o ano', 'análise dos últimos 4 meses', 'resumo do período'],
  },
  {
    label: 'compare — nubank mês passado vs esse mês',
    expected: { intent: 'query', subtype: 'compare' },
    seeds: ['comparativo do nubank mês passado vs esse mês', 'compara meus gastos do nubank entre os meses', 'diferença nubank mês passado e atual', 'nubank evoluiu esse mês?', 'gastei mais no nubank esse mês ou no anterior'],
  },
  {
    label: 'add_installments',
    expected: { intent: 'add_installments' },
    seeds: ['parcelei a TV 1200 em 6x no crédito', 'parcelei o notebook em 12x', 'comprei um celular parcelado em 10x', 'parcelei 500 reais em 3x no nubank', 'dividi uma compra em 4 vezes'],
  },
  {
    label: 'update_due_date',
    expected: { intent: 'update_due_date' },
    seeds: ['vencimento da Netflix para dia 15', 'muda o vencimento da internet pra dia 10', 'Netflix vence dia 20 agora', 'atualiza o vencimento da conta de luz pra 5', 'muda o dia do nubank pra 10'],
  },
  {
    label: 'conclude_expense',
    expected: { intent: 'conclude_expense' },
    seeds: ['conclua a Netflix', 'marque o aluguel como pago', 'paguei o carteiro', 'quita a fatura do nubank', 'já paguei a internet'],
  },
  {
    label: 'export',
    expected: { intent: 'export' },
    seeds: ['exporta meus dados', 'quero um CSV', 'baixar planilha', 'exportar relatório', 'me manda os dados em planilha'],
  },
  {
    label: 'by_week',
    expected: { intent: 'query', subtype: 'by_week' },
    seeds: ['gastos essa semana', 'o que gastei essa semana', 'resumo da semana', 'quanto saiu essa semana', 'semana atual'],
  },
];

// ─── Gera variações via Gemini ────────────────────────────────────────────────

async function generateVariations(label, seeds, count = 20) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return seeds; // sem key, usa só os seeds

  const prompt = `Você é um testador de chatbot financeiro em PT-BR.
Dado o contexto "${label}", gere ${count} variações DIFERENTES de mensagens que um usuário poderia enviar com o MESMO significado.
Inclua: gírias, abreviações (nu = nubank, ifd = ifood, parcela = add_installments), erros de digitação, frases muito curtas, frases longas, linguagem informal, falta de acentos, caps lock parcial, emojis no meio, mistura de inglês, voz passiva, perguntas invertidas.
Seeds para referência: ${seeds.join(' | ')}
Retorne SOMENTE um array JSON com as strings, sem markdown, sem explicação.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1000 },
      }),
    });
    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return [...new Set([...seeds, ...parsed])];
  } catch (e) {
    console.warn(`  ⚠️  Gemini falhou para "${label}": ${e.message}`);
    return seeds;
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runCase(c) {
  console.log(`\n🔍 ${c.label}`);
  const variations = await generateVariations(c.label, c.seeds);
  console.log(`   ${variations.length} variações geradas`);

  let pass = 0, fail = 0;
  const failures = [];

  for (const msg of variations) {
    const result = await classifyIntent(msg);
    const intentOk = result.intent === c.expected.intent;
    const subtypeOk = !c.expected.subtype || result.params?.subtype === c.expected.subtype;
    const filterOk = !c.expected.filter || (result.params?.filter || '').toLowerCase().includes(c.expected.filter.toLowerCase());

    if (intentOk && subtypeOk && filterOk) {
      pass++;
    } else {
      fail++;
      failures.push({ msg, got: { intent: result.intent, subtype: result.params?.subtype, filter: result.params?.filter } });
    }
  }

  const pct = Math.round((pass / variations.length) * 100);
  const icon = pct >= 90 ? '✅' : pct >= 70 ? '⚠️ ' : '❌';
  console.log(`   ${icon} ${pass}/${variations.length} (${pct}%)`);

  if (failures.length > 0) {
    console.log('   Falhas:');
    failures.slice(0, 5).forEach(f => {
      console.log(`     ✗ "${f.msg}"`);
      console.log(`       → intent=${f.got.intent} subtype=${f.got.subtype || '-'} filter=${f.got.filter || '-'}`);
    });
    if (failures.length > 5) console.log(`     ... e mais ${failures.length - 5}`);
  }

  return { label: c.label, pass, total: variations.length, pct, failures };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  JARVIS — Teste do classificador de intenções');
  console.log('='.repeat(60));
  console.log(`  ${CASES.length} intenções × ~20 variações cada`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('  ⚠️  GEMINI_API_KEY não definida — usando apenas seeds fixos');
  }

  const results = [];
  for (const c of CASES) {
    results.push(await runCase(c));
  }

  console.log('\n' + '='.repeat(60));
  console.log('  RESUMO');
  console.log('='.repeat(60));
  const total = results.reduce((s, r) => s + r.total, 0);
  const totalPass = results.reduce((s, r) => s + r.pass, 0);
  const overall = Math.round((totalPass / total) * 100);

  results.sort((a, b) => a.pct - b.pct).forEach(r => {
    const icon = r.pct >= 90 ? '✅' : r.pct >= 70 ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${String(r.pct + '%').padStart(4)}  ${r.label}`);
  });

  console.log(`\n  TOTAL: ${totalPass}/${total} (${overall}%)`);
  console.log('='.repeat(60));

  // Salva relatório em JSON
  const report = { date: new Date().toISOString(), overall, results };
  const { writeFileSync } = await import('fs');
  writeFileSync(new URL('./test-report.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log('  Relatório salvo em bot/test-report.json');
}

main().catch(console.error);
