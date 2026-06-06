// Busca de cotações: ações/FIIs/ETFs da B3 (Yahoo Finance) e cripto (CoinGecko).
// APIs públicas e gratuitas, sem chave. (No web/preview, o Yahoo pode bloquear
// por CORS — funciona normalmente no app/celular.)

const STOCK_TYPES = ['acoes', 'fiis', 'etf'];

// Mapa de símbolos cripto comuns -> id do CoinGecko.
const CRYPTO_MAP = {
  btc: 'bitcoin',
  bitcoin: 'bitcoin',
  eth: 'ethereum',
  ethereum: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  ada: 'cardano',
  xrp: 'ripple',
  doge: 'dogecoin',
  usdt: 'tether',
  usdc: 'usd-coin',
  matic: 'matic-network',
  ltc: 'litecoin',
  dot: 'polkadot',
};

// Preço de uma ação/FII/ETF da B3 (em R$).
async function fetchStockPrice(ticker) {
  const clean = String(ticker).trim().toUpperCase();
  if (!clean) return null;
  const symbol = clean.endsWith('.SA') ? clean : `${clean}.SA`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const res = await fetch(url);
  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return typeof price === 'number' ? price : null;
}

// Preço de uma cripto (em R$).
async function fetchCryptoPrice(symbolOrId) {
  const key = String(symbolOrId).trim().toLowerCase();
  if (!key) return null;
  const id = CRYPTO_MAP[key] || key;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=brl`;
  const res = await fetch(url);
  const json = await res.json();
  const price = json?.[id]?.brl;
  return typeof price === 'number' ? price : null;
}

// Cotação de Dólar e Euro (em R$) — AwesomeAPI, grátis e sem chave.
export async function fetchCurrencies() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
    const json = await res.json();
    const usd = json?.USDBRL?.bid ? parseFloat(json.USDBRL.bid) : null;
    const eur = json?.EURBRL?.bid ? parseFloat(json.EURBRL.bid) : null;
    return { usd, eur };
  } catch (e) {
    console.warn('fetchCurrencies', e);
    return { usd: null, eur: null };
  }
}

// Se o tipo do ativo permite cotação automática.
export function isQuotable(typeId) {
  return STOCK_TYPES.includes(typeId) || typeId === 'cripto';
}

// Busca o preço unitário atual conforme o tipo do ativo. Retorna número ou null.
export async function fetchQuote(typeId, ticker) {
  if (!ticker || !isQuotable(typeId)) return null;
  try {
    if (typeId === 'cripto') return await fetchCryptoPrice(ticker);
    return await fetchStockPrice(ticker);
  } catch (e) {
    console.warn('fetchQuote', e);
    return null;
  }
}
