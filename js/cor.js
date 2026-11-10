// Dragon Ball Omega — seletor de cor (pop-up)
// DBOCor.abrir({ cor: "rgba(...)" | "#rrggbb", titulo, aoMudar(cor), aoEscolher(cor) })
//   Esquerda: quadrado de cor — em cima claras, embaixo escuras; à direita a cor pura, à esquerda branco (em cima) e preto (embaixo).
//   Direita: barra de matiz (vermelho → vermelho, um ciclo) e barra de opacidade.
//   Embaixo: a cor em RGB (dá para digitar), Cancelar e Aplicar.
window.DBOCor = (function () {
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // "rgba(1,2,3,.5)", "rgb(1 2 3)", "#abc", "#aabbcc", "#aabbccdd" → { r, g, b, a } (0-255, a 0-1)
  function ler(s) {
    s = String(s || "").trim();
    var m = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split("").map(function (c) { return c + c; }).join("");
      if (h.length !== 6 && h.length !== 8) return null;
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(s);
    if (m) {
      var a = m[4] == null ? 1 : /%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: lim(Math.round(+m[1]), 0, 255), g: lim(Math.round(+m[2]), 0, 255), b: lim(Math.round(+m[3]), 0, 255), a: lim(a, 0, 1) };
    }
    return null;
  }
  function texto(c) {
    var a = Math.round(c.a * 100) / 100;
    return a >= 1 ? "rgb(" + c.r + ", " + c.g + ", " + c.b + ")" : "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + a + ")";
  }
  function rgbParaHsv(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h: h, s: mx ? d / mx : 0, v: mx };
  }
  function hsvParaRgb(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }

  var dlg = null;
  function abrir(opts) {
    opts = opts || {};
    var ini = ler(opts.cor) || { r: 255, g: 255, b: 255, a: 1 };
    var hsv = rgbParaHsv(ini), est = { h: hsv.h, s: hsv.s, v: hsv.v, a: ini.a };
    if (!dlg) { dlg = el("dialog", "modal cor-dlg"); dlg.setAttribute("aria-labelledby", "cor-titulo"); document.body.appendChild(dlg); }
    var d = dlg; d.textContent = "";
    var x = el("button", "modal__close", "×"); x.type = "button"; x.setAttribute("aria-label", "Fechar sem mudar"); d.appendChild(x);
    var h2 = el("h2", "", opts.titulo || "Escolher cor"); h2.id = "cor-titulo"; d.appendChild(h2);

    var corpo = el("div", "cor-corpo");
    var quad = el("div", "cor-quad"); quad.tabIndex = 0; quad.setAttribute("role", "slider"); quad.setAttribute("aria-label", "Claridade e intensidade (setas mudam)");
    var qPino = el("span", "cor-pino"); quad.appendChild(qPino);
    var barras = el("div", "cor-barras");
    var mat = el("div", "cor-barra cor-barra--matiz"); mat.tabIndex = 0; mat.setAttribute("role", "slider"); mat.setAttribute("aria-label", "Matiz"); mat.setAttribute("aria-valuemin", "0"); mat.setAttribute("aria-valuemax", "360");
    var mPino = el("span", "cor-barra__pino"); mat.appendChild(mPino);
    var opa = el("div", "cor-barra cor-barra--opac"); opa.tabIndex = 0; opa.setAttribute("role", "slider"); opa.setAttribute("aria-label", "Opacidade"); opa.setAttribute("aria-valuemin", "0"); opa.setAttribute("aria-valuemax", "100");
    var opaCor = el("span", "cor-barra__fundo"); opa.appendChild(opaCor);
    var oPino = el("span", "cor-barra__pino"); opa.appendChild(oPino);
    barras.appendChild(mat); barras.appendChild(opa);
    corpo.appendChild(quad); corpo.appendChild(barras);
    d.appendChild(corpo);

    var linha = el("div", "cor-linha");
    var amostra = el("span", "cor-amostra"); var amostraCor = el("span"); amostra.appendChild(amostraCor);
    var lab = el("label", "sr-only", "Cor em RGB"); lab.htmlFor = "cor-txt";
    var inp = el("input", "cor-txt"); inp.id = "cor-txt"; inp.type = "text"; inp.spellcheck = false; inp.autocomplete = "off";
    linha.appendChild(amostra); linha.appendChild(lab); linha.appendChild(inp);
    d.appendChild(linha);
    var acts = el("div", "modal__actions");
    var cancel = el("button", "btn btn--ghost", "Cancelar"); cancel.type = "button";
    var ok = el("button", "btn", "Aplicar"); ok.type = "button";
    acts.appendChild(cancel); acts.appendChild(ok); d.appendChild(acts);

    function atual() { var c = hsvParaRgb(est.h % 360, est.s, est.v); c.a = est.a; return c; }
    function desenhar(deTexto) {
      var c = atual(), pura = hsvParaRgb(est.h % 360, 1, 1);
      quad.style.background = "linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgb(" + pura.r + "," + pura.g + "," + pura.b + "))";
      qPino.style.left = (est.s * 100) + "%"; qPino.style.top = ((1 - est.v) * 100) + "%";
      mPino.style.top = (est.h / 360 * 100) + "%";
      oPino.style.top = ((1 - est.a) * 100) + "%";
      opaCor.style.background = "linear-gradient(to bottom, rgb(" + c.r + "," + c.g + "," + c.b + "), rgba(" + c.r + "," + c.g + "," + c.b + ",0))";
      amostraCor.style.background = texto(c);
      quad.setAttribute("aria-valuetext", texto(c));
      mat.setAttribute("aria-valuenow", String(Math.round(est.h)));
      opa.setAttribute("aria-valuenow", String(Math.round(est.a * 100)));
      if (!deTexto) inp.value = texto(c);
      inp.classList.remove("is-erro");
      if (opts.aoMudar) opts.aoMudar(texto(c));
    }
    function arrastar(alvo, fn) {
      alvo.addEventListener("pointerdown", function (e) {
        e.preventDefault(); alvo.focus();
        try { alvo.setPointerCapture(e.pointerId); } catch (er) {}
        var mover = function (ev) { var r = alvo.getBoundingClientRect(); fn(lim((ev.clientX - r.left) / r.width, 0, 1), lim((ev.clientY - r.top) / r.height, 0, 1)); desenhar(); };
        mover(e);
        var up = function () { alvo.removeEventListener("pointermove", mover); alvo.removeEventListener("pointerup", up); alvo.removeEventListener("pointercancel", up); };
        alvo.addEventListener("pointermove", mover); alvo.addEventListener("pointerup", up); alvo.addEventListener("pointercancel", up);
      });
    }
    arrastar(quad, function (px, py) { est.s = px; est.v = 1 - py; });
    arrastar(mat, function (px, py) { est.h = py * 360; if (est.h >= 360) est.h = 359.9; });
    arrastar(opa, function (px, py) { est.a = Math.round((1 - py) * 100) / 100; });
    // Teclado: setas
    quad.addEventListener("keydown", function (e) {
      var p = e.shiftKey ? .1 : .02;
      if (e.key === "ArrowLeft") est.s = lim(est.s - p, 0, 1); else if (e.key === "ArrowRight") est.s = lim(est.s + p, 0, 1);
      else if (e.key === "ArrowUp") est.v = lim(est.v + p, 0, 1); else if (e.key === "ArrowDown") est.v = lim(est.v - p, 0, 1); else return;
      e.preventDefault(); desenhar();
    });
    mat.addEventListener("keydown", function (e) {
      var p = e.shiftKey ? 15 : 3;
      if (e.key === "ArrowUp") est.h = (est.h - p + 360) % 360; else if (e.key === "ArrowDown") est.h = (est.h + p) % 360; else return;
      e.preventDefault(); desenhar();
    });
    opa.addEventListener("keydown", function (e) {
      var p = e.shiftKey ? .1 : .02;
      if (e.key === "ArrowUp") est.a = lim(est.a + p, 0, 1); else if (e.key === "ArrowDown") est.a = lim(est.a - p, 0, 1); else return;
      e.preventDefault(); est.a = Math.round(est.a * 100) / 100; desenhar();
    });
    inp.addEventListener("input", function () {
      var c = ler(inp.value);
      if (!c) { inp.classList.add("is-erro"); return; }
      var h = rgbParaHsv(c); est.h = h.s ? h.h : est.h; est.s = h.s; est.v = h.v; est.a = c.a;
      desenhar(true);
    });
    var escolhido = false;
    function fechar() { d.close(); }
    x.addEventListener("click", fechar); cancel.addEventListener("click", fechar);
    ok.addEventListener("click", function () { escolhido = true; d.close(); if (opts.aoEscolher) opts.aoEscolher(texto(atual())); });
    d.onclose = function () { if (!escolhido && opts.aoMudar) opts.aoMudar(texto(ini)); };
    desenhar();
    d.showModal();
    quad.focus();
  }
  return { abrir: abrir, ler: ler, texto: texto };
})();
