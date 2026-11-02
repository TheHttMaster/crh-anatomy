const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../server/app");

let server, base;
test.before(async () => {
  // IA simulada: devuelve el último mensaje en mayúsculas
  const ai = { models: { generateContent: async ({ contents }) => ({ text: "ECO: " + contents.at(-1).parts[0].text }) } };
  server = createApp({ ai }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = (body) => fetch(base + "/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("health responde 200", async () => {
  const r = await fetch(base + "/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
});

test("todas las páginas responden con HTML y cabeceras de seguridad", async () => {
  for (const p of ["/", "/atlas", "/modelos", "/capas", "/lamina", "/biblioteca", "/patologias", "/quiz", "/asistente"]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers.get("content-type"), /text\/html/);
    assert.ok(r.headers.get("content-security-policy"));
    assert.ok((await r.text()).includes("CrH"));
  }
});

test("404 propio", async () => {
  const r = await fetch(base + "/no-existe");
  assert.equal(r.status, 404);
  assert.match(await r.text(), /no existe/i);
});

test("recursos estáticos del visor 3D", async () => {
  for (const p of ["/img/pelvis.glb", "/js/viewer.bundle.js", "/css/main.css", "/favicon.svg"]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
  }
});

test("api/status indica IA configurada", async () => {
  const j = await (await fetch(base + "/api/status")).json();
  assert.equal(j.aiConfigured, true);
});

test("chat valida entrada y responde", async () => {
  assert.equal((await post({ message: "   " })).status, 400);
  const r = await post({ message: "hola", history: [{ role: "user", text: "x" }, { role: "hack", text: "y" }] });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).reply, "ECO: hola");
});

test("JSON inválido devuelve 400 sin filtrar detalles", async () => {
  const r = await fetch(base + "/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: "{mal" });
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: "Solicitud no válida." });
});

test("cuerpo demasiado grande se rechaza", async () => {
  const r = await post({ message: "a".repeat(200000) });
  assert.equal(r.status, 413);
});

test("ruta api desconocida devuelve JSON 404", async () => {
  const r = await fetch(base + "/api/nada");
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});
