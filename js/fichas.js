// Dragon Ball Omega — modelos de ficha e pop-up "Personalizar".
// Cada personagem escolhe um modelo de ficha (visual), um modelo de atributos (esfera, gráfico, sonar ou esfera lisa) e um modo de visualização (clássico, moderno ou navegação).
// Guardado em c.fichaModelo ("", nz1, nz2, gue, pat, len) e c.atributosModelo ("", esfera, grafico, sonar, lisa) e c.visualizacao ("", artefato, navegacao).
// O visual vem de css/fichas.css (html[data-ficha]) e a arte de js/fichas-arte.js. Depende de js/sheet.js.
window.DBOFichas = (function () {
  var root = document.documentElement;
  var ART = window.DBOFichasArte || { prev: {} };
  var $ = function (id) { return document.getElementById(id); };

  var FICHAS = [
    { id: "", nome: "Clássica", desc: "O visual de sempre: laranja e dourado com nuvens nimbus.", trans: "nuvens vermelhas e chamas nos multiplicadores" },
    { id: "nz1", nome: "Namizureka 01", desc: "Mar profundo com bolhas, algas e raios de luz. Base visual da landing.", trans: "algas mortas, mar avermelhado" },
    { id: "nz2", nome: "Namizureka 02", desc: "Vitrais de catedral e molduras douradas. Imponência de rei.", trans: "vitrais quebram em chamas, dourado vira vermelho" },
    { id: "gue", nome: "Guerreiros", desc: "Verde sereno, nuvens douradas lisas passando devagar.", trans: "nuvens vermelhas e mais rápidas" },
    { id: "pat", nome: "Patrulha", desc: "Roxo galáctico com estrelas cadentes e ar de dossiê investigativo.", trans: "vira cartaz de procurado, cadente em chamas" },
    { id: "len", nome: "Lenda Antiga", desc: "Jade polido e ouro, soberania de realeza. Título com brilho.", trans: "fundo sangra em vermelho, números queimam" }
  ];
  var ATRIBUTOS = [
    { id: "esfera", nome: "Esfera", desc: "Esfera do dragão, uma estrela por atributo e o Power Level no centro.", trans: "esfera toda avermelhada" },
    { id: "grafico", nome: "Gráfico", desc: "Radar de seis pontas com o Power Level em cima.", trans: "gráfico avermelhado, como a esfera" },
    { id: "sonar", nome: "Sonar", desc: "Mapa de sonar do mar, cada atributo é uma esfera laranja no radar.", trans: "sonar rachado e quebrado" },
    { id: "lisa", nome: "Esfera lisa", desc: "Esfera lisa com os seis atributos em volta e o Corpo Base no centro.", trans: "esfera toda avermelhada",
      prev: '<svg viewBox="0 0 82 82" role="img" aria-label="Prévia da esfera lisa"><rect width="82" height="82" fill="#17130D"/><circle cx="41" cy="41" r="31" fill="#F28A1E" fill-opacity=".16" stroke="#F5C451" stroke-width="1.4"/><polygon points="41,16 62.6,28.5 62.6,53.5 41,66 19.4,53.5 19.4,28.5" fill="none" stroke="#F5C451" stroke-opacity=".45" stroke-width=".9"/><circle cx="41" cy="41" r="9.5" fill="#241309" stroke="#F5C451" stroke-width="1.2"/><rect x="36.5" y="39.8" width="9" height="2.4" fill="#F5C451"/><g fill="#241309" stroke="#F5C451" stroke-width="1.2"><circle cx="41" cy="16" r="6"/><circle cx="62.6" cy="28.5" r="6"/><circle cx="62.6" cy="53.5" r="6"/><circle cx="41" cy="66" r="6"/><circle cx="19.4" cy="53.5" r="6"/><circle cx="19.4" cy="28.5" r="6"/></g></svg>' }
  ];
  var VISUAIS = [
    { id: "", nome: "Clássico", desc: "A ficha como é hoje: Power Level no meio da esfera e o cabeçalho só com nome e nível.",
      prev: '<svg viewBox="0 0 116 72" role="img" aria-label="Prévia do modo clássico"><rect width="116" height="72" fill="#17130D"/><rect x="6" y="6" width="52" height="12" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".7"/><circle cx="14" cy="12" r="3.5" fill="#F5C451"/><rect x="21" y="9" width="18" height="2.4" fill="#F5C451"/><rect x="21" y="13.4" width="10" height="1.8" fill="#F5C451" opacity=".5"/><rect x="6" y="22" width="52" height="14" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="6" y="39" width="52" height="27" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><circle cx="32" cy="52.5" r="10" fill="none" stroke="#F5C451" stroke-width="1.2"/><rect x="26" y="51.5" width="12" height="2.4" fill="#F28A1E"/><rect x="62" y="6" width="48" height="22" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="62" y="31" width="48" height="12" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="62" y="46" width="48" height="20" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/></svg>' },
    { id: "artefato", nome: "Moderno", desc: "O Power Level vai para o cabeçalho, com raça e classe ao lado do nível. Os atributos ganham um título e o Corpo Base fica no centro da esfera.",
      prev: '<svg viewBox="0 0 116 72" role="img" aria-label="Prévia do modo moderno"><rect width="116" height="72" fill="#17130D"/><rect x="6" y="6" width="104" height="13" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".7"/><circle cx="14" cy="12.5" r="3.5" fill="#F5C451"/><rect x="21" y="9.5" width="18" height="2.4" fill="#F5C451"/><rect x="21" y="14" width="26" height="1.8" fill="#F5C451" opacity=".5"/><rect x="74" y="9" width="22" height="3" fill="#F28A1E"/><rect x="74" y="14" width="14" height="1.8" fill="#F5C451" opacity=".5"/><rect x="100" y="9.5" width="7" height="6" rx="2" fill="none" stroke="#F5C451" stroke-opacity=".7"/><rect x="6" y="23" width="50" height="13" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="6" y="39" width="50" height="27" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="10" y="42" width="14" height="2" fill="#F5C451" opacity=".8"/><circle cx="31" cy="55" r="9" fill="none" stroke="#F5C451" stroke-width="1.2"/><rect x="27" y="54" width="8" height="2.2" fill="#F5C451" opacity=".6"/><rect x="60" y="23" width="50" height="22" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="60" y="48" width="50" height="18" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/></svg>' },
    { id: "navegacao", nome: "Navegação", desc: "Duas colunas: à esquerda ficam o personagem, os atributos e a vitalidade, sempre à vista. À direita, abas separam Golpes, Técnicas, Inventário e Descrição.",
      prev: '<svg viewBox="0 0 116 72" role="img" aria-label="Prévia do modo navegação"><rect width="116" height="72" fill="#17130D"/><rect x="6" y="6" width="46" height="15" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".7"/><circle cx="13" cy="12" r="3" fill="#F5C451"/><rect x="19" y="9" width="16" height="2.2" fill="#F5C451"/><rect x="19" y="13" width="22" height="1.6" fill="#F5C451" opacity=".5"/><rect x="10" y="17" width="20" height="2.2" fill="#F28A1E"/><rect x="6" y="24" width="46" height="30" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="10" y="27" width="38" height="3" rx="1" fill="#F5C451" opacity=".35"/><circle cx="29" cy="42" r="9" fill="none" stroke="#F5C451" stroke-width="1.1"/><g fill="#F5C451"><circle cx="29" cy="33.5" r="1.8"/><circle cx="36.5" cy="37.5" r="1.8"/><circle cx="36.5" cy="46.5" r="1.8"/><circle cx="29" cy="50.5" r="1.8"/><circle cx="21.5" cy="46.5" r="1.8"/><circle cx="21.5" cy="37.5" r="1.8"/></g><rect x="6" y="57" width="46" height="9" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="9" y="59" width="30" height="2" rx="1" fill="#E0584B"/><rect x="9" y="62.5" width="22" height="2" rx="1" fill="#6FB1FF"/><rect x="58" y="6" width="52" height="9" rx="4.5" fill="none" stroke="#F5C451" stroke-opacity=".7"/><rect x="60" y="7.5" width="12" height="6" rx="3" fill="#F5C451"/><rect x="75" y="9.8" width="7" height="1.6" fill="#F5C451" opacity=".5"/><rect x="85" y="9.8" width="7" height="1.6" fill="#F5C451" opacity=".5"/><rect x="95" y="9.8" width="7" height="1.6" fill="#F5C451" opacity=".5"/><rect x="58" y="19" width="52" height="16" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/><rect x="58" y="38" width="52" height="28" rx="3" fill="none" stroke="#F5C451" stroke-opacity=".5"/></svg>' }
  ];
  var FONTS = { nz2: "family=Cinzel:wght@500;700", pat: "family=IBM+Plex+Mono:wght@400;600" };
  var STORE = "dbo-ficha";

  var current = null;     // modelo de ficha aplicado agora
  var previewing = false; // pop-up aberto: o que está na tela é só uma prévia

  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0] || list[0]; }
  function loadFont(id) {
    if (!FONTS[id] || document.getElementById("font-" + id)) return;
    var l = document.createElement("link");
    l.id = "font-" + id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?" + FONTS[id] + "&display=swap";
    document.head.appendChild(l);
  }

  /* ---------- Camada decorativa ---------- */
  var layer = null, nave = null;
  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement("div");
    layer.className = "ficha-atmos";
    layer.setAttribute("aria-hidden", "true");
    document.body.insertBefore(layer, document.body.firstChild);
    return layer;
  }
  function clearArt() {
    if (layer) layer.textContent = "";
    if (nave) { nave.remove(); nave = null; }
    stopSky();
  }
  function buildArt(id) {
    clearArt();
    var a = ART[id];
    if (!id || !a) return;
    ensureLayer().insertAdjacentHTML("afterbegin", a.html);
    if (a.nave) {       // vitrais: ficam no fluxo da página, logo abaixo do cabeçalho
      nave = document.createElement("div");
      nave.className = "nave";
      nave.setAttribute("aria-hidden", "true");
      nave.innerHTML = a.nave;
      var head = document.querySelector(".site-header");
      if (head && head.parentNode) head.parentNode.insertBefore(nave, head.nextSibling);
    }
    if (id === "pat") startSky();
  }

  /* ---------- Patrulha: céu com estrelas e estrelas cadentes ---------- */
  var sky = null;
  function stopSky() { if (sky) { sky.dead = true; sky = null; } }
  function startSky() {
    var cv = $("sky");
    if (!cv) return;
    var me = sky = { dead: false };
    var x = cv.getContext("2d"), W, H, stars = [], met = [], dpr = Math.min(window.devicePixelRatio || 1, 2), nextM = 0;
    var still = matchMedia("(prefers-reduced-motion: reduce)").matches || root.classList.contains("no-motion");
    function col(nm) { return getComputedStyle(root).getPropertyValue(nm).trim(); }
    function fire() { return root.classList.contains("is-transformed"); }
    function size() {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = []; var n = Math.round(W * H / 5200);
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.4 });
    }
    function spawn() {
      var a = Math.PI / 180 * (28 + Math.random() * 14), sp = 7 + Math.random() * 5;
      met.push({ x: Math.random() * W * 1.1, y: -20, vx: -Math.cos(a) * sp, vy: Math.sin(a) * sp, l: (70 + Math.random() * 90) * (fire() ? 2.6 : 1), sp: [] });
    }
    function frame(t) {
      if (me.dead) return;
      x.clearRect(0, 0, W, H);
      var sc = col("--star"), mc = col("--meteor"), F = fire();
      stars.forEach(function (s) { var al = .35 + .65 * Math.abs(Math.sin(s.p + t / 1000 * s.s)); x.fillStyle = "rgba(" + sc + "," + al.toFixed(2) + ")"; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill(); });
      if (!still) {
        if (t > nextM) { spawn(); nextM = t + (F ? 500 + Math.random() * 900 : 1800 + Math.random() * 3600); }
        met = met.filter(function (m) {
          m.x += m.vx; m.y += m.vy;
          var d = Math.hypot(m.vx, m.vy), tx = m.x - m.vx / d * m.l, ty = m.y - m.vy / d * m.l, g = x.createLinearGradient(m.x, m.y, tx, ty);
          if (F) {
            g.addColorStop(0, "rgba(255,244,190,1)"); g.addColorStop(.12, "rgba(255,170,40,.95)"); g.addColorStop(.5, "rgba(230,60,20,.6)"); g.addColorStop(1, "rgba(120,10,0,0)");
            if (Math.random() < .7) m.sp.push({ x: m.x, y: m.y, vx: (Math.random() - .5) * 1.2, vy: Math.random() * 1.4, a: 1 });
            m.sp = m.sp.filter(function (s) { s.x += s.vx; s.y += s.vy; s.a -= .018; if (s.a <= 0) return false; x.fillStyle = "rgba(255," + (120 + Math.random() * 100 | 0) + ",40," + s.a.toFixed(2) + ")"; x.fillRect(s.x, s.y, 2, 2); return true; });
          } else { g.addColorStop(0, "rgba(" + mc + ",.95)"); g.addColorStop(1, "rgba(" + mc + ",0)"); }
          x.strokeStyle = g; x.lineWidth = F ? 3.4 : 1.8; x.lineCap = "round"; x.beginPath(); x.moveTo(m.x, m.y); x.lineTo(tx, ty); x.stroke();
          x.fillStyle = F ? "rgba(255,240,180,1)" : "rgba(" + mc + ",1)"; x.beginPath(); x.arc(m.x, m.y, F ? 3 : 1.8, 0, 6.283); x.fill();
          return (m.y < H + 100 && m.x > -200) || (m.sp.length > 0 && m.y < H + 400);
        });
        requestAnimationFrame(frame);
      }
    }
    size();
    window.addEventListener("resize", function () { if (!me.dead) size(); });
    if (still) { frame(0); new MutationObserver(function () { frame(0); }).observe(root, { attributes: true }); } else { spawn(); requestAnimationFrame(frame); }
  }

  /* ---------- Aplicar ---------- */
  function apply(id) {
    id = id || "";
    if (id === current) return;
    current = id;
    if (id) root.setAttribute("data-ficha", id); else root.removeAttribute("data-ficha");
    loadFont(id);
    buildArt(id);
    try { if (id) localStorage.setItem(STORE, id); else localStorage.removeItem(STORE); } catch (e) {}
  }

  /* ---------- Pop-up Personalizar ---------- */
  var applied = { ficha: "", attr: "esfera" };

  function optHtml(group, o, checked, at) {
    return '<label class="pz__opt"><input type="radio" name="pz-' + group + '" value="' + o.id + '"' + (checked ? " checked" : "") + '>' +
      (o.prev || ART.prev[o.id === "" && group === "ficha" ? "" : o.id] || "") +
      '<div><b>' + o.nome + '</b><small>' + o.desc + '</small><em>' + o.trans + '</em></div></label>';
  }
  function build(dlg, c) {
    applied.ficha = c.fichaModelo || "";
    applied.attr = c.atributosModelo || "esfera";
    applied.vis = c.visualizacao || "";
    dlg.innerHTML =
      '<div class="pz__head"><h2 id="custom-title">Personalizar</h2>' +
      '<button class="modal__close" type="button" data-pz-close aria-label="Fechar">×</button></div>' +
      '<div class="pz__scroll"><div class="pz__cols">' +
      '<div class="pz__col"><h3>Modelo da ficha</h3><p class="pz__sub">O visual completo da ficha. Cada um muda o fundo, as animações e a transformação.</p>' +
      '<fieldset class="pz__opts" id="pz-fichas"><legend hidden>Modelo da ficha</legend>' +
      FICHAS.map(function (o) { return optHtml("ficha", o, o.id === applied.ficha); }).join("") + '</fieldset></div>' +
      '<div class="pz__col"><h3>Modelo dos atributos</h3><p class="pz__sub">Como os seis atributos aparecem na ficha.</p>' +
      '<fieldset class="pz__opts pz__opts--at" id="pz-attrs"><legend hidden>Modelo dos atributos</legend>' +
      ATRIBUTOS.map(function (o) { return optHtml("attr", o, o.id === applied.attr); }).join("") + '</fieldset></div></div>' +
      '<div class="pz__vis"><h3>Modo de visualização</h3><p class="pz__sub">O jeito de organizar a ficha, independente do visual escolhido acima.</p>' +
      '<fieldset class="pz__opts pz__opts--vis" id="pz-vis"><legend hidden>Modo de visualização</legend>' +
      VISUAIS.map(function (o) {
        return '<label class="pz__opt"><input type="radio" name="pz-vis" value="' + o.id + '"' + (o.id === applied.vis ? " checked" : "") + '>' + o.prev + '<div><b>' + o.nome + '</b><small>' + o.desc + '</small></div></label>';
      }).join("") + '</fieldset></div></div>' +
      '<div class="pz__foot"><p class="pz__sum" aria-live="polite">Ficha <b id="pz-s1"></b> · Atributos <b id="pz-s2"></b> · Visualização <b id="pz-s3"></b></p>' +
      '<div class="pz__btns"><button class="btn btn--ghost" type="button" data-pz-close>Cancelar</button><button class="btn" type="button" id="pz-ok">Aplicar</button></div></div>';
    dlg.querySelectorAll("[data-pz-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("change", onPick);
    $("pz-ok").addEventListener("click", function () { commit(dlg); });
    summary();
  }
  function picked(name) { var r = document.querySelector('input[name="pz-' + name + '"]:checked'); return r ? r.value : ""; }
  function summary() {
    $("pz-s1").textContent = find(FICHAS, picked("ficha")).nome;
    $("pz-s2").textContent = find(ATRIBUTOS, picked("attr")).nome;
    $("pz-s3").textContent = find(VISUAIS, picked("vis")).nome;
  }
  function onPick(e) {
    if (!e.target.name || e.target.name.indexOf("pz-") !== 0) return;
    summary();
    if (e.target.name === "pz-ficha") apply(e.target.value);      // prévia ao vivo; "Cancelar" desfaz
    else if (e.target.name === "pz-vis") rerenderVisual(e.target.value);
    else rerender(picked("attr"));
  }
  var previewAttr = null, previewVisual = null;
  function rerender(attr) { previewAttr = attr; if (window.DBOSheet) DBOSheet.refresh(); }
  function rerenderVisual(v) { previewVisual = v; if (window.DBOSheet) DBOSheet.refresh(); }
  function commit(dlg) {
    var f = picked("ficha"), a = picked("attr"), v = picked("vis");
    var ok = DBOSheet.save({ fichaModelo: f, atributosModelo: a === "esfera" ? "" : a, visualizacao: v });
    if (ok === false) return;     // ficha de outra pessoa: só olhando (o aviso já foi mostrado)
    applied.ficha = f; applied.attr = a; applied.vis = v;
    dlg.close();
    if (window.DBOUI && DBOUI.toast) { /* sem aviso: a ficha já mudou na tela */ }
  }
  function open() {
    var dlg = $("custom-dialog");
    build(dlg, DBOSheet.get());
    previewing = true;
    dlg.addEventListener("close", function onClose() {
      dlg.removeEventListener("close", onClose);
      previewing = false; previewAttr = null; previewVisual = null;
      apply(DBOSheet.get().fichaModelo || "");     // desfaz a prévia se não aplicou
      DBOSheet.refresh();
    });
    dlg.showModal();
  }

  /* ---------- Para o resto da ficha ---------- */
  function atributos(c) { return previewAttr || c.atributosModelo || "esfera"; }
  // Modo de visualização: "" (clássico), "artefato" (moderno) ou "navegacao".
  function modo(c) { var v = previewVisual !== null ? previewVisual : c.visualizacao; return v === "artefato" || v === "navegacao" ? v : ""; }
  // Verdadeiro nos dois modos "ricos" (PL no cabeçalho, Corpo Base no centro da esfera).
  function artefato(c) { return modo(c) !== ""; }
  function plLabel(c) {
    var transf = !!(c && c.transformacaoAtiva) && window.DBOTransf && DBOTransf.ativa(c);
    return (current === "pat" && transf) ? "Recompensa" : "Power Level";
  }

  // js/sheet.js já carregou: assina agora (a ficha pode terminar de abrir antes do DOMContentLoaded) e aplica a que já estiver aberta.
  // Guarda o modelo de cada personagem: na próxima vez, a ficha (e a tela de carregamento) já abre com ele (js/ficha-cedo.js).
  var MAP = "dbo-ficha-map";
  function lembrar(c) {
    if (!c || !c.id) return;
    try { var m = JSON.parse(localStorage.getItem(MAP) || "{}"); if (m[c.id] !== (c.fichaModelo || "")) { m[c.id] = c.fichaModelo || ""; localStorage.setItem(MAP, JSON.stringify(m)); } } catch (e) {}
  }
  function cedo() {   // antes da ficha carregar: aplica o modelo que o ficha-cedo.js já pôs no <html>
    var id = root.getAttribute("data-ficha");
    if (id) apply(id);
  }
  if (window.DBOSheet) {
    DBOSheet.subscribe(function (c) { lembrar(c); if (!previewing) apply(c.fichaModelo || ""); });
    if (DBOSheet.get()) { lembrar(DBOSheet.get()); apply(DBOSheet.get().fichaModelo || ""); } else cedo();
  }

  return { open: open, apply: apply, atributos: atributos, artefato: artefato, modo: modo, plLabel: plLabel, FICHAS: FICHAS, ATRIBUTOS: ATRIBUTOS };
})();
