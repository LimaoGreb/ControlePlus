// Firebase Admin SDK — escreve despesas pendentes que o app vai ler.
// Usa o mesmo projeto Firebase do Modo Casal (my-app-534a8).
//
// SETUP:
//  1. Firebase Console → ⚙️ Configurações → Contas de serviço
//  2. "Gerar nova chave privada" → salva como bot/serviceAccount.json
//  3. Nunca commita o serviceAccount.json no git!
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { v4 as uuid } from 'uuid';

const require = createRequire(import.meta.url);

let db;
function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      // Usa variável de ambiente no deploy (Render/Railway), ou arquivo local no dev.
      const credential = process.env.FIREBASE_SERVICE_ACCOUNT
        ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        : admin.credential.cert(require('./serviceAccount.json'));

      admin.initializeApp({
        credential,
        databaseURL: 'https://my-app-534a8-default-rtdb.firebaseio.com',
      });
    }
    db = admin.database();
  }
  return db;
}

/**
 * Escreve uma despesa pendente no Firebase.
 * O app Controle+ escuta esse path e adiciona automaticamente.
 *
 * Path: /jarvis/{chatId}/pending/{expenseId}
 */
export async function addPendingExpense(chatId, expense) {
  const id = uuid();
  const payload = {
    id,
    name: expense.name,
    value: expense.value,
    payment: expense.payment || null,
    monthIndex: expense.monthIndex,
    section: 'variable', // despesas do bot vão para variáveis por padrão
    addedAt: new Date().toISOString(),
    processed: false,
  };
  await getDb().ref(`jarvis/${chatId}/pending/${id}`).set(payload);
  return id;
}

/**
 * Marca uma despesa como processada (o app chama isso após adicionar).
 * Mantemos o registro por 7 dias para auditoria, depois pode limpar.
 */
export async function markProcessed(chatId, expenseId) {
  await getDb().ref(`jarvis/${chatId}/pending/${expenseId}/processed`).set(true);
}
