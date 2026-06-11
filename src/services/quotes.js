// Cotações: Brapi.dev (primário BR) + Yahoo Finance (fallback ações) + CoinGecko (fallback cripto)
// Todas públicas e gratuitas, sem chave de API.

const STOCK_TYPES = ['acoes', 'fiis', 'etf'];

// CoinGecko IDs para fallback
const COINGECKO_MAP = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  ada: 'cardano',
  xrp: 'ripple',
  doge: 'dogecoin',
  usdt: 'tether',
  usdc: 'usd-coin',
  matic: 'matic-network', pol: 'matic-network',
  ltc: 'litecoin',
  dot: 'polkadot',
  avax: 'avalanche-2',
  link: 'chainlink',
  atom: 'cosmos',
};

// ── Brapi.dev ──────────────────────────────────────────────────────────────────
// Ações e FIIs brasileiros (sem sufixo .SA)
async function fetchStockBrapi(ticker) {
  const t = String(ticker).trim().toUpperCase().replace(/\.SA$/i, '');
  const res = await fetch(`https://brapi.dev/api/quote/${t}`);
  const json = await res.json();
  const price = json?.results?.[0]?.regularMarketPrice;
  return typeof price === 'number' ? price : null;
}

// Cripto em BRL direto
async function fetchCryptoBrapi(symbol) {
  const coin = String(symbol).trim().toUpperCase();
  const res = await fetch(`https://brapi.dev/api/v2/crypto?coin=${coin}&currency=BRL`);
  const json = await res.json();
  const price = json?.coins?.[0]?.regularMarketPrice;
  return typeof price === 'number' ? price : null;
}

// ── Yahoo Finance (fallback ações) ─────────────────────────────────────────────
async function fetchStockYahoo(ticker) {
  const symbol = String(ticker).trim().toUpperCase();
  const yfSymbol = symbol.endsWith('.SA') ? symbol : `${symbol}.SA`;
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${yfSymbol}?interval=1d&range=1d`
  );
  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return typeof price === 'number' ? price : null;
}

// ── CoinGecko (fallback cripto) ────────────────────────────────────────────────
async function fetchCryptoCoingecko(symbolOrId) {
  const key = String(symbolOrId).trim().toLowerCase();
  const id = COINGECKO_MAP[key] || key;
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=brl`
  );
  const json = await res.json();
  const price = json?.[id]?.brl;
  return typeof price === 'number' ? price : null;
}

// ── Públicas ───────────────────────────────────────────────────────────────────

// Dólar, Euro e mais moedas (AwesomeAPI)
export async function fetchCurrencies() {
  try {
    const res = await fetch(
      'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,ARS-BRL'
    );
    const json = await res.json();
    const pick = (key) => (json?.[key]?.bid ? parseFloat(json[key].bid) : null);
    return {
      usd: pick('USDBRL'),
      eur: pick('EURBRL'),
      gbp: pick('GBPBRL'),
      btc: pick('BTCBRL'),
      ars: pick('ARSBRL'),
    };
  } catch (e) {
    console.warn('fetchCurrencies', e);
    return { usd: null, eur: null, gbp: null, btc: null, ars: null };
  }
}

export function isQuotable(typeId) {
  return STOCK_TYPES.includes(typeId) || typeId === 'cripto';
}

// Preço unitário: Brapi primeiro, fallback específico por tipo
export async function fetchQuote(typeId, ticker) {
  if (!ticker || !isQuotable(typeId)) return null;
  try {
    if (typeId === 'cripto') {
      const brapi = await fetchCryptoBrapi(ticker).catch(() => null);
      if (brapi != null) return brapi;
      return await fetchCryptoCoingecko(ticker);
    }
    // ações / FIIs / ETFs
    const brapi = await fetchStockBrapi(ticker).catch(() => null);
    if (brapi != null) return brapi;
    return await fetchStockYahoo(ticker);
  } catch (e) {
    console.warn('fetchQuote', e);
    return null;
  }
}
