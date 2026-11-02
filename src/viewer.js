import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/* Metadatos de cada malla (nombre en español + término en inglés del modelo Z-Anatomy) */
const META = {
  hip_l: ['Hueso coxal izquierdo', 'Hip bone', 'hueso'], hip_r: ['Hueso coxal derecho', 'Hip bone', 'hueso'],
  sacrum: ['Sacro', 'Sacrum', 'hueso'], coccyx: ['Cóccix', 'Coccyx', 'hueso'], symphysis: ['Sínfisis púbica', 'Pubic symphysis', 'hueso'],
  pubococ_l: ['Pubococcígeo izquierdo', 'Pubococcygeus muscle', 'elevador', 'Pubococcígeo'], pubococ_r: ['Pubococcígeo derecho', 'Pubococcygeus muscle', 'elevador', 'Pubococcígeo'],
  ilioco_l: ['Iliococcígeo izquierdo', 'Iliococcygeus muscle', 'elevador', 'Iliococcígeo'], ilioco_r: ['Iliococcígeo derecho', 'Iliococcygeus muscle', 'elevador', 'Iliococcígeo'],
  coccyg_l: ['Coccígeo izquierdo', 'Coccygeus muscle', 'elevador', 'Coccígeo'], coccyg_r: ['Coccígeo derecho', 'Coccygeus muscle', 'elevador', 'Coccígeo'],
  arch_l: ['Arco tendinoso del elevador del ano (izq.)', 'Tendinous arch of levator ani', 'ligamento'], arch_r: ['Arco tendinoso del elevador del ano (der.)', 'Tendinous arch of levator ani', 'ligamento'],
  eas_l: ['Esfínter anal externo izquierdo', 'External anal sphincter', 'esfinter', 'Esfínter externo del ano'], eas_r: ['Esfínter anal externo derecho', 'External anal sphincter', 'esfinter', 'Esfínter externo del ano'],
  obt_l: ['Obturador interno izquierdo', 'Obturator internus', 'muscle', 'Obturador interno'], obt_r: ['Obturador interno derecho', 'Obturator internus', 'muscle', 'Obturador interno'],
  piri_l: ['Piriforme izquierdo', 'Piriformis muscle', 'muscle', 'Piriforme'], piri_r: ['Piriforme derecho', 'Piriformis muscle', 'muscle', 'Piriforme'],
  sspin_l: ['Ligamento sacroespinoso izquierdo', 'Sacrospinous ligament', 'ligamento'], sspin_r: ['Ligamento sacroespinoso derecho', 'Sacrospinous ligament', 'ligamento'],
  stub_l: ['Ligamento sacrotuberoso izquierdo', 'Sacrotuberous ligament', 'ligamento'], stub_r: ['Ligamento sacrotuberoso derecho', 'Sacrotuberous ligament', 'ligamento'],
  bladder: ['Vejiga urinaria', 'Urinary bladder', 'visceral'], prostate: ['Próstata', 'Prostate', 'visceral'],
};
const GROUPS = [
  ['elevador', 'Diafragma pélvico · elevador del ano y coccígeo'], ['esfinter', 'Esfínter'], ['muscle', 'Músculos relacionados'],
  ['ligamento', 'Ligamentos'], ['hueso', 'Base ósea'], ['visceral', 'Vísceras (referencia)'],
];
const MISSING = [
  ['Puborrectal', 'Forma parte del complejo elevador del ano; en este modelo no está separado del pubococcígeo.'],
  ['Bulboesponjoso', 'Músculo perineal superficial; no incluido como malla independiente.'],
  ['Isquiocavernoso', 'Músculo perineal superficial; no incluido como malla independiente.'],
  ['Transverso superficial del periné', 'No incluido como malla independiente.'],
  ['Esfínter uretral externo', 'No incluido como malla independiente.'],
];
const BASE = { hueso: 0xe8dec7, elevador: 0xb83b4d, esfinter: 0x73263a, muscle: 0xcc6659, ligamento: 0xeccc73, visceral: 0xdc9ea8 };

const $ = (id) => document.getElementById(id);
const stage = $('stage');
if (!stage) throw new Error('no stage');

/* --- Escena --- */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
stage.appendChild(labelRenderer.domElement);
const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a92, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 1.6); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.6); scene.add(fill);

const items = {}; // id -> {mesh, label, visible, group}
let selected = null, center = new THREE.Vector3(), radius = 1, allLabels = false, ghost = false;

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

function view(name) {
  const d = radius * 3.4, c = center;
  const pos = { frontal: [0, 0, d], posterior: [0, 0, -d], superior: [0, d, 0.001], inferior: [0, -d, 0.001], lateral: [d, 0, 0], oblicua: [d * 0.62, d * 0.45, d * 0.8] }[name] || [0, 0, d];
  camera.position.set(c.x + pos[0], c.y + pos[1], c.z + pos[2]);
  camera.near = radius / 50; camera.far = radius * 30; camera.updateProjectionMatrix();
  controls.target.copy(c); controls.update();
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
}

/* --- Carga --- */
function loadBuffer() {
  if (window.CRH_GLB_B64) {
    const bin = atob(window.CRH_GLB_B64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return Promise.resolve(u.buffer);
  }
  return fetch(stage.dataset.model || '/img/pelvis.glb').then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
}

loadBuffer().then((buf) => new Promise((ok, ko) => new GLTFLoader().parse(buf, '', ok, ko))).then((gltf) => {
  const root = gltf.scene; scene.add(root);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const id = (o.userData && o.userData.crh_id) || o.name.replace(/_\d+$/, '');
    const m = META[id]; if (!m) return;
    o.material = new THREE.MeshStandardMaterial({ color: BASE[m[2]], roughness: 0.55, metalness: 0.02, side: THREE.DoubleSide, transparent: true, opacity: 1 });
    o.userData.id = id;
    const lab = document.createElement('div'); lab.className = 'lbl'; lab.textContent = m[0];
    const lo = new CSS2DObject(lab); lo.visible = false;
    const box = new THREE.Box3().setFromObject(o); lo.position.copy(box.getCenter(new THREE.Vector3())); scene.add(lo);
    items[id] = { mesh: o, label: lo, visible: true, group: m[2] };
  });
  const box = new THREE.Box3().setFromObject(root); box.getCenter(center); radius = box.getSize(new THREE.Vector3()).length() / 2;
  controls.minDistance = radius * 0.6; controls.maxDistance = radius * 8;
  resize(); view('oblicua'); buildList(); $('loading').hidden = true; tick();
}).catch((e) => { $('loading').textContent = 'No se pudo cargar el modelo 3D (' + e.message + ').'; });

/* --- Lista --- */
function buildList() {
  const list = $('structList'); list.innerHTML = '';
  GROUPS.forEach(([g, title]) => {
    const ids = Object.keys(items).filter((id) => items[id].group === g); if (!ids.length) return;
    const sec = document.createElement('div'); sec.className = 'grp';
    const h = document.createElement('div'); h.className = 'grp-h';
    h.innerHTML = '<span class="sw" style="background:#' + BASE[g].toString(16).padStart(6, '0') + '"></span><b></b>'; h.querySelector('b').textContent = title;
    const tg = document.createElement('button'); tg.type = 'button'; tg.className = 'btn sm ghost'; tg.textContent = 'Ocultar'; tg.dataset.on = '1';
    tg.addEventListener('click', () => { const on = tg.dataset.on !== '1'; tg.dataset.on = on ? '1' : '0'; tg.textContent = on ? 'Ocultar' : 'Mostrar'; ids.forEach((id) => setVisible(id, on)); });
    h.appendChild(tg); sec.appendChild(h);
    ids.forEach((id) => {
      const row = document.createElement('div'); row.className = 'srow'; row.dataset.id = id;
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.id = 'cb_' + id; cb.setAttribute('aria-label', 'Mostrar ' + META[id][0]);
      cb.addEventListener('change', () => setVisible(id, cb.checked));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sname';
      b.innerHTML = '<span></span><small></small>'; b.children[0].textContent = META[id][0]; b.children[1].textContent = META[id][1];
      b.addEventListener('click', () => select(id === selected ? null : id));
      row.appendChild(cb); row.appendChild(b); sec.appendChild(row);
    });
    list.appendChild(sec);
  });
  const miss = $('missingList'); miss.innerHTML = '';
  MISSING.forEach(([n, why]) => { const li = document.createElement('li'); li.innerHTML = '<b></b><span></span>'; li.children[0].textContent = n; li.children[1].textContent = ' · ' + why; miss.appendChild(li); });
}
function setVisible(id, on) {
  const it = items[id]; it.visible = on; it.mesh.visible = on; it.label.visible = on && (allLabels || id === selected);
  const cb = $('cb_' + id); if (cb) cb.checked = on; if (!on && selected === id) select(null);
}

/* --- Selección y ficha --- */
function select(id) {
  selected = id;
  Object.entries(items).forEach(([k, it]) => {
    const dim = id && k !== id;
    it.mesh.material.opacity = dim ? 0.12 : (ghost && it.group === 'hueso' ? 0.35 : 1);
    it.mesh.material.emissive.setHex(k === id ? 0x552211 : 0x000000);
    it.mesh.material.depthWrite = !dim;
    it.label.visible = it.visible && (allLabels || k === id);
  });
  document.querySelectorAll('.srow').forEach((r) => r.classList.toggle('on', r.dataset.id === id));
  const card = $('infoCard');
  if (!id) { card.innerHTML = '<p class="muted">Toca una estructura en la lista o en el modelo para ver su nombre y su ficha.</p>'; return; }
  const m = META[id], M = (window.CRH && CRH.muscles) || [], f = m[3] && M.find((x) => x.n === m[3]);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let h = '<h3>' + esc(m[0]) + '</h3><p class="muted mini">Término del modelo: <i>' + esc(m[1]) + '</i></p>';
  if (f) {
    h += '<div class="facts">' + [['Origen', f.o], ['Inserción', f.i], ['Inervación', f.inn], ['Función', f.f]].map((r) => '<div class="fact"><b>' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>').join('') + '</div>';
  } else h += '<p class="muted">Estructura de referencia para ubicar el resto de planos.</p>';
  if (!window.CRH_STANDALONE) h += '<div class="btn-row" style="margin-top:12px"><a class="btn sm" href="/asistente?q=' + encodeURIComponent('Explícame ' + (m[3] || m[0]) + ' y su relación con el suelo pélvico') + '">Preguntar a CrH-IA</a></div>';
  card.innerHTML = h;
}

/* --- Interacción con el modelo --- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
const tip = $('tip');
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(Object.values(items).filter((i) => i.visible && i.mesh.material.opacity > 0.2).map((i) => i.mesh), false)[0];
  return hit ? hit.object.userData.id : null;
}
const el = labelRenderer.domElement;
el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
el.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const id = pick(e); select(id === selected ? null : id); } down = null; });
el.addEventListener('pointermove', (e) => {
  if (e.buttons) { tip.hidden = true; return; }
  const id = pick(e); el.style.cursor = id ? 'pointer' : 'grab';
  if (id) { const r = stage.getBoundingClientRect(); tip.hidden = false; tip.textContent = META[id][0]; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px'; } else tip.hidden = true;
});
el.addEventListener('pointerleave', () => { tip.hidden = true; });

/* --- Controles --- */
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => view(b.dataset.view)));
$('optLabels').addEventListener('change', (e) => { allLabels = e.target.checked; select(selected); });
$('optGhost').addEventListener('change', (e) => { ghost = e.target.checked; select(selected); });
$('optRotate').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; controls.autoRotateSpeed = 1.2; });
$('showAll').addEventListener('click', () => { Object.keys(items).forEach((id) => setVisible(id, true)); document.querySelectorAll('.grp-h .btn').forEach((b) => { b.dataset.on = '1'; b.textContent = 'Ocultar'; }); select(null); });
$('onlyPelvic').addEventListener('click', () => { Object.keys(items).forEach((id) => setVisible(id, ['elevador', 'esfinter', 'hueso'].includes(items[id].group))); select(null); });
$('shot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a'); a.download = 'crh-anatomy-pelvis.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click();
});

function tick() {
  requestAnimationFrame(tick);
  controls.update();
  key.position.copy(camera.position).add(new THREE.Vector3(radius, radius, 0));
  fill.position.copy(camera.position).add(new THREE.Vector3(-radius, -radius * 0.5, radius));
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
}
