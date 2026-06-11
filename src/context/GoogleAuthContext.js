import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGoogleUserInfo } from '../services/googleDrive';

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = '198101730282-r33arkuqt67oqg5ptn47lttjcckvnt66.apps.googleusercontent.com';
const WEB_CLIENT_ID    = '198101730282-n2koduek4n5msnmva0t8i0o5l0t6kqtl.apps.googleusercontent.com';

const TOKEN_KEY = '@google:token';
const USER_KEY  = '@google:user';

const GoogleAuthContext = createContext({});

export function GoogleAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [googleUser, setGoogleUser] = useState(null); // { name, email, photo }
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  // Restaura sessão salva
  useEffect(() => {
    AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]).then(([[, tok], [, usr]]) => {
      if (tok) setToken(tok);
      if (usr) { try { setGoogleUser(JSON.parse(usr)); } catch {} }
    });
  }, []);

  // Processa resposta do Google
  useEffect(() => {
    if (response?.type !== 'success') return;
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

  const signIn = () => promptAsync();

  const signOut = async () => {
    setToken(null);
    setGoogleUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  return (
    <GoogleAuthContext.Provider value={{ token, googleUser, signIn, signOut, loading, ready: !!request }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  return useContext(GoogleAuthContext);
}
