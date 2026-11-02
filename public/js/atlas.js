(function () {
  var M = (window.CRH && CRH.muscles) || [], list = $('fichaList'), body = $('fichaBody');
  if (!list) return;
  function show(i) {
    var m = M[i];
    list.querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i); });
    var rows = [['Origen', m.o], ['Inserción', m.i], ['Inervación', m.inn], ['Función', m.f],
      ['Irrigación', m.v || 'Dato pendiente de verificación específica para este músculo; consulta un atlas anatómico y las variaciones individuales.']];
    body.innerHTML = '<h3 style="font-size:1.6rem">' + esc(m.n) + '</h3><div class="facts">' +
      rows.map(function (r) { return '<div class="fact"><b>' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') +
      '</div><div class="draw-chain"><b>Cadena de dibujo</b>' + esc(m.c) + '</div>' +
      '<div class="btn-row" style="margin-top:16px"><button class="btn sm" type="button" id="askMuscle">Preguntar a CrH-IA sobre este músculo</button></div>';
    $('askMuscle').addEventListener('click', function () {
      location.href = '/asistente?q=' + encodeURIComponent('Explícame ' + m.n + ': origen, inserción, inervación y función, con pistas para recordarlo.');
    });
  }
  M.forEach(function (m, i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = m.n;
    b.addEventListener('click', function () { show(i); }); list.appendChild(b);
  });
  show(0);
})();
