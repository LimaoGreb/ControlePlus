// Pede permissão de notificação e reagenda os lembretes de vencimento sempre
// que os dados mudam (com um pequeno debounce). Não renderiza nada.
import { useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { ensurePermission, rescheduleDueReminders } from '../services/notifications';
import { YEAR } from '../data/initialData';

export default function NotificationsManager() {
  const { data, ready } = useData();
  const granted = useRef(false);
  const timer = useRef(null);
  const lastScheduled = useRef(0);

  useEffect(() => {
    ensurePermission().then((g) => { granted.current = g; });
  }, []);

  useEffect(() => {
    if (!ready || !data) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!granted.current) return;
      // cooldown de 15s: evita múltiplos reagendamentos em sequência rápida
      const now = Date.now();
      if (now - lastScheduled.current < 15000) return;
      lastScheduled.current = now;
      rescheduleDueReminders(data, YEAR);
    }, 3000);
    return () => timer.current && clearTimeout(timer.current);
  }, [data, ready]);

  return null;
}
