// Dragon Ball Omega — janela de escolha em duas metades (ficha).
//   Esquerda: aprender/pegar algo que já existe (lista).   Direita: criar o seu próprio.
// DBOChoose.open({ title, left: { title, items: [{ nome, sub, detalhes, onPick }], empty }, right: { title, text, label, disabled, onClick } })
//   onPick() pode devolver um texto de erro (ex.: "TPs insuficientes."): a janela treme e mostra o texto.
window.DBOChoose = (function () {
  var UI = DBOUI, el = UI.el;
  var dlg = null, errTimer;

  function build() {
    dlg = el("dialog", "modal modal--wide choose");
    dlg.setAttribute("aria-labelledby", "choose-title");
    var form = el("form"); form.noValidate = true; form.addEventListener("submit", function (e) { e.preventDefault(); });
    var x = el("button", "modal__close", "×"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.addEventListener("click", function () { dlg.close(); });
    form.appendChild(x);
    var h = el("h2", "", ""); h.id = "choose-title"; form.appendChild(h);
    var grid = el("div", "choose__split");
    grid.appendChild(el("section", "choose__half choose__half--left"));
    grid.appendChild(el("section", "choose__half choose__half--right"));
    form.appendChild(grid);
    var msg = el("p", "choose__msg"); msg.setAttribute("role", "alert"); form.appendChild(msg);
    dlg.appendChild(form);
    document.body.appendChild(dlg);
  }

  function open(o) {
    if (!dlg) build();
    dlg.querySelector("h2").textContent = o.title;
    var msg = dlg.querySelector(".choose__msg"); msg.textContent = "";
    var left = dlg.querySelector(".choose__half--left"), right = dlg.querySelector(".choose__half--right");
    left.textContent = ""; right.textContent = "";

    left.appendChild(el("h3", "", o.left.title));
    var list = el("ul", "choose__list");
    (o.left.items || []).forEach(function (it) {
      var li = el("li", "choose__item");
      var b = el("button", "choose__pick"); b.type = "button";
      b.appendChild(el("strong", "", it.nome));
      if (it.sub) b.appendChild(el("small", "", it.sub));
      if (it.detalhes) b.appendChild(el("span", "choose__det", it.detalhes));
      b.addEventListener("click", function () {
        // Com `confirmar`, o primeiro clique só arma; o segundo pega de verdade.
        if (o.confirmar && !b.classList.contains("is-armed")) {
          var antes = list.querySelector(".choose__pick.is-armed");
          if (antes) { antes.classList.remove("is-armed"); var ac = antes.querySelector(".choose__conf"); if (ac) ac.remove(); }
          b.classList.add("is-armed");
          b.appendChild(el("em", "choose__conf", "Têm certeza? Clique novamente para confirmar."));
          setTimeout(function () { b.classList.remove("is-armed"); var cf = b.querySelector(".choose__conf"); if (cf) cf.remove(); }, 4000);
          return;
        }
        var err = it.onPick();
        if (typeof err === "string" && err) {
          msg.textContent = err;
          dlg.classList.remove("is-shaking"); void dlg.offsetWidth; dlg.classList.add("is-shaking");
          clearTimeout(errTimer); errTimer = setTimeout(function () { msg.textContent = ""; dlg.classList.remove("is-shaking"); }, 2600);
        } else dlg.close();
      });
      li.appendChild(b); list.appendChild(li);
    });
    left.appendChild(list);
    if (!(o.left.items || []).length) left.appendChild(el("p", "empty", o.left.empty || "Nada por aqui ainda."));

    dlg.classList.toggle("choose--single", !o.right);   // sem lado direito: só a lista
    if (o.right) {
      right.classList.toggle("is-off", !!o.right.disabled);
      right.appendChild(el("h3", "", o.right.title));
      if (o.right.text) right.appendChild(el("p", "choose__text", o.right.text));
      var go = el("button", "btn", o.right.label || "Criar"); go.type = "button"; go.disabled = !!o.right.disabled;
      go.addEventListener("click", function () { dlg.close(); o.right.onClick(); });
      right.appendChild(go);
    }
    dlg.showModal();
  }
  return { open: open };
})();
