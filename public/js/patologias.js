(function () {
  var P = (window.CRH && CRH.pathologies) || [], root = $('pathList'), input = $('pathSearch'), count = $('pathCount');
  function render() {
    var f = norm(input.value);
    var items = P.filter(function (p) { return !f || norm([p.n, p.a, p.e, p.s, p.f].join(' ')).indexOf(f) > -1; });
    count.textContent = f ? items.length + ' de ' + P.length + ' resultados' : P.length + ' patologías';
    if (!items.length) { root.innerHTML = '<div class="no-results">No se encontraron coincidencias. Prueba otro término.</div>'; return; }
    root.innerHTML = items.map(function (p) {
      return '<details class="acc"><summary><span><span class="sum-title">' + esc(p.n) + '</span><span class="sum-sub">' + esc(p.a) + '</span></span></summary>' +
        '<div class="acc-body"><h4>Cómo puede aparecer</h4><p>' + esc(p.e) + '</p><h4>Qué estructuras puede afectar</h4><p>' + esc(p.s) +
        '</p><h4>Relevancia para fisioterapia</h4><p>' + esc(p.f) + '</p>' +
        '<a class="btn sm" href="/asistente?q=' + encodeURIComponent('Ayúdame a razonar sobre: ' + p.n) + '">Razonarlo con CrH-IA</a></div></details>';
    }).join('');
  }
  input.addEventListener('input', render); render();
})();
