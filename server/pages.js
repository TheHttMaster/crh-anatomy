/* Páginas del sitio: navegación, metadatos y renderizado de plantillas */
const path = require("path");
const fs = require("fs");
const cfg = require("./config");

const NAV = [
  { href: "/", label: "Inicio", id: "inicio" },
  { href: "/atlas", label: "Atlas", id: "atlas" },
  { href: "/modelos", label: "Modelos 3D", id: "modelos" },
  { href: "/biblioteca", label: "Biblioteca", id: "biblioteca" },
  { href: "/patologias", label: "Patologías", id: "patologias" },
  { href: "/instrumentos", label: "Instrumentos", id: "instrumentos" },
  { href: "/quiz", label: "Quiz", id: "quiz" },
  { href: "/contacto", label: "Contáctanos", id: "contacto" },
  { href: "/asistente", label: "CrH-IA", id: "asistente", cta: true },
];

const PAGES = {
  "/": { id: "inicio", file: "inicio.html", title: "CrH-Anatomy · Aprende anatomía del suelo pélvico", description: "Plataforma educativa de anatomía del suelo pélvico para fisioterapia: atlas, láminas, biblioteca clínica, patologías, quiz y asistente CrH-IA.", scripts: ["chat-core", "widget", "home"] },
  "/atlas": { id: "atlas", file: "atlas.html", title: "Atlas y fichas · CrH-Anatomy", description: "Atlas 3D externo y fichas de origen, inserción, inervación y función de los músculos del suelo pélvico.", scripts: ["data/muscles", "chat-core", "widget", "atlas"] },
  "/modelos": { id: "modelos", file: "modelos.html", title: "Modelos 3D · CrH-Anatomy", description: "Visor 3D del suelo pélvico: músculos, huesos y ligamentos con sus nombres, fichas y vistas.", scripts: ["data/muscles", "chat-core", "widget", "viewer.bundle"] },
  "/biblioteca": { id: "biblioteca", file: "biblioteca.html", title: "Biblioteca clínica · CrH-Anatomy", description: "Quince temas que relacionan anatomía, función, evaluación e intervención en fisioterapia pélvica.", scripts: ["chat-core", "widget", "biblioteca"] },
  "/patologias": { id: "patologias", file: "patologias.html", title: "Patologías · CrH-Anatomy", description: "Guía educativa de patologías del suelo pélvico: cómo aparecen, qué estructuras afectan y su relevancia para fisioterapia.", scripts: ["data/pathologies", "chat-core", "widget", "patologias"] },
  "/instrumentos": { id: "instrumentos", file: "instrumentos.html", title: "Instrumentos de evaluación · CrH-Anatomy", description: "Catálogo educativo de 10 instrumentos de evaluación fisioterapéutica con protocolos, escalas, diagramas y su relación con el suelo pélvico.", scripts: ["data/catalog", "chat-core", "widget", "instrumentos"] },
  "/quiz": { id: "quiz", file: "quiz.html", title: "Quiz esencial · CrH-Anatomy", description: "Practica con el cuestionario esencial de anatomía pélvica o genera preguntas a partir de tus apuntes.", scripts: ["data/quiz", "chat-core", "widget", "quiz"] },
  "/contacto": { id: "contacto", file: "contacto.html", title: "Contacto · CrH-Anatomy", description: "Escríbenos para enviar sugerencias, reportar errores o colaborar con CrH-Anatomy.", scripts: ["contacto", "chat-core", "widget"] },
  "/asistente": { id: "asistente", file: "asistente.html", title: "CrH-IA · Asistente académico · CrH-Anatomy", description: "Conversa con CrH-IA, el asistente académico de CrH-Anatomy, para razonar anatomía y fisioterapia del suelo pélvico.", scripts: ["data/knowledge", "chat-core", "asistente"], noWidget: true },
};

const VIEWS = path.join(cfg.ROOT, "views");
const cache = new Map();
const view = (p) => {
  if (cfg.IS_PROD && cache.has(p)) return cache.get(p);
  const txt = fs.readFileSync(path.join(VIEWS, p), "utf8");
  if (cfg.IS_PROD) cache.set(p, txt);
  return txt;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function render(page, route = "") {
  const nav = NAV.map(
    (n) => `<a href="${n.href}"${n.cta ? ' class="nav-cta"' : ""}${n.id === page.id ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("\n      ");
  const scripts = ["data/knowledge", ...page.scripts.filter((x) => x !== "data/knowledge")]
    .map((s) => `<script src="/js/${s}.js" defer></script>`)
    .join("\n");
  const canonical = cfg.PUBLIC_URL && route ? `<link rel="canonical" href="${cfg.PUBLIC_URL}${route === "/" ? "" : route}">` : "";
  return view("layout.html")
    .replace(/{{title}}/g, esc(page.title))
    .replace(/{{description}}/g, esc(page.description))
    .replace("{{page}}", page.id)
    .replace("{{canonical}}", () => canonical)
    .replace("{{nav}}", () => nav)
    .replace("{{content}}", () => view("pages/" + page.file).replace(/{{contactEmail}}/g, () => esc(cfg.CONTACT_EMAIL)))
    .replace("{{widget}}", () => (page.noWidget ? "" : view("widget.html")))
    .replace("{{scripts}}", () => scripts);
}

module.exports = { NAV, PAGES, render };
