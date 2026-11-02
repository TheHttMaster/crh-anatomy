const cfg = require("./config");
const { createApp } = require("./app");

const app = createApp();
const server = app.listen(cfg.PORT, cfg.HOST, () => {
  console.log(`CrH-Anatomy escuchando en http://${cfg.HOST}:${cfg.PORT} (${cfg.IS_PROD ? "producción" : "desarrollo"})`);
  if (!cfg.GEMINI_API_KEY) console.log("Aviso: GEMINI_API_KEY no está definida; el chat usará solo la búsqueda local.");
});

// Apagado ordenado: Railway envía SIGTERM al redesplegar.
function shutdown(signal) {
  console.log(`${signal} recibido, cerrando…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
