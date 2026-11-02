(function () {
  if (!window.CrhChat) return;
  var input = $('chatInput');
  CrhChat.mount({ msgs: $('chatMsgs'), input: input, sendBtn: $('chatSend'), form: $('chatForm'), status: $('chatStatus') });
  $('chatNew').addEventListener('click', function () { CrhChat.reset(); input.focus(); });
  $('sideSugg').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (b) CrhChat.send(b.dataset.q); });
  var q = new URLSearchParams(location.search).get('q');
  if (q && q.trim()) { history.replaceState(null, '', location.pathname); CrhChat.send(q.slice(0, 2000)); }
})();
