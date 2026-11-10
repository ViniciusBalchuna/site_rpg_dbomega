// Dragon Ball Omega — recorte de imagem (zoom e posição)
// Uso: DBOCropper.pick(arquivo, tamanho) -> Promise com a imagem recortada (data URL WebP (JPEG se o navegador não souber)),
// ou null se a pessoa cancelar. Arraste pra mover e use o controle (ou a rodinha) pra dar zoom.
window.DBOCropper = (function () {
  function toWebp(c, q) { // WebP (menor); JPEG se o navegador não souber. Nunca passa de 500 KB (limite do banco): baixa a qualidade até caber.
    function enc(qq) { var u = c.toDataURL("image/webp", qq); return u.indexOf("data:image/webp") === 0 ? u : c.toDataURL("image/jpeg", qq); }
    var u = enc(q); while (u.length > 680000 && q > 0.3) { q -= 0.1; u = enc(q); }
    return u;
  } // WebP (menor); se o navegador não souber, cai pro JPEG
  var VIEW = 320;    // lado da área de recorte, em pixels do canvas
  var MAX_ZOOM = 4;  // quantas vezes dá pra ampliar além do enquadramento mínimo

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var fail = function () { reject(new Error("Não deu pra ler essa foto.")); };
      if (!/^image\//.test(file.type)) return reject(new Error("Escolha um arquivo de imagem."));
      var reader = new FileReader();
      reader.onerror = fail;
      reader.onload = function () {
        var img = new Image();
        img.onerror = fail;
        img.onload = function () { resolve(img); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function open(img, outSize, aspect) {
    var rect = aspect && aspect !== 1;               // recorte retangular (cartazes) em vez de redondo
    var W = VIEW, H = rect ? Math.round(VIEW / aspect) : VIEW, outW = outSize, outH = rect ? Math.round(outSize / aspect) : outSize;
    return new Promise(function (resolve) {
      var dlg = el("dialog", "crop");
      dlg.setAttribute("aria-labelledby", "crop-title");
      var form = el("form");
      form.noValidate = true;

      var close = el("button", "modal__close", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Fechar sem salvar");
      form.appendChild(close);
      var title = el("h2", "", "Ajuste a imagem");
      title.id = "crop-title";
      form.appendChild(title);
      form.appendChild(el("p", "crop__hint", "Arraste pra mover e use o zoom pra escolher a parte que aparece."));

      var canvas = el("canvas", "crop__canvas");
      canvas.width = W; canvas.height = H;
      form.appendChild(canvas);

      var zoomRow = el("label", "crop__zoom");
      zoomRow.appendChild(el("span", "", "Zoom"));
      var zoom = el("input");
      zoom.type = "range"; zoom.min = "1"; zoom.max = String(MAX_ZOOM); zoom.step = "0.01"; zoom.value = "1";
      zoomRow.appendChild(zoom);
      form.appendChild(zoomRow);

      var actions = el("div", "modal__actions");
      var cancel = el("button", "btn btn--ghost", "Cancelar");
      cancel.type = "button";
      var ok = el("button", "btn", "Usar imagem");
      ok.type = "submit";
      actions.appendChild(cancel);
      actions.appendChild(ok);
      form.appendChild(actions);
      dlg.appendChild(form);
      document.body.appendChild(dlg);

      var iw = img.naturalWidth, ih = img.naturalHeight;
      var base = Math.max(W / iw, H / ih); // escala em que a imagem apenas cobre a área
      var ox = 0, oy = 0;                 // deslocamento do centro da imagem, em pixels da área
      var ctx = canvas.getContext("2d");

      function scale() { return base * Number(zoom.value); }
      function clamp() {
        var mx = Math.max(0, (iw * scale() - W) / 2), my = Math.max(0, (ih * scale() - H) / 2);
        ox = Math.max(-mx, Math.min(mx, ox));
        oy = Math.max(-my, Math.min(my, oy));
      }
      function paint(target, w, h, shade) {
        var k = w / W, s = scale() * k, c = target.getContext("2d");
        c.clearRect(0, 0, w, h);
        c.drawImage(img, w / 2 + ox * k - iw * s / 2, h / 2 + oy * k - ih * s / 2, iw * s, ih * s);
        if (shade) {
          c.save();
          c.fillStyle = "rgba(0, 0, 0, .58)";
          c.beginPath();
          c.rect(0, 0, w, h);
          if (rect) c.rect(6, 6, w - 12, h - 12); else c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2, true);
          c.fill("evenodd");
          c.restore();
          c.strokeStyle = "rgba(255, 255, 255, .85)";
          c.lineWidth = 2;
          c.beginPath();
          if (rect) c.rect(6, 6, w - 12, h - 12); else c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
          c.stroke();
        }
      }
      function draw() { clamp(); paint(canvas, W, H, true); }

      // Arrastar
      var drag = null;
      canvas.addEventListener("pointerdown", function (e) {
        drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add("is-drag");
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!drag) return;
        var k = W / canvas.getBoundingClientRect().width;
        ox = drag.ox + (e.clientX - drag.x) * k;
        oy = drag.oy + (e.clientY - drag.y) * k;
        draw();
      });
      function drop() { drag = null; canvas.classList.remove("is-drag"); }
      canvas.addEventListener("pointerup", drop);
      canvas.addEventListener("pointercancel", drop);
      // Zoom pela rodinha e pelo controle
      canvas.addEventListener("wheel", function (e) {
        e.preventDefault();
        zoom.value = String(Math.max(1, Math.min(MAX_ZOOM, Number(zoom.value) - e.deltaY * 0.002)));
        draw();
      }, { passive: false });
      zoom.addEventListener("input", draw);

      var result = null;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var out = el("canvas");
        out.width = outW; out.height = outH;
        paint(out, outW, outH, false);
        result = toWebp(out, 0.86);
        dlg.close();
      });
      cancel.addEventListener("click", function () { dlg.close(); });
      close.addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("close", function () { dlg.remove(); resolve(result); });

      draw();
      dlg.showModal();
      zoom.focus();
    });
  }

  return {
    // aspect (opcional): largura/altura do recorte retangular; sem ele, recorte quadrado com máscara redonda.
    pick: function (file, size, aspect) {
      if (!file || !file.size) return Promise.resolve(null);
      return loadImage(file).then(function (img) { return open(img, size || 320, aspect); });
    }
  };
})();
