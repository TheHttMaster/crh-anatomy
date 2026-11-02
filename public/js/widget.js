/* Chat flotante CrH-IA */
(function () {
  var fab = $('fab'), drawer = $('drawer');
  if (!fab || !drawer || !window.CrhChat) return;
  var input = $('drawerInput'), mounted = false;
  function open() {
    drawer.classList.add('open'); fab.style.display = 'none';
    if (!mounted) { CrhChat.mount({ msgs: $('drawerMsgs'), input: input, sendBtn: drawer.querySelector('button[type=submit]'), form: $('drawerForm'), status: $('drawerStatus') }); mounted = true; }
    setTimeout(function () { input.focus(); }, 50);
    try { sessionStorage.setItem('crh.drawer', '1'); } catch (e) {}
  }
  function close() {
    drawer.classList.remove('open'); fab.style.display = ''; fab.focus();
    try { sessionStorage.removeItem('crh.drawer'); } catch (e) {}
  }
  fab.addEventListener('click', open);
  $('drawerClose').addEventListener('click', close);
  $('drawerNew').addEventListener('click', function () { CrhChat.reset(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });
  try { if (innerWidth > 560 && sessionStorage.getItem('crh.drawer') === '1' && CrhChat.hasHistory()) open(); } catch (e) {}
})();
