/* La caja de la portada abre el asistente con la pregunta */
(function(){var f=$('homeAsk');if(!f)return;f.addEventListener('submit',function(e){if(!$('homeQ').value.trim()){e.preventDefault();location.href='/asistente';}});})();
