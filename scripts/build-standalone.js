/* Genera modelos-3d.html: un único archivo que funciona sin servidor (doble clic). */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
require('./build-viewer.js');
let main = rd('views/pages/modelos.html')
  .replace(/<div class="crumbs">.*?<\/div>/s, '')
  .replace(/ data-model="[^"]*"/, '')
  .replace(/<a href="\/atlas">Z-Anatomy o Pelviatlas<\/a>/, '<a href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer">Z-Anatomy</a> o <a href="https://www.pelvicatlas.com/" target="_blank" rel="noopener noreferrer">Pelviatlas</a>');
const logo = rd('public/img/logo.svg');
const glb = fs.readFileSync(path.join(root, 'public/img/pelvis.glb')).toString('base64');
const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Modelos 3D del suelo pélvico · CrH-Anatomy</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,650;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${rd('public/css/main.css')}
.site-header .wrap{justify-content:space-between}.brand-svg{height:44px;width:auto}</style></head>
<body>
<header class="site-header"><div class="wrap"><div class="brand-svg-wrap" style="display:flex;align-items:center">${logo.replace('<svg ', '<svg class="brand-svg" ')}</div><a class="btn sm" href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer">Z-Anatomy ↗</a></div></header>
<main>${main}</main>
<footer class="site-footer"><div class="wrap"><p class="foot-note" style="border:0;margin:0;padding:0">CrH-Anatomy · Contenido educativo; no sustituye la valoración de un profesional de la salud.</p></div></footer>
<script>window.CRH_STANDALONE=true;window.CRH_GLB_B64="${glb}";</script>
<script>${rd('public/js/data/muscles.js')}</script>
<script>${rd('public/js/viewer.bundle.js').replace(/<\/script/gi, '<\\/script')}</script>
</body></html>`;
fs.writeFileSync(path.join(root, 'modelos-3d.html'), html);
console.log('modelos-3d.html', (html.length / 1e6).toFixed(2) + ' MB');
