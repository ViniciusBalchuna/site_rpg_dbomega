// Dragon Ball Omega — Anotações da sessão (caderno em Markdown)
// DBONotas.montar(container, { ler(): Promise<string>, salvar(texto): Promise, nomeArquivo })
//   Escrever: o texto em Markdown, num caderno com linhas.
//   Ler: o Markdown desenhado no caderno (títulos # ocupam 3 linhas, ## 2 linhas, ### 1,5 linha) e os desenhos por cima.
//   Lápis (canto de cima, à direita): desenha no modo Ler. A grossura (px) muda na barrinha ou no número ao lado.
// Os desenhos ficam DENTRO do Markdown, como uma imagem no fim do arquivo: ![desenho do caderno](data:image/png;base64,...).
// Assim "Instalar anotações" baixa um .md só, e "Importar anotações" traz texto e desenhos de volta.
window.DBONotas = (function () {
  var ALT = "desenho do caderno";
  var RE_DESENHO = /\n*!\[desenho do caderno\]\((data:image\/png;base64,[A-Za-z0-9+/=]+)\)\s*$/;

  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // Separa o texto do desenho guardado no fim.
  function separar(md) {
    md = String(md || "");
    var m = RE_DESENHO.exec(md);
    return m ? { texto: md.slice(0, m.index), desenho: m[1] } : { texto: md, desenho: "" };
  }
  function juntar(texto, desenho) {
    texto = String(texto || "").replace(/\s+$/, "");
    return desenho ? texto + "\n\n![" + ALT + "](" + desenho + ")\n" : (texto ? texto + "\n" : "");
  }

  /* ---------- Markdown → HTML (seguro: tudo é escapado; links só http/https; imagens só https ou data:image) ---------- */
  function inline(s) {
    var guard = [];
    function keep(html) { guard.push(html); return "\u0000" + (guard.length - 1) + "\u0000"; }
    s = s.replace(/`([^`]+)`/g, function (_, c) { return keep("<code>" + esc(c) + "</code>"); });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
      if (!/^(https:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(src)) return keep(esc(_));
      return keep('<img src="' + esc(src) + '" alt="' + esc(alt) + '">');
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, href) {
      if (!/^https?:\/\//i.test(href)) return keep(esc(_));
      return keep('<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(t) + "</a>");
    });
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>").replace(/(^|[^\w_])_([^_\s][^_]*)_/g, "$1<em>$2</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return guard[Number(i)]; });
  }
  // Cada linha escrita vira uma linha do caderno (linhas em branco também), para o Ler ficar igual ao Escrever.
  function render(md) {
    var linhas = String(md || "").replace(/\r\n?/g, "\n").split("\n"), out = [], i = 0;
    while (i < linhas.length) {
      var l = linhas[i];
      if (/^```/.test(l)) {
        var code = []; i++;
        while (i < linhas.length && !/^```/.test(linhas[i])) { code.push(linhas[i]); i++; }
        i++;
        out.push('<pre class="nt-code"><code>' + esc(code.join("\n")) + "</code></pre>");
        continue;
      }
      var m;
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { var n = Math.min(3, m[1].length); out.push("<h" + n + ">" + inline(m[2]) + "</h" + n + ">"); }
      else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) out.push('<hr class="nt-hr">');
      else if ((m = /^>\s?(.*)$/.exec(l))) out.push('<div class="nt-l nt-quote">' + (inline(m[1]) || "&nbsp;") + "</div>");
      else if ((m = /^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/.exec(l))) out.push('<div class="nt-l nt-li" style="--nv:' + Math.floor(m[1].length / 2) + '"><span class="nt-box' + (m[2] !== " " ? " is-on" : "") + '" aria-hidden="true"></span>' + inline(m[3]) + "</div>");
      else if ((m = /^(\s*)[-*+]\s+(.*)$/.exec(l))) out.push('<div class="nt-l nt-li" style="--nv:' + Math.floor(m[1].length / 2) + '"><span class="nt-dot" aria-hidden="true">•</span>' + inline(m[2]) + "</div>");
      else if ((m = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(l))) out.push('<div class="nt-l nt-li" style="--nv:' + Math.floor(m[1].length / 2) + '"><span class="nt-dot" aria-hidden="true">' + m[2] + ".</span>" + inline(m[3]) + "</div>");
      else if (!l.trim()) out.push('<div class="nt-l" aria-hidden="true">&nbsp;</div>');
      else out.push('<div class="nt-l">' + inline(l) + "</div>");
      i++;
    }
    return out.join("");
  }

  // Filtro SVG que deixa a borda do pergaminho irregular, como papel antigo gasto (usado em css/sessao.css).
  function filtroPergaminho() {
    if (document.getElementById("pergaminho")) return;
    var d = document.createElement("div");
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="pergaminho" x="-2%" y="-2%" width="104%" height="104%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="ruido"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="ruido" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
    document.body.appendChild(d.firstChild);
  }
  function montar(box, opts) {
    opts = opts || {};
    filtroPergaminho();
    box.textContent = "";
    var estado = { modo: "escrever", texto: "", desenho: "", ferramenta: null, grossura: 5, sujo: false, desfazer: null };
    try { var g = Number(localStorage.getItem("dbo-notas-grossura")); if (g >= 1 && g <= 60) estado.grossura = g; } catch (e) {}

    var wrap = el("section", "notas");
    // Barra: Escrever/Ler, Instalar, Importar · lápis, borracha, grossura
    var bar = el("div", "notas__bar");
    var modos = el("div", "notas__modos seg"); modos.setAttribute("role", "group"); modos.setAttribute("aria-label", "Modo do caderno");
    var bEsc = el("button", "notas__modo", "Escrever"), bLer = el("button", "notas__modo", "Ler");
    var pilula = el("span", "seg-pilula"); pilula.setAttribute("aria-hidden", "true"); modos.appendChild(pilula);
    [bEsc, bLer].forEach(function (b) { b.type = "button"; modos.appendChild(b); });
    // A pílula desliza até o modo escolhido.
    function moverPilula(sem) {
      var sel = estado.modo === "ler" ? bLer : bEsc;
      if (!sel.offsetWidth) { requestAnimationFrame(function () { moverPilula(true); }); return; }
      if (sem) pilula.style.transition = "none";
      pilula.style.transform = "translateX(" + sel.offsetLeft + "px)"; pilula.style.width = sel.offsetWidth + "px";
      if (sem) { void pilula.offsetWidth; pilula.style.transition = ""; }
    }
    var acoes = el("div", "notas__acoes");
    var bInst = el("button", "btn btn--ghost notas__btn", "Instalar anotações"); bInst.type = "button";
    bInst.title = "Baixa as anotações (com os desenhos) num arquivo .md";
    var lblImp = el("label", "btn btn--ghost notas__btn", "Importar anotações");
    var inpImp = el("input"); inpImp.type = "file"; inpImp.accept = ".md,.markdown,.txt,text/markdown,text/plain"; inpImp.className = "sr-only";
    lblImp.appendChild(inpImp);
    acoes.appendChild(bInst); acoes.appendChild(lblImp);
    var tools = el("div", "notas__tools");
    var lapis = el("button", "notas__tool", ""); lapis.type = "button";
    lapis.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.8 6.8l3.4 3.4" stroke="currentColor" stroke-width="1.8"/></svg>';
    lapis.setAttribute("aria-label", "Lápis: desenhar no caderno"); lapis.title = "Lápis";
    var borracha = el("button", "notas__tool", ""); borracha.type = "button";
    borracha.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 19.5l-4-4a2 2 0 0 1 0-2.8l8.7-8.7a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8l-7.3 7.3M8.5 19.5h11M8.5 19.5l-1.4-1.4M10 9l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    borracha.setAttribute("aria-label", "Borracha: apagar o desenho"); borracha.title = "Borracha";
    var grossWrap = el("div", "notas__gross");
    var range = el("input"); range.type = "range"; range.min = 1; range.max = 40; range.step = 1; range.value = estado.grossura; range.setAttribute("aria-label", "Grossura do traço");
    var num = el("input"); num.type = "number"; num.min = 1; num.max = 60; num.step = 1; num.value = estado.grossura; num.inputMode = "numeric"; num.setAttribute("aria-label", "Grossura do traço em pixels");
    grossWrap.appendChild(range); grossWrap.appendChild(num); grossWrap.appendChild(el("span", "notas__px", "px"));
    var limpar = el("button", "notas__limpar", "Limpar desenho"); limpar.type = "button";
    tools.appendChild(lapis); tools.appendChild(borracha); tools.appendChild(grossWrap); tools.appendChild(limpar);
    bar.appendChild(modos); bar.appendChild(acoes); bar.appendChild(tools);
    wrap.appendChild(bar);

    var aviso = el("p", "notas__status"); aviso.setAttribute("role", "status");
    wrap.appendChild(aviso);

    // Caderno: uma página por vez (pergaminho antigo). Em cima, ao lado, o número da página; embaixo, os botões de virar.
    var folha = el("div", "caderno");
    var topo = el("div", "caderno__topo");
    var numero = el("span", "caderno__num", "1"); numero.setAttribute("aria-live", "polite");
    topo.appendChild(numero);
    var area = el("div", "caderno__area");
    var txt = el("textarea", "caderno__txt");
    txt.setAttribute("aria-label", "Anotações em Markdown");
    txt.placeholder = "# Minhas anotações\n\nEscreva aqui. Use # para títulos, - para listas, **negrito** e *itálico*.";
    txt.spellcheck = true;
    var ler = el("div", "caderno__ler"); ler.setAttribute("aria-label", "Anotações");
    var conteudoLer = el("div", "caderno__conteudo");
    var tinta = el("canvas", "caderno__tinta"); tinta.setAttribute("aria-hidden", "true");
    ler.appendChild(conteudoLer); ler.appendChild(tinta);
    area.appendChild(txt); area.appendChild(ler);
    folha.appendChild(topo); folha.appendChild(area);
    var navPag = el("div", "caderno__nav");
    var bAnt = el("button", "caderno__virar caderno__virar--ant", "‹ Página anterior"); bAnt.type = "button";
    var bProx = el("button", "caderno__virar caderno__virar--prox", "Próxima página ›"); bProx.type = "button";
    navPag.appendChild(bAnt); navPag.appendChild(bProx);
    wrap.appendChild(folha);
    wrap.appendChild(navPag);
    box.appendChild(wrap);

    function status(t, erro) { aviso.textContent = t || ""; aviso.classList.toggle("is-erro", !!erro); }

    /* ---------- Salvar (automático, um pouco depois de parar de escrever ou desenhar) ---------- */
    var saveT = null, salvando = false;
    function agendar() {
      estado.sujo = true; status("Salvando…");
      clearTimeout(saveT); saveT = setTimeout(salvar, 900);
    }
    function salvar() {
      if (salvando) { clearTimeout(saveT); saveT = setTimeout(salvar, 500); return; }
      if (!opts.salvar) return;
      salvando = true;
      var md = juntar(estado.texto, estado.desenho);
      Promise.resolve(opts.salvar(md)).then(function () { estado.sujo = false; status("Salvo"); })
        .catch(function (err) { status("Não consegui salvar: " + err.message, true); })
        .then(function () { salvando = false; });
    }
    window.addEventListener("beforeunload", function () { if (estado.sujo) salvar(); });

    /* ---------- Escrever ---------- */
    function linhaPx() { return parseFloat(getComputedStyle(folha).getPropertyValue("--linha")) || 34; }
    function folhaMin() { return linhaPx() * (parseInt(getComputedStyle(folha).getPropertyValue("--linhas"), 10) || 18); }   // altura de uma página
    function autoAltura() { irPara(estado.pagina, true); }

    /* ---------- Páginas ----------
       Cada página tem --linhas linhas (css/sessao.css). A área rola de página em página (nunca pela metade); depois do texto sempre há uma página em branco. */
    estado.pagina = 0;
    var rolandoNos = false;
    function rolador() { return estado.modo === "ler" ? ler : txt; }
    function totalPaginas() {
      var r = rolador(), P = folhaMin();
      var conteudo = Math.max(0, r.scrollHeight - 2 * P);   // tira o espaço em branco do fim (padding de duas páginas)
      return Math.max(1, Math.ceil(conteudo / P)) + 1;
    }
    function irPara(n, semAnimar) {
      var tot = totalPaginas();
      n = Math.max(0, Math.min(tot - 1, n));
      var dir = n > estado.pagina ? "prox" : n < estado.pagina ? "ant" : "";
      estado.pagina = n;
      rolandoNos = true;
      rolador().scrollTop = n * folhaMin();
      setTimeout(function () { rolandoNos = false; }, 0);
      numero.textContent = String(n + 1);
      bAnt.disabled = n === 0;
      bProx.disabled = n >= tot - 1;
      if (dir && !semAnimar) {
        area.classList.remove("is-virando-prox", "is-virando-ant"); void area.offsetWidth;
        area.classList.add("is-virando-" + dir);
      }
    }
    bAnt.addEventListener("click", function () { irPara(estado.pagina - 1); });
    bProx.addEventListener("click", function () { irPara(estado.pagina + 1); });
    area.addEventListener("animationend", function () { area.classList.remove("is-virando-prox", "is-virando-ant", "is-trocando"); });
    // Escrevendo: a página acompanha o cursor. Um "espelho" invisível do texto mede em que linha o cursor está.
    var espelho = el("div", "caderno__espelho"); espelho.setAttribute("aria-hidden", "true");
    area.appendChild(espelho);
    function paginaDoCursor() {
      if (estado.modo !== "escrever") return;
      var cs = getComputedStyle(txt);
      espelho.style.width = txt.clientWidth + "px";
      espelho.style.font = cs.font; espelho.style.lineHeight = cs.lineHeight; espelho.style.paddingTop = cs.paddingTop;
      espelho.textContent = txt.value.slice(0, txt.selectionStart);
      var marca = el("span", "", "\u200b"); espelho.appendChild(marca);
      var n = Math.floor((marca.offsetTop - parseFloat(cs.paddingTop || 0)) / folhaMin());
      if (n !== estado.pagina && n >= 0) irPara(n, false);
    }
    ["input", "keyup", "click"].forEach(function (ev) { txt.addEventListener(ev, function () { setTimeout(paginaDoCursor, 0); }); });
    // Se o navegador rolar sozinho, a rolagem "encaixa" na página onde o cursor está.
    txt.addEventListener("scroll", function () {
      if (rolandoNos) return;
      var P = folhaMin(), st = txt.scrollTop, base = estado.pagina * P;
      if (Math.abs(st - base) < 2) return;
      var n = st > base ? Math.ceil(st / P - 0.01) : Math.floor(st / P + 0.01);
      irPara(n, false);
    });
    txt.addEventListener("input", function () { estado.texto = txt.value; agendar(); irPara(estado.pagina, true); });
    txt.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      e.preventDefault();
      var a = txt.selectionStart, b = txt.selectionEnd;
      txt.value = txt.value.slice(0, a) + "  " + txt.value.slice(b);
      txt.selectionStart = txt.selectionEnd = a + 2;
      estado.texto = txt.value; agendar();
    });

    /* ---------- Desenho ---------- */
    var ctx = tinta.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    function tamanhoTinta() {
      var w = ler.clientWidth, h = Math.max(ler.scrollHeight, folhaMin() * 2);
      if (!w) return;
      if (tinta.width === Math.round(w * dpr) && tinta.height >= Math.round(h * dpr)) { tinta.style.height = tinta.height / dpr + "px"; return; }
      var antigo = null;
      if (tinta.width && tinta.height) { antigo = document.createElement("canvas"); antigo.width = tinta.width; antigo.height = tinta.height; antigo.getContext("2d").drawImage(tinta, 0, 0); }
      tinta.width = Math.round(w * dpr); tinta.height = Math.round(h * dpr);
      tinta.style.width = w + "px"; tinta.style.height = h + "px";
      if (antigo) ctx.drawImage(antigo, 0, 0, antigo.width, antigo.height, 0, 0, tinta.width, antigo.height * (tinta.width / antigo.width));
    }
    function carregarDesenho(src) {
      ctx.clearRect(0, 0, tinta.width, tinta.height);
      if (!src) return;
      var img = new Image();
      img.onload = function () {
        var h = img.height * (tinta.width / img.width);
        if (h > tinta.height) { tinta.height = Math.ceil(h); tinta.style.height = tinta.height / dpr + "px"; }
        ctx.drawImage(img, 0, 0, tinta.width, h);
      };
      img.src = src;
    }
    function corTinta() { return getComputedStyle(folha).getPropertyValue("--tinta").trim() || "#1b2a6b"; }
    var riscando = false, ult = null;
    function ponto(e) { var r = tinta.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; }
    tinta.addEventListener("pointerdown", function (e) {
      if (!estado.ferramenta) return;
      e.preventDefault();
      riscando = true; ult = ponto(e);
      try { tinta.setPointerCapture(e.pointerId); } catch (er) {}
      ctx.globalCompositeOperation = estado.ferramenta === "borracha" ? "destination-out" : "source-over";
      ctx.fillStyle = ctx.strokeStyle = corTinta();
      ctx.beginPath(); ctx.arc(ult.x, ult.y, estado.grossura * dpr / 2, 0, Math.PI * 2); ctx.fill();
    });
    tinta.addEventListener("pointermove", function (e) {
      if (!riscando) return;
      var p = ponto(e);
      ctx.lineWidth = estado.grossura * dpr * (estado.ferramenta === "borracha" ? 2 : 1); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(ult.x, ult.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ult = p;
    });
    function soltar() {
      if (!riscando) return;
      riscando = false; ctx.globalCompositeOperation = "source-over";
      estado.desenho = vazio() ? "" : tinta.toDataURL("image/png");
      agendar();
    }
    tinta.addEventListener("pointerup", soltar);
    tinta.addEventListener("pointercancel", soltar);
    function vazio() {
      var d = ctx.getImageData(0, 0, tinta.width, tinta.height).data;
      for (var i = 3; i < d.length; i += 16) if (d[i]) return false;
      return true;
    }
    function ferramenta(f) {
      estado.ferramenta = estado.ferramenta === f ? null : f;
      if (estado.ferramenta && estado.modo !== "ler") modo("ler");
      lapis.setAttribute("aria-pressed", String(estado.ferramenta === "lapis"));
      borracha.setAttribute("aria-pressed", String(estado.ferramenta === "borracha"));
      folha.classList.toggle("is-desenhando", !!estado.ferramenta);
      folha.classList.toggle("is-apagando", estado.ferramenta === "borracha");
      grossWrap.hidden = !estado.ferramenta;
    }
    lapis.addEventListener("click", function () { ferramenta("lapis"); });
    borracha.addEventListener("click", function () { ferramenta("borracha"); });
    function definirGrossura(v) {
      v = Math.max(1, Math.min(60, Math.round(Number(v) || 5)));
      estado.grossura = v; range.value = Math.min(40, v); if (Number(num.value) !== v) num.value = v;
      try { localStorage.setItem("dbo-notas-grossura", String(v)); } catch (e) {}
    }
    range.addEventListener("input", function () { definirGrossura(range.value); });
    num.addEventListener("input", function () { if (num.value !== "") definirGrossura(num.value); });
    num.addEventListener("blur", function () { definirGrossura(num.value); });
    var limparArmado = false, limparT;
    limpar.addEventListener("click", function () {
      if (!limparArmado) { limparArmado = true; limpar.textContent = "Apagar todos os desenhos?"; limpar.classList.add("is-armed"); limparT = setTimeout(function () { limparArmado = false; limpar.textContent = "Limpar desenho"; limpar.classList.remove("is-armed"); }, 4000); return; }
      clearTimeout(limparT); limparArmado = false; limpar.textContent = "Limpar desenho"; limpar.classList.remove("is-armed");
      ctx.clearRect(0, 0, tinta.width, tinta.height); estado.desenho = ""; agendar();
    });

    /* ---------- Modos ---------- */
    var primeiroModo = true;
    function modo(m) {
      var mudou = estado.modo !== m;
      estado.modo = m;
      moverPilula(primeiroModo); primeiroModo = false;
      if (mudou) { area.classList.remove("is-trocando"); void area.offsetWidth; area.classList.add("is-trocando"); }
      bEsc.setAttribute("aria-pressed", String(m === "escrever"));
      bLer.setAttribute("aria-pressed", String(m === "ler"));
      folha.classList.toggle("is-ler", m === "ler");
      txt.hidden = m !== "escrever"; ler.hidden = m !== "ler"; tinta.hidden = m !== "ler";
      tools.classList.toggle("is-off", false);
      if (m === "escrever") { if (estado.ferramenta) ferramenta(estado.ferramenta); txt.value = estado.texto; irPara(estado.pagina, true); }
      else {
        conteudoLer.innerHTML = render(estado.texto) || '<div class="nt-l nt-vazio">Nada escrito ainda.</div>';
        requestAnimationFrame(function () { tamanhoTinta(); carregarDesenho(estado.desenho); irPara(estado.pagina, true); });
      }
    }
    bEsc.addEventListener("click", function () { modo("escrever"); });   // sem focar: o cursor iria para o fim e viraria a página
    bLer.addEventListener("click", function () { modo("ler"); });

    /* ---------- Instalar e importar ---------- */
    bInst.addEventListener("click", function () {
      var md = juntar(estado.texto, estado.desenho);
      var blob = new Blob([md || ""], { type: "text/markdown;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (opts.nomeArquivo || "anotacoes") + ".md";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    inpImp.addEventListener("change", function () {
      var f = inpImp.files && inpImp.files[0];
      inpImp.value = "";
      if (!f) return;
      if (f.size > 4 * 1024 * 1024) { status("Esse arquivo é grande demais (máximo 4 MB).", true); return; }
      var rd = new FileReader();
      rd.onload = function () {
        estado.desfazer = juntar(estado.texto, estado.desenho);
        var p = separar(String(rd.result || ""));
        estado.texto = p.texto; estado.desenho = p.desenho;
        estado.pagina = 0; modo("ler"); agendar();
        mostrarDesfazer(f.name);
      };
      rd.onerror = function () { status("Não consegui ler esse arquivo.", true); };
      rd.readAsText(f, "utf-8");
    });
    function mostrarDesfazer(nome) {
      status("");
      var b = el("button", "notas__desfazer", "Desfazer importação"); b.type = "button";
      aviso.appendChild(document.createTextNode("“" + nome + "” importado. "));
      aviso.appendChild(b);
      b.addEventListener("click", function () {
        if (estado.desfazer == null) return;
        var p = separar(estado.desfazer); estado.desfazer = null;
        estado.texto = p.texto; estado.desenho = p.desenho; modo(estado.modo); agendar();
      });
      setTimeout(function () { if (b.isConnected) b.remove(); estado.desfazer = null; }, 15000);
    }

    window.addEventListener("resize", function () { if (estado.modo === "ler") tamanhoTinta(); irPara(estado.pagina, true); });

    grossWrap.hidden = true;
    lapis.setAttribute("aria-pressed", "false"); borracha.setAttribute("aria-pressed", "false");
    status("Carregando…");
    Promise.resolve(opts.ler ? opts.ler() : "").then(function (md) {
      var p = separar(md);
      estado.texto = p.texto; estado.desenho = p.desenho;
      status("");
      modo(estado.texto.trim() || estado.desenho ? "ler" : "escrever");
    }).catch(function (err) { status("Não consegui abrir as anotações: " + err.message, true); modo("escrever"); });

    return { salvarAgora: salvar, pendente: function () { return estado.sujo; } };
  }

  return { montar: montar, render: render, separar: separar, juntar: juntar };
})();
