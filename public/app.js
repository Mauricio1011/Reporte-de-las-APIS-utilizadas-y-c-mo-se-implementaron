const list = document.querySelector("#product-list");
const catalogStatus = document.querySelector("#catalog-status");
const detail = document.querySelector("#detail");
const requestLine = document.querySelector("#request-line");

const stockLabels = {
  IN_STOCK: "En existencia",
  LOW_STOCK: "Pocas unidades",
  OUT_OF_STOCK: "Agotado",
  UNKNOWN: "Sin dato de almacén",
};

const sourceLabels = {
  catalog: "Catálogo",
  inventory: "Inventario",
  currency: "Divisas",
};

let products = [];
let selectedId = null;
let failureMode = null;

const money = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  MXN: new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }),
};

function formatMoney(currency, amount) {
  if (amount === null || amount === undefined) return "No disponible";
  return money[currency].format(amount);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pill(status) {
  if (status === "SUCCESS" || status === "IN_STOCK") return "ok";
  if (status === "ERROR" || status === "OUT_OF_STOCK") return "bad";
  return "warn";
}

async function loadCatalog() {
  try {
    const response = await fetch("/api/v1/products");
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "No se pudo leer el catálogo");
    products = body.items;
    catalogStatus.textContent = `${products.length} productos en el microservicio de catálogo.`;
    renderList();
    if (!selectedId && products.length > 0) selectProduct(products[0].id);
  } catch (error) {
    catalogStatus.textContent = error.message;
  }
}

function renderList() {
  list.innerHTML = "";
  products.forEach((product) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-button";
    button.setAttribute("aria-pressed", String(product.id === selectedId));
    button.innerHTML = `<strong>${escapeHtml(product.title)}</strong><span>${escapeHtml(product.category)} · ${escapeHtml(formatMoney("USD", product.price_usd))}</span>`;
    button.addEventListener("click", () => {
      failureMode = null;
      selectProduct(product.id);
    });
    item.appendChild(button);
    list.appendChild(item);
  });
}

async function selectProduct(productId) {
  selectedId = productId;
  renderList();
  const url = failureMode
    ? `/api/v1/product-summary/${encodeURIComponent(productId)}?fail=${failureMode}`
    : `/api/v1/product-summary/${encodeURIComponent(productId)}`;
  requestLine.textContent = `GET ${url}`;
  detail.innerHTML = `<p class="quiet">Consultando la API compuesta…</p>`;

  try {
    const response = await fetch(url);
    const body = await response.json();
    if (body.status === "ERROR") {
      renderError(body);
      return;
    }
    renderSummary(body);
  } catch (error) {
    detail.innerHTML = `<p class="error-box">${error.message}</p>`;
  }
}

function renderError(body) {
  detail.innerHTML = `
    <div class="error-box">
      <span class="pill bad">${body.status}</span>
      <h3>No se armó la ficha</h3>
      <p>${escapeHtml(body.message)}</p>
    </div>
    ${jsonBlock(body)}
  `;
}

function renderSummary(summary) {
  const failed = new Set(summary.errors.map((error) => error.service));
  const notice = summary.status === "PARTIAL"
    ? `<p class="notice">Respuesta parcial. ${escapeHtml(summary.errors.map((error) => error.message).join(" "))}</p>`
    : "";

  detail.innerHTML = `
    ${notice}
    <div class="sheet-top">
      <div>
        <p class="kicker">${escapeHtml(summary.category)}</p>
        <h3>${escapeHtml(summary.title)}</h3>
      </div>
      <span class="pill ${pill(summary.status)}">${escapeHtml(summary.status)}</span>
    </div>
    <p class="description">${escapeHtml(summary.description)}</p>
    <div class="prices">
      <div>
        <span>Precio base</span>
        <p>${formatMoney("USD", summary.price_usd)}</p>
      </div>
      <div>
        <span>Precio en pesos</span>
        <p>${formatMoney("MXN", summary.price_mxn)}</p>
      </div>
    </div>
    <dl class="meta">
      <div>
        <dt>Inventario</dt>
        <dd><span class="pill ${pill(summary.stock_status)}">${escapeHtml(stockLabels[summary.stock_status] || summary.stock_status)}</span></dd>
      </div>
      <div>
        <dt>Unidades</dt>
        <dd>${escapeHtml(summary.available_units ?? "Sin dato")}</dd>
      </div>
      <div>
        <dt>Almacén</dt>
        <dd>${escapeHtml(summary.warehouse ?? "Sin dato")}</dd>
      </div>
      <div>
        <dt>Ubicación</dt>
        <dd>${escapeHtml(summary.location ?? "Sin dato")}</dd>
      </div>
      <div>
        <dt>Entrega estimada</dt>
        <dd>${summary.estimated_delivery_days == null ? "Sin fecha" : `${escapeHtml(summary.estimated_delivery_days)} días`}</dd>
      </div>
      <div>
        <dt>Fuente del tipo de cambio</dt>
        <dd>${escapeHtml(summary.currency_conversion_source ?? "No disponible")}</dd>
      </div>
    </dl>
    <div class="sources">
      ${sourceCard("catalog", !failed.has("catalog"), `${summary.timing_ms.catalog} ms`)}
      ${sourceCard("inventory", !failed.has("inventory"), `${summary.timing_ms.inventory} ms`)}
      ${sourceCard("currency", !failed.has("currency"), summary.exchange_rate ? `1 USD = ${summary.exchange_rate} MXN` : "sin tasa")}
    </div>
    <p class="timing">
      Las tres consultas corrieron en paralelo y tardaron ${summary.timing_ms.parallel_total} ms.
      En secuencia habrían sumado cerca de ${summary.timing_ms.sequential_estimate} ms.
    </p>
    <div class="choices" role="group" aria-label="Simular fallos">
      ${choiceButton(null, "Servicios en línea")}
      ${choiceButton("currency", "Simular fallo de divisas")}
      ${choiceButton("inventory", "Simular fallo de inventario")}
    </div>
    <details>
      <summary>JSON devuelto por la API compuesta</summary>
      ${jsonBlock(summary)}
    </details>
  `;

  detail.querySelectorAll(".choice").forEach((button) => {
    button.addEventListener("click", () => {
      failureMode = button.dataset.fail || null;
      selectProduct(selectedId);
    });
  });
}

function sourceCard(service, ok, detailText) {
  return `
    <article class="source">
      <strong>${sourceLabels[service]}</strong>
      <span class="pill ${ok ? "ok" : "bad"}">${ok ? "OK" : "Fallo"}</span>
      <span>${detailText}</span>
    </article>
  `;
}

function choiceButton(mode, label) {
  const pressed = failureMode === mode;
  const value = mode ?? "";
  return `<button type="button" class="choice" data-fail="${value}" aria-pressed="${pressed}">${label}</button>`;
}

function jsonBlock(value) {
  return `<pre class="json-block">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

loadCatalog();
