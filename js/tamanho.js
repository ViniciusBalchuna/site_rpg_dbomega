// Dragon Ball Omega — tamanho do NPC no mapa (ficha do NPC e "Adicionar NPC" da Sessão)
//   pequeno  ocupa 1/4 de um bloco (desenho menor), mas anda de bloco em bloco como os outros
//   normal   1 bloco · medio 2×2 · grande 3×3 · enorme 4×4 · colossal 5×5
//   "N"      personalizado: N×N blocos (o número é guardado como texto, ex.: "7")
// DBOTamanho.blocos(t) → lado em blocos (0,5 no pequeno) · DBOTamanho.nome(t) → "Grande (3×3)"
// DBOTamanho.campo(valor) → { no, ler() } (escolha com rádios; "Personalizado" mostra o número)
// DBOTamanho.abrir({ titulo, valor, aoEscolher(valor) }) → janela pronta com o campo.
window.DBOTamanho = (function () {
  var OPCOES = [
    ["pequeno", "Pequeno", "1/4 de um bloco"],
    ["normal", "Normal", "1 bloco"],
    ["medio", "Médio", "2×2 blocos"],
    ["grande", "Grande", "3×3 blocos"],
    ["enorme", "Enorme", "4×4 blocos"],
    ["colossal", "Colossal", "5×5 blocos"],
    ["personalizado", "Personalizado", "N×N blocos"]
  ];
  var LADO = { pequeno: .5, normal: 1, medio: 2, grande: 3, enorme: 4, colossal: 5 };
  var MAX = 30;
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function numero(t) { var n = Math.round(Number(t)); return /^\d+$/.test(String(t || "")) && n >= 1 ? Math.min(MAX, n) : 0; }
  function blocos(t) { return LADO[t] || numero(t) || 1; }
  function nome(t) {
    if (numero(t)) return "Personalizado (" + numero(t) + "×" + numero(t) + ")";
    var o = OPCOES.filter(function (x) { return x[0] === (t || "normal"); })[0] || OPCOES[1];
    return o[1] + (o[0] === "normal" ? "" : " (" + o[2] + ")");
  }
  var seq = 0;
  function campo(valor) {
    var id = "tam-" + (++seq);
    var fs = el("fieldset", "tam");
    fs.appendChild(el("legend", "tam__leg", "Tamanho no mapa"));
    var grade = el("div", "tam__opcoes");
    var atual = numero(valor) ? "personalizado" : (LADO[valor] ? valor : "normal");
    var num = el("input", "tam__num"); num.type = "number"; num.min = 1; num.max = MAX; num.step = 1; num.id = id + "-n";
    num.value = numero(valor) || 6;
    var numBox = el("label", "tam__n"); numBox.htmlFor = num.id;
    numBox.appendChild(el("span", "", "N ="));
    numBox.appendChild(num);
    numBox.appendChild(el("span", "", "blocos de lado"));
    OPCOES.forEach(function (o) {
      var lab = el("label", "tam__op");
      var r = el("input"); r.type = "radio"; r.name = id; r.value = o[0]; r.checked = o[0] === atual;
      r.addEventListener("change", function () { numBox.hidden = r.value !== "personalizado"; if (!numBox.hidden) num.focus(); });
      lab.appendChild(r);
      var txt = el("span", "tam__txt"); txt.appendChild(el("b", "", o[1])); txt.appendChild(el("small", "", o[2]));
      lab.appendChild(txt);
      grade.appendChild(lab);
    });
    fs.appendChild(grade);
    numBox.hidden = atual !== "personalizado";
    fs.appendChild(numBox);
    return {
      no: fs,
      ler: function () {
        var r = fs.querySelector("input[type=radio]:checked"), v = r ? r.value : "normal";
        if (v !== "personalizado") return v;
        var n = Math.round(Number(num.value));
        if (!(n >= 1 && n <= MAX)) throw new Error("Escolha um N de 1 a " + MAX + ".");
        return n === 1 ? "normal" : String(n);
      }
    };
  }
  var dlg = null;
  function abrir(opts) {
    opts = opts || {};
    if (!dlg) { dlg = el("dialog", "modal tam-dlg"); dlg.setAttribute("aria-labelledby", "tam-dlg-t"); document.body.appendChild(dlg); }
    dlg.textContent = "";
    var h = el("h2", "", opts.titulo || "Alterar tamanho"); h.id = "tam-dlg-t"; dlg.appendChild(h);
    dlg.appendChild(el("p", "modal__lead", "O tamanho muda quanto espaço o NPC ocupa no mapa da Sessão."));
    var c = campo(opts.valor);
    dlg.appendChild(c.no);
    var msg = el("p", "msg"); msg.setAttribute("role", "alert"); dlg.appendChild(msg);
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var ok = el("button", "btn", "Aplicar"); ok.type = "button";
    acts.appendChild(no); acts.appendChild(ok); dlg.appendChild(acts);
    no.addEventListener("click", function () { dlg.close(); });
    ok.addEventListener("click", function () {
      try { var v = c.ler(); dlg.close(); if (opts.aoEscolher) opts.aoEscolher(v); }
      catch (err) { msg.textContent = err.message; msg.className = "msg msg--error"; }
    });
    dlg.showModal();
    var marcado = dlg.querySelector("input[type=radio]:checked"); if (marcado) marcado.focus();
  }
  return { OPCOES: OPCOES, blocos: blocos, nome: nome, campo: campo, abrir: abrir };
})();
