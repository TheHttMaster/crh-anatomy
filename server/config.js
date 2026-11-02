/* Configuración centralizada (variables de entorno). Railway inyecta PORT. */
const fs = require("fs");
const path = require("path");

// En local, carga .env si existe (no pisa variables ya definidas, p. ej. las de Railway).
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile) && typeof process.loadEnvFile === "function") process.loadEnvFile(envFile);

const IS_PROD = process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT);
const int = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

module.exports = {
  IS_PROD,
  ROOT: path.join(__dirname, ".."),
  PORT: int(process.env.PORT, 3000),
  // En Railway (o producción) hay que escuchar en todas las interfaces.
  HOST: process.env.HOST || (IS_PROD ? "0.0.0.0" : "127.0.0.1"),
  // Railway termina TLS en su proxy: confiamos en 1 salto para leer la IP real.
  TRUST_PROXY: process.env.TRUST_PROXY !== undefined ? process.env.TRUST_PROXY : IS_PROD ? "1" : "false",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  GEMINI_TIMEOUT_MS: int(process.env.GEMINI_TIMEOUT_MS, 30000),
  RATE_LIMIT_PER_MIN: int(process.env.RATE_LIMIT_PER_MIN, 20),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  // URL pública (p. ej. https://crh-anatomy.up.railway.app) para sitemap y metadatos.
  PUBLIC_URL: (process.env.PUBLIC_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? "https://" + process.env.RAILWAY_PUBLIC_DOMAIN : "")).replace(/\/$/, ""),
};
