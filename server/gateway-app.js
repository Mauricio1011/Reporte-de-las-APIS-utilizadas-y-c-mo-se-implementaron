const path = require("path");
const express = require("express");
const { allowCrossOrigin, fetchJson } = require("./lib/http");
const { buildProductSummary } = require("./composite");

function createGatewayApp({ productsBaseUrl, inventoryBaseUrl }) {
  const app = express();
  const publicDir = path.join(__dirname, "..", "public");
  const allowFailureSimulation = process.env.NODE_ENV !== "production";

  app.use(allowCrossOrigin);
  app.use(express.static(publicDir));
  app.get("/openapi.yaml", (_req, res) => {
    res.type("yaml").sendFile(path.join(__dirname, "..", "openapi.yaml"));
  });

  app.get("/api/v1/health", async (_req, res) => {
    const checks = await Promise.all([
      probe("catalog", `${productsBaseUrl}/`),
      probe("inventory", `${inventoryBaseUrl}/`),
    ]);
    const healthy = checks.every((check) => check.ok);
    res.status(healthy ? 200 : 503).json({ status: healthy ? "UP" : "DEGRADED", checks });
  });

  app.get("/api/v1/products", async (_req, res) => {
    try {
      const catalog = await fetchJson(`${productsBaseUrl}/microservices/products`);
      res.json(catalog);
    } catch (error) {
      res.status(502).json({
        status: "ERROR",
        error_code: "CATALOG_UNAVAILABLE",
        message: error.message,
      });
    }
  });

  app.get("/api/v1/product-summary/:id", async (req, res) => {
    try {
      const summary = await buildProductSummary({
        productId: req.params.id,
        productsBaseUrl,
        inventoryBaseUrl,
        fail: typeof req.query.fail === "string" ? req.query.fail : null,
        allowFailureSimulation,
      });
      res.status(statusCodeFor(summary)).json(summary);
    } catch (error) {
      res.status(500).json({
        product_id: req.params.id,
        status: "ERROR",
        error_code: "UNEXPECTED",
        message: "Error inesperado al orquestar el resumen del producto",
      });
    }
  });

  return app;
}

function statusCodeFor(summary) {
  if (summary.status !== "ERROR") return 200;
  if (summary.error_code === "PRODUCT_NOT_FOUND") return 404;
  return 502;
}

async function probe(name, url) {
  try {
    await fetchJson(url, { timeoutMs: 2000 });
    return { name, ok: true };
  } catch (error) {
    return { name, ok: false, message: error.message };
  }
}

module.exports = { createGatewayApp };
