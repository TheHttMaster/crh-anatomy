(function () {
  var card = $('contactCard'); if (!card) return;
  var email = (card.getAttribute('data-email') || '').trim();
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) { card.hidden = true; $('contactMissing').hidden = false; return; }
  var subject = encodeURIComponent('Contacto desde CrH-Anatomy');
  var href = 'mailto:' + email + '?subject=' + subject;
  $('contactText').textContent = email; $('contactLink').href = href; $('contactOpen').href = href;
  $('contactCopy').addEventListener('click', function () {
    function ok() { toast('Dirección copiada.'); }
    function fallback() {
      var t = document.createElement('textarea'); t.value = email; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Selecciona y copia la dirección manualmente.'); } t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(email).then(ok, fallback); else fallback();
  });
})();
