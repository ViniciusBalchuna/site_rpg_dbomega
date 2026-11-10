// Dragon Ball Omega — transição suave entre os dois visuais do site
// Jade (páginas gerais) <-> laranja e dourado (criação e ficha) <-> roxo (Enciclopédia) <-> azul e vermelho (Campanha).
//
// Ao sair: bolinha dourada que quica (landing, Personagens, Configurações, ficha), nave roxa (Enciclopédia)
// ou oceano subindo em ondas (Campanha) — cobre a tela inteira.
// Entrar na Sessão (campanha/combate.html) tem a sua bolinha azul-céu, que abre na tela de carregamento dela.
// Ao chegar: a página nova já abre coberta pela mesma cor, que se dissolve.
// Carregue no <head>, logo depois de theme.js. Para navegar por código: DBOTransition.go(url)
window.DBOTransition = (function () {
  var KEY = "dbo-wipe";
  var DURATIONS = { ball: 920, ship: 1060, ocean: 1160 }; // ms, iguais às animações do CSS
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Páginas com o visual laranja e dourado. Se criar uma nova página assim, inclua aqui.
  var KI_PAGES = /\/(criar-personagem|personagem)\.html$/;

  // Enciclopédia: enciclopedia.html e tudo dentro da pasta enciclopedia/ (visual roxo).
  var PATROL_PAGES = /\/enciclopedia(\.html|\/|$)/;

  // Campanha: campanha.html e tudo dentro da pasta campanha/ (visual azul e vermelho).
  var CLASH_PAGES = /\/campanha(\.html|\/|$)/;

  // Sessão da campanha: mesmo visual da Campanha, mas entrar nela tem a transição de bolinha (cor do céu).
  var SESSAO = /\/campanha\/combate\.html$/;
  function entraNaSessao(url) { return SESSAO.test(url.pathname) && !SESSAO.test(location.pathname); }

  function themeOf(url) {
    if (PATROL_PAGES.test(url.pathname)) return "patrol";
    if (CLASH_PAGES.test(url.pathname)) return "clash";
    return KI_PAGES.test(url.pathname) ? "ki" : "jade";
  }
  function here() {
    if (root.classList.contains("patrol")) return "patrol";
    if (root.classList.contains("clash")) return "clash";
    return root.classList.contains("ki") ? "ki" : "jade";
  }

  // Chegada: se viemos de uma transição, começa coberto e revela a página.
  try {
    var flag = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY);
    var chegou = flag && (flag.to === here() || (flag.to === "sessao" && SESSAO.test(location.pathname)));
    if (chegou && Date.now() - flag.t < 5000 && !reduce) {
      root.classList.add("wipe-in", "wipe-in--" + flag.to);
      setTimeout(function () { root.classList.remove("wipe-in", "wipe-in--" + flag.to); }, 1500);
    }
  } catch (e) {}

  var busy = false;

  function go(href, point) {
    var url = new URL(href, location.href);
    var to = themeOf(url), sessao = entraNaSessao(url);
    if (busy || reduce || url.origin !== location.origin || (to === here() && !sessao)) {
      location.href = url.href;
      return;
    }
    if (sessao) to = "sessao";
    busy = true;
    try { sessionStorage.setItem(KEY, JSON.stringify({ to: to, t: Date.now() })); } catch (e) {}

    var kind = to === "patrol" ? "ship" : to === "clash" ? "ocean" : "ball";
    var wipe = document.createElement("div");
    wipe.className = "wipe wipe--" + kind;
    wipe.setAttribute("data-to", to); // a bolinha usa a cor da página de destino (css/style.css)
    wipe.innerHTML = KINDS[kind]();
    if (kind === "ball") wipe.firstChild.style.setProperty("--fill", Math.ceil(Math.hypot(innerWidth, innerHeight) / 96) + 2);
    document.body.appendChild(wipe);

    setTimeout(function () { location.href = url.href; }, DURATIONS[kind]);
  }

  var CREST = '<div class="crest"><svg viewBox="0 0 800 60" preserveAspectRatio="none"><path d="M0,34 Q50,0 100,34 T200,34 T300,34 T400,34 T500,34 T600,34 T700,34 T800,34 V60 H0 Z"/></svg></div>';
  var KINDS = {
    ball: function () { return '<div class="ball"></div>'; },
    ship: function () {
      return '<div class="sweep"><svg class="ship" viewBox="0 0 240 120" aria-hidden="true">' +
        '<path d="M20,60 C40,34 110,24 170,40 C206,48 228,56 236,60 C228,64 206,72 170,80 C110,96 40,86 20,60 Z"/>' +
        '<path d="M92,36 C100,14 132,14 144,40"/><path d="M60,44 L28,26 L44,56 M60,76 L28,94 L44,64"/>' +
        '<path d="M150,60 L216,60"/><path class="jet" d="M18,60 L-12,60 M22,48 L-4,40 M22,72 L-4,80"/></svg></div>';
    },
    ocean: function () { return '<div class="sea sea--a">' + CREST + '</div><div class="sea sea--b">' + CREST + '</div><div class="sea sea--c">' + CREST + '</div>'; }
  };

  // Intercepta cliques em links comuns (menu, botões, cartões).
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    var raw = link.getAttribute("href");
    if (!raw || raw.charAt(0) === "#") return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin || (themeOf(url) === here() && !entraNaSessao(url))) return;

    event.preventDefault();
    var box = link.getBoundingClientRect();
    var fromKeyboard = event.detail === 0; // Enter no teclado não traz posição de clique
    go(link.href, fromKeyboard
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: event.clientX, y: event.clientY });
  });

  // Voltar pelo navegador pode restaurar a página com o círculo ainda na tela.
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    busy = false;
    document.querySelectorAll(".wipe").forEach(function (node) { node.remove(); });
  });

  return { go: go };
})();
