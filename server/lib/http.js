function notFound(res, message) {
  return res.status(404).json({
    error: "NOT_FOUND",
    message,
  });
}

function allowCrossOrigin(_req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}

/**
 * Cliente HTTP compartido. Traduce timeouts, fallos de red y códigos
 * HTTP al error que después captura la API compuesta.
 */
async function fetchJson(url, { timeoutMs = 4000 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
    const wrapped = new Error(
      timedOut
        ? `Tiempo de espera agotado al consultar el servicio`
        : `No hubo respuesta del servicio`
    );
    wrapped.code = timedOut ? "TIMEOUT" : "NETWORK";
    wrapped.cause = error;
    throw wrapped;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const wrapped = new Error(body?.message || `El servicio respondió HTTP ${response.status}`);
    wrapped.status = response.status;
    wrapped.code = body?.error || "HTTP_ERROR";
    throw wrapped;
  }

  return body;
}

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

module.exports = { notFound, allowCrossOrigin, fetchJson, roundMoney };
