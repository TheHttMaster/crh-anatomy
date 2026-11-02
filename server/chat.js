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

function chatRouter(ai = cfg.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: cfg.GEMINI_API_KEY }) : null) {
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
    if (!ai) return res.status(503).json({ error: "La IA no está configurada. Revisa la llave de Gemini." });

    const contents = sanitizeHistory(history);
    contents.push({ role: "user", parts: [{ text: message.trim().slice(0, 12000) }] });

    try {
      const result = await ai.models.generateContent({
        model: cfg.GEMINI_MODEL,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION, abortSignal: AbortSignal.timeout(cfg.GEMINI_TIMEOUT_MS) },
      });
      res.json({ ok: true, reply: result.text || "No se recibió una respuesta de texto." });
    } catch (error) {
      console.error("Error de CrH-IA:", error.message);
      res.status(502).json({ error: "No se pudo obtener una respuesta. Revisa la conexión, la llave y los límites de uso." });
    }
  });

  router.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
  return router;
}

module.exports = { chatRouter, sanitizeHistory };
