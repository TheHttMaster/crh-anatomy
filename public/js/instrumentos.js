(function () {
  var C = (window.CRH && CRH.catalog) || { instruments: [], pendientes: { items: [] } };
  var list = $('insList'), detail = $('insDetail'), grid = $('insGrid');
  var byId = {}; C.instruments.forEach(function (d) { byId[d.instrument_id] = d; });
  var h = window.esc;
  var STATUS = { content_draft: 'Borrador educativo', outline: 'Esquema inicial', reviewed: 'Revisado' };
  var ASSET = { diagrama_original: 'Diagrama', lamina_anatomica: 'Lámina anatómica', comparacion: 'Comparación', formulario: 'Formulario', imagen: 'Imagen' };

  function statusBadge(d) { return '<span class="badge draft">' + h(STATUS[d.review_status] || d.review_status) + '</span>'; }
  function verifyBadge(d) {
    return d.licensing && d.licensing.source_verification === 'pending' ? '<span class="badge pending">Fuentes por verificar</span>' : '';
  }
  function li(a) { return a.map(function (x) { return '<li>' + h(x) + '</li>'; }).join(''); }

  /* ---------- Listado y filtros ---------- */
  function uniq(fn) {
    var s = {}; C.instruments.forEach(function (d) { fn(d).forEach(function (v) { s[v] = 1; }); });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  }
  function fillSelect(el, label, values) {
    el.innerHTML = '<option value="">' + label + '</option>' + values.map(function (v) { return '<option>' + h(v) + '</option>'; }).join('');
  }
  fillSelect($('insCat'), 'Todas las categorías', uniq(function (d) { return [d.category]; }));
  fillSelect($('insSpec'), 'Todas las especialidades', uniq(function (d) { return d.related_specialties; }));

  function haystack(d) {
    return window.norm([d.instrument_id, d.title, d.category, d.purpose, d.related_specialties.join(' '), d.variables.join(' '), d.tools.join(' '),
      d.scales.map(function (s) { return s.name + ' ' + (s.abbreviation || ''); }).join(' '), d.protocols.join(' ')].join(' '));
  }
  var HAY = {}; C.instruments.forEach(function (d) { HAY[d.instrument_id] = haystack(d); });

  function renderList() {
    var q = window.norm($('insSearch').value), cat = $('insCat').value, sp = $('insSpec').value, n = 0;
    grid.innerHTML = '';
    C.instruments.forEach(function (d) {
      if (cat && d.category !== cat) return;
      if (sp && d.related_specialties.indexOf(sp) < 0) return;
      if (q && q.split(' ').some(function (w) { return HAY[d.instrument_id].indexOf(w) < 0; })) return;
      n++;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ins-card';
      b.innerHTML = '<span class="id">' + h(d.instrument_id) + '</span><h3>' + h(d.title) + '</h3><span class="chip" style="align-self:flex-start">' + h(d.category) + '</span>' +
        '<p>' + h(d.purpose) + '</p><span class="muted mini">' + d.scales.length + (d.scales.length === 1 ? ' escala' : ' escalas') + ' · ' + d.protocols.length + ' pruebas/protocolos</span>' + statusBadge(d);
      b.addEventListener('click', function () { location.hash = d.instrument_id; });
      grid.appendChild(b);
    });
    $('insEmpty').hidden = n > 0;
    $('insCount').textContent = n + ' de ' + C.instruments.length + ' instrumentos';
  }
  ['insSearch', 'insCat', 'insSpec'].forEach(function (id) { $(id).addEventListener('input', renderList); });
  $('insReset').addEventListener('click', function () { $('insSearch').value = ''; $('insCat').value = ''; $('insSpec').value = ''; renderList(); });
  $('insPending').innerHTML = C.pendientes.items.map(function (p) { return '<li title="' + h(p.ambito) + '"><b>' + h(p.nombre) + '</b> · ' + h(p.ambito) + '</li>'; }).join('');

  /* ---------- Ficha ---------- */
  function aiPrompt(d) {
    return 'Con base en el catálogo de CrH-Anatomy sobre «' + d.title + '» (propósito: ' + d.purpose + ' Escalas o pruebas: ' +
      d.scales.map(function (s) { return s.name; }).join(', ') + '), ayúdame a razonar cuándo se usa, qué precauciones exige y cómo se relaciona con el suelo pélvico. Dame pistas antes de la respuesta completa y no inventes puntuaciones ni referencias.';
  }
  function scalesTable(d) {
    var hasR = d.scales.some(function (s) { return s.range; }), hasF = d.scales.some(function (s) { return s.formula; });
    var rows = d.scales.map(function (s) {
      var links = (s.tambien_en || []).map(function (id) { return '<a class="xlink" href="#' + id + '">también en ' + id + '</a>'; }).join('');
      return '<tr><td><b>' + h(s.name) + '</b>' + links + '</td><td>' + h(s.abbreviation || '—') + '</td>' + (hasR ? '<td>' + h(s.range || '—') + '</td>' : '') +
        (hasF ? '<td>' + h(s.formula || '—') + '</td>' : '') + '<td>' + h(s.purpose) + '</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="ins-table"><thead><tr><th>Escala o medida</th><th>Sigla</th>' + (hasR ? '<th>Rango</th>' : '') + (hasF ? '<th>Fórmula</th>' : '') + '<th>Para qué sirve</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function visuals(d) {
    return '<div class="vis-grid">' + d.visual_assets.map(function (a) {
      if (a.file) {
        return '<figure class="vis"><button type="button" data-img="/img/instrumentos/' + h(a.file) + '" data-cap="' + h(a.description) + '"><img loading="lazy" src="/img/instrumentos/' + h(a.file) + '" alt="' + h(a.description) + '"></button><figcaption><b>' + h(a.asset_id) + '</b> · ' + h(a.description) + '</figcaption></figure>';
      }
      return '<figure class="vis pending"><div><span class="badge pending">En preparación</span><p class="muted mini" style="margin:8px 0 0"><b>' + h(a.asset_id) + '</b> · ' + h(ASSET[a.type] || a.type) + '<br>' + h(a.description) + '</p></div></figure>';
    }).join('') + '</div>';
  }
  function refs(d) {
    return '<ul class="refs">' + d.references.map(function (r) {
      var v = /verificar|pendiente/i.test(r);
      return '<li>' + h(r) + (v ? '<span class="verify">Por verificar</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function show(id) {
    var d = byId[id]; if (!d) return showList();
    var i = C.instruments.indexOf(d), prev = C.instruments[i - 1], next = C.instruments[i + 1];
    detail.innerHTML =
      '<button class="btn sm ins-back" type="button" id="insBack">← Todos los instrumentos</button>' +
      '<header><div><span class="id" style="font-family:var(--serif);color:var(--g);font-weight:700">' + h(d.instrument_id) + '</span><h2>' + h(d.title) + '</h2>' +
      '<div class="chip-row"><span class="chip">' + h(d.category) + '</span>' + d.related_specialties.map(function (s) { return '<span class="chip">' + h(s) + '</span>'; }).join('') + '</div></div>' +
      '<div class="chip-row">' + statusBadge(d) + verifyBadge(d) + '</div></header>' +
      '<div class="notice warn" style="margin-top:16px">' + h(d.content_notice) + '</div>' +
      '<div class="ins-sec"><h3>Propósito</h3><p>' + h(d.purpose) + '</p><div class="chip-row"><span class="muted mini">Población:</span>' + d.target_population.map(function (p) { return '<span class="chip">' + h(p) + '</span>'; }).join('') + '</div></div>' +
      '<div class="ins-sec"><h3>Relación con el suelo pélvico</h3><div class="pelvic"><ul>' + li(d.relevancia_suelo_pelvico) + '</ul><p class="muted mini" style="margin:10px 0 0">Enlace didáctico de CrH-Anatomy, pendiente de revisión académica. <a href="/biblioteca">Ver biblioteca</a></p></div></div>' +
      '<div class="ins-sec"><h3>Escalas y medidas</h3>' + scalesTable(d) + '</div>' +
      '<div class="ins-sec"><h3>Variables que se evalúan</h3><ul class="pill-list">' + li(d.variables) + '</ul></div>' +
      '<div class="ins-sec"><h3>Instrumentos y materiales</h3><ul class="pill-list">' + li(d.tools) + '</ul></div>' +
      '<div class="ins-sec"><h3>Protocolo y pruebas</h3><ol>' + li(d.protocols) + '</ol></div>' +
      '<div class="ins-sec"><h3>Diagramas</h3>' + visuals(d) + '</div>' +
      '<div class="ins-sec"><h3>Seguridad y precauciones</h3><div class="notice" style="margin:0"><ul style="margin:0;padding-left:1.1rem">' + li(d.safety) + '</ul></div></div>' +
      '<div class="ins-sec"><h3>Actividades de aprendizaje</h3><ul>' + li(d.activities) + '</ul>' +
      '<div class="btn-row" style="margin-top:14px"><a class="btn primary" href="/quiz?tema=instrumentos&ins=' + h(d.instrument_id) + '">Practicar con el quiz</a>' +
      '<a class="btn" href="/asistente?q=' + encodeURIComponent(aiPrompt(d)) + '">Preguntar a CrH-IA</a></div></div>' +
      '<details class="acc" style="margin-top:22px"><summary><span><span class="sum-title">Campos de registro sugeridos</span><span class="sum-sub">Plantilla informativa; esta aplicación no guarda datos de pacientes</span></span></summary><div class="acc-body"><ul class="pill-list">' + li(d.record_fields) + '</ul></div></details>' +
      '<div class="ins-sec"><h3>Referencias</h3>' + refs(d) + '<p class="muted mini">' + h((d.licensing && d.licensing.conditions) || '') + '</p></div>' +
      '<div class="btn-row" style="justify-content:space-between;margin-top:26px">' +
      (prev ? '<a class="btn sm" href="#' + prev.instrument_id + '">← ' + h(prev.instrument_id) + '</a>' : '<span></span>') +
      (next ? '<a class="btn sm" href="#' + next.instrument_id + '">' + h(next.instrument_id) + ' →</a>' : '<span></span>') + '</div>';
    list.hidden = true; detail.hidden = false; $('insNotice').hidden = true;
    document.title = d.instrument_id + ' · ' + d.title + ' · CrH-Anatomy';
    $('insBack').addEventListener('click', function () { history.pushState('', document.title, location.pathname); route(); });
    detail.querySelectorAll('[data-img]').forEach(function (b) { b.addEventListener('click', function () { openVis(b.dataset.img, b.dataset.cap); }); });
    window.scrollTo({ top: 0 });
  }
  function showList() {
    detail.hidden = true; list.hidden = false; $('insNotice').hidden = false; document.title = 'Instrumentos de evaluación · CrH-Anatomy';
  }
  function route() {
    var id = decodeURIComponent(location.hash.replace('#', ''));
    if (id) show(id); else showList();
  }
  window.addEventListener('hashchange', route);

  /* ---------- Ampliar diagrama ---------- */
  var modal = $('visModal');
  function openVis(src, cap) {
    $('visModalImg').src = src; $('visModalImg').alt = cap; $('visModalCap').textContent = cap;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; modal.querySelector('.modal-close').focus();
  }
  function closeVis() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  modal.querySelectorAll('[data-close]').forEach(function (n) { n.addEventListener('click', closeVis); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeVis(); });

  renderList(); route();
})();
