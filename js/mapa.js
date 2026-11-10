// Dragon Ball Omega — editor de mapas (Campanha > Mapas, só o mestre)
// Tela cheia com uma grade. Cada bloco da grade pode ser: espaço (chão), parede ou terra (rastro de explosão).
// Layers (andares): o mapa tem andares empilhados. 1 = chão, 0 = embaixo, 2 = em cima (o mestre cria mais:
//   um abaixo do menor ou um acima do maior). O mestre desenha e vê um layer de cada vez (botão com o número);
//   os de cima ficam escondidos. O jogador vê a partir do layer do próprio token: o que está acima dele aparece
//   mais claro; o que está abaixo, mais escuro. Tokens em outro layer têm uma seta (para cima / para baixo).
// Relevo (antes da caneta): o que o espaço desenhado é — normal · água (submergir / emergir) ·
//   escada de mão / degraus (quem está nela clica no token e escolhe "Escalar" para subir um layer).
// Clicar num token (sem arrastar) abre as ações dele: voar (escolhe o layer, nunca para baixo), pousar,
//   escalar / descer a escada, submergir / emergir. Voando passa por cima das paredes e pode pousar em cima delas.
// Explosão: o bloco some no layer em que se está e em todos os de cima (a coluna inteira cai).
// Paredes finas: todo bloco desenhado já tem parede em volta (a borda com o vazio); blocos vizinhos se juntam. A caneta →
//   Parede põe paredes finas nas beiradas dos blocos (casas, cômodos); quadrado/círculo "com paredes" fazem o contorno.
// Névoa (barrinha de cima, mestre): escolhe blocos (vermelhos) e confirma. Dentro, só se vê (CON × 0,5) + 1 blocos;
//   de fora, não se vê quem está dentro. Texto (barrinha de cima): etiqueta (balão num bloco) ou texto corrido.
// Tela cheia (canto de baixo): na Sessão o site todo vira o mapa, com a ficha e o log flutuando dos lados.
// Sombras (engrenagem do mestre; valem na Sessão): cada jogador só vê o que o próprio token enxerga — paredes e
//   andares tapam a visão, de cima se vê até 4 layers para baixo, e tokens fora da visão somem. O mestre vê tudo,
//   com o que nenhum jogador vê meio apagado e um olho fechado nos tokens que nenhum jogador vê (NPC não conta).
// Modo caverna (engrenagem): tudo escuro; cada token enxerga N = 2 × (mod. de Concentração + 1) blocos (mínimo 2),
//   em círculo e sem atravessar paredes. Nas ações do token: tocha (círculo 1,5× maior) ou lanterna (cone de 2N;
//   um clique mira, arrastar a bolinha amarela gira).
// Olho (mestre na Sessão, ao lado da engrenagem): ver o mapa exatamente como um jogador ou NPC vê; os botões continuam.
// Escadas: vistas do andar de cima aparecem claras com uma setinha para baixo; as que sobem, com setinha para cima;
//   escadas juntas ganham um símbolo só (⇅ se o grupo sobe e desce).
// Tamanho (NPC, opts.tamanho): o token ocupa N×N blocos a partir do canto de cima, à esquerda (x, y);
// o pequeno (0,5) é desenhado menor, mas anda de bloco em bloco. Paredes e relevo valem para todos os blocos que ele ocupa.
// Ferramentas (barra de baixo; parar o mouse em cima por meio segundo abre as opções):
//   Caneta (espaço / parede) · Cor · Quadrado (vazio / com paredes em volta / só paredes) · Círculo (as mesmas)
//   Régua (blocos de distância) · Borracha (normal / quadrado inteiro / só a borda do quadrado)
//   Explosão (cone com ângulo / círculo / quadrado: a área vira terra) · Engrenagem (mostrar grade, cor da grade)
// Navegar: rodinha do mouse = zoom; arrastar com o botão direito, o do meio ou segurando Espaço = mover. Ctrl+Z desfaz.
// O mapa fica salvo neste navegador (localStorage "dbo-mapa"). Exportar gera JPG/PNG ou o arquivo .dbomapa;
// importar aceita uma imagem (com a grade por cima) ou um .dbomapa (o mapa volta inteiro, com paredes de verdade).
//
// Formato .dbomapa (texto JSON; dá para gerar por código ou editar à mão):
//   {
//     "formato": "dbo-mapa", "versao": 2,
//     "titulo": "Caverna",
//     "origem": [0, 0],                    // bloco do canto de cima, à esquerda, de todos os layers (opcional)
//     "grade": { "on": true, "cor": "rgba(120, 136, 160, 0.45)", "espessura": 1 },   // opcional (espessura em px)
//     "papel": "rgb(233, 237, 243)",       // opcional: cor do fundo vazio do mapa (sem ela, o fundo é transparente)
//     "legenda": {                         // um caractere por tipo de bloco; espaço em branco = vazio
//       ".": { "tipo": "espaco", "cor": "rgb(235, 225, 200)" },
//       "~": { "tipo": "espaco", "cor": "rgb(235, 225, 200)", "relevo": "agua" },   // relevo: agua, escada-mao, escada-degraus
//       "H": { "tipo": "espaco", "cor": "rgb(235, 225, 200)", "relevo": "escada-mao" },
//       "#": { "tipo": "parede", "cor": "rgb(235, 225, 200)" },     // a parede sai mais escura que a cor
//       "%": { "tipo": "terra" }
//     },
//     "faixa": [0, 2],                     // opcional: menor e maior layer (inclui layers ainda vazios)
//     "muros": ["3,2,1,v", "4,5,1,h"],     // opcional: paredes finas "x,y,layer,h|v" (borda de cima / da esquerda do bloco)
//     "nevoa": ["6,0", "6,1"],             // opcional: blocos com névoa
//     "textos": [{ "tipo": "etiqueta" | "corrido", "x": 2.5, "y": 1.5, "L": 1, "texto": "Baú trancado" }],   // opcional
//     "layers": [                          // cada layer com as próprias linhas; cada caractere é um bloco
//       { "layer": 1, "linhas": ["#####", "#.H.#", "#.%.#", "#####"] },
//       { "layer": 2, "linhas": ["", "  ..."] }
//     ],
//     "fundo": null                        // opcional: { "src": "data:image/...", "x", "y", "porCel" }
//   }
//   A versão 1 (só "linhas", um andar) ainda abre: relevo "alto" vira layer 2 e "baixo", layer 0.
//
// Na Sessão (DBOMapa.criar(caixa, { modo: "sessao", ... })) o mesmo mapa aparece dentro da caixa do centro:
//   - tem borda: o zoom para quando o mapa inteiro cabe na caixa e nada é desenhado nem andado fora dela;
//   - só o mestre põe tokens: arrasta jogadores e NPCs da lista da esquerda (js/combate.js chama arrastarPersonagem)
//     e tira um token soltando-o de volta nessa lista (opts.zonaTirar);
//   - o jogador só move o próprio personagem; o mestre tem todas as ferramentas do editor;
//   - clicar no número do zoom (mestre) limita a área de um jogador: escolhe o jogador e marca dois cantos;
//     para ele, esse retângulo vira o mapa inteiro (mapa.recortes[usuario_id] = { x0, y0, x1, y1 }).
window.DBOMapa = (function () {
  var CEL = 32;                       // tamanho de um bloco com zoom 100% (e na imagem exportada)
  var KEY = "dbo-mapa";
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function toast(t) { if (window.DBOUI && DBOUI.toast) DBOUI.toast(t); }
  var ultima = null;                  // última instância criada (para testes)

  /* ---------- Grade dentro de uma imagem (para importar) ---------- */
  function detectarGrade(img) {
    var max = 1400, esc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.max(1, Math.round(img.naturalWidth * esc)), h = Math.max(1, Math.round(img.naturalHeight * esc));
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    var g = cv.getContext("2d"); g.drawImage(img, 0, 0, w, h);
    var dados = g.getImageData(0, 0, w, h).data;
    var cinza = new Float32Array(w * h);
    for (var i = 0; i < w * h; i++) cinza[i] = (dados[i * 4] * .3 + dados[i * 4 + 1] * .59 + dados[i * 4 + 2] * .11) * (dados[i * 4 + 3] / 255);
    // perfil das bordas: quanto a imagem muda de uma coluna para a outra (e de uma linha para a outra)
    var px = new Float32Array(w), py = new Float32Array(h);
    for (var y = 0; y < h; y++) for (var x = 1; x < w; x++) px[x] += Math.abs(cinza[y * w + x] - cinza[y * w + x - 1]);
    for (y = 1; y < h; y++) for (x = 0; x < w; x++) py[y] += Math.abs(cinza[y * w + x] - cinza[(y - 1) * w + x]);
    function autocorr(p, L) {
      var n = p.length, m = 0; for (var k = 0; k < n; k++) m += p[k]; m /= n;
      var num = 0, den = 0;
      for (k = 0; k < n; k++) { var a = p[k] - m; den += a * a; if (k + L < n) num += a * (p[k + L] - m); }
      return den ? num / den : 0;
    }
    var minL = 10, maxL = Math.floor(Math.min(160, w / 3, h / 3)), melhor = null, notas = [];
    for (var L = minL; L <= maxL; L++) { var c = (autocorr(px, L) + autocorr(py, L)) / 2; notas.push([L, c]); if (!melhor || c > melhor[1]) melhor = [L, c]; }
    if (!melhor || melhor[1] < .22) return null;
    // a grade aparece também no dobro, triplo... fica com o menor período quase tão forte quanto o melhor
    var escolhido = melhor;
    for (i = 0; i < notas.length; i++) if (notas[i][1] >= melhor[1] * .82) { escolhido = notas[i]; break; }
    var P = escolhido[0];
    function fase(p) { var mf = 0, mv = -1; for (var f = 0; f < P; f++) { var s = 0; for (var k = f; k < p.length; k += P) s += p[k]; if (s > mv) { mv = s; mf = f; } } return mf; }
    // Grade de verdade = linhas finas e fortes: nas posições da grade o perfil fica bem acima do normal (nos dois eixos).
    function linhasFortes(p, f) {
      var media = 0; for (var k = 0; k < p.length; k++) media += p[k]; media /= p.length || 1;
      var fortes = 0, n = 0;
      for (k = f; k < p.length; k += P) { var v = Math.max(p[k], p[k - 1] || 0, p[k + 1] || 0); if (v > media * 1.8 && v > 4 * (p.length === w ? h : w) / 100) fortes++; n++; }
      return n >= 3 && fortes / n >= .7;   // quase toda posição da grade precisa ter uma linha
    }
    var fx = fase(px), fy = fase(py);
    if (!linhasFortes(px, fx) || !linhasFortes(py, fy)) return null;
    return { porCel: P / esc, offX: fx / esc, offY: fy / esc, nota: escolhido[1] };
  }
  /* ---------- Formato .dbomapa ---------- */
  // Versão 2: o mapa tem andares ("layers"). Cada layer tem as próprias linhas de texto, uma por linha do mapa,
  // todas a partir da mesma origem. Layer 1 = chão normal, 0 = lugar baixo, 2 = em cima (e assim por diante).
  // Relevo de um espaço: "agua", "escada-mao" (escada de mão) ou "escada-degraus" (degraus/rampa).
  // Versão 1 (sem layers) ainda abre: relevo "alto" vira layer 2 e "baixo" vira layer 0.
  var TIPOS = { espaco: 1, parede: 1, terra: 1 };
  var RELEVOS = { agua: 1, "escada-mao": 1, "escada-degraus": 1 };   // sem relevo = chão normal
  var PAPEL_PADRAO = "#E9EDF3";        // fundo vazio do mapa quando o mestre não escolheu cor (sai transparente no PNG)
  function espessura(v) { v = Math.round(Number(v) * 2) / 2; return v >= .5 && v <= 8 ? v : 1; }
  var COR_PADRAO = { espaco: "rgb(255, 255, 255)", parede: "rgb(255, 255, 255)", terra: "#7A5634" };
  var SIMBOLOS = ".#%" + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@&*+=-~^:;!?$<>()[]{}|/_,'`";
  // [x, y, tipo, cor, relevo?, layer?] → { x, y, t, c, r, L } (relevo antigo alto/baixo vira layer)
  function normalCel(c) {
    var r = c[4] || "", L = 1;
    if (r === "alto") { L = 2; r = ""; } else if (r === "baixo") { L = 0; r = ""; }
    if (c.length > 5 && c[5] !== "" && isFinite(+c[5])) L = Math.round(+c[5]);
    return { x: c[0], y: c[1], t: c[2], c: c[3], r: c[2] === "espaco" && RELEVOS[r] ? r : "", L: L };
  }
  // dados do editor ({ titulo, celulas: [[x, y, tipo, cor, relevo, layer]], cor, grade, fundo }) → texto do arquivo
  function paraArquivo(d) {
    var cels = (d.celulas || []).map(normalCel), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    cels.forEach(function (c) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); });
    var legenda = {}, porChave = {}, livres = SIMBOLOS.split("");
    // os mais comuns ganham os símbolos fáceis: . espaço, # parede, % terra, ~ água, H escada de mão, = degraus
    var preferido = { espaco: ".", parede: "#", terra: "%", agua: "~", "escada-mao": "H", "escada-degraus": "=" };
    var reservados = ".#%~H=";
    function simbolo(t, c, r) {
      var k = t + "|" + c + "|" + (r || "");
      if (porChave[k]) return porChave[k];
      var pref = preferido[r || t];
      var sim = pref && !legenda[pref] ? pref : livres.filter(function (x) { return !legenda[x] && reservados.indexOf(x) < 0; })[0];
      if (!sim) throw new Error("Esse mapa tem cores demais para o arquivo (" + SIMBOLOS.length + " no máximo).");
      legenda[sim] = t === "terra" ? { tipo: "terra" } : { tipo: t, cor: c };
      if (r) legenda[sim].relevo = r;
      return (porChave[k] = sim);
    }
    var porLayer = {};
    cels.forEach(function (c) { (porLayer[c.L] = porLayer[c.L] || {})[c.x + "," + c.y] = simbolo(c.t, c.t === "terra" ? "" : c.c, c.r); });
    var layers = Object.keys(porLayer).map(Number).sort(function (a, b) { return a - b; }).map(function (L) {
      var grade = porLayer[L], linhas = [];
      for (var y = y0; y <= y1; y++) {
        var lin = "";
        for (var x = x0; x <= x1; x++) lin += grade[x + "," + y] || " ";
        linhas.push(lin.replace(/\s+$/, ""));
      }
      while (linhas.length && !linhas[linhas.length - 1]) linhas.pop();
      return { layer: L, linhas: linhas };
    });
    var faixa = Array.isArray(d.layers) && d.layers.length === 2 ? [Math.round(+d.layers[0]) || 0, Math.round(+d.layers[1]) || 2] : null;
    var gr = d.grade ? { on: d.grade.on !== false, cor: d.grade.cor, espessura: espessura(d.grade.esp) } : null;
    var out = { formato: "dbo-mapa", versao: 2, titulo: d.titulo || "Mapa sem título", origem: isFinite(x0) ? [x0, y0] : [0, 0],
      grade: gr || { on: true, cor: "rgba(120, 136, 160, 0.45)", espessura: 1 }, papel: d.papel || null, legenda: legenda,
      faixa: faixa, sombras: !!d.sombras, caverna: !!d.caverna, muros: d.muros && d.muros.length ? d.muros : undefined,
      nevoa: d.nevoa && d.nevoa.length ? d.nevoa : undefined, textos: d.textos && d.textos.length ? d.textos : undefined, layers: layers, fundo: d.fundo || null };
    // uma linha do mapa por linha do arquivo: fica legível (e editável) num editor de texto
    var json = JSON.stringify(out, null, 2);
    var n = 0;
    return json.replace(/"linhas": \[[\s\S]*?\n      \]|"linhas": \[\]/g, function () {
      var l = layers[n++].linhas;
      return l.length ? '"linhas": [\n' + l.map(function (t) { return "        " + JSON.stringify(t); }).join(",\n") + "\n      ]" : '"linhas": []';
    });
  }
  // texto do arquivo → dados do editor. Também aceita o JSON que o editor guarda no navegador (com "celulas").
  function deArquivo(texto) {
    var d;
    try { d = JSON.parse(String(texto || "").replace(/^﻿/, "")); } catch (e) { throw new Error("Esse arquivo não é um mapa válido (o texto não é JSON)."); }
    if (!d || typeof d !== "object") throw new Error("Esse arquivo não é um mapa válido.");
    var cor = function (c, padrao) { return typeof c === "string" && c.length < 60 && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\))$/i.test(c.trim()) ? c.trim() : padrao; };
    var grade = d.grade && typeof d.grade === "object" ? { on: d.grade.on !== false, cor: cor(d.grade.cor, "rgba(120, 136, 160, 0.45)"), esp: espessura(d.grade.espessura != null ? d.grade.espessura : d.grade.esp) } : { on: true, cor: "rgba(120, 136, 160, 0.45)", esp: 1 };
    var papel = cor(d.papel, "") || null;
    var fundo = null;
    if (d.fundo && typeof d.fundo.src === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(d.fundo.src) && d.fundo.porCel > 0) {
      fundo = { src: d.fundo.src, x: Number(d.fundo.x) || 0, y: Number(d.fundo.y) || 0, porCel: Number(d.fundo.porCel) };
    }
    var titulo = String(d.titulo || "Mapa sem título").slice(0, 60);
    var celulas = [];
    var poe = function (x, y, t, c, r, L) { var q = normalCel([x, y, t, c, r || "", L]); celulas.push(q.r || q.L !== 1 ? [q.x, q.y, q.t, q.c, q.r, q.L] : [q.x, q.y, q.t, q.c]); };
    if (Array.isArray(d.celulas) && !d.linhas && !d.layers) {          // formato do navegador
      d.celulas.forEach(function (c) {
        if (!Array.isArray(c) || !TIPOS[c[2]]) return;
        poe(Math.round(c[0]) || 0, Math.round(c[1]) || 0, c[2], cor(c[3], COR_PADRAO[c[2]]), c[4], c.length > 5 ? c[5] : "");
      });
    } else {
      if (d.formato && d.formato !== "dbo-mapa") throw new Error("Esse arquivo não é um mapa do Dragon Ball Omega.");
      var andares = Array.isArray(d.layers) ? d.layers.filter(function (a) { return a && Array.isArray(a.linhas); }).map(function (a) { return { L: Math.round(+a.layer) || 0, linhas: a.linhas }; })
        : Array.isArray(d.linhas) ? [{ L: "", linhas: d.linhas }] : null;    // versão 1: um andar só (o relevo alto/baixo diz o layer)
      if (!andares) throw new Error("Esse arquivo de mapa não tem as linhas do mapa.");
      if (andares.length > 40) throw new Error("Esse mapa tem layers demais (40 no máximo).");
      var leg = {}, faltando = {};
      Object.keys(d.legenda || {}).forEach(function (k) {
        var v = d.legenda[k];
        if (k.length !== 1 || !v || !TIPOS[v.tipo]) return;
        var r = v.tipo === "espaco" && (RELEVOS[v.relevo] || v.relevo === "alto" || v.relevo === "baixo") ? v.relevo : "";
        leg[k] = { t: v.tipo, c: v.tipo === "terra" ? COR_PADRAO.terra : cor(v.cor, cor(d.cor, COR_PADRAO[v.tipo])), r: r };
      });
      var o = Array.isArray(d.origem) ? d.origem : [0, 0], ox = Math.round(o[0]) || 0, oy = Math.round(o[1]) || 0;
      andares.forEach(function (a) {
        if (a.linhas.length > 500 || a.linhas.some(function (l) { return typeof l !== "string" || l.length > 500; })) throw new Error("Esse mapa é grande demais (500 × 500 blocos no máximo).");
        a.linhas.forEach(function (lin, y) {
          for (var x = 0; x < lin.length; x++) {
            var ch = lin.charAt(x);
            if (ch === " ") continue;
            var v = leg[ch];
            if (!v) { faltando[ch] = true; continue; }
            poe(ox + x, oy + y, v.t, v.c, v.r, a.L);
          }
        });
      });
      var f = Object.keys(faltando);
      if (f.length) throw new Error("Esses caracteres do mapa não estão na legenda: " + f.slice(0, 8).join(" ") + ".");
    }
    if (!celulas.length && !fundo) throw new Error("Esse arquivo de mapa está vazio.");
    var corPrincipal = cor(d.cor, "");
    if (!corPrincipal) { var esp = celulas.filter(function (c) { return c[2] === "espaco"; })[0]; corPrincipal = esp ? esp[3] : "rgb(255, 255, 255)"; }
    var fx = Array.isArray(d.faixa) && d.faixa.length === 2 ? [Math.round(+d.faixa[0]) || 0, Math.round(+d.faixa[1]) || 2] : null;
    return { v: 2, titulo: titulo, celulas: celulas, cor: corPrincipal, grade: grade, papel: papel, fundo: fundo, layers: fx, sombras: d.sombras === true, caverna: d.caverna === true,
      muros: Array.isArray(d.muros) ? d.muros.filter(function (k) { return typeof k === "string"; }).slice(0, 20000) : [],
      nevoa: Array.isArray(d.nevoa) ? d.nevoa.filter(function (k) { return typeof k === "string"; }).slice(0, 20000) : [],
      textos: Array.isArray(d.textos) ? d.textos.slice(0, 500) : [] };
  }
  // Tudo o que não é imagem é tratado como arquivo de mapa e conferido pelo conteúdo (o nome pode ter virado
  // "mapa.dbomapa.txt" no download, e o celular às vezes não sabe o tipo do arquivo).
  function ehImagem(arquivo) { return /^image\//.test(arquivo.type || "") || /\.(png|jpe?g)$/i.test(arquivo.name || ""); }
  function ehArquivoDeMapa(arquivo) { return !!arquivo && !ehImagem(arquivo); }
  function lerTexto(arquivo) {
    return new Promise(function (ok, erro) {
      var rd = new FileReader();
      rd.onload = function () { ok(rd.result); };
      rd.onerror = function () { erro(new Error("Não consegui ler o arquivo.")); };
      rd.readAsText(arquivo);
    });
  }
  function baixar(nome, blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  function nomeDeArquivo(t) { return String(t || "mapa").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "mapa"; }

  function criar(container, opts) {
  opts = opts || {};
  var sessao = opts.modo === "sessao";
  var podeEditar = !sessao || !!opts.mestre;
  var globais = [];                   // ouvintes na janela/documento (saem no destruir)
  function ouvir(alvo, tipo, fn, o) { alvo.addEventListener(tipo, fn, o); globais.push([alvo, tipo, fn, o]); }

  /* ---------- Estado ---------- */
  var mapa = {
    titulo: "Mapa sem título",
    celulas: new Map(),               // "x,y,L" → { t: "espaco" | "parede" | "terra", c: cor }
    muros: new Map(),                 // "x,y,L,h|v" → true: paredes finas nas bordas dos blocos
    cor: "rgb(255, 255, 255)",        // uma cor só para tudo o que se desenha (espaço e parede; a parede sai mais escura)
    grade: { on: true, cor: "rgba(120, 136, 160, 0.45)", esp: 1 },   // esp = grossura das linhas em px
    papel: null,                      // cor do fundo vazio (null = padrão, transparente no PNG)
    fundo: null,                      // { src, x, y, porCel } imagem importada: x,y = canto em blocos; porCel = px da imagem por bloco
    nevoa: new Map(),                 // "x,y" → true: névoa (fog) posta pelo mestre
    textos: [],                       // [{ id, tipo: "etiqueta" | "corrido", x, y, L, texto }] (até 50 caracteres)
    tokens: [],                       // [{ id, x, y, cor, rot, personagem_id? }]
    limite: null                      // Sessão: { x0, y0, x1, y1 } borda do mapa em blocos (fora dela não se desenha nem se anda)
  };
  var vis = { zoom: 1, ox: 0, oy: 0 };   // origem do mundo na tela (px)
  // relevo: "" normal · "agua" · "escada-mao" · "escada-degraus" (vale para o espaço desenhado)
  // layer: em qual andar o mestre está desenhando (e vendo); os de cima ficam escondidos enquanto isso
  var ui = { ferramenta: "caneta", sub: { texto: "etiqueta", caneta: "espaco", quadrado: "vazio", circulo: "vazio", borracha: "borracha", explosao: "cone", regua: "linha" }, angulo: 60, anguloExp: 60, relevo: "", layer: 1 };

  /* ---------- Blocos em layers (andares empilhados) ----------
     mapa.celulas: "x,y,L" → { t, c, r? }   (L = layer; 0 baixo · 1 mediano/padrão · 2 cima; o mestre cria mais)
     colunas (cache): "x,y" → [{ L, v }] do layer mais baixo ao mais alto. */
  function chave(x, y) { return x + "," + y; }
  function chave3(x, y, L) { return x + "," + y + "," + L; }
  function partes(k) { var p = k.split(","); return { x: +p[0], y: +p[1], L: p.length > 2 ? +p[2] : 1 }; }
  var colunas = null;
  var versaoCel = 0;                  // muda a cada bloco mexido (a visão das sombras é refeita)
  function sujar() { colunas = null; versaoCel++; }
  function coluna(x, y) {
    if (!colunas) {
      colunas = new Map();
      mapa.celulas.forEach(function (v, k) { var p = partes(k), kk = chave(p.x, p.y), a = colunas.get(kk); if (!a) colunas.set(kk, a = []); a.push({ L: p.L, v: v }); });
      colunas.forEach(function (a) { a.sort(function (m, n) { return m.L - n.L; }); });
    }
    return colunas.get(chave(x, y)) || null;
  }
  function blocoEm(x, y, L) { return mapa.celulas.get(chave3(x, y, L)) || null; }
  // "m:x,y,L,h|v" = parede fina (muro) na borda de cima (h) ou da esquerda (v) do bloco x,y, no layer L.
  function celLer(k) { var c0 = k.charAt(0); return c0 === "m" ? (mapa.muros.has(k.slice(2)) || null) : c0 === "n" ? (mapa.nevoa.has(k.slice(2)) || null) : mapa.celulas.get(k) || null; }
  function celPor(k, v) {
    if (k.charAt(0) === "m") { if (v) mapa.muros.set(k.slice(2), true); else mapa.muros.delete(k.slice(2)); sujar(); return; }
    if (k.charAt(0) === "n") { if (v) mapa.nevoa.set(k.slice(2), true); else mapa.nevoa.delete(k.slice(2)); sujar(); return; }
    if (v) mapa.celulas.set(k, v); else mapa.celulas.delete(k); sujar();
  }
  /* ---------- Paredes finas ----------
     Todo bloco desenhado já tem parede em volta: a borda entre um lugar com bloco e um lugar vazio é parede (blocos
     vizinhos se juntam e a parede fica só por fora). Dentro de uma área, o mestre põe paredes finas nas bordas dos
     blocos (caneta → Parede) para fazer casas e cômodos. Paredes finas barram o andar e a visão; quem voa passa por cima.
     Mapa só de imagem (sem blocos desenhados) não tem paredes automáticas. */
  function chaveMuro(x, y, L, o) { return x + "," + y + "," + L + "," + o; }
  function muroK(ax, ay, bx, by, L) {
    if (by === ay && bx === ax + 1) return chaveMuro(bx, ay, L, "v");
    if (by === ay && bx === ax - 1) return chaveMuro(ax, ay, L, "v");
    if (bx === ax && by === ay + 1) return chaveMuro(ax, by, L, "h");
    if (bx === ax && by === ay - 1) return chaveMuro(ax, ay, L, "h");
    return null;
  }
  function bordaDoVazio(ax, ay, bx, by) { return mapa.celulas.size > 0 && !coluna(ax, ay) !== !coluna(bx, by); }
  // Parede (fina ou de borda) entre dois blocos vizinhos (de lado), no layer L.
  function muroEntre(ax, ay, bx, by, L) { var k = muroK(ax, ay, bx, by, L); return (!!k && mapa.muros.has(k)) || bordaDoVazio(ax, ay, bx, by); }
  // Passo de um bloco para o vizinho (também na diagonal: só fecha se os dois caminhos em L tiverem parede).
  function passoBarrado(ax, ay, bx, by, L) {
    var dx = bx - ax, dy = by - ay;
    if (!dx || !dy) return muroEntre(ax, ay, bx, by, L);
    var porX = muroEntre(ax, ay, ax + dx, ay, L) || muroEntre(ax + dx, ay, bx, by, L);
    var porY = muroEntre(ax, ay, ax, ay + dy, L) || muroEntre(ax, ay + dy, bx, by, L);
    return porX && porY;
  }
  // Faixa de layers que existem no mapa (0..2 de início; o mestre acrescenta um abaixo ou um acima).
  function faixaLayers() {
    var mn = mapa.layers ? mapa.layers[0] : 0, mx = mapa.layers ? mapa.layers[1] : 2;
    mapa.celulas.forEach(function (v, k) { var L = partes(k).L; if (L < mn) mn = L; if (L > mx) mx = L; });
    return [mn, mx];
  }
  // Layer de quem está olhando: o mestre vê o layer em que desenha; o jogador, o do próprio token.
  // Mestre na Sessão "vendo como" um jogador ou NPC (botão do olho): vê o mapa exatamente como aquele token vê.
  function vendoComo() {
    if (!sessao || !podeEditar || !ui.verComo) return null;
    var t = mapa.tokens.filter(function (x) { return x.id === ui.verComo; })[0];
    return t || null;
  }
  function vistaDeJogador() { return !podeEditar || !!vendoComo(); }
  function layerDaVista() {
    var vc = vendoComo(); if (vc) return layerTk(vc);
    if (podeEditar) return ui.layer;
    var meu = mapa.tokens.filter(function (t) { return t.personagem_id && podeMover(t); })[0];
    return meu ? layerTk(meu) : 1;
  }
  function layerTk(tk) { var z = Number(tk.z); return isFinite(z) && tk.z !== null && tk.z !== undefined && tk.z !== "" ? z : 1; }
  // Bloco que aparece para quem vê do layer V: o mais alto até V; sem nenhum, o mais baixo acima (terreno alto).
  // soAte: só o que está no layer V ou abaixo (o mestre desenhando: os layers de cima ficam escondidos)
  function blocoVisivel(x, y, V, soAte) {
    var col = coluna(x, y); if (!col) return null;
    var achou = null;
    for (var i = 0; i < col.length; i++) { if (col[i].L <= V) achou = col[i]; else break; }
    if (achou || soAte) return achou;
    return col[0];
  }
  function layerVisivel(x, y, V) { var b = blocoVisivel(x, y, V); return b ? b.L : null; }

  // Converte o relevo antigo (alto/baixo) para layer: baixo = 0, mediano = 1, cima = 2.
  function lerCelula(c) {
    var q = normalCel(c), v = { t: q.t, c: q.c };
    if (q.r) v.r = q.r;
    return { x: q.x, y: q.y, L: q.L, v: v };
  }
  function celulasArray() {
    var cels = [];
    mapa.celulas.forEach(function (v, k) {
      var p = partes(k);
      cels.push(v.r || p.L !== 1 ? [p.x, p.y, v.t, v.c, v.r || "", p.L] : [p.x, p.y, v.t, v.c]);
    });
    return cels;
  }
  function serializar() {
    return { v: 2, titulo: mapa.titulo, celulas: celulasArray(), cor: mapa.cor, grade: mapa.grade, papel: mapa.papel, fundo: mapa.fundo, limite: mapa.limite, layers: faixaLayers(), recortes: mapa.recortes || null, sombras: !!mapa.sombras, caverna: !!mapa.caverna, muros: Array.from(mapa.muros.keys()), nevoa: Array.from(mapa.nevoa.keys()), textos: mapa.textos };
  }
  function aplicarDados(d) {
    mapa.titulo = d.titulo || "Mapa sem título";
    mapa.celulas = new Map(); sujar();
    (d.celulas || []).forEach(function (c) { var q = lerCelula(c); mapa.celulas.set(chave3(q.x, q.y, q.L), q.v); });
    mapa.layers = Array.isArray(d.layers) && d.layers.length === 2 ? [Math.min(0, +d.layers[0] || 0), Math.max(2, +d.layers[1] || 2)] : null;
    mapa.recortes = d.recortes && typeof d.recortes === "object" ? d.recortes : null;
    if (d.cor) mapa.cor = d.cor; else if (d.cores && d.cores.espaco) mapa.cor = d.cores.espaco;
    if (d.grade) mapa.grade = { on: d.grade.on !== false, cor: d.grade.cor || "rgba(120, 136, 160, 0.45)", esp: espessura(d.grade.esp) };
    mapa.papel = d.papel || null;
    mapa.sombras = !!d.sombras;
    mapa.caverna = !!d.caverna;
    mapa.muros = new Map((Array.isArray(d.muros) ? d.muros : []).filter(function (k) { return /^-?\d+,-?\d+,-?\d+,[hv]$/.test(k); }).map(function (k) { return [k, true]; }));
    mapa.nevoa = new Map((Array.isArray(d.nevoa) ? d.nevoa : []).filter(function (k) { return /^-?\d+,-?\d+$/.test(k); }).map(function (k) { return [k, true]; }));
    mapa.textos = (Array.isArray(d.textos) ? d.textos : []).filter(function (x) { return x && typeof x.texto === "string" && isFinite(x.x) && isFinite(x.y); }).map(function (x) {
      return { id: String(x.id || Math.random().toString(36).slice(2, 9)), tipo: x.tipo === "etiqueta" ? "etiqueta" : "corrido", x: +x.x, y: +x.y, L: isFinite(x.L) ? +x.L : 1, texto: String(x.texto).slice(0, 50) };
    });
    mapa.fundo = d.fundo || null;
    mapa.limite = d.limite || null;
  }
  function salvar() {
    if (sessao) { if (podeEditar && opts.aoSalvarMapa) opts.aoSalvarMapa(serializar()); return; }
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 2, titulo: mapa.titulo, celulas: celulasArray(), cor: mapa.cor, grade: mapa.grade, papel: mapa.papel, fundo: mapa.fundo, layers: faixaLayers(), sombras: !!mapa.sombras, caverna: !!mapa.caverna, muros: Array.from(mapa.muros.keys()), nevoa: Array.from(mapa.nevoa.keys()), textos: mapa.textos, tokens: mapa.tokens, vis: vis }));
    } catch (e) {
      // imagem importada grande demais: salva sem ela
      try {
        var semFundo = JSON.parse(JSON.stringify({ titulo: mapa.titulo, cor: mapa.cor, grade: mapa.grade, papel: mapa.papel, layers: faixaLayers(), sombras: !!mapa.sombras, caverna: !!mapa.caverna, muros: Array.from(mapa.muros.keys()), nevoa: Array.from(mapa.nevoa.keys()), textos: mapa.textos, tokens: mapa.tokens }));
        semFundo.celulas = celulasArray(); semFundo.v = 2;
        localStorage.setItem(KEY, JSON.stringify(semFundo));
        if (!salvar.avisou) { salvar.avisou = true; toast("A imagem importada é grande demais para ficar salva neste navegador. O resto do mapa foi salvo."); }
      } catch (e2) { toast("Não consegui salvar o mapa neste navegador."); }
    }
  }
  // Zoom e posição da vista: no editor ficam salvos; na Sessão cada um tem a sua (não vai para o banco).
  function salvarVista() { if (!sessao) salvarDepois(); }
  function salvarUi() { try { localStorage.setItem(KEY + "-ui", JSON.stringify({ angulo: ui.angulo, regua: ui.sub.regua, anguloExp: ui.anguloExp, explosao: ui.sub.explosao })); } catch (e) {} }
  try {
    var uiSalva = JSON.parse(localStorage.getItem(KEY + "-ui"));
    if (uiSalva) {
      if (uiSalva.angulo) ui.angulo = uiSalva.angulo; if (uiSalva.regua) ui.sub.regua = uiSalva.regua;
      if (uiSalva.anguloExp) ui.anguloExp = uiSalva.anguloExp; if (/^(cone|circulo|quadrado)$/.test(uiSalva.explosao || "")) ui.sub.explosao = uiSalva.explosao;
    }
  } catch (e) {}
  var salvarT = null;
  function salvarDepois() { clearTimeout(salvarT); salvarT = setTimeout(salvar, 400); }
  function carregar() {
    if (sessao) {
      if (opts.dados) aplicarDados(opts.dados);
      mapa.tokens = (opts.tokens || []).map(function (t) { return Object.assign({}, t); });
      return true;
    }
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (!d) return false;
      aplicarDados(d);
      mapa.limite = null;
      mapa.tokens = d.tokens || [];
      if (d.vis) vis = d.vis;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Desfazer ---------- */
  var desfazer = [], refazer = [], mudancaAtual = null;
  function comecarMudanca() { mudancaAtual = new Map(); }
  // Desenha no layer em que o mestre está (ou no layer L dado).
  function definir(x, y, val, L) {
    if (fora(x, y)) return;          // Sessão: nada fora da borda do mapa
    var k = chave3(x, y, L == null ? ui.layer : L), antes = celLer(k);
    if (mudancaAtual && !mudancaAtual.has(k)) mudancaAtual.set(k, antes);
    celPor(k, val);
  }
  // Demolir: o bloco vira terra e tudo o que estiver em cima dele (layers acima, na mesma coluna) cai junto.
  function demolir(x, y, val) {
    definir(x, y, val);
    (coluna(x, y) || []).slice().forEach(function (e) { if (e.L > ui.layer) definir(x, y, null, e.L); });
    mapa.muros.forEach(function (v, k) {   // paredes finas do bloco, deste layer para cima
      var p = k.split(","), mx = +p[0], my = +p[1], L = +p[2], o = p[3];
      if (L < ui.layer) return;
      if ((o === "h" && mx === x && (my === y || my === y + 1)) || (o === "v" && my === y && (mx === x || mx === x + 1))) definirMuro(k, null);
    });
  }
  function fecharMudanca() {
    if (mudancaAtual && mudancaAtual.size) { desfazer.push(mudancaAtual); if (desfazer.length > 80) desfazer.shift(); refazer = []; salvarDepois(); }
    mudancaAtual = null;
  }
  function aplicarHistorico(de, para) {
    var m = de.pop(); if (!m) return;
    var inverso = new Map();
    m.forEach(function (val, k) { inverso.set(k, celLer(k)); celPor(k, val); });
    para.push(inverso); salvarDepois(); pedirDesenho();
  }

  /* ---------- Montagem da tela ---------- */
  var raiz, tela, ctx, dpr = 1;
  var tituloEl, barra, dica, zoomTxt;
  var ICONES = {
    caneta: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.8 6.8l3.4 3.4" stroke="currentColor" stroke-width="1.8"/></svg>',
    quadrado: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    circulo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    regua: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 8v3M9.5 8v4.5M13 8v3M16.5 8v4.5M20 8v3" stroke="currentColor" stroke-width="1.5"/></svg>',
    borracha: '<svg viewBox="0 0 24 24"><path d="M8.5 19.5l-4-4a2 2 0 0 1 0-2.8l8.7-8.7a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8l-7.3 7.3M8.5 19.5h11M10 9l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    explosao: '<svg viewBox="0 0 24 24"><path d="M12 2l1.8 5.2L19 4.5l-2.4 5 5.4.9-4.8 2.8 3.3 4.4-5.3-1.2-.8 5.6-2.4-5-3.7 4 .6-5.5-5.4.5 4.2-3.6L2 9.6l5.5-.5L6 3.8l4.4 3.3z" fill="#E0642C" stroke="#7A2E10" stroke-width="1" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="#FFD27A"/></svg>',
    engrenagem: '<svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    mao: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5M14 11.5V5.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.4 15.6a1.6 1.6 0 0 1 2.3-2.2L8 14.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gotas: '<svg viewBox="0 0 24 24"><path d="M15.2 3.6a2.6 2.6 0 0 1 3.7 3.7l-2 2 .9.9-1.4 1.4-.9-.9-7.6 7.6L4 19.6l.3-4 7.6-7.6-.9-.9 1.4-1.4.9.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.3 15.3l2.4 2.4" stroke="currentColor" stroke-width="1.5"/></svg>',
    nevoa: '<svg viewBox="0 0 24 24"><path d="M4 9h11a3 3 0 1 0-3-3M3 13h16a3 3 0 1 1-3 3M5 17h7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    texto: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2.2"/><path d="M8 8h8M12 8v9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    telaCheia: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lapisTitulo: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  };
  // Opções de cada ferramenta: [id, rótulo (leitores de tela e dica), desenho do símbolo]
  var SUBS = {
    caneta: [["espaco", "Desenhar espaço", '<span class="mp-sim mp-sim--espaco"></span>'], ["parede", "Parede fina: clique ou arraste na beirada dos blocos", '<span class="mp-sim mp-sim--muro"></span>']],
    quadrado: [["vazio", "Quadrado de espaço vazio", '<span class="mp-sim mp-sim--espaco"></span>'], ["borda", "Quadrado com paredes em volta", '<span class="mp-sim mp-sim--borda"></span>'], ["cheio", "Quadrado só de paredes", '<span class="mp-sim mp-sim--parede"></span>']],
    circulo: [["vazio", "Círculo de espaço vazio", '<span class="mp-sim mp-sim--espaco mp-sim--redondo"></span>'], ["borda", "Círculo com paredes em volta", '<span class="mp-sim mp-sim--borda mp-sim--redondo"></span>'], ["cheio", "Círculo só de paredes", '<span class="mp-sim mp-sim--parede mp-sim--redondo"></span>']],
    borracha: [["borracha", "Borracha normal: deixa o lugar vazio", ICONES.borracha],
      ["cheio", "Apagar um quadrado inteiro", '<svg viewBox="0 0 24 24"><defs><pattern id="mp-hach" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="4" fill="#E0455A"/></pattern></defs><rect x="4" y="4" width="16" height="16" rx="1.5" fill="url(#mp-hach)" stroke="#B3261E" stroke-width="1.8"/></svg>'],
      ["vazio", "Apagar só a borda de um quadrado", '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1.5" fill="#fff" stroke="#E0455A" stroke-width="4"/><rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="#B3261E" stroke-width="1.2" stroke-dasharray="2.5 2"/></svg>']],
    explosao: [["cone", "Explosão em cone", '<svg viewBox="0 0 24 24"><path d="M3 12 L21 4 A 18 18 0 0 1 21 20 Z" fill="rgba(224,100,44,.35)" stroke="#B4471C" stroke-width="1.8" stroke-linejoin="round"/><circle cx="3" cy="12" r="2.2" fill="#E0642C"/></svg>'],
      ["circulo", "Explosão em círculo", '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="rgba(224,100,44,.35)" stroke="#B4471C" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="#FFD27A"/></svg>'],
      ["quadrado", "Explosão em quadrado", '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" fill="rgba(224,100,44,.35)" stroke="#B4471C" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="#FFD27A"/></svg>']],
    texto: [["etiqueta", "Etiqueta: fica escondida num bloco, com um balão", '<svg viewBox="0 0 24 24"><path d="M5 5h14v10H10l-4 4v-4H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9" cy="10" r="1.1" fill="currentColor"/><circle cx="12" cy="10" r="1.1" fill="currentColor"/><circle cx="15" cy="10" r="1.1" fill="currentColor"/></svg>'],
      ["corrido", "Texto corrido: fica sempre escrito no mapa", '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>']],
    regua: [["linha", "Régua em linha", '<svg viewBox="0 0 24 24"><path d="M4 20L20 4" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.5"/><circle cx="4" cy="20" r="2.4" fill="#E0455A"/><circle cx="20" cy="4" r="2" fill="currentColor"/></svg>'],
      ["cone", "Régua em cone", '<svg viewBox="0 0 24 24"><path d="M3 12 L21 4 A 18 18 0 0 1 21 20 Z" fill="rgba(224,69,90,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="3" cy="12" r="2.2" fill="#E0455A"/></svg>'],
      ["circulo", "Régua em círculo", '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="rgba(224,69,90,.2)" stroke="currentColor" stroke-width="1.8"/><path d="M12 12 L19.5 7" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.5 2"/><circle cx="12" cy="12" r="2.2" fill="#E0455A"/></svg>']]
  };

  var bandeja = null, bandejaLista = null, pergaminho = null;
  function montar(container) {
    raiz = el("div", "mp" + (sessao ? " mp--sessao" : "") + (podeEditar ? "" : " mp--jogador"));
    tela = el("canvas", "mp-tela"); tela.setAttribute("aria-label", "Mapa"); tela.setAttribute("role", "img"); tela.tabIndex = 0;
    raiz.appendChild(tela);
    ctx = tela.getContext("2d");

    // Título no alto, com a canetinha para editar (só quem edita)
    var topo = el("div", "mp-titulo");
    tituloEl = el(sessao ? "h2" : "h1", "mp-titulo__txt", mapa.titulo);
    topo.appendChild(tituloEl);
    if (podeEditar) {
      var editar = el("button", "mp-titulo__editar"); editar.type = "button"; editar.innerHTML = ICONES.lapisTitulo; editar.setAttribute("aria-label", "Editar o título do mapa"); editar.title = "Editar título";
      topo.appendChild(editar);
      editar.addEventListener("click", function () { editarTitulo(topo); });
    }
    raiz.appendChild(topo);

    if (!sessao) {
      // Esquerda em cima: voltar e token de teste
      var esq = el("div", "mp-caixa mp-caixa--esq");
      var volta = el("a", "mp-voltar", "← Campanha"); volta.href = "../campanha.html";
      var tok = el("button", "btn mp-token-btn", "Adicionar token para teste"); tok.type = "button";
      tok.addEventListener("click", adicionarToken);
      esq.appendChild(volta); esq.appendChild(tok);
      raiz.appendChild(esq);
    }

    if (podeEditar) {
      // Pergaminho (no editor: à direita, em cima; na Sessão: à esquerda, dobrado até clicar)
      var dir = pergaminho = el("div", "mp-antigo");
      var rot;
      if (sessao) {
        rot = el("button", "mp-antigo__rot mp-antigo__abrir", "Pergaminho"); rot.type = "button"; rot.setAttribute("aria-expanded", "false");
        rot.addEventListener("click", function () { var aberto = dir.classList.toggle("is-aberto"); rot.setAttribute("aria-expanded", String(aberto)); });
        ouvir(document, "click", function (e) { if (raiz.isConnected && !dir.contains(e.target)) { dir.classList.remove("is-aberto"); rot.setAttribute("aria-expanded", "false"); } });
      } else rot = el("span", "mp-antigo__rot", "Pergaminho do mapa");
      dir.appendChild(rot);
      var corpoP = el("div", "mp-antigo__corpo");
      var exp = el("button", "mp-antigo__btn", "Exportar mapa"); exp.type = "button";
      exp.appendChild(el("small", "mp-antigo__sub", ".dbomapa ou imagem"));
      exp.addEventListener("click", abrirExportar);
      var impEl;
      if (sessao) {
        impEl = el("button", "mp-antigo__btn", "Importar mapa"); impEl.type = "button";
        impEl.appendChild(el("small", "mp-antigo__sub", ".dbomapa ou imagem"));
        impEl.addEventListener("click", function () { dir.classList.remove("is-aberto"); if (opts.aoImportar) opts.aoImportar(); });
      } else {
        impEl = el("label", "mp-antigo__btn", "Importar mapa");
        impEl.appendChild(el("small", "mp-antigo__sub", ".dbomapa ou imagem"));
        // sem filtro de tipo: no celular um filtro com ".dbomapa" deixa o arquivo cinza, impossível de escolher
        var imp = el("input", "sr-only"); imp.type = "file"; impEl.appendChild(imp);
        imp.addEventListener("change", function () { var f = imp.files && imp.files[0]; imp.value = ""; if (f) importar(f); });
      }
      if (sessao) { corpoP.appendChild(impEl); corpoP.appendChild(exp); } else { corpoP.appendChild(exp); corpoP.appendChild(impEl); }
      if (sessao) {
        var tokS = el("button", "mp-antigo__btn", "Token de teste"); tokS.type = "button"; tokS.title = "Adicionar token para teste";
        tokS.addEventListener("click", function () { dir.classList.remove("is-aberto"); adicionarToken(); });
        corpoP.appendChild(tokS);
      }
      var limpar = el("button", "mp-antigo__btn mp-antigo__btn--perigo", sessao ? "Tirar o mapa" : "Limpar tudo"); limpar.type = "button";
      limpar.addEventListener("click", confirmarLimpar);
      corpoP.appendChild(limpar);
      dir.appendChild(corpoP);
      raiz.appendChild(dir);
    }

    // (Sessão: os tokens entram arrastados pelo mestre a partir do painel da esquerda — js/combate.js chama arrastarPersonagem.)

    // Barra de ferramentas embaixo (só quem edita)
    barra = el("div", "mp-barra"); barra.setAttribute("role", "toolbar"); barra.setAttribute("aria-label", "Ferramentas do mapa");
    if (podeEditar) {
      relevoBtn();
      ferramentaBtn("caneta", "Caneta");
      var corBtn = el("button", "mp-ferr mp-ferr--cor"); corBtn.type = "button"; corBtn.title = "Cor"; corBtn.setAttribute("aria-label", "Cor do que você desenha");
      corBtn.appendChild(el("span", "mp-cor-amostra"));
      corBtn.addEventListener("click", function () {
        fecharCorMenu();
        DBOCor.abrir({ cor: mapa.cor, titulo: "Cor do que você desenha", aoEscolher: function (c) { mapa.cor = c; atualizarBarra(); salvarDepois(); } });
      });
      // parar o mouse em cima do botão de cor por meio segundo mostra o conta-gotas (copia a cor de um bloco)
      var corWrap = el("div", "mp-ferr-wrap");
      var corMenu = el("div", "mp-menu"); corMenu.hidden = true; corMenu.setAttribute("aria-label", "Cor");
      var gotasBtn = el("button", "mp-menu__item"); gotasBtn.type = "button"; gotasBtn.innerHTML = ICONES.gotas;
      gotasBtn.title = "Conta-gotas: clique num bloco para copiar a cor dele"; gotasBtn.setAttribute("aria-label", gotasBtn.title);
      gotasBtn.addEventListener("click", function () {
        fecharCorMenu();
        contaGotas(function (c) { mapa.cor = c; atualizarBarra(); salvarDepois(); toast("Cor copiada: " + c + "."); });
      });
      corMenu.appendChild(gotasBtn);
      var tCorA = null, tCorF = null;
      var fecharCorMenu = function () { corMenu.hidden = true; };
      corWrap.addEventListener("mouseenter", function () { clearTimeout(tCorF); tCorA = setTimeout(function () { corMenu.hidden = false; }, 500); });
      corWrap.addEventListener("mouseleave", function () { clearTimeout(tCorA); tCorF = setTimeout(fecharCorMenu, 220); });
      corBtn.addEventListener("keydown", function (e) { if (e.key === "ArrowUp") { e.preventDefault(); corMenu.hidden = false; gotasBtn.focus(); } });
      corMenu.addEventListener("keydown", function (e) { if (e.key === "Escape") { fecharCorMenu(); corBtn.focus(); } });
      corWrap.appendChild(corMenu); corWrap.appendChild(corBtn);
      barra.appendChild(corWrap);
      ferramentaBtn("quadrado", "Quadrado");
      ferramentaBtn("circulo", "Círculo");
      ferramentaBtn("regua", "Régua: blocos de distância");
      ferramentaBtn("borracha", "Borracha");
      ferramentaBtn("explosao", "Explosão: a área vira terra");
      // Em cima, à direita: névoa e texto (a barra de baixo já está cheia)
      var topoF = el("div", "mp-topo"); topoF.setAttribute("role", "toolbar"); topoF.setAttribute("aria-label", "Névoa e texto");
      ferramentaBtn("nevoa", "Névoa: escolha os blocos e confirme", topoF);
      ferramentaBtn("texto", "Texto", topoF);
      raiz.appendChild(topoF);
      var eng = el("div", "mp-ferr-wrap");
      var engBtn = el("button", "mp-ferr"); engBtn.type = "button"; engBtn.innerHTML = ICONES.engrenagem; engBtn.title = "Opções"; engBtn.setAttribute("aria-label", "Opções do mapa"); engBtn.setAttribute("aria-haspopup", "true"); engBtn.setAttribute("aria-expanded", "false");
      var engMenu = el("div", "mp-menu mp-menu--lista"); engMenu.hidden = true;
      var optGrade = el("label", "mp-menu__opt");
      var chk = el("input"); chk.type = "checkbox"; chk.checked = mapa.grade.on;
      chk.addEventListener("change", function () { mapa.grade.on = chk.checked; salvarDepois(); pedirDesenho(); });
      optGrade.appendChild(chk); optGrade.appendChild(el("span", "", "Mostrar grade"));
      var optCor = el("button", "mp-menu__opt", "Alterar cor da grade"); optCor.type = "button";
      optCor.addEventListener("click", function () {
        engMenu.hidden = true; engBtn.setAttribute("aria-expanded", "false");
        DBOCor.abrir({ cor: mapa.grade.cor, titulo: "Cor da grade", aoMudar: function (c) { mapa.grade.cor = c; pedirDesenho(); }, aoEscolher: function (c) { mapa.grade.cor = c; salvarDepois(); pedirDesenho(); } });
      });
      // grossura das linhas da grade, em pixels
      var optEsp = el("div", "mp-menu__opt mp-menu__esp");
      var labEsp = el("label", "", "Grossura da grade"); labEsp.htmlFor = "mp-esp";
      var rgEsp = el("input"); rgEsp.type = "range"; rgEsp.id = "mp-esp"; rgEsp.min = .5; rgEsp.max = 8; rgEsp.step = .5; rgEsp.value = espessura(mapa.grade.esp);
      var outEsp = el("output", "mp-menu__esp-val", num(espessura(mapa.grade.esp)) + " px");
      rgEsp.addEventListener("input", function () { mapa.grade.esp = espessura(rgEsp.value); outEsp.textContent = num(mapa.grade.esp) + " px"; pedirDesenho(); salvarDepois(); });
      optEsp.appendChild(labEsp); optEsp.appendChild(rgEsp); optEsp.appendChild(outEsp);
      // cor do fundo vazio do mapa (a parte "transparente")
      var optPapel = el("button", "mp-menu__opt", "Cor do fundo do mapa"); optPapel.type = "button";
      var amPapel = el("span", "mp-menu__amostra"); optPapel.insertBefore(amPapel, optPapel.firstChild);
      var optPadrao = el("button", "mp-menu__opt mp-menu__opt--leve", "Fundo padrão (transparente)"); optPadrao.type = "button";
      var mostrarPapel = function () { amPapel.style.background = mapa.papel || ""; amPapel.classList.toggle("is-vazia", !mapa.papel); optPadrao.hidden = !mapa.papel; };
      optPapel.addEventListener("click", function () {
        engMenu.hidden = true; engBtn.setAttribute("aria-expanded", "false");
        var antes = mapa.papel, escolheu = false;
        DBOCor.abrir({ cor: mapa.papel || PAPEL_PADRAO, titulo: "Cor do fundo do mapa",
          aoMudar: function (c) { mapa.papel = c; pedirDesenho(); },   // prévia ao vivo
          aoEscolher: function (c) { escolheu = true; mapa.papel = c; mostrarPapel(); salvarDepois(); pedirDesenho(); } });
        // fechar sem aplicar: volta exatamente ao fundo de antes (inclusive ao padrão transparente)
        var dlgCor = document.querySelector(".cor-dlg");
        if (dlgCor) dlgCor.addEventListener("close", function volta() { dlgCor.removeEventListener("close", volta); if (!escolheu) mapa.papel = antes; mostrarPapel(); pedirDesenho(); });
      });
      optPadrao.addEventListener("click", function () { mapa.papel = null; mostrarPapel(); salvarDepois(); pedirDesenho(); });
      mostrarPapel();
      // Sombras (na Sessão): cada jogador só vê o que o próprio token enxerga
      var optSombra = el("label", "mp-menu__opt");
      var chkS = el("input"); chkS.type = "checkbox"; chkS.checked = !!mapa.sombras;
      chkS.addEventListener("change", function () {
        mapa.sombras = chkS.checked; salvarDepois(); pedirDesenho();
        toast(mapa.sombras ? "Sombras ligadas: cada jogador só vê o que o próprio token enxerga (paredes e andares tapam a visão)." : "Sombras desligadas: todos veem o mapa inteiro.");
      });
      optSombra.appendChild(chkS); optSombra.appendChild(el("span", "", "Sombras (visão dos jogadores)"));
      engMenu.appendChild(optSombra);
      var optCav = el("label", "mp-menu__opt");
      var chkC = el("input"); chkC.type = "checkbox"; chkC.checked = !!mapa.caverna;
      chkC.addEventListener("change", function () {
        mapa.caverna = chkC.checked; salvarDepois(); pedirDesenho();
        toast(mapa.caverna ? "Modo caverna: tudo escuro; cada token enxerga 2 × (Concentração + 1) blocos em volta. Tocha e lanterna ficam nas ações do token." : "Modo caverna desligado.");
      });
      optCav.appendChild(chkC); optCav.appendChild(el("span", "", "Modo caverna (escuro)"));
      engMenu.appendChild(optCav);
      engMenu.appendChild(optGrade); engMenu.appendChild(optCor); engMenu.appendChild(optEsp); engMenu.appendChild(optPapel); engMenu.appendChild(optPadrao);
      engBtn.addEventListener("click", function () { engMenu.hidden = !engMenu.hidden; engBtn.setAttribute("aria-expanded", String(!engMenu.hidden)); });
      ouvir(document, "click", function (e) { if (!eng.contains(e.target)) { engMenu.hidden = true; engBtn.setAttribute("aria-expanded", "false"); } });
      eng.appendChild(engMenu); eng.appendChild(engBtn);
      barra.appendChild(eng);
      if (sessao) olhoBtn();
      raiz.appendChild(barra);
    } else {
      // jogador: mover a vista (mão) e a régua, com as mesmas opções do mestre (linha, cone com ângulo, círculo)
      ui.ferramenta = "mao";
      ferramentaBtn("mao", "Mover a vista");
      ferramentaBtn("regua", "Régua: distância em metros");
      // opções do jogador: só a cor da borda do próprio token
      var engJ = el("div", "mp-ferr-wrap");
      var engJBtn = el("button", "mp-ferr"); engJBtn.type = "button"; engJBtn.innerHTML = ICONES.engrenagem; engJBtn.title = "Opções"; engJBtn.setAttribute("aria-label", "Opções do seu token"); engJBtn.setAttribute("aria-haspopup", "true"); engJBtn.setAttribute("aria-expanded", "false");
      var engJMenu = el("div", "mp-menu mp-menu--lista"); engJMenu.hidden = true;
      var meuToken = function () { return mapa.tokens.filter(function (tk) { return tk.personagem_id && podeMover(tk); })[0] || null; };
      var optBorda = el("button", "mp-menu__opt", "Cor da borda do meu token"); optBorda.type = "button";
      var amBorda = el("span", "mp-menu__amostra"); optBorda.insertBefore(amBorda, optBorda.firstChild);
      var optPrata = el("button", "mp-menu__opt mp-menu__opt--leve", "Borda prateada (padrão)"); optPrata.type = "button";
      var mostrarBorda = function () { var tk = meuToken(), c = tk && tk.borda; amBorda.style.background = c || "linear-gradient(135deg, #FBFCFD, #A7AEB7 40%, #EEF1F4 55%, #7C848E)"; optPrata.hidden = !c; };
      var salvarBorda = function (c) { var tk = meuToken(); if (!tk) return; tk.borda = c; mostrarBorda(); pedirDesenho(); tokenMudou(tk); };
      optBorda.addEventListener("click", function () {
        engJMenu.hidden = true; engJBtn.setAttribute("aria-expanded", "false");
        var tk = meuToken();
        if (!tk) return toast("Ponha seu personagem no mapa primeiro (arraste da lista da direita).");
        var antes = tk.borda || null, escolheu = false;
        DBOCor.abrir({ cor: antes || "rgb(200, 205, 212)", titulo: "Cor da borda do seu token",
          aoMudar: function (c) { tk.borda = c; pedirDesenho(); },
          aoEscolher: function (c) { escolheu = true; salvarBorda(c); } });
        var dlgCor = document.querySelector(".cor-dlg");
        if (dlgCor) dlgCor.addEventListener("close", function volta() { dlgCor.removeEventListener("close", volta); if (!escolheu) { tk.borda = antes; pedirDesenho(); } mostrarBorda(); });
      });
      optPrata.addEventListener("click", function () { salvarBorda(null); });
      var optGotas = el("button", "mp-menu__opt", "Copiar a cor de um bloco"); optGotas.type = "button";
      var icG = el("span", "mp-menu__icone"); icG.innerHTML = ICONES.gotas; optGotas.insertBefore(icG, optGotas.firstChild);
      optGotas.addEventListener("click", function () {
        engJMenu.hidden = true; engJBtn.setAttribute("aria-expanded", "false");
        if (!meuToken()) return toast("Ponha seu personagem no mapa primeiro (arraste da lista da direita).");
        contaGotas(function (c) { salvarBorda(c); toast("Borda do seu token: " + c + "."); });
      });
      engJMenu.appendChild(optBorda); engJMenu.appendChild(optGotas); engJMenu.appendChild(optPrata);
      engJBtn.addEventListener("click", function () { mostrarBorda(); engJMenu.hidden = !engJMenu.hidden; engJBtn.setAttribute("aria-expanded", String(!engJMenu.hidden)); });
      ouvir(document, "click", function (e) { if (!engJ.contains(e.target)) { engJMenu.hidden = true; engJBtn.setAttribute("aria-expanded", "false"); } });
      engJ.appendChild(engJMenu); engJ.appendChild(engJBtn);
      barra.appendChild(engJ);
      raiz.appendChild(barra);
    }

    // Zoom (canto de baixo)
    // Tela cheia (canto de baixo, à direita): na Sessão vira o site inteiro (js/combate.js); no editor, o mapa.
    var cheia = el("button", "mp-cheia"); cheia.type = "button"; cheia.innerHTML = ICONES.telaCheia;
    cheia.title = "Tela cheia"; cheia.setAttribute("aria-label", "Tela cheia");
    cheia.addEventListener("click", function () {
      if (opts.aoTelaCheia) return opts.aoTelaCheia();
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else if (raiz.requestFullscreen) raiz.requestFullscreen().then(function () { toast("Pressione F11 ou Esc para minimizar."); }).catch(function () { toast("Este navegador não deixou abrir em tela cheia."); });
    });
    raiz.appendChild(cheia);
    var zoom = el("div", "mp-zoom");
    var zm = el("button", "mp-zoom__btn", "−"); zm.type = "button"; zm.setAttribute("aria-label", "Diminuir zoom");
    zoomTxt = el("button", "mp-zoom__txt", "100%"); zoomTxt.type = "button"; zoomTxt.title = sessao ? "Ver o mapa inteiro" : "Voltar para 100%";
    var zp = el("button", "mp-zoom__btn", "+"); zp.type = "button"; zp.setAttribute("aria-label", "Aumentar zoom");
    zm.addEventListener("click", function () { zoomEm(tela.clientWidth / 2, tela.clientHeight / 2, 1 / 1.25); });
    zp.addEventListener("click", function () { zoomEm(tela.clientWidth / 2, tela.clientHeight / 2, 1.25); });
    if (sessao && podeEditar) { zoomTxt.title = "Limitar a área do mapa de um jogador"; }
    zoomTxt.addEventListener("click", function () {
      if (sessao && podeEditar) return abrirRecortes();
      zoomEm(tela.clientWidth / 2, tela.clientHeight / 2, (sessao ? zoomMin() : 1) / vis.zoom);
    });
    zoom.appendChild(zm); zoom.appendChild(zoomTxt); zoom.appendChild(zp);
    raiz.appendChild(zoom);

    dica = el("div", "mp-dica"); dica.hidden = true; dica.setAttribute("role", "status");
    raiz.appendChild(dica);

    container.appendChild(raiz);
    eventos();
    redimensionar();
    if (!sessao && !localStorage.getItem(KEY)) centralizar(0, 0);
    atualizarBarra();
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { redimensionar(); }); ro.observe(raiz); globais.push([ro]); }
    else ouvir(window, "resize", redimensionar);
  }

  /* ---------- Olho (mestre na Sessão): ver o mapa como um jogador ou NPC vê ---------- */
  var olhoMenuEl = null, olhoBotao = null, faixaVendo = null;
  var ICONE_OLHO = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
  function olhoBtn() {
    var wrap = el("div", "mp-ferr-wrap");
    olhoBotao = el("button", "mp-ferr mp-ferr--olho"); olhoBotao.type = "button"; olhoBotao.innerHTML = ICONE_OLHO;
    olhoBotao.title = "Ver como um jogador ou NPC"; olhoBotao.setAttribute("aria-label", "Ver o mapa como um jogador ou NPC vê");
    olhoBotao.setAttribute("aria-haspopup", "true"); olhoBotao.setAttribute("aria-expanded", "false");
    olhoMenuEl = el("div", "mp-menu mp-menu--lista mp-menu--olho"); olhoMenuEl.hidden = true; olhoMenuEl.setAttribute("role", "menu");
    olhoBotao.addEventListener("click", function () {
      if (!olhoMenuEl.hidden) { olhoMenuEl.hidden = true; olhoBotao.setAttribute("aria-expanded", "false"); return; }
      montarMenuOlho(); olhoMenuEl.hidden = false; olhoBotao.setAttribute("aria-expanded", "true");
      var b = olhoMenuEl.querySelector("[aria-checked=true]") || olhoMenuEl.querySelector("button"); if (b) b.focus();
    });
    olhoMenuEl.addEventListener("keydown", function (e) { if (e.key === "Escape") { olhoMenuEl.hidden = true; olhoBotao.setAttribute("aria-expanded", "false"); olhoBotao.focus(); } });
    ouvir(document, "click", function (e) { if (!wrap.contains(e.target)) { olhoMenuEl.hidden = true; olhoBotao.setAttribute("aria-expanded", "false"); } });
    wrap.appendChild(olhoMenuEl); wrap.appendChild(olhoBotao);
    barra.appendChild(wrap);
    faixaVendo = el("div", "mp-vendo"); faixaVendo.hidden = true; faixaVendo.setAttribute("role", "status");
    raiz.appendChild(faixaVendo);
  }
  function montarMenuOlho() {
    var m = olhoMenuEl; m.textContent = "";
    m.appendChild(el("span", "mp-menu__tit", "Ver o mapa como…"));
    var item = function (txt, sub, id) {
      var b = el("button", "mp-menu__opt mp-menu__opt--olho"); b.type = "button"; b.setAttribute("role", "menuitemradio");
      b.setAttribute("aria-checked", String((ui.verComo || null) === id));
      b.appendChild(el("span", "", txt)); if (sub) b.appendChild(el("small", "", sub));
      b.addEventListener("click", function () { verComo(id); m.hidden = true; olhoBotao.setAttribute("aria-expanded", "false"); });
      m.appendChild(b);
    };
    item("Mestre (tudo)", "a visão normal", null);
    var tks = mapa.tokens.filter(function (t) { return t.personagem_id; });
    if (!tks.length) m.appendChild(el("span", "mp-menu__vazio", "Nenhum personagem no mapa ainda."));
    tks.forEach(function (tk) {
      var info = infoToken(tk) || {}, jog = opts.ehJogador ? opts.ehJogador(tk) : false;
      item(info.nome || "Token", (jog ? "Jogador" : "NPC") + " · layer " + layerTk(tk), tk.id);
    });
  }
  function verComo(id) {
    ui.verComo = id || null;
    var vc = vendoComo();
    if (olhoBotao) olhoBotao.classList.toggle("is-on", !!vc);
    raiz.classList.toggle("is-vendo", !!vc);
    if (faixaVendo) {
      faixaVendo.textContent = "";
      faixaVendo.hidden = !vc;
      if (vc) {
        faixaVendo.appendChild(el("span", "", "Vendo como "));
        faixaVendo.appendChild(el("b", "", (infoToken(vc) || {}).nome || "Token"));
        if (!sombrasLigadas()) faixaVendo.appendChild(el("small", "", " · sombras desligadas: ele vê o mapa inteiro"));
        var x = el("button", "mp-vendo__x", "Voltar à visão do mestre"); x.type = "button";
        x.addEventListener("click", function () { verComo(null); });
        faixaVendo.appendChild(x);
      }
    }
    pedirDesenho();
  }

  // Relevo: não é uma ferramenta, é o "jeito" de tudo o que se desenha de espaço (como a cor).
  // A altura agora é o layer (botão ao lado): o relevo diz só o que o chão é.
  var RELEVO_OPCOES = [
    ["", "Normal: chão comum", '<svg viewBox="0 0 24 24"><rect x="4" y="10.5" width="16" height="3" rx="1.5" fill="currentColor"/></svg>'],
    ["agua", "Água", '<svg viewBox="0 0 24 24"><path d="M3 9q2.25-2.5 4.5 0t4.5 0t4.5 0t4.5 0M3 15q2.25-2.5 4.5 0t4.5 0t4.5 0t4.5 0" fill="none" stroke="#2F7FC8" stroke-width="2.2" stroke-linecap="round"/></svg>'],
    ["escada-mao", "Escada de mão: um bloco; quem está nela escala para o layer de cima", '<svg viewBox="0 0 24 24"><path d="M8 3v18M16 3v18M8 7h8M8 11.5h8M8 16h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'],
    ["escada-degraus", "Degraus / rampa: quem está neles escala para o layer de cima", '<svg viewBox="0 0 24 24"><path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>']
  ];
  function relevoBtn() {
    var wrap = el("div", "mp-ferr-wrap");
    var b = el("button", "mp-ferr mp-ferr--relevo"); b.type = "button";
    b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false");
    var menu = el("div", "mp-menu"); menu.hidden = true; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Relevo do que você desenha");
    var mostrar = function () {
      var op = RELEVO_OPCOES.filter(function (o) { return o[0] === ui.relevo; })[0] || RELEVO_OPCOES[0];
      b.innerHTML = op[2];
      b.appendChild(el("span", "mp-ferr__mais"));
      b.dataset.relevo = op[0] || "normal";
      b.title = "Relevo: " + op[1]; b.setAttribute("aria-label", "Relevo do que você desenha: " + op[1]);
      menu.querySelectorAll(".mp-menu__item--relevo").forEach(function (o) { o.setAttribute("aria-checked", String(o.dataset.relevo === (op[0] || "normal"))); });
    };
    RELEVO_OPCOES.forEach(function (op) {
      var o = el("button", "mp-menu__item mp-menu__item--relevo"); o.type = "button"; o.setAttribute("role", "menuitemradio");
      o.dataset.relevo = op[0] || "normal"; o.innerHTML = op[2]; o.title = op[1]; o.setAttribute("aria-label", op[1]);
      o.addEventListener("click", function () { ui.relevo = op[0]; mostrar(); fechar(); toast("Relevo: " + op[1].split(":")[0] + ". Vale para o espaço que você desenhar agora."); });
      menu.appendChild(o);
    });
    var lay = el("button", "mp-menu__item mp-menu__item--layers"); lay.type = "button"; lay.setAttribute("role", "menuitem");
    lay.innerHTML = ICONE_LAYERS; lay.title = "Layers (andares)"; lay.setAttribute("aria-label", "Layers (andares)");
    lay.addEventListener("click", function () { fechar(); abrirLayers(); });
    menu.appendChild(lay);
    var tAbrir = null, tFechar = null;
    var abrir = function () { clearTimeout(tFechar); menu.hidden = false; b.setAttribute("aria-expanded", "true"); };
    var fechar = function () { menu.hidden = true; b.setAttribute("aria-expanded", "false"); };
    wrap.addEventListener("mouseenter", function () { clearTimeout(tFechar); tAbrir = setTimeout(abrir, 500); });
    wrap.addEventListener("mouseleave", function () { clearTimeout(tAbrir); tFechar = setTimeout(fechar, 220); });
    b.addEventListener("click", function () { if (menu.hidden) abrir(); else fechar(); });
    menu.addEventListener("keydown", function (e) { if (e.key === "Escape") { fechar(); b.focus(); } });
    wrap.appendChild(menu); wrap.appendChild(b);
    barra.appendChild(wrap);
    mostrar();
    // Layer em que o mestre desenha (e de onde ele vê): o número abre a janela de layers.
    layerBtn = el("button", "mp-ferr mp-ferr--layer"); layerBtn.type = "button";
    layerBtn.addEventListener("click", abrirLayers);
    barra.appendChild(layerBtn);
    mostrarLayer();
  }
  var ICONE_LAYERS = '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z" fill="currentColor"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var layerBtn = null;
  function nomeLayer(L) { return "Layer " + L + (L === 1 ? " (chão)" : L === 0 ? " (baixo)" : L === 2 ? " (cima)" : ""); }
  function mostrarLayer() {
    if (!layerBtn) return;
    layerBtn.innerHTML = ICONE_LAYERS;
    layerBtn.appendChild(el("span", "mp-ferr__num", String(ui.layer)));
    layerBtn.title = "Desenhando no " + nomeLayer(ui.layer) + " · clique para trocar ou criar layers";
    layerBtn.setAttribute("aria-label", layerBtn.title);
  }
  function irParaLayer(L) {
    ui.layer = L; mostrarLayer(); pedirDesenho();
    toast("Agora você desenha no " + nomeLayer(L) + ". Os layers de cima ficam escondidos enquanto isso.");
  }
  var dlgLayers = null;
  function abrirLayers() {
    if (!dlgLayers) { dlgLayers = el("dialog", "modal mp-limpar mp-layers"); dlgLayers.setAttribute("aria-labelledby", "mplay-t"); document.body.appendChild(dlgLayers); }
    var d = dlgLayers; d.textContent = "";
    var h = el("h2", "", "Layers"); h.id = "mplay-t"; d.appendChild(h);
    d.appendChild(el("p", "mp-limpar__txt", "Cada layer é um andar do mapa. O 1 é o chão; o 0 fica embaixo e o 2 em cima. Você desenha (e vê) um layer de cada vez: os de cima somem enquanto isso."));
    var fx = faixaLayers(), lista = el("ul", "mp-layers__lista");
    var conta = {};
    mapa.celulas.forEach(function (v, k) { var L = partes(k).L; conta[L] = (conta[L] || 0) + 1; });
    for (var L = fx[1]; L >= fx[0]; L--) (function (L) {
      var li = el("li"), bt = el("button", "mp-layers__item" + (L === ui.layer ? " is-atual" : "")); bt.type = "button";
      bt.appendChild(el("b", "", nomeLayer(L)));
      bt.appendChild(el("small", "", (conta[L] || 0) + " bloco" + (conta[L] === 1 ? "" : "s") + (L === ui.layer ? " · você está aqui" : "")));
      if (L === ui.layer) bt.setAttribute("aria-current", "true");
      bt.addEventListener("click", function () { d.close(); irParaLayer(L); });
      li.appendChild(bt); lista.appendChild(li);
    })(L);
    d.appendChild(lista);
    var novos = el("div", "mp-layers__novos");
    var acima = el("button", "btn btn--ghost", "Novo layer acima (" + (fx[1] + 1) + ")"); acima.type = "button";
    var abaixo = el("button", "btn btn--ghost", "Novo layer abaixo (" + (fx[0] - 1) + ")"); abaixo.type = "button";
    acima.addEventListener("click", function () { mapa.layers = [fx[0], fx[1] + 1]; salvar(); d.close(); irParaLayer(fx[1] + 1); });
    abaixo.addEventListener("click", function () { mapa.layers = [fx[0] - 1, fx[1]]; salvar(); d.close(); irParaLayer(fx[0] - 1); });
    novos.appendChild(acima); novos.appendChild(abaixo);
    d.appendChild(novos);
    var acts = el("div", "modal__actions");
    var no = el("button", "btn", "Fechar"); no.type = "button";
    no.addEventListener("click", function () { d.close(); });
    acts.appendChild(no); d.appendChild(acts);
    d.showModal();
    var at = d.querySelector(".is-atual"); if (at) at.focus();
  }
  function ferramentaBtn(id, rotulo, pai) {
    var wrap = el("div", "mp-ferr-wrap");
    var b = el("button", "mp-ferr"); b.type = "button"; b.dataset.ferr = id; b.title = rotulo; b.setAttribute("aria-label", rotulo);
    b.innerHTML = ICONES[id];
    if (SUBS[id]) {
      b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false");
      b.appendChild(el("span", "mp-ferr__mais"));
      var menu = el("div", "mp-menu"); menu.hidden = true; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", rotulo);
      SUBS[id].forEach(function (s) {
        var o = el("button", "mp-menu__item"); o.type = "button"; o.dataset.sub = s[0]; o.setAttribute("role", "menuitemradio");
        o.innerHTML = s[2]; o.title = s[1]; o.setAttribute("aria-label", s[1]);
        o.addEventListener("click", function () { ui.sub[id] = s[0]; escolher(id); fecharMenu(); });
        menu.appendChild(o);
      });
      if (id === "regua" || id === "explosao") {   // ângulo do cone, ajustado no próprio menu (régua e explosão têm cada um o seu)
        var campo = id === "regua" ? "angulo" : "anguloExp";
        var ang = el("div", "mp-menu__angulo");
        var lab = el("label", "", "Ângulo do cone"); lab.htmlFor = "mp-ang-" + id;
        var rg = el("input"); rg.type = "range"; rg.id = "mp-ang-" + id; rg.min = 10; rg.max = 180; rg.step = 5; rg.value = ui[campo];
        var nv = el("output", "mp-menu__angulo-val", ui[campo] + "°");
        rg.addEventListener("input", function () { ui[campo] = +rg.value; nv.textContent = rg.value + "°"; if (ui.sub[id] !== "cone") { ui.sub[id] = "cone"; escolher(id); } pedirDesenho(); salvarUi(); });
        ang.appendChild(lab); ang.appendChild(rg); ang.appendChild(nv);
        menu.appendChild(ang);
      }
      wrap.appendChild(menu);
      // parar o mouse em cima por meio segundo abre as opções
      var t = null, tFechar = null;
      var abrirMenu = function () { clearTimeout(tFechar); menu.hidden = false; b.setAttribute("aria-expanded", "true"); };
      var fecharMenu = function () { menu.hidden = true; b.setAttribute("aria-expanded", "false"); };
      wrap.addEventListener("mouseenter", function () { clearTimeout(tFechar); t = setTimeout(abrirMenu, 500); });
      wrap.addEventListener("mouseleave", function () { clearTimeout(t); tFechar = setTimeout(fecharMenu, 220); });
      // clicar na ferramenta que já está escolhida também abre (toque e teclado)
      b.addEventListener("click", function () { if (ui.ferramenta === id && menu.hidden) abrirMenu(); else if (!menu.hidden) fecharMenu(); });
      b.addEventListener("keydown", function (e) { if (e.key === "ArrowUp") { e.preventDefault(); abrirMenu(); var f = menu.querySelector("button"); if (f) f.focus(); } });
      menu.addEventListener("keydown", function (e) { if (e.key === "Escape") { fecharMenu(); b.focus(); } });
    }
    b.addEventListener("click", function () { if (ui.ferramenta !== id) escolher(id); });
    wrap.appendChild(b);
    (pai || barra).appendChild(wrap);
  }
  function escolher(id) {
    if (id !== "nevoa" && selNevoa) { selNevoa = null; raiz.classList.remove("is-nevoa"); atualizarBarraNevoa(); }
    if (id !== "texto") fecharEditorTexto();
    ui.ferramenta = id;
    if (id === "nevoa" && !selNevoa) comecarNevoa();
    if (id === "texto") toast(ui.sub.texto === "corrido" ? "Texto corrido: clique onde ele vai ficar escrito." : "Etiqueta: clique no bloco onde ela vai ficar escondida.");
    salvarUi();
    if (id !== "regua") { regua.ini = null; dica.hidden = true; }
    atualizarBarra(); pedirDesenho();
  }
  // A cor do botão de cor vale para o tipo que a ferramenta desenha (espaço ou parede).
  function tipoDaCor() {
    if (ui.ferramenta === "caneta") return ui.sub.caneta;
    if ((ui.ferramenta === "quadrado" || ui.ferramenta === "circulo") && ui.sub[ui.ferramenta] === "cheio") return "parede";
    return "espaco";
  }
  function atualizarBarra() {
    raiz.querySelectorAll(".mp-ferr[data-ferr]").forEach(function (b) {
      var id = b.dataset.ferr, on = id === ui.ferramenta;
      b.setAttribute("aria-pressed", String(on));
      if (SUBS[id]) {
        var s = SUBS[id].filter(function (x) { return x[0] === ui.sub[id]; })[0];
        b.classList.toggle("is-sub-parede", id === "caneta" && ui.sub.caneta === "parede");
        b.dataset.sub = ui.sub[id];
        if (s) b.title = s[1];
        b.parentNode.querySelectorAll(".mp-menu__item").forEach(function (o) { o.setAttribute("aria-checked", String(o.dataset.sub === ui.sub[id])); });
      }
    });
    var am = barra.querySelector(".mp-cor-amostra");
    if (am) am.style.background = mapa.cor;
    raiz.dataset.ferr = ui.ferramenta;
  }

  function editarTitulo(topo) {
    var inp = el("input", "mp-titulo__inp"); inp.type = "text"; inp.maxLength = 60; inp.value = mapa.titulo; inp.setAttribute("aria-label", "Título do mapa");
    tituloEl.replaceWith(inp);
    topo.classList.add("is-editando");
    inp.focus(); inp.select();
    var feito = false;
    var fim = function (salvarTxt) {
      if (feito) return; feito = true;
      if (salvarTxt) { var v = inp.value.trim(); if (v) mapa.titulo = v; salvarDepois(); }
      tituloEl.textContent = mapa.titulo;
      inp.replaceWith(tituloEl); topo.classList.remove("is-editando");
    };
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") fim(true); if (e.key === "Escape") fim(false); });
    inp.addEventListener("blur", function () { fim(true); });
  }

  /* ---------- Coordenadas e zoom ---------- */
  var ajustou = false;
  function redimensionar() {
    if (!raiz.isConnected) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = raiz.getBoundingClientRect();
    if (!r.width || !r.height) return;
    tela.width = Math.round(r.width * dpr); tela.height = Math.round(r.height * dpr);
    tela.style.width = r.width + "px"; tela.style.height = r.height + "px";
    if (sessao && !ajustou) { ajustou = true; verInteiro(); }   // na Sessão começa mostrando o mapa inteiro
    pedirDesenho();
  }
  /* Borda do mapa (Sessão) */
  // Borda que vale para quem olha: a do mapa e, para o jogador com área limitada pelo mestre, só a área dele.
  function limiteVista() {
    var L = mapa.limite;
    var vc = vendoComo();
    var id = vc ? (opts.donoDe ? opts.donoDe(vc) : "") : typeof opts.meuId === "function" ? opts.meuId() : opts.meuId;
    var R = vistaDeJogador() && mapa.recortes && id ? mapa.recortes[id] : null;
    if (!R) return L;
    if (!L) return R;
    var r = { x0: Math.max(L.x0, R.x0), y0: Math.max(L.y0, R.y0), x1: Math.min(L.x1, R.x1), y1: Math.min(L.y1, R.y1) };
    return r.x1 > r.x0 && r.y1 > r.y0 ? r : L;
  }
  function fora(x, y) { var L = limiteVista(); return !!L && (x < L.x0 || y < L.y0 || x >= L.x1 || y >= L.y1); }
  // Zoom mínimo: o mapa inteiro cabe na caixa (não dá para afastar mais que isso).
  function zoomMin() {
    var L = limiteVista(), W = tela.clientWidth, H = tela.clientHeight;
    if (!L || !W || !H) return .2;
    return Math.min(4, W / ((L.x1 - L.x0) * CEL), H / ((L.y1 - L.y0) * CEL));
  }
  // Prende a vista no mapa: com o mapa menor que a caixa ele fica no meio; maior, a borda não sai da caixa.
  function prender() {
    var L = limiteVista(), W = tela.clientWidth, H = tela.clientHeight;
    if (!L || !W || !H) return;
    var zmin = zoomMin();
    if (vis.zoom < zmin) vis.zoom = zmin;
    var t = tam(), mw = (L.x1 - L.x0) * t, mh = (L.y1 - L.y0) * t;
    if (mw <= W + .5) vis.ox = (W - mw) / 2 - L.x0 * t; else vis.ox = Math.min(-L.x0 * t, Math.max(W - L.x1 * t, vis.ox));
    if (mh <= H + .5) vis.oy = (H - mh) / 2 - L.y0 * t; else vis.oy = Math.min(-L.y0 * t, Math.max(H - L.y1 * t, vis.oy));
    if (zoomTxt) zoomTxt.textContent = Math.round(vis.zoom * 100) + "%";
  }
  function verInteiro() { vis.zoom = zoomMin(); prender(); pedirDesenho(); }
  function tam() { return CEL * vis.zoom; }
  function telaParaMundo(px, py) { return { x: (px - vis.ox) / tam(), y: (py - vis.oy) / tam() }; }
  function celulaEm(px, py) { var m = telaParaMundo(px, py); return { x: Math.floor(m.x), y: Math.floor(m.y) }; }
  function centralizar(cx, cy) { vis.ox = tela.clientWidth / 2 - (cx + .5) * tam(); vis.oy = tela.clientHeight / 2 - (cy + .5) * tam(); pedirDesenho(); }
  function zoomEm(px, py, fator) {
    var antes = vis.zoom, novo = Math.max(sessao ? zoomMin() : .2, Math.min(4, antes * fator));
    if (novo === antes) return;
    var m = telaParaMundo(px, py);
    vis.zoom = novo;
    vis.ox = px - m.x * tam(); vis.oy = py - m.y * tam();
    zoomTxt.textContent = Math.round(novo * 100) + "%";
    salvarVista(); pedirDesenho();
  }

  /* ---------- Desenho ---------- */
  var pendente = false, previa = null, arrasto = null, regua = { ini: null, fim: null }, bordaHover = null;
  var soltando = null;   // Sessão: personagem sendo arrastado da lista ({ x, y, ok, token })
  function pedirDesenho() { if (!pendente) { pendente = true; requestAnimationFrame(desenhar); } }
  // número "aleatório" fixo por bloco (para a terra ter manchas sempre no mesmo lugar)
  function ruido(x, y, n) { var s = Math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453; return s - Math.floor(s); }
  // A parede usa a mesma cor escolhida, só que mais escura e um pouco puxada para o marrom.
  var cachePar = {};
  function corParede(c) {
    if (cachePar[c]) return cachePar[c];
    var r = (window.DBOCor && DBOCor.ler(c)) || { r: 255, g: 255, b: 255, a: 1 };
    var mix = function (v, m) { return Math.round(v * .5 * .82 + m * .18); };
    return (cachePar[c] = "rgba(" + mix(r.r, 58) + ", " + mix(r.g, 36) + ", " + mix(r.b, 20) + ", " + r.a + ")");
  }
  // Relevo/parede no layer L (sem L: o layer em que o mestre desenha).
  function relevoEm(x, y, L) { var v = blocoEm(x, y, L == null ? ui.layer : L); return v && v.t === "espaco" ? v.r || "" : ""; }
  function paredeEm(x, y, L) { var v = blocoEm(x, y, L); return !!v && v.t === "parede"; }
  // Cor/sombra da altura: comparado a quem olha (V), o que está acima fica mais claro e o que está abaixo, mais escuro;
  // a beirada aparece onde o vizinho está em outro layer (penhasco para baixo = beirada iluminada; para cima = sombra).
  function sombrearAltura(g, x, y, L, V, t, px, py) {
    var d = L - V;
    if (d > 0) { g.fillStyle = "rgba(255, 255, 255, " + Math.min(.38, .16 + .07 * (d - 1)) + ")"; g.fillRect(px, py, t, t); }
    else if (d < 0) { g.fillStyle = "rgba(0, 0, 0, " + Math.min(.6, .2 * -d) + ")"; g.fillRect(px, py, t, t); }
    if (t < 8) return;
    var b = Math.max(2, t * .15);
    var viz = function (nx, ny) { var l = layerVisivel(nx, ny, V); return l == null ? 1 : l; };
    var cima = viz(x, y - 1), baixo = viz(x, y + 1), esq = viz(x - 1, y), dir = viz(x + 1, y);
    if (cima < L) { g.fillStyle = "rgba(255, 255, 255, .45)"; g.fillRect(px, py, t, b); } else if (cima > L) { g.fillStyle = "rgba(0, 0, 0, .34)"; g.fillRect(px, py, t, b * 1.2); }
    if (esq < L) { g.fillStyle = "rgba(255, 255, 255, .3)"; g.fillRect(px, py, b, t); } else if (esq > L) { g.fillStyle = "rgba(0, 0, 0, .24)"; g.fillRect(px, py, b, t); }
    if (baixo < L) { g.fillStyle = "rgba(40, 26, 10, .42)"; g.fillRect(px, py + t - b, t, b); } else if (baixo > L) { g.fillStyle = "rgba(255, 255, 255, .12)"; g.fillRect(px, py + t - b * .5, t, b * .5); }
    if (dir < L) { g.fillStyle = "rgba(40, 26, 10, .3)"; g.fillRect(px + t - b, py, b, t); }
    if (d > 0 && t >= 12) {   // tracinho de "terreno mais alto que você"
      g.fillStyle = "rgba(60, 40, 20, .2)";
      g.beginPath(); g.moveTo(px + t * .32, py + t * .62); g.lineTo(px + t * .5, py + t * .4); g.lineTo(px + t * .68, py + t * .62); g.closePath(); g.fill();
    }
  }
  // Escadas: de mão (dois trilhos e degraus) ou degraus/rampa (faixas que sobem).
  function pintarEscada(g, x, y, v, t, px, py) {
    if (v.r === "escada-mao") {
      g.strokeStyle = "rgba(92, 58, 26, .95)"; g.lineWidth = Math.max(1.5, t * .09); g.lineCap = "round";
      g.beginPath(); g.moveTo(px + t * .28, py + t * .08); g.lineTo(px + t * .28, py + t * .92); g.moveTo(px + t * .72, py + t * .08); g.lineTo(px + t * .72, py + t * .92); g.stroke();
      g.lineWidth = Math.max(1, t * .07);
      g.beginPath(); for (var i = 0; i < 4; i++) { var yy = py + t * (.2 + i * .2); g.moveTo(px + t * .28, yy); g.lineTo(px + t * .72, yy); } g.stroke();
      g.lineCap = "butt";
    } else {
      for (var k = 0; k < 4; k++) {
        g.fillStyle = "rgba(0, 0, 0, " + (.06 + k * .07) + ")"; g.fillRect(px, py + t * k / 4, t, t / 4);
        g.fillStyle = "rgba(255, 255, 255, .35)"; g.fillRect(px, py + t * k / 4, t, Math.max(1, t * .04));
      }
    }
  }
  function pintarCelula(g, x, y, v, t, px, py, L, V) {
    if (L == null) L = ui.layer;
    if (V == null) V = L;
    if (v.t === "espaco") {
      g.fillStyle = v.c; g.fillRect(px, py, t, t);
      if (v.r === "agua" && t >= 6) {   // água: a cor do bloco continua; só as ondinhas e a beirada ficam azuis
        g.strokeStyle = "rgba(47, 127, 200, .85)"; g.lineWidth = Math.max(1, t * .06); g.lineCap = "round";
        for (var o = 0; o < 2; o++) {
          var wx = px + t * (.12 + ruido(x, y, 11 + o) * .3), wy = py + t * (.32 + o * .36);   // ondinha sempre dentro do bloco
          g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + t * .1, wy - t * .1, wx + t * .2, wy); g.quadraticCurveTo(wx + t * .3, wy + t * .1, wx + t * .4, wy); g.stroke();
        }
        g.lineCap = "butt";
        var bw = Math.max(1, t * .06);
        g.fillStyle = "rgba(47, 127, 200, .75)";
        if (relevoEm(x, y - 1, L) !== "agua") g.fillRect(px, py, t, bw);
        if (relevoEm(x, y + 1, L) !== "agua") g.fillRect(px, py + t - bw, t, bw);
        if (relevoEm(x - 1, y, L) !== "agua") g.fillRect(px, py, bw, t);
        if (relevoEm(x + 1, y, L) !== "agua") g.fillRect(px + t - bw, py, bw, t);
      }
      if (v.r === "escada-mao" || v.r === "escada-degraus") pintarEscada(g, x, y, v, t, px, py);
      sombrearAltura(g, x, y, L, V, t, px, py);
      return;
    }
    if (v.t === "parede") {
      g.fillStyle = corParede(v.c); g.fillRect(px, py, t + 1, t + 1);
      if (t >= 8) {   // sem tijolos: o relevo só aparece na borda de fora da parede (onde o vizinho não é parede)
        if (!paredeEm(x, y - 1, L)) { g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(px, py, t, t * .12); }
        if (!paredeEm(x, y + 1, L)) { g.fillStyle = "rgba(0,0,0,.26)"; g.fillRect(px, py + t * .86, t, t * .14); }
        if (!paredeEm(x - 1, y, L)) { g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(px, py, t * .1, t); }
        if (!paredeEm(x + 1, y, L)) { g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(px + t * .9, py, t * .1, t); }
      }
      var dd = L - V;   // parede de outro layer: mais clara (acima) ou mais escura (abaixo)
      if (dd > 0) { g.fillStyle = "rgba(255, 255, 255, " + Math.min(.3, .12 * dd) + ")"; g.fillRect(px, py, t + 1, t + 1); }
      else if (dd < 0) { g.fillStyle = "rgba(0, 0, 0, " + Math.min(.55, .18 * -dd) + ")"; g.fillRect(px, py, t + 1, t + 1); }
      return;
    }
    if (v.t === "terra") {
      pintarTerra(g, x, y, t, px, py);
      sombrearAltura(g, x, y, L, V, t, px, py);
      return;
    }
  }
  function pintarTerra(g, x, y, t, px, py) {
    {
      g.fillStyle = "#7A5634"; g.fillRect(px, py, t, t);
      for (var i = 0; i < 6; i++) {
        var rx = ruido(x, y, i), ry = ruido(x, y, i + 9), rr = ruido(x, y, i + 21);
        g.fillStyle = i % 3 === 0 ? "rgba(40, 24, 10, .55)" : i % 3 === 1 ? "rgba(150, 110, 70, .55)" : "rgba(30, 20, 14, .4)";
        g.beginPath(); g.arc(px + rx * t, py + ry * t, Math.max(1, t * (.05 + rr * .1)), 0, Math.PI * 2); g.fill();
      }
      if (ruido(x, y, 40) > .55 && t >= 10) {
        g.strokeStyle = "rgba(25, 14, 6, .6)"; g.lineWidth = Math.max(1, t * .05);
        g.beginPath(); g.moveTo(px + t * .1, py + t * ruido(x, y, 41)); g.lineTo(px + t * .5, py + t * ruido(x, y, 42)); g.lineTo(px + t * .9, py + t * ruido(x, y, 43)); g.stroke();
      }
    }
  }
  var imgFundo = null, imgFundoSrc = "";
  function fundoImagem() {
    if (!mapa.fundo) return null;
    if (imgFundoSrc !== mapa.fundo.src) { imgFundoSrc = mapa.fundo.src; imgFundo = new Image(); imgFundo.onload = pedirDesenho; imgFundo.src = mapa.fundo.src; }
    return imgFundo && imgFundo.complete && imgFundo.naturalWidth ? imgFundo : null;
  }
  // Desenha o mapa num contexto qualquer (tela ou exportação). opts: { x0, y0, x1, y1 (blocos), t (px por bloco), ox, oy, vazio, grade }
  function desenharMapa(g, o) {
    var t = o.t;
    if (o.vazio) { g.fillStyle = o.vazio; g.fillRect(o.ox + o.x0 * t, o.oy + o.y0 * t, (o.x1 - o.x0) * t, (o.y1 - o.y0) * t); }
    var img = fundoImagem();
    if (img) {
      var f = mapa.fundo, esc = t / f.porCel;
      g.imageSmoothingEnabled = true;
      g.drawImage(img, o.ox + f.x * t, o.oy + f.y * t, img.naturalWidth * esc, img.naturalHeight * esc);
    }
    // espaço e terra primeiro; a grade passa por cima deles; as paredes vêm depois, inteiras (sem a grade cortando)
    // em cada lugar aparece o bloco que quem olha (layer V) enxerga: o mais alto até V, ou o terreno alto acima
    var paredes = [], V = o.V == null ? layerDaVista() : o.V, soAte = o.soAte == null ? !vistaDeJogador() : o.soAte;
    var marcas = o.marcas === false ? null : new Map();   // escadas que sobem / descem a partir de V (setinhas)
    var desenhados = [];   // [x, y, cor] dos blocos pintados (para a borda fina em volta deles)
    var vistos = new Map();
    mapa.celulas.forEach(function (v, k) {
      var p = partes(k);
      if (p.x < o.x0 || p.x >= o.x1 || p.y < o.y0 || p.y >= o.y1) return;
      var kk = chave(p.x, p.y);
      if (vistos.has(kk)) return;
      vistos.set(kk, true);
      if (previa && previa.cel.has(kk)) return;
      var b = blocoVisivel(p.x, p.y, V, soAte);
      if (!b) return;
      if (b.v.t === "parede") { paredes.push([p.x, p.y, b.v, b.L]); return; }
      // escada que chega aqui de baixo (topo dela = V): aparece clara, como parte deste andar
      var topo = ehEscada(b.v) && b.L === V - 1;
      pintarCelula(g, p.x, p.y, b.v, t, Math.floor(o.ox + p.x * t), Math.floor(o.oy + p.y * t), topo ? V : b.L, V);
      desenhados.push([p.x, p.y, b.v.t === "terra" ? "#7A5634" : b.v.c]);
      if (marcas && ehEscada(b.v) && (b.L === V || topo)) marcas.set(kk, b.L === V ? "sobe" : "desce");
    });
    if (previa) {
      g.globalAlpha = .65;
      previa.cel.forEach(function (v, k) { var p = partes(k); if (v) pintarCelula(g, p.x, p.y, v, t, Math.floor(o.ox + p.x * t), Math.floor(o.oy + p.y * t), ui.layer, V); else { g.fillStyle = "rgba(224, 69, 90, .45)"; g.fillRect(Math.floor(o.ox + p.x * t), Math.floor(o.oy + p.y * t), t, t); } });
      (previa.cel.muros || []).forEach(function (k) { var q = k.split(","), qx = o.ox + +q[0] * t, qy = o.oy + +q[1] * t; g.strokeStyle = corParede(mapa.cor); g.lineWidth = Math.max(2.2, t * .12); g.beginPath(); if (q[3] === "h") { g.moveTo(qx, qy); g.lineTo(qx + t, qy); } else { g.moveTo(qx, qy); g.lineTo(qx, qy + t); } g.stroke(); });
      g.globalAlpha = 1;
    }
    if (o.grade && mapa.grade.on && t >= 5) {
      var esp = espessura(mapa.grade.esp), meio = Math.round(esp) % 2 ? .5 : 0;   // linhas ímpares no meio do pixel ficam nítidas
      g.strokeStyle = mapa.grade.cor; g.lineWidth = esp;
      g.beginPath();
      for (var x = o.x0; x <= o.x1; x++) { var X = Math.round(o.ox + x * t) + meio; g.moveTo(X, o.oy + o.y0 * t); g.lineTo(X, o.oy + o.y1 * t); }
      for (var y = o.y0; y <= o.y1; y++) { var Y = Math.round(o.oy + y * t) + meio; g.moveTo(o.ox + o.x0 * t, Y); g.lineTo(o.ox + o.x1 * t, Y); }
      g.stroke();
    }
    paredes.forEach(function (p) { pintarCelula(g, p[0], p[1], p[2], t, Math.floor(o.ox + p[0] * t), Math.floor(o.oy + p[1] * t), p[3], V); });
    desenharMuros(g, o, t, V, desenhados, soAte);
    if (marcas && marcas.size && t >= 10) setasDeEscada(g, marcas, t, o);
  }
  // Paredes finas: a borda dos blocos que dá para o vazio e as paredes que o mestre pôs nas beiradas, mais escuras que a cor do bloco.
  function desenharMuros(g, o, t, V, desenhados, soAte) {
    var eb = Math.max(1.5, t * .085), em = Math.max(2.2, t * .12);
    g.lineCap = "square";
    desenhados.forEach(function (d) {
      var x = d[0], y = d[1], px = o.ox + x * t, py = o.oy + y * t;
      var lados = [[0, -1, px, py, px + t, py], [0, 1, px, py + t, px + t, py + t], [-1, 0, px, py, px, py + t], [1, 0, px + t, py, px + t, py + t]];
      lados.forEach(function (l) {
        if (coluna(x + l[0], y + l[1])) return;
        var dentro = eb / 2;   // a linha fica do lado de dentro do bloco
        g.strokeStyle = corParede(d[2]); g.lineWidth = eb;
        g.beginPath(); g.moveTo(l[2] - l[0] * dentro, l[3] - l[1] * dentro); g.lineTo(l[4] - l[0] * dentro, l[5] - l[1] * dentro); g.stroke();
      });
    });
    mapa.muros.forEach(function (v, k) {
      var p = k.split(","), x = +p[0], y = +p[1], L = +p[2], hor = p[3] === "h";
      if (x < o.x0 - 1 || x > o.x1 + 1 || y < o.y0 - 1 || y > o.y1 + 1) return;
      var ax = hor ? x : x - 1, ay = hor ? y - 1 : y;
      var la = layerVisivel(x, y, V), lb = layerVisivel(ax, ay, V);
      if (L > V || (la !== L && lb !== L)) return;   // só a parede do andar que aparece
      var b = blocoVisivel(x, y, V) || blocoVisivel(ax, ay, V), cor = b ? (b.v.t === "terra" ? "#7A5634" : b.v.c) : mapa.cor;
      var px = o.ox + x * t, py = o.oy + y * t;
      g.strokeStyle = corParede(cor); g.lineWidth = em;
      g.beginPath(); if (hor) { g.moveTo(px, py); g.lineTo(px + t, py); } else { g.moveTo(px, py); g.lineTo(px, py + t); } g.stroke();
    });
    if (podeEditar && bordaHover && !arrasto && o.marcas !== false) {   // beirada sob o mouse (caneta → parede fina)
      var q = bordaHover.split(","), qx = o.ox + +q[0] * t, qy = o.oy + +q[1] * t;
      g.strokeStyle = mapa.muros.has(bordaHover) ? "rgba(224, 69, 90, .9)" : "rgba(29, 63, 168, .8)"; g.lineWidth = em + 2; g.lineCap = "round";
      g.beginPath(); if (q[3] === "h") { g.moveTo(qx, qy); g.lineTo(qx + t, qy); } else { g.moveTo(qx, qy); g.lineTo(qx, qy + t); } g.stroke();
    }
    g.lineCap = "butt";
  }
  // Setinhas das escadas: para cima (sobe a partir daqui) ou para baixo (desce daqui). Escadas juntas (um bloco
  // de degraus, várias escadas lado a lado) ganham um símbolo só, no meio; se o grupo sobe e desce, ⇅.
  function setasDeEscada(g, marcas, t, o) {
    var feito = new Set();
    marcas.forEach(function (tipo, k) {
      if (feito.has(k)) return;
      var grupo = [], fila = [k], tipos = {};
      feito.add(k);
      while (fila.length) {
        var at = fila.pop(), p = partes(at);
        grupo.push(p); tipos[marcas.get(at)] = true;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nk = chave(p.x + d[0], p.y + d[1]);
          if (marcas.has(nk) && !feito.has(nk)) { feito.add(nk); fila.push(nk); }
        });
      }
      var tp = tipos.sobe && tipos.desce ? "ambos" : tipos.sobe ? "sobe" : "desce";
      var cx = 0, cy = 0; grupo.forEach(function (q) { cx += q.x + .5; cy += q.y + .5; }); cx /= grupo.length; cy /= grupo.length;
      var x, y, r;
      if (grupo.length === 1) { x = o.ox + (cx + .3) * t; y = o.oy + (cy - .3) * t; r = Math.max(5, t * .17); }
      else { x = o.ox + cx * t; y = o.oy + cy * t; r = Math.max(7, t * .27); }
      seloEscada(g, x, y, r, tp);
    });
  }
  function seloEscada(g, x, y, r, tipo) {
    g.fillStyle = tipo === "sobe" ? "#2E9E6E" : tipo === "desce" ? "#8A5A2B" : "#1D3FA8";
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = Math.max(1.2, r * .18); g.stroke();
    g.fillStyle = "#fff";
    var seta = function (cima, dx, esc) {
      var w = r * .48 * esc, h = r * .5 * esc;
      g.beginPath();
      if (cima) { g.moveTo(x + dx, y - h); g.lineTo(x + dx + w, y + h * .2); g.lineTo(x + dx - w, y + h * .2); }
      else { g.moveTo(x + dx, y + h); g.lineTo(x + dx + w, y - h * .2); g.lineTo(x + dx - w, y - h * .2); }
      g.closePath(); g.fill();
    };
    if (tipo === "ambos") { seta(true, -r * .3, .72); seta(false, r * .3, .72); }
    else seta(tipo === "sobe", 0, 1);
  }
  function desenhar() {
    pendente = false;
    if (!raiz.isConnected || !tela.clientWidth) return;
    if (ui.verComo && !vendoComo()) verComo(null);   // o token escolhido no olho saiu do mapa
    if (sessao) prender();
    var g = ctx, W = tela.clientWidth, H = tela.clientHeight, t = tam();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var a = telaParaMundo(0, 0), b = telaParaMundo(W, H);
    var faixa = { x0: Math.floor(a.x), y0: Math.floor(a.y), x1: Math.ceil(b.x), y1: Math.ceil(b.y) };
    var L = limiteVista();
    if (L) {
      // fora da borda: escuro; dentro: o papel do mapa
      g.fillStyle = "#11162C"; g.fillRect(0, 0, W, H);
      faixa = { x0: Math.max(faixa.x0, L.x0), y0: Math.max(faixa.y0, L.y0), x1: Math.min(faixa.x1, L.x1), y1: Math.min(faixa.y1, L.y1) };
      g.save(); g.beginPath(); g.rect(vis.ox + L.x0 * t, vis.oy + L.y0 * t, (L.x1 - L.x0) * t, (L.y1 - L.y0) * t); g.clip();
      g.fillStyle = mapa.papel || PAPEL_PADRAO; g.fillRect(vis.ox + L.x0 * t, vis.oy + L.y0 * t, (L.x1 - L.x0) * t, (L.y1 - L.y0) * t);
    } else {   // papel vazio: a cor escolhida pelo mestre ou o padrão (que sai transparente no PNG)
      g.fillStyle = PAPEL_PADRAO; g.fillRect(0, 0, W, H);
      if (mapa.papel) { g.fillStyle = mapa.papel; g.fillRect(0, 0, W, H); }
    }
    desenharMapa(g, { x0: faixa.x0, y0: faixa.y0, x1: faixa.x1, y1: faixa.y1, t: t, ox: vis.ox, oy: vis.oy, grade: true });
    if (sombrasLigadas()) desenharSombras(g, faixa, t);
    desenharNevoa(g, faixa, t);
    if (L) {
      g.restore();
      // moldura da borda do mapa
      g.strokeStyle = "rgba(201, 162, 39, .85)"; g.lineWidth = 2;
      g.strokeRect(vis.ox + L.x0 * t - 1, vis.oy + L.y0 * t - 1, (L.x1 - L.x0) * t + 2, (L.y1 - L.y0) * t + 2);
    }
    desenharRecortes(g, t);
    // contorno da forma sendo arrastada
    if (previa && previa.caixa) {
      var c = previa.caixa;
      g.strokeStyle = previa.apaga ? "#E0455A" : previa.explode ? "#E0642C" : "rgba(29, 63, 168, .9)"; g.setLineDash([6, 4]); g.lineWidth = 2;
      if (previa.forma === "circulo") { g.beginPath(); g.ellipse(vis.ox + (c.x0 + c.x1 + 1) / 2 * t, vis.oy + (c.y0 + c.y1 + 1) / 2 * t, (c.x1 - c.x0 + 1) / 2 * t, (c.y1 - c.y0 + 1) / 2 * t, 0, 0, Math.PI * 2); g.stroke(); }
      else g.strokeRect(vis.ox + c.x0 * t, vis.oy + c.y0 * t, (c.x1 - c.x0 + 1) * t, (c.y1 - c.y0 + 1) * t);
      g.setLineDash([]);
    }
    // contorno da explosão em cone ou círculo
    if (previa && previa.area) {
      var ar = previa.area, ex0 = vis.ox + (ar.ini.x + .5) * t, ey0 = vis.oy + (ar.ini.y + .5) * t;
      var RR = Math.max(.5, Math.hypot(ar.fim.x - ar.ini.x, ar.fim.y - ar.ini.y)) * t;
      g.strokeStyle = "#E0642C"; g.lineWidth = 2.5; g.setLineDash([7, 4]);
      g.beginPath();
      if (ar.tipo === "circulo") g.arc(ex0, ey0, RR, 0, Math.PI * 2);
      else { var edir = Math.atan2(ar.fim.y - ar.ini.y, ar.fim.x - ar.ini.x), emeia = ar.ang / 2 * Math.PI / 180; g.moveTo(ex0, ey0); g.arc(ex0, ey0, RR, edir - emeia, edir + emeia); g.closePath(); }
      g.stroke(); g.setLineDash([]);
      g.fillStyle = "#E0642C"; g.beginPath(); g.arc(ex0, ey0, Math.max(4, t * .16), 0, Math.PI * 2); g.fill();
    }
    // régua
    if (regua.ini) {
      var cx0 = vis.ox + (regua.ini.x + .5) * t, cy0 = vis.oy + (regua.ini.y + .5) * t;
      g.fillStyle = "rgba(224, 69, 90, .25)"; g.fillRect(vis.ox + regua.ini.x * t, vis.oy + regua.ini.y * t, t, t);
      if (regua.fim && ui.sub.regua !== "linha") {
        // área do cone ou do círculo: blocos pintados de leve e o contorno exato da forma
        g.fillStyle = "rgba(224, 69, 90, .2)";
        blocosDaRegua().forEach(function (p) { g.fillRect(vis.ox + p[0] * t, vis.oy + p[1] * t, t, t); });
        var R = Math.hypot(regua.fim.x - regua.ini.x, regua.fim.y - regua.ini.y) * t;
        g.strokeStyle = "#E0455A"; g.lineWidth = 2.5; g.fillStyle = "rgba(224, 69, 90, .12)";
        g.beginPath();
        if (ui.sub.regua === "circulo") g.arc(cx0, cy0, R, 0, Math.PI * 2);
        else { var dir = Math.atan2(regua.fim.y - regua.ini.y, regua.fim.x - regua.ini.x), meia = ui.angulo / 2 * Math.PI / 180; g.moveTo(cx0, cy0); g.arc(cx0, cy0, R, dir - meia, dir + meia); g.closePath(); }
        g.fill(); g.stroke();
        var cxm = vis.ox + (regua.fim.x + .5) * t, cym = vis.oy + (regua.fim.y + .5) * t;
        g.setLineDash([6, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cxm, cym); g.stroke(); g.setLineDash([]);
      } else if (regua.fim) {
        var cx1 = vis.ox + (regua.fim.x + .5) * t, cy1 = vis.oy + (regua.fim.y + .5) * t;
        g.fillRect(vis.ox + regua.fim.x * t, vis.oy + regua.fim.y * t, t, t);
        g.strokeStyle = "#E0455A"; g.lineWidth = 3; g.setLineDash([8, 5]);
        g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx1, cy1); g.stroke(); g.setLineDash([]);
      }
      g.fillStyle = "#E0455A"; g.beginPath(); g.arc(cx0, cy0, Math.max(5, t * .2), 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
    }
    var sonares = [];   // Sensor de Presença: tokens escondidos perto de quem olha pulsam em vermelho
    // tokens (o que está sendo arrastado vai por último, com a sombra no bloco onde vai pousar)
    // os maiores primeiro: os pequenos ficam por cima
    mapa.tokens.slice().sort(function (a, b) { return escalaTk(b) - escalaTk(a); }).forEach(function (tk) {
      if (arrasto && arrasto.tipo === "token" && arrasto.token === tk) return;
      if (!tokenAparece(tk)) { if (sonarDe(tk)) sonares.push(tk); return; }
      var c = centroTk(tk, tk.x, tk.y);
      desenharToken(g, tk, vis.ox + c.x * t, vis.oy + c.y * t, t * escalaTk(tk), 1, false, celCentro(tk, tk.x, tk.y));
      desenharLuz(g, tk, t);
      if (podeEditar && !vendoComo() && sombrasLigadas() && t >= 12) {   // mestre: nenhum jogador vê este token
        var vv = visaoAtual();
        if (vv && !vv.tokens.has(tk.id)) { var R = t * escalaTk(tk) * .44; olhoFechado(g, vis.ox + c.x * t - R * .74, vis.oy + c.y * t - R * .74, Math.max(6, t * .17)); }
      }
    });
    if (sonares.length) desenharSonares(g, sonares, t);
    desenharTextos(g, t);
    if (soltando) {
      var ls = ladoTk(soltando.token), cs = centroTk(soltando.token, soltando.x, soltando.y);
      g.fillStyle = soltando.ok ? "rgba(0, 0, 0, .18)" : "rgba(224, 69, 90, .35)";
      g.fillRect(vis.ox + soltando.x * t, vis.oy + soltando.y * t, t * ls, t * ls);
      if (soltando.ok) desenharToken(g, soltando.token, vis.ox + cs.x * t, vis.oy + cs.y * t, t * escalaTk(soltando.token), .45, false, celCentro(soltando.token, soltando.x, soltando.y));
    }
    if (arrasto && arrasto.tipo === "token") {
      var alvo = arrasto.alvo;
      var la = ladoTk(arrasto.token), ea = escalaTk(arrasto.token);
      if (alvo) {
        var ca = centroTk(arrasto.token, alvo.x, alvo.y);
        g.fillStyle = "rgba(0, 0, 0, .18)"; g.fillRect(vis.ox + alvo.x * t, vis.oy + alvo.y * t, t * la, t * la);
        desenharToken(g, arrasto.token, vis.ox + ca.x * t, vis.oy + ca.y * t, t * ea, .35, false, celCentro(arrasto.token, alvo.x, alvo.y));
      }
      var off = arrasto.off || { x: 0, y: 0 };
      desenharToken(g, arrasto.token, arrasto.px - off.x * t, arrasto.py - off.y * t - t * .45, t * ea * 1.1, 1, true);   // erguido acima do dedo/mouse, para a sombra aparecer
    }
  }
  // Retratos dos personagens (imagens carregadas uma vez só)
  var imagens = {};
  function imagem(src) {
    if (!src) return null;
    var i = imagens[src];
    if (!i) { i = imagens[src] = new Image(); i.onload = pedirDesenho; i.src = src; }
    return i.complete && i.naturalWidth ? i : null;
  }
  function infoToken(tk) { return tk.personagem_id && opts.retrato ? opts.retrato(tk) : null; }
  // Token de personagem: o retrato num círculo com borda prateada (ou da cor que o jogador escolheu).
  function desenharRetrato(g, tk, info, cx, cy, t, alfa, erguido, borda) {
    var r = t * .44, anel = Math.max(2, t * .085);
    g.globalAlpha = alfa;
    if (erguido) { g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(cx + t * .08, cy + t * .14, r, r * .9, 0, 0, Math.PI * 2); g.fill(); }
    if (borda) {   // cor escolhida, com brilho de metal por cima
      g.fillStyle = borda; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      var brilho = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      brilho.addColorStop(0, "rgba(255,255,255,.55)"); brilho.addColorStop(.45, "rgba(255,255,255,.05)"); brilho.addColorStop(1, "rgba(0,0,0,.3)");
      g.fillStyle = brilho; g.fill();
    } else {
      var prata = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      prata.addColorStop(0, "#FBFCFD"); prata.addColorStop(.3, "#A7AEB7"); prata.addColorStop(.5, "#EEF1F4"); prata.addColorStop(.72, "#7C848E"); prata.addColorStop(1, "#D8DCE1");
      g.fillStyle = prata; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    }
    var ri = r - anel;
    g.save(); g.beginPath(); g.arc(cx, cy, ri, 0, Math.PI * 2); g.clip();
    var img = imagem(info.src);
    if (img) {
      var lado = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) / 4;
      g.drawImage(img, sx, sy, lado, lado, cx - ri, cy - ri, ri * 2, ri * 2);
    } else {
      g.fillStyle = "#2A3354"; g.fillRect(cx - ri, cy - ri, ri * 2, ri * 2);
      if (t >= 14) { g.fillStyle = "#E6E9EE"; g.font = "700 " + Math.round(ri * 1.05) + "px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(((info.nome || "?").trim().charAt(0) || "?").toUpperCase(), cx, cy + 1); }
    }
    g.restore();
    g.strokeStyle = "rgba(20, 24, 32, .55)"; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, r + .5, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, ri, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  }
  var AGUA_BORDA = "#56B4F0";
  // Token com o efeito do lugar onde está: voando (mais alto, com sombra); num layer acima de quem olha (seta para cima);
  // abaixo (meio apagado, seta para baixo); água (borda azul, filtro e bolha; submerso = mais fundo e mais bolhas).
  function desenharToken(g, tk, cx, cy, t, alfa, erguido, cel) {
    if (erguido) return desenharTokenBase(g, tk, cx, cy, t, alfa, true, tk.borda);
    cel = cel || tk;
    var zt = cel.z != null ? cel.z : layerTk(tk), dz = zt - layerDaVista();
    var rel = relevoEm(cel.x, cel.y, zt), voa = !!tk.voando, agua = rel === "agua" && !voa, sub = agua && !!tk.submerso, baixo = dz < 0;
    var R = t * .44;
    if (voa) {   // sombra no chão; o token fica mais acima
      g.globalAlpha = alfa * .32; g.fillStyle = "#000"; g.beginPath(); g.ellipse(cx, cy + t * .28, R * .78, R * .3, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      cy -= t * .18;
    }
    if (baixo) cy += t * .06;
    desenharTokenBase(g, tk, cx, cy, t, baixo ? alfa * .55 : sub ? alfa * .8 : alfa, false, agua ? AGUA_BORDA : tk.borda);
    if (baixo || agua) {
      g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
      if (baixo) { g.fillStyle = "rgba(10, 12, 24, " + (.38 * alfa) + ")"; g.fillRect(cx - R, cy - R * .1, R * 2, R * 1.2); }
      else if (sub) { g.fillStyle = "rgba(40, 130, 210, " + (.5 * alfa) + ")"; g.fillRect(cx - R, cy - R, R * 2, R * 2); }
      else { g.fillStyle = "rgba(60, 150, 225, " + (.42 * alfa) + ")"; g.fillRect(cx - R, cy + R * .15, R * 2, R); }   // na superfície: só a parte de baixo
      g.restore();
    }
    if (agua && t >= 10) {   // bolhas ao lado
      var bolha = function (bx, by, br) { g.globalAlpha = alfa; g.fillStyle = "rgba(210, 238, 255, .45)"; g.strokeStyle = "rgba(255, 255, 255, .95)"; g.lineWidth = Math.max(1, t * .03); g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); g.stroke(); g.globalAlpha = 1; };
      bolha(cx + R * 1.12, cy - R * .1, t * .085);
      if (sub) { bolha(cx + R * 1.3, cy - R * .62, t * .055); bolha(cx + R * 1.05, cy - R * 1.0, t * .04); }
    }
    if (t >= 12 && dz) selo(g, cx + R * .74, cy - R * .74, Math.max(5, t * .15), dz > 0 ? "cima" : "baixo", alfa);
  }
  function selo(g, x, y, rr, tipo, alfa) {
    g.globalAlpha = alfa;
    g.fillStyle = tipo === "cima" ? "#2E9E6E" : "#6B4A2E"; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = Math.max(1.2, rr * .2); g.stroke();
    g.fillStyle = "#fff"; g.beginPath();
    if (tipo === "cima") { g.moveTo(x, y - rr * .55); g.lineTo(x + rr * .5, y + rr * .3); g.lineTo(x - rr * .5, y + rr * .3); }
    else { g.moveTo(x, y + rr * .55); g.lineTo(x + rr * .5, y - rr * .3); g.lineTo(x - rr * .5, y - rr * .3); }
    g.closePath(); g.fill(); g.globalAlpha = 1;
  }
  function desenharTokenBase(g, tk, cx, cy, t, alfa, erguido, borda) {
    var info = infoToken(tk);
    if (info) return desenharRetrato(g, tk, info, cx, cy, t, alfa, erguido, borda);
    var r = t * .4;
    g.globalAlpha = alfa;
    if (erguido) { g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(cx + t * .08, cy + t * .14, r, r * .9, 0, 0, Math.PI * 2); g.fill(); }
    var gr = g.createRadialGradient(cx - r * .35, cy - r * .35, r * .1, cx, cy, r);
    gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(.25, tk.cor); gr.addColorStop(1, "rgba(0,0,0,.55)");
    g.fillStyle = tk.cor; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = gr; g.globalAlpha = alfa * .55; g.fill(); g.globalAlpha = alfa;
    g.strokeStyle = borda || "#FFFFFF"; g.lineWidth = Math.max(1.5, t * (borda ? .1 : .07)); g.stroke();
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r + Math.max(1.5, t * .07) / 2 + .5, 0, Math.PI * 2); g.stroke();
    if (t >= 16) { g.fillStyle = "#fff"; g.font = "700 " + Math.round(t * .32) + "px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(tk.rot, cx, cy + 1); }
    g.globalAlpha = 1;
  }

  /* ---------- Formas (quadrado e círculo) ---------- */
  function caixaDe(a, b) { return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) }; }
  // Blocos da forma: { "x,y": { t, c } }. Círculo = elipse que cabe na caixa (círculo perfeito quando a caixa é quadrada).
  function blocosDaForma(forma, sub, c) {
    var out = new Map(), dentro = {};
    var cx = (c.x0 + c.x1 + 1) / 2, cy = (c.y0 + c.y1 + 1) / 2, rx = (c.x1 - c.x0 + 1) / 2, ry = (c.y1 - c.y0 + 1) / 2;
    function esta(x, y) {
      if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) return false;
      if (forma !== "circulo") return true;
      var dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
      return dx * dx + dy * dy <= 1.0001;
    }
    for (var y = c.y0; y <= c.y1; y++) for (var x = c.x0; x <= c.x1; x++) if (esta(x, y)) dentro[chave(x, y)] = true;
    // "borda": espaço com paredes finas em volta · "cheio": só as paredes finas (o contorno da forma)
    var espaco = espacoNovo(), muros = [];
    Object.keys(dentro).forEach(function (k) {
      var p = k.split(","), x = +p[0], y = +p[1];
      if (sub !== "cheio") out.set(k, espaco);
      if (sub === "vazio") return;
      if (!dentro[chave(x - 1, y)]) muros.push(chaveMuro(x, y, ui.layer, "v"));
      if (!dentro[chave(x + 1, y)]) muros.push(chaveMuro(x + 1, y, ui.layer, "v"));
      if (!dentro[chave(x, y - 1)]) muros.push(chaveMuro(x, y, ui.layer, "h"));
      if (!dentro[chave(x, y + 1)]) muros.push(chaveMuro(x, y + 1, ui.layer, "h"));
    });
    out.muros = muros;
    return out;
  }

  /* ---------- Ações nos blocos ---------- */
  // Espaço desenhado agora: com a cor e o relevo escolhidos (mediano = sem relevo).
  function espacoNovo() { var v = { t: "espaco", c: mapa.cor }; if (RELEVOS[ui.relevo]) v.r = ui.relevo; return v; }
  function pintar(x, y) {
    if (ui.ferramenta === "caneta") definir(x, y, espacoNovo());
    else if (ui.ferramenta === "borracha") { definir(x, y, null); bordasDo(x, y, ui.layer).forEach(function (k) { definirMuro(k, null); }); }
  }
  // As 4 bordas de um bloco (chaves de parede fina).
  function bordasDo(x, y, L) { return [chaveMuro(x, y, L, "h"), chaveMuro(x, y + 1, L, "h"), chaveMuro(x, y, L, "v"), chaveMuro(x + 1, y, L, "v")]; }
  function definirMuro(k, val) {
    var p = k.split(","); if (fora(+p[0], +p[1]) && fora(+p[0] - (p[3] === "v" ? 1 : 0), +p[1] - (p[3] === "h" ? 1 : 0))) return;
    var kk = "m:" + k;
    if (mudancaAtual && !mudancaAtual.has(kk)) mudancaAtual.set(kk, celLer(kk));
    celPor(kk, val ? true : null);
  }
  // Borda de bloco mais perto do ponto da tela (a menos de 30% de um bloco), no layer em que o mestre desenha.
  function bordaPerto(px, py) {
    var m = telaParaMundo(px, py), x = Math.floor(m.x), y = Math.floor(m.y), fx = m.x - x, fy = m.y - y;
    var op = [[fx, chaveMuro(x, y, ui.layer, "v")], [1 - fx, chaveMuro(x + 1, y, ui.layer, "v")], [fy, chaveMuro(x, y, ui.layer, "h")], [1 - fy, chaveMuro(x, y + 1, ui.layer, "h")]];
    op.sort(function (a, b) { return a[0] - b[0]; });
    return op[0][0] <= .3 ? op[0][1] : null;
  }
  var TERRA = { t: "terra", c: "#7A5634" };
  // Quadrado de blocos: todos (ou só a borda) com o mesmo valor (null = apagar).
  function blocosQuadrado(c, soBorda, val) {
    var out = new Map();
    for (var y = c.y0; y <= c.y1; y++) for (var x = c.x0; x <= c.x1; x++) {
      if (!soBorda || x === c.x0 || x === c.x1 || y === c.y0 || y === c.y1) out.set(chave(x, y), val);
    }
    return out;
  }
  // Ferramentas que se arrastam como uma caixa (quadrado, círculo, borracha em quadrado, explosão em quadrado).
  function usaCaixa() {
    var f = ui.ferramenta;
    return f === "quadrado" || f === "circulo" || (f === "borracha" && ui.sub.borracha !== "borracha") || (f === "explosao" && ui.sub.explosao === "quadrado");
  }
  function celsDaCaixa(cx) {
    if (ui.ferramenta === "borracha") return blocosQuadrado(cx, ui.sub.borracha === "vazio", null);
    if (ui.ferramenta === "explosao") return blocosQuadrado(cx, false, TERRA);
    return blocosDaForma(ui.ferramenta, ui.sub[ui.ferramenta], cx);
  }
  // Explosão em cone ou círculo: do bloco onde começou até o mouse (como a régua). Círculo de raio 0 = só o bloco.
  function previaExplosao(a, b) {
    var cel = new Map(), lista = blocosArea(a, b, ui.sub.explosao, ui.anguloExp);
    if (!lista.length && ui.sub.explosao === "circulo") lista = [[a.x, a.y]];
    lista.forEach(function (p) { cel.set(chave(p[0], p[1]), TERRA); });
    return { area: { ini: a, fim: b, tipo: ui.sub.explosao, ang: ui.anguloExp }, cel: cel };
  }
  // Linha de blocos entre dois pontos (para não deixar buracos quando o mouse anda rápido).
  function linha(a, b, fn) {
    var dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y), sx = a.x < b.x ? 1 : -1, sy = a.y < b.y ? 1 : -1, err = dx - dy, x = a.x, y = a.y;
    for (var n = 0; n < 4000; n++) { fn(x, y); if (x === b.x && y === b.y) break; var e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
  }

  /* ---------- Régua ---------- */
  var reguaT = null;
  // Régua em linha: cada passo reto vale 1 bloco e cada passo na diagonal vale 1,5.
  function distancia(a, b) { var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); return Math.max(dx, dy) + .5 * Math.min(dx, dy); }
  // Cone e círculo: distância de verdade (de centro a centro), arredondada para meio bloco.
  function raio(a, b) { return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 2) / 2; }
  function num(n) { return String(n).replace(".", ","); }
  // O mestre mede em blocos; o jogador, em metros (1 bloco = 1 metro).
  function medida(n) { return podeEditar ? num(n) + (n === 1 ? " bloco" : " blocos") : num(n) + " m"; }
  function textoArea(a, b, tipo, ang) {
    var r = raio(a, b);
    return tipo === "cone" ? "Cone de " + medida(r) + " · " + ang + "°" : "Raio de " + medida(r);
  }
  function textoRegua() {
    var a = regua.ini, b = regua.fim || regua.ini, tipo = ui.sub.regua;
    if (tipo === "cone") return textoArea(a, b, "cone", ui.angulo);
    if (tipo === "circulo") return textoArea(a, b, "circulo", ui.angulo);
    return medida(distancia(a, b));
  }
  // Blocos que a área do cone ou do círculo pega (centro do bloco dentro da forma).
  function blocosDaRegua() {
    if (!regua.ini || !regua.fim || ui.sub.regua === "linha") return [];
    return blocosArea(regua.ini, regua.fim, ui.sub.regua, ui.angulo);
  }
  // Blocos de um cone (com ângulo) ou círculo saindo de a até b. Serve à régua e à explosão.
  function blocosArea(a, b, tipo, angulo) {
    var out = [];
    var R = Math.hypot(b.x - a.x, b.y - a.y);
    if (!R) return out;
    var dir = Math.atan2(b.y - a.y, b.x - a.x), meia = angulo / 2 * Math.PI / 180, ri = Math.ceil(R);
    for (var y = a.y - ri; y <= a.y + ri; y++) for (var x = a.x - ri; x <= a.x + ri; x++) {
      var d = Math.hypot(x - a.x, y - a.y);
      if (d > R + 1e-6) continue;
      if (tipo === "cone") {
        if (!d) continue;
        var dif = Math.abs(Math.atan2(y - a.y, x - a.x) - dir); if (dif > Math.PI) dif = 2 * Math.PI - dif;
        if (dif > meia + 1e-6) continue;
      }
      out.push([x, y]);
    }
    return out;
  }
  function mostrarDica(px, py, txt) {
    dica.textContent = txt; dica.hidden = false;
    // não deixa a dica sair pela beirada (na caixa da Sessão o espaço é pequeno)
    var w = dica.offsetWidth, W = raiz.clientWidth;
    dica.style.left = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, px)) + "px"; dica.style.top = (py + 22) + "px";
  }

  /* ---------- Tokens ---------- */
  var CORES_TOKEN = ["#E0455A", "#2B63B5", "#2EC4A0", "#E9A23B", "#8A5CF5", "#E67E22"];
  function adicionarToken() {
    var c = celulaEm(tela.clientWidth / 2, tela.clientHeight / 2), n = mapa.tokens.filter(function (t) { return !t.personagem_id; }).length;
    // procura um bloco livre perto do centro
    var livre = function (x, y) { return pegadaLivre({}, x, y) != null && !mapa.tokens.some(function (t) { return t.x === x && t.y === y; }); };
    var x = c.x, y = c.y;
    outer: for (var raio = 0; raio < 20; raio++) for (var dy = -raio; dy <= raio; dy++) for (var dx = -raio; dx <= raio; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue;
      if (livre(c.x + dx, c.y + dy)) { x = c.x + dx; y = c.y + dy; break outer; }
    }
    var novo = { id: "t" + Date.now().toString(36), x: x, y: y, z: pegadaLivre({}, x, y) == null ? layerDaVista() : pegadaLivre({}, x, y), cor: CORES_TOKEN[n % CORES_TOKEN.length], rot: "T" + (n + 1) };
    mapa.tokens.push(novo);
    if (sessao) tokenMudou(novo); else salvarDepois();
    pedirDesenho();
    toast("Token " + "T" + (n + 1) + " no centro do mapa. Segure e arraste para mover.");
  }
  /* ---------- Andar entre layers ----------
     Andando: no mesmo layer passa por espaço, terra, água e escada; parede segura. Onde não há nada no layer,
     o token desce até o que estiver embaixo (chão = aquele layer; parede ou escada = em cima dela).
     Subir só por escada (Escalar) ou voando. Lugar sem nenhum bloco = chão do layer 1.
     Voando: passa por cima de tudo que estiver abaixo do layer em que voa; só a parede desse layer segura. */
  function ehEscada(v) { return !!v && v.t === "espaco" && (v.r === "escada-mao" || v.r === "escada-degraus"); }
  function temParede(x, y, L) { return paredeEm(x, y, L == null ? 1 : L); }
  function bloqueado(x, y) { return fora(x, y); }
  function suporteAbaixo(col, z) {
    if (!col) return null;
    for (var i = col.length - 1; i >= 0; i--) {
      var e = col[i];
      if (e.L >= z) continue;
      return e.v.t === "parede" || ehEscada(e.v) ? e.L + 1 : e.L;
    }
    return null;
  }
  function temAcima(col, z) { return !!col && col.some(function (e) { return e.L > z; }); }
  function temAte(col, z) { return !!col && col.some(function (e) { return e.L <= z; }); }
  // Layer em que o token fica ao chegar em (x, y) vindo do layer z (null = não passa).
  function passo(tk, x, y, z) {
    if (fora(x, y)) return null;
    var col = coluna(x, y), b = blocoEm(x, y, z);
    if (tk && tk.voando) {
      if (b && b.t === "parede") return null;
      if (!b && temAcima(col, z) && !temAte(col, z)) return null;   // dentro de um terreno mais alto
      return z;
    }
    if (b) return b.t === "parede" ? null : z;
    var sup = suporteAbaixo(col, z);
    if (sup != null) return sup;
    if (temAcima(col, z)) return null;          // terreno mais alto: só por escada ou voando
    if (mapa.celulas.size) return null;        // fora dos blocos desenhados não se anda (a borda deles é parede)
    return z >= 1 ? 1 : null;                  // mapa só de imagem: lugar vazio = chão do layer 1
  }
  // Onde um token novo fica, olhando do layer V (null = não dá para pôr aqui).
  function layerParaPor(x, y, V) {
    if (fora(x, y)) return null;
    var b = blocoEm(x, y, V);
    if (b) return b.t === "parede" ? null : V;
    var col = coluna(x, y), sup = suporteAbaixo(col, V);
    if (sup != null) return sup;
    if (temAcima(col, V)) return null;
    return mapa.celulas.size ? null : 1;   // fora dos blocos desenhados não dá para pôr token
  }
  // Pousar: cai do layer z até o que estiver embaixo (pode pousar em cima de parede).
  function layerDePouso(x, y, z) {
    var b = blocoEm(x, y, z);
    if (b && b.t !== "parede") return z;
    var sup = suporteAbaixo(coluna(x, y), z);
    if (sup != null) return sup;
    return z >= 1 ? 1 : z;
  }
  function motivoBloqueio(tk, x, y, z) {
    if (fora(x, y)) return "Borda do mapa";
    if (paredeEm(x, y, z)) return "Parede no caminho";
    if (mapa.celulas.size && !coluna(x, y) && !(tk && tk.voando)) return "Fora do mapa";
    return tk && tk.voando ? "Terreno mais alto: voe mais alto" : "Mais alto: suba por uma escada ou voe";
  }
  // Parede fina no caminho de um token (todos os blocos que ele ocupa, do bloco atual para o próximo).
  function pegadaBarrada(tk, ax, ay, bx, by, L) {
    var l = ladoTk(tk);
    for (var j = 0; j < l; j++) for (var i = 0; i < l; i++) if (passoBarrado(ax + i, ay + j, bx + i, by + j, L)) return true;
    return false;
  }
  // Andar até o mouse, bloco a bloco: para no primeiro bloqueio (nem passa espremido na diagonal entre dois).
  function andar(de, para, tk) {
    var atual = { x: de.x, y: de.y, z: de.z == null ? layerTk(tk) : de.z };
    linha(de, para, function (x, y) {
      if (atual.parou || (x === de.x && y === de.y)) return;
      var dx = x - atual.x, dy = y - atual.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { atual.parou = true; return; }
      var nz = passoPegada(tk, x, y, atual.z);
      if (nz != null && !(tk && tk.voando) && pegadaBarrada(tk, atual.x, atual.y, x, y, atual.z)) { atual.parou = true; atual.muro = true; return; }
      if (nz == null || (dx && dy && passoPegada(tk, atual.x + dx, atual.y, atual.z) == null && passoPegada(tk, atual.x, atual.y + dy, atual.z) == null)) { atual.parou = true; return; }
      atual.x = x; atual.y = y; atual.z = nz;
    });
    return { x: atual.x, y: atual.y, z: atual.z };
  }
  function podeMover(tk) { return !sessao || podeEditar || (opts.podeMover ? !!opts.podeMover(tk) : false); }
  /* Tamanho do token: escala do desenho (0,5 no pequeno) e lado em blocos que ele ocupa (no mínimo 1). */
  function escalaTk(tk) { var v = opts.tamanho ? Number(opts.tamanho(tk)) : 1; return v > 0 ? v : 1; }
  function ladoTk(tk) { return Math.max(1, Math.ceil(escalaTk(tk))); }
  function centroTk(tk, x, y) { var l = ladoTk(tk); return { x: x + l / 2, y: y + l / 2 }; }
  function celCentro(tk, x, y) { var c = centroTk(tk, x, y); return { x: Math.floor(c.x - .01), y: Math.floor(c.y - .01) }; }
  // Canto do token quando o ponto (mundo) fica no meio dele.
  function cantoEm(tk, mx, my) { var l = ladoTk(tk); return { x: Math.floor(mx - l / 2 + .5), y: Math.floor(my - l / 2 + .5) }; }
  // Token grande: todos os blocos que ele ocupa precisam deixar passar; o layer final é o do bloco do meio.
  function passoPegada(tk, x, y, z) {
    var l = ladoTk(tk), cm = Math.floor((l - 1) / 2), res = null;
    for (var j = 0; j < l; j++) for (var i = 0; i < l; i++) {
      var r = passo(tk, x + i, y + j, z);
      if (r == null) return null;
      if (i === cm && j === cm) res = r;
    }
    return res;
  }
  function motivoPegada(tk, x, y, z) {
    var l = ladoTk(tk);
    for (var j = 0; j < l; j++) for (var i = 0; i < l; i++) if (passo(tk, x + i, y + j, z) == null) return motivoBloqueio(tk, x + i, y + j, z);
    return "";
  }
  // Layer onde um token novo cabe aqui (todos os blocos dele no mesmo layer), ou null.
  function pegadaLivre(tk, x, y, V) {
    var l = ladoTk(tk), z = null;
    for (var j = 0; j < l; j++) for (var i = 0; i < l; i++) {
      var r = layerParaPor(x + i, y + j, V == null ? layerDaVista() : V);
      if (r == null || (z != null && r !== z)) return null;
      z = r;
    }
    return z;
  }
  // Token embaixo do mouse que esta pessoa pode mover (na Sessão o jogador só pega o próprio).
  function tokenEm(px, py) {
    var m = telaParaMundo(px, py);
    for (var i = mapa.tokens.length - 1; i >= 0; i--) {
      var tk = mapa.tokens[i], c = centroTk(tk, tk.x, tk.y), dx = m.x - c.x, dy = m.y - c.y, r = Math.max(.3, .45 * escalaTk(tk));
      if (!podeMover(tk)) continue;
      if (dx * dx + dy * dy <= r * r) return tk;
    }
    return null;
  }

  /* ---------- Sombras: o que os tokens dos jogadores enxergam ----------
     Ligadas pelo mestre (engrenagem). Cada jogador só vê o que o próprio token vê; o mestre vê tudo, com o que
     nenhum jogador vê meio apagado e um olho fechado nos tokens que nenhum jogador está vendo (NPC não conta).
     A visão é uma linha reta do olho do token (altura do layer + 0,6) até o ponto olhado (altura de alguém em pé
     ali), que não pode atravessar: parede (ocupa a altura do layer dela até o de cima) · o chão de um layer acima
     de quem olha (uma laje fina) · o terreno sólido embaixo do bloco mais baixo de cada lugar, quando ele é mais
     alto que quem olha (um lugar vazio é chão do layer 1). Olhando de cima, o chão do próprio layer (e os de baixo)
     não tapa: da beirada se vê lá embaixo, até 4 layers para baixo; mais fundo que isso fica escuro. Quem está
     embaixo de um andar (entre ele e quem olha) fica escondido. */
  var VISTA_DESCE = 4, VISTA_MAX = 60, LAJE = .12, OLHO = .6;
  var visao = { sig: "", vistos: null, tokens: null };
  // Modo caverna (também na engrenagem): tudo escuro; cada token enxerga só até N blocos em volta,
  //   N = 2 × (modificador de Concentração + 1), no mínimo 2 — em círculo, sem atravessar paredes.
  //   Tocha: o círculo fica 1,5× maior. Lanterna: além do círculo, um cone de 2N blocos para onde ela aponta
  //   (mira com um clique; gira arrastando a bolinha na ponta do cone).
  var CONE_LANTERNA = 60;   // abertura do cone, em graus
  function sombrasLigadas() { return sessao && (!!mapa.sombras || !!mapa.caverna); }
  function raioNatural(tk) {
    var m = opts.concentracao ? Number(opts.concentracao(tk)) : 0;
    return Math.max(2, 2 * ((isFinite(m) ? m : 0) + 1));
  }
  function olhoDe(tk) {
    var c = centroTk(tk, tk.x, tk.y), z = layerTk(tk), o = { tk: tk, x: c.x, y: c.y, z: z, h: z + OLHO, raio: VISTA_MAX, cone: null };
    if (mapa.caverna) {
      var N = raioNatural(tk);
      o.N = N;
      o.raio = tk.luz === "tocha" ? N * 1.5 : N;
      if (tk.luz === "lanterna") o.cone = { dir: Number(tk.mira) || 0, len: 2 * N, meia: CONE_LANTERNA / 2 * Math.PI / 180 };
    }
    o.alcance = Math.max(o.raio, o.cone ? o.cone.len : 0);
    return o;
  }
  // Quem enxerga: o jogador, o próprio token; o mestre, os tokens de todos os jogadores (ou o escolhido no olho).
  function olhos() {
    var vc = vendoComo();
    if (vc) return [olhoDe(vc)];
    return mapa.tokens.filter(function (tk) {
      if (!tk.personagem_id) return false;
      if (!podeEditar) return podeMover(tk);
      return opts.ehJogador ? !!opts.ehJogador(tk) : false;
    }).map(olhoDe);
  }
  // O ponto (px, py) fica dentro do alcance do olho (círculo, mais o cone da lanterna)?
  function noAlcance(o, px, py) {
    var dx = px - o.x, dy = py - o.y, d = Math.hypot(dx, dy);
    if (d <= o.raio + .01) return true;
    if (!o.cone || d > o.cone.len + .01) return false;
    var a = Math.atan2(dy, dx) - o.cone.dir;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(a) <= o.cone.meia + .02;
  }
  // O que ocupa a altura entre lo e hi neste lugar tapa a visão?
  // z = layer de quem olha: chão (e terreno) até o layer dele não tapa quem olha de cima.
  function tapa(x, y, lo, hi, z) {
    var col = coluna(x, y);
    if (!col) return z < 1 && lo < 1;                          // lugar vazio: chão do layer 1
    var e0 = col[0], base = e0.v.t === "parede" ? e0.L + 1 : e0.L;
    if (lo < base && (e0.v.t === "parede" || e0.L > z)) return true;   // terreno sólido embaixo do bloco mais baixo
    for (var i = 1; i < col.length; i++) {
      var e = col[i];
      if (e.v.t === "parede") { if (lo < e.L + 1 && hi > e.L) return true; }
      else if (e.L > z && lo < e.L && hi > e.L - LAJE) return true;
    }
    return false;
  }
  // Parede fina (ou a borda dos blocos) entre dois vizinhos, na altura h: a fina ocupa a altura do layer dela; a da borda vai
  // até o alto do bloco mais alto do lado desenhado.
  function muroTapa(ax, ay, bx, by, h) {
    var k = muroK(ax, ay, bx, by, Math.floor(h));
    if (k && mapa.muros.has(k)) return true;
    if (!bordaDoVazio(ax, ay, bx, by)) return false;
    var col = coluna(ax, ay) || coluna(bx, by);
    return h < col[col.length - 1].L + 1;
  }
  // Linha do olho o = { x, y, h } até (tx, ty) na altura ht, bloco a bloco (sem contar o bloco de saída e o de chegada).
  function linhaLivre(o, tx, ty, ht) {
    var dx = tx - o.x, dy = ty - o.y;
    var cx = Math.floor(o.x), cy = Math.floor(o.y), ex = Math.floor(tx), ey = Math.floor(ty);
    if (cx === ex && cy === ey) return true;
    var sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    var tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity;
    var tmx = dx ? (sx > 0 ? cx + 1 - o.x : o.x - cx) * tdx : Infinity;
    var tmy = dy ? (sy > 0 ? cy + 1 - o.y : o.y - cy) * tdy : Infinity;
    var t0 = 0, dh = ht - o.h, guard = 0;
    var altura = function (t) { return o.h + dh * t; };
    while (guard++ < 400) {
      var t1 = Math.min(tmx, tmy, 1);
      if (!(cx === Math.floor(o.x) && cy === Math.floor(o.y))) {
        var ha = altura(t0), hb = altura(t1);
        if (tapa(cx, cy, Math.min(ha, hb), Math.max(ha, hb), o.z)) return false;
      }
      if (Math.abs(tmx - tmy) < 1e-9) {   // passa bem na quina: as duas laterais fechadas tapam
        var hq = altura(tmx);
        if (tapa(cx + sx, cy, hq - .01, hq + .01, o.z) && tapa(cx, cy + sy, hq - .01, hq + .01, o.z)) return false;
        var rx = muroTapa(cx, cy, cx + sx, cy, hq) || muroTapa(cx + sx, cy, cx + sx, cy + sy, hq);
        var ry = muroTapa(cx, cy, cx, cy + sy, hq) || muroTapa(cx, cy + sy, cx + sx, cy + sy, hq);
        if (rx && ry) return false;
        cx += sx; cy += sy; t0 = tmx; tmx += tdx; tmy += tdy;
      } else if (tmx < tmy) { if (muroTapa(cx, cy, cx + sx, cy, altura(tmx))) return false; cx += sx; t0 = tmx; tmx += tdx; }
      else { if (muroTapa(cx, cy, cx, cy + sy, altura(tmy))) return false; cy += sy; t0 = tmy; tmy += tdy; }
      if (cx === ex && cy === ey) return true;
    }
    return false;
  }
  // Um bloco é visto quando o olho alcança alguém em pé nele (ou a face / o topo da parede).
  function blocoVisto(olho, x, y) {
    if (!noAlcance(olho, x + .5, y + .5) && !(Math.floor(olho.x) === x && Math.floor(olho.y) === y)) return false;
    var b = blocoVisivel(x, y, olho.z), L = b ? b.L : 1;
    if (olho.z - L > VISTA_DESCE) return false;
    if (linhaLivre(olho, x + .5, y + .5, L + .5)) return true;
    return !!b && b.v.t === "parede" && linhaLivre(olho, x + .5, y + .5, L + .98);
  }
  // Um token é visto se o olho enxerga o corpo dele (altura do layer + 0,5) num dos blocos que ele ocupa,
  // sem um andar no meio (de cima, o chão de um layer tapa quem está embaixo).
  function tokenVistoPor(olho, tk) {
    if (olho.tk === tk) return true;
    var zt = layerTk(tk), l = ladoTk(tk);
    if (olho.z - zt > VISTA_DESCE) return false;
    for (var j = 0; j < l; j++) for (var i = 0; i < l; i++) {
      var x = tk.x + i, y = tk.y + j, col = coluna(x, y) || [];
      if (olho.z > zt && col.some(function (e) { return e.L > zt && e.L <= olho.z; })) continue;
      if (!noAlcance(olho, x + .5, y + .5)) continue;
      if (linhaLivre(olho, x + .5, y + .5, zt + .5)) return true;
    }
    return false;
  }
  // Calcula (e guarda até algo mudar) os blocos vistos e os tokens vistos.
  function visaoAtual() {
    if (!sombrasLigadas()) return null;
    var os = olhos(), A = limiteVista();
    if (!A) {   // sem borda: os blocos desenhados (com uma folga)
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      mapa.celulas.forEach(function (v, k) { var p = partes(k); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + 1); y1 = Math.max(y1, p.y + 1); });
      A = isFinite(x0) ? { x0: x0 - 2, y0: y0 - 2, x1: x1 + 2, y1: y1 + 2 } : { x0: 0, y0: 0, x1: 0, y1: 0 };
    }
    var sig = versaoCel + "|" + JSON.stringify(A) + "|" + os.map(function (o) { return o.tk.id + ":" + o.tk.x + "," + o.tk.y + "," + o.z + "," + o.raio + "," + (o.cone ? o.cone.dir.toFixed(3) + "/" + o.cone.len : ""); }).join(";") + "|" +
      mapa.tokens.map(function (t) { return t.id + ":" + t.x + "," + t.y + "," + layerTk(t) + "," + ladoTk(t); }).join(";");
    if (sig === visao.sig) return visao;
    if (visao.vistos && arrasto && arrasto.tipo === "pintar") return visao;   // pintando: refaz quando soltar
    var vistos = new Set(), tokens = new Set();
    os.forEach(function (o) {
      var bx0 = Math.max(A.x0, Math.floor(o.x - o.alcance)), bx1 = Math.min(A.x1, Math.ceil(o.x + o.alcance));
      var by0 = Math.max(A.y0, Math.floor(o.y - o.alcance)), by1 = Math.min(A.y1, Math.ceil(o.y + o.alcance));
      for (var y = by0; y < by1; y++) for (var x = bx0; x < bx1; x++) {
        var k = x + "," + y;
        if (!vistos.has(k) && blocoVisto(o, x, y)) vistos.add(k);
      }
      mapa.tokens.forEach(function (tk) { if (!tokens.has(tk.id) && tokenVistoPor(o, tk)) tokens.add(tk.id); });
    });
    visao = { sig: sig, vistos: vistos, tokens: tokens, olhos: os };
    return visao;
  }
  // Para quem olha agora: o token aparece? (o jogador não vê o que o token dele não vê)
  function tokenAparece(tk) {
    if (!vistaDeJogador()) return true;
    if (!tokenNaNevoaVisto(tk)) return false;
    if (!sombrasLigadas()) return true;
    var v = visaoAtual(); return !v || v.tokens.has(tk.id);
  }
  // Escurece o que não é visto: para o jogador, escuro de verdade; para o mestre, de leve.
  function desenharSombras(g, faixa, t) {
    var v = visaoAtual(); if (!v) return;
    var jog = vistaDeJogador();
    // luz da tocha e da lanterna (por baixo do escuro, então só aparece onde o token enxerga)
    if (mapa.caverna) v.olhos.forEach(function (o) {
      var cx = vis.ox + o.x * t, cy = vis.oy + o.y * t, gr;
      if (o.tk.luz === "tocha") {
        gr = g.createRadialGradient(cx, cy, t * .3, cx, cy, o.raio * t);
        gr.addColorStop(0, "rgba(255, 176, 64, .34)"); gr.addColorStop(1, "rgba(255, 140, 40, 0)");
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, o.raio * t, 0, Math.PI * 2); g.fill();
      }
      if (o.cone) {
        gr = g.createRadialGradient(cx, cy, t * .3, cx, cy, o.cone.len * t);
        gr.addColorStop(0, "rgba(255, 246, 200, .4)"); gr.addColorStop(1, "rgba(255, 246, 200, 0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, o.cone.len * t, o.cone.dir - o.cone.meia, o.cone.dir + o.cone.meia); g.closePath(); g.fill();
      }
    });
    g.fillStyle = jog ? "#090B18" : "rgba(17, 22, 44, .3)";
    for (var y = faixa.y0; y < faixa.y1; y++) {
      var corrida = null;   // junta blocos seguidos da mesma linha num retângulo só
      for (var x = faixa.x0; x <= faixa.x1; x++) {
        var escuro = x < faixa.x1 && !v.vistos.has(x + "," + y);
        if (escuro && corrida == null) corrida = x;
        if (!escuro && corrida != null) { g.fillRect(Math.floor(vis.ox + corrida * t), Math.floor(vis.oy + y * t), Math.ceil((x - corrida) * t) + 1, Math.ceil(t) + 1); corrida = null; }
      }
    }
  }
  // Sensor de Presença (habilidade genérica, maestria 2): quem olha "sente" os tokens escondidos num raio de
  // CON × 3 blocos (mínimo 1). Eles continuam invisíveis, mas a posição exata pulsa como um sonar vermelho.
  function sonarDe(tk) {
    if (!sombrasLigadas() || !vistaDeJogador() || !opts.sensor) return false;
    var v = visaoAtual(); if (!v) return false;
    var c = centroTk(tk, tk.x, tk.y);
    return v.olhos.some(function (o) { var r = Number(opts.sensor(o.tk)) || 0; return r > 0 && Math.hypot(c.x - o.x, c.y - o.y) <= r + .01; });
  }
  var sonarT = 0;
  function desenharSonares(g, lista, t) {
    var agora = performance.now();
    lista.forEach(function (tk, i) {
      var c = centroTk(tk, tk.x, tk.y), cx = vis.ox + c.x * t, cy = vis.oy + c.y * t, R = t * escalaTk(tk) * .5;
      for (var k = 0; k < 2; k++) {
        var f = ((agora / 1500 + k / 2 + i * .17) % 1);
        g.strokeStyle = "rgba(235, 64, 52, " + (.85 * (1 - f)).toFixed(3) + ")"; g.lineWidth = Math.max(1.5, t * .07 * (1 - f));
        g.beginPath(); g.arc(cx, cy, R * (.7 + .65 * f), 0, Math.PI * 2); g.stroke();
      }
      var gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * .75);
      gr.addColorStop(0, "rgba(255, 80, 60, .55)"); gr.addColorStop(1, "rgba(255, 60, 40, 0)");
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * .75, 0, Math.PI * 2); g.fill();
    });
    clearTimeout(sonarT); sonarT = setTimeout(pedirDesenho, 40);   // continua pulsando
  }
  // Olho fechado (mestre): nenhum jogador está vendo este token.
  function olhoFechado(g, x, y, rr) {
    g.fillStyle = "rgba(21, 26, 58, .92)"; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = Math.max(1.2, rr * .16); g.lineCap = "round";
    g.beginPath(); g.moveTo(x - rr * .62, y - rr * .1); g.quadraticCurveTo(x, y + rr * .55, x + rr * .62, y - rr * .1); g.stroke();
    [-.42, 0, .42].forEach(function (d) { g.beginPath(); g.moveTo(x + d * rr, y + rr * .22 + (d ? 0 : .06 * rr)); g.lineTo(x + d * rr * 1.25, y + rr * .5 + (d ? 0 : .08 * rr)); g.stroke(); });
    g.lineCap = "butt";
  }

  /* ---------- Névoa (fog) ----------
     O mestre escolhe blocos (ficam vermelhos, como a régua) e confirma: a área fica esbranquiçada, coberta de névoa.
     Quem está dentro não vê o lado de fora e só enxerga (mod. de Concentração × 0,5) + 1 blocos em volta (mínimo 0:
     só a si mesmo e a névoa). Quem está fora não vê quem está dentro. Vale com ou sem as Sombras ligadas. */
  var selNevoa = null;   // Map "x,y" → true enquanto o mestre escolhe os blocos
  function naNevoa(x, y) { return mapa.nevoa.has(chave(x, y)); }
  function raioNevoa(tk) { var m = opts.concentracao ? Number(opts.concentracao(tk)) || 0 : 0; return Math.max(0, m * .5 + 1); }
  function olhosDoJogador() {
    var vc = vendoComo(); if (vc) return [olhoDe(vc)];
    if (podeEditar) return [];
    return mapa.tokens.filter(function (tk) { return tk.personagem_id && podeMover(tk); }).map(olhoDe);
  }
  // O ponto (bloco x, y) aparece através da névoa para algum dos olhos?
  function vistoNaNevoa(os, x, y) {
    if (!mapa.nevoa.size || !os.length) return true;
    return os.some(function (o) {
      if (naNevoa(Math.floor(o.x), Math.floor(o.y))) return Math.hypot(x + .5 - o.x, y + .5 - o.y) <= raioNevoa(o.tk) + .01;
      return !naNevoa(x, y);
    });
  }
  function tokenNaNevoaVisto(tk) {
    var os = olhosDoJogador();
    if (!mapa.nevoa.size || !os.length || os.some(function (o) { return o.tk === tk; })) return true;
    var l = ladoTk(tk);
    for (var j = 0; j < l; j++) for (var i = 0; i < l; i++) if (vistoNaNevoa(os, tk.x + i, tk.y + j)) return true;
    return false;
  }
  function desenharNevoa(g, faixa, t) {
    if (!mapa.nevoa.size && !selNevoa) return;
    var os = vistaDeJogador() ? olhosDoJogador() : [], v = os.length && sombrasLigadas() ? visaoAtual() : null;
    for (var y = faixa.y0; y < faixa.y1; y++) for (var x = faixa.x0; x < faixa.x1; x++) {
      var px = Math.floor(vis.ox + x * t), py = Math.floor(vis.oy + y * t), nv = naNevoa(x, y);
      if (os.length) {
        if (v && !v.vistos.has(x + "," + y)) continue;          // já está no escuro das sombras
        var visto = vistoNaNevoa(os, x, y);
        if (!visto) { g.fillStyle = "rgba(233, 237, 242, .96)"; g.fillRect(px, py, Math.ceil(t) + 1, Math.ceil(t) + 1); }
        else if (nv) { g.fillStyle = "rgba(240, 243, 247, .35)"; g.fillRect(px, py, Math.ceil(t) + 1, Math.ceil(t) + 1); }
      } else if (nv) {                                            // mestre: a névoa aparece, mas deixa ver o que tem embaixo
        g.fillStyle = "rgba(236, 240, 246, .55)"; g.fillRect(px, py, Math.ceil(t) + 1, Math.ceil(t) + 1);
        if (t >= 10 && (x + y) % 2 === 0) { g.fillStyle = "rgba(255, 255, 255, .35)"; g.beginPath(); g.ellipse(px + t * .5, py + t * .55, t * .38, t * .16, 0, 0, Math.PI * 2); g.fill(); }
      }
      if (selNevoa && selNevoa.has(x + "," + y)) { g.fillStyle = "rgba(224, 69, 90, .4)"; g.fillRect(px, py, Math.ceil(t), Math.ceil(t)); }
    }
  }
  var barraNevoa = null;
  function comecarNevoa() {
    selNevoa = new Map(); raiz.classList.add("is-nevoa");
    if (!barraNevoa) {
      barraNevoa = el("div", "mp-acao"); barraNevoa.setAttribute("role", "toolbar"); barraNevoa.setAttribute("aria-label", "Névoa");
      raiz.appendChild(barraNevoa);
    }
    atualizarBarraNevoa();
    toast("Névoa: clique ou arraste nos blocos para escolher. Depois confirme.");
  }
  function atualizarBarraNevoa() {
    if (!barraNevoa) return;
    barraNevoa.hidden = !selNevoa; if (!selNevoa) return;
    barraNevoa.textContent = "";
    var n = selNevoa.size;
    barraNevoa.appendChild(el("span", "mp-acao__txt", n ? n + (n === 1 ? " bloco escolhido" : " blocos escolhidos") : "Escolha os blocos da névoa"));
    var cobrir = el("button", "btn", "Cobrir com névoa"); cobrir.type = "button"; cobrir.disabled = !n;
    var tirar = el("button", "btn btn--ghost", "Tirar névoa"); tirar.type = "button"; tirar.disabled = !n;
    var sair = el("button", "btn btn--ghost", "Sair"); sair.type = "button";
    cobrir.addEventListener("click", function () { aplicarNevoa(true); });
    tirar.addEventListener("click", function () { aplicarNevoa(false); });
    sair.addEventListener("click", sairNevoa);
    barraNevoa.appendChild(cobrir); barraNevoa.appendChild(tirar); barraNevoa.appendChild(sair);
  }
  function aplicarNevoa(poe) {
    comecarMudanca();
    selNevoa.forEach(function (v, k) { var kk = "n:" + k; if (mudancaAtual && !mudancaAtual.has(kk)) mudancaAtual.set(kk, celLer(kk)); celPor(kk, poe); });
    fecharMudanca();
    toast(poe ? "Névoa posta em " + selNevoa.size + " blocos." : "Névoa tirada de " + selNevoa.size + " blocos.");
    selNevoa = new Map(); atualizarBarraNevoa(); salvar(); pedirDesenho();
  }
  function sairNevoa() { selNevoa = null; raiz.classList.remove("is-nevoa"); atualizarBarraNevoa(); if (ui.ferramenta === "nevoa") escolher("caneta"); pedirDesenho(); }
  function marcarNevoa(x, y, poe) { if (fora(x, y)) return; var k = x + "," + y; if (poe) selNevoa.set(k, true); else selNevoa.delete(k); atualizarBarraNevoa(); pedirDesenho(); }

  /* ---------- Textos (mestre) ----------
     Etiqueta: fica escondida num bloco (um balão no canto); clicar no balão mostra o texto e clicar no texto esconde.
     Texto corrido: fica sempre escrito no mapa. Os dois têm até 50 caracteres e são do layer em que foram escritos. */
  var etiquetasAbertas = {}, caixasTexto = [];   // caixas desenhadas: [{ tx, x0, y0, x1, y1, tipo: "texto" | "balao" }]
  function textosDaVista() { var V = layerDaVista(); return mapa.textos.filter(function (tx) { return tx.L === V || layerVisivel(Math.floor(tx.x), Math.floor(tx.y), V) === tx.L; }); }
  function desenharTextos(g, t) {
    caixasTexto = [];
    if (!mapa.textos.length) return;
    var os = vistaDeJogador() && sombrasLigadas() ? visaoAtual() : null, jog = vistaDeJogador() ? olhosDoJogador() : [];
    textosDaVista().forEach(function (tx) {
      var cx = Math.floor(tx.x), cy = Math.floor(tx.y);
      if (os && !os.vistos.has(cx + "," + cy)) return;            // no escuro: não aparece
      if (jog.length && !vistoNaNevoa(jog, cx, cy)) return;        // na névoa: não aparece
      var fs = Math.max(10, Math.min(28, t * .44));
      g.font = "700 " + Math.round(fs) + "px system-ui, sans-serif"; g.textBaseline = "middle";
      if (tx.tipo === "corrido") {
        var px = vis.ox + tx.x * t, py = vis.oy + tx.y * t, w = g.measureText(tx.texto).width;
        g.textAlign = "left"; g.lineJoin = "round"; g.lineWidth = Math.max(3, fs * .28); g.strokeStyle = "rgba(255, 255, 255, .92)"; g.strokeText(tx.texto, px, py);
        g.fillStyle = "#151A3A"; g.fillText(tx.texto, px, py);
        caixasTexto.push({ tx: tx, x0: px - 4, y0: py - fs * .7, x1: px + w + 4, y1: py + fs * .7, tipo: "texto" });
        return;
      }
      // etiqueta: balão no canto de cima, à direita, do bloco
      var bx = vis.ox + (cx + .78) * t, by = vis.oy + (cy + .22) * t, br = Math.max(6, t * .17);
      g.fillStyle = "#FFFFFF"; g.strokeStyle = "#1D3FA8"; g.lineWidth = Math.max(1.5, br * .2);
      g.beginPath(); g.ellipse(bx, by, br, br * .8, 0, 0, Math.PI * 2); g.moveTo(bx - br * .35, by + br * .6); g.lineTo(bx - br * .7, by + br * 1.15); g.lineTo(bx + br * .05, by + br * .72); g.fill(); g.stroke();
      g.fillStyle = "#1D3FA8"; [-.4, 0, .4].forEach(function (d) { g.beginPath(); g.arc(bx + d * br, by, Math.max(1, br * .12), 0, Math.PI * 2); g.fill(); });
      caixasTexto.push({ tx: tx, x0: bx - br * 1.3, y0: by - br * 1.3, x1: bx + br * 1.3, y1: by + br * 1.3, tipo: "balao" });
      if (etiquetasAbertas[tx.id]) {
        var w2 = g.measureText(tx.texto).width, pad = fs * .55, bw = w2 + pad * 2, bh = fs * 1.9, x0 = bx + br * .6, y0 = by - bh - br * .6;
        g.fillStyle = "rgba(255, 255, 255, .97)"; g.strokeStyle = "#1D3FA8"; g.lineWidth = 2;
        g.beginPath(); if (g.roundRect) g.roundRect(x0, y0, bw, bh, 8); else g.rect(x0, y0, bw, bh); g.fill(); g.stroke();
        g.fillStyle = "#151A3A"; g.textAlign = "left"; g.fillText(tx.texto, x0 + pad, y0 + bh / 2);
        caixasTexto.push({ tx: tx, x0: x0, y0: y0, x1: x0 + bw, y1: y0 + bh, tipo: "texto" });
      }
    });
  }
  function caixaEm(px, py) { for (var i = caixasTexto.length - 1; i >= 0; i--) { var c = caixasTexto[i]; if (px >= c.x0 && px <= c.x1 && py >= c.y0 && py <= c.y1) return c; } return null; }
  // Caixinha para escrever (até 50 caracteres) no ponto (px, py) da tela.
  var editorTexto = null;
  function escreverTexto(px, py, tx) {
    fecharEditorTexto();
    var mw = telaParaMundo(px, py), tipo = tx ? tx.tipo : ui.sub.texto || "etiqueta";
    var box = el("form", "mp-escrever"); box.style.left = Math.max(6, Math.min(raiz.clientWidth - 260, px)) + "px"; box.style.top = Math.max(6, py - 20) + "px";
    var inp = el("input"); inp.type = "text"; inp.maxLength = 50; inp.value = tx ? tx.texto : ""; inp.placeholder = tipo === "etiqueta" ? "Etiqueta (até 50 caracteres)" : "Texto (até 50 caracteres)";
    inp.setAttribute("aria-label", tipo === "etiqueta" ? "Texto da etiqueta" : "Texto corrido");
    var cont = el("small", "mp-escrever__cont", (50 - inp.value.length) + "");
    var ok = el("button", "btn", tx ? "Salvar" : "Pôr"); ok.type = "submit";
    box.appendChild(inp); box.appendChild(cont); box.appendChild(ok);
    if (tx) { var del = el("button", "btn btn--ghost", "Apagar"); del.type = "button"; del.addEventListener("click", function () { mapa.textos = mapa.textos.filter(function (x) { return x !== tx; }); salvar(); fecharEditorTexto(); pedirDesenho(); }); box.appendChild(del); }
    inp.addEventListener("input", function () { cont.textContent = String(50 - inp.value.length); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); fecharEditorTexto(); tela.focus({ preventScroll: true }); } });
    box.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inp.value.trim().slice(0, 50);
      if (tx) { if (v) tx.texto = v; else mapa.textos = mapa.textos.filter(function (x) { return x !== tx; }); }
      else if (v) mapa.textos.push({ id: Math.random().toString(36).slice(2, 9), tipo: tipo, x: tipo === "etiqueta" ? Math.floor(mw.x) + .5 : Math.round(mw.x * 4) / 4, y: tipo === "etiqueta" ? Math.floor(mw.y) + .5 : Math.round(mw.y * 4) / 4, L: ui.layer, texto: v });
      salvar(); fecharEditorTexto(); pedirDesenho();
    });
    raiz.appendChild(box); editorTexto = box; inp.focus();
  }
  function fecharEditorTexto() { if (editorTexto) { editorTexto.remove(); editorTexto = null; } }

  /* ---------- Área de um jogador (mestre): o recorte vira o "mapa inteiro" para ele ---------- */
  var recorte = null;   // { id, nome, p1 } enquanto o mestre marca os dois cantos
  var dlgRec = null;
  function abrirRecortes() {
    var jog = opts.jogadores ? opts.jogadores() : [];
    if (!dlgRec) { dlgRec = el("dialog", "modal mp-limpar mp-rec"); dlgRec.setAttribute("aria-labelledby", "mprec-t"); document.body.appendChild(dlgRec); }
    var d = dlgRec; d.textContent = "";
    var h = el("h2", "", "Limitar a área de um jogador"); h.id = "mprec-t"; d.appendChild(h);
    d.appendChild(el("p", "mp-limpar__txt", "Escolha o jogador e marque dois cantos no mapa. Para ele, essa área vira o mapa inteiro: o zoom e o token dele ficam dentro dela."));
    if (!jog.length) { d.appendChild(el("p", "mp-limpar__txt", "Nenhum jogador na sessão ainda.")); }
    var lab = el("label", "mp-rec__lab", "Jogador"); lab.htmlFor = "mprec-sel";
    var sel = el("select", "mp-rec__sel"); sel.id = "mprec-sel";
    jog.forEach(function (j) { var tem = mapa.recortes && mapa.recortes[j.id]; sel.appendChild(new Option(j.nome + (tem ? " · com área limitada" : ""), j.id)); });
    if (jog.length) { d.appendChild(lab); d.appendChild(sel); }
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Fechar"); no.type = "button";
    var tirar = el("button", "btn btn--ghost", "Tirar o limite"); tirar.type = "button";
    var marcar = el("button", "btn", "Marcar a área no mapa"); marcar.type = "button";
    var atualizar = function () { tirar.hidden = !(sel.value && mapa.recortes && mapa.recortes[sel.value]); };
    sel.addEventListener("change", atualizar); atualizar();
    acts.appendChild(no); if (jog.length) { acts.appendChild(tirar); acts.appendChild(marcar); }
    d.appendChild(acts);
    no.addEventListener("click", function () { d.close(); });
    tirar.addEventListener("click", function () {
      if (mapa.recortes) delete mapa.recortes[sel.value];
      salvar(); pedirDesenho(); d.close();
      toast("O limite de área foi tirado.");
    });
    marcar.addEventListener("click", function () {
      var j = jog.filter(function (x) { return x.id === sel.value; })[0]; if (!j) return;
      d.close();
      recorte = { id: j.id, nome: j.nome, p1: null, fim: null };
      raiz.classList.add("is-recortando");
      toast("Clique no primeiro canto da área de " + j.nome + " (Esc cancela).");
    });
    d.showModal();
  }
  function cliqueRecorte(c) {
    if (!recorte.p1) { recorte.p1 = c; recorte.fim = c; toast("Agora clique no canto oposto."); pedirDesenho(); return; }
    var a = recorte.p1, r = { x0: Math.min(a.x, c.x), y0: Math.min(a.y, c.y), x1: Math.max(a.x, c.x) + 1, y1: Math.max(a.y, c.y) + 1 };
    if (mapa.limite) { r.x0 = Math.max(r.x0, mapa.limite.x0); r.y0 = Math.max(r.y0, mapa.limite.y0); r.x1 = Math.min(r.x1, mapa.limite.x1); r.y1 = Math.min(r.y1, mapa.limite.y1); }
    if (r.x1 <= r.x0 || r.y1 <= r.y0) { toast("Essa área ficou fora do mapa. Tente de novo."); recorte.p1 = null; return; }
    mapa.recortes = mapa.recortes || {};
    mapa.recortes[recorte.id] = r;
    toast("Área de " + recorte.nome + ": " + (r.x1 - r.x0) + " × " + (r.y1 - r.y0) + " blocos.");
    sairRecorte(); salvar();
  }
  function sairRecorte() { recorte = null; raiz.classList.remove("is-recortando"); pedirDesenho(); }
  // Mestre: contornos das áreas limitadas, com o nome do jogador.
  function desenharRecortes(g, t) {
    if (!sessao || !podeEditar) return;
    var nomes = {}; (opts.jogadores ? opts.jogadores() : []).forEach(function (j) { nomes[j.id] = j.nome; });
    var lista = [];
    if (mapa.recortes) Object.keys(mapa.recortes).forEach(function (id) { lista.push([mapa.recortes[id], nomes[id] || "Jogador", false]); });
    if (recorte && recorte.p1) { var a = recorte.p1, c = recorte.fim || a; lista.push([{ x0: Math.min(a.x, c.x), y0: Math.min(a.y, c.y), x1: Math.max(a.x, c.x) + 1, y1: Math.max(a.y, c.y) + 1 }, recorte.nome, true]); }
    lista.forEach(function (it) {
      var r = it[0], x = vis.ox + r.x0 * t, y = vis.oy + r.y0 * t, w = (r.x1 - r.x0) * t, h = (r.y1 - r.y0) * t;
      g.strokeStyle = it[2] ? "#E9A23B" : "rgba(233, 162, 59, .7)"; g.lineWidth = it[2] ? 3 : 2; g.setLineDash([8, 5]);
      g.strokeRect(x, y, w, h); g.setLineDash([]);
      if (it[2]) { g.fillStyle = "rgba(233, 162, 59, .12)"; g.fillRect(x, y, w, h); }
      g.font = "700 12px system-ui, sans-serif"; var tw = g.measureText(it[1]).width;
      g.fillStyle = "rgba(233, 162, 59, .92)"; g.fillRect(x, y - 18, tw + 12, 18);
      g.fillStyle = "#1A1200"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText(it[1], x + 6, y - 9);
    });
  }

  /* ---------- Conta-gotas: o próximo clique num bloco copia a cor dele ---------- */
  var gotas = null;
  function corDoBloco(x, y) {
    var b = blocoVisivel(x, y, layerDaVista(), !vistaDeJogador()), v = b && b.v;
    if (!v) return null;
    return v.t === "terra" ? "#7A5634" : v.c;
  }
  function contaGotas(fn) {
    gotas = fn; raiz.classList.add("is-gotas");
    toast("Conta-gotas: clique num bloco para copiar a cor dele (Esc cancela).");
  }
  function sairGotas() { gotas = null; raiz.classList.remove("is-gotas"); dica.hidden = true; dica.style.removeProperty("--gota"); dica.classList.remove("mp-dica--gota"); }

  /* ---------- Ações do token (clique sem arrastar): voar / pousar, submergir / emergir ---------- */
  var menuTk = null;
  function fecharMenuToken() { if (menuTk) { menuTk.remove(); menuTk = null; } }
  // Lanterna: o próximo clique diz para onde ela aponta; depois dá para girar arrastando a bolinha.
  var mira = null;
  function comecarMira(tk) { mira = tk; raiz.classList.add("is-mirando"); toast("Clique para onde a lanterna aponta (Esc cancela). Depois, arraste a bolinha amarela para girar."); pedirDesenho(); }
  function sairMira() { mira = null; raiz.classList.remove("is-mirando"); pedirDesenho(); }
  function apontar(tk, px, py) {
    var mw = telaParaMundo(px, py), c = centroTk(tk, tk.x, tk.y);
    if (Math.hypot(mw.x - c.x, mw.y - c.y) < .05) return;
    tk.mira = Math.round(Math.atan2(mw.y - c.y, mw.x - c.x) * 1000) / 1000;
  }
  // Bolinha de girar a lanterna: 1,6 bloco à frente do token, na direção do cone.
  var ALCA = 1.6;
  function alcaDaLanterna(tk) { var c = centroTk(tk, tk.x, tk.y), d = Number(tk.mira) || 0, r = ALCA * Math.max(1, escalaTk(tk) * .7); return { x: c.x + Math.cos(d) * r, y: c.y + Math.sin(d) * r }; }
  function lanternaEm(px, py) {
    if (!sessao || !mapa.caverna) return null;
    var m = telaParaMundo(px, py), raio = Math.max(.32, 10 / tam());
    for (var i = mapa.tokens.length - 1; i >= 0; i--) {
      var tk = mapa.tokens[i];
      if (tk.luz !== "lanterna" || !podeMover(tk) || !tokenAparece(tk)) continue;
      var a = alcaDaLanterna(tk);
      if (Math.hypot(m.x - a.x, m.y - a.y) <= raio) return tk;
    }
    return null;
  }
  // Desenho da luz no token: cone tracejado e a bolinha (para quem pode mexer) e um selo de tocha / lanterna.
  function desenharLuz(g, tk, t) {
    if (!sessao || !mapa.caverna || !tk.luz) return;
    var c = centroTk(tk, tk.x, tk.y), cx = vis.ox + c.x * t, cy = vis.oy + c.y * t, R = t * escalaTk(tk) * .44;
    if (tk.luz === "lanterna" && podeMover(tk)) {
      var o = olhoDe(tk), d = o.cone.dir, L = o.cone.len * t, a = alcaDaLanterna(tk);
      g.strokeStyle = "rgba(255, 214, 90, .85)"; g.lineWidth = 1.5; g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, L, d - o.cone.meia, d + o.cone.meia); g.closePath(); g.stroke(); g.setLineDash([]);
      var ax = vis.ox + a.x * t, ay = vis.oy + a.y * t, ar = Math.max(6, t * .16);
      g.strokeStyle = "rgba(255, 214, 90, .9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(d) * R, cy + Math.sin(d) * R); g.lineTo(ax, ay); g.stroke();
      g.fillStyle = "#FFD65A"; g.beginPath(); g.arc(ax, ay, ar, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#5A4300"; g.lineWidth = 1.5; g.stroke();
    }
    if (t < 12) return;
    var bx = cx + R * .74, by = cy + R * .74, br = Math.max(5, t * .15);
    g.fillStyle = tk.luz === "tocha" ? "#E0642C" : "#C9A227"; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = Math.max(1.2, br * .2); g.stroke();
    g.fillStyle = "#FFF3C4"; g.beginPath();
    if (tk.luz === "tocha") { g.moveTo(bx, by - br * .62); g.quadraticCurveTo(bx + br * .55, by, bx, by + br * .5); g.quadraticCurveTo(bx - br * .55, by, bx, by - br * .62); }
    else { g.moveTo(bx - br * .5, by - br * .3); g.lineTo(bx + br * .55, by - br * .55); g.lineTo(bx + br * .55, by + br * .55); g.lineTo(bx - br * .5, by + br * .3); }
    g.closePath(); g.fill();
  }
  function tokenAtual(tk) { return mapa.tokens.filter(function (x) { return x.id === tk.id; })[0] || tk; }
  function abrirMenuToken(tk) {
    fecharMenuToken();
    var cm = celCentro(tk, tk.x, tk.y), z = layerTk(tk), info = infoToken(tk), rel = relevoEm(cm.x, cm.y, z);
    var m = menuTk = el("div", "mp-tkmenu"); m.setAttribute("role", "menu"); m.setAttribute("aria-label", "Ações do token");
    m.appendChild(el("b", "mp-tkmenu__nome", info ? info.nome : (tk.rot || "Token")));
    var estado = "Layer " + z + (tk.voando ? " · voando" : rel === "agua" ? (tk.submerso ? " · submerso" : " · na água") : ehEscada(blocoEm(cm.x, cm.y, z)) ? " · na escada" : "");
    m.appendChild(el("span", "mp-tkmenu__estado", estado));
    var acao = function (txt, fn, cls) {
      var b = el("button", "mp-tkmenu__btn" + (cls ? " " + cls : ""), txt); b.type = "button"; b.setAttribute("role", "menuitem");
      b.addEventListener("click", function () {
        var cur = tokenAtual(tk); fn(cur); fecharMenuToken();
        if (sessao) tokenMudou(cur); else salvarDepois();
        pedirDesenho();
      });
      m.appendChild(b);
    };
    var opcoesVoo = layersDeVoo(tk);
    if (opcoesVoo.length) {
      var bv = el("button", "mp-tkmenu__btn mp-tkmenu__btn--voar", tk.voando ? "Voar mais alto" : "Voar"); bv.type = "button"; bv.setAttribute("role", "menuitem");
      bv.addEventListener("click", function () { mostrarLayersDeVoo(m, tk, opcoesVoo); });
      m.appendChild(bv);
    }
    if (tk.voando) {
      var zp = layerDePouso(cm.x, cm.y, z);
      acao(zp === z ? "Pousar" : "Pousar (desce para o layer " + zp + ")", function (c) { c.voando = false; c.z = layerDePouso(cm.x, cm.y, layerTk(c)); });
    } else {
      // escada: no bloco da escada, Escalar sobe um layer; em cima dela (layer de cima), Descer volta
      if (ehEscada(blocoEm(cm.x, cm.y, z)) && passoPegada(Object.assign({}, tk, { voando: true }), tk.x, tk.y, z + 1) != null)
        acao("Escalar (layer " + (z + 1) + ")", function (c) { c.z = layerTk(c) + 1; c.submerso = false; }, "mp-tkmenu__btn--escada");
      if (ehEscada(blocoEm(cm.x, cm.y, z - 1)))
        acao("Descer a escada (layer " + (z - 1) + ")", function (c) { c.z = layerTk(c) - 1; }, "mp-tkmenu__btn--escada");
    }
    if (rel === "agua" && !tk.voando) {
      if (tk.submerso) acao("Emergir", function (c) { c.submerso = false; }, "mp-tkmenu__btn--agua");
      else acao("Submergir", function (c) { c.submerso = true; }, "mp-tkmenu__btn--agua");
    }
    if (sessao && mapa.caverna) {   // modo caverna: tocha (círculo 1,5× maior) ou lanterna (cone de 2N)
      acao(tk.luz === "tocha" ? "Apagar a tocha" : "Acender a tocha", function (c) { c.luz = c.luz === "tocha" ? "" : "tocha"; }, "mp-tkmenu__btn--luz");
      if (tk.luz === "lanterna") {
        acao("Mirar a lanterna", function (c) { setTimeout(function () { comecarMira(c); }, 0); }, "mp-tkmenu__btn--luz");
        acao("Desligar a lanterna", function (c) { c.luz = ""; }, "mp-tkmenu__btn--luz");
      } else acao("Ligar a lanterna", function (c) { c.luz = "lanterna"; if (c.mira == null) c.mira = 0; setTimeout(function () { comecarMira(c); }, 0); }, "mp-tkmenu__btn--luz");
    }
    raiz.appendChild(m);
    var t = tam(), ctm = centroTk(tk, tk.x, tk.y), meio = t * escalaTk(tk) * .5;
    var x = vis.ox + ctm.x * t + meio + 8, y = vis.oy + ctm.y * t - m.offsetHeight / 2;
    if (x + m.offsetWidth > raiz.clientWidth - 6) x = vis.ox + ctm.x * t - meio - 8 - m.offsetWidth;
    m.style.left = Math.max(6, x) + "px"; m.style.top = Math.max(6, Math.min(raiz.clientHeight - m.offsetHeight - 6, y)) + "px";
    var primeiro = m.querySelector("button"); if (primeiro) primeiro.focus({ preventScroll: true });
    m.addEventListener("keydown", function (e) { if (e.key === "Escape") { fecharMenuToken(); tela.focus({ preventScroll: true }); } });
  }

  // Voar: do layer atual até o mais alto (acima de tudo); não dá para atravessar um teto (bloco acima, no mesmo lugar).
  function layersDeVoo(tk) {
    var cm = celCentro(tk, tk.x, tk.y), z = layerTk(tk), topo = faixaLayers()[1] + 1, col = coluna(cm.x, cm.y) || [], out = [];
    var teto = col.filter(function (e) { return e.L > z; })[0];
    var max = teto ? teto.L - 1 : topo;
    for (var L = tk.voando ? z + 1 : z; L <= max; L++) out.push(L);
    return out;
  }
  function mostrarLayersDeVoo(m, tk, lista) {
    m.textContent = "";
    m.appendChild(el("b", "mp-tkmenu__nome", "Voar até qual layer?"));
    var topo = faixaLayers()[1] + 1;
    lista.slice().reverse().forEach(function (L) {
      var b = el("button", "mp-tkmenu__btn mp-tkmenu__btn--voar", L === topo ? "Layer mais alto (" + L + ")" : "Layer " + L + (L === layerTk(tk) ? " (o atual)" : ""));
      b.type = "button"; b.setAttribute("role", "menuitem");
      b.addEventListener("click", function () {
        var cur = tokenAtual(tk); cur.voando = true; cur.submerso = false; cur.z = L; fecharMenuToken();
        if (sessao) tokenMudou(cur); else salvarDepois();
        pedirDesenho();
      });
      m.appendChild(b);
    });
    var vb = el("button", "mp-tkmenu__btn mp-tkmenu__btn--leve", "Voltar"); vb.type = "button";
    vb.addEventListener("click", function () { abrirMenuToken(tk); });
    m.appendChild(vb);
    var primeiro = m.querySelector("button"); if (primeiro) primeiro.focus({ preventScroll: true });
  }

  /* ---------- Sessão: tokens que mudaram e a lista de personagens (direita) ---------- */
  function tokenMudou(tk) {
    if (opts.aoSalvarToken) Promise.resolve(opts.aoSalvarToken(Object.assign({}, tk))).catch(function (err) { toast("O token não foi salvo: " + err.message); });
    atualizarBandeja();
  }
  function tirarToken(tk) {
    mapa.tokens = mapa.tokens.filter(function (x) { return x !== tk; });
    if (opts.aoRemoverToken) Promise.resolve(opts.aoRemoverToken(Object.assign({}, tk))).catch(function (err) { toast(err.message); });
    atualizarBandeja(); pedirDesenho();
    toast((infoToken(tk) || {}).nome ? infoToken(tk).nome + " saiu do mapa." : "O token saiu do mapa.");
  }
  // Soltar um token aqui tira ele do mapa (mestre): a lista do painel da esquerda (opts.zonaTirar).
  function naZonaDeTirar(cx, cy) {
    var z = opts.zonaTirar ? opts.zonaTirar() : null;
    return dentroDe(z, cx, cy);
  }
  function dentroDe(no, cx, cy) { if (!no) return false; var r = no.getBoundingClientRect(); return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom; }
  // O ponto está no mapa à vista (e não em cima da lista, do pergaminho, do zoom...)?
  function sobreTela(cx, cy) { var alvo = document.elementFromPoint(cx, cy); return alvo === tela; }
  function miniRetrato(p) {
    var a = el("span", "mp-bandeja__foto");
    if (p.foto) { var img = el("img"); img.src = p.foto; img.alt = ""; img.draggable = false; a.appendChild(img); }
    else a.textContent = ((p.nome || "?").trim().charAt(0) || "?").toUpperCase();
    return a;
  }
  function blocoLivrePerto(c, tk) {
    var livre = function (x, y) { return pegadaLivre(tk || {}, x, y) != null && !mapa.tokens.some(function (t) { return t.x === x && t.y === y; }); };
    for (var raio = 0; raio < 30; raio++) for (var dy = -raio; dy <= raio; dy++) for (var dx = -raio; dx <= raio; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue;
      if (livre(c.x + dx, c.y + dy)) return { x: c.x + dx, y: c.y + dy };
    }
    return null;
  }
  function colocar(p, x, y, z) {
    var tk = mapa.tokens.filter(function (t) { return t.personagem_id === p.id; })[0];
    if (z == null) z = pegadaLivre({ personagem_id: p.id }, x, y);
    if (z == null) z = 1;
    if (!tk) { tk = { id: "p:" + p.id, personagem_id: p.id, x: x, y: y, z: z, cor: "#9AA3AD", rot: "" }; mapa.tokens.push(tk); }
    else { tk.x = x; tk.y = y; tk.z = z; tk.voando = false; tk.submerso = false; }
    tokenMudou(tk); pedirDesenho();
  }
  var arrastandoDaLista = false, bandejaSig = "";
  function atualizarBandeja() {
    if (arrastandoDaLista) return;
    if (!bandejaLista) { if (opts.aoMudarLista) opts.aoMudarLista(); return; }   // Sessão: a lista fica no painel da esquerda (js/combate.js)
    var ps = opts.personagens ? opts.personagens() : [];
    // só refaz a lista quando algo mudou (assim o foco do teclado não se perde a cada atualização)
    var sig = JSON.stringify([podeEditar, ps, mapa.tokens.filter(function (t) { return t.personagem_id; }).map(function (t) { return t.personagem_id; }).sort()]);
    if (sig === bandejaSig) return;
    bandejaSig = sig;
    bandejaLista.textContent = "";
    if (!ps.length) { bandejaLista.appendChild(el("li", "mp-bandeja__vazio", "Ninguém na sessão ainda.")); return; }
    var sepNpc = false;
    ps.forEach(function (p) {
      if (p.npc && !sepNpc) { sepNpc = true; var sep = el("li", "mp-bandeja__sep"); sep.appendChild(el("span", "", "NPCs")); bandejaLista.appendChild(sep); }   // NPCs separados dos jogadores
      var noMapa = mapa.tokens.some(function (t) { return t.personagem_id === p.id; });
      var pode = podeEditar || !!p.meu;
      var li = el("li");
      var b = el("button", "mp-bandeja__item"); b.type = "button";
      b.appendChild(miniRetrato(p));
      b.appendChild(el("span", "mp-bandeja__nome", p.nome || "Personagem"));
      if (noMapa) { b.classList.add("is-no-mapa"); b.appendChild(el("span", "mp-bandeja__ok", "✓")); }
      if (!pode) {
        b.classList.add("is-bloq"); b.setAttribute("aria-disabled", "true");
        b.title = p.nome + (noMapa ? " está no mapa" : "") + " · só o dono põe e move";
      } else if (noMapa) {
        b.setAttribute("aria-disabled", "true");
        b.title = p.nome + " já está no mapa" + (podeEditar ? " · arraste o token de volta para cá para tirar" : "");
      } else {
        b.title = "Arraste " + p.nome + " para o mapa (ou clique para pôr no meio da vista)";
        b.addEventListener("pointerdown", function (e) { arrastarDaBandeja(p, b, e); });
        b.addEventListener("click", function () {
          if (b._arrastou) return;
          var r = tela.getBoundingClientRect(), tkp = { personagem_id: p.id }, mc = telaParaMundo(r.width / 2, r.height / 2), c = blocoLivrePerto(cantoEm(tkp, mc.x, mc.y), tkp);
          if (!c) return toast("Não achei lugar livre no meio da vista.");
          colocar(p, c.x, c.y);
          toast(p.nome + " entrou no mapa. Segure e arraste o token para mover.");
        });
      }
      li.appendChild(b);
      bandejaLista.appendChild(li);
    });
  }
  // Arrastar um personagem da lista até o mapa: um retrato segue o mouse e o bloco onde vai cair aparece no mapa.
  function arrastarDaBandeja(p, b, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    var ini = { x: e.clientX, y: e.clientY }, fant = null, moveu = false;
    var tok = { id: "p:" + p.id, personagem_id: p.id, x: 0, y: 0, cor: "#9AA3AD", rot: "" };
    b._arrastou = false;
    function mover(ev) {
      if (!moveu && Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) < 5) return;
      if (!moveu) { moveu = b._arrastou = arrastandoDaLista = true; fant = el("div", "mp-fantasma"); fant.appendChild(miniRetrato(p)); document.body.appendChild(fant); raiz.classList.add("is-soltando"); }
      fant.style.left = ev.clientX + "px"; fant.style.top = ev.clientY + "px";
      if (sobreTela(ev.clientX, ev.clientY)) {
        var r = tela.getBoundingClientRect(), mw = telaParaMundo(ev.clientX - r.left, ev.clientY - r.top), c = cantoEm(tok, mw.x, mw.y);
        var zs = pegadaLivre(tok, c.x, c.y);
        soltando = { x: c.x, y: c.y, z: zs, ok: zs != null, token: tok };
        fant.classList.toggle("is-sobre", soltando.ok);
      } else { soltando = null; fant.classList.remove("is-sobre"); }
      pedirDesenho();
    }
    function fim(ev) {
      window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", fim); window.removeEventListener("pointercancel", fim);
      if (fant) fant.remove();
      raiz.classList.remove("is-soltando");
      arrastandoDaLista = false;
      var alvo = soltando; soltando = null; pedirDesenho();
      setTimeout(function () { b._arrastou = false; }, 0);
      if (!moveu) return;              // foi só um clique
      bandejaSig = "";
      if (ev.type === "pointercancel") return atualizarBandeja();
      if (!alvo) { atualizarBandeja(); return toast("Solte o personagem em cima do mapa."); }
      if (!alvo.ok) {
        atualizarBandeja();
        return toast(fora(alvo.x, alvo.y) ? "Solte o personagem dentro do mapa." : paredeEm(alvo.x, alvo.y, layerDaVista()) ? "Não dá para pôr o personagem em cima de uma parede." : "Esse lugar está acima do layer que você vê. Ponha o personagem perto e suba por uma escada ou voando.");
      }
      colocar(p, alvo.x, alvo.y, alvo.z);
    }
    window.addEventListener("pointermove", mover); window.addEventListener("pointerup", fim); window.addEventListener("pointercancel", fim);
  }

  /* ---------- Mouse, toque e teclado ---------- */
  var espacoApertado = false;
  function eventos() {
    tela.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    tela.addEventListener("wheel", function (e) {
      e.preventDefault();
      var r = tela.getBoundingClientRect();
      zoomEm(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    var toques = new Map(), pinca = null;
    ouvir(document, "pointerdown", function (e) { if (menuTk && !menuTk.contains(e.target)) fecharMenuToken(); });
    tela.addEventListener("pointerdown", function (e) {
      var r = tela.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (recorte && e.button === 0) { e.preventDefault(); cliqueRecorte(celulaEm(px, py)); return; }
      if (mira && e.button === 0) { e.preventDefault(); apontar(mira, px, py); tokenMudou(mira); toast("Lanterna apontada. Arraste a bolinha amarela para girar."); sairMira(); return; }
      if (gotas && e.button === 0) {   // conta-gotas ligado: este clique copia a cor do bloco
        e.preventDefault();
        var cg = celulaEm(px, py), corG = corDoBloco(cg.x, cg.y), fnG = gotas;
        if (!corG) { toast("Esse bloco está vazio: clique num bloco desenhado (Esc cancela)."); return; }
        sairGotas(); fnG(corG); pedirDesenho(); return;
      }
      tela.focus({ preventScroll: true });
      try { tela.setPointerCapture(e.pointerId); } catch (er) {}
      if (e.pointerType === "touch") {
        toques.set(e.pointerId, { x: px, y: py });
        if (toques.size === 2) { cancelarArrasto(); var ps = Array.from(toques.values()); pinca = { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), cx: (ps[0].x + ps[1].x) / 2, cy: (ps[0].y + ps[1].y) / 2 }; return; }
      }
      // mover o mapa: botão do meio, direito ou Espaço segurado
      if (e.button === 1 || e.button === 2 || espacoApertado) { arrasto = { tipo: "mover", px: px, py: py, ox: vis.ox, oy: vis.oy }; raiz.classList.add("is-movendo"); return; }
      if (e.button !== 0) return;
      var cxT = caixaEm(px, py);   // balão de etiqueta ou texto: abre / fecha (o mestre, com a ferramenta Texto, edita)
      if (cxT && !(podeEditar && ui.ferramenta === "texto" && cxT.tipo === "texto" && cxT.tx.tipo === "corrido")) {
        if (podeEditar && ui.ferramenta === "texto") { escreverTexto(px, py, cxT.tx); return; }
        if (cxT.tipo === "balao" || cxT.tx.tipo === "etiqueta") { etiquetasAbertas[cxT.tx.id] = !etiquetasAbertas[cxT.tx.id]; pedirDesenho(); return; }
      }
      if (podeEditar && ui.ferramenta === "texto") { e.preventDefault(); escreverTexto(px, py, cxT ? cxT.tx : null); return; }
      if (podeEditar && ui.ferramenta === "nevoa" && selNevoa) {
        var cn = celulaEm(px, py), poeN = !selNevoa.has(cn.x + "," + cn.y);
        arrasto = { tipo: "nevoa", poe: poeN, ult: cn }; marcarNevoa(cn.x, cn.y, poeN); return;
      }
      var lt = lanternaEm(px, py);
      if (lt) { fecharMenuToken(); arrasto = { tipo: "mira", token: lt }; raiz.classList.add("is-movendo"); return; }
      var tk = tokenEm(px, py);
      fecharMenuToken();
      if (tk) {
        var mw = telaParaMundo(px, py), ct = centroTk(tk, tk.x, tk.y);
        arrasto = { tipo: "token", token: tk, px: px, py: py, px0: px, py0: py, off: { x: mw.x - ct.x, y: mw.y - ct.y }, alvo: { x: tk.x, y: tk.y, z: layerTk(tk) } };
        raiz.classList.add("is-segurando"); if (sessao && podeEditar) document.documentElement.classList.add("mp-segurando");
        pedirDesenho(); return;
      }
      // quem não edita (jogador na Sessão): arrastar com o botão esquerdo só move a vista
      if (!podeEditar && ui.ferramenta !== "regua") { arrasto = { tipo: "mover", px: px, py: py, ox: vis.ox, oy: vis.oy }; raiz.classList.add("is-movendo"); return; }
      var c = celulaEm(px, py);
      if ((ui.ferramenta === "caneta" && ui.sub.caneta === "parede") || (ui.ferramenta === "borracha" && ui.sub.borracha === "borracha" && (function () { var b = bordaPerto(px, py); return b && mapa.muros.has(b); })())) {
        var b0 = bordaPerto(px, py);
        comecarMudanca();
        arrasto = { tipo: "muro", poe: ui.ferramenta === "caneta" && !(b0 && mapa.muros.has(b0)), feitos: {} };
        if (b0) { definirMuro(b0, arrasto.poe); arrasto.feitos[b0] = 1; }
        pedirDesenho(); return;
      }
      if (ui.ferramenta === "caneta" || (ui.ferramenta === "borracha" && ui.sub.borracha === "borracha")) {
        comecarMudanca(); pintar(c.x, c.y);
        arrasto = { tipo: "pintar", ult: c }; pedirDesenho(); return;
      }
      if (usaCaixa()) {
        arrasto = { tipo: "forma", ini: c };
        var cx0 = caixaDe(c, c);
        previa = { forma: ui.ferramenta === "circulo" ? "circulo" : "quadrado", apaga: ui.ferramenta === "borracha", explode: ui.ferramenta === "explosao", caixa: cx0, cel: celsDaCaixa(cx0) };
        pedirDesenho(); return;
      }
      if (ui.ferramenta === "explosao") {
        arrasto = { tipo: "forma", area: true, ini: c };
        previa = previaExplosao(c, c);
        pedirDesenho(); return;
      }
      if (ui.ferramenta === "regua") { regua.ini = c; regua.fim = c; dica.hidden = true; pedirDesenho(); }
    });
    tela.addEventListener("pointermove", function (e) {
      var r = tela.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (recorte && recorte.p1) { recorte.fim = celulaEm(px, py); pedirDesenho(); }
      if (gotas) {   // mostra a cor que vai ser copiada
        var cm = celulaEm(px, py), corM = corDoBloco(cm.x, cm.y);
        dica.classList.add("mp-dica--gota"); dica.style.setProperty("--gota", corM || "transparent");
        mostrarDica(px, py, corM || "Bloco vazio");
        return;
      }
      if (e.pointerType === "touch" && toques.has(e.pointerId)) {
        toques.set(e.pointerId, { x: px, y: py });
        if (pinca && toques.size === 2) {
          var ps = Array.from(toques.values()), d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), cx = (ps[0].x + ps[1].x) / 2, cy = (ps[0].y + ps[1].y) / 2;
          vis.ox += cx - pinca.cx; vis.oy += cy - pinca.cy;
          zoomEm(cx, cy, d / (pinca.d || d));
          pinca = { d: d, cx: cx, cy: cy }; return;
        }
      }
      if (arrasto && arrasto.tipo === "mover") { vis.ox = arrasto.ox + px - arrasto.px; vis.oy = arrasto.oy + py - arrasto.py; pedirDesenho(); return; }
      if (arrasto && arrasto.tipo === "mira") { apontar(arrasto.token, px, py); pedirDesenho(); return; }
      if (arrasto && arrasto.tipo === "token") {
        arrasto.px = px; arrasto.py = py;
        var mq = telaParaMundo(px, py), quer = cantoEm(arrasto.token, mq.x - arrasto.off.x, mq.y - arrasto.off.y);
        arrasto.alvo = andar(arrasto.alvo, quer, arrasto.token);
        if (!arrasto.moveu && Math.hypot(px - arrasto.px0, py - arrasto.py0) > 5) arrasto.moveu = true;
        var preso = arrasto.alvo.x !== quer.x || arrasto.alvo.y !== quer.y;
        var naLista = sessao && podeEditar && naZonaDeTirar(e.clientX, e.clientY);
        raiz.classList.toggle("is-sobre-lista", naLista);
        document.documentElement.classList.toggle("mp-tirando", naLista);
        if (naLista) { dica.hidden = true; pedirDesenho(); return; }   // soltar aqui tira o token do mapa
        var motivo = arrasto.alvo.muro ? "Parede no caminho" : motivoPegada(arrasto.token, quer.x, quer.y, arrasto.alvo.z);
        if (preso && motivo || preso && arrasto.bloqueou) { arrasto.bloqueou = true; mostrarDica(px, py - 40, motivo || "Caminho bloqueado"); }
        if (!preso) { arrasto.bloqueou = false; dica.hidden = true; }
        pedirDesenho(); return;
      }
      var c = celulaEm(px, py);
      if (arrasto && arrasto.tipo === "pintar") {
        if (c.x !== arrasto.ult.x || c.y !== arrasto.ult.y) { linha(arrasto.ult, c, pintar); arrasto.ult = c; pedirDesenho(); }
        return;
      }
      if (arrasto && arrasto.tipo === "nevoa") {
        if (c.x !== arrasto.ult.x || c.y !== arrasto.ult.y) { var an = arrasto; linha(an.ult, c, function (x, y) { marcarNevoa(x, y, an.poe); }); an.ult = c; }
        return;
      }
      if (arrasto && arrasto.tipo === "muro") {
        var bm = bordaPerto(px, py);
        if (bm && !arrasto.feitos[bm]) { arrasto.feitos[bm] = 1; definirMuro(bm, arrasto.poe); pedirDesenho(); }
        return;
      }
      if (podeEditar && ui.ferramenta === "caneta" && ui.sub.caneta === "parede") { var bh = bordaPerto(px, py); if (bh !== bordaHover) { bordaHover = bh; pedirDesenho(); } }
      if (arrasto && arrasto.tipo === "forma" && arrasto.area) {
        previa = previaExplosao(arrasto.ini, c);
        mostrarDica(px, py, textoArea(arrasto.ini, c, ui.sub.explosao, ui.anguloExp));
        pedirDesenho(); return;
      }
      if (arrasto && arrasto.tipo === "forma") {
        var cx2 = caixaDe(arrasto.ini, c);
        if (e.shiftKey) { var lado = Math.max(cx2.x1 - cx2.x0, cx2.y1 - cx2.y0); cx2.x1 = cx2.x0 + lado; cx2.y1 = cx2.y0 + lado; }   // Shift: forma perfeita
        previa = { forma: ui.ferramenta === "circulo" ? "circulo" : "quadrado", apaga: ui.ferramenta === "borracha", explode: ui.ferramenta === "explosao", caixa: cx2, cel: celsDaCaixa(cx2) };
        mostrarDica(px, py, (cx2.x1 - cx2.x0 + 1) + " × " + (cx2.y1 - cx2.y0 + 1) + " blocos");
        pedirDesenho(); return;
      }
      if (ui.ferramenta === "regua" && regua.ini) {
        if (!regua.fim || c.x !== regua.fim.x || c.y !== regua.fim.y) { regua.fim = c; dica.hidden = true; pedirDesenho(); }
        clearTimeout(reguaT);
        // parado por 0,2 s: mostra a distância embaixo do mouse
        reguaT = setTimeout(function () { mostrarDica(px, py, textoRegua()); }, 200);
      }
      raiz.classList.toggle("is-sobre-token", !!tokenEm(px, py));
    });
    var soltar = function (e) {
      if (e.pointerType === "touch") { toques.delete(e.pointerId); if (toques.size < 2) pinca = null; }
      if (!arrasto) return;
      var a = arrasto; arrasto = null;
      raiz.classList.remove("is-movendo", "is-segurando", "is-sobre-lista");
      document.documentElement.classList.remove("mp-tirando", "mp-segurando");
      if (a.tipo === "mover") salvarVista();
      if (a.tipo === "mira") { tokenMudou(a.token); pedirDesenho(); }
      if (a.tipo === "pintar" || a.tipo === "muro") fecharMudanca();
      if (a.tipo === "token") {
        dica.hidden = true;
        // na Sessão o mestre tira um token soltando-o em cima da lista de personagens
        if (sessao && podeEditar && e.type === "pointerup" && naZonaDeTirar(e.clientX, e.clientY)) tirarToken(a.token);
        else if (!a.moveu && e.type === "pointerup") abrirMenuToken(a.token);   // clique sem arrastar: ações do token
        else {
          var mudou = a.alvo && (a.alvo.x !== a.token.x || a.alvo.y !== a.token.y || a.alvo.z !== layerTk(a.token));
          if (a.alvo) { a.token.x = a.alvo.x; a.token.y = a.alvo.y; a.token.z = a.alvo.z; }
          var cc = celCentro(a.token, a.token.x, a.token.y);
          if (a.token.submerso && relevoEm(cc.x, cc.y, layerTk(a.token)) !== "agua") { a.token.submerso = false; mudou = true; }   // saiu da água: emerge
          if (sessao) { if (mudou) tokenMudou(a.token); } else salvarDepois();
        }
      }
      if (a.tipo === "forma" && previa) {
        comecarMudanca();
        var derruba = previa.explode || !!previa.area;   // explosão demole: o que estiver em cima, nos layers acima, cai junto
        previa.cel.forEach(function (v, k) { var p = k.split(","); if (derruba) demolir(+p[0], +p[1], v); else definir(+p[0], +p[1], v); });
        (previa.cel.muros || []).forEach(function (k) { definirMuro(k, true); });
        fecharMudanca(); previa = null; dica.hidden = true;
      }
      pedirDesenho();
    };
    tela.addEventListener("pointerup", soltar);
    tela.addEventListener("pointercancel", function (e) { cancelarArrasto(); soltar(e); });
    tela.addEventListener("pointerleave", function () { if (ui.ferramenta === "regua") { clearTimeout(reguaT); } if (gotas) dica.hidden = true; });
    ouvir(window, "keydown", function (e) {
      if (!raiz.isConnected) return;
      var digitando = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "") || document.querySelector("dialog[open]");
      if (digitando) return;
      if (e.code === "Space") { espacoApertado = true; raiz.classList.add("is-mao"); if (document.activeElement === tela) e.preventDefault(); }
      if (!podeEditar && (e.ctrlKey || e.metaKey)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) aplicarHistorico(refazer, desfazer); else aplicarHistorico(desfazer, refazer); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); aplicarHistorico(refazer, desfazer); }
      if (e.key === "Escape") { if (selNevoa) sairNevoa(); fecharEditorTexto(); if (mira) sairMira(); if (recorte) sairRecorte(); if (gotas) sairGotas(); fecharMenuToken(); regua.ini = null; regua.fim = null; dica.hidden = true; cancelarArrasto(); pedirDesenho(); }
      // setas movem o mapa (teclado)
      var passo = 3 * tam();
      if (document.activeElement === tela) {
        if (e.key === "ArrowLeft") { vis.ox += passo; pedirDesenho(); } else if (e.key === "ArrowRight") { vis.ox -= passo; pedirDesenho(); }
        else if (e.key === "ArrowUp") { vis.oy += passo; pedirDesenho(); } else if (e.key === "ArrowDown") { vis.oy -= passo; pedirDesenho(); }
        else if (e.key === "+" || e.key === "=") zoomEm(tela.clientWidth / 2, tela.clientHeight / 2, 1.25);
        else if (e.key === "-") zoomEm(tela.clientWidth / 2, tela.clientHeight / 2, 1 / 1.25);
      }
    });
    ouvir(window, "keyup", function (e) { if (e.code === "Space") { espacoApertado = false; raiz.classList.remove("is-mao"); } });
  }
  function cancelarArrasto() {
    if (!arrasto) return;
    if (arrasto.tipo === "pintar") fecharMudanca();
    arrasto = null; previa = null; raiz.classList.remove("is-movendo", "is-segurando");
  }

  /* ---------- Limpar tudo (pede confirmação) ---------- */
  var dlgLimpar = null;
  function confirmarLimpar() {
    if (!dlgLimpar) { dlgLimpar = el("dialog", "modal mp-limpar"); dlgLimpar.setAttribute("aria-labelledby", "mplim-t"); document.body.appendChild(dlgLimpar); }
    var d = dlgLimpar; d.textContent = "";
    var h = el("h2", "", sessao ? "Tirar o mapa da sessão?" : "Limpar tudo?"); h.id = "mplim-t"; d.appendChild(h);
    d.appendChild(el("p", "mp-limpar__txt", sessao
      ? "O mapa e todos os tokens somem da sessão para todo mundo. O mapa da aba Mapas continua do jeito que está."
      : "O mapa inteiro será excluído: blocos, imagem importada, tokens e título. Isso não pode ser desfeito. Se quiser guardar uma cópia, exporte o mapa antes."));
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var yes = el("button", "btn mp-btn-perigo", sessao ? "Tirar o mapa" : "Limpar tudo"); yes.type = "button";
    acts.appendChild(no); acts.appendChild(yes); d.appendChild(acts);
    no.addEventListener("click", function () { d.close(); });
    yes.addEventListener("click", function () {
      d.close();
      if (sessao) { if (opts.aoTirar) opts.aoTirar(); return; }
      mapa.celulas = new Map(); sujar(); mapa.layers = null; mapa.recortes = null; mapa.sombras = false; mapa.caverna = false; mapa.muros = new Map(); mapa.nevoa = new Map(); mapa.textos = []; mapa.fundo = null; mapa.tokens = []; mapa.titulo = "Mapa sem título"; mapa.papel = null;
      tituloEl.textContent = mapa.titulo;
      desfazer = []; refazer = []; previa = null; regua.ini = null; regua.fim = null; dica.hidden = true;
      imgFundoSrc = ""; imgFundo = null;
      salvar(); centralizar(0, 0);
      toast("O mapa foi limpo.");
    });
    d.showModal(); no.focus();
  }

  /* ---------- Exportar ---------- */
  function limitesDoConteudo() {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    mapa.celulas.forEach(function (v, k) { var p = k.split(","), x = +p[0], y = +p[1]; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1; });
    var img = fundoImagem();
    if (mapa.fundo && img) {
      var f = mapa.fundo;
      x0 = Math.min(x0, Math.floor(f.x)); y0 = Math.min(y0, Math.floor(f.y));
      x1 = Math.max(x1, Math.ceil(f.x + img.naturalWidth / f.porCel)); y1 = Math.max(y1, Math.ceil(f.y + img.naturalHeight / f.porCel));
    }
    return isFinite(x0) ? { x0: x0, y0: y0, x1: x1, y1: y1 } : null;
  }
  var dlgExp = null;
  function abrirExportar() {
    var lim = mapa.limite ? Object.assign({}, mapa.limite) : limitesDoConteudo();
    if (!lim) { toast("O mapa ainda está vazio: desenhe alguma coisa antes de exportar."); return; }
    if (!dlgExp) { dlgExp = el("dialog", "modal mp-exp"); dlgExp.setAttribute("aria-labelledby", "mpexp-t"); document.body.appendChild(dlgExp); }
    var d = dlgExp; d.textContent = "";
    var h = el("h2", "", "Exportar mapa"); h.id = "mpexp-t"; d.appendChild(h);
    var f1 = el("div", "field"); var l1 = el("label", "", "Qual formato deseja salvar?"); l1.htmlFor = "mpexp-fmt";
    var sel = el("select"); sel.id = "mpexp-fmt";
    sel.appendChild(new Option("Arquivo de mapa (.dbomapa)", "dbomapa"));
    sel.appendChild(new Option("Imagem PNG (fundo transparente onde não foi preenchido)", "png"));
    sel.appendChild(new Option("Imagem JPG (fundo branco)", "jpg"));
    f1.appendChild(l1); f1.appendChild(sel); d.appendChild(f1);
    var chkL = el("label", "check mp-exp__chk");
    var chk = el("input"); chk.type = "checkbox"; chk.checked = true;
    chkL.appendChild(chk); chkL.appendChild(el("span", "", "Limitar a imagem pela borda do mapa"));
    d.appendChild(chkL);
    var info = el("p", "mp-exp__info"); d.appendChild(info);
    var tamanho = function () {
      var w = (lim.x1 - lim.x0) * CEL, hh = (lim.y1 - lim.y0) * CEL;
      if (!chk.checked) { w = Math.ceil(w / 500) * 500; hh = Math.ceil(hh / 500) * 500; }
      return { w: w, h: hh };
    };
    var mostrar = function () {
      var arq = sel.value === "dbomapa";
      chkL.hidden = arq;
      if (arq) { info.textContent = "Um arquivo de texto com o mapa inteiro: blocos, cores, grade e imagem de fundo. Importe no editor ou na Sessão para abrir de novo."; return; }
      var tt = tamanho(); info.textContent = "Imagem de " + tt.w + " × " + tt.h + " px" + (chk.checked ? ", cortada nos blocos mais distantes." : ", em pedaços de 500 px.");
    };
    chk.addEventListener("change", mostrar); sel.addEventListener("change", mostrar); mostrar();
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var ok = el("button", "btn", "Exportar"); ok.type = "button";
    acts.appendChild(no); acts.appendChild(ok); d.appendChild(acts);
    no.addEventListener("click", function () { d.close(); });
    ok.addEventListener("click", function () {
      if (sel.value === "dbomapa") {
        try {
          var dd = serializar(); delete dd.limite;
          baixar(nomeDeArquivo(mapa.titulo) + ".dbomapa", new Blob([paraArquivo(dd)], { type: "application/json" }));
        } catch (er) { toast(er.message); }
        d.close(); return;
      }
      var tt = tamanho(), cv = document.createElement("canvas");
      cv.width = tt.w; cv.height = tt.h;
      var g = cv.getContext("2d");
      var jpg = sel.value === "jpg";
      if (jpg) { g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, cv.width, cv.height); }
      if (mapa.papel) { g.fillStyle = mapa.papel; g.fillRect(0, 0, cv.width, cv.height); }   // fundo escolhido pelo mestre
      // sem limitar: o conteúdo fica centralizado no tamanho arredondado de 500 em 500
      var padX = Math.floor((tt.w - (lim.x1 - lim.x0) * CEL) / 2), padY = Math.floor((tt.h - (lim.y1 - lim.y0) * CEL) / 2);
      var ox = padX - lim.x0 * CEL, oy = padY - lim.y0 * CEL;
      var extraX = Math.ceil(padX / CEL), extraY = Math.ceil(padY / CEL);
      var antes = previa; previa = null;
      desenharMapa(g, { x0: lim.x0 - extraX, y0: lim.y0 - extraY, x1: lim.x1 + extraX, y1: lim.y1 + extraY, t: CEL, ox: ox, oy: oy, grade: true, V: 1, soAte: false, marcas: false });
      previa = antes;
      var nome = (mapa.titulo || "mapa").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "mapa";
      cv.toBlob(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = nome + (jpg ? ".jpg" : ".png");
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      }, jpg ? "image/jpeg" : "image/png", .92);
      d.close();
    });
    d.showModal();
  }

  /* ---------- Importar (com a grade por cima; sem grade na imagem, tenta deduzir o tamanho dos blocos) ---------- */
  // Arquivo .dbomapa: substitui o mapa inteiro (pede confirmação se já houver algo desenhado).
  function importarArquivo(arquivo) {
    lerTexto(arquivo).then(deArquivo).then(function (d) {
      var aplicar = function () {
        aplicarDados(d); mapa.limite = null; mapa.tokens = [];
        tituloEl.textContent = mapa.titulo;
        desfazer = []; refazer = []; previa = null; regua.ini = null; regua.fim = null; imgFundoSrc = ""; imgFundo = null;
        atualizarBarra(); salvar();
        var cs = d.celulas, cx = 0, cy = 0;
        if (cs.length) { var xs = cs.map(function (c) { return c[0]; }), ys = cs.map(function (c) { return c[1]; }); cx = Math.round((Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2); cy = Math.round((Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2); }
        centralizar(cx, cy);
        toast("Mapa “" + mapa.titulo + "” aberto: " + cs.length + (cs.length === 1 ? " bloco." : " blocos."));
      };
      if (!mapa.celulas.size && !mapa.fundo) return aplicar();
      confirmar("Abrir este mapa?", "O mapa que está no editor agora será trocado por “" + d.titulo + "”. Se quiser guardar o atual, exporte antes.", "Abrir mapa", aplicar);
    }).catch(function (err) { toast(err.message); });
  }
  var dlgConf = null;
  function confirmar(titulo, texto, rotulo, fn) {
    if (!dlgConf) { dlgConf = el("dialog", "modal mp-limpar"); dlgConf.setAttribute("aria-labelledby", "mpconf-t"); document.body.appendChild(dlgConf); }
    var d = dlgConf; d.textContent = "";
    var h = el("h2", "", titulo); h.id = "mpconf-t"; d.appendChild(h);
    d.appendChild(el("p", "mp-limpar__txt", texto));
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var yes = el("button", "btn", rotulo); yes.type = "button";
    acts.appendChild(no); acts.appendChild(yes); d.appendChild(acts);
    no.addEventListener("click", function () { d.close(); });
    yes.addEventListener("click", function () { d.close(); fn(); });
    d.showModal(); yes.focus();
  }
  function importar(arquivo) {
    if (ehArquivoDeMapa(arquivo)) return importarArquivo(arquivo);
    if (!/^image\/(png|jpeg)$/.test(arquivo.type) && !/\.(png|jpe?g)$/i.test(arquivo.name || "")) { toast("Escolha uma imagem PNG ou JPEG, ou um arquivo .dbomapa."); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var gr = detectarGrade(img), porCel, offX = 0, offY = 0;
        if (gr) { porCel = gr.porCel; offX = gr.offX; offY = gr.offY; }
        else porCel = Math.max(16, Math.round(Math.max(img.naturalWidth, img.naturalHeight) / 40));
        // a imagem começa onde a vista está agora (canto de cima, à esquerda, um pouco para dentro)
        var c = celulaEm(80, 120);
        mapa.fundo = { src: rd.result, x: c.x - offX / porCel, y: c.y - offY / porCel, porCel: porCel };
        imgFundoSrc = ""; salvarDepois(); pedirDesenho();
        var nb = Math.round(img.naturalWidth / porCel) + " × " + Math.round(img.naturalHeight / porCel);
        toast(gr ? "Grade encontrada na imagem: " + Math.round(porCel) + " px por bloco (" + nb + " blocos)." : "Não achei grade na imagem: deduzi " + Math.round(porCel) + " px por bloco (" + nb + " blocos).");
      };
      img.onerror = function () { toast("Não consegui abrir essa imagem."); };
      img.src = rd.result;
    };
    rd.readAsDataURL(arquivo);
  }

  /* ---------- Instância ---------- */
  carregar(); montar(container); zoomTxt.textContent = Math.round(vis.zoom * 100) + "%"; pedirDesenho();
  var inst = {
    // Sessão: o mestre mudou o mapa (outra pessoa recebe aqui a versão nova)
    trocarDados: function (d) {
      if (!d) return;
      if (arrasto && arrasto.tipo !== "mover" && arrasto.tipo !== "token") cancelarArrasto();
      aplicarDados(d); imgFundoSrc = ""; desfazer = []; refazer = [];
      if (tituloEl) tituloEl.textContent = mapa.titulo;
      pedirDesenho();
    },
    // Sessão: tokens vindos do banco (o que está sendo arrastado aqui fica onde está)
    trocarTokens: function (lista) {
      var seg = arrasto && arrasto.token;
      mapa.tokens = (lista || []).map(function (t) { return seg && t.id === seg.id ? seg : Object.assign({}, t); });
      if (mira) mira = mapa.tokens.filter(function (t) { return t.id === mira.id; })[0] || null;
      atualizarBandeja(); pedirDesenho();
    },
    atualizarBandeja: atualizarBandeja,
    // Sessão (mestre): arrastar um personagem/NPC do painel da esquerda para o mapa; clique sem arrastar põe no meio.
    arrastarPersonagem: function (p, no, e) { if (podeEditar) arrastarDaBandeja(p, no, e); },
    porNoMeio: function (p) {
      if (!podeEditar) return;
      var r = tela.getBoundingClientRect(), tkp = { personagem_id: p.id }, mc = telaParaMundo(r.width / 2, r.height / 2), c = blocoLivrePerto(cantoEm(tkp, mc.x, mc.y), tkp);
      if (!c) return toast("Não achei lugar livre no meio da vista.");
      colocar(p, c.x, c.y);
      toast(p.nome + " entrou no mapa. Segure e arraste o token para mover.");
    },
    noMapa: function (id) { return mapa.tokens.some(function (t) { return t.personagem_id === id; }); },
    redesenhar: pedirDesenho,
    destruir: function () {
      globais.forEach(function (g) { if (g.length === 1) g[0].disconnect(); else g[0].removeEventListener(g[1], g[2], g[3]); });
      globais = [];
      if (raiz && raiz.parentNode) raiz.parentNode.removeChild(raiz);
    },
    _estado: function () { var v = visaoAtual(); return { mapa: mapa, vis: vis, ui: ui, zoomMin: zoomMin(), visao: v ? { blocos: v.vistos.size, tokens: Array.from(v.tokens) } : null }; }
  };
  ultima = inst;
  return inst;
  }

  /* ---------- Levar um mapa para a Sessão (com a borda calculada) ---------- */
  function carregarImagem(src) {
    return new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { erro(new Error("Não consegui abrir a imagem do mapa.")); }; i.src = src; });
  }
  // Mapa salvo na aba Mapas (neste navegador) ou null.
  function mapaDaAba() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  // Dados do editor → dados da sessão: borda = os blocos e a imagem mais distantes.
  function prepararParaSessao(d) {
    d = d || {};
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    (d.celulas || []).forEach(function (c) { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0] + 1); y1 = Math.max(y1, c[1] + 1); });
    var base = { v: 1, titulo: d.titulo || "Mapa sem título", celulas: d.celulas || [], cor: d.cor || "rgb(255, 255, 255)", grade: d.grade || { on: true, cor: "rgba(120, 136, 160, 0.45)", esp: 1 }, papel: d.papel || null, fundo: d.fundo || null, layers: d.layers || null, sombras: !!d.sombras, caverna: !!d.caverna, muros: d.muros || [], nevoa: d.nevoa || [], textos: d.textos || [] };
    var feito = function () {
      if (!isFinite(x0)) throw new Error("Esse mapa está vazio. Desenhe alguma coisa na aba Mapas antes de importar.");
      base.limite = { x0: x0, y0: y0, x1: x1, y1: y1 };
      return base;
    };
    if (!base.fundo) return Promise.resolve().then(feito);
    return carregarImagem(base.fundo.src).then(function (img) {
      var f = base.fundo;
      // pedacinhos de bloco (menos de 15%) na beirada da imagem não viram uma fileira a mais
      x0 = Math.min(x0, Math.floor(f.x + .15)); y0 = Math.min(y0, Math.floor(f.y + .15));
      x1 = Math.max(x1, Math.ceil(f.x + img.naturalWidth / f.porCel - .15)); y1 = Math.max(y1, Math.ceil(f.y + img.naturalHeight / f.porCel - .15));
      return feito();
    });
  }
  // Uma imagem do computador vira um mapa da sessão (a grade da imagem é encontrada quando existe).
  function dadosDeImagem(arquivo) {
    if (!arquivo || !(/^image\/(png|jpeg)$/.test(arquivo.type) || /\.(png|jpe?g)$/i.test(arquivo.name || ""))) return Promise.reject(new Error("Escolha uma imagem PNG ou JPEG."));
    return new Promise(function (ok, erro) {
      var rd = new FileReader();
      rd.onload = function () { ok(rd.result); };
      rd.onerror = function () { erro(new Error("Não consegui ler a imagem.")); };
      rd.readAsDataURL(arquivo);
    }).then(function (src) {
      return carregarImagem(src).then(function (img) {
        var gr = detectarGrade(img), porCel = gr ? gr.porCel : Math.max(16, Math.round(Math.max(img.naturalWidth, img.naturalHeight) / 40));
        var offX = gr ? gr.offX : 0, offY = gr ? gr.offY : 0;
        var titulo = String(arquivo.name || "Mapa").replace(/\.[a-z0-9]+$/i, "").slice(0, 60) || "Mapa";
        var f = { src: src, x: -offX / porCel, y: -offY / porCel, porCel: porCel };
        return prepararParaSessao({ titulo: titulo, celulas: [], fundo: f, grade: { on: !gr, cor: "rgba(120, 136, 160, 0.45)" } });
      });
    });
  }

  return {
    iniciar: function (container) { return criar(container, {}); },
    criar: criar,
    mapaDaAba: mapaDaAba,
    prepararParaSessao: prepararParaSessao,
    dadosDeImagem: dadosDeImagem,
    // Arquivo .dbomapa → dados da sessão (com a borda calculada)
    dadosDeArquivo: function (arquivo) { return lerTexto(arquivo).then(deArquivo).then(prepararParaSessao); },
    ehArquivoDeMapa: ehArquivoDeMapa,
    paraArquivo: paraArquivo,
    deArquivo: deArquivo,
    // para testes
    _estado: function () { return ultima ? ultima._estado() : null; },
    _detectarGrade: detectarGrade
  };
})();
