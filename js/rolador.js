// Dragon Ball Omega — ficha: multiplicadores de dano + rolador de dados.
// Clique num multiplicador para escolher qual vai multiplicar a rolagem (clique de novo para soltar).
// A rolagem tem: grupos de dados (quantidade + tipo), incremento (número fixo) e modificador (atributo).
(function () {
  var D = DBOData, UI = DBOUI, R = DBORules, S = DBOSheet, el = UI.el;
  var box = document.getElementById("mult");
  if (!box) return;

  var TYPES = ["d3", "d4", "d6", "d8", "d10", "d12", "d20", "d100"];
  var state = { tipoDano: null, groups: [{ qtd: 1, dado: "d6" }], inc: 0, mod: "", result: null };
  var tiles = {}, built = false, groupsBox, out, msg, modSel, incIn;

  function die(sides) { return Math.floor(Math.random() * sides) + 1; }
  function signed(n) { return n >= 0 ? "+ " + n : "− " + Math.abs(n); }
  function multOf(c, kind) { return kind === "ki" ? R.danoKi(c) : R.danoFisico(c); }

  function build() {
    built = true;
    box.textContent = "";
    box.classList.add("roller");

    var row = el("div", "mult");
    [["fisico", "Dano físico", "phys"], ["ki", "Dano de Ki", "ki"]].forEach(function (m) {
      var t = el("button", "mult__tile mult__tile--" + m[2] + " mult__tile--btn");
      t.type = "button";
      t.setAttribute("aria-pressed", "false");
      t.appendChild(el("span", "tile__label", m[1]));
      t.appendChild(el("b", "mult__value", ""));
      t.appendChild(el("small", "mult__hint", "Clique para multiplicar"));
      t.addEventListener("click", function () {
        state.tipoDano = state.tipoDano === m[0] ? null : m[0];
        sync();
      });
      tiles[m[0]] = t;
      row.appendChild(t);
    });
    box.appendChild(row);

    var form = el("form", "roller__form");
    form.noValidate = true;
    form.appendChild(el("h3", "roller__title", "Rolador de dados"));
    groupsBox = el("div", "roller__groups");
    form.appendChild(groupsBox);

    var add = el("button", "btn btn--ghost roller__add", "Adicionar dados");
    add.type = "button";
    add.addEventListener("click", function () {
      if (state.groups.length >= 8) return fail("No máximo 8 grupos de dados.");
      state.groups.push({ qtd: 1, dado: "d6" });
      renderGroups();
      groupsBox.lastChild.querySelector("input").focus();
    });
    form.appendChild(add);

    var extra = el("div", "roller__extra");
    var f1 = el("div", "field"), l1 = el("label", "", "Incremento"); l1.htmlFor = "rl-inc";
    incIn = el("input"); incIn.id = "rl-inc"; incIn.type = "number"; incIn.step = "1"; incIn.value = "0"; incIn.inputMode = "numeric";
    incIn.addEventListener("input", function () { state.inc = incIn.value; });
    f1.appendChild(l1); f1.appendChild(incIn);
    var f2 = el("div", "field"), l2 = el("label", "", "Modificador"); l2.htmlFor = "rl-mod";
    modSel = el("select"); modSel.id = "rl-mod";
    modSel.appendChild(new Option("Nenhum", ""));
    D.ATTRIBUTES.forEach(function (a) { modSel.appendChild(new Option(a[1], a[0])); });
    modSel.addEventListener("change", function () { state.mod = modSel.value; });
    f2.appendChild(l2); f2.appendChild(modSel);
    extra.appendChild(f1); extra.appendChild(f2);
    form.appendChild(extra);

    msg = el("p", "msg");
    msg.setAttribute("role", "alert");
    form.appendChild(msg);
    var go = el("button", "btn btn--hit roller__go", "Rolar dados");
    go.type = "submit";
    form.appendChild(go);
    form.addEventListener("submit", function (ev) { ev.preventDefault(); roll(); });
    box.appendChild(form);

    out = el("div", "roller__out");
    out.setAttribute("role", "status");
    box.appendChild(out);
    renderGroups();
  }

  function fail(t) { msg.textContent = t; msg.className = "msg msg--error"; }

  function renderGroups() {
    groupsBox.textContent = "";
    state.groups.forEach(function (g, i) {
      var r = el("div", "roller__group");
      var q = el("input"); q.type = "number"; q.min = "1"; q.max = "50"; q.step = "1"; q.value = g.qtd; q.inputMode = "numeric";
      q.setAttribute("aria-label", "Quantidade de dados do grupo " + (i + 1));
      q.addEventListener("input", function () { g.qtd = q.value; });
      var t = el("select");
      t.setAttribute("aria-label", "Tipo de dado do grupo " + (i + 1));
      TYPES.forEach(function (d) { t.appendChild(new Option(d, d)); });
      t.value = g.dado;
      t.addEventListener("change", function () { g.dado = t.value; });
      var fq = el("div", "field roller__q"); fq.appendChild(q);
      var ft = el("div", "field roller__t"); ft.appendChild(t);
      r.appendChild(fq); r.appendChild(el("span", "roller__x", "×")); r.appendChild(ft);
      if (state.groups.length > 1) {
        var rm = el("button", "rollclose roller__rm", "×");
        rm.type = "button";
        rm.setAttribute("aria-label", "Tirar o grupo " + (i + 1));
        rm.addEventListener("click", function () { state.groups.splice(i, 1); renderGroups(); });
        r.appendChild(rm);
      }
      groupsBox.appendChild(r);
    });
  }

  function roll() {
    if (window.DBOPrato && DBOPrato.ocupado()) return;
    msg.textContent = "";
    var c = S.get(), partes = [], soma = 0, dados = [];
    for (var i = 0; i < state.groups.length; i++) {
      var g = state.groups[i], q = String(g.qtd).trim();
      if (!/^\d+$/.test(q) || Number(q) < 1 || Number(q) > 50) return fail("A quantidade de dados vai de 1 a 50.");
      var sides = Number(g.dado.slice(1)), faces = [];
      for (var k = 0; k < Number(q); k++) { var v = die(sides); faces.push(v); dados.push({ lados: sides, valor: v }); }
      var s = faces.reduce(function (a, b) { return a + b; }, 0);
      partes.push({ rot: q + g.dado, faces: faces });
      soma += s;
    }
    var inc = String(state.inc).trim();
    if (inc !== "" && !/^-?\d+$/.test(inc)) return fail("O incremento precisa ser um número inteiro.");
    inc = Number(inc || 0);
    var fixos = [];
    if (inc) { fixos.push({ rot: "incremento", val: inc }); soma += inc; }
    if (state.mod) {
      var m = R.mod(c, state.mod);
      fixos.push({ rot: D.ATTRIBUTES.filter(function (a) { return a[0] === state.mod; })[0][1], val: m });
      soma += m;
    }
    // Bônus da transformação ativa: um teste (só 1d20) soma o bônus em testes; qualquer outra rolagem é dano e soma o bônus em danos.
    var t = window.DBOTransf ? DBOTransf.bonus(c) : { teste: 0, dano: 0 };
    var isTest = state.groups.length === 1 && Number(state.groups[0].qtd) === 1 && state.groups[0].dado === "d20";
    // Ativação (Inventor, "Aprimorar atributo"): vale no próximo teste de d20 que use o atributo ativado.
    var pend = isTest && state.mod && window.DBOAbility ? DBOAbility.usarPendente(c, state.mod) : null;
    if (pend) { fixos.push({ rot: "ativação (" + pend.fonte + ")", val: pend.valor }); soma += pend.valor; }
    // Habilidades de classe: bônus fixo em rolagens de dano (qualquer rolagem que não seja um teste simples de d20).
    if (!isTest && state.tipoDano) { var danoPassivo = R.passivos(c).dano[state.tipoDano] || 0; if (danoPassivo) { fixos.push({ rot: "habilidades de classe", val: danoPassivo }); soma += danoPassivo; } }
    var tb = isTest ? t.teste : t.dano;
    if (tb) { fixos.push({ rot: isTest ? "transformação (testes)" : "transformação (danos)", val: tb }); soma += tb; }
    var raw = Math.max(0, soma);
    var mult = state.tipoDano ? multOf(c, state.tipoDano) : 1;
    var resultado = { partes: partes, fixos: fixos, raw: raw, mult: state.tipoDano ? mult : null, total: raw * mult };
    out.textContent = "";
    var titulo = isTest ? "Teste de d20" : "Rolador de dados";
    if (window.DBOPrato) DBOPrato.rolar(titulo, dados, function () { state.result = resultado; showResult(); },
      { fixos: fixos, mult: resultado.mult, total: resultado.total });
    else { state.result = resultado; showResult(); }
  }

  function showResult() {
    out.textContent = "";
    var r = state.result;
    if (!r) return;
    var card = el("div", "dmg-out");
    card.appendChild(el("b", "dmg-out__total", UI.fmt(r.total)));
    var itens = r.partes.map(function (p) { return p.rot + ": " + p.faces.join(" + "); });
    r.fixos.forEach(function (f) { itens.push(f.rot + " " + signed(f.val)); });
    card.appendChild(el("small", "", "(" + itens.join(" · ") + ") = " + UI.fmt(r.raw) +
      (r.mult ? " × " + UI.fmt(r.mult) + " (" + (state.tipoDano === "ki" ? "dano de Ki" : "dano físico") + ")" : " (sem multiplicador)")));
    out.appendChild(card);
  }

  function sync() {
    var c = S.get();
    if (!c) return;
    ["fisico", "ki"].forEach(function (k) {
      var t = tiles[k], on = state.tipoDano === k;
      t.querySelector(".mult__value").textContent = "×" + UI.fmt(multOf(c, k));
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-pressed", String(on));
      t.querySelector(".mult__hint").textContent = on ? "Multiplicando a rolagem" : "Clique para multiplicar";
    });
  }

  S.subscribe(function () { if (!built) build(); sync(); });
})();
