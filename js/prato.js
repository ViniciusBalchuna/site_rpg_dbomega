/* Prato de dados: abre no canto da tela em qualquer rolagem, mostra os dados rolando e, quando eles caem,
   entrega o resultado ao teste (callback). Quem rola sorteia os valores e só aplica o resultado depois.

   DBOPrato.rolar(titulo, dados, aoPousar, extra)
     dados:    [{ lados: 20, valor: 14 }, ...]   (valores já sorteados)
     aoPousar: função chamada com a lista de dados quando eles param (ou na hora, se o prato estiver desligado).
             Com pontaria, o valor de um dado que cai no marcador do 2x já vem dobrado (dados[i].valor; o sorteado fica em .base).
     extra:    { fixos: [{ rot: "Força", val: 4 }], mult: 1000, total: 1234 }  (opcional)
               fixos = modificadores somados aos dados; mult = multiplicador final; total = valor final já calculado
               pelo teste (se faltar, o prato soma dados + fixos). total também pode ser uma função(dados) que
               devolve o total depois que os dados pousaram (necessário quando a pontaria pode dobrar valores).
               pontaria: true = o marcador vermelho "2x" (hexágono) do centro está ativo (dobra o dado que parar nele, ignorando o máximo).
               Sem pontaria o marcador aparece cinza e não faz nada.
   DBOPrato.ocupado()  -> true enquanto uma rolada está acontecendo (o clique deve ser ignorado)
   Modo: Configurações > Alterar prato de dados (localStorage "dbo-prato"): "off" = sem prato (resultado na hora),
   "2d" = este prato de SVG, "3d" = o prato 3D (js/prato3d.js), que é o padrão. No 3D o d3 é um d6 com 1-2-3 e o
   d100 são dois d10 (dezenas + unidades); outros dados, se aparecerem, rolam no 2D. Som: "dbo-som" = "off" silencia. */
window.DBOPrato = (function () {
  var CICLO = 8, R = 27;       // mais de CICLO dados: rolam em ciclos de CICLO, os primeiros bem rápidos, somando na tela
  var BULL = 0.11;             // raio do hexágono do 2x (de ponta a ponta), em fração da largura do alvo
  var pularTudo = false;
  var root, felt, layer, bullEl, bigEl, titleEl, labelEl, sumEl, busy = false, hideT = 0, raf = 0, skipNow = null, ac = null, hover = false;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function modo() { var m; try { m = localStorage.getItem("dbo-prato"); } catch (e) {} return m === "off" || m === "2d" ? m : "3d"; }
  function ligado() { return modo() !== "off"; }
  function soundOn() { try { return localStorage.getItem("dbo-som") !== "off"; } catch (e) { return true; } }
  function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { ac = null; } return ac; }
  var lastClack = 0;
  function clack(vol, freq) {
    if (!soundOn() || !audio()) return;
    var agora = performance.now(); if (agora - lastClack < 40) return; lastClack = agora;
    var len = Math.floor(ac.sampleRate * 0.05), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.4; g.gain.value = Math.min(1, vol);
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
  }
  // Efeito da soma de um ciclo: dois tons subindo.
  function efeito() {
    if (!soundOn() || !audio()) return;
    [660, 990].forEach(function (f, i) {
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09; o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.34);
    });
  }
  // Choque: as somas se juntam (ruído elétrico + queda de tom).
  function choque() {
    if (!soundOn() || !audio()) return;
    var t = ac.currentTime, len = Math.floor(ac.sampleRate * 0.3), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5) * (Math.sin(i / 14) > -0.2 ? 1 : 0.2);
    var n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = b; f.type = "highpass"; f.frequency.value = 1800; g.gain.value = 0.35; n.connect(f); f.connect(g); g.connect(ac.destination); n.start(t);
    var o = ac.createOscillator(), og = ac.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.28);
    og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.32);
  }
  function ding() {
    if (!soundOn() || !audio()) return;
    var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.1, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.36);
  }

  function poly(n, r, off) { var p = []; for (var i = 0; i < n; i++) { var a = off + i * 2 * Math.PI / n; p.push((50 + r * Math.cos(a)).toFixed(1) + "," + (50 + r * Math.sin(a)).toFixed(1)); } return p.join(" "); }
  var SHAPE = {
    4: { p: "50,6 94,88 6,88", f: "" },
    6: { p: "14,10 86,10 90,14 90,86 86,90 14,90 10,86 10,14", f: "" },
    8: { p: "50,4 94,50 50,96 6,50", f: '<polyline class="facet" points="6,50 94,50"/>' },
    10: { p: "50,3 92,36 76,92 24,92 8,36", f: '<polyline class="facet" points="8,36 50,56 92,36"/><polyline class="facet" points="50,56 50,92"/>' },
    12: { p: poly(10, 46, -Math.PI / 2), f: "" },
    20: { p: poly(6, 46, -Math.PI / 2), f: '<polygon class="facet" points="50,22 74,64 26,64"/>' }
  };
  function shape(n) { return SHAPE[n] || { p: poly(Math.max(5, Math.min(12, n % 10 + 4)), 46, -Math.PI / 2), f: "" }; }
  function dieEl(lados) {
    var s = shape(lados), e = document.createElement("div"); e.className = "pdie";
    e.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="' + s.p + '"/>' + s.f + '<text x="50" y="' + (lados === 4 ? 66 : 52) + '">?</text></svg><small>d' + lados + '</small>';
    return e;
  }

  // Alvo hexagonal de tiro ao alvo, com cores de alvo velho. O marcador do 2x no centro também é hexagonal.
  var ALVO = '<svg class="prato__alvo" viewBox="0 0 100 86.6" aria-hidden="true"><defs><filter id="prato-gasto" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .25  0 0 0 0 .2  0 0 0 0 .12  0 0 0 .55 -.12"/></filter></defs><polygon points="100.00,43.30 75.00,86.60 25.00,86.60 0.00,43.30 25.00,-0.00 75.00,-0.00" fill="#6b5636"/><polygon points="96.50,43.30 73.25,83.57 26.75,83.57 3.50,43.30 26.75,3.03 73.25,3.03" fill="#cfc3a3"/><polygon points="88.50,43.30 69.25,76.64 30.75,76.64 11.50,43.30 30.75,9.96 69.25,9.96" fill="#55565a"/><polygon points="80.50,43.30 65.25,69.71 34.75,69.71 19.50,43.30 34.75,16.89 65.25,16.89" fill="#7f93a3"/><polygon points="72.50,43.30 61.25,62.79 38.75,62.79 27.50,43.30 38.75,23.81 61.25,23.81" fill="#cfc3a3"/><polygon points="65.50,43.30 57.75,56.72 42.25,56.72 34.50,43.30 42.25,29.88 57.75,29.88" fill="#55565a"/><g fill="none" stroke="rgba(40,30,15,.4)" stroke-width=".35"><polygon points="96.50,43.30 73.25,83.57 26.75,83.57 3.50,43.30 26.75,3.03 73.25,3.03"/><polygon points="88.50,43.30 69.25,76.64 30.75,76.64 11.50,43.30 30.75,9.96 69.25,9.96"/><polygon points="80.50,43.30 65.25,69.71 34.75,69.71 19.50,43.30 34.75,16.89 65.25,16.89"/><polygon points="72.50,43.30 61.25,62.79 38.75,62.79 27.50,43.30 38.75,23.81 61.25,23.81"/><polygon points="65.50,43.30 57.75,56.72 42.25,56.72 34.50,43.30 42.25,29.88 57.75,29.88"/></g><rect width="100" height="86.6" filter="url(#prato-gasto)" opacity=".5"/></svg>';

  function build() {
    if (root) return;
    root = document.createElement("aside"); root.className = "prato"; root.setAttribute("aria-label", "Prato de dados");
    root.innerHTML = '<div class="prato__top"><h3></h3><button class="prato__ib" type="button" data-a="mute" aria-label="Som dos dados" title="Som">&#128266;</button>' +
      '<button class="prato__ib" type="button" data-a="close" aria-label="Fechar o prato" title="Fechar">&#10005;</button></div>' +
      '<div class="prato__felt" role="img" aria-label="Alvo hexagonal com dados rolando">' + ALVO + '<div class="prato__bull" aria-hidden="true">2x</div><div class="prato__dice"></div><div class="prato__big" aria-live="polite"></div></div>' +
      '<div class="prato__foot"><div class="prato__label"></div><div class="prato__sum"></div></div>';
    document.body.appendChild(root);
    felt = root.querySelector(".prato__felt"); layer = root.querySelector(".prato__dice"); bullEl = root.querySelector(".prato__bull"); bigEl = root.querySelector(".prato__big"); titleEl = root.querySelector("h3"); labelEl = root.querySelector(".prato__label"); sumEl = root.querySelector(".prato__sum");
    var mute = root.querySelector('[data-a="mute"]');
    function icon() { mute.innerHTML = soundOn() ? "&#128266;" : "&#128263;"; }
    icon();
    mute.addEventListener("click", function () { try { localStorage.setItem("dbo-som", soundOn() ? "off" : "on"); } catch (e) {} icon(); });
    root.querySelector('[data-a="close"]').addEventListener("click", fechar);
    root.addEventListener("pointerenter", function (e) { if (e.pointerType === "touch") return; hover = true; clearTimeout(hideT); });
    root.addEventListener("pointerleave", function (e) { if (e.pointerType === "touch") return; hover = false; if (!busy && root.classList.contains("is-on")) agendarFechar(2500); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("is-on")) fechar(); });
  }
  function fechar() { clearTimeout(hideT); if (skipNow) skipNow(); root.classList.remove("is-on"); }
  // Fecha sozinho depois de um tempo. Só existe UM relógio de cada vez (o anterior é sempre cancelado) e ele nunca fecha o prato
  // no meio de uma rolada nem com o mouse em cima. Antes, relógios velhos ficavam soltos e fechavam o prato de repente.
  function agendarFechar(ms) {
    clearTimeout(hideT);
    hideT = setTimeout(function () { if (!busy && !hover && root.classList.contains("is-on")) fechar(); }, ms);
  }

  function lancar(list, pronto, opc) {
    opc = opc || {};
    var rapido = !!opc.rapido || pularTudo, pontaria = !!opc.pontaria;
    layer.textContent = "";
    var W = layer.clientWidth, H = layer.clientHeight, CX = W / 2, CY = H / 2, AP = H / 2, bullR = BULL * W, ds = [];
    // As 6 paredes do hexágono (lados retos em cima e embaixo): normais a 30°, 90°, 150°...
    var NORM = [0, 1, 2, 3, 4, 5].map(function (k) { var a = (30 + 60 * k) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
    list.forEach(function (it, i) {
      var el = dieEl(it.lados); layer.appendChild(el);
      var ang = Math.random() * 6.283 + i * 6.283 / list.length, sx = CX + Math.cos(ang) * W, sy = CY + Math.sin(ang) * W;   // sai da borda e mira perto do centro
      var tx = CX + (Math.random() - 0.5) * AP * 1.1, ty = CY + (Math.random() - 0.5) * AP * 1.1, dx = tx - sx, dy = ty - sy, dl = Math.hypot(dx, dy) || 1, sp = 560 + Math.random() * 380;
      var d = { el: el, t: el.querySelector("text"), lados: it.lados, item: it, x: sx, y: sy, vx: dx / dl * sp, vy: dy / dl * sp,
        rot: Math.random() * 360, vr: (Math.random() < 0.5 ? -1 : 1) * (500 + Math.random() * 700), landed: false, tick: 0, lastHit: 0 };
      dentro(d); ds.push(d);
    });
    function place(d) { d.el.style.transform = "translate(" + (d.x - R).toFixed(1) + "px," + (d.y - R).toFixed(1) + "px) rotate(" + d.rot.toFixed(1) + "deg)"; }
    // Mantém o dado dentro das 6 paredes (nenhum dado sai do prato). Com bater, devolve a batida (velocidade refletida).
    function dentro(d, bater) {
      var bateu = false;
      for (var pass = 0; pass < 2; pass++) NORM.forEach(function (n) {
        var proj = (d.x - CX) * n[0] + (d.y - CY) * n[1], lim = AP - R;
        if (proj > lim) {
          d.x -= (proj - lim) * n[0]; d.y -= (proj - lim) * n[1];
          if (bater) { var vn = d.vx * n[0] + d.vy * n[1]; if (vn > 0) { d.vx -= 1.72 * vn * n[0]; d.vy -= 1.72 * vn * n[1]; bateu = true; } }
        }
      });
      if (!isFinite(d.x) || !isFinite(d.y)) { d.x = CX; d.y = CY; d.vx = d.vy = 0; }
      return bateu;
    }
    // O marcador do 2x é um hexágono (pontas nos lados, retos em cima e embaixo, igual ao alvo): bullR é o raio de ponta a ponta.
    function naBola(d) { var ax = Math.abs(d.x - CX), ay = Math.abs(d.y - CY); return ay <= bullR * 0.8660254 && ax * 0.8660254 + ay * 0.5 <= bullR * 0.8660254; }
    // Vale o que está embaixo do dado agora: com pontaria, centro dentro da bola vermelha = valor dobrado, ignorando o máximo.
    function julgar(d) {
      var acerto = pontaria && naBola(d), antes = !!d.item.x2;
      d.item.x2 = acerto; d.item.valor = acerto ? d.item.base * 2 : d.item.base;
      d.t.textContent = d.item.valor; d.el.classList.toggle("is-x2", acerto);
      d.el.classList.toggle("is-max", !acerto && d.item.valor === d.lados); d.el.classList.toggle("is-one", !acerto && d.item.valor === 1);
      if (acerto && !antes) { bullEl.classList.remove("is-hit"); void bullEl.offsetWidth; bullEl.classList.add("is-hit"); efeito(); }
    }
    function land(d) {
      d.landed = true; d.vx = d.vy = d.vr = 0; d.rot = (Math.random() - 0.5) * 24; d.el.classList.add("is-landed"); dentro(d); julgar(d);
    }
    var MIN = R * 2 + 2;   // distância mínima entre centros: nenhum dado entra no outro
    function separar(vezes) {
      for (var n = 0; n < vezes; n++) {
        var mexeu = false;
        for (var i = 0; i < ds.length; i++) for (var j = i + 1; j < ds.length; j++) {
          var a = ds[i], b = ds[j], dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
          if (dist >= MIN) continue;
          if (dist < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = Math.hypot(dx, dy) || 1; }
          var nx = dx / dist, ny = dy / dist, push = (MIN - dist) / 2;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; mexeu = true;
        }
        ds.forEach(function (d) { dentro(d); });
        if (!mexeu) break;
      }
    }
    var inicio = performance.now(), limite = rapido ? 1300 : 4200;
    var finished = false;
    function end() {                    // arruma o que sobrou (sem sobreposição, tudo dentro) e só então vale o 2x
      if (finished) return; finished = true; skipNow = null; cancelAnimationFrame(raf);
      separar(80); ds.forEach(function (d) { d.rot = d.landed ? d.rot : 0; place(d); julgar(d); });
      pronto();
    }
    function pousarTodos() { ds.forEach(function (d, i) { if (!d.landed) { if (reduce || pularTudo) { var a = i * 6.283 / ds.length; d.x = CX + Math.cos(a) * 62; d.y = CY + Math.sin(a) * 62; d.rot = 0; } land(d); } }); }
    skipNow = function () { pularTudo = true; pousarTodos(); end(); };   // fechar no meio da rolada: os dados caem na hora
    if (reduce || pularTudo) { pousarTodos(); setTimeout(end, 250); return; }
    var prev = performance.now();
    function frame(now) {
      if (now - inicio > limite) { pousarTodos(); return end(); }   // tempo esgotado: o que ainda rola pousa onde está
      var total = Math.min(0.033, (now - prev) / 1000) * (rapido ? 3 : 1); prev = now;
      var passos = rapido ? 3 : 1, dt = total / passos;
      for (var p = 0; p < passos; p++) passo(now, dt);
      ds.forEach(place);
      if (ds.some(function (d) { return !d.landed; })) raf = requestAnimationFrame(frame); else end();
    }
    function passo(now, dt) {
      ds.forEach(function (d) {
        if (d.landed) return;
        d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
        var k = Math.exp(-1.9 * dt); d.vx *= k; d.vy *= k; d.vr *= Math.exp(-2.3 * dt);
        var hit = dentro(d, true), sp = Math.hypot(d.vx, d.vy);
        if (hit && sp > 60 && now - d.lastHit > 70) { d.lastHit = now; clack(sp / 700, 900 + Math.random() * 1800); d.vr *= -0.8; }
        d.tick -= dt; if (d.tick <= 0 && sp > 90) { d.t.textContent = 1 + Math.floor(Math.random() * d.lados); d.tick = 0.05 + (1 - Math.min(1, sp / 600)) * 0.12; }
      });
      for (var i = 0; i < ds.length; i++) for (var j = i + 1; j < ds.length; j++) {   // quique entre dados que ainda rolam
        var a = ds[i], b = ds[j];
        if (a.landed || b.landed) continue;
        var dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
        if (dist < MIN) {
          var nx = dx / dist, ny = dy / dist, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { a.vx += nx * rv * 0.8; a.vy += ny * rv * 0.8; b.vx -= nx * rv * 0.8; b.vy -= ny * rv * 0.8; clack(0.35, 1600 + Math.random() * 1200); }
        }
      }
      separar(3);                        // empurra quem estiver sobreposto (parado ou rolando) e segura dentro das paredes
      ds.forEach(function (d) { if (!d.landed && Math.hypot(d.vx, d.vy) < 28) land(d); });
    }
    ds.forEach(place); raf = requestAnimationFrame(frame);
  }

  // Número grande no centro do prato (soma dos ciclos). Vazio esconde.
  function mostrarGrande(txt, destaque) {
    bigEl.textContent = txt; bigEl.className = "prato__big" + (txt ? " is-on" : "") + (destaque ? " is-total" : "");
    if (txt) { bigEl.style.animation = "none"; void bigEl.offsetWidth; bigEl.style.animation = ""; }
  }
  function fmt(n) { return (window.UI && UI.fmt) ? UI.fmt(n) : String(n); }
  // Sessão da campanha (js/sessao-data.js): quem está na sessão tem a rolagem mostrada no log do mestre.
  function registrar(titulo, dados, extra) {
    try {
      if (!window.DBOSessao || !DBOSessao.registrarRolagem || !dados || !dados.length) return;
      var soma = dados.reduce(function (s, d) { return s + (Number(d.valor) || 0); }, 0);
      var fx = (extra.fixos || []).reduce(function (s, f) { return s + (Number(f.val) || 0); }, 0);
      var total = typeof extra.total === "function" ? extra.total(dados) : typeof extra.total === "number" ? extra.total : soma + fx;
      var nat = dados.length === 1 && dados[0].lados === 20 ? (dados[0].base != null ? dados[0].base : dados[0].valor) : 0;
      DBOSessao.registrarRolagem({ titulo: titulo || "Rolagem", total: total, natural: nat, dados: dados.map(function (d) { return d.lados; }), soma: soma, fixos: fx, mult: extra.mult || 1, log: extra.log || null });
    } catch (e) { if (window.console) console.warn(e); }
  }
  function rolar(titulo, dados, aoPousar, extra) {
    extra = extra || {};
    aoPousar = aoPousar || function () {};
    if (busy) return false;
    if (!ligado()) { registrar(titulo, dados, extra); aoPousar(); return true; }      // desligado em Configurações: resultado na hora
    if (!dados || !dados.length || !document.body) { aoPousar(); return true; }
    build(); busy = true; clearTimeout(hideT); audio();
    pularTudo = false;
    dados.forEach(function (d) { d.base = d.valor; d.x2 = false; });
    var tres = modo() === "3d" && window.DBOPrato3D && DBOPrato3D.suporta(dados);
    root.classList.toggle("is-3d", !!tres); felt.classList.toggle("is-3d", !!tres);
    if (tres) DBOPrato3D.som(soundOn);
    bullEl.classList.toggle("is-off", !extra.pontaria); bullEl.title = extra.pontaria ? "" : "Pontaria desligada";
    var ciclos = [];
    if (tres) {   // no 3D a rodada é de até 8 dados físicos (um d100 conta como dois d10)
      var atual = [], ocup = 0;
      dados.forEach(function (d) { var p = DBOPrato3D.peso(d); if (ocup + p > CICLO && atual.length) { ciclos.push(atual); atual = []; ocup = 0; } atual.push(d); ocup += p; });
      if (atual.length) ciclos.push(atual);
    } else for (var ci = 0; ci < dados.length; ci += CICLO) ciclos.push(dados.slice(ci, ci + CICLO));
    titleEl.textContent = titulo || "Rolagem"; labelEl.textContent = "Rolando…"; sumEl.textContent = ""; mostrarGrande("");
    root.classList.add("is-on");

    function somaDe(l) { return l.reduce(function (s, d) { return s + d.valor; }, 0); }
    function espera(ms, fn) { if (reduce || pularTudo) fn(); else setTimeout(fn, ms); }
    // Soma na tela: o primeiro ciclo aparece sozinho; os seguintes aparecem como "+N" e se juntam ao total ("choque").
    function mostrarSoma(i, acc, s, cb) {
      if (i === 0) { mostrarGrande(fmt(s)); efeito(); return espera(700, function () { mostrarGrande(""); cb(); }); }
      mostrarGrande("+" + fmt(s)); efeito();
      espera(520, function () {
        mostrarGrande(fmt(acc + s), true); choque();
        espera(780, function () { mostrarGrande(""); cb(); });
      });
    }
    function fim() {
      var vals = dados.map(function (d) { return d.valor; }), soma = somaDe(dados);
      var nat = dados.length === 1 && dados[0].lados === 20 ? dados[0].base : 0, dobrou = dados.some(function (d) { return d.x2; });
      var fixos = (extra.fixos || []).filter(function (f) { return f.val; }), somaFixos = fixos.reduce(function (s, f) { return s + f.val; }, 0);
      var base = soma + somaFixos, total = typeof extra.total === "function" ? extra.total(dados) : typeof extra.total === "number" ? extra.total : base;
      var txt = dados.length > 8 ? vals.slice(0, 8).join(" + ") + " … (+" + (dados.length - 8) + " dados) = " + fmt(soma) : vals.join(" + ");
      fixos.forEach(function (f) { txt += (f.val < 0 ? " − " : " + ") + Math.abs(f.val) + (f.rot ? " " + f.rot : ""); });
      if (extra.mult && extra.mult !== 1) txt += " = " + fmt(Math.max(0, base)) + " × " + fmt(extra.mult);
      if (dobrou) txt += " · 2× no alvo!";
      labelEl.textContent = txt;
      sumEl.innerHTML = dados.length > 1 || fixos.length || (extra.mult && extra.mult !== 1) ? '= <b></b>' : '<b></b>';
      var b = sumEl.querySelector("b"); b.textContent = fmt(total);
      if (nat === 20) { b.className = "is-crit"; sumEl.insertAdjacentHTML("beforeend", '<em style="color:#3ddc97">Crítico</em>'); }
      if (nat === 1) { b.className = "is-fail"; sumEl.insertAdjacentHTML("beforeend", '<em style="color:#ff6a5c">Falha crítica</em>'); }
      registrar(titulo, dados, extra);
      if (tres) skipNow = null;
      setTimeout(function () { if (!tres) ding(); busy = false; try { aoPousar(dados); } catch (e) { if (window.console) console.error(e); } if (!hover) agendarFechar(5000); }, reduce ? 0 : 350);
    }
    function ciclo(i, acc) {
      var lista = ciclos[i], ultimo = i === ciclos.length - 1;
      if (ciclos.length > 1) labelEl.textContent = "Rolando… parte " + (i + 1) + " de " + ciclos.length;
      lancar(lista, function () {
        if (ciclos.length === 1) return fim();
        var s = somaDe(lista);   // depois de pousar: com pontaria, valores dobrados já contam
        mostrarSoma(i, acc, s, function () { if (ultimo) fim(); else ciclo(i + 1, acc + s); });
      }, { rapido: !ultimo, pontaria: !!extra.pontaria });
    }
    // Prato 3D: cada ciclo rola com física; quando os dados param, as partículas levam os valores ao centro e a soma sobe
    // (começando pela soma dos ciclos anteriores). 20 natural no d20 ou dado no 2x ganham o "BAM" completo.
    function ciclo3d(i, acc) {
      var lista = ciclos[i], ultimo = i === ciclos.length - 1;
      if (ciclos.length > 1) labelEl.textContent = "Rolando… parte " + (i + 1) + " de " + ciclos.length;
      DBOPrato3D.montar(felt);
      DBOPrato3D.lancar(lista.map(function (d) { return { lados: d.lados, valor: d.base }; }), { pontaria: !!extra.pontaria, rapido: !ultimo, pular: pularTudo || reduce }, function (x2) {
        lista.forEach(function (d, k) { d.x2 = !!x2[k]; d.valor = d.x2 ? d.base * 2 : d.base; });
        var s = somaDe(lista), epico = lista.some(function (d) { return d.x2 || (d.lados === 20 && d.base === 20); });
        DBOPrato3D.contar(lista.map(function (d) { return d.valor; }), acc, epico, function () { if (ultimo) fim(); else ciclo3d(i + 1, acc + s); });
      });
    }
    if (tres) { skipNow = function () { pularTudo = true; DBOPrato3D.pular(); }; requestAnimationFrame(function () { ciclo3d(0, 0); }); }
    else requestAnimationFrame(function () { ciclo(0, 0); });
    return true;
  }
  return { rolar: rolar, ocupado: function () { return busy; } };
})();
