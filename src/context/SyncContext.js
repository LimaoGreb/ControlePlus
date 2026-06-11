// Sincronização Firebase: gerencia código do casal, status de conexão e
// sync dos dados COMPARTILHADOS. Dados pessoais ficam em nodes separados
// por dispositivo (couples_personal/{code}_{deviceId}), evitando sobrescrita mútua.
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
const PARTNER_DEVICE_ID_KEY = '@casal:partnerDeviceId';
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
  const [partnerDeviceId, setPartnerDeviceId] = useState(null);
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

  // Persiste o deviceId do(a) parceiro(a) para restabelecer o listener após restart.
  const updatePartnerDeviceId = useCallback((id) => {
    setPartnerDeviceId(id);
    AsyncStorage.setItem(PARTNER_DEVICE_ID_KEY, id).catch(() => {});
  }, []);

  // Carrega todas as configurações salvas na inicialização.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CODE_KEY),
      AsyncStorage.getItem(SHARE_PERSONAL_KEY),
      AsyncStorage.getItem(PARTNER_NAME_KEY),
      AsyncStorage.getItem(DEVICE_ID_KEY),
      AsyncStorage.getItem(PARTNER_PERSONAL_KEY),
      AsyncStorage.getItem(PARTNER_DEVICE_ID_KEY),
      AsyncStorage.getItem(LOCAL_TS_KEY),
      AsyncStorage.getItem(PARTNER_AVATAR_KEY),
    ]).then(([code, shareStr, pName, dId, partnerPersonalStr, pDevId, tsStr, partnerAvatarStr]) => {
      if (code) setCoupleCode(code);
      setSharePersonalRaw(shareStr === 'true');
      if (pName) setPartnerNameRaw(pName);

      let myId = dId;
      if (!myId) {
        myId = makeDeviceId();
        AsyncStorage.setItem(DEVICE_ID_KEY, myId).catch(() => {});
      }
      setDeviceId(myId);

      if (pDevId) setPartnerDeviceId(pDevId);

      if (partnerPersonalStr) {
        try { setPartnerPersonalData(JSON.parse(partnerPersonalStr)); } catch {}
      }

      if (partnerAvatarStr) {
        try { setPartnerAvatar(JSON.parse(partnerAvatarStr)); } catch {}
      }

      // Restaura o ts para não re-aceitar dados que já foram processados
      if (tsStr) localTs.current = parseInt(tsStr, 10) || 0;

      setReady(true);
    });
  }, []);

  // Listener de dados compartilhados — também descobre o deviceId do(a) parceiro(a).
  useEffect(() => {
    if (!ready || !coupleCode || !FIREBASE_CONFIGURED || !deviceId) return;

    setStatus('syncing');
    fetchCouple(coupleCode)
      .then((remote) => {
        if (remote && remote.ts > localTs.current) {
          saveLocalTs(remote.ts);
          setLastPartnerActivity(Date.now());
          if (remote.shared) { ignoreNextSharedPush.current = true; importSharedData(remote.shared); }
          if (remote.deviceId && remote.deviceId !== deviceId) { updatePartnerDeviceId(remote.deviceId); }
        }
        setStatus('synced');
        setLastSync(Date.now());
      })
      .catch(() => setStatus('error'));

    stopListen.current = listenCouple(coupleCode, (remote) => {
      if (remote.ts > localTs.current) {
        saveLocalTs(remote.ts);
        setLastPartnerActivity(Date.now());
        if (remote.shared) { ignoreNextSharedPush.current = true; importSharedData(remote.shared); }
        if (remote.deviceId && remote.deviceId !== deviceId) { updatePartnerDeviceId(remote.deviceId); }
        setStatus('synced');
        setLastSync(Date.now());
      }
    });

    return () => { if (stopListen.current) stopListen.current(); };
  }, [coupleCode, ready, deviceId]);

  // Listener de dados pessoais do(a) parceiro(a) — node exclusivo deles, sem risco de sobrescrita.
  useEffect(() => {
    if (!coupleCode || !partnerDeviceId || !FIREBASE_CONFIGURED) return;

    fetchPersonalData(coupleCode, partnerDeviceId).then((data) => {
      if (data) updatePartnerPersonal(data);
    });

    stopListenPersonal.current = listenPersonalData(coupleCode, partnerDeviceId, (data) => {
      if (data) {
        updatePartnerPersonal(data);
        setLastPartnerActivity(Date.now());
      }
    });

    return () => { if (stopListenPersonal.current) stopListenPersonal.current(); };
  }, [coupleCode, partnerDeviceId]);

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

  // Push de dados compartilhados — inclui deviceId para o(a) parceiro(a) aprender quem somos.
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
      } catch { setStatus('error'); }
    }, 2000);
  }, [sharedData, coupleCode, deviceId, saveLocalTs]);

  // Push de dados pessoais — node exclusivo, não afeta dados do(a) parceiro(a).
  // Inclui o avatar serializado (foto → base64, emoji → objeto direto).
  const debouncedPersonalPush = useCallback(() => {
    if (personalPushTimer.current) clearTimeout(personalPushTimer.current);
    personalPushTimer.current = setTimeout(async () => {
      try {
        const serializedAvatar = await serializeAvatarForSync(avatar);
        const payload = { ...personalData };
        if (serializedAvatar) payload._avatar = serializedAvatar;
        await pushPersonalData(coupleCode, deviceId, payload);
      } catch {}
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
      AsyncStorage.removeItem(PARTNER_DEVICE_ID_KEY),
      AsyncStorage.removeItem(PARTNER_AVATAR_KEY),
      AsyncStorage.removeItem(LOCAL_TS_KEY),
    ]);
    setCoupleCode(null);
    setPartnerDeviceId(null);
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
