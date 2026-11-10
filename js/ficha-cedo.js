// Dragon Ball Omega — ficha: aplica o modelo da ficha ANTES de ela carregar, para a tela de carregamento já ter o fundo certo.
// O modelo de cada personagem fica guardado em "dbo-ficha-map" ({ id: modelo }) toda vez que a ficha abre (js/fichas.js).
// Na primeira vez no navegador, procura nas fichas locais. Carregue no <head>, depois de theme.js.
(function () {
  var root = document.documentElement;
  var MAP = "dbo-ficha-map";
  try {
    var id = new URLSearchParams(location.search).get("id");
    if (!id) return;
    root.classList.add("is-sheet-loading");                                  // esconde o conteúdo até a ficha abrir (js/sheet.js tira)
    setTimeout(function () { root.classList.remove("is-sheet-loading"); }, 22000);   // garantia
    var modelo = null, map = JSON.parse(localStorage.getItem(MAP) || "{}");
    if (typeof map[id] === "string") modelo = map[id];
    else {
      var all = JSON.parse(localStorage.getItem("dbo-characters") || "{}");
      Object.keys(all).forEach(function (owner) { (all[owner] || []).forEach(function (c) { if (c && c.id === id && modelo === null) modelo = c.fichaModelo || ""; }); });
    }
    if (modelo) root.setAttribute("data-ficha", modelo);
  } catch (e) {}
})();
