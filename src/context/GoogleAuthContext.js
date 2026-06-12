import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGoogleUserInfo } from '../services/googleDrive';

// Necessário para fechar o browser após redirect de volta ao app.
WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = '198101730282-r33arkuqt67oqg5ptn47lttjcckvnt66.apps.googleusercontent.com';
const WEB_CLIENT_ID    = '198101730282-n2koduek4n5msnmva0t8i0o5l0t6kqtl.apps.googleusercontent.com';

const TOKEN_KEY = '@google:token';
const USER_KEY  = '@google:user';

const GoogleAuthContext = createContext({});

export function GoogleAuthProvider({ children }) {
  const [token, setToken]           = useState(null);
  const [googleUser, setGoogleUser] = useState(null); // { name, email, photo }
  const [loading, setLoading]       = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
    ],
    // Força exibição do seletor de conta sempre — evita login preso em conta errada.
    selectAccount: true,
  });

  // Restaura e VALIDA sessão salva. Tokens OAuth expiram em ~1h;
  // checar antes de usar evita 401 silencioso no Drive.
  useEffect(() => {
    (async () => {
      const [[, tok], [, usr]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      if (!tok) return;
      try {
        const info = await fetchGoogleUserInfo(tok);
        if (info?.email) {
          // Token ainda válido — restaurar tudo
          setToken(tok);
          const u = { name: info.name, email: info.email, photo: info.picture };
          setGoogleUser(u);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
        } else {
          throw new Error('invalid');
        }
      } catch {
        // Token expirado ou inválido — limpar estado para forçar re-login
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        // Mostra quem estava logado (sem token) para UX contextual
        if (usr) {
          try { setGoogleUser(JSON.parse(usr)); } catch {}
        }
      }
    })();
  }, []);

  // Processa resposta do Google após fluxo OAuth
  useEffect(() => {
    if (!response) return;
    if (response.type === 'dismiss' || response.type === 'cancel') return;

    if (response.type === 'error') {
      // Loga erro para diagnóstico — sem alert aqui pois o usuário já viu o erro no browser
      console.warn('[GoogleAuth] erro OAuth:', JSON.stringify(response.error));
      return;
    }

    if (response.type !== 'success') return;

    const accessToken = response.authentication?.accessToken;
    if (!accessToken) return;

    setToken(accessToken);
    AsyncStorage.setItem(TOKEN_KEY, accessToken);
    setLoading(true);

    fetchGoogleUserInfo(accessToken)
      .then((info) => {
        const u = { name: info.name, email: info.email, photo: info.picture };
        setGoogleUser(u);
        AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [response]);

  // signIn: showInRecents=true garante que o Chrome Custom Tab volta para o app
  // corretamente no Android mesmo quando o usuário usa o botão "voltar".
  const signIn = useCallback(() => {
    promptAsync(Platform.OS === 'android' ? { showInRecents: true } : {});
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    setToken(null);
    setGoogleUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  return (
    <GoogleAuthContext.Provider value={{ token, googleUser, signIn, signOut, loading, ready: !!request }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  return useContext(GoogleAuthContext);
}
