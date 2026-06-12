// Sync do Modo Casal via Firebase Realtime Database (plano gratuito).
//
// SETUP (5 minutos, gratuito):
//  1. Acesse https://console.firebase.google.com
//  2. Criar projeto → Realtime Database → "Começar em modo de teste"
//  3. Configurações do projeto (⚙️) → Seus apps → Adicionar app (</>) Web
//  4. Copie o objeto firebaseConfig e cole abaixo
//  5. Rode: npm install firebase  (já feito se você vê esse arquivo)
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, update, onValue, off } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAw-ooawiawK-NL5uqE4i4lKzok1zbdbwE',
  authDomain: 'my-app-534a8.firebaseapp.com',
  databaseURL: 'https://my-app-534a8-default-rtdb.firebaseio.com',
  projectId: 'my-app-534a8',
  storageBucket: 'my-app-534a8.firebasestorage.app',
  messagingSenderId: '12573871088',
  appId: '1:12573871088:web:8a3d05edd5ce1925202b35',
};

// Verdadeiro quando o config foi preenchido (não são os placeholders).
export const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== 'COLE_AQUI';

function getDb() {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase não configurado — preencha firebase.js');
  if (!getApps().length) initializeApp(firebaseConfig);
  return getDatabase();
}

// Sobe os dados compartilhados do casal.
// Usa update() para não apagar campos que possam existir no node (ex: legados).
export async function pushCouple(code, payload) {
  await update(ref(getDb(), `couples/${code}`), payload);
}

// Lê os dados compartilhados (uma única vez).
export async function fetchCouple(code) {
  const snap = await get(ref(getDb(), `couples/${code}`));
  return snap.exists() ? snap.val() : null;
}

// Escuta dados compartilhados em tempo real. Retorna função de cancelamento.
export function listenCouple(code, callback) {
  const r = ref(getDb(), `couples/${code}`);
  onValue(r, (snap) => { if (snap.exists()) callback(snap.val()); });
  return () => off(r);
}

// Dados pessoais — sub-path dentro do MESMO node couples/{code}.
// Path: couples/{code}/personal/{deviceId}
//
// Por que dentro de couples/:
//   - Mesmas regras de segurança do Firebase que já funcionam para shared data
//   - pushCouple usa update() que preserva sub-paths não mencionados no payload
//   - Zero risco de regra faltando para um path separado

export async function pushPersonalData(code, deviceId, data) {
  await set(ref(getDb(), `couples/${code}/personal/${deviceId}`), data);
}

// Busca os dados pessoais do PARCEIRO (quem não é myDeviceId).
export async function fetchPersonalData(code, myDeviceId) {
  const snap = await get(ref(getDb(), `couples/${code}/personal`));
  if (!snap.exists()) return null;
  const all = snap.val();
  const entry = Object.entries(all).find(([id]) => id !== myDeviceId);
  return entry ? entry[1] : null;
}

// Escuta o sub-path personal e repassa os dados do PARCEIRO sempre que mudar.
// Callback recebe null se o parceiro ainda não publicou dados.
export function listenPersonalData(code, myDeviceId, callback) {
  const r = ref(getDb(), `couples/${code}/personal`);
  onValue(r, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const all = snap.val();
    const entry = Object.entries(all).find(([id]) => id !== myDeviceId);
    callback(entry ? entry[1] : null);
  });
  return () => off(r);
}
