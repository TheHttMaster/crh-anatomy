(function () {
  var BANK = (window.CRH && CRH.quiz) || [];
  var qs = [], idx = 0, pts = 0, answered = false, custom = false, want = 10;
  var area = $('questionArea'), title = $('quizTitle'), meta = $('quizMeta'), score = $('score');

  var sel = $('questionCount');
  [5, 10, 15, 20, 30, 40, 50].forEach(function (n) {
    var o = document.createElement('option'); o.value = n; o.textContent = n + ' preguntas'; if (n === 10) o.selected = true; sel.appendChild(o);
  });
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function mix(q) {
    var opts = shuffle(q[1].map(function (t, i) { return { t: t, c: i === q[2] }; }));
    return [q[0], opts.map(function (o) { return o.t; }), opts.findIndex(function (o) { return o.c; }), q[3]];
  }
  function start() {
    custom = false; idx = 0; pts = 0;
    qs = shuffle(BANK).slice(0, Math.min(want, BANK.length)).map(mix);
    title.textContent = 'Quiz esencial · Suelo pélvico';
    show();
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function show() {
    answered = false; score.textContent = pts; area.innerHTML = '';
    if (idx >= qs.length) return finish();
    var q = qs[idx];
    meta.textContent = 'Pregunta ' + (idx + 1) + ' de ' + qs.length;
    var pr = el('div', 'progress'); var bar = el('div'); bar.style.width = (idx / qs.length * 100) + '%'; pr.appendChild(bar);
    var ans = el('div', 'answers');
    q[1].forEach(function (a, i) {
      var b = el('button', 'answer', String.fromCharCode(65 + i) + '. ' + a); b.type = 'button';
      b.addEventListener('click', function () { pick(i, ans); }); ans.appendChild(b);
    });
    var fb = el('div', 'feedback'); fb.id = 'feedback'; fb.setAttribute('aria-live', 'polite');
    var next = el('button', 'btn primary', idx === qs.length - 1 ? 'Ver resultado' : 'Siguiente pregunta →'); next.type = 'button'; next.disabled = true; next.id = 'nextBtn';
    next.addEventListener('click', function () { idx++; show(); });
    var help = el('a', 'btn sm ghost', 'Pedir una pista a CrH-IA'); help.style.marginLeft = '8px';
    help.href = '/asistente?q=' + encodeURIComponent('Dame una pista (sin revelar la respuesta) para esta pregunta de práctica: ' + q[0]);
    var tools = el('div', 'btn-row'); tools.appendChild(next); tools.appendChild(help);
    area.appendChild(pr); area.appendChild(el('div', 'question', q[0])); area.appendChild(ans); area.appendChild(fb); area.appendChild(tools);
  }
  function pick(i, ans) {
    if (answered) return; answered = true;
    var q = qs[idx], bs = ans.querySelectorAll('.answer');
    bs.forEach(function (b) { b.disabled = true; });
    bs[q[2]].classList.add('correct');
    if (i === q[2]) { pts++; toast('Correcto.'); } else { bs[i].classList.add('wrong'); toast('Revisa la explicación.'); }
    var f = $('feedback'); var box = el('div', 'fact'); box.appendChild(el('b', null, 'Explicación')); box.appendChild(el('span', null, q[3])); f.appendChild(box);
    $('nextBtn').disabled = false; score.textContent = pts;
  }
  function finish() {
    meta.textContent = 'Cuestionario completado'; score.textContent = pts;
    var r = el('div', 'result'); var big = el('div', 'big', String(pts)); big.appendChild(el('small', null, '/' + qs.length)); r.appendChild(big);
    r.appendChild(el('h3', null, 'Resultado final'));
    r.appendChild(el('p', 'muted', custom ? 'Estas preguntas se generaron localmente a partir de tus apuntes. Contrasta las respuestas con la fuente original.'
      : (pts / qs.length >= 0.8 ? 'Buen dominio de los conceptos esenciales.' : 'Repasa las explicaciones y vuelve a intentarlo.')));
    var b = el('button', 'btn primary', 'Repetir'); b.type = 'button'; b.addEventListener('click', function () { custom ? (idx = 0, pts = 0, show()) : start(); });
    r.appendChild(b); area.innerHTML = ''; area.appendChild(r);
  }

  function generate() {
    var raw = $('sourceText').value.trim();
    if (raw.length < 40) return toast('Pega al menos 40 caracteres de tus apuntes.');
    var sentences = raw.replace(/\n+/g, ' ').split(/(?<=[.!?;])\s+|(?<=:)\s+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.split(/\s+/).length >= 5; });
    if (!sentences.length) return toast('No pude separar ideas claras. Pega frases completas de tus apuntes.');
    var mode = $('qmode').value, made = [];
    var stop = ['porque', 'donde', 'entre', 'sobre', 'desde', 'hasta', 'cuando', 'también', 'pueden', 'puede', 'estos', 'estas', 'parte', 'función', 'estructura'];
    sentences.forEach(function (s0) {
      var s = s0.replace(/^[-•\d.)\s]+/, '').trim(); if (!s) return;
      var terms = (s.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ-]{5,}/g) || []).filter(function (w) { return stop.indexOf(w.toLowerCase()) < 0; });
      var term = terms.sort(function (a, b) { return b.length - a.length; })[0];
      var re = term ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
      if (mode === 'Verdadero/Falso') made.push(['Según el fragmento, esta afirmación es correcta: “' + s + '”', ['Verdadero', 'Falso'], 0, 'La afirmación reproduce literalmente una idea del fragmento. Verifica que el contexto no añada excepciones.']);
      else if (mode === 'Identificación anatómica' && term) made.push(['¿Qué término aparece en esta idea del fragmento: “' + s.replace(re, '_____') + '”?', [term, 'No aparece en el texto', 'Un término no mencionado', 'No se puede identificar'], 0, 'El término se obtiene del fragmento que pegaste.']);
      else made.push(['Completa la idea del fragmento: “' + (term ? s.replace(re, '________') : s) + '”', [term || 'Revisa el fragmento', 'Una respuesta no relacionada', 'El texto no contiene esa idea', 'Ninguna de las anteriores'], 0, 'La respuesta se obtiene del fragmento que pegaste.']);
    });
    made = made.slice(0, 10);
    if (!made.length) return toast('No encontré frases adecuadas. Pega un párrafo con conceptos y definiciones.');
    if (mode === 'Selección múltiple') made = made.map(function (q) { return [q[0], [q[1][0], 'Otra estructura anatómica', 'Una función no mencionada', 'Ninguna de las anteriores'], 0, q[3]]; });
    if (mode === 'Aplicación') made = made.map(function (q) { return ['Aplicación del concepto: ' + q[0], [q[1][0], 'Aplicación contraria al fragmento', 'Dato no mencionado', 'No puede relacionarse'], 0, 'Pregunta basada en el texto; requiere juicio de aplicación.']; });
    qs = made.map(mix); idx = 0; pts = 0; custom = true;
    title.textContent = 'Preguntas desde tus apuntes'; toast('Se generaron ' + made.length + ' preguntas.'); show();
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  sel.addEventListener('change', function () { want = Math.max(1, Math.min(50, +sel.value || 10)); start(); });
  $('restart').addEventListener('click', start);
  $('generate').addEventListener('click', generate);
  start();
})();
