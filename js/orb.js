// Dragon Ball Omega — esfera do dragão de 6 estrelas (desenho tipo blueprint antigo)
// DBOOrb.render(container, { onRoll(attr), attrs: [{ key, label, abbr, raw, mod }], pl, editing, addButton(key, label) })
window.DBOOrb = (function () {
  var el = DBOUI.el;
  var VIEW = 440, OFFSET = 20;              // viewBox "-20 -20 440 440"
  var CX = 200, CY = 200;
  var RING = 112, STAR_OUT = 36, STAR_IN = 15; // raio do anel das estrelas e tamanho das estrelas

  function pct(v) { return ((v + OFFSET) / VIEW * 100).toFixed(3) + "%"; }
  function pt(r, deg, cx, cy) {
    var a = deg * Math.PI / 180;
    return [(cx === undefined ? CX : cx) + r * Math.cos(a), (cy === undefined ? CY : cy) + r * Math.sin(a)];
  }
  function n(v) { return v.toFixed(1); }

  function starPoints(cx, cy) {
    var out = [];
    for (var i = 0; i < 10; i++) {
      var p = pt(i % 2 ? STAR_IN : STAR_OUT, -90 + i * 36, cx, cy);
      out.push(n(p[0]) + "," + n(p[1]));
    }
    return out.join(" ");
  }

  // Desenho estático: esfera, hachuras, meridianos, marcas de régua e as seis estrelas.
  function art() {
    var s = '<svg viewBox="-20 -20 440 440" aria-hidden="true" focusable="false">';
    s += '<defs>' +
      '<pattern id="orb-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" stroke-width="0.9"/></pattern>' +
      '<mask id="orb-shade"><rect x="-20" y="-20" width="440" height="440" fill="#000"/><circle cx="200" cy="200" r="190" fill="#fff"/><circle cx="176" cy="174" r="177" fill="#000"/></mask>' +
      '<path id="orb-arc" d="M 32 200 A 168 168 0 0 1 368 200" fill="none"/>' +
      '</defs>';

    // sombra hachurada, como gravura
    s += '<g mask="url(#orb-shade)" opacity=".42"><circle cx="200" cy="200" r="190" fill="url(#orb-hatch)"/></g>';
    // contorno duplo
    s += '<circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" stroke-width="1.7"/>';
    s += '<circle cx="200" cy="200" r="185" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="2 4" opacity=".7"/>';
    // meridianos e paralelos
    s += '<g fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="5 4" opacity=".28">' +
      '<ellipse cx="200" cy="200" rx="190" ry="66" transform="rotate(-24 200 200)"/>' +
      '<ellipse cx="200" cy="200" rx="190" ry="66" transform="rotate(24 200 200)"/>' +
      '<ellipse cx="200" cy="200" rx="66" ry="190"/>' +
      '</g>';
    // linhas de mira
    s += '<g stroke="currentColor" stroke-width=".7" stroke-dasharray="1 6" opacity=".45">' +
      '<line x1="4" y1="200" x2="396" y2="200"/><line x1="200" y1="4" x2="200" y2="396"/></g>';
    // régua em volta
    s += '<g stroke="currentColor" stroke-width=".9" opacity=".8">';
    for (var i = 0; i < 72; i++) {
      var a = pt(184, i * 5), b = pt(i % 6 === 0 ? 177 : 180.5, i * 5);
      s += '<line x1="' + n(a[0]) + '" y1="' + n(a[1]) + '" x2="' + n(b[0]) + '" y2="' + n(b[1]) + '"/>';
    }
    s += '</g>';
    // texto curvo
    s += '<text font-family="MedievalSharp, serif" font-size="10" letter-spacing="5" fill="currentColor" opacity=".85">' +
      '<textPath href="#orb-arc" startOffset="50%" text-anchor="middle">ESFERA DO DRAGÃO</textPath></text>';
    // anéis ao redor do power level
    s += '<circle cx="200" cy="200" r="52" fill="none" stroke="currentColor" stroke-width="1" opacity=".8"/>';
    s += '<circle cx="200" cy="200" r="47" fill="none" stroke="currentColor" stroke-width=".6" stroke-dasharray="1.5 3" opacity=".7"/>';
    // estrelas e linhas de construção
    for (var k = 0; k < 6; k++) {
      var deg = -90 + k * 60, c = pt(RING, deg);
      var from = pt(RING + STAR_OUT + 2, deg), to = pt(176, deg);
      s += '<line x1="' + n(from[0]) + '" y1="' + n(from[1]) + '" x2="' + n(to[0]) + '" y2="' + n(to[1]) + '" stroke="currentColor" stroke-width=".7" stroke-dasharray="3 3" opacity=".5"/>';
      s += '<circle cx="' + n(c[0]) + '" cy="' + n(c[1]) + '" r="' + (STAR_OUT + 6) + '" fill="none" stroke="currentColor" stroke-width=".6" stroke-dasharray="2 4" opacity=".4"/>';
      s += '<polygon points="' + starPoints(c[0], c[1]) + '" fill="currentColor" fill-opacity=".09" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>';
    }
    // cotas (linhas de dimensão) e marcas de canto
    s += '<g stroke="currentColor" stroke-width=".8" fill="currentColor" opacity=".65">' +
      '<line x1="14" y1="412" x2="150" y2="412"/><line x1="250" y1="412" x2="386" y2="412"/>' +
      '<line x1="10" y1="406" x2="10" y2="418"/><line x1="390" y1="406" x2="390" y2="418"/>' +
      '<polygon points="10,412 18,409 18,415" stroke="none"/><polygon points="390,412 382,409 382,415" stroke="none"/>' +
      '<line x1="-12" y1="14" x2="-12" y2="150"/><line x1="-12" y1="250" x2="-12" y2="386"/>' +
      '<line x1="-18" y1="10" x2="-6" y2="10"/><line x1="-18" y1="390" x2="-6" y2="390"/>' +
      '<polygon points="-12,10 -15,18 -9,18" stroke="none"/><polygon points="-12,390 -15,382 -9,382" stroke="none"/>' +
      '</g>';
    s += '<g font-family="MedievalSharp, serif" font-size="9" fill="currentColor" opacity=".7" text-anchor="middle">' +
      '<text x="200" y="415" letter-spacing="3">VI ESTRELAS</text>' +
      '<text transform="translate(-9 200) rotate(-90)" letter-spacing="3">ESFERA</text></g>';
    s += '<g fill="none" stroke="currentColor" stroke-width="1" opacity=".6">' +
      '<path d="M-18 -4 V-18 H-4"/><path d="M418 -4 V-18 H404"/><path d="M-18 404 V418 H-4"/><path d="M418 404 V418 H404"/></g>';
    return s + '</svg>';
  }

  function render(container, opts) {
    container.textContent = "";
    container.classList.toggle("is-editing", !!opts.editing);
    container.insertAdjacentHTML("afterbegin", art());

    opts.attrs.forEach(function (a, i) {
      var p = pt(RING, -90 + i * 60);
      var star = el("div", "orb__star");
      star.style.left = pct(p[0]);
      star.style.top = pct(p[1]);
      star.setAttribute("role", "group");
      star.setAttribute("aria-label", a.label + ", modificador " + a.mod);

      if (opts.onRoll) {
        var roll = el("button", "orb__roll");
        roll.type = "button";
        roll.setAttribute("aria-label", "Rolar teste de " + a.label);
        roll.title = "Rolar teste de " + a.label;
        roll.addEventListener("click", function () { opts.onRoll(a); });
        star.appendChild(roll);
      }
      star.appendChild(el("span", "orb__mod", a.mod >= 0 ? "+" + a.mod : String(a.mod)));
      var tag = el("span", "orb__tag");
      tag.appendChild(el("span", "orb__name", a.abbr));
      if (opts.editing) tag.appendChild(el("span", "orb__raw", DBOUI.compact(a.raw)));
      star.appendChild(tag);
      if (opts.editing) star.appendChild(opts.addButton("atributos." + a.key, a.label));
      container.appendChild(star);
    });

    // opts.center = { label, value }: no modo "artefato" o Power Level vai para o cabeçalho e o centro mostra o Corpo Base.
    var text = opts.center ? DBOUI.fmt(opts.center.value) : DBOUI.pl(opts.pl);
    var center = el("div", "orb__center");
    center.appendChild(el("span", "orb__pl-label", opts.center ? opts.center.label : (opts.plLabel || "Power Level")));
    var value = el("span", "orb__pl", text);
    value.style.setProperty("--d", text.length);
    center.appendChild(value);
    container.appendChild(center);
  }

  return { render: render };
})();
