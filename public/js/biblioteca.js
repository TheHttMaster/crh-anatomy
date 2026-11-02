(function () {
  var cards = [].slice.call(document.querySelectorAll('#libGrid details')), input = $('libSearch'), count = $('libCount'), empty = $('libEmpty');
  function filter() {
    var q = norm(input.value), n = 0;
    cards.forEach(function (c) {
      var hit = !q || norm(c.textContent).indexOf(q) > -1; c.hidden = !hit; if (hit) n++;
      if (q && hit) c.open = true;
    });
    empty.hidden = n > 0; count.textContent = q ? n + ' de ' + cards.length + ' temas' : '';
  }
  input.addEventListener('input', filter);
  var q = new URLSearchParams(location.search).get('q'); if (q) { input.value = q; filter(); }
  else if (cards[0]) cards[0].open = true;
})();
