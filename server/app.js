const path = require("path");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const cfg = require("./config");
const { securityHeaders } = require("./security");
const { chatRouter } = require("./chat");
const { PAGES, render } = require("./pages");

function createApp({ ai } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", cfg.TRUST_PROXY === "false" ? false : isNaN(cfg.TRUST_PROXY) ? cfg.TRUST_PROXY : Number(cfg.TRUST_PROXY));

  app.use(securityHeaders);
  app.use(compression());
  if (cfg.CORS_ORIGIN) app.use("/api", cors({ origin: cfg.CORS_ORIGIN.split(",") }));
  app.use(express.json({ limit: "100kb" }));

  // Sonda de salud para Railway (no depende de Gemini).
  app.get("/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

  app.get("/robots.txt", (req, res) =>
    res.type("text/plain").send("User-agent: *\nAllow: /\n" + (cfg.PUBLIC_URL ? `Sitemap: ${cfg.PUBLIC_URL}/sitemap.xml\n` : ""))
  );
  app.get("/sitemap.xml", (req, res) => {
    if (!cfg.PUBLIC_URL) return res.status(404).end();
    const urls = Object.keys(PAGES).map((r) => `<url><loc>${cfg.PUBLIC_URL}${r === "/" ? "" : r}</loc></url>`).join("");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });

  for (const [route, page] of Object.entries(PAGES)) {
    app.get(route, (req, res) => res.type("html").send(render(page, route)));
  }

  app.use("/api", chatRouter(ai));

  app.use(
    express.static(path.join(cfg.ROOT, "public"), {
      maxAge: cfg.IS_PROD ? "7d" : 0,
      setHeaders(res, file) {
        // Los datos y scripts cambian con los despliegues: revalidar siempre.
        if (/\.(js|css)$/.test(file)) res.set("Cache-Control", cfg.IS_PROD ? "public, max-age=3600, must-revalidate" : "no-cache");
      },
    })
  );

  app.use((req, res) => {
    res.status(404).type("html").send(
      render({ id: "", title: "Página no encontrada · CrH-Anatomy", description: "Página no encontrada", file: "404.html", scripts: ["chat-core", "widget"] })
    );
  });

  // Errores no controlados (p. ej. JSON inválido)
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    if (req.path.startsWith("/api")) return res.status(status).json({ error: status === 400 || status === 413 ? "Solicitud no válida." : "Error interno." });
    res.status(status).type("text/plain").send("Error");
  });

  return app;
}

module.exports = { createApp };
