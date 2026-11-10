// Dragon Ball Omega — dragões decorativos em SVG (desenho original, bem simples e caricato).
//   DBODragon.ring(largura, altura) -> texto SVG: dragãozinho que dá a volta num retângulo (a ficha de exemplo).
//   DBODragon.head()                -> texto SVG: só a cabeça de lado, fofa (usada na tela de carregamento dourada).
//   DBODragon.face()                -> texto SVG: rosto de FRENTE, só contorno, com dois chifres ameaçadores (telas de deleção).
//   DBODragon.mount(container)      -> desenha o dragão em volta do elemento e redesenha quando ele muda de tamanho.
// As cores vêm das variáveis CSS --dr-base, --dr-dark, --dr-light e --dr-eye (css/dragao.css).
window.DBODragon = (function () {
  var PAD = 44;           // folga do SVG além do retângulo
  var OFF = 20;           // distância do corpo até a borda do retângulo
  var R = 30;             // raio dos cantos do caminho

  function f(n) { return Math.round(n * 10) / 10; }

  // Caminho em volta do retângulo (sentido horário), parametrizado por distância.
  function makePath(w, h) {
    var x0 = -OFF, y0 = -OFF, x1 = w + OFF, y1 = h + OFF;
    var segs = [];
    function line(ax, ay, bx, by) { segs.push({ t: "l", ax: ax, ay: ay, bx: bx, by: by, len: Math.hypot(bx - ax, by - ay) }); }
    function arc(cx, cy, a0) { segs.push({ t: "a", cx: cx, cy: cy, a0: a0, len: Math.PI / 2 * R }); }
    line(x0 + R, y0, x1 - R, y0); arc(x1 - R, y0 + R, -Math.PI / 2);
    line(x1, y0 + R, x1, y1 - R); arc(x1 - R, y1 - R, 0);
    line(x1 - R, y1, x0 + R, y1); arc(x0 + R, y1 - R, Math.PI / 2);
    line(x0, y1 - R, x0, y0 + R); arc(x0 + R, y0 + R, Math.PI);
    var total = segs.reduce(function (s, g) { return s + g.len; }, 0);
    function at(u) {
      u = ((u % total) + total) % total;
      for (var i = 0; i < segs.length; i++) {
        var g = segs[i];
        if (u <= g.len) {
          if (g.t === "l") {
            var k = u / g.len, tx = (g.bx - g.ax) / g.len, ty = (g.by - g.ay) / g.len;
            return { x: g.ax + (g.bx - g.ax) * k, y: g.ay + (g.by - g.ay) * k, tx: tx, ty: ty, nx: ty, ny: -tx };
          }
          var a = g.a0 + u / R, tx2 = -Math.sin(a), ty2 = Math.cos(a);
          return { x: g.cx + R * Math.cos(a), y: g.cy + R * Math.sin(a), tx: tx2, ty: ty2, nx: Math.cos(a), ny: Math.sin(a) };
        }
        u -= g.len;
      }
      return at(0);
    }
    return { at: at, total: total };
  }

  /* ---------- Cabeça de lado (aponta para +x): redondinha e simpática ---------- */
  function headParts() {
    var s = "";
    s += '<path class="dr-bs" d="M-34,-4 L-60,-16 L-46,2 L-62,12 L-38,14 Z"/>';                 // crina
    s += '<path class="dr-bs" d="M-12,-20 L-24,-50 L2,-26 Z"/><path class="dr-bs" d="M8,-24 L6,-56 L24,-28 Z"/>'; // chifrinhos
    s += '<ellipse class="dr-bs" cx="0" cy="0" rx="34" ry="28"/>';                               // cabeça
    s += '<rect class="dr-bs" x="14" y="-6" width="46" height="30" rx="15"/>';                    // focinho
    s += '<ellipse class="dr-light" cx="-4" cy="14" rx="14" ry="8"/>';                            // bochecha
    s += '<circle class="dr-dk" cx="52" cy="4" r="2.6"/>';                                        // narina
    s += '<circle class="dr-white" cx="8" cy="-8" r="9"/><circle class="dr-dk" cx="11" cy="-7" r="4.6"/><circle cx="12.6" cy="-8.6" r="1.4" fill="#fff"/>';
    s += '<path class="dr-dk-s" d="M26,17 Q42,26 56,15"/>';                                       // sorriso
    s += '<path class="dr-tooth" d="M40,19 L44,26 L48,19 Z"/>';                                   // dentinho
    s += '<path class="dr-whisk" d="M58,2 Q84,-10 98,6"/>';                                       // bigode
    return s;
  }

  function head() {
    return '<svg class="dr-svg dr-svg--head" viewBox="-70 -62 180 124" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g>' + headParts() + '</g></svg>';
  }

  /* ---------- Rosto de frente, só contorno (vai "engolir" a tela) ---------- */
  function face() {
    var half =
      '<path d="M128,92 C80,88 34,52 28,-8 C62,28 98,34 150,60"/>' +                       // chifre
      '<path d="M200,52 C168,52 142,64 128,92 C104,116 88,146 94,182 C98,214 124,240 160,252 C176,258 190,259 200,259"/>' + // contorno do rosto
      '<path d="M112,134 L180,154"/>' +                                                      // sobrancelha brava
      '<path d="M126,150 Q150,134 176,160 Q148,168 126,150 Z"/><path d="M152,146 L154,160"/>' + // olho
      '<path d="M184,178 q-9,6 -2,15"/>' +                                                   // narina
      '<path d="M104,200 C140,190 172,206 200,200"/>' +                                      // boca
      '<path d="M108,203 L122,232 L134,206 L148,236 L160,210 L174,238 L186,212 L200,240"/>'; // presas
    return '<svg class="dr-svg dr-svg--face" viewBox="-10 -30 420 310" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<g class="dr-outline">' + half + '<g transform="translate(400,0) scale(-1,1)">' + half + '</g></g></svg>';
  }

  /* ---------- Dragão em volta de um retângulo ---------- */
  function ring(w, h) {
    var path = makePath(w, h);
    var total = path.total;
    var bodyLen = total * 0.84, headU = total * 0.1, step = 4;
    var n = Math.floor(bodyLen / step);
    function width(t) { return 5 + 15 * Math.sin(Math.min(1, t * 1.3) * Math.PI / 2); } // diâmetro: 5 na ponta da cauda, 20 no pescoço
    var spines = "", outline = "", body = "", belly = "", legs = "";
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = headU - bodyLen * (1 - t);
      var p = path.at(u), wd = width(t);
      if (i % 6 === 0 && t > 0.05) {
        var bx = p.x + p.nx * wd * 0.4, by = p.y + p.ny * wd * 0.4, hh = 6 + wd * 0.35;
        spines += '<path class="dr-spine" d="M' + f(bx - p.tx * 4) + ',' + f(by - p.ty * 4) + ' L' + f(bx + p.nx * hh) + ',' + f(by + p.ny * hh) + ' L' + f(bx + p.tx * 4) + ',' + f(by + p.ty * 4) + ' Z"/>';
      }
      outline += '<circle class="dr-dk" cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + f(wd / 2 + 1.7) + '"/>';
      body += '<circle class="dr-body" cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + f(wd / 2) + '"/>';
      if (i % 2 === 0 && wd > 8) belly += '<circle class="dr-bl" cx="' + f(p.x - p.nx * wd * 0.2) + '" cy="' + f(p.y - p.ny * wd * 0.2) + '" r="' + f(wd * 0.22) + '"/>';
    }
    [0.32, 0.55, 0.78, 0.92].forEach(function (k) {                 // quatro perninhas curtas
      var p = path.at(headU - bodyLen * (1 - k)), wd = width(k), len = wd / 2 + 11;
      var ex = f(p.x + p.nx * len), ey = f(p.y + p.ny * len), sx = f(p.x), sy = f(p.y);
      legs += '<path class="dr-legl" d="M' + sx + ',' + sy + ' L' + ex + ',' + ey + '"/><path class="dr-leg" d="M' + sx + ',' + sy + ' L' + ex + ',' + ey + '"/>';
    });
    var hp = path.at(headU + 14), ang = Math.atan2(hp.ty, hp.tx) * 180 / Math.PI;
    return '<svg class="dr-svg dr-svg--ring" viewBox="' + (-PAD) + ' ' + (-PAD) + ' ' + (w + PAD * 2) + ' ' + (h + PAD * 2) +
      '" width="' + (w + PAD * 2) + '" height="' + (h + PAD * 2) + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<g>' + legs + spines + outline + body + belly + '</g>' +
      '<g transform="translate(' + f(hp.x) + ',' + f(hp.y) + ') rotate(' + f(ang) + ') scale(0.78)">' + headParts() + '</g></svg>';
  }

  function mount(box) {
    var holder = document.createElement("div");
    holder.className = "dr-holder";
    holder.setAttribute("aria-hidden", "true");
    box.appendChild(holder);
    var last = "";
    function draw() {
      var w = Math.round(box.clientWidth), h = Math.round(box.clientHeight);
      if (!w || !h || w + "x" + h === last) return;
      last = w + "x" + h;
      holder.innerHTML = ring(w, h);
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(box);
    else window.addEventListener("resize", draw);
  }

  return { ring: ring, head: head, face: face, mount: mount, PAD: PAD };
})();
