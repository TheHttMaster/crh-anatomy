/* CrH-Anatomy · motor de chat compartido (widget + página CrH-IA).
   La conversación se guarda en sessionStorage y continúa entre secciones. */
(function () {
  var KEY = 'crh.chat.v1';
  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { history = []; }
  var views = [];
  var busy = false;
  var aiState = null; // true | false | null

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-40))); } catch (e) {} }

  /* ----- Markdown mínimo y seguro ----- */
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>')
      // enlaces internos [texto](/ruta) únicamente
      .replace(/\[([^\]]+)\]\((\/[A-Za-z0-9\-_/#?=&.%]*)\)/g, '<a href="$2">$1</a>');
  }
  function format(text) {
    var lines = window.esc(text).split(/\r?\n/), out = [], list = null, para = [];
    function flushP() { if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; } }
    function flushL() { if (list) { out.push('<' + list.t + '>' + list.i.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.t + '>'); list = null; } }
    lines.forEach(function (ln) {
      var m;
      if (!ln.trim()) { flushP(); flushL(); return; }
      if ((m = ln.match(/^#{1,3}\s+(.+)$/))) { flushP(); flushL(); out.push('<h4>' + inline(m[1]) + '</h4>'); return; }
      if ((m = ln.match(/^\s*[-*•]\s+(.+)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', i: [] }; } list.i.push(m[1]); return; }
      if ((m = ln.match(/^\s*\d+[.)]\s+(.+)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', i: [] }; } list.i.push(m[1]); return; }
      flushL(); para.push(ln);
    });
    flushP(); flushL();
    return out.join('');
  }

  /* ----- Búsqueda local (respaldo sin IA): biblioteca + catálogo de instrumentos ----- */
  var CATS = ['Anatomía clínica femenina', 'Razonamiento clínico', 'Terminología y evidencia', 'Aprendizaje activo', 'Variación anatómica', 'Salud obstétrica', 'Neurovascular', 'Anatomía', 'Músculos', 'Fisiología', 'Clínica', 'Valoración', 'Fisioterapia', 'Ciclo vital'];
  function rxEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Los bloques 1–15 guardan "título + título + categoría + texto" juntos; se separa SOLO al mostrar (los datos no se modifican).
  function cleanBody(it) {
    var t = it.text || '', title = (it.title || '').trim(), bare = title.replace(/^\d+\.\s*/, '');
    t = t.replace(new RegExp('^\\s*' + rxEsc(title) + '\\s*(?:' + rxEsc(bare) + ')?\\s*'), '');
    CATS.some(function (c) { if (t.indexOf(c + ' ') === 0) { t = t.slice(c.length).trim(); return true; } });
    return t;
  }
  function loadCatalog() {
    if (window.CRH && window.CRH.catalog) return Promise.resolve();
    return new Promise(function (ok) {
      var s = document.createElement('script'); s.src = '/js/data/catalog.js'; s.onload = ok; s.onerror = ok; document.head.appendChild(s);
    });
  }
  function corpus() {
    var K = ((window.CRH && window.CRH.knowledge) || []).map(function (it) {
      return { title: it.title.replace(/^\d+\.\s*/, ''), text: cleanBody(it), link: '/biblioteca?q=' + encodeURIComponent(it.title.replace(/^\d+\.\s*/, '')), where: 'Biblioteca' };
    });
    var C = (((window.CRH && window.CRH.catalog) || {}).instruments || []).map(function (d) {
      return { title: d.instrument_id + ' · ' + d.title, text: d.purpose + ' Escalas y pruebas: ' + d.scales.map(function (s) { return s.name; }).join(', ') + '. ' + d.relevancia_suelo_pelvico.join(' '), link: '/instrumentos#' + d.instrument_id, where: 'Instrumentos' };
    });
    return K.concat(C);
  }
  function rank(q, items) {
    var words = q.split(' ').filter(function (w) { return w.length > 2; });
    return items.map(function (it) {
      var t = window.norm(it.title), b = window.norm(it.text), s = 0;
      if (q && t.indexOf(q) > -1) s += 7;
      words.forEach(function (w) { if (t.indexOf(w) > -1) s += 4; if (b.indexOf(w) > -1) s += 1; });
      return { it: it, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
  }
  var FOLLOW = /^(y|e|pero|entonces|y\s+(entonces|eso)|(¿\s*)?(y\s+)?(cu[aá]l|qu[eé]|c[oó]mo|d[oó]nde|por qu[eé])\s+(es|son|hace|hacen|era)\s+(su|sus|la|el|lo)\b)/i;
  function previousUser(skip) {
    for (var i = history.length - 1; i >= 0; i--) if (history[i].role === 'user' && history[i].text !== skip) return history[i].text;
    return '';
  }
  // Devuelve null si no hay coincidencia suficiente.
  function localAnswer(raw) {
    var items = corpus(), q = window.norm(raw);
    var ranked = rank(q, items);
    // Pregunta de seguimiento ("¿y su inervación?"): se amplía con el tema anterior.
    if ((!ranked.length || q.split(' ').length <= 5) && FOLLOW.test(raw.trim())) {
      var prev = previousUser(raw);
      if (prev) ranked = rank(window.norm(prev + ' ' + raw), items);
    }
    if (!ranked.length) return null;
    var top = ranked.slice(0, 3), first = top[0].it;
    var txt = '### ' + first.title + '\n' + first.text + '\n\n[Abrir en ' + first.where + '](' + first.link + ')';
    if (top.length > 1) txt += '\n\n### Temas relacionados\n' + top.slice(1).map(function (x) { return '- [' + x.it.title + '](' + x.it.link + ')'; }).join('\n');
    return txt;
  }
  var NO_MATCH = 'No encontré una coincidencia en el contenido integrado. Prueba con el nombre anatómico, un sinónimo o una función; por ejemplo: **puborrectal**, **membrana perineal**, **inervación** o **continencia**.';

  /* ----- API ----- */
  function context() {
    // Los mensajes de error nunca viajan como contexto a la IA.
    return history.filter(function (h) { return !h.err; }).slice(-11, -1).map(function (h) { return { role: h.role, text: h.text }; });
  }
  function callApi(message) {
    return fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: context() })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.ok) { var e = new Error(d.error || 'La solicitud no pudo completarse.'); e.status = r.status; e.code = d.code; e.retryable = d.retryable; throw e; }
        return d.reply || 'No se recibió una respuesta de texto.';
      });
    });
  }

  function checkStatus() {
    return fetch('/api/status').then(function (r) { return r.json(); }).then(function (d) {
      aiState = !!d.aiConfigured; paintStatus();
    }).catch(function () { aiState = null; paintStatus(); });
  }
  function paintStatus() {
    views.forEach(function (v) {
      if (!v.status) return;
      var ok = aiState === true, off = aiState === false;
      v.status.innerHTML = '<i class="' + (ok ? 'ok' : (off ? 'off' : '')) + '"></i>' +
        (ok ? 'En línea · asistente académico' : off ? 'Modo biblioteca (IA no disponible)' : 'Sin conexión · modo biblioteca');
    });
  }

  /* ----- Render ----- */
  function msgNode(m, isLast) {
    var d = document.createElement('div');
    d.className = 'msg ' + (m.role === 'user' ? 'user' : 'bot') + (m.err ? ' err' : '');
    if (m.role === 'user') d.textContent = m.text; else d.innerHTML = format(m.text);
    if (m.retry && isLast) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.style.marginTop = '10px'; b.textContent = 'Reintentar';
      b.addEventListener('click', retry); d.appendChild(b);
    }
    return d;
  }
  function welcome() {
    var w = document.createElement('div'); w.className = 'welcome';
    w.innerHTML = '<div class="avatar" aria-hidden="true">CrH</div><h3>Explora. Razona. Comprende.</h3>' +
      '<p class="muted">Pregúntame sobre anatomía del suelo pélvico, fisioterapia e instrumentos de evaluación. Te daré pistas para que razones la respuesta.</p>';
    var s = document.createElement('div'); s.className = 'sugg';
    ['Elevador del ano', 'Inervación del suelo pélvico', 'Micción y defecación', 'Evaluación fisioterapéutica'].forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip-btn'; b.textContent = t;
      b.addEventListener('click', function () { send(t); }); s.appendChild(b);
    });
    w.appendChild(s); return w;
  }
  function render(v) {
    v.msgs.innerHTML = '';
    if (!history.length) v.msgs.appendChild(welcome());
    history.forEach(function (m, i) { v.msgs.appendChild(msgNode(m, i === history.length - 1)); });
    v.msgs.scrollTop = v.msgs.scrollHeight;
  }
  function renderAll() { views.forEach(render); }
  function setBusy(b) {
    busy = b;
    views.forEach(function (v) { if (v.send) v.send.disabled = b; if (v.input) v.input.disabled = b; });
  }
  function typing() {
    return views.map(function (v) {
      var d = document.createElement('div'); d.className = 'msg bot';
      d.innerHTML = '<span class="typing" aria-label="CrH-IA está escribiendo"><i></i><i></i><i></i></span>';
      v.msgs.appendChild(d); v.msgs.scrollTop = v.msgs.scrollHeight; return d;
    });
  }

  // Pide la respuesta a la última pregunta del usuario (sin duplicar el mensaje).
  function ask(text) {
    setBusy(true);
    var pending = typing();
    return Promise.all([callApi(text).then(function (reply) { return { reply: reply }; }, function (err) { return { err: err }; }), loadCatalog()]).then(function (res) {
      var r = res[0];
      pending.forEach(function (p) { p.remove(); });
      if (r.reply) {
        history.push({ role: 'assistant', text: r.reply });
      } else {
        var err = r.err, local = localAnswer(text), msg;
        if (err.status === 429) msg = err.message;
        else if (err.code === 'not_configured') msg = 'CrH-IA no está disponible en este momento. Mientras tanto, esto es lo que hay en el contenido integrado:';
        else msg = (err.message || 'No pude conectar con CrH-IA.') + (local ? '\n\nMientras tanto, esto es lo que hay en el contenido integrado:' : '');
        if (err.status !== 429) msg += '\n\n' + (local || NO_MATCH);
        history.push({ role: 'assistant', text: msg, err: true, retry: err.code !== 'not_configured' });
      }
      save(); setBusy(false); renderAll();
      views.forEach(function (v) { if (v.input && v.focus) v.input.focus(); });
    });
  }
  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    history.push({ role: 'user', text: text }); save(); renderAll();
    ask(text);
  }
  function retry() {
    if (busy) return;
    var last = history[history.length - 1];
    if (!last || !last.err) return;
    history.pop();
    var u = history[history.length - 1];
    if (!u || u.role !== 'user') { save(); renderAll(); return; }
    save(); renderAll(); ask(u.text);
  }

  function reset() { history = []; save(); renderAll(); }

  function mount(opts) {
    var v = { msgs: opts.msgs, input: opts.input, send: opts.sendBtn, status: opts.status, focus: opts.focus !== false };
    views.push(v);
    if (opts.form) {
      opts.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = v.input.value; v.input.value = ''; autosize(v.input); send(t);
      });
    }
    if (v.input) {
      v.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); opts.form.requestSubmit(); }
      });
      v.input.addEventListener('input', function () { autosize(v.input); });
    }
    render(v); paintStatus();
    if (aiState === null) checkStatus();
    return v;
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }

  window.CrhChat = { mount: mount, send: send, reset: reset, retry: retry, format: format, localAnswer: localAnswer, cleanBody: cleanBody, hasHistory: function () { return history.length > 0; } };
})();
