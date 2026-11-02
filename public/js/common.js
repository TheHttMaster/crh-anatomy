/* CrH-Anatomy · utilidades comunes */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  window.$ = window.$ || $;

  window.toast = function (msg) {
    var el = $('toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function () { el.classList.remove('show'); }, 2600);
  };

  window.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  window.norm = function (s) {
    return (s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Menú móvil
  var btn = $('menuBtn'), nav = $('mainNav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { btn.click(); btn.focus(); }
    });
  }

  var y = $('year'); if (y) y.textContent = new Date().getFullYear();

  // Animación de entrada
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    items.forEach(function (n) { io.observe(n); });
  } else items.forEach(function (n) { n.classList.add('in'); });
})();
