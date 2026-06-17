// Sinal global para desbloquear todos os ItemRows simultaneamente (ex: comando Cap).
// Módulo puro — sem dependência de React, sem AsyncStorage.
let _pending = false;
const _listeners = new Set();

export function triggerBulkUnlock() {
  _pending = true;
  _listeners.forEach(fn => fn());
  // Janela de 2s: novos ItemRows que montarem durante esse período iniciam desbloqueados
  setTimeout(() => { _pending = false; }, 2000);
}

export function isPendingUnlock() {
  return _pending;
}

// Retorna função de cleanup (para useEffect)
export function onBulkUnlock(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
