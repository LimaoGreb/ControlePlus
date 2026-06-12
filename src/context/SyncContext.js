// Sincronização Firebase: gerencia código do casal, status de conexão e
// sync dos dados COMPARTILHADOS e PESSOAIS.
//
// Arquitetura de dados pessoais:
//   - Cada device escreve em couples_personal/{code}/{deviceId}
//   - Cada device escuta o parent couples_personal/{code} e filtra a entrada do parceiro
//   - Zero etapa de descoberta, zero race condition, zero partnerDeviceId state
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useData } from './DataContext';
import { useSharedData } from './SharedDataContext';
import { useSettings } from './SettingsContext';
import {
  pushCouple, fetchCouple, listenCouple,
  pushPersonalData, fetchPersonalData, listenPersonalData,
  FIREBASE_CONFIGURED,
} from '../services/firebase';

const SyncContext = createContext(null);

const CODE_KEY = '@casal:code';
const SHARE_PERSONAL_KEY = '@casal:sharePersonal';
const PARTNER_NAME_KEY = '@casal:partnerName';
const DEVICE_ID_KEY = '@casal:deviceId';
const PARTNER_PERSONAL_KEY = '@casal:partnerPersonal';
const PARTNER_AVATAR_KEY = '@casal:partnerAvatar';
const LOCAL_TS_KEY = '@casal:localTs';

function makeDeviceId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) c += '-';
    c += chars[Math.floor(Math.random() * chars.length)];
  }
  return c;
}

// Converte foto local para base64 antes de sincronizar (URIs são específicos do dispositivo).
async function serializeAvatarForSync(avatar) {
  if (!avatar) return null;
  if (avatar.kind === 'emoji') return avatar;
  if (avatar.kind === 'photo' && avatar.value) {
    if (avatar.value.startsWith('data:')) return avatar;
    try {
      const b64 = await FileSystem.readAsStringAsync(avatar.value, { encoding: FileSystem.EncodingType.Base64 });
      return { kind: 'photo', value: `data:image/jpeg;base64,${b64}` };
    } catch { return null; }
  }
  return null;
}

export function SyncProvider({ children }) {
  const { data: personalData } = useData();
  const { avatar } = useSettings();
  const { data: sharedData, importSharedData } = useSharedData();

  const [coupleCode, setCoupleCode] = useState(null);
  const [status, setStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [sharePersonal, setSharePersonalRaw] = useState(false);
  const [partnerName, setPartnerNameRaw] = useState('');
  const [lastPartnerActivity, setLastPartnerActivity] = useState(null);
  const [partnerPersonalData, setPartnerPersonalData] = useState(null);
  const [partnerAvatar, setPartnerAvatar] = useState(null);
  const [activeProfile, setActiveProfile] = useState('mine');
  const [deviceId, setDeviceId] = useState(null);
  const [ready, setReady] = useState(false);

  const localTs = useRef(0);
  const ignoreNextSharedPush = useRef(false);
  const pushTimer = useRef(null);
  const personalPushTimer = useRef(null);
  const stopListen = useRef(null);
  const stopListenPersonal = useRef(null);

  // Persiste o ts local para sobreviver reinicializações e evitar aceitar dados antigos.
  const saveLocalTs = useCallback((ts) => {
    localTs.current = ts;
    AsyncStorage.setItem(LOCAL_TS_KEY, String(ts)).catch(() => {});
  }, []);

  // Persiste os dados pessoais e o avatar do(a) parceiro(a) localmente (cache entre sessões).
  const updatePartnerPersonal = useCallback((rawData) => {
    if (!rawData) return;
    const { _avatar, ...pureData } = rawData;
    setPartnerPersonalData(pureData);
    AsyncStorage.setItem(PARTNER_PERSONAL_KEY, JSON.stringify(pureData)).catch(() => {});
    if (_avatar) {
      setPartnerAvatar(_avatar);
      AsyncStorage.setItem(PARTNER_AVATAR_KEY, JSON.stringify(_avatar)).catch(() => {});
    }
  }, []);

  // Carrega todas as configurações salvas na inicialização.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CODE_KEY),
      AsyncStorage.getItem(SHARE_PERSONAL_KEY),
      AsyncStorage.getItem(PARTNER_NAME_KEY),
      AsyncStorage.getItem(DEVICE_ID_KEY),
      AsyncStorage.getItem(PARTNER_PERSONAL_KEY),
      AsyncStorage.getItem(LOCAL_TS_KEY),
      AsyncStorage.getItem(PARTNER_AVATAR_KEY),
    ]).then(([code, shareStr, pName, dId, partnerPersonalStr, tsStr, partnerAvatarStr]) => {
      if (code) setCoupleCode(code);
      setSharePersonalRaw(shareStr === 'true');
      if (pName) setPartnerNameRaw(pName);

      let myId = dId;
      if (!myId) {
        myId = makeDeviceId();
        AsyncStorage.setItem(DEVICE_ID_KEY, myId).catch(() => {});
      }
      setDeviceId(myId);
      console.warn('[Casal] deviceId:', myId);

      if (partnerPersonalStr) {
        try {
          const cached = JSON.parse(partnerPersonalStr);
          setPartnerPersonalData(cached);
          console.warn('[Casal] dados do(a) parceiro(a) carregados do cache');
        } catch {}
      }

      if (partnerAvatarStr) {
        try { setPartnerAvatar(JSON.parse(partnerAvatarStr)); } catch {}
      }

      if (tsStr) localTs.current = parseInt(tsStr, 10) || 0;

      setReady(true);
    });
  }, []);

  // Listener de dados compartilhados — sincroniza despesas conjuntas.
  useEffect(() => {
    if (!ready || !coupleCode || !FIREBASE_CONFIGURED || !deviceId) return;

    console.warn('[Casal] iniciando sync compartilhado, code:', coupleCode);
    setStatus('syncing');

    fetchCouple(coupleCode)
      .then((remote) => {
        if (remote && remote.ts > localTs.current) {
          saveLocalTs(remote.ts);
          setLastPartnerActivity(Date.now());
          if (remote.shared) { ignoreNextSharedPush.current = true; importSharedData(remote.shared); }
        }
        setStatus('synced');
        setLastSync(Date.now());
        console.warn('[Casal] fetchCouple ok, ts:', remote?.ts);
      })
      .catch((e) => {
        console.error('[Casal] fetchCouple erro:', e);
        setStatus('error');
      });

    stopListen.current = listenCouple(coupleCode, (remote) => {
      if (remote.ts > localTs.current) {
        saveLocalTs(remote.ts);
        setLastPartnerActivity(Date.now());
        if (remote.shared) { ignoreNextSharedPush.current = true; importSharedData(remote.shared); }
        setStatus('synced');
        setLastSync(Date.now());
      }
    });

    return () => { if (stopListen.current) stopListen.current(); };
  }, [coupleCode, ready, deviceId]);

  // Listener de dados pessoais do(a) parceiro(a).
  // Escuta couples_personal/{code} (parent) e filtra a entrada que não é nossa.
  // Não depende de partnerDeviceId — a descoberta acontece no próprio listener.
  useEffect(() => {
    if (!ready || !coupleCode || !deviceId || !FIREBASE_CONFIGURED) return;

    console.warn('[Casal] iniciando listener de dados pessoais, myId:', deviceId);

    fetchPersonalData(coupleCode, deviceId)
      .then((data) => {
        if (data) {
          console.warn('[Casal] dados pessoais do(a) parceiro(a) encontrados no fetch inicial');
          updatePartnerPersonal(data);
        } else {
          console.warn('[Casal] parceiro(a) ainda não publicou dados pessoais');
        }
      })
      .catch((e) => console.error('[Casal] fetchPersonalData erro:', e));

    stopListenPersonal.current = listenPersonalData(coupleCode, deviceId, (data) => {
      if (data) {
        console.warn('[Casal] dados pessoais do(a) parceiro(a) atualizados via listener');
        updatePartnerPersonal(data);
        setLastPartnerActivity(Date.now());
      }
    });

    return () => { if (stopListenPersonal.current) stopListenPersonal.current(); };
  }, [ready, coupleCode, deviceId]);

  // Dados compartilhados mudaram → push com debounce.
  useEffect(() => {
    if (!coupleCode || !sharedData || !ready || !FIREBASE_CONFIGURED) return;
    if (ignoreNextSharedPush.current) { ignoreNextSharedPush.current = false; return; }
    debouncedPush();
  }, [sharedData, coupleCode, ready]);

  // Dados pessoais mudaram → push separado para o node próprio.
  useEffect(() => {
    if (!coupleCode || !personalData || !ready || !FIREBASE_CONFIGURED || !sharePersonal || !deviceId) return;
    debouncedPersonalPush();
  }, [personalData, coupleCode, ready, sharePersonal, deviceId]);

  // Push de dados compartilhados — inclui deviceId para compatibilidade com clientes antigos.
  const debouncedPush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const ts = Date.now();
      saveLocalTs(ts);
      setStatus('syncing');
      try {
        await pushCouple(coupleCode, { shared: sharedData, ts, deviceId });
        setStatus('synced');
        setLastSync(Date.now());
      } catch(e) {
        console.error('[Casal] pushCouple erro:', e);
        setStatus('error');
      }
    }, 2000);
  }, [sharedData, coupleCode, deviceId, saveLocalTs]);

  // Push de dados pessoais — node exclusivo do device, não afeta dados do(a) parceiro(a).
  // Inclui o avatar serializado (foto → base64, emoji → objeto direto).
  const debouncedPersonalPush = useCallback(() => {
    if (personalPushTimer.current) clearTimeout(personalPushTimer.current);
    personalPushTimer.current = setTimeout(async () => {
      try {
        const serializedAvatar = await serializeAvatarForSync(avatar);
        const payload = { ...personalData };
        if (serializedAvatar) payload._avatar = serializedAvatar;
        await pushPersonalData(coupleCode, deviceId, payload);
        console.warn('[Casal] dados pessoais enviados com sucesso para couples_personal/' + coupleCode + '/' + deviceId);
      } catch(e) {
        console.error('[Casal] pushPersonalData erro:', e);
      }
    }, 2000);
  }, [personalData, avatar, coupleCode, deviceId]);

  const connect = useCallback(async (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.replace('-', '').length < 6) throw new Error('Código muito curto');
    await AsyncStorage.setItem(CODE_KEY, clean);
    setCoupleCode(clean);
  }, []);

  const disconnect = useCallback(async () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (personalPushTimer.current) clearTimeout(personalPushTimer.current);
    if (stopListen.current) stopListen.current();
    if (stopListenPersonal.current) stopListenPersonal.current();
    await Promise.all([
      AsyncStorage.removeItem(CODE_KEY),
      AsyncStorage.removeItem(PARTNER_PERSONAL_KEY),
      AsyncStorage.removeItem(PARTNER_AVATAR_KEY),
      AsyncStorage.removeItem(LOCAL_TS_KEY),
    ]);
    setCoupleCode(null);
    setStatus('idle');
    setLastSync(null);
    setPartnerPersonalData(null);
    setPartnerAvatar(null);
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
      lastPartnerActivity, partnerPersonalData, partnerAvatar,
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
