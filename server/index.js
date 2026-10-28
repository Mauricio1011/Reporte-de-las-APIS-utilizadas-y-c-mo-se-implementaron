const { createProductsApp } = require("./products-app");
const { createInventoryApp } = require("./inventory-app");
const { createGatewayApp } = require("./gateway-app");

const GATEWAY_PORT = Number(process.env.PORT) || 3000;
const PRODUCTS_PORT = Number(process.env.PRODUCTS_PORT) || 3001;
const INVENTORY_PORT = Number(process.env.INVENTORY_PORT) || 3002;
const HOST = process.env.HOST || "127.0.0.1";

const productsBaseUrl = `http://${HOST}:${PRODUCTS_PORT}`;
const inventoryBaseUrl = `http://${HOST}:${INVENTORY_PORT}`;

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, HOST, () => resolve(server));
    server.on("error", reject);
  });
}

async function main() {
  await listen(createProductsApp(), PRODUCTS_PORT);
  await listen(createInventoryApp(), INVENTORY_PORT);
  await listen(
    createGatewayApp({ productsBaseUrl, inventoryBaseUrl }),
    GATEWAY_PORT
  );

  console.log("E-Commerce Gateway en ejecución");
  console.log(`  Tablero:     http://${HOST}:${GATEWAY_PORT}`);
  console.log(`  Compuesta:   http://${HOST}:${GATEWAY_PORT}/api/v1/product-summary/P-101`);
  console.log(`  Catálogo:    ${productsBaseUrl}/microservices/products/P-101`);
  console.log(`  Inventario:  ${inventoryBaseUrl}/microservices/inventory/P-101`);
  console.log(`  Documentación: http://${HOST}:${GATEWAY_PORT}/docs.html`);
}

main().catch((error) => {
  console.error("No se pudieron iniciar los servicios:", error.message);
  process.exit(1);
});
