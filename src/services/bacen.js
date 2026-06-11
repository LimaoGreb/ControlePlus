// BACEN API — Banco Central do Brasil. Gratuita, sem chave, sem limite publicado.
// Séries do SGS (Sistema Gerenciador de Séries Temporais):
//   432   = Meta SELIC (% a.a., definida pelo COPOM)
//   13522 = IPCA acumulado 12 meses (%)
//   189   = IGP-M acumulado 12 meses (%)
//   226   = TR mensal (%)

const BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

async function fetchSerie(code) {
  const res = await fetch(`${BASE}.${code}/dados/ultimos/1?formato=json`, {
    headers: { Accept: 'application/json' },
  });
  const json = await res.json();
  const raw = json?.[0]?.valor;
  if (raw == null) return null;
  return parseFloat(String(raw).replace(',', '.'));
}

export async function fetchIndicadores() {
  const [selic, ipca, igpm] = await Promise.allSettled([
    fetchSerie(432),
    fetchSerie(13522),
    fetchSerie(189),
  ]);
  return {
    selic: selic.status === 'fulfilled' ? selic.value : null,
    ipca:  ipca.status  === 'fulfilled' ? ipca.value  : null,
    igpm:  igpm.status  === 'fulfilled' ? igpm.value  : null,
  };
}
