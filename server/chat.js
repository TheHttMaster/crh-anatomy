/* CrH-IA · endpoint de chat con Gemini */
const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const cfg = require("./config");
const { createRateLimiter } = require("./security");

const SYSTEM_INSTRUCTION =
  "Eres CrH-IA, el asistente académico de CrH-Anatomy, una aplicación educativa de anatomía y fisioterapia. Ayuda al estudiante a razonar: cuando sea una pregunta de estudio o un cuestionario, no reveles automáticamente la respuesta final si el usuario está intentando resolverlo; plantea pistas, explica el razonamiento y permite que el estudiante intente responder. Si el usuario pide explícitamente una explicación directa, respóndela. Explica términos técnicos en español claro. Distingue hechos establecidos de incertidumbre. No inventes fuentes ni referencias científicas. La información es educativa y no sustituye una valoración profesional.";

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .filter((i) => i && (i.role === "user" || i.role === "assistant") && typeof i.text === "string" && i.text.trim())
    .map((i) => ({ role: i.role === "assistant" ? "model" : "user", parts: [{ text: i.text.slice(0, 12000) }] }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ¿Vale la pena reintentar? Sobrecarga (503), límites (429) y fallos transitorios del servicio.
function isTransient(err) {
  const status = Number(err && (err.status || err.code));
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  return /UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed/i.test(String(err && err.message));
}

async function generateWithRetry(ai, params, { retries = cfg.GEMINI_RETRIES, baseMs = cfg.GEMINI_RETRY_BASE_MS } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent({
        ...params,
        config: { ...params.config, abortSignal: AbortSignal.timeout(cfg.GEMINI_TIMEOUT_MS) },
      });
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === retries) break;
      // Espera exponencial con algo de azar para no sincronizar reintentos
      await sleep(baseMs * 2 ** attempt + Math.random() * baseMs * 0.25);
    }
  }
  lastErr.transient = isTransient(lastErr);
  throw lastErr;
}

function chatRouter(ai = cfg.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: cfg.GEMINI_API_KEY }) : null, opts = {}) {
  const router = express.Router();
  const rateLimit = createRateLimiter(cfg.RATE_LIMIT_PER_MIN);

  router.get("/status", (req, res) => {
    res.json({ ok: true, app: "CrH-Anatomy", aiConfigured: Boolean(ai), model: ai ? cfg.GEMINI_MODEL : null });
  });

  router.post("/chat", rateLimit, async (req, res) => {
    const { message, history } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Escribe una pregunta para continuar." });
    }
    if (!ai) return res.status(503).json({ code: "not_configured", retryable: false, error: "CrH-IA no está disponible en este momento." });

    const contents = sanitizeHistory(history);
    contents.push({ role: "user", parts: [{ text: message.trim().slice(0, 12000) }] });

    try {
      const result = await generateWithRetry(ai, { model: cfg.GEMINI_MODEL, contents, config: { systemInstruction: SYSTEM_INSTRUCTION } }, opts);
      res.json({ ok: true, reply: result.text || "No se recibió una respuesta de texto." });
    } catch (error) {
      console.error("Error de CrH-IA:", error.status || "", error.message);
      if (error.transient) {
        return res.status(503).set("Retry-After", "10").json({ code: "busy", retryable: true, error: "El servicio de IA está muy solicitado. Espera unos segundos y pulsa «Reintentar»; tu pregunta no se ha perdido." });
      }
      res.status(502).json({ code: "error", retryable: true, error: "No se pudo obtener una respuesta de CrH-IA. Inténtalo de nuevo en un momento." });
    }
  });

  router.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
  return router;
}

module.exports = { chatRouter, sanitizeHistory, generateWithRetry, isTransient };
