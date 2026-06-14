// Context para mensagens internas do Cap (sem push, só in-app).
// Persiste em AsyncStorage. Badge no ícone da aba conta as não-lidas.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@cap_messages_v1';
const MAX = 300;

const CapContext = createContext(null);

export function CapProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        try { setMessages(raw ? JSON.parse(raw) : []); }
        catch { setMessages([]); }
      })
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((msgs) => {
    AsyncStorage.setItem(KEY, JSON.stringify(msgs));
  }, []);

  const addCapMessage = useCallback((text) => {
    setMessages(prev => {
      const next = [...prev, { id: `c${Date.now()}`, text, ts: Date.now(), read: false }].slice(-MAX);
      save(next);
      return next;
    });
  }, [save]);

  const markAllRead = useCallback(() => {
    setMessages(prev => {
      if (prev.every(m => m.read)) return prev;
      const next = prev.map(m => ({ ...m, read: true }));
      save(next);
      return next;
    });
  }, [save]);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <CapContext.Provider value={{ messages, unreadCount, addCapMessage, markAllRead, ready }}>
      {children}
    </CapContext.Provider>
  );
}

export function useCapMessages() {
  return useContext(CapContext);
}
