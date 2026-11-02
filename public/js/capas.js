(function () {
  var names = ['Pelvis ósea', 'Diafragma pélvico', 'Periné', 'Esfínteres + estructuras urogenitales', 'Nervios', 'Vasos'];
  var short = ['Pelvis ósea · base espacial', 'Diafragma pélvico', 'Periné', 'Estructuras urogenitales', 'Nervios', 'Vasos'];
  var svgIds = [null, 'layerMuscles', 'layerPerineum', 'layerUrogenital', 'layerNerves', 'layerVessels'];
  var learn = [
    'Forma, límites, cavidades y puntos de relación: sacro, huesos coxales, cóccix y sínfisis púbica.',
    'El elevador del ano y el coccígeo forman el diafragma pélvico; observa el hiato que atraviesan uretra, vagina/próstata y recto.',
    'La región perineal y sus planos; recuerda que el plano profundo del periné no equivale automáticamente al diafragma pélvico.',
    'Uretra, esfínteres y órganos urogenitales en relación con la línea media y el cuerpo perineal.',
    'Nervio pudendo y sus ramas, nervios del elevador del ano y vías autonómicas pélvicas.',
    'Arteria pudenda interna y vasos pélvicos acompañando a las estructuras musculares y nerviosas.'
  ];
  var clin = [
    'La posición de las estructuras permite comprender soporte, movimiento y evaluación.',
    'Soporte de las vísceras y participación en continencia y funciones urinaria, defecatoria y sexual.',
    'Cicatrices, antecedentes obstétricos y síntomas orientan la valoración de esta región.',
    'La continencia depende de más factores que la fuerza muscular; considera coordinación y control neural.',
    'Dolor perineal no equivale automáticamente a neuralgia pudenda: la localización y evolución importan.',
    'Contribuyen a la función tisular; la anatomía vascular presenta variación individual.'
  ];
  var presets = [[0], [0, 1], [0, 3], [0, 2, 3]];
  var presetName = ['Base ósea', 'Plano profundo · elevador del ano y coccígeo', 'Plano medio · membrana perineal y complejo esfinteriano uretral', 'Plano superficial · musculatura perineal superficial y esfínter anal externo'];
  var state = [true, false, false, false, false, false];
  var wrap = $('layerToggles'), root = $('layerSvg');

  function paint() {
    wrap.innerHTML = '';
    names.forEach(function (n, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'layer-btn' + (state[i] ? ' on' : '');
      b.setAttribute('aria-pressed', state[i]);
      b.innerHTML = '<span class="dot"></span><span>' + n + '<small>' + (state[i] ? 'Visible' : 'Toca para mostrar') + '</small></span>';
      b.addEventListener('click', function () { state[i] = !state[i]; paint(); });
      wrap.appendChild(b);
    });
    var bones = root.querySelector('.bones'); if (bones) bones.setAttribute('opacity', state[0] ? '1' : '0');
    svgIds.forEach(function (id, i) { if (id) { var el = $(id); if (el) el.setAttribute('opacity', state[i] ? '1' : '0'); } });
    var act = state.map(function (v, i) { return v ? i : -1; }).filter(function (i) { return i >= 0; });
    $('layerCaption').textContent = act.length ? act.map(function (i) { return short[i]; }).join(' + ') : 'Sin capas seleccionadas';
    $('layerWhat').textContent = act.length ? 'Capas visibles: ' + act.map(function (i) { return names[i]; }).join(', ') + '.' : 'Activa una capa para explorar el esquema.';
    var last = act.length ? act[act.length - 1] : -1;
    $('layerLearn').textContent = last >= 0 ? learn[last] : 'Selecciona una capa para ver qué reconocer.';
    $('layerClinical').textContent = last >= 0 ? clin[last] : 'Selecciona una capa para ver su relación clínica.';
  }
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = +b.dataset.preset; state = [false, false, false, false, false, false];
      presets[n].forEach(function (i) { state[i] = true; });
      document.querySelectorAll('[data-preset]').forEach(function (x) { x.classList.toggle('on', x === b); });
      paint(); toast('Secuencia docente: ' + presetName[n]);
    });
  });
  $('clearLayers').addEventListener('click', function () {
    state = [false, false, false, false, false, false];
    document.querySelectorAll('[data-preset]').forEach(function (x) { x.classList.remove('on'); }); paint();
  });
  paint();
})();
