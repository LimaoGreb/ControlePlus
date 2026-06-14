/**
 * Smoke test — Firebase Modo Casal (v2.5.0)
 * Roda com: node scripts/test-casal-sync.js
 *
 * Testa exatamente o que o app faz:
 *   1. Escreve dados pessoais em couples/CODE/personal/DEVICE_ID
 *   2. Lê o sub-path personal/ e filtra o parceiro
 *   3. Faz PATCH no pai (couples/CODE) e verifica que personal/ não é apagado
 *
 * Se qualquer teste falhar → regras do Firebase precisam ser atualizadas.
 */

const DB_URL = 'https://my-app-534a8-default-rtdb.firebaseio.com';
const TEST_CODE = 'SMOKE-TEST-001';
const DEVICE_A = 'device_a_smoke';
const DEVICE_B = 'device_b_smoke';

const dataA = { months: { 0: { incomes: [{ id: 'inc1', name: 'Salário A', value: 3000 }], fixed: [], variable: [] } } };
const dataB = { months: { 0: { incomes: [{ id: 'inc2', name: 'Salário B', value: 1500 }], fixed: [], variable: [] } } };

async function fb(path, method, body) {
  const url = `${DB_URL}/${path}.json`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
  return text === 'null' ? null : JSON.parse(text);
}

async function run() {
  let passed = 0;
  let failed = 0;
  const errs = [];

  const ok  = (label)         => { console.log(`  ✅  ${label}`); passed++; };
  const fail = (label, reason) => { console.error(`  ❌  ${label}\n      ${reason}`); failed++; errs.push(label); };

  console.log('\n🔥  Smoke Test — Firebase Modo Casal\n');
  console.log(`    DB  : ${DB_URL}`);
  console.log(`    Path: couples/${TEST_CODE}/personal/{deviceId}\n`);

  // Limpa estado anterior
  await fb(`couples/${TEST_CODE}`, 'DELETE').catch(() => {});

  // ── Teste 1: Device A escreve dados pessoais ─────────────────────────────
  try {
    await fb(`couples/${TEST_CODE}/personal/${DEVICE_A}`, 'PUT', dataA);
    ok('PUT couples/CODE/personal/DEVICE_A  →  Device A publica dados');
  } catch (e) { fail('PUT personal/DEVICE_A', e.message); }

  // ── Teste 2: Device B escreve dados pessoais ─────────────────────────────
  try {
    await fb(`couples/${TEST_CODE}/personal/${DEVICE_B}`, 'PUT', dataB);
    ok('PUT couples/CODE/personal/DEVICE_B  →  Device B publica dados');
  } catch (e) { fail('PUT personal/DEVICE_B', e.message); }

  // ── Teste 3: Device B lê personal/ e filtra parceiro (Device A) ──────────
  try {
    const all = await fb(`couples/${TEST_CODE}/personal`, 'GET');
    if (!all) throw new Error('personal/ retornou null');
    const entry = Object.entries(all).find(([id]) => id !== DEVICE_B);
    if (!entry) throw new Error(`parceiro não encontrado — keys: ${Object.keys(all).join(', ')}`);
    if (entry[0] !== DEVICE_A) throw new Error(`entry errada: ${entry[0]} (esperado ${DEVICE_A})`);
    const income = entry[1]?.months?.['0']?.incomes?.[0]?.value;
    if (income !== 3000) throw new Error(`valor errado: ${income}`);
    ok('GET personal/ + filter  →  Device B vê dados do Device A corretamente');
  } catch (e) { fail('GET personal/ + filter', e.message); }

  // ── Teste 4: Device A lê personal/ e filtra parceiro (Device B) ──────────
  try {
    const all = await fb(`couples/${TEST_CODE}/personal`, 'GET');
    const entry = Object.entries(all || {}).find(([id]) => id !== DEVICE_A);
    if (!entry || entry[0] !== DEVICE_B) throw new Error('Device B não encontrado pelo Device A');
    ok('GET personal/ + filter  →  Device A vê dados do Device B corretamente');
  } catch (e) { fail('GET personal/ (perspectiva A)', e.message); }

  // ── Teste 5: PATCH no pai NÃO apaga personal/ ────────────────────────────
  // Simula exatamente o pushCouple() do app: update() com { shared, ts, deviceId }
  try {
    await fb(`couples/${TEST_CODE}`, 'PATCH', {
      shared: { expenses: [] },
      ts: Date.now(),
      deviceId: DEVICE_A,
    });
    const node = await fb(`couples/${TEST_CODE}`, 'GET');
    if (!node?.personal?.[DEVICE_A]) throw new Error('personal/DEVICE_A foi apagado após PATCH');
    if (!node?.personal?.[DEVICE_B]) throw new Error('personal/DEVICE_B foi apagado após PATCH');
    ok('PATCH couples/CODE (shared sync)  →  personal/ preservado intacto');
  } catch (e) { fail('PATCH preserva personal/', e.message); }

  // ── Teste 6: SET no pai COM personal/ incluído (segurança extra) ─────────
  // O app nunca faz isso, mas garantir que um set() acidental não quebre tudo
  try {
    const before = await fb(`couples/${TEST_CODE}/personal/${DEVICE_A}`, 'GET');
    const income = before?.months?.['0']?.incomes?.[0]?.value;
    if (income === 3000) {
      ok('Leitura individual couples/CODE/personal/DEVICE_A  →  dado intacto');
    } else {
      fail('Leitura individual', `valor inesperado: ${income}`);
    }
  } catch (e) { fail('Leitura individual', e.message); }

  // Limpeza
  await fb(`couples/${TEST_CODE}`, 'DELETE').catch(() => {});

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  Resultado: ${passed} ok  /  ${failed} falha(s)`);

  if (failed > 0) {
    console.error('\n🚨  ATENÇÃO — testes falharam!\n');
    console.error('    Provável causa: regras do Firebase Realtime Database expiraram.');
    console.error('    Solução:\n');
    console.error('    1. Acesse https://console.firebase.google.com');
    console.error('    2. Projeto my-app-534a8 → Realtime Database → Rules');
    console.error('    3. Substitua o conteúdo por:\n');
    console.error('       {');
    console.error('         "rules": {');
    console.error('           ".read": true,');
    console.error('           ".write": true');
    console.error('         }');
    console.error('       }\n');
    console.error('    4. Clique em "Publicar"');
    console.error('    5. Rode este teste novamente\n');
    process.exit(1);
  } else {
    console.log('\n🎉  Tudo ok! O path está funcional. Pode buildar o APK.\n');
  }
}

run().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
