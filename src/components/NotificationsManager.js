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

  useEffect(() => {
    ensurePermission().then((g) => {
      granted.current = g;
      if (g && data) rescheduleDueReminders(data, YEAR);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!ready || !data) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (granted.current) rescheduleDueReminders(data, YEAR);
    }, 3000);
    return () => timer.current && clearTimeout(timer.current);
  }, [data, ready]);

  return null;
}
