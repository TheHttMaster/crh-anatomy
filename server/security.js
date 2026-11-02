const { IS_PROD } = require("./config");

// CSP ajustada al sitio: scripts propios, estilos propios + Google Fonts, imágenes locales.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

function securityHeaders(req, res, next) {
  res.set({
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  if (IS_PROD) res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
}

// Límite por IP en memoria (suficiente para una sola instancia).
function createRateLimiter(perMinute) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (!v.some((t) => now - t < 60000)) hits.delete(k);
  }, 120000);
  timer.unref();
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= perMinute) {
      res.set("Retry-After", "60");
      return res.status(429).json({ error: "Demasiadas consultas seguidas. Espera un minuto e inténtalo de nuevo." });
    }
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };
}

module.exports = { securityHeaders, createRateLimiter };
