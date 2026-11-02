/* Páginas del sitio: navegación, metadatos y renderizado de plantillas */
const path = require("path");
const fs = require("fs");
const cfg = require("./config");

const NAV = [
  { href: "/", label: "Inicio", id: "inicio" },
  { href: "/atlas", label: "Atlas", id: "atlas" },
  { href: "/modelos", label: "Modelos 3D", id: "modelos" },
  { href: "/capas", label: "Capas", id: "capas" },
  { href: "/lamina", label: "Lámina", id: "lamina" },
  { href: "/biblioteca", label: "Biblioteca", id: "biblioteca" },
  { href: "/patologias", label: "Patologías", id: "patologias" },
  { href: "/quiz", label: "Quiz", id: "quiz" },
  { href: "/asistente", label: "CrH-IA", id: "asistente", cta: true },
];

const PAGES = {
  "/": { id: "inicio", file: "inicio.html", title: "CrH-Anatomy · Aprende anatomía del suelo pélvico", description: "Plataforma educativa de anatomía del suelo pélvico para fisioterapia: atlas, capas, láminas, biblioteca clínica, patologías, quiz y asistente CrH-IA.", scripts: ["chat-core", "widget", "home"] },
  "/atlas": { id: "atlas", file: "atlas.html", title: "Atlas y fichas · CrH-Anatomy", description: "Atlas 3D externo y fichas de origen, inserción, inervación y función de los músculos del suelo pélvico.", scripts: ["data/muscles", "chat-core", "widget", "atlas"] },
  "/modelos": { id: "modelos", file: "modelos.html", title: "Modelos 3D · CrH-Anatomy", description: "Visor 3D del suelo pélvico: músculos, huesos y ligamentos con sus nombres, fichas y vistas.", scripts: ["data/muscles", "chat-core", "widget", "viewer.bundle"] },
  "/capas": { id: "capas", file: "capas.html", title: "Capas anatómicas · CrH-Anatomy", description: "Explora la pelvis por capas: base ósea, diafragma pélvico, periné, estructuras urogenitales, nervios y vasos.", scripts: ["chat-core", "widget", "capas"] },
  "/lamina": { id: "lamina", file: "lamina.html", title: "Lámina anatómica · CrH-Anatomy", description: "Lámina conceptual del suelo pélvico y la región urogenital por capas, con lectura guiada.", scripts: ["chat-core", "widget", "lamina"] },
  "/biblioteca": { id: "biblioteca", file: "biblioteca.html", title: "Biblioteca clínica · CrH-Anatomy", description: "Quince temas que relacionan anatomía, función, evaluación e intervención en fisioterapia pélvica.", scripts: ["chat-core", "widget", "biblioteca"] },
  "/patologias": { id: "patologias", file: "patologias.html", title: "Patologías · CrH-Anatomy", description: "Guía educativa de patologías del suelo pélvico: cómo aparecen, qué estructuras afectan y su relevancia para fisioterapia.", scripts: ["data/pathologies", "chat-core", "widget", "patologias"] },
  "/quiz": { id: "quiz", file: "quiz.html", title: "Quiz esencial · CrH-Anatomy", description: "Practica con el cuestionario esencial de anatomía pélvica o genera preguntas a partir de tus apuntes.", scripts: ["data/quiz", "chat-core", "widget", "quiz"] },
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
    .replace("{{content}}", () => view("pages/" + page.file))
    .replace("{{widget}}", () => (page.noWidget ? "" : view("widget.html")))
    .replace("{{scripts}}", () => scripts);
}

module.exports = { NAV, PAGES, render };
