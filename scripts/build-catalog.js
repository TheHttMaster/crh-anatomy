/* Valida el catálogo de instrumentos y genera public/js/data/catalog.js.
   Fuente: content/catalogo/ (catálogo original INS-01…10 + capa crh_suelo_pelvico.json). */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const src = path.join(root, "content", "catalogo");
const REQUIRED = ["instrument_id", "title", "category", "related_specialties", "target_population", "purpose", "variables", "tools", "protocols", "scales", "visual_assets", "record_fields", "safety", "activities", "references", "licensing", "review_status", "version", "language", "content_notice"];

function build() {
  const errors = [];
  const master = JSON.parse(fs.readFileSync(path.join(src, "catalogo_maestro.json"), "utf8"));
  const overlay = JSON.parse(fs.readFileSync(path.join(src, "crh_suelo_pelvico.json"), "utf8"));
  const assetDir = path.join(root, "public", "img", "instrumentos");
  const instruments = [];
  const seen = new Set();
  for (const item of master.instruments) {
    const d = JSON.parse(fs.readFileSync(path.join(src, item.file), "utf8"));
    for (const k of REQUIRED) if (!(k in d)) errors.push(`${item.instrument_id}: falta el campo ${k}`);
    if (d.instrument_id !== item.instrument_id) errors.push(`${item.instrument_id}: el id del archivo no coincide con el índice`);
    if (seen.has(d.instrument_id)) errors.push(`${d.instrument_id}: id duplicado`);
    seen.add(d.instrument_id);
    for (const a of d.visual_assets || []) {
      if (a.file && !fs.existsSync(path.join(assetDir, a.file))) errors.push(`${d.instrument_id}: falta el recurso ${a.file}`);
    }
    if (!overlay.relevancia[d.instrument_id]) errors.push(`${d.instrument_id}: sin texto de relevancia para suelo pélvico`);
    d.relevancia_suelo_pelvico = overlay.relevancia[d.instrument_id] || [];
    instruments.push(d);
  }
  // Escalas que aparecen en más de un instrumento (para enlazar fichas)
  const norm = (s) => s.toLowerCase().replace(/six minute|6 minute/g, "6 minute").replace(/[^a-z0-9 ]/g, "").trim();
  const byScale = new Map();
  for (const d of instruments) for (const s of d.scales) {
    const k = norm(s.name); if (!byScale.has(k)) byScale.set(k, []);
    byScale.get(k).push(d.instrument_id);
  }
  for (const d of instruments) {
    d.scales.forEach((s) => {
      const ids = byScale.get(norm(s.name)).filter((id) => id !== d.instrument_id);
      if (ids.length) s.tambien_en = ids;
    });
  }
  return { errors, data: { catalog_id: master.catalog_id, title: master.title, version: master.version, status: master.status, instruments, pendientes: overlay.pendientes_suelo_pelvico } };
}

if (require.main === module) {
  const { errors, data } = build();
  if (errors.length) { console.error("Errores en el catálogo:\n - " + errors.join("\n - ")); process.exit(1); }
  const out = path.join(root, "public", "js", "data", "catalog.js");
  fs.writeFileSync(out, "window.CRH=window.CRH||{};window.CRH.catalog=" + JSON.stringify(data) + ";\n");
  console.log(`catalog.js generado: ${data.instruments.length} instrumentos, ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
}
module.exports = { build };
