// Sync do Modo Casal via Firebase Realtime Database (plano gratuito).
//
// SETUP (5 minutos, gratuito):
//  1. Acesse https://console.firebase.google.com
//  2. Criar projeto → Realtime Database → "Começar em modo de teste"
//  3. Configurações do projeto (⚙️) → Seus apps → Adicionar app (</>) Web
//  4. Copie o objeto firebaseConfig e cole abaixo
//  5. Rode: npm install firebase  (já feito se você vê esse arquivo)
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off } from 'firebase/database';

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

// Sobe os dados compartilhados do casal (sem dados pessoais).
// payload: { shared, ts, deviceId }
export async function pushCouple(code, payload) {
  await set(ref(getDb(), `couples/${code}`), payload);
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

// Dados pessoais — cada dispositivo tem seu próprio node, sem risco de sobrescrita mútua.
export async function pushPersonalData(code, deviceId, data) {
  await set(ref(getDb(), `couples_personal/${code}_${deviceId}`), data);
}

export async function fetchPersonalData(code, deviceId) {
  const snap = await get(ref(getDb(), `couples_personal/${code}_${deviceId}`));
  return snap.exists() ? snap.val() : null;
}

export function listenPersonalData(code, deviceId, callback) {
  const r = ref(getDb(), `couples_personal/${code}_${deviceId}`);
  onValue(r, (snap) => callback(snap.exists() ? snap.val() : null));
  return () => off(r);
}
