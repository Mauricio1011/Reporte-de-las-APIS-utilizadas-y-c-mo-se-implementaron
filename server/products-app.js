const express = require("express");
const { products, findProduct } = require("./data/products");
const { allowCrossOrigin, notFound } = require("./lib/http");

function createProductsApp() {
  const app = express();
  app.use(allowCrossOrigin);

  app.get("/", (_req, res) => {
    res.json({
      service: "catalogo-productos",
      description: "Información básica del producto y precio base en USD.",
      endpoints: ["GET /microservices/products", "GET /microservices/products/:id"],
    });
  });

  app.get("/microservices/products", (_req, res) => {
    res.json({ items: products });
  });

  app.get("/microservices/products/:id", (req, res) => {
    const product = findProduct(req.params.id);
    if (!product) {
      return notFound(res, `No existe el producto ${req.params.id}`);
    }
    res.json(product);
  });

  return app;
}

module.exports = { createProductsApp };
