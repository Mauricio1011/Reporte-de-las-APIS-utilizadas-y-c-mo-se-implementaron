const { fetchJson } = require("./lib/http");

/** URL publicada en el planteamiento. Responde 301 hacia api.frankfurter.dev. */
const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to=MXN";
const EXCHANGE_RATE_FALLBACK_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60_000;

let cache = null;

function readFrankfurter(data) {
  const rate = Number(data?.rates?.MXN);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("La respuesta de Frankfurter no incluye una tasa MXN válida");
  }
  return {
    rate,
    date: data.date || null,
    source: "Frankfurter External API",
  };
}

function readExchangeRateApi(data) {
  const rate = Number(data?.rates?.MXN);
  if (data?.result !== "success" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("La respuesta de ExchangeRate-API no incluye una tasa MXN válida");
  }
  const updated = Number(data.time_last_update_unix);
  return {
    rate,
    date: Number.isFinite(updated)
      ? new Date(updated * 1000).toISOString().slice(0, 10)
      : null,
    source: "ExchangeRate-API (respaldo)",
  };
}

/**
 * Consulta el tipo de cambio USD→MXN.
 * Primero intenta Frankfurter. Si esa llamada falla, usa ExchangeRate-API.
 * La tasa se reutiliza durante 60 segundos: es la misma para todos los productos.
 */
async function getUsdToMxn({ fetchImpl = fetchJson, now = Date.now, bypassCache = false } = {}) {
  if (!bypassCache && cache && now() - cache.storedAt < CACHE_TTL_MS) {
    return { ...cache.value, cached: true };
  }

  let primaryError = null;
  try {
    const payload = await fetchImpl(FRANKFURTER_URL, { timeoutMs: 5000 });
    const value = readFrankfurter(payload);
    cache = { storedAt: now(), value };
    return { ...value, cached: false };
  } catch (error) {
    primaryError = error;
  }

  try {
    const payload = await fetchImpl(EXCHANGE_RATE_FALLBACK_URL, { timeoutMs: 5000 });
    const value = readExchangeRateApi(payload);
    cache = { storedAt: now(), value };
    return {
      ...value,
      cached: false,
      fallback_from: primaryError.message,
    };
  } catch (fallbackError) {
    const error = new Error("No fue posible obtener el tipo de cambio USD/MXN");
    error.code = "CURRENCY_UNAVAILABLE";
    error.details = {
      frankfurter: primaryError.message,
      fallback: fallbackError.message,
    };
    throw error;
  }
}

function clearCurrencyCache() {
  cache = null;
}

module.exports = {
  getUsdToMxn,
  clearCurrencyCache,
  FRANKFURTER_URL,
  EXCHANGE_RATE_FALLBACK_URL,
};
