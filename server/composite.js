const { fetchJson, roundMoney } = require("./lib/http");
const { getUsdToMxn } = require("./currency-client");

const FAILURE_MESSAGES = {
  catalog: "Fallo simulado del catálogo de productos",
  inventory: "Fallo simulado del inventario",
  currency: "Fallo simulado del tipo de cambio",
};

function elapsedMs(startedAt) {
  return Math.round(performance.now() - startedAt);
}

/**
 * Ejecuta una pierna de la orquestación y nunca rechaza la promesa.
 * Así un servicio caído no cancela a los otros dos.
 */
async function runLeg(name, task, fail) {
  const startedAt = performance.now();
  try {
    if (fail === name) {
      throw Object.assign(new Error(FAILURE_MESSAGES[name]), { code: "SIMULATED_FAILURE" });
    }
    const value = await task();
    return { name, ok: true, value, ms: elapsedMs(startedAt) };
  } catch (error) {
    return { name, ok: false, error, ms: elapsedMs(startedAt) };
  }
}

function errorEntry(service, error) {
  return {
    service,
    code: error.code || "UNEXPECTED",
    message: error.message || "Error desconocido",
  };
}

/**
 * Contrato unificado del detalle de producto.
 * Las tres consultas se disparan a la vez con Promise.all.
 */
async function buildProductSummary({
  productId,
  productsBaseUrl,
  inventoryBaseUrl,
  fail = null,
  allowFailureSimulation = false,
  fetchImpl = fetchJson,
  getExchangeRate = getUsdToMxn,
}) {
  const simulatedFailure = allowFailureSimulation ? fail : null;
  const wallClockStart = performance.now();

  const [catalog, inventory, currency] = await Promise.all([
    runLeg(
      "catalog",
      () => fetchImpl(`${productsBaseUrl}/microservices/products/${encodeURIComponent(productId)}`),
      simulatedFailure
    ),
    runLeg(
      "inventory",
      () => fetchImpl(`${inventoryBaseUrl}/microservices/inventory/${encodeURIComponent(productId)}`),
      simulatedFailure
    ),
    runLeg("currency", () => getExchangeRate(), simulatedFailure),
  ]);

  const timing = {
    catalog: catalog.ms,
    inventory: inventory.ms,
    currency: currency.ms,
    parallel_total: elapsedMs(wallClockStart),
    sequential_estimate: catalog.ms + inventory.ms + currency.ms,
  };

  if (!catalog.ok) {
    const notFound = catalog.error.status === 404;
    return {
      product_id: productId,
      status: "ERROR",
      error_code: notFound ? "PRODUCT_NOT_FOUND" : "CATALOG_UNAVAILABLE",
      message: catalog.error.message,
      errors: [errorEntry("catalog", catalog.error)],
      timing_ms: timing,
    };
  }

  const product = catalog.value;
  const errors = [];
  let stockStatus = "UNKNOWN";
  let availableUnits = null;
  let warehouse = null;
  let location = null;
  let estimatedDeliveryDays = null;

  if (inventory.ok) {
    stockStatus = inventory.value.stock_status;
    availableUnits = inventory.value.available_units;
    warehouse = inventory.value.warehouse;
    location = inventory.value.location;
    estimatedDeliveryDays = inventory.value.estimated_delivery_days;
  } else {
    errors.push(errorEntry("inventory", inventory.error));
  }

  let priceMxn = null;
  let exchangeRate = null;
  let exchangeDate = null;
  let currencySource = null;

  if (currency.ok) {
    exchangeRate = currency.value.rate;
    exchangeDate = currency.value.date;
    currencySource = currency.value.source;
    priceMxn = roundMoney(product.price_usd * exchangeRate);
  } else {
    errors.push(errorEntry("currency", currency.error));
  }

  return {
    product_id: product.id,
    title: product.title,
    description: product.description,
    category: product.category,
    price_usd: product.price_usd,
    price_mxn: priceMxn,
    exchange_rate: exchangeRate,
    exchange_date: exchangeDate,
    stock_status: stockStatus,
    available_units: availableUnits,
    warehouse,
    location,
    estimated_delivery_days: estimatedDeliveryDays,
    currency_conversion_source: currencySource,
    status: errors.length === 0 ? "SUCCESS" : "PARTIAL",
    errors,
    timing_ms: timing,
  };
}

module.exports = { buildProductSummary };
