# E-Commerce Gateway & Dashboard

Práctica individual de **Desarrollo Web Integral (Unidad 3)** — Universidad Tecnológica de Chihuahua.

Una pantalla de detalle de producto deja de hacer tres peticiones por su cuenta. El navegador llama una sola vez a la API compuesta y esa API consulta, en paralelo, el catálogo, el inventario y el tipo de cambio USD/MXN.

**Alumno:** Mauricio De los Ríos López

## Qué levanta `npm start`

| Proceso | Puerto | Responsabilidad |
| --- | --- | --- |
| Gateway | 3000 | Tablero, contrato unificado y reenvío del listado |
| Catálogo | 3001 | Nombre, descripción, categoría y precio en USD |
| Inventario | 3002 | Unidades, almacén, ubicación y entrega estimada |
| Frankfurter | externo | Tasa USD → MXN en vivo |

Si Frankfurter no responde, el gateway intenta [ExchangeRate-API](https://open.er-api.com/v6/latest/USD). Si las dos fallan, la ficha del producto se entrega igual, con `status: "PARTIAL"` y sin precio en pesos.

## Requisitos

- Node.js 18 o superior (este proyecto se probó con Node 24)

## Ejecución

```bash
npm install
npm start
```

Abre el tablero en [http://127.0.0.1:3000](http://127.0.0.1:3000).

El contrato también se puede explorar en [http://127.0.0.1:3000/docs.html](http://127.0.0.1:3000/docs.html).

### Endpoints para Postman o el navegador

```text
GET http://127.0.0.1:3001/microservices/products/P-101
GET http://127.0.0.1:3002/microservices/inventory/P-101
GET https://api.frankfurter.app/latest?from=USD&to=MXN
GET http://127.0.0.1:3000/api/v1/product-summary/P-101
```

La colección lista para importar está en `postman/E-Commerce-Composite-API.postman_collection.json`.

Productos de ejemplo: `P-101`, `P-102`, `P-103`, `P-104` y `P-105`. `P-103` está agotado y `P-102` tiene stock bajo.

### Fallos de práctica

Con el servidor en desarrollo se puede simular la caída de una sola fuente:

```text
GET /api/v1/product-summary/P-101?fail=currency
GET /api/v1/product-summary/P-101?fail=inventory
GET /api/v1/product-summary/P-999
```

En producción (`NODE_ENV=production`) el parámetro `fail` se ignora.

## Pruebas automáticas

```bash
npm test
```

Cubren el contrato unificado, el precio de ejemplo 1200 USD × 17 = 20400 MXN, la respuesta parcial y el respaldo de divisas. No llaman a internet.

## Puertos

Si 3000, 3001 o 3002 están ocupados:

```bash
set PORT=4000
set PRODUCTS_PORT=4001
set INVENTORY_PORT=4002
npm start
```

En PowerShell usa `$env:PORT = "4000"` (y lo mismo para los otros dos).

## Flujo de ramas sugerido

El repositorio puede trabajar con una rama de integración y una rama por entrega:

```text
main
└── develop
    └── feature/composite-api
```

`main` conserva la versión que se entrega. `develop` integra la práctica. El trabajo de la API compuesta vive en `feature/composite-api` y se integra a `develop` cuando el tablero y las pruebas pasan.

## Reporte

El documento de evidencia está en [REPORTE.md](REPORTE.md). En la portada falta anotar el grupo.

Repositorio: https://github.com/Mauricio1011/Reporte-de-las-APIS-utilizadas-y-c-mo-se-implementaron
