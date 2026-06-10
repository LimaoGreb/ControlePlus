// Sincronização Firebase: gerencia código do casal, status de conexão e
// sync dos dados COMPARTILHADOS. Dados pessoais só sincronizam se a
// permissão "Compartilhar dados pessoais" estiver ativada.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useData } from './DataContext';
import { useSharedData } from './SharedDataContext';
import { pushCouple, fetchCouple, listenCouple, FIREBASE_CONFIGURED } from '../services/firebase';

const SyncContext = createContext(null);

const CODE_KEY = '@casal:code';
const SHARE_PERSONAL_KEY = '@casal:sharePersonal';
const PARTNER_NAME_KEY = '@casal:partnerName';

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) c += '-';
    c += chars[Math.floor(Math.random() * chars.length)];
  }
  return c;
}

export function SyncProvider({ children }) {
  const { data: personalData, importData: importPersonalData } = useData();
  const { data: sharedData, importSharedData } = useSharedData();

  const [coupleCode, setCoupleCode] = useState(null);
  const [status, setStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [sharePersonal, setSharePersonalRaw] = useState(false);
  const [partnerName, setPartnerNameRaw] = useState('');
  const [lastPartnerActivity, setLastPartnerActivity] = useState(null);
  const [partnerPersonalData, setPartnerPersonalData] = useState(null);
  const [activeProfile, setActiveProfile] = useState('mine');
  const [ready, setReady] = useState(false);

  const localTs = useRef(0);
  const ignoreNextSharedPush = useRef(false);
  const ignoreNextPersonalPush = useRef(false);
  const pushTimer = useRef(null);
  const stopListen = useRef(null);

  // Carrega configurações salvas.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CODE_KEY),
      AsyncStorage.getItem(SHARE_PERSONAL_KEY),
      AsyncStorage.getItem(PARTNER_NAME_KEY),
    ]).then(([code, shareStr, pName]) => {
      if (code) setCoupleCode(code);
      setSharePersonalRaw(shareStr === 'true');
      if (pName) setPartnerNameRaw(pName);
      setReady(true);
    });
  }, []);

  const buildPayload = useCallback((ts) => {
    const payload = { shared: sharedData, ts };
    if (sharePersonal && personalData) payload.personal = personalData;
    return payload;
  }, [sharedData, personalData, sharePersonal]);

  // Conecta/reconecta quando o código ou a flag de ready mudam.
  useEffect(() => {
    if (!ready || !coupleCode || !FIREBASE_CONFIGURED) return;

    setStatus('syncing');
    fetchCouple(coupleCode)
      .then((remote) => {
        if (remote && remote.ts > localTs.current) {
          localTs.current = remote.ts;
          setLastPartnerActivity(Date.now());
          if (remote.shared) { ignoreNextSharedPush.current = true; importSharedData(remote.shared); }
          if (remote.personal) { setPartnerPersonalData(remote.personal); }
        }
        setStatus('synced');
        setLastSync(Date.now());
      })
      .catch(() => setStatus('error'));

    stopListen.current = listenCouple(coupleCode, (remote) => {
      if (remote.ts > localTs.current) {
        localTs.current = remote.ts;
        setLastPartnerActivity(Date.now());
        if (remote.shared) { ignoreNextSharedPush.current = true; importSharedData(remote.shared); }
        if (remote.personal) { setPartnerPersonalData(remote.personal); }
        setStatus('synced');
        setLastSync(Date.now());
      }
    });

    return () => { if (stopListen.current) stopListen.current(); };
  }, [coupleCode, ready]);

  // Dados compartilhados mudaram → push com debounce.
  useEffect(() => {
    if (!coupleCode || !sharedData || !ready || !FIREBASE_CONFIGURED) return;
    if (ignoreNextSharedPush.current) { ignoreNextSharedPush.current = false; return; }
    debouncedPush();
  }, [sharedData, coupleCode, ready]);

  // Dados pessoais mudaram → push apenas se sharePersonal estiver ativo.
  useEffect(() => {
    if (!coupleCode || !personalData || !ready || !FIREBASE_CONFIGURED || !sharePersonal) return;
    if (ignoreNextPersonalPush.current) { ignoreNextPersonalPush.current = false; return; }
    debouncedPush();
  }, [personalData, coupleCode, ready, sharePersonal]);

  const debouncedPush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const ts = Date.now();
      localTs.current = ts;
      setStatus('syncing');
      const payload = { shared: sharedData, ts };
      if (sharePersonal && personalData) payload.personal = personalData;
      pushCouple(coupleCode, payload)
        .then(() => { setStatus('synced'); setLastSync(Date.now()); })
        .catch(() => setStatus('error'));
    }, 2000);
  }, [sharedData, personalData, sharePersonal, coupleCode]);

  const connect = useCallback(async (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.replace('-', '').length < 6) throw new Error('Código muito curto');
    await AsyncStorage.setItem(CODE_KEY, clean);
    setCoupleCode(clean);
  }, []);

  const disconnect = useCallback(async () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (stopListen.current) stopListen.current();
    await AsyncStorage.removeItem(CODE_KEY);
    setCoupleCode(null);
    setStatus('idle');
    setLastSync(null);
    setPartnerPersonalData(null);
    setActiveProfile('mine');
    localTs.current = 0;
  }, []);

  const setSharePersonal = useCallback(async (value) => {
    setSharePersonalRaw(value);
    await AsyncStorage.setItem(SHARE_PERSONAL_KEY, value ? 'true' : 'false');
  }, []);

  const setPartnerName = useCallback(async (name) => {
    setPartnerNameRaw(name);
    await AsyncStorage.setItem(PARTNER_NAME_KEY, name);
  }, []);

  const switchProfile = useCallback(() => {
    setActiveProfile((p) => (p === 'mine' ? 'partner' : 'mine'));
  }, []);

  const generateCode = useCallback(() => makeCode(), []);

  return (
    <SyncContext.Provider value={{
      coupleCode, status, lastSync,
      sharePersonal, setSharePersonal,
      partnerName, setPartnerName,
      lastPartnerActivity, partnerPersonalData,
      activeProfile, switchProfile,
      connect, disconnect, generateCode,
      FIREBASE_CONFIGURED,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync deve ser usado dentro de SyncProvider');
  return ctx;
}
