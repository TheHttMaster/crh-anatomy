(function () {
  var modal = $('laminaModal'), img = $('laminaModalImg'), src = $('laminaImg');
  function open() { img.src = src.currentSrc || src.src; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; modal.querySelector('.modal-close').focus(); }
  function close() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  $('laminaOpen').addEventListener('click', open);
  src.addEventListener('click', open);
  modal.querySelectorAll('[data-close]').forEach(function (n) { n.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
