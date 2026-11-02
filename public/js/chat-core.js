/* CrH-Anatomy · motor de chat compartido (widget + página CrH-IA).
   La conversación se guarda en sessionStorage y continúa entre secciones. */
(function () {
  var KEY = 'crh.chat.v1';
  var history = [];
  try { history = JSON.parse(sessionStorage.getItem('crh.chat.v1') || '[]'); } catch (e) { history = []; }
  var views = [];
  var busy = false;
  var aiState = null; // true | false | null

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-40))); } catch (e) {} }

  /* ----- Markdown mínimo y seguro ----- */
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>');
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

  /* ----- Búsqueda local (respaldo sin IA) ----- */
  function localAnswer(raw) {
    var K = (window.CRH && window.CRH.knowledge) || [];
    var q = window.norm(raw), words = q.split(' ').filter(function (w) { return w.length > 2; });
    var ranked = K.map(function (it) {
      var t = window.norm(it.title), b = window.norm(it.text), s = 0;
      if (t === q) s += 12; if (q && (t.indexOf(q) > -1)) s += 7;
      words.forEach(function (w) { if (t.indexOf(w) > -1) s += 4; if (b.indexOf(w) > -1) s += 1; });
      return { it: it, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
    if (!ranked.length) {
      return 'No encontré una coincidencia en el contenido integrado. Prueba con el nombre anatómico, un sinónimo o una función; por ejemplo: **puborrectal**, **membrana perineal**, **inervación** o **continencia**.';
    }
    var txt = '### ' + ranked[0].it.title + '\n' + ranked[0].it.text;
    if (ranked.length > 1) {
      txt += '\n\n### Temas relacionados\n' + ranked.slice(1).map(function (x) { return '- **' + x.it.title + ':** ' + x.it.text; }).join('\n');
    }
    return txt;
  }

  /* ----- API ----- */
  function callApi(message) {
    var ctx = history.slice(-11, -1).map(function (h) { return { role: h.role, text: h.text }; });
    return fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: ctx })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.ok) { var e = new Error(d.error || 'La solicitud no pudo completarse.'); e.status = r.status; throw e; }
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
        (ok ? 'En línea · asistente académico' : off ? 'IA sin configurar · modo búsqueda local' : 'Sin conexión con el servidor · modo búsqueda local');
    });
  }

  /* ----- Render ----- */
  function msgNode(m) {
    var d = document.createElement('div');
    d.className = 'msg ' + (m.role === 'user' ? 'user' : 'bot') + (m.err ? ' err' : '');
    if (m.role === 'user') d.textContent = m.text; else d.innerHTML = format(m.text);
    return d;
  }
  function welcome(v) {
    var w = document.createElement('div'); w.className = 'welcome';
    w.innerHTML = '<div class="avatar" aria-hidden="true">CrH</div><h3>Explora. Razona. Comprende.</h3>' +
      '<p class="muted">Pregúntame sobre anatomía del suelo pélvico y fisioterapia. Te daré pistas para que razones la respuesta.</p>';
    var s = document.createElement('div'); s.className = 'sugg';
    ['Elevador del ano', 'Inervación del suelo pélvico', 'Micción y defecación', 'Evaluación fisioterapéutica'].forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip-btn'; b.textContent = t;
      b.addEventListener('click', function () { send(t); }); s.appendChild(b);
    });
    w.appendChild(s); return w;
  }
  function render(v) {
    v.msgs.innerHTML = '';
    if (!history.length) v.msgs.appendChild(welcome(v));
    history.forEach(function (m) { v.msgs.appendChild(msgNode(m)); });
    v.msgs.scrollTop = v.msgs.scrollHeight;
  }
  function renderAll() { views.forEach(render); }
  function setBusy(b) {
    busy = b;
    views.forEach(function (v) { if (v.send) v.send.disabled = b; if (v.input) v.input.disabled = b; });
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    history.push({ role: 'user', text: text }); save(); renderAll();
    setBusy(true);
    var pending = views.map(function (v) {
      var d = document.createElement('div'); d.className = 'msg bot';
      d.innerHTML = '<span class="typing" aria-label="CrH-IA está escribiendo"><i></i><i></i><i></i></span>';
      v.msgs.appendChild(d); v.msgs.scrollTop = v.msgs.scrollHeight; return d;
    });
    callApi(text).then(function (reply) {
      history.push({ role: 'assistant', text: reply });
    }).catch(function (err) {
      var note = (err && err.status === 429) ? err.message
        : 'No pude conectar con CrH-IA (' + ((err && err.message) || 'error') + '). Esto es lo que encontré en el contenido integrado:';
      if (err && err.status === 429) history.push({ role: 'assistant', text: note, err: true });
      else history.push({ role: 'assistant', text: note + '\n\n' + localAnswer(text), err: true });
    }).then(function () {
      pending.forEach(function (p) { p.remove(); });
      save(); setBusy(false); renderAll();
      views.forEach(function (v) { if (v.input && v.focus) v.input.focus(); });
    });
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

  window.CrhChat = { mount: mount, send: send, reset: reset, format: format, localAnswer: localAnswer, hasHistory: function () { return history.length > 0; } };
})();
