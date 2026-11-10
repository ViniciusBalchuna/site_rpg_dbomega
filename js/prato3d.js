/* Prato de dados 3D (padrão do site): dados de verdade em canvas 2D, sem bibliotecas (a regra de segurança do site
   só aceita scripts do próprio domínio). A física roda inteira antes (alguns ms) e o valor sorteado é colocado na face
   de cima; depois é só desenhar. Quando os dados param, uma rajada de partículas leva o valor de cada dado ao centro,
   onde a soma sobe devagar e acelera perto do resultado. 20 natural no d20 ou dado no 2x ganham o "BAM" completo.

   Usado por js/prato.js (Configurações > Alterar prato de dados: Sem / 2D / 3D; "dbo-prato" = "off" | "2d" | "3d").
   DBOPrato3D.suporta(dados)                     -> true se todos os dados existem em 3D (d3 = d6 com 1-2-3, d4, d6, d8,
                                                    d10, d12, d20, d100 = dois d10)
   DBOPrato3D.peso(dado)                         -> quantos dados físicos ele ocupa (d100 = 2)
   DBOPrato3D.montar(felt)                       -> cria (uma vez) os canvases dentro do prato e ajusta o tamanho
   DBOPrato3D.lancar(lista, opc, pronto(x2[]))   -> lista [{ lados, valor }]; opc { pontaria, rapido, pular }
   DBOPrato3D.contar(valores, base, epico, pronto) -> partículas + soma no centro (base = soma das rodadas anteriores)
   DBOPrato3D.pular()                            -> termina na hora (prato fechado no meio da rolada)
   DBOPrato3D.som(fn)                            -> fn() diz se o som está ligado
   Protótipo e testes de colisão: artefato "Prato de Dados 3D". */
window.DBOPrato3D = (function () {
  "use strict";
  var pulando = false, somOk = function () { return true; };
  /* ================= Vetores e quatérnios ================= */
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function qmul(a, b) {
    return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  }
  function qnorm(q) { var l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; }
  function qrot(q, v) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    var ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  }
  function qeixo(eixo, ang) { var s = Math.sin(ang / 2); eixo = norm(eixo); return [Math.cos(ang / 2), eixo[0] * s, eixo[1] * s, eixo[2] * s]; }
  function qslerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
    if (d > .9995) return qnorm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]);
    var th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
  }
  // Sorteio com semente: a física é refeita igual (útil para medir e para o "replay").
  var semente = 1;
  function rnd() { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; }

  /* ================= Formas dos dados ================= */
  function centro(vs, f) { var c = [0, 0, 0]; f.forEach(function (i) { c = add(c, vs[i]); }); return mul(c, 1 / f.length); }
  function orientar(vs, faces) {   // vértices de cada face em ordem anti-horária vista de fora
    return faces.map(function (f) {
      var c = centro(vs, f), n = norm(c), u = norm(sub(vs[f[0]], c)), v = cross(n, u);
      return f.slice().sort(function (a, b) {
        var pa = sub(vs[a], c), pb = sub(vs[b], c);
        return Math.atan2(dot(pa, v), dot(pa, u)) - Math.atan2(dot(pb, v), dot(pb, u));
      });
    });
  }
  function escalar(vs, r) { var m = 0; vs.forEach(function (v) { m = Math.max(m, len(v)); }); return vs.map(function (v) { return mul(v, r / m); }); }
  function icosa() {
    var p = (1 + Math.sqrt(5)) / 2, vs = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
    var fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { vs: vs, fs: fs };
  }
  function forma(lados) {
    var vs, fs;
    if (lados === 4) { vs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]; fs = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]; }
    else if (lados === 6) {
      vs = []; for (var i = 0; i < 8; i++) vs.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
      fs = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];
    } else if (lados === 8) { vs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; fs = []; [0, 1].forEach(function (a) { [2, 3].forEach(function (b) { [4, 5].forEach(function (c) { fs.push([a, b, c]); }); }); }); }
    else if (lados === 10) {
      var h = 1, a = h * (1 - Math.cos(Math.PI / 5)) / (1 + Math.cos(Math.PI / 5));
      vs = [[0, 0, h], [0, 0, -h]];
      for (var k = 0; k < 5; k++) { var t1 = k * 2 * Math.PI / 5, t2 = t1 + Math.PI / 5; vs.push([Math.cos(t1), Math.sin(t1), a]); vs.push([Math.cos(t2), Math.sin(t2), -a]); }
      fs = [];
      for (var j = 0; j < 5; j++) {
        var u0 = 2 + 2 * j, l0 = 3 + 2 * j, u1 = 2 + 2 * ((j + 1) % 5), l1 = 3 + 2 * ((j + 1) % 5);
        fs.push([0, u0, l0, u1]); fs.push([1, l0, u1, l1]);
      }
    } else if (lados === 12) {   // dodecaedro = dual do icosaedro
      var ic = icosa(); vs = ic.fs.map(function (f) { return norm(centro(ic.vs, f)); }); fs = [];
      for (var v = 0; v < 12; v++) { var f = []; ic.fs.forEach(function (ff, idx) { if (ff.indexOf(v) >= 0) f.push(idx); }); fs.push(f); }
    } else { var ico = icosa(); vs = ico.vs; fs = ico.fs; }
    vs = escalar(vs, lados === 4 ? 1.25 : lados === 6 ? 1.12 : lados === 10 ? 1.12 : 1.08);
    fs = orientar(vs, fs);
    var normais = fs.map(function (f) { return norm(centro(vs, f)); });
    if (lados === 10) normais = fs.map(function (f) { return norm(cross(sub(vs[f[1]], vs[f[0]]), sub(vs[f[2]], vs[f[0]]))); }).map(function (n, i) { return dot(n, centro(vs, fs[i])) < 0 ? mul(n, -1) : n; });
    return { lados: lados, vs: vs, fs: fs, ns: normais };
  }
  var FORMAS = {}; [4, 6, 8, 10, 12, 20].forEach(function (n) { FORMAS[n] = forma(n); });

  /* ================= Prato (mundo: x direita, y fundo, z para cima) ================= */
  var RP = 8.6;                                   // raio do hexágono (ponta a ponta)
  var AP = RP * Math.cos(Math.PI / 6);            // apótema (distância às paredes)
  var PAREDES = [0, 1, 2, 3, 4, 5].map(function (k) { var a = (30 + 60 * k) * Math.PI / 180; return [Math.cos(a), Math.sin(a), 0]; });
  // Na física, as paredes "fecham" um pouco conforme sobem (rumo à câmera): um dado lá no alto continua,
  // visto de cima, dentro do prato. Abaixo da borda a diferença é de milímetros.
  var TETO = 8.5, INCL = AP / 24, PF = PAREDES.map(function (n) { return norm([n[0], n[1], INCL]); }), APF = AP / Math.sqrt(1 + INCL * INCL);
  function conter(b) {   // correção final de posição: nenhum vértice fura o fundo nem as paredes
    var vs = b.f.vs, minz = 9, maxz = -9, exc = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < vs.length; i++) {
      var pw = add(b.p, qrot(b.q, vs[i])); minz = Math.min(minz, pw[2]); maxz = Math.max(maxz, pw[2]);
      for (var k = 0; k < 6; k++) exc[k] = Math.max(exc[k], dot(pw, PF[k]) - APF);
    }
    for (var k2 = 0; k2 < 6; k2++) if (exc[k2] > 0) {
      b.p = sub(b.p, mul(PF[k2], exc[k2]));
      var vv = dot(b.v, PF[k2]); if (vv > 0) b.v = sub(b.v, mul(PF[k2], vv * (1 + E_PAREDE)));
    }
    if (minz < 0) b.p[2] -= minz;
    else if (maxz > TETO) { b.p[2] -= maxz - TETO; if (b.v[2] > 0) b.v[2] *= -.3; }   // teto invisível
  }
  var MONO = 'ui-monospace, "IBM Plex Mono", monospace';   // a mesma fonte do prato atual
  var ALT_PAREDE = 1.1, BULL = 0.22 * 2 * RP;     // marcador 2× (ponta a ponta): 22% da largura, igual ao prato atual

  /* ================= Física =================
     Corpo rígido por dado (massa 1, inércia de esfera), contato pelos vértices com o fundo e as paredes,
     choque entre dados por esferas. Passo fixo de 1/240 s. Tudo é calculado antes, quadro a quadro. */
  var G = 78, DT = 1 / 240, SUB = 4, INV_I = 1 / .42, E_CHAO = .52, E_PAREDE = .55, MU = .5;
  function criarCorpo(lados, i, n) {
    var ang = rnd() * Math.PI * 2, dist = AP - 1.6;
    var p = [Math.cos(ang) * dist * .85, Math.sin(ang) * dist * .85, 5 + rnd() * 3];
    var alvo = [(rnd() - .5) * 5, (rnd() - .5) * 5, 0], dir = norm(sub(alvo, p)), vel = 24 + rnd() * 10;
    return { lados: lados, f: FORMAS[lados], p: p, v: [dir[0] * vel, dir[1] * vel, 7 + rnd() * 6], q: qnorm([rnd() - .5, rnd() - .5, rnd() - .5, rnd() - .5]),
      w: [(rnd() - .5) * 90, (rnd() - .5) * 90, (rnd() - .5) * 90], parado: 0, raio: lados === 4 ? .95 : 1 };
  }
  function impulso(b, r, n, e, mu) {
    var vp = add(b.v, cross(b.w, r)), vn = dot(vp, n);
    if (vn >= 0) return 0;
    var rn = cross(r, n), j = -(1 + e) * vn / (1 + INV_I * dot(rn, rn));
    b.v = add(b.v, mul(n, j)); b.w = add(b.w, mul(rn, INV_I * j));
    vp = add(b.v, cross(b.w, r)); var vt = sub(vp, mul(n, dot(vp, n))), lt = len(vt);
    if (lt > 1e-4) {
      var t = mul(vt, 1 / lt), rt = cross(r, t), jt = -lt / (1 + INV_I * dot(rt, rt)), lim = mu * j;
      jt = Math.max(-lim, Math.min(lim, jt));
      b.v = add(b.v, mul(t, jt)); b.w = add(b.w, mul(rt, INV_I * jt));
    }
    return -vn;
  }
  function passo(corpos) {
    var batidas = 0;
    corpos.forEach(function (b) {
      if (b.dormindo) return;
      b.v[2] -= G * DT;
      b.p = add(b.p, mul(b.v, DT));
      var wq = [0, b.w[0], b.w[1], b.w[2]], dq = qmul(wq, b.q);
      b.q = qnorm([b.q[0] + dq[0] * DT * .5, b.q[1] + dq[1] * DT * .5, b.q[2] + dq[2] * DT * .5, b.q[3] + dq[3] * DT * .5]);
      var fundo = 0, toque = false, vs = b.f.vs;
      for (var i = 0; i < vs.length; i++) {
        var r = qrot(b.q, vs[i]), pw = add(b.p, r);
        if (pw[2] < 0) { toque = true; fundo = Math.max(fundo, -pw[2]); batidas = Math.max(batidas, impulso(b, r, [0, 0, 1], E_CHAO, MU)); }
        for (var k = 0; k < 6; k++) {
          if (dot(pw, PF[k]) > APF) batidas = Math.max(batidas, impulso(b, r, mul(PF[k], -1), E_PAREDE, .3));
        }
      }
      if (fundo) b.p[2] += fundo;
      conter(b);
      b.v = mul(b.v, toque ? .996 : .9995); b.w = mul(b.w, toque ? .985 : .998);
      b.parado = toque && len(b.v) < .25 && len(b.w) < .45 ? b.parado + DT : 0;
    });
    for (var i2 = 0; i2 < 2; i2++) for (var i = 0; i < corpos.length; i++) for (var j = i + 1; j < corpos.length; j++) {
      var a = corpos[i], c = corpos[j], d = sub(c.p, a.p), dist = len(d), min = (a.raio + c.raio) * .92;
      if (dist >= min || dist < 1e-6) continue;
      var n = mul(d, 1 / dist), pen = min - dist;
      a.p = sub(a.p, mul(n, pen / 2)); c.p = add(c.p, mul(n, pen / 2));
      var rv = dot(sub(c.v, a.v), n);
      if (rv < 0) {
        var jj = -(1 + .5) * rv / 2;
        a.v = sub(a.v, mul(n, jj)); c.v = add(c.v, mul(n, jj));
        var giro = cross(n, [0, 0, 1]); a.w = add(a.w, mul(giro, jj * .8)); c.w = sub(c.w, mul(giro, jj * .8));
        batidas = Math.max(batidas, -rv); a.dormindo = c.dormindo = false;
      }
    }
    corpos.forEach(function (b) { conter(b); if (b.parado > .35) b.dormindo = true; });
    return batidas;
  }
  // Face de baixo (a que encosta no fundo) e a de cima (a que vale). No d4 vale o vértice de cima.
  function faceExtrema(b, q, sinal) {
    var melhor = -2, idx = 0;
    b.f.ns.forEach(function (n, i) { var z = qrot(q, n)[2] * sinal; if (z > melhor) { melhor = z; idx = i; } });
    return idx;
  }
  function verticeDeCima(b, q) { var melhor = -9, idx = 0; b.f.vs.forEach(function (v, i) { var z = qrot(q, v)[2]; if (z > melhor) { melhor = z; idx = i; } }); return idx; }
  // Endireita o dado: a face de baixo fica bem deitada no fundo (e o dado encosta nele).
  function deitado(b, q) {
    var nb = qrot(q, b.f.ns[faceExtrema(b, q, -1)]), ang = Math.acos(Math.max(-1, Math.min(1, -nb[2])));
    var eixo = cross(nb, [0, 0, -1]), q2 = len(eixo) > 1e-6 ? qnorm(qmul(qeixo(eixo, ang), q)) : q;
    var minz = 9; b.f.vs.forEach(function (v) { minz = Math.min(minz, qrot(q2, v)[2]); });
    return { q: q2, z: -minz };
  }
  function simular(lista) {
    var t0 = performance.now(), corpos = lista.map(function (l, i) { return criarCorpo(l.lados, i, lista.length); });
    var quadros = [], sons = [], maxQ = 60 * 6;
    for (var f = 0; f < maxQ; f++) {
      var bat = 0;
      for (var s = 0; s < SUB; s++) bat = Math.max(bat, passo(corpos));
      if (bat > 6) sons.push([f, Math.min(1, bat / 30)]);
      quadros.push(corpos.map(function (b) { return { p: b.p.slice(), q: b.q.slice() }; }));
      if (f > 30 && corpos.every(function (b) { return b.dormindo; })) break;
    }
    // Acomodação final (12 quadros): cada dado deita na face de baixo.
    var ult = quadros[quadros.length - 1], finais = corpos.map(function (b, i) { return deitado(b, ult[i].q); });
    for (var k = 1; k <= 12; k++) {
      var t = k / 12, e = t * t * (3 - 2 * t);
      quadros.push(corpos.map(function (b, i) { var u = ult[i]; return { p: [u.p[0], u.p[1], u.p[2] + (finais[i].z - u.p[2]) * e], q: qslerp(u.q, finais[i].q, e) }; }));
    }
    // O valor sorteado vai para a face de cima: troca os números de duas faces (ninguém percebe durante o giro).
    corpos.forEach(function (b, i) {
      var qf = finais[i].q, n = b.lados, rotulos = lista[i].rotulos ? lista[i].rotulos.slice() : [];
      if (!rotulos.length) for (var r = 0; r < (n === 4 ? 4 : b.f.fs.length); r++) rotulos.push(r + 1);
      var topo = n === 4 ? verticeDeCima(b, qf) : faceExtrema(b, qf, 1), quer = lista[i].valor, onde = rotulos.indexOf(quer);
      if (onde < 0) rotulos[topo] = quer; else { var tmp = rotulos[topo]; rotulos[topo] = quer; rotulos[onde] = tmp; }
      b.rotulos = rotulos;
      var pf = quadros[quadros.length - 1][i].p;
      b.noAlvo = Math.abs(pf[1]) <= BULL / 2 * .866 && Math.abs(pf[0]) * .866 + Math.abs(pf[1]) * .5 <= BULL / 2 * .866;
    });
    return { corpos: corpos, quadros: quadros, sons: sons, ms: performance.now() - t0 };
  }

  /* ================= Câmera e desenho ================= */
  var cv = null, g = null, dpr = 1, W = 0, H = 0;
  // Câmera por cima do prato (como o prato atual), com perspectiva: o dado cresce quando sobe e encolhe ao cair.
  var CAM = [0, -2.6, 30], OLHA = [0, 0, 0], F, RIGHT, UP, FOCO = 1;
  (function () { F = norm(sub(OLHA, CAM)); RIGHT = norm(cross(F, [0, 0, 1])); UP = cross(RIGHT, F); })();
  var LUZ = norm([-.45, -.55, 1]);
  function ajustar() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(160, Math.round(r.width)); H = Math.round(W * .88);
    cv.width = W * dpr; cv.height = H * dpr; FOCO = W * 1.62;
    desenharQuadro(ultimoQuadro);
  }
  function proj(p) { var d = sub(p, CAM), z = dot(d, F); return [W / 2 + FOCO * dot(d, RIGHT) / z, H * .5 - FOCO * dot(d, UP) / z, z]; }
  function hexPts(r, z) { var out = []; for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; out.push(proj([Math.cos(a) * r, Math.sin(a) * r, z || 0])); } return out; }
  function poligono(pts) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); }
  var pontariaLigada = false;
  function desenharPrato() {
    // borda de couro, aros do alvo (as mesmas cores do prato atual) e o marcador 2× no meio
    // argolas do mesmo tamanho, da borda até o 2x (sem a faixa cinza enorme no meio)
    var aros = [[1, "#6b5636"], [.965, "#cfc3a3"], [.816, "#55565a"], [.667, "#7f93a3"], [.518, "#cfc3a3"], [.369, "#55565a"]];
    // parede de trás (faces internas visíveis)
    var topo = hexPts(RP, ALT_PAREDE), base = hexPts(RP, 0);
    for (var k = 0; k < 6; k++) {
      var k2 = (k + 1) % 6, meio = add(mul(add([Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3), 0], [Math.cos(k2 * Math.PI / 3), Math.sin(k2 * Math.PI / 3), 0]), RP / 2), [0, 0, 0]);
      if (meio[1] < .5) continue;   // só as de trás
      poligono([base[k], base[k2], topo[k2], topo[k]]); g.fillStyle = "#4a3b24"; g.fill();
    }
    aros.forEach(function (a) { poligono(hexPts(RP * a[0])); g.fillStyle = a[1]; g.fill(); });
    g.strokeStyle = "rgba(40,30,15,.35)"; g.lineWidth = 1;
    aros.slice(1).forEach(function (a) { poligono(hexPts(RP * a[0])); g.stroke(); });
    var bull = hexPts(BULL / 2, .01);
    poligono(bull); g.fillStyle = pontariaLigada ? "#b5493f" : "#8d8c88"; g.fill();
    g.strokeStyle = "#d8cdb0"; g.lineWidth = 2; g.stroke();
    var c = proj([0, 0, .01]);
    g.fillStyle = "#f4ecd8"; g.globalAlpha = pontariaLigada ? 1 : .55; g.font = "700 " + Math.round(W * .055) + "px " + MONO; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("2x", c[0], c[1] + 1); g.globalAlpha = 1;
  }
  function desenharFrente() {   // aro da frente por cima dos dados (eles somem um pouco atrás dele)
    var topo = hexPts(RP, ALT_PAREDE), base = hexPts(RP, 0);
    for (var k = 0; k < 6; k++) {
      var k2 = (k + 1) % 6, my = (Math.sin(k * Math.PI / 3) + Math.sin(k2 * Math.PI / 3)) / 2;
      if (my >= .5) continue;
      poligono([base[k], base[k2], topo[k2], topo[k]]); g.fillStyle = my < -.5 ? "#7a6340" : "#6b5636"; g.fill();
      g.beginPath(); g.moveTo(topo[k][0], topo[k][1]); g.lineTo(topo[k2][0], topo[k2][1]); g.strokeStyle = "#a88a55"; g.lineWidth = 2; g.stroke();
    }
  }
  // Textura de papel antigo (pintinhas, fibras e manchas), aplicada deitada em cada face.
  var PAPEL = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 7; i++) {   // manchas de envelhecido
      var mx = Math.random() * 128, my = Math.random() * 128, mr = 14 + Math.random() * 30, gm = x.createRadialGradient(mx, my, 0, mx, my, mr);
      gm.addColorStop(0, "rgba(176, 132, 70, .16)"); gm.addColorStop(1, "rgba(176, 132, 70, 0)"); x.fillStyle = gm; x.fillRect(0, 0, 128, 128);
    }
    for (var j = 0; j < 260; j++) { x.fillStyle = "rgba(110, 72, 30, " + (.05 + Math.random() * .18).toFixed(2) + ")"; x.fillRect(Math.random() * 128, Math.random() * 128, Math.random() < .85 ? 1 : 2, 1); }
    x.lineWidth = .6;
    for (var k = 0; k < 26; k++) {   // fibras
      var fx0 = Math.random() * 128, fy0 = Math.random() * 128, fa = Math.random() * Math.PI;
      x.strokeStyle = "rgba(120, 82, 40, " + (.06 + Math.random() * .1).toFixed(2) + ")";
      x.beginPath(); x.moveTo(fx0, fy0); x.quadraticCurveTo(fx0 + Math.cos(fa) * 6 + 3, fy0 + Math.sin(fa) * 6 - 2, fx0 + Math.cos(fa) * 12, fy0 + Math.sin(fa) * 12); x.stroke();
    }
    return c;
  })(), padraoPapel = null;
  function texturaNaFace(pts, fc, vw, fs) {
    padraoPapel = padraoPapel || g.createPattern(PAPEL, "repeat");
    var u = norm(sub(vw[fs[0]], fc.cw)), v = cross(fc.nw, u), c0 = proj(fc.cw), cu = proj(add(fc.cw, mul(u, .5))), cv2 = proj(add(fc.cw, mul(v, .5)));
    var a = (cu[0] - c0[0]) / 64, b2 = (cu[1] - c0[1]) / 64, c = (cv2[0] - c0[0]) / 64, d = (cv2[1] - c0[1]) / 64;
    if (Math.abs(a * d - b2 * c) < 1e-6) return;
    g.save(); poligono(pts); g.clip();
    g.setTransform(a * dpr, b2 * dpr, c * dpr, d * dpr, c0[0] * dpr, c0[1] * dpr);
    g.globalCompositeOperation = "multiply"; g.fillStyle = padraoPapel; g.fillRect(-128, -128, 256, 256);
    g.restore();
  }
  function desenharDado(b, est, ouro) {
    var f = b.f, s = 1;
    // sombra no fundo
    var sp = proj([est.p[0] + .35, est.p[1] + .25, 0]), alt = Math.max(0, est.p[2] - 1);
    g.fillStyle = "rgba(10, 8, 4, " + (.32 / (1 + alt * .35)).toFixed(3) + ")";
    g.beginPath(); g.ellipse(sp[0], sp[1], W * .042 * (1 + alt * .08), W * .028 * (1 + alt * .08), 0, 0, Math.PI * 2); g.fill();
    var vw = f.vs.map(function (v) { return add(est.p, qrot(est.q, mul(v, s))); }), vp = vw.map(proj);
    var faces = [];
    f.fs.forEach(function (fs, i) {
      var nw = qrot(est.q, f.ns[i]), cw = [0, 0, 0]; fs.forEach(function (k) { cw = add(cw, vw[k]); }); cw = mul(cw, 1 / fs.length);
      if (dot(nw, sub(CAM, cw)) <= 0) return;
      faces.push({ i: i, nw: nw, cw: cw, prof: dot(sub(cw, CAM), F) });
    });
    faces.sort(function (a, b) { return b.prof - a.prof; });
    faces.forEach(function (fc) {
      var fs = f.fs[fc.i], l = Math.max(0, dot(fc.nw, LUZ)), luz = .64 + .36 * l;
      var meio = norm(add(LUZ, norm(sub(CAM, fc.cw)))), brilho = Math.pow(Math.max(0, dot(fc.nw, meio)), 10) * .1;   // papel: brilho bem fosco
      var pts = fs.map(function (k) { return vp[k]; }), cp = proj(fc.cw);
      poligono(pts);
      var rr = Math.round(Math.min(255, 246 * luz + 255 * brilho)), gg = Math.round(Math.min(255, 232 * luz + 245 * brilho)), bb2 = Math.round(Math.min(255, 196 * luz + 210 * brilho));   // baunilha
      var raioF = 0; pts.forEach(function (q) { raioF = Math.max(raioF, Math.hypot(q[0] - cp[0], q[1] - cp[1])); });
      var gr = g.createRadialGradient(cp[0], cp[1], raioF * .1, cp[0], cp[1], raioF * 1.05);
      gr.addColorStop(0, "rgb(" + rr + "," + gg + "," + bb2 + ")");
      gr.addColorStop(1, "rgb(" + Math.round(rr * .86) + "," + Math.round(gg * .8) + "," + Math.round(bb2 * .7) + ")");   // bordas amareladas, como papel velho
      g.fillStyle = gr; g.fill();
      texturaNaFace(pts, fc, vw, fs);
      poligono(pts); g.strokeStyle = "rgba(118, 80, 40, .8)"; g.lineWidth = 1.3; g.lineJoin = "round"; g.stroke();
      // número dourado, deitado na face (afim local da projeção)
      if (b.lados === 4) {
        fs.forEach(function (k) { numero(b, fc, vw[k], b.rotulos[k], .42, luz, ouro); });
      } else numero(b, fc, null, b.rotulos[fc.i], b.lados === 6 ? .62 : b.lados === 20 ? .5 : b.lados === 8 ? .55 : .58, luz, ouro);
    });
  }
  function numero(b, fc, canto, valor, tam, luz, ouro) {
    var fs = b.f.fs[fc.i], c = fc.cw, n = fc.nw, ref, vw0 = qrot(b.estAtual.q, b.f.vs[fs[0]]);
    var ponto = c;
    if (canto) { var dir = sub(canto, c); ponto = add(c, mul(dir, .55)); ref = norm(dir); }
    else ref = norm(sub(add(b.estAtual.p, vw0), c));
    var ex = norm(cross(ref, n)), ey = mul(ref, -1), e = tam * (b.lados === 4 ? .9 : 1);
    var p0 = proj(ponto), px = proj(add(ponto, mul(ex, e))), py = proj(add(ponto, mul(ey, e)));
    var a = (px[0] - p0[0]), bb = (px[1] - p0[1]), cc = (py[0] - p0[0]), d = (py[1] - p0[1]);
    if (Math.abs(a * d - bb * cc) < 1e-3) return;
    g.save();
    g.setTransform(a * dpr / 100, bb * dpr / 100, cc * dpr / 100, d * dpr / 100, p0[0] * dpr, p0[1] * dpr);
    var txt = String(valor), sub6 = (txt === "6" || txt === "9") && b.lados > 6;
    g.font = "600 " + (txt.length > 1 ? 72 : 98) + "px " + MONO; g.textAlign = "center"; g.textBaseline = "middle";
    // número marrom-terra, gravado no papel: luz clara embaixo, tinta escura por cima
    g.fillStyle = "rgba(255, 246, 220, .55)"; g.fillText(txt, 1.5, 9);
    var dg = g.createLinearGradient(0, -40, 0, 50);
    dg.addColorStop(0, "#7C4E26"); dg.addColorStop(1, "#4E2C12");
    g.fillStyle = ouro || dg; g.fillText(txt, 0, 6);
    if (sub6) { g.fillStyle = "#5A3418"; g.fillRect(-24, 48, 48, 8); }
    g.restore();
  }
  var ultimoQuadro = null, rolagem = null, quadroAtual = 0;
  // Rastro de velocidade: um risco claro e afinado pelos últimos quadros, enquanto o dado está rápido.
  function desenharRastros(idx) {
    if (!rolagem || idx < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    rolagem.corpos.forEach(function (b, i) {
      var pts = [];
      for (var k = 0; k <= 10; k++) { var qd = rolagem.quadros[idx - k]; if (!qd) break; pts.push(proj(qd[i].p)); }
      if (pts.length < 3) return;
      var vel = Math.hypot(pts[0][0] - pts[2][0], pts[0][1] - pts[2][1]) / 2;
      if (vel < W * .005) return;
      var forca = Math.min(1, (vel - W * .005) / (W * .015)), larg = FOCO * 1.5 / pts[0][2];   // mais largo quando o dado está mais alto
      g.lineCap = "round"; g.lineJoin = "round";
      for (var k2 = 1; k2 < pts.length; k2++) {
        var t = 1 - k2 / pts.length;
        g.strokeStyle = "rgba(255, 236, 190, " + (.5 * t * forca).toFixed(3) + ")"; g.lineWidth = larg * t;
        g.beginPath(); g.moveTo(pts[k2 - 1][0], pts[k2 - 1][1]); g.lineTo(pts[k2][0], pts[k2][1]); g.stroke();
        g.strokeStyle = "rgba(255, 200, 70, " + (.75 * t * forca).toFixed(3) + ")"; g.lineWidth = Math.max(1, larg * .22 * t);
        g.stroke();
      }
      g.lineCap = "butt";
    });
  }
  function desenharQuadro(q) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    desenharPrato();
    if (q && rolagem) desenharRastros(quadroAtual);
    if (q && rolagem) {
      var ordem = rolagem.corpos.map(function (b, i) { return i; }).sort(function (a, b) { return dot(sub(q[b].p, CAM), F) - dot(sub(q[a].p, CAM), F); });
      ordem.forEach(function (i) { var b = rolagem.corpos[i]; b.estAtual = q[i]; desenharDado(b, q[i]); });
      // 2× em quem parou no marcador (só com pontaria)
      if (rolagem.acabou && pontariaLigada) rolagem.corpos.forEach(function (b, i) {
        if (!b.noAlvo) return; var pp = proj(add(q[i].p, [0, 0, 1.4]));
        g.fillStyle = "#b5493f"; g.beginPath(); g.arc(pp[0] + W * .03, pp[1] - W * .02, W * .022, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f4ecd8"; g.font = "700 " + Math.round(W * .026) + "px " + MONO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("2×", pp[0] + W * .03, pp[1] - W * .018);
      });
    }
    desenharFrente();
  }

  /* ================= Som (sintetizado, como o prato atual) ================= */
  var ac = null;
  function clack(vol) {
    if (!somOk() || !audio()) return;
    var n = Math.floor(ac.sampleRate * .045), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
    s.buffer = buf; fl.type = "bandpass"; fl.frequency.value = 1800 + Math.random() * 900; gn.gain.value = .25 + vol * .55;
    s.connect(fl); fl.connect(gn); gn.connect(ac.destination); s.start();
  }

  /* ================= Partículas douradas que formam a soma ================= */
  // No site, as partículas e a soma ficam numa camada por cima do próprio prato (mesmo tamanho do canvas dos dados).
  var fx = null, gx = null, fxW = 0, fxH = 0, fxDpr = 1;
  function ajustarFx() { fxDpr = dpr; fxW = W; fxH = H; fx.width = fxW * fxDpr; fx.height = fxH * fxDpr; }
  function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { ac = null; } return ac; }
  // "BAM" épico (20 natural ou dado no 2x): bumbo grave saturado + estalo + chiado de prato, com eco curto.
  function bamEpico() {
    if (!somOk() || !audio()) return;
    var t = ac.currentTime, mestre = ac.createGain(), sat = ac.createWaveShaper(), curva = new Float32Array(1024);
    for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; curva[i] = Math.tanh(x * 2.4); }
    sat.curve = curva; mestre.gain.value = .8; sat.connect(mestre); mestre.connect(ac.destination);
    var eco = ac.createDelay(), ecoG = ac.createGain(); eco.delayTime.value = .11; ecoG.gain.value = .25;
    mestre.connect(eco); eco.connect(ecoG); ecoG.connect(ac.destination); ecoG.connect(eco);
    [[170, 38, .9, .75], [85, 30, .7, 1.1]].forEach(function (c) {
      var o = ac.createOscillator(), og = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(c[0], t); o.frequency.exponentialRampToValueAtTime(c[1], t + .5);
      og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(c[2], t + .008); og.gain.exponentialRampToValueAtTime(.001, t + c[3]);
      o.connect(og); og.connect(sat); o.start(t); o.stop(t + c[3] + .05);
    });
    ruido(t, .3, "lowpass", 1400, .6, 5, mestre); ruido(t, 1.4, "highpass", 5000, .18, 2.5, mestre);
    sino(t, [784, 1175, 1568], .08, .9);
  }
  // Fecho normal: um "dum" macio e um sino curto, sem exagero.
  function bamSuave() {
    if (!somOk() || !audio()) return;
    var t = ac.currentTime, o = ac.createOscillator(), og = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(95, t + .3);
    og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.32, t + .012); og.gain.exponentialRampToValueAtTime(.001, t + .4);
    o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + .42);
    sino(t + .01, [659, 988], .05, .55);
  }
  function ruido(t, dur, tipo, freq, vol, queda, destino) {
    var n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, queda);
    var src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g2 = ac.createGain();
    src.buffer = buf; fl.type = tipo; fl.frequency.value = freq; g2.gain.value = vol;
    src.connect(fl); fl.connect(g2); g2.connect(destino || ac.destination); src.start(t);
  }
  function sino(t, freqs, vol, dur) {
    freqs.forEach(function (f, k) {
      var s2 = ac.createOscillator(), sg = ac.createGain(), tk = t + k * .03;
      s2.type = "sine"; s2.frequency.value = f;
      sg.gain.setValueAtTime(.0001, tk); sg.gain.exponentialRampToValueAtTime(vol, tk + .01); sg.gain.exponentialRampToValueAtTime(.001, tk + dur);
      s2.connect(sg); sg.connect(ac.destination); s2.start(tk); s2.stop(tk + dur + .02);
    });
  }
  /* Som de "essência escorrendo" enquanto as partículas vão ao centro: um sopro filtrado que sobe devagar, um tom suave
     com leve ondulação e gotinhas líquidas espaçadas. Tudo com entrada e saída em rampa, sem estalos. */
  function essencia(dur) {
    if (!somOk() || !audio()) return;
    var t = ac.currentTime, fim = t + dur / 1000, mestre = ac.createGain();
    mestre.gain.setValueAtTime(.0001, t); mestre.gain.exponentialRampToValueAtTime(1, t + .18);
    mestre.gain.setValueAtTime(1, Math.max(t + .2, fim - .12)); mestre.gain.exponentialRampToValueAtTime(.0001, fim + .25);
    mestre.connect(ac.destination);
    // sopro: ruído suave passando por um filtro que "sobe" junto com o número
    var n = Math.floor(ac.sampleRate * 2), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0), ult = 0;
    for (var i = 0; i < n; i++) { ult = ult * .97 + (Math.random() * 2 - 1) * .03; d[i] = ult * 3; }   // ruído marrom (macio)
    var src = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
    src.buffer = buf; src.loop = true; bp.type = "bandpass"; bp.Q.value = 3;
    bp.frequency.setValueAtTime(320, t); bp.frequency.exponentialRampToValueAtTime(1500, fim);
    ng.gain.value = .5; src.connect(bp); bp.connect(ng); ng.connect(mestre); src.start(t); src.stop(fim + .3);
    // tom: senoide que desliza para cima, com ondulação lenta (vibrato)
    var o = ac.createOscillator(), og = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(620, fim);
    lfo.frequency.value = 5.5; lg.gain.value = 7; lfo.connect(lg); lg.connect(o.frequency);
    og.gain.value = .045; o.connect(og); og.connect(mestre); o.start(t); lfo.start(t); o.stop(fim + .3); lfo.stop(fim + .3);
    // gotinhas: "plic" líquido (tom que sobe rápido), cada vez mais juntas perto do fim
    var tg = t + .08;
    while (tg < fim - .05) {
      var u = (tg - t) / (fim - t), f0 = 380 + 500 * u + Math.random() * 120;
      var go = ac.createOscillator(), gg = ac.createGain();
      go.type = "sine"; go.frequency.setValueAtTime(f0, tg); go.frequency.exponentialRampToValueAtTime(f0 * 2.1, tg + .06);
      gg.gain.setValueAtTime(.0001, tg); gg.gain.exponentialRampToValueAtTime(.035, tg + .012); gg.gain.exponentialRampToValueAtTime(.0001, tg + .09);
      go.connect(gg); gg.connect(mestre); go.start(tg); go.stop(tg + .1);
      tg += .16 - .1 * u + Math.random() * .05;
    }
  }
  function tremer(el, ms, forca) {
    var t0 = performance.now();
    (function q(agora) {
      var k = (agora - t0) / ms; if (k >= 1) { el.style.transform = ""; return; }
      var a = forca * Math.pow(1 - k, 2);
      el.style.transform = "translate(" + ((Math.random() - .5) * 2 * a).toFixed(1) + "px," + ((Math.random() - .5) * 2 * a).toFixed(1) + "px)";
      requestAnimationFrame(q);
    })(t0);
  }
  /* A soma no centro: assim que os dados param, aparece um 0 (ou a soma das rodadas anteriores). Cada dado solta uma
     rajada contínua de partículas douradas direto para o número, que sobe devagar no começo e cada vez mais rápido
     perto do resultado. No fim, um destaque controlado; o "BAM" completo (tremida, clarão, ondas e faíscas) fica
     para o 20 natural no d20 e para dado que cai no 2x. */
  function contarNoCentro(origens, valores, base, centro, alturaPx, epico, pronto) {
    var reduz = matchMedia("(prefers-reduced-motion: reduce)").matches, total = base + valores.reduce(function (a, b) { return a + b; }, 0);
    if (pulando) { gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, fx.width, fx.height); if (pronto) pronto(); return; }
    var POR_DADO = valores.length === 1 ? 40 : 26, ps = [], t0 = performance.now(), fim = 0, faiscas = [];
    var ESPACO = 170, EMITE = valores.length === 1 ? 650 : 300, VOO = 380, chegada = 0;
    valores.forEach(function (v, d) {
      var o = origens[d], perto = Math.hypot(o[0] - centro[0], o[1] - centro[1]) < alturaPx * .7;   // dado colado no centro: as partículas dão uma volta
      for (var k = 0; k < POR_DADO; k++) {
        var ang = Math.random() * Math.PI * 2, raio = Math.random() * alturaPx * .18, sx = o[0] + (Math.random() - .5) * 14, sy = o[1] + (Math.random() - .5) * 14;
        if (perto) { var aa = Math.random() * Math.PI * 2; sx = centro[0] + Math.cos(aa) * alturaPx; sy = centro[1] + Math.sin(aa) * alturaPx * .8; }
        var p = { x0: sx, y0: sy, tx: centro[0] + Math.cos(ang) * raio, ty: centro[1] + Math.sin(ang) * raio * .6,
          curva: (Math.random() - .5) * 90, nasce: d * ESPACO + k * (EMITE / POR_DADO), voo: VOO * (.8 + Math.random() * .4), r: 1.6 + Math.random() * 2.2, foi: false };
        chegada = Math.max(chegada, p.nasce + p.voo); ps.push(p);
      }
    });
    chegada = Math.max(chegada, 1000);
    essencia(chegada);
    function numeroCentro(txt, escala, alfa, brilho) {   // traço fino, contorno discreto e um brilho leve
      gx.save(); gx.translate(centro[0], centro[1]); gx.scale(escala, escala); gx.globalAlpha = alfa;
      gx.font = "500 " + Math.round(alturaPx * .74) + "px " + MONO; gx.textAlign = "center"; gx.textBaseline = "middle";
      var y = alturaPx * .04;
      gx.shadowColor = "rgba(20, 10, 0, .45)"; gx.shadowBlur = 6; gx.shadowOffsetY = 2;
      gx.lineJoin = "round"; gx.lineWidth = Math.max(1.5, alturaPx * .025); gx.strokeStyle = "rgba(70, 38, 6, .75)"; gx.strokeText(txt, 0, y);
      gx.shadowColor = "rgba(255, 190, 70, " + (.25 + .45 * brilho).toFixed(2) + ")"; gx.shadowBlur = 4 + 14 * brilho; gx.shadowOffsetY = 0;
      var dg = gx.createLinearGradient(0, -alturaPx * .4, 0, alturaPx * .42);
      dg.addColorStop(0, "#FFF4CC"); dg.addColorStop(.55, "#F6C75A"); dg.addColorStop(1, "#D9952A");
      gx.fillStyle = dg; gx.fillText(txt, 0, y);
      gx.restore();
    }
    function fechar() {
      if (epico) {
        bamEpico(); if (!reduz) tremer(cv.parentElement, 480, alturaPx * .09);
        for (var k = 0; k < (reduz ? 0 : 70); k++) faiscas.push({ a: Math.random() * Math.PI * 2, v: alturaPx * (.8 + Math.random() * 1.5), r: 1.2 + Math.random() * 2.6, vida: 380 + Math.random() * 420 });
      } else bamSuave();
    }
    (function quadro(agora) {
      var t = agora - t0;
      gx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); gx.clearRect(0, 0, fxW, fxH);
      if (pulando) { if (pronto) pronto(); return; }   // fecharam o prato no meio: termina na hora
      gx.globalCompositeOperation = "lighter";
      ps.forEach(function (p) {
        if (p.foi || t < p.nasce) return;
        var u = Math.min(1, (t - p.nasce) / p.voo), e = u * u * (1.6 - .6 * u);
        var mx = (p.x0 + p.tx) / 2 - (p.ty - p.y0) * p.curva / 400, my = (p.y0 + p.ty) / 2 + (p.tx - p.x0) * p.curva / 400;
        var x = (1 - e) * (1 - e) * p.x0 + 2 * (1 - e) * e * mx + e * e * p.tx, y = (1 - e) * (1 - e) * p.y0 + 2 * (1 - e) * e * my + e * e * p.ty;
        var ue = Math.max(0, u - .08), eb = ue * ue * (1.6 - .6 * ue);
        var xb = (1 - eb) * (1 - eb) * p.x0 + 2 * (1 - eb) * eb * mx + eb * eb * p.tx, yb = (1 - eb) * (1 - eb) * p.y0 + 2 * (1 - eb) * eb * my + eb * eb * p.ty;
        gx.strokeStyle = "rgba(255, 200, 80, .5)"; gx.lineWidth = p.r * 1.4; gx.lineCap = "round";
        gx.beginPath(); gx.moveTo(xb, yb); gx.lineTo(x, y); gx.stroke();
        gx.fillStyle = "rgba(255, 236, 170, .95)"; gx.beginPath(); gx.arc(x, y, p.r * .8, 0, Math.PI * 2); gx.fill();
        if (u >= 1) p.foi = true;
      });
      gx.globalCompositeOperation = "source-over";
      if (t < chegada) {
        // devagar no começo, cada vez mais rápido perto do resultado (curva cúbica)
        var u = t / chegada, f = u * u * u, n = Math.min(total - 1, Math.floor(base + (total - base) * f));
        numeroCentro(String(Math.max(base, n)), .78 + .22 * f, Math.min(1, t / 120), f * .4);
        requestAnimationFrame(quadro);
        return;
      }
      if (!fim) { fim = agora; fechar(); }
      var ms = agora - fim, dur = epico ? 1500 : 1100, k = ms / dur;
      if (epico) {
        if (ms < 220) {   // clarão
          var cl = gx.createRadialGradient(centro[0], centro[1], 0, centro[0], centro[1], alturaPx * 2.6);
          cl.addColorStop(0, "rgba(255, 245, 210, " + (.85 * (1 - ms / 220)).toFixed(3) + ")"); cl.addColorStop(1, "rgba(255, 200, 80, 0)");
          gx.fillStyle = cl; gx.fillRect(centro[0] - alturaPx * 3, centro[1] - alturaPx * 3, alturaPx * 6, alturaPx * 6);
        }
        [0, 90, 190].forEach(function (atraso, i) {   // ondas de choque
          var m = (ms - atraso) / 520; if (m < 0 || m > 1) return;
          var raio = alturaPx * (.4 + m * (1.1 + i * .3));
          gx.strokeStyle = i ? "rgba(255, 214, 110, " + (.8 * (1 - m)).toFixed(3) + ")" : "rgba(255, 250, 230, " + (1 - m).toFixed(3) + ")";
          gx.lineWidth = (i ? 5 : 10) * (1 - m) + 1;
          gx.beginPath(); gx.ellipse(centro[0], centro[1], raio, raio * .82, 0, 0, Math.PI * 2); gx.stroke();
        });
        gx.globalCompositeOperation = "lighter"; gx.lineCap = "round";
        faiscas.forEach(function (fz) {
          var m = ms / fz.vida; if (m >= 1) return;
          var d = fz.v * (1 - Math.pow(1 - m, 3)), d2 = fz.v * (1 - Math.pow(1 - Math.max(0, m - .12), 3)), cx = Math.cos(fz.a), sy = Math.sin(fz.a) * .82;
          gx.strokeStyle = "rgba(255, " + Math.round(190 + 60 * (1 - m)) + ", 90, " + (1 - m).toFixed(3) + ")"; gx.lineWidth = fz.r * (1 - m * .6);
          gx.beginPath(); gx.moveTo(centro[0] + cx * d2, centro[1] + sy * d2); gx.lineTo(centro[0] + cx * d, centro[1] + sy * d); gx.stroke();
        });
        gx.globalCompositeOperation = "source-over";
      } else if (ms < 380) {   // destaque normal: um anel fino e discreto
        var m2 = ms / 380, r2 = alturaPx * (.5 + m2 * .9);
        gx.strokeStyle = "rgba(255, 220, 130, " + (.55 * (1 - m2)).toFixed(3) + ")"; gx.lineWidth = 3 * (1 - m2) + .5;
        gx.beginPath(); gx.ellipse(centro[0], centro[1], r2, r2 * .82, 0, 0, Math.PI * 2); gx.stroke();
      }
      var pop = epico ? 1 + .5 * Math.exp(-ms / 130) * Math.cos(ms / 55) : 1 + .12 * Math.exp(-ms / 110) * Math.cos(ms / 70);
      var alfa = k < .75 ? 1 : Math.max(0, 1 - (k - .75) / .25);
      numeroCentro(String(total), pop * (epico ? 1.08 : 1), alfa, Math.max(0, 1 - ms / (epico ? 600 : 350)) * (epico ? 1 : .5));
      if (k < 1) requestAnimationFrame(quadro);
      else { gx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0); gx.clearRect(0, 0, fxW, fxH); if (pronto) pronto(); }
    })(t0);
  }


  /* ================= Ligação com o js/prato.js ================= */
  // O d3 rola como um dado de 6 lados com os números 1, 2 e 3 (cada um em duas faces opostas).
  var ROT_D3 = (function () {
    var f = FORMAS[6], usado = [], rot = [], n = 1;
    f.fs.forEach(function (fs, i) {
      if (usado[i]) return;
      var ni = f.ns[i], op = 0, melhor = 9;
      f.ns.forEach(function (nj, j) { var d = dot(ni, nj); if (j !== i && d < melhor) { melhor = d; op = j; } });
      rot[i] = rot[op] = n++; usado[i] = usado[op] = true;
    });
    return rot;
  })();
  // O d100 rola como dois d10, como na mesa: um das dezenas (00, 10 … 90) e um das unidades (0 … 9). 00 + 0 = 100.
  var ROT_DEZ = ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"], ROT_UNI = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  // Cada dado lógico vira um ou mais corpos; "parte" é quanto aquele corpo soma do valor do dado.
  function corposDe(d, dono) {
    if (d.lados === 3) return [{ lados: 6, valor: d.valor, rotulos: ROT_D3, dono: dono, parte: d.valor }];
    if (d.lados === 100) {
      var uni = d.valor % 10, dez = Math.floor((d.valor % 100) / 10);
      return [{ lados: 10, valor: ROT_DEZ[dez], rotulos: ROT_DEZ, dono: dono, parte: d.valor - uni },
              { lados: 10, valor: ROT_UNI[uni], rotulos: ROT_UNI, dono: dono, parte: uni }];
    }
    return [{ lados: d.lados, valor: d.valor, dono: dono, parte: d.valor }];
  }
  // Quantos corpos um dado ocupa no prato (o d100 ocupa dois). Usado pelo js/prato.js para montar as rodadas de 8.
  function peso(d) { return d.lados === 100 ? 2 : 1; }
  function suporta(dados) {
    return !!(dados && dados.length) && dados.every(function (d) { var v = d.base != null ? d.base : d.valor; return (FORMAS[d.lados] || d.lados === 3 || d.lados === 100) && v >= 1 && v <= d.lados && v === Math.floor(v); });
  }
  function montar(felt) {
    if (!cv || cv.parentNode !== felt) {
      cv = document.createElement("canvas"); cv.className = "prato3d__cv"; cv.setAttribute("aria-hidden", "true");
      fx = document.createElement("canvas"); fx.className = "prato3d__fx"; fx.setAttribute("aria-hidden", "true");
      felt.appendChild(cv); felt.appendChild(fx); g = cv.getContext("2d"); gx = fx.getContext("2d");
    }
    ajustar(); ajustarFx();
  }
  function lancar(lista, opc, pronto) {
    opc = opc || {};
    pontariaLigada = !!opc.pontaria; pulando = !!opc.pular;
    semente = 1 + Math.floor(Math.random() * 2147483000);
    var spec = []; lista.forEach(function (d, i) { spec = spec.concat(corposDe(d, i)); });
    rolagem = simular(spec); rolagem.spec = spec; rolagem.bases = lista.map(function (d) { return d.valor; }); rolagem.acabou = false; quadroAtual = 0;
    gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, fx.width, fx.height);
    var inicio = performance.now(), somI = 0, vel = opc.rapido ? 1.7 : 1, ult = rolagem.quadros.length - 1;
    function acabar() {
      quadroAtual = ult; ultimoQuadro = rolagem.quadros[ult]; rolagem.acabou = true; desenharQuadro(ultimoQuadro);
      var x2 = lista.map(function () { return false; });   // um d100 dobra se qualquer um dos dois d10 cair no 2x
      rolagem.corpos.forEach(function (b, k) { if (pontariaLigada && b.noAlvo) x2[spec[k].dono] = true; });
      pronto(x2);
    }
    if (pulando) return acabar();
    (function quadro(agora) {
      if (pulando) return acabar();
      var alvo = Math.min(ult, Math.floor((agora - inicio) * vel / (1000 / 60)));
      while (somI < rolagem.sons.length && rolagem.sons[somI][0] <= alvo) { clack(rolagem.sons[somI][1]); somI++; }
      quadroAtual = alvo; ultimoQuadro = rolagem.quadros[alvo]; desenharQuadro(ultimoQuadro);
      if (alvo < ult) requestAnimationFrame(quadro); else acabar();
    })(inicio);
  }
  function contar(valores, base, epico, pronto) {
    var origens = rolagem.corpos.map(function (b, i) { var p = proj(ultimoQuadro[i].p); return [p[0], p[1]]; });
    var c = proj([0, 0, 0]), sp = rolagem.spec, bs = rolagem.bases;
    var porCorpo = sp.map(function (e) { var v = valores[e.dono], b0 = bs[e.dono]; return b0 ? e.parte * v / b0 : 0; });   // já com o 2x
    contarNoCentro(origens, porCorpo, base, [c[0], c[1]], W * .34, epico, pronto);
  }
  addEventListener("resize", function () { if (cv && cv.isConnected && cv.offsetWidth) { ajustar(); ajustarFx(); } });
  return { suporta: suporta, montar: montar, lancar: lancar, contar: contar,
    peso: peso, pular: function () { pulando = true; }, som: function (fn) { somOk = fn; } };
})();
