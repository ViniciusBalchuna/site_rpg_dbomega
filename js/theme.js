// Dragon Ball Omega — tema claro/escuro
// Carregado no <head> de todas as páginas para aplicar o tema salvo antes de a página aparecer.
// A página de Configurações usa DBOTheme.get() e DBOTheme.set() para o interruptor.
(function () {
  var root = document.documentElement;
  var STORAGE_KEY = "dbo-theme";

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}

  // "Desligar animações": deixa o fundo estático (nuvens, emblema da Enciclopédia).
  var MOTION_KEY = "dbo-motion";
  try { if (localStorage.getItem(MOTION_KEY) === "off") root.classList.add("no-motion"); } catch (e) {}

  // "Esconder logo": a imagem da logo vira texto, na fonte do último modelo de ficha usado (guardado pela ficha em "dbo-ficha").
  var LOGO_KEY = "dbo-hidelogo", FICHA_KEY = "dbo-ficha";
  var BRAND_FONTS = { nz2: "family=Cinzel:wght@500;700", pat: "family=IBM+Plex+Mono:wght@400;600" };
  try {
    if (localStorage.getItem(LOGO_KEY) === "on") root.classList.add("hide-logo");
    var fk = localStorage.getItem(FICHA_KEY) || "";
    if (fk) root.setAttribute("data-brandfont", fk);
    if (BRAND_FONTS[fk] && root.classList.contains("hide-logo")) {
      var lk = document.createElement("link");
      lk.rel = "stylesheet"; lk.href = "https://fonts.googleapis.com/css2?" + BRAND_FONTS[fk] + "&display=swap";
      document.head.appendChild(lk);
    }
  } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("a.brand .brand__logo").forEach(function (img) {
      var t = document.createElement("span");
      t.className = "brand__txt";
      t.textContent = "Dragon Ball Omega";
      img.parentNode.appendChild(t);
    });
  });

  window.DBOTheme = {
    logoHidden: function () { return root.classList.contains("hide-logo"); },
    setLogoHidden: function (on) {
      root.classList.toggle("hide-logo", !!on);
      try { if (on) localStorage.setItem(LOGO_KEY, "on"); else localStorage.removeItem(LOGO_KEY); } catch (e) {}
    },
    motionOff: function () { return root.classList.contains("no-motion"); },
    setMotionOff: function (off) {
      root.classList.toggle("no-motion", !!off);
      try { if (off) localStorage.setItem(MOTION_KEY, "off"); else localStorage.removeItem(MOTION_KEY); } catch (e) {}
    },
    get: function () {
      return root.getAttribute("data-theme") === "light" ? "light" : "dark";
    },
    set: function (theme) {
      root.setAttribute("data-theme", theme);
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
  };
})();
