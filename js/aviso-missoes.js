// Dragon Ball Omega — Enciclopédia: aviso para o mestre quando um jogador pede a conclusão de uma missão.
// Mostra um cartão acima do menu e um contador no botão "Missões". "Ver" abre a missão já com o pedido em destaque.
(function () {
  var E = window.DBOEnc, UI = window.DBOUI, el = UI.el;
  if (!E || !E.pendentes) return;

  function montar(lista) {
    var grid = document.querySelector(".encyc__grid");
    if (!grid || !lista.length) return;
    var box = el("section", "aviso-missoes");
    box.setAttribute("aria-label", "Missões concluídas aguardando validação");
    box.appendChild(el("h2", "", "Missões para validar (" + lista.length + ")"));
    var ul = el("ul");
    lista.forEach(function (n) {
      var li = el("li");
      li.appendChild(el("span", "", (n.usuario || "Um jogador") + " — " + n.personagem + " concluiu “" + n.alvo + "”"));
      var a = el("a", "btn btn--cta", "Ver");
      a.href = "enciclopedia/missoes.html?cartaz=" + encodeURIComponent(n.c) + "&personagem=" + encodeURIComponent(n.p);
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    grid.parentNode.insertBefore(box, grid);
    var b = document.querySelector("#sec-menu button");
    document.querySelectorAll("#sec-menu button").forEach(function (x) {
      if (/Miss/.test(x.textContent)) x.appendChild(el("span", "aviso-badge", String(lista.length)));
    });
  }

  (async function () {
    try {
      if (window.DBORoles && DBORoles.refresh) await DBORoles.refresh();
      if (!window.DBORoles || !DBORoles.isMaster()) return;
      await E.ready();
      montar(E.pendentes());
    } catch (e) { /* sem aviso se o banco não responder */ }
  })();
})();
