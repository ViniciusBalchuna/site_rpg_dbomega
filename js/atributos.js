// Dragon Ball Omega — modelos de atributos da ficha: esfera (js/orb.js), gráfico (radar), sonar e esfera lisa.
// DBOAttr.render(container, { model, attrs, pl, plLabel, editing, addButton, onRoll }) — as mesmas opções da esfera.
window.DBOAttr = (function () {
  var el = DBOUI.el;
  var NS = "http://www.w3.org/2000/svg";
  function n(v) { return v.toFixed(1); }
  function sgn(m) { return m >= 0 ? "+" + m : "−" + Math.abs(m); }
  function scaleOf(attrs) {
    var max = 0;
    attrs.forEach(function (a) { if (a.raw > max) max = a.raw; });
    return Math.max(20, Math.ceil(max / 10) * 10);   // o gráfico cresce quando algum atributo passa de 20
  }

  function plBlock(opts) {
    var box = el("div", "attr__pl");
    box.appendChild(el("span", "", opts.plLabel || "Power Level"));
    box.appendChild(el("b", "attr__pl-value", DBOUI.pl(opts.pl)));
    return box;
  }

  // Botões acessíveis embaixo do desenho: rolar o teste de cada atributo (e o "+" no modo de edição).
  function chips(opts) {
    var wrap = el("ul", "attr__chips");
    opts.attrs.forEach(function (a) {
      var li = el("li", "attr__chip");
      var b = el("button", "attr__roll");
      b.type = "button";
      b.setAttribute("aria-label", "Rolar teste de " + a.label + ", modificador " + a.mod);
      b.title = "Rolar teste de " + a.label;
      b.appendChild(el("span", "attr__abbr", a.abbr));
      b.appendChild(el("b", "attr__mod", sgn(a.mod)));
      if (opts.editing) b.appendChild(el("i", "attr__raw", DBOUI.compact(a.raw)));
      if (opts.onRoll) b.addEventListener("click", function () { opts.onRoll(a); });
      li.appendChild(b);
      if (opts.editing) li.appendChild(opts.addButton("atributos." + a.key, a.label));
      wrap.appendChild(li);
    });
    return wrap;
  }

  /* ---------- Gráfico (radar de seis pontas) ---------- */
  function radar(opts) {
    var C = 150, R = 100, s = scaleOf(opts.attrs);
    var out = '<svg viewBox="0 0 300 300" aria-hidden="true" focusable="false" class="radar">';
    [.25, .5, .75, 1].forEach(function (lv) {
      var p = [];
      for (var i = 0; i < 6; i++) { var a = Math.PI * 2 * i / 6; p.push(n(C + R * lv * Math.sin(a)) + "," + n(C - R * lv * Math.cos(a))); }
      out += '<polygon class="rg" points="' + p.join(" ") + '"/>';
    });
    var pts = [], dots = "", labs = "";
    opts.attrs.forEach(function (a, i) {
      var ang = Math.PI * 2 * i / 6, sx = Math.sin(ang), cy = -Math.cos(ang);
      out += '<line class="ra" x1="150" y1="150" x2="' + n(C + R * sx) + '" y2="' + n(C + R * cy) + '"/>';
      var r = R * Math.max(.06, Math.min(1, a.raw / s));
      pts.push(n(C + r * sx) + "," + n(C + r * cy));
      dots += '<circle class="rd" cx="' + n(C + r * sx) + '" cy="' + n(C + r * cy) + '" r="3.6"/>';
      var lx = C + (R + 22) * sx, ly = C + (R + 22) * cy + 4;
      var anchor = Math.abs(sx) < .2 ? "middle" : sx > 0 ? "start" : "end";
      labs += '<text class="rl" x="' + n(lx) + '" y="' + n(ly) + '" text-anchor="' + anchor + '">' + a.abbr + ' <tspan class="rv">' + sgn(a.mod) + '</tspan></text>';
    });
    out += '<polygon class="rp" points="' + pts.join(" ") + '"/>' + dots + labs + '</svg>';
    return out;
  }

  /* ---------- Sonar: cada atributo é uma esfera no mapa ---------- */
  var ANG = [24, 84, 142, 204, 262, 318];
  function sonarInner(attrs, sfx) {
    var s = scaleOf(attrs), sx = 150 + 125 * Math.sin(-70 * Math.PI / 180), sy = 150 - 125 * Math.cos(-70 * Math.PI / 180);
    var g = "", i;
    [31, 62, 94, 125].forEach(function (r) { g += '<circle cx="150" cy="150" r="' + r + '"/>'; });
    g += '<line x1="150" y1="25" x2="150" y2="275"/><line x1="25" y1="150" x2="275" y2="150"/>';
    for (i = 0; i < 36; i++) {
      var a = i * 10 * Math.PI / 180;
      g += '<line class="tk" x1="' + n(150 + 125 * Math.sin(a)) + '" y1="' + n(150 - 125 * Math.cos(a)) + '" x2="' + n(150 + 119 * Math.sin(a)) + '" y2="' + n(150 - 119 * Math.cos(a)) + '"/>';
    }
    var balls = "";
    attrs.forEach(function (at, k) {
      var r = 125 * (.28 + .64 * Math.min(1, at.raw / s)), a2 = ANG[k] * Math.PI / 180;
      var x = 150 + r * Math.sin(a2), y = 150 - r * Math.cos(a2), right = Math.sin(a2) >= 0, lx = x + (right ? 15 : -15);
      balls += '<g><circle class="pulse" cx="' + n(x) + '" cy="' + n(y) + '" r="13" style="animation-delay:-' + (k * .5) + 's"/>' +
        '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="9.5" fill="url(#ball' + sfx + ')" stroke="#8A2F0C" stroke-width=".8"/>' +
        '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="2" fill="#B3261E"/>' +
        '<text class="sl" x="' + n(lx) + '" y="' + n(y + 4) + '" text-anchor="' + (right ? "start" : "end") + '">' + at.abbr + ' <tspan class="sv">' + sgn(at.mod) + '</tspan></text></g>';
    });
    return '<svg viewBox="0 0 300 300" aria-hidden="true" focusable="false"><defs>' +
      '<radialGradient id="sg' + sfx + '" cx=".5" cy=".5" r=".5"><stop offset="0" class="s-a" stop-opacity=".12"/><stop offset="1" class="s-a" stop-opacity=".02"/></radialGradient>' +
      '<linearGradient id="sw' + sfx + '" gradientUnits="userSpaceOnUse" x1="' + n(sx) + '" y1="' + n(sy) + '" x2="150" y2="25"><stop offset="0" class="s-a" stop-opacity="0"/><stop offset="1" class="s-a" stop-opacity=".6"/></linearGradient>' +
      '<radialGradient id="ball' + sfx + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFE08A"/><stop offset=".5" stop-color="#FF9F2E"/><stop offset="1" stop-color="#D4541A"/></radialGradient></defs>' +
      '<circle cx="150" cy="150" r="136" class="sn-bg"/><circle cx="150" cy="150" r="136" fill="url(#sg' + sfx + ')"/><g class="sn-grid">' + g + '</g>' +
      '<g class="sweep"><path d="M150 150 L' + n(sx) + ' ' + n(sy) + ' A125 125 0 0 1 150 25 Z" fill="url(#sw' + sfx + ')"/><line x1="150" y1="150" x2="150" y2="25" class="sn-edge"/></g>' +
      balls + '<circle cx="150" cy="150" r="4" class="sn-c"/></svg>';
  }
  var CRACK = '<svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke-linejoin="miter">' +
    ["c1", "c2"].map(function (k) {
      return '<polyline class="' + k + '" points="60,0 55,12 63,24 52,38 60,50 47,63 54,78 40,90 44,100"/><polyline class="' + k + '" points="52,38 30,34 18,42"/>' +
        '<polyline class="' + k + '" points="60,50 82,56 90,70"/><polyline class="' + k + '" points="47,63 28,70 20,84"/>';
    }).join("") + '</g></svg>';
  function sonar(opts) {
    // Duas cópias do desenho: na transformação cada uma fica com uma metade e o sonar "racha" (css/fichas.css).
    return '<div class="sonar"><div class="sn-a">' + sonarInner(opts.attrs, "") + '</div><div class="sn-b" aria-hidden="true">' + sonarInner(opts.attrs, "2") + '</div>' + CRACK + '</div>';
  }


  /* ---------- Esfera lisa: esfera simples, os seis atributos em volta e o Corpo Base (ou o Power Level) no centro ---------- */
  var LISA_ART = '<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false"><defs>' +
    '<radialGradient id="lisa-g" cx="36%" cy="32%" r="78%"><stop offset="0" style="stop-color:var(--gold)"/><stop offset=".55" style="stop-color:var(--jade)"/><stop offset="1" style="stop-color:var(--jade)" stop-opacity=".35"/></radialGradient></defs>' +
    '<circle cx="200" cy="200" r="192" fill="url(#lisa-g)" opacity=".2"/>' +
    '<circle cx="200" cy="200" r="192" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="200" cy="200" r="183" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 7" opacity=".75"/>' +
    '<g fill="none" stroke="currentColor" stroke-width="1" opacity=".28"><ellipse cx="200" cy="200" rx="96" ry="192"/><ellipse cx="200" cy="200" rx="192" ry="96"/><circle cx="200" cy="200" r="144" stroke-dasharray="6 5"/></g>' +
    '<g fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"><polygon points="200,56 324.7,128 324.7,272 200,344 75.3,272 75.3,128"/><path d="M200 56V344M324.7 128L75.3 272M324.7 272L75.3 128"/></g></svg>';
  function lisa(container, opts) {
    var box = el("div", "lisa");
    box.insertAdjacentHTML("afterbegin", LISA_ART);
    opts.attrs.forEach(function (a, i) {
      var ang = (-90 + i * 60) * Math.PI / 180;
      var node = el("div", "lisa__node");
      node.style.left = (50 + 36 * Math.cos(ang)).toFixed(2) + "%";
      node.style.top = (50 + 36 * Math.sin(ang)).toFixed(2) + "%";
      var b = el("button", "lisa__btn");
      b.type = "button";
      b.setAttribute("aria-label", "Rolar teste de " + a.label + ", modificador " + a.mod);
      b.title = "Rolar teste de " + a.label;
      b.appendChild(el("small", "", a.abbr));
      b.appendChild(el("strong", "", sgn(a.mod)));
      b.appendChild(el("em", "", DBOUI.compact(a.raw)));
      if (opts.onRoll) b.addEventListener("click", function () { opts.onRoll(a); });
      node.appendChild(b);
      if (opts.editing) node.appendChild(opts.addButton("atributos." + a.key, a.label));
      box.appendChild(node);
    });
    var text = opts.center ? DBOUI.fmt(opts.center.value) : DBOUI.pl(opts.pl);
    var core = el("div", "lisa__core");
    core.appendChild(el("small", "", opts.center ? opts.center.label : (opts.plLabel || "Power Level")));
    var value = el("strong", "", text);
    value.style.setProperty("--d", text.length);
    core.appendChild(value);
    box.appendChild(core);
    container.appendChild(box);
  }

  function render(container, opts) {
    var model = opts.model || "esfera";
    if (model !== "grafico" && model !== "sonar" && model !== "lisa") { DBOOrb.render(container, opts); return; }
    container.textContent = "";
    container.classList.toggle("is-editing", !!opts.editing);
    if (model === "lisa") { lisa(container, opts); return; }
    if (!opts.noPl) container.appendChild(plBlock(opts));
    var art = el("div", "attr__art");
    art.insertAdjacentHTML("afterbegin", model === "grafico" ? radar(opts) : sonar(opts));
    container.appendChild(art);
    container.appendChild(chips(opts));
  }
  return { render: render };
})();
