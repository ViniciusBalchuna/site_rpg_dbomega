// Dragon Ball Omega — entrada suave dos blocos com class="rv" (identidade Maré).
// Eles aparecem quando entram na tela; --i atrasa em cascata. Se algo falhar, depois de 6 s tudo aparece.
(function () {
  var root = document.documentElement; root.classList.add("js");
  var els = [].slice.call(document.querySelectorAll(".rv")), show = function (e) { e.classList.add("in"); };
  if (!("IntersectionObserver" in window)) { els.forEach(show); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { show(x.target); io.unobserve(x.target); } }); }, { threshold: .12 });
  els.forEach(function (e) { io.observe(e); });
  setTimeout(function () { els.forEach(show); }, 6000);
})();
