const express = require("express");
const { findInventory } = require("./data/inventory");
const { allowCrossOrigin, notFound } = require("./lib/http");

function createInventoryApp() {
  const app = express();
  app.use(allowCrossOrigin);

  app.get("/", (_req, res) => {
    res.json({
      service: "inventario-almacen",
      description: "Stock disponible, ubicación física y tiempo estimado de entrega.",
      endpoints: ["GET /microservices/inventory/:id"],
    });
  });

  app.get("/microservices/inventory/:id", (req, res) => {
    const record = findInventory(req.params.id);
    if (!record) {
      return notFound(res, `No hay inventario para el producto ${req.params.id}`);
    }
    res.json(record);
  });

  return app;
}

module.exports = { createInventoryApp };
