const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProductSummary } = require("../server/composite");
const { stockStatus } = require("../server/data/inventory");
const { getUsdToMxn, clearCurrencyCache } = require("../server/currency-client");

const product = {
  id: "P-101",
  title: "Laptop Gamer XYZ",
  description: "Equipo de alto rendimiento",
  category: "Cómputo",
  price_usd: 1200,
};

const stock = {
  product_id: "P-101",
  available_units: 15,
  stock_status: "IN_STOCK",
  warehouse: "Chihuahua Norte",
  location: "Pasillo A-12",
  estimated_delivery_days: 2,
};

function dependencies({ catalog = product, inventory = stock, rate = { rate: 17, date: "2026-10-28", source: "Frankfurter External API" }, fail = null } = {}) {
  return {
    productId: "P-101",
    productsBaseUrl: "http://catalogo",
    inventoryBaseUrl: "http://inventario",
    fail,
    allowFailureSimulation: true,
    fetchImpl: async (url) => {
      if (url.endsWith("/microservices/products/P-101")) {
        if (catalog instanceof Error) throw catalog;
        return catalog;
      }
      if (url.endsWith("/microservices/inventory/P-101")) {
        if (inventory instanceof Error) throw inventory;
        return inventory;
      }
      throw new Error(`URL inesperada: ${url}`);
    },
    getExchangeRate: async () => {
      if (rate instanceof Error) throw rate;
      return rate;
    },
  };
}

test("consolida catálogo, inventario y divisa en el contrato pedido", async () => {
  const summary = await buildProductSummary(dependencies());

  assert.equal(summary.status, "SUCCESS");
  assert.equal(summary.product_id, "P-101");
  assert.equal(summary.title, "Laptop Gamer XYZ");
  assert.equal(summary.price_usd, 1200);
  assert.equal(summary.price_mxn, 20400);
  assert.equal(summary.stock_status, "IN_STOCK");
  assert.equal(summary.available_units, 15);
  assert.equal(summary.currency_conversion_source, "Frankfurter External API");
  assert.deepEqual(summary.errors, []);
});

test("sigue entregando el producto si la divisa no responde", async () => {
  const summary = await buildProductSummary(
    dependencies({ rate: Object.assign(new Error("Frankfurter no respondió"), { code: "CURRENCY_UNAVAILABLE" }) })
  );

  assert.equal(summary.status, "PARTIAL");
  assert.equal(summary.price_usd, 1200);
  assert.equal(summary.price_mxn, null);
  assert.equal(summary.currency_conversion_source, null);
  assert.equal(summary.stock_status, "IN_STOCK");
  assert.equal(summary.available_units, 15);
  assert.equal(summary.errors[0].service, "currency");
});

test("informa producto inexistente sin inventar un precio", async () => {
  const missing = Object.assign(new Error("No existe el producto P-101"), { status: 404, code: "NOT_FOUND" });
  const summary = await buildProductSummary(dependencies({ catalog: missing }));

  assert.equal(summary.status, "ERROR");
  assert.equal(summary.error_code, "PRODUCT_NOT_FOUND");
  assert.equal(summary.price_mxn, undefined);
});

test("el parámetro de práctica puede tumbar solo el inventario", async () => {
  const summary = await buildProductSummary(dependencies({ fail: "inventory" }));

  assert.equal(summary.status, "PARTIAL");
  assert.equal(summary.stock_status, "UNKNOWN");
  assert.equal(summary.available_units, null);
  assert.equal(summary.price_mxn, 20400);
  assert.equal(summary.errors[0].service, "inventory");
});

test("clasifica el stock del almacén", () => {
  assert.equal(stockStatus(0), "OUT_OF_STOCK");
  assert.equal(stockStatus(5), "LOW_STOCK");
  assert.equal(stockStatus(6), "IN_STOCK");
});

test("usa el servicio de respaldo cuando Frankfurter falla", async () => {
  clearCurrencyCache();
  let calls = 0;
  const rate = await getUsdToMxn({
    bypassCache: true,
    fetchImpl: async (url) => {
      calls += 1;
      if (url.includes("frankfurter")) {
        throw Object.assign(new Error("caído"), { code: "NETWORK" });
      }
      return { result: "success", rates: { MXN: 18.5 }, time_last_update_unix: 1793145751 };
    },
  });

  assert.equal(calls, 2);
  assert.equal(rate.source, "ExchangeRate-API (respaldo)");
  assert.equal(rate.rate, 18.5);
  assert.equal(rate.fallback_from, "caído");
  clearCurrencyCache();
});
