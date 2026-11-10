// Dragon Ball Omega — landing page: dragão em volta da ficha, foto do Ashura e carrossel de artes (Maré).
(function () {
  var wrap = document.getElementById("sheet-wrap");
  if (wrap && window.DBODragon) DBODragon.mount(wrap);

  /* ---------- Foto do Ashura: imagem/personagem/ashura.(jpg|jpeg|png|webp|avif) ---------- */
  var photo = document.getElementById("ashura-photo");
  if (photo) {
    var exts = ["jpg", "jpeg", "png", "webp", "avif"], i = 0;
    var img = new Image();
    img.alt = "Ashura";
    img.onload = function () { photo.textContent = ""; photo.appendChild(img); };
    img.onerror = function () { i++; if (i < exts.length) img.src = "imagem/personagem/ashura." + exts[i]; };
    img.src = "imagem/personagem/ashura." + exts[0];
  }

  /* ---------- Artes: carrossel (identidade Maré) ----------
     As imagens ficam em imagem/arte/ e seus nomes, em imagem/arte/artes.json (ver LEIA-ME.txt lá).
     Passa sozinho a cada 5 segundos; também tem setas, bolinhas, teclado (← →) e arrastar com o dedo. */
  var box = document.getElementById("arts");
  var cta = document.getElementById("cta-drag");
  if (cta && window.DBODragon) cta.innerHTML = DBODragon.head();
  if (!box) return;
  var INTERVAL = 5000;
  var ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  function mk(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; }
  fetch("imagem/arte/artes.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("sem lista"); return r.json(); })
    .then(function (names) {
      names = (Array.isArray(names) ? names : []).filter(function (n) { return typeof n === "string" && n; });
      if (!names.length) return;
      box.textContent = "";
      var total = names.length;
      var track = mk("div", "m4__track");
      names.forEach(function (n, k) {
        var fig = mk("figure", "m4__slide");
        fig.setAttribute("aria-label", "Arte " + (k + 1) + " de " + total);
        var im = document.createElement("img");
        im.src = "imagem/arte/" + encodeURIComponent(n);
        im.alt = "Arte " + (k + 1) + " de " + total;
        im.loading = k === 0 ? "eager" : "lazy";
        fig.appendChild(im);
        track.appendChild(fig);
      });
      box.appendChild(track);
      if (total < 2) return;
      var prev = mk("button", "m4__nav m4__nav--prev", ARROW_L), next = mk("button", "m4__nav m4__nav--next", ARROW_R);
      prev.type = next.type = "button"; prev.setAttribute("aria-label", "Arte anterior"); next.setAttribute("aria-label", "Próxima arte");
      var count = mk("p", "m4__count", "<b>1</b> / " + total); count.setAttribute("aria-hidden", "true");
      var dotsBox = mk("div", "m4__dots");
      var dots = names.map(function (n, k) { var d = mk("button"); d.type = "button"; d.setAttribute("aria-label", "Ir para a arte " + (k + 1)); dotsBox.appendChild(d); return d; });
      box.appendChild(prev); box.appendChild(next); box.appendChild(count); box.appendChild(dotsBox);
      var num = count.querySelector("b"), cur = 0, timer = null;
      var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      function go(i) {
        cur = (i + total) % total;
        track.style.transform = "translateX(" + (-100 * cur) + "%)";
        dots.forEach(function (d, k) { d.classList.toggle("is-on", k === cur); });
        num.textContent = cur + 1;
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function play() { stop(); if (reduce || document.documentElement.classList.contains("no-motion")) return; timer = setInterval(function () { if (!document.hidden) go(cur + 1); }, INTERVAL); }
      prev.onclick = function () { go(cur - 1); play(); };
      next.onclick = function () { go(cur + 1); play(); };
      dots.forEach(function (d, k) { d.onclick = function () { go(k); play(); }; });
      box.addEventListener("mouseenter", stop); box.addEventListener("mouseleave", play);
      box.addEventListener("focusin", stop); box.addEventListener("focusout", play);
      box.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") go(cur - 1); else if (e.key === "ArrowRight") go(cur + 1); });
      var x0 = null;
      box.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
      box.addEventListener("pointerup", function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); play(); } });
      go(0); play();
    })
    .catch(function () {});
})();
