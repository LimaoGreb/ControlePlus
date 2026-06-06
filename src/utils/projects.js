// Cálculos de metas/projetos: progresso, quanto falta, tempo estimado.
import { MONTH_NAMES } from '../data/initialData';

const num = (v) => Number(v) || 0;

export function projectStats(p) {
  const target = num(p.target);
  const monthly = num(p.monthly);
  const saved = num(p.saved);

  const remaining = Math.max(0, target - saved);
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const done = target > 0 && remaining <= 0;

  // Meses até concluir (se houver aporte mensal definido).
  let monthsLeft = null;
  if (done) monthsLeft = 0;
  else if (monthly > 0) monthsLeft = Math.ceil(remaining / monthly);

  // Data estimada de conclusão (mês/ano).
  let etaLabel = null;
  if (monthsLeft != null && monthsLeft > 0) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthsLeft, 1);
    etaLabel = `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
  }

  return { target, monthly, saved, remaining, pct, done, monthsLeft, etaLabel };
}
