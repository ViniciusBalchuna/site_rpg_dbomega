// Dragon Ball Omega — modo debug (debug.html). Só o mestre, só no computador dele.
//
// O personagem de teste fica num arquivo JSON do projeto: ferramentas/debug-local/personagem-debug.json.
// Quem lê e grava o arquivo é o servidor local ferramentas/servidor-debug.js (rode: node ferramentas/servidor-debug.js).
// Sem o servidor (Live Server, arquivo aberto direto...), a ficha fica salva só neste navegador; dá para exportar e importar o JSON.
//
// As contas usam as mesmas regras da ficha (js/rules.js), mas sem gasto de TP e sem limite de nível, inventário, classe ou raça.
(function () {
  var D = DBOData, R = DBORules, UI = DBOUI, A = DBOAbility, el = UI.el;
  var $ = function (id) { return document.getElementById(id); };
  var API = "/__debug/personagem", LKEY = "dbo-debug-personagem";
  var ROMANO = ["", "I", "II", "III"];

  function local() { return location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname); }

  function inicial() {
    return {
      v: 1, nome: "Personagem debug", nivel: 30, xp: 0, classe: "Guerreiro", subclasse: "Velocista", raca: "Sayajin", subraca: "Sayajin Puro", alinhamento: "Bom e Neutro",
      atributos: { forca: 20, velocidade: 15, resistencia: 15, mente: 7, espirito: 10, concentracao: 7 },
      habilidadesClasse: ["destemido", "velocista-1a"], raciais: ["cauda-deus-macaco", "zenkai"],
      tecnicas: JSON.parse(JSON.stringify(D.INITIAL_TECHNIQUES)).map(function (t, i) { t.id = "t" + i; t.usos = 0; return t; }),
      itens: ["Armadura de batalha", "Scouter"], zeni: 2000, hpDano: 0, kpGasto: 0, pd: 2, pdMax: 2, transformacoes: [], transformacaoAtiva: ""
    };
  }

  /* ---------- Guardar (arquivo pelo servidor local, ou navegador) ---------- */
  var c = null, modo = "navegador", saveT = 0, ui = { tab: "golpes", base: null, adj: null, adjModo: "sub", outs: {}, aberto: {} };
  function carregar() {
    return fetch(API, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("sem servidor");
      modo = "arquivo";
      return r.json();
    }).catch(function () {
      modo = "navegador";
      try { return JSON.parse(localStorage.getItem(LKEY) || "null"); } catch (e) { return null; }
    }).then(function (dados) { c = Object.assign(inicial(), dados && dados.v ? dados : {}); });
  }
  function salvar() {
    clearTimeout(saveT);
    status("Salvando…");
    saveT = setTimeout(function () {
      var txt = JSON.stringify(c, null, 2);
      if (modo === "arquivo") {
        fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: txt })
          .then(function (r) { if (!r.ok) throw new Error(); status("Salvo em ferramentas/debug-local/personagem-debug.json"); })
          .catch(function () { modo = "navegador"; salvar(); });
      } else {
        try { localStorage.setItem(LKEY, txt); } catch (e) {}
        status("Servidor de debug desligado: salvo só neste navegador. Para salvar no arquivo, rode “node ferramentas/servidor-debug.js”.");
      }
    }, 350);
  }
  function status(t) { $("dbg-save").textContent = t; $("dbg-save").classList.toggle("is-off", modo !== "arquivo"); }
  function set(patch) { Object.assign(c, patch); salvar(); render(); }

  /* ---------- Contas ---------- */
  // Na ficha de verdade o Power Level sobe com os TPs gastos; aqui conta como se os pontos dos atributos tivessem sido gastos.
  function ficha() {
    var soma = Object.keys(c.atributos).reduce(function (n, k) { return n + (Number(c.atributos[k]) || 0); }, 0);
    return Object.assign({}, c, { tpGastos: soma, transformacoes: c.transformacoes || [] });
  }
  function fmt(n) { return UI.fmt(Math.round(n)); }
  function sgn(n) { return n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0"; }
  function die(s) { return Math.floor(Math.random() * s) + 1; }
  function cresc(f) { return "×" + R.crescimento(f).toLocaleString("pt-BR", { maximumFractionDigits: 3 }); }
  function contaVital(f, k) {
    var cls = R.classeBase(f), attr = k === "hp" ? "resistencia" : "espirito", m = R.mod(f, attr), p = R.passivos(f);
    var rows = [["Base da classe (" + f.classe + ")", fmt(cls[k])], [(k === "hp" ? "Resistência" : "Espírito") + " (mod. " + sgn(m) + " × 2.000)", (m < 0 ? "−" : "+") + fmt(Math.abs(2000 * m))]];
    p.fontes[k].forEach(function (x) { rows.push([x[0], "+" + fmt(x[1])]); });
    var soma = cls[k] + 2000 * m + p[k];
    rows.push(["Base" + (soma < 2000 ? " (mínimo 2.000)" : ""), fmt(Math.max(2000, soma))]);
    rows.push(["Crescimento do nível " + f.nivel + ": 2^((N−1)/7)", cresc(f)]);
    rows.push([k.toUpperCase() + " máximo", fmt(k === "hp" ? R.hpMax(f) : R.kpMax(f)), true]);
    return rows;
  }
  function contaMult(f, k) {
    var cls = R.classeBase(f), attr = k === "fisico" ? "forca" : "espirito", m = R.mod(f, attr), p = R.passivos(f), b = R.baseMultiplicadores(f);
    var rows = [["Base da classe (" + f.classe + ")", fmt(cls[k])], [(k === "fisico" ? "Força" : "Espírito") + " (mod. " + sgn(m) + " × 20)", (m < 0 ? "−" : "+") + fmt(Math.abs(20 * m))]];
    p.fontes[k].forEach(function (x) { rows.push([x[0], "+" + fmt(x[1])]); });
    if (b.flex) rows.push(["Flex: média dos dois + " + ((D.SUBCLASS_INFO.Flex || {}).numeros || {}).flex, fmt(b[k])]);
    rows.push(["Base", fmt(b[k])]);
    rows.push(["Crescimento do nível " + f.nivel + ": 2^((N−1)/7)", cresc(f)]);
    rows.push(["Multiplicador final", "×" + fmt(k === "fisico" ? R.danoFisico(f) : R.danoKi(f)), true]);
    return rows;
  }
  function tabelaBase(titulo, rows) {
    var box = el("div", "dbg-base");
    box.appendChild(el("h4", "", titulo));
    rows.forEach(function (r) {
      var row = el("div", "dbg-base__row" + (r[2] ? " is-total" : ""));
      row.appendChild(el("span", "", r[0])); row.appendChild(el("b", "", r[1]));
      box.appendChild(row);
    });
    return box;
  }
  function btn(txt, cls, fn, aria) {
    var b = el("button", cls || "btn btn--ghost dbg-sm", txt); b.type = "button";
    if (aria) b.setAttribute("aria-label", aria);
    b.addEventListener("click", fn);
    return b;
  }
  function painel(titulo) { var p = el("section", "panel"); if (titulo) p.appendChild(el("h2", "", titulo)); return p; }
  function clampN(n) { return Math.max(1, Math.min(D.MAX_LEVEL || 200, Math.round(Number(n) || 1))); }

  /* ---------- Coluna da esquerda ---------- */
  function renderLeft(f) {
    var col = $("dbg-left"); col.textContent = "";
    // Identidade e nível
    var who = painel();
    who.classList.add("dbg-who");
    var nome = el("input", "dbg-nome"); nome.value = c.nome; nome.setAttribute("aria-label", "Nome do personagem debug");
    nome.addEventListener("change", function () { set({ nome: nome.value.trim() || "Personagem debug" }); });
    who.appendChild(nome);
    who.appendChild(el("p", "dbg-sub", "Nível " + c.nivel + " · " + c.raca + " · " + c.classe + (c.subclasse ? " · " + c.subclasse : "")));
    var lvl = el("div", "dbg-lvl");
    lvl.appendChild(el("span", "", "Nível (1 a " + (D.MAX_LEVEL || 200) + ")"));
    [[-10, "−10"], [-1, "−1"]].forEach(function (x) { var b = btn(x[1], "dbg-stp", function () { set({ nivel: clampN(c.nivel + x[0]) }); }, "Descer " + Math.abs(x[0]) + " nível(is)"); b.disabled = c.nivel <= 1; lvl.appendChild(b); });
    var inp = el("input", "dbg-lvl__in"); inp.type = "number"; inp.min = 1; inp.max = D.MAX_LEVEL || 200; inp.value = c.nivel; inp.setAttribute("aria-label", "Nível");
    inp.addEventListener("change", function () { set({ nivel: clampN(inp.value) }); });
    lvl.appendChild(inp);
    [[1, "+1"], [10, "+10"]].forEach(function (x) { var b = btn(x[1], "dbg-stp", function () { set({ nivel: clampN(c.nivel + x[0]) }); }, "Subir " + x[0] + " nível(is)"); b.disabled = c.nivel >= (D.MAX_LEVEL || 200); lvl.appendChild(b); });
    who.appendChild(lvl);
    var pl = el("div", "dbg-pl"); pl.appendChild(el("span", "", "Power Level")); pl.appendChild(el("b", "", UI.pl(R.powerLevel(f)))); who.appendChild(pl);
    col.appendChild(who);

    // Atributos (de graça)
    var at = painel("Atributos");
    at.appendChild(el("p", "dbg-note", "Sem custo de TP. O modificador já inclui os bônus de sub-raça e de sub-classe."));
    var grid = el("div", "dbg-attrs");
    D.ATTRIBUTES.forEach(function (a) {
      var k = a[0], bonus = R.bonusRaca(f, k) + R.bonusSubclasse(f, k);
      var box = el("div", "dbg-attr");
      box.appendChild(btn("−", "dbg-stp", function () { var o = Object.assign({}, c.atributos); o[k] = Math.max(0, (o[k] || 0) - 1); set({ atributos: o }); }, "Tirar 1 de " + a[1]));
      var t = el("div", "dbg-attr__t");
      t.appendChild(el("small", "", a[2]));
      t.appendChild(el("strong", "", sgn(R.mod(f, k))));
      t.appendChild(el("em", "", (c.atributos[k] || 0) + " pts" + (bonus ? " · " + sgn(bonus) + " de bônus" : "")));
      box.appendChild(t);
      box.appendChild(btn("+", "dbg-stp", function () { var o = Object.assign({}, c.atributos); o[k] = (o[k] || 0) + 1; set({ atributos: o }); }, "Somar 1 em " + a[1]));
      grid.appendChild(box);
    });
    at.appendChild(grid);
    var cb = el("div", "dbg-corpo"); cb.appendChild(el("span", "", "Corpo Base")); cb.appendChild(el("b", "", String(R.corpoBase(f)))); at.appendChild(cb);
    col.appendChild(at);

    // Vitalidade
    var vit = painel("Vitalidade");
    vit.appendChild(el("p", "dbg-note", "Toque no valor para ver a base."));
    [["hp", "HP", R.hpMax(f), "hpDano"], ["kp", "KP", R.kpMax(f), "kpGasto"]].forEach(function (v) {
      var max = v[2], cur = Math.max(0, max - (c[v[3]] || 0));
      var box = el("div", "dbg-vital");
      var h = el("div", "dbg-vital__h");
      h.appendChild(el("span", "dbg-vital__l", v[1]));
      var val = btn("", "dbg-vital__v", function () { ui.base = ui.base === v[0] ? null : v[0]; render(); });
      val.setAttribute("aria-expanded", String(ui.base === v[0]));
      val.appendChild(el("b", "", fmt(cur))); val.appendChild(document.createTextNode(" / " + fmt(max)));
      val.appendChild(el("small", "", "ver base"));
      h.appendChild(val);
      var plus = btn("+", "dbg-plus", function () { ui.adj = ui.adj === v[0] ? null : v[0]; render(); }, "Alterar " + v[1] + " atual");
      plus.setAttribute("aria-expanded", String(ui.adj === v[0]));
      h.appendChild(plus);
      box.appendChild(h);
      var trk = el("div", "dbg-trk"), fill = el("div", "dbg-fill dbg-fill--" + v[0]);
      fill.style.width = (max ? Math.min(100, cur / max * 100) : 0).toFixed(1) + "%";
      trk.appendChild(fill); box.appendChild(trk);
      if (ui.base === v[0]) box.appendChild(tabelaBase("De onde vem o " + v[1], contaVital(f, v[0])));
      if (ui.adj === v[0]) {
        var adj = el("div", "dbg-adj");
        var seg = el("div", "dbg-seg");
        [["add", "Somar"], ["sub", "Subtrair"], ["set", "Definir"]].forEach(function (m) {
          var b = btn(m[1], "", function () { ui.adjModo = m[0]; render(); }); b.setAttribute("aria-pressed", String(ui.adjModo === m[0])); seg.appendChild(b);
        });
        adj.appendChild(seg);
        var row = el("div", "dbg-adj__row");
        var n = el("input"); n.type = "number"; n.min = 0; n.setAttribute("aria-label", "Valor");
        row.appendChild(n);
        row.appendChild(btn("Aplicar", "btn dbg-sm", function () {
          var x = Math.max(0, Number(n.value) || 0), nv = ui.adjModo === "add" ? cur + x : ui.adjModo === "sub" ? cur - x : x;
          nv = Math.max(0, Math.min(max, nv)); ui.adj = null;
          var p = {}; p[v[3]] = max - nv; set(p);
        }));
        adj.appendChild(row); box.appendChild(adj);
      }
      vit.appendChild(box);
    });
    // Pontos do Dragão: barra dourada dividida pelo máximo
    var pd = el("div", "dbg-vital");
    var ph = el("div", "dbg-vital__h");
    ph.appendChild(el("span", "dbg-vital__l", "PD"));
    ph.appendChild(el("span", "dbg-note", "Pontos do Dragão"));
    var pn = el("span", "dbg-pd__n"); pn.appendChild(el("b", "", String(c.pd))); pn.appendChild(document.createTextNode(" / " + c.pdMax)); ph.appendChild(pn);
    pd.appendChild(ph);
    var bar = el("div", "pdbar"); bar.style.setProperty("--pd-max", String(c.pdMax));
    bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Pontos do Dragão: toque numa parte para definir o atual");
    for (var i = 0; i < c.pdMax; i++) (function (i) {
      var s = btn("", "pdbar__seg" + (i < c.pd ? " is-on" : ""), function () { set({ pd: c.pd === i + 1 ? i : i + 1 }); }, "Definir " + (i + 1) + " de " + c.pdMax + " Pontos do Dragão");
      bar.appendChild(s);
    })(i);
    pd.appendChild(bar);
    var ctl = el("div", "dbg-pdctl");
    ctl.appendChild(el("span", "", "Gastar ou recuperar"));
    var m1 = btn("−1", "dbg-stp", function () { set({ pd: Math.max(0, c.pd - 1) }); }, "Gastar 1 PD"); m1.disabled = c.pd <= 0; ctl.appendChild(m1);
    var p1 = btn("+1", "dbg-stp", function () { set({ pd: Math.min(c.pdMax, c.pd + 1) }); }, "Recuperar 1 PD"); p1.disabled = c.pd >= c.pdMax; ctl.appendChild(p1);
    pd.appendChild(ctl);
    var ctl2 = el("div", "dbg-pdctl");
    ctl2.appendChild(el("span", "", "Máximo de PD (1 a 9; pela regra, no nível " + c.nivel + " seria " + R.pdMax(c) + ")"));
    var mm = btn("−1", "dbg-stp", function () { var nm = Math.max(1, c.pdMax - 1); set({ pdMax: nm, pd: Math.min(c.pd, nm) }); }, "Diminuir o máximo de PD"); mm.disabled = c.pdMax <= 1; ctl2.appendChild(mm);
    var mp = btn("+1", "dbg-stp", function () { set({ pdMax: Math.min(9, c.pdMax + 1) }); }, "Aumentar o máximo de PD"); mp.disabled = c.pdMax >= 9; ctl2.appendChild(mp);
    pd.appendChild(ctl2);
    vit.appendChild(pd);
    var rest = el("div", "dbg-restore");
    var rh = btn("Restaurar HP", "btn btn--ghost dbg-sm", function () { set({ hpDano: 0 }); }); rh.disabled = !c.hpDano; rest.appendChild(rh);
    var rk = btn("Restaurar KP", "btn btn--ghost dbg-sm", function () { set({ kpGasto: 0 }); }); rk.disabled = !c.kpGasto; rest.appendChild(rk);
    var rp = btn("Restaurar PD", "btn btn--ghost dbg-sm", function () { set({ pd: c.pdMax }); }); rp.disabled = c.pd >= c.pdMax; rest.appendChild(rp);
    vit.appendChild(rest);
    col.appendChild(vit);
  }

  /* ---------- Coluna da direita ---------- */
  var TABS = [["golpes", "Golpes"], ["tecnicas", "Técnicas"], ["transformacoes", "Transformações"], ["inventario", "Inventário"], ["descricao", "Descrição"]];
  function renderTabs() {
    var t = $("dbg-tabs"); t.textContent = "";
    TABS.forEach(function (x) {
      var b = btn(x[1], "dbg-tab", function () { ui.tab = x[0]; render(); });
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(ui.tab === x[0]));
      t.appendChild(b);
    });
  }
  function multOf(f, t) { return t.tipo === "ki" ? R.danoKi(f) : R.danoFisico(f); }

  function renderGolpes(f, out) {
    var p = painel("Multiplicadores de dano");
    p.appendChild(el("p", "dbg-note", "Toque para ver a base."));
    var g = el("div", "dbg-mults");
    [["fisico", "Dano físico"], ["ki", "Dano de Ki"]].forEach(function (m) {
      var w = el("div");
      var b = btn("", "dbg-mult", function () { ui.base = ui.base === "m-" + m[0] ? null : "m-" + m[0]; render(); });
      b.setAttribute("aria-expanded", String(ui.base === "m-" + m[0]));
      b.appendChild(el("span", "", m[1])); b.appendChild(el("b", "", "×" + fmt(m[0] === "ki" ? R.danoKi(f) : R.danoFisico(f)))); b.appendChild(el("small", "", "ver base"));
      w.appendChild(b);
      if (ui.base === "m-" + m[0]) w.appendChild(tabelaBase("De onde vem o " + m[1].toLowerCase(), contaMult(f, m[0])));
      g.appendChild(w);
    });
    p.appendChild(g);
    out.appendChild(p);

    var h = painel("Habilidades com dano");
    h.appendChild(el("p", "dbg-note", "O KP só é gasto ao clicar em Usar."));
    var ul = el("ul", "dbg-list");
    var bon = R.passivos(f), tb = window.DBOTransf ? DBOTransf.bonus(f) : { teste: 0, dano: 0 };
    c.tecnicas.forEach(function (t) {
      var mod = (t.mod ? R.mod(f, t.mod) : 0) + (bon.dano[t.tipo] || 0) + (Number(t.fixo) || 0) + tb.dano;
      var atk = (t.mod ? R.mod(f, t.mod) : 0) + (bon.ataque[t.tipo] || 0) + tb.teste;
      var qtd = Number(t.qtd) || 1, lados = Number(String(t.dado).replace("d", "")) || 4, mult = multOf(f, t);
      var kp = t.tipo === "ki" ? Math.ceil(qtd * lados * R.danoKi(f) / 2) : 0, kpCur = R.kpMax(f) - c.kpGasto;
      var li = el("li", "dbg-item");
      var top = el("div", "dbg-item__h");
      top.appendChild(el("strong", "", t.nome));
      var tags = el("div", "dbg-tags");
      tags.appendChild(el("span", "tag tag--" + (t.tipo === "ki" ? "ki" : "fisico"), t.tipo === "ki" ? "Ki" : "Físico"));
      tags.appendChild(el("span", "tag", qtd + "d" + lados));
      top.appendChild(tags);
      li.appendChild(top);
      var acts = el("div", "dbg-acts");
      acts.appendChild(btn("Atacar (d20 " + sgn(atk) + ")", null, function () { var n = die(20); ui.outs[t.id] = "Ataque: d20 " + n + " " + (atk >= 0 ? "+ " : "− ") + Math.abs(atk) + " = " + (n + atk); render(); }));
      acts.appendChild(btn("Rolar dano", null, function () {
        var s = 0, rs = []; for (var i = 0; i < qtd; i++) { var v = die(lados); s += v; rs.push(v); }
        ui.outs[t.id] = "Dano: (" + rs.join(" + ") + " " + (mod >= 0 ? "+ " : "− ") + Math.abs(mod) + ") × " + fmt(mult) + " = " + fmt((s + mod) * mult); render();
      }));
      var usar = btn(kp ? "Usar (−" + fmt(kp) + " KP)" : "Usar", "btn dbg-sm", function () {
        if (kp > kpCur) return;
        ui.outs[t.id] = "Usou " + t.nome + (kp ? " · gastou " + fmt(kp) + " KP" : "");
        set({ kpGasto: c.kpGasto + kp, tecnicas: c.tecnicas.map(function (x) { return x.id === t.id ? Object.assign({}, x, { usos: (x.usos || 0) + 1 }) : x; }) });
      });
      usar.disabled = kp > kpCur;
      acts.appendChild(usar);
      li.appendChild(acts);
      if (ui.outs[t.id]) li.appendChild(el("p", "dbg-out", ui.outs[t.id]));
      ul.appendChild(li);
    });
    if (!c.tecnicas.length) ul.appendChild(el("li", "dbg-empty", "Nenhuma técnica. Crie uma na aba Técnicas."));
    h.appendChild(ul);
    out.appendChild(h);
  }

  // Cartão de uma habilidade de classe, sub-classe ou raça (texto aberto/fechado, botão Remover).
  function cartao(chave, nome, rotulo, linhas, onRemove, extraCls) {
    var li = el("li", "dbg-item dbg-hab" + (extraCls ? " " + extraCls : ""));
    var top = el("div", "dbg-item__h");
    var nb = btn("", "dbg-hab__nome", function () { ui.aberto[chave] = !ui.aberto[chave]; render(); });
    nb.setAttribute("aria-expanded", String(!!ui.aberto[chave]));
    nb.appendChild(el("strong", "", nome)); nb.appendChild(el("small", "", rotulo));
    top.appendChild(nb);
    if (onRemove) top.appendChild(btn("Remover", null, onRemove));
    li.appendChild(top);
    if (ui.aberto[chave]) { var box = el("div", "dbg-hab__txt"); linhas.forEach(function (l) { if (l) box.appendChild(el("p", "", l)); }); li.appendChild(box); }
    return li;
  }
  function linhasDe(def, f) {
    if (def.sub) return [def.frase ? "“" + def.frase + "”" : ""].concat(def.texto || []);
    if (def.exclusiva) return [def.descricao].concat(def.m.map(function (x, i) { return "Maestria " + (i + 1) + ": " + x.texto; }));
    if (def.generica && def.textos) return def.textos.slice();
    if (def.generica) return ["Cada cópia: +" + fmt(def.por) + " " + def.rotulo + ". Na 5ª: mais +" + fmt(def.maximo) + "."];
    var l = [def.descricao];
    (def.efeitos || []).forEach(function (g, i) { g.forEach(function (e) { l.push("Maestria " + (i + 1) + " (nível " + def.niveis[i] + "): " + e.texto); }); });
    return l;
  }

  function renderTecnicas(f, out) {
    var info = painel();
    var chips = el("div", "dbg-tags");
    function chip(t, b, s) { var x = el("span", "badge"); x.appendChild(document.createTextNode(t + " ")); x.appendChild(el("b", "", b)); if (s) x.appendChild(el("s", "", " " + s)); chips.appendChild(x); }
    var nCls = (c.habilidadesClasse || []).length;
    chip("RD de técnica", String(R.rdTecnica(f)));
    chip("Aprendidas", c.tecnicas.filter(function (t) { return t.nome !== "Soco"; }).length + " / ∞", "normal: " + R.limiteTecnicas(f));
    chip("De classe", nCls + " / ∞", "normal: " + R.limiteClasse(f));
    var d = el("span", "badge dbg-badge"); d.textContent = "Sem custo de TP"; chips.appendChild(d);
    info.appendChild(chips);
    out.appendChild(info);

    // Técnicas aprendidas + criar técnica de teste
    var tp = painel("Técnicas aprendidas");
    var ul = el("ul", "dbg-list");
    c.tecnicas.forEach(function (t) {
      var li = el("li", "dbg-item"), top = el("div", "dbg-item__h");
      top.appendChild(el("strong", "", t.nome));
      var tags = el("div", "dbg-tags");
      tags.appendChild(el("span", "tag tag--" + (t.tipo === "ki" ? "ki" : "fisico"), t.tipo === "ki" ? "Ki" : "Físico"));
      tags.appendChild(el("span", "tag", (t.qtd || 1) + t.dado));
      tags.appendChild(el("span", "tag dbg-tag", "0 TP (custaria " + fmt(R.custoTecnica({ qtd: t.qtd, dado: t.dado, extras: [] })) + ")"));
      tags.appendChild(btn("Remover", null, function () { set({ tecnicas: c.tecnicas.filter(function (x) { return x.id !== t.id; }) }); }));
      top.appendChild(tags); li.appendChild(top); ul.appendChild(li);
    });
    tp.appendChild(ul);
    tp.appendChild(el("h3", "dbg-h3", "Criar técnica de teste"));
    var mk = el("div", "dbg-make");
    function campo(lbl, node) { var w = el("label", "dbg-field"); w.appendChild(el("span", "", lbl)); w.appendChild(node); mk.appendChild(w); return node; }
    var nm = campo("Nome", el("input")); nm.value = "Técnica de teste";
    var qt = campo("Dados", el("input")); qt.type = "number"; qt.min = 1; qt.max = 20; qt.value = 2;
    var dd = campo("Dado", el("select")); D.DICE.forEach(function (x) { var o = el("option", "", x); o.value = x; dd.appendChild(o); }); dd.value = "d8";
    var tt = campo("Tipo", el("select")); [["fisico", "Físico"], ["ki", "Ki"]].forEach(function (x) { var o = el("option", "", x[1]); o.value = x[0]; tt.appendChild(o); }); tt.value = "ki";
    var custo = el("p", "dbg-note");
    function atualizaCusto() { custo.textContent = "Custaria " + fmt(R.custoTecnica({ qtd: Number(qt.value) || 1, dado: dd.value, extras: [] })) + " TP. No debug: grátis."; }
    qt.addEventListener("input", atualizaCusto); dd.addEventListener("change", atualizaCusto); atualizaCusto();
    tp.appendChild(mk); tp.appendChild(custo);
    tp.appendChild(btn("Aprender sem gastar TP", "btn", function () {
      var q = Math.max(1, Math.min(20, Number(qt.value) || 1));
      set({ tecnicas: c.tecnicas.concat([{ id: "t" + Date.now(), nome: nm.value.trim() || "Técnica de teste", qtd: q, dado: dd.value, tipo: tt.value, mod: tt.value === "ki" ? "espirito" : "forca", fixo: 0, efeitos: [], usos: 0 }]) });
    }));
    out.appendChild(tp);

    // Técnicas de classe e de sub-classe (o Rugir do Dragão fica em cima, dourado)
    var cp = painel("Técnicas de classe e de sub-classe");
    var lista = el("ul", "techs dbg-list");
    var pd = R.gastoDragao(f);
    if (pd) lista.appendChild(A.node(A.daClasse(pd, f), "dbg-" + pd.id, "li", false, f, { rolls: {}, opened: ui.aberto, get: function () { return f; }, refresh: render }));
    R.agrupadas(f).forEach(function (g, i) {
      var def = g.def, rot = def.sub ? A.rotuloSub(def) : def.generica ? "Genérica · maestria " + g.copias : def.exclusiva ? "Exclusiva · " + def.classe + " · cópias " + g.copias : "Inicial · " + def.classe;
      lista.appendChild(cartao("h-" + def.id, def.nome + (g.copias > 1 ? " ×" + g.copias : ""), rot, linhasDe(def, f), function () {
        var idx = c.habilidadesClasse.lastIndexOf(def.id), nova = c.habilidadesClasse.slice(); nova.splice(idx, 1); set({ habilidadesClasse: nova });
      }, def.sub ? "is-sub" : ""));
    });
    if (!pd && !R.agrupadas(f).length) lista.appendChild(el("li", "dbg-empty", "Nenhuma técnica de classe."));
    cp.appendChild(lista);
    cp.appendChild(btn("Pegar qualquer habilidade (catálogo)", "btn", function () {
      DBOClassPicker.open(f, function (id) { set({ habilidadesClasse: (c.habilidadesClasse || []).concat([id]) }); return ""; }, { semTrava: true });
    }));
    if (c.subclasse && c.nivel < (D.SUBCLASS_UNLOCK || {})[0]) cp.appendChild(el("p", "dbg-note", "O Rugir do Dragão de " + c.subclasse + " aparece sozinho no nível " + D.SUBCLASS_UNLOCK[0] + "."));

    // Raça: qualquer habilidade racial, de qualquer raça
    cp.appendChild(el("h3", "dbg-h3", "Habilidades de raça"));
    var rl = el("ul", "dbg-list");
    var todasRaca = [];
    Object.keys(D.RACE_ABILITIES || {}).forEach(function (r) { D.RACE_ABILITIES[r].forEach(function (d) { todasRaca.push(Object.assign({ raca: r }, d)); }); });
    Object.keys(D.SUBRACE_ABILITIES || {}).forEach(function (k) { D.SUBRACE_ABILITIES[k].forEach(function (d) { todasRaca.push(Object.assign({ raca: k.split("|")[0], sub: k.split("|")[1] }, d)); }); });
    (c.raciais || []).forEach(function (id) {
      var d = todasRaca.filter(function (x) { return x.id === id; })[0];
      if (d) rl.appendChild(cartao("r-" + id, d.nome, d.raca, [d.descricao], function () { set({ raciais: c.raciais.filter(function (x) { return x !== id; }) }); }));
    });
    if (!(c.raciais || []).length) rl.appendChild(el("li", "dbg-empty", "Nenhuma habilidade de raça."));
    cp.appendChild(rl);
    var faltam = todasRaca.filter(function (d) { return (c.raciais || []).indexOf(d.id) < 0; });
    if (faltam.length) {
      var row = el("div", "dbg-adj__row");
      var sel = el("select"); sel.setAttribute("aria-label", "Habilidade de raça para pegar");
      faltam.forEach(function (d) { var o = el("option", "", d.nome + " (" + d.raca + ")"); o.value = d.id; sel.appendChild(o); });
      row.appendChild(sel);
      row.appendChild(btn("Pegar", "btn dbg-sm", function () { set({ raciais: (c.raciais || []).concat([sel.value]) }); }));
      cp.appendChild(row);
    }
    out.appendChild(cp);
  }

  /* ---------- Transformações (todas, sem trava de raça nem de maestria) ---------- */
  function renderTransf(f, out) {
    var T = window.DBOTransf, C = T.CATALOGO, at = T.ativa(f);
    var topo = painel("Transformação ativa");
    if (at) {
      var bon = [];
      if (at.teste) bon.push(sgn(at.teste) + " em testes");
      if (at.dano) bon.push(sgn(at.dano) + " em danos");
      if (at.mods) Object.keys(at.mods).forEach(function (k) { bon.push(sgn(at.mods[k]) + " em " + k); });
      topo.appendChild(el("p", "", at.nome + " · Poder ×" + fmt(at.pl) + " · Danos +" + String(at.danoPct).replace(".", ",") + "% · " + (at.kpPct ? String(at.kpPct).replace(".", ",") + "% do KP por rodada (" + fmt(R.kpMax(f) * at.kpPct / 100) + " KP)" : "sem gasto de KP") + (bon.length ? " · " + bon.join(", ") : "")));
      topo.appendChild(el("p", "dbg-note", "Já está somado no Power Level, nos multiplicadores, nos modificadores e nas rolagens da aba Golpes."));
      topo.appendChild(btn("Desativar", "btn dbg-sm", function () { set({ transformacaoAtiva: "" }); }));
    } else topo.appendChild(el("p", "dbg-note", "Nenhuma. Aprenda e ative uma abaixo."));
    out.appendChild(topo);
    function entrada(id) { return (c.transformacoes || []).filter(function (e) { return e.catalogoId === id; })[0]; }
    function comUsos(id, minUsos) {
      return (c.transformacoes || []).map(function (e) { return e.catalogoId === id ? Object.assign({}, e, { usos: Math.max(Number(e.usos) || 0, minUsos) }) : e; });
    }
    T.GRUPOS.forEach(function (g) {
      var p = painel(g[0]);
      var ul = el("ul", "dbg-list");
      g[1].forEach(function (id) {
        var t = C[id], e = entrada(id), m = e ? T.maestria(e.usos) : 0;
        var li = el("li", "dbg-item" + (at && at.baseId === id ? " is-sub" : ""));
        var top = el("div", "dbg-item__h");
        var nb = el("div"); nb.appendChild(el("strong", "", t.nome + (t.wip ? " (W.I.P)" : "")));
        nb.appendChild(el("p", "dbg-out", "Poder ×" + fmt(t.pl) + " · Danos +" + String(t.danoPct).replace(".", ",") + "% · " + (t.kpPct ? String(t.kpPct).replace(".", ",") + "% KP/rodada" : "sem gasto de KP") +
          (t.teste ? " · " + sgn(t.teste) + " testes" : "") + (t.dano ? " · " + sgn(t.dano) + " danos" : "") + (t.mods && t.mods.velocidade ? " · " + sgn(t.mods.velocidade) + " Velocidade" : "") +
          (t.requer ? " · na ficha exige maestria " + t.requer.maestria + " em " + C[t.requer.id].nome : "")));
        top.appendChild(nb);
        var acts = el("div", "dbg-acts");
        if (!e) acts.appendChild(btn("Aprender", "btn dbg-sm", function () { set({ transformacoes: (c.transformacoes || []).concat([{ id: "f" + Date.now(), catalogoId: id, usos: 0 }]) }); }));
        else {
          var ms = el("select"); ms.setAttribute("aria-label", "Maestria de " + t.nome);
          [1, 2, 3, 4, 5].forEach(function (n) { var o = el("option", "", "Maestria " + n); o.value = n; ms.appendChild(o); });
          ms.value = m;
          ms.addEventListener("change", function () {
            var n = Number(ms.value), usos = n === 1 ? 0 : T.MAESTRIA_USOS[n - 2];
            set({ transformacoes: (c.transformacoes || []).map(function (x) { return x.catalogoId === id ? Object.assign({}, x, { usos: usos }) : x; }) });
          });
          acts.appendChild(ms);
          var ligada = at && at.baseId === id;
          if (t.grades) {
            T.grades(f, id).forEach(function (gr) {
              var b = btn(gr.n === 1 ? "Grade 1" : "Grade " + gr.n, at && at.id === gr.id ? "btn dbg-sm" : "btn btn--ghost dbg-sm", function () {
                set({ transformacaoAtiva: gr.id, transformacoes: comUsos(id, gr.n === 1 ? 0 : T.MAESTRIA_USOS[gr.n - 2]) });
              }, "Ativar " + gr.nome);
              acts.appendChild(b);
            });
          } else acts.appendChild(btn(ligada ? "Desativar" : "Ativar", ligada ? "btn dbg-sm" : "btn btn--ghost dbg-sm", function () { set({ transformacaoAtiva: ligada ? "" : id }); }));
          acts.appendChild(btn("Remover", null, function () {
            var patch = { transformacoes: c.transformacoes.filter(function (x) { return x.catalogoId !== id; }) };
            if (ligada) patch.transformacaoAtiva = "";
            set(patch);
          }));
        }
        top.appendChild(acts);
        li.appendChild(top);
        ul.appendChild(li);
      });
      p.appendChild(ul);
      out.appendChild(p);
    });
  }

  function renderInventario(f, out) {
    var p = painel("Equipamentos");
    var chips = el("div", "dbg-tags");
    var b = el("span", "badge"); b.appendChild(document.createTextNode("Carregando ")); b.appendChild(el("b", "", c.itens.length + " / ∞")); b.appendChild(el("s", "", " normal: " + R.limiteInventario(f))); chips.appendChild(b);
    p.appendChild(chips);
    var ul = el("ul", "dbg-list");
    c.itens.forEach(function (nome, i) {
      var li = el("li", "dbg-item"), top = el("div", "dbg-item__h");
      top.appendChild(el("strong", "", nome));
      top.appendChild(btn("Remover", null, function () { set({ itens: c.itens.filter(function (_, j) { return j !== i; }) }); }));
      li.appendChild(top); ul.appendChild(li);
    });
    p.appendChild(ul);
    var row = el("div", "dbg-adj__row");
    var nm = el("input"); nm.placeholder = "Nome do item"; nm.setAttribute("aria-label", "Nome do item");
    row.appendChild(nm);
    row.appendChild(btn("Adicionar item", "btn dbg-sm", function () { set({ itens: c.itens.concat([nm.value.trim() || "Item de teste " + (c.itens.length + 1)]) }); }));
    p.appendChild(row);
    out.appendChild(p);
    var z = painel("Zenis");
    var zr = el("div", "dbg-zeni");
    zr.appendChild(el("b", "", fmt(c.zeni) + " Z"));
    var za = el("div", "dbg-acts");
    za.appendChild(btn("−10.000", "dbg-stp", function () { set({ zeni: Math.max(0, c.zeni - 10000) }); }));
    za.appendChild(btn("+10.000", "dbg-stp", function () { set({ zeni: c.zeni + 10000 }); }));
    zr.appendChild(za); z.appendChild(zr);
    out.appendChild(z);
  }

  function select(lbl, valor, opcoes, onChange) {
    var w = el("label", "dbg-field"); w.appendChild(el("span", "", lbl));
    var s = el("select");
    opcoes.forEach(function (o) {
      if (o.grupo) { var g = el("optgroup"); g.label = o.grupo; o.itens.forEach(function (x) { var op = el("option", "", x); op.value = x; g.appendChild(op); }); s.appendChild(g); }
      else { var op = el("option", "", o); op.value = o; s.appendChild(op); }
    });
    s.value = valor;
    s.addEventListener("change", function () { onChange(s.value); });
    w.appendChild(s);
    return w;
  }
  function renderDescricao(f, out) {
    var p = painel("Classe e raça");
    p.appendChild(el("p", "dbg-note", "No debug vale qualquer combinação: sub-classe de outra classe, sub-raça de outra raça, Suporte com qualquer alinhamento."));
    var g = el("div", "dbg-selgrid");
    g.appendChild(select("Classe", c.classe, D.CLASSES, function (v) { set({ classe: v }); }));
    g.appendChild(select("Sub-classe", c.subclasse, [""].concat([]).concat(Object.keys(D.SUBCLASSES).map(function (k) { return { grupo: k, itens: D.SUBCLASSES[k] }; })), function (v) { set({ subclasse: v }); }));
    g.appendChild(select("Raça", c.raca, Object.keys(D.RACES), function (v) { set({ raca: v, subraca: (D.RACES[v] || [])[0] || "" }); }));
    var subs = Object.keys(D.RACES).filter(function (r) { return D.RACES[r].length; }).map(function (r) { return { grupo: r, itens: D.RACES[r] }; });
    g.appendChild(select("Sub-raça", c.subraca, [""].concat(subs), function (v) { set({ subraca: v }); }));
    g.appendChild(select("Alinhamento", c.alinhamento, D.ALIGNMENTS, function (v) { set({ alinhamento: v }); }));
    p.appendChild(g);
    if (!R.alinhamentoOk(c.classe, c.alinhamento)) p.appendChild(el("p", "dbg-note dbg-warn", "Fora do debug, o " + c.classe + " só aceita alinhamentos " + D.CLASS_ALIGNMENT[c.classe] + "s."));
    out.appendChild(p);
    var a = painel("Aumento-base da sub-classe");
    var inf = (D.SUBCLASS_INFO || {})[c.subclasse];
    a.appendChild(el("p", "", inf ? c.subclasse + ": " + inf.base + ". Já está somado nos números da ficha." : "Sem sub-classe."));
    out.appendChild(a);
  }

  function render() {
    var f = ficha();
    renderLeft(f);
    renderTabs();
    var out = $("dbg-right"); out.textContent = "";
    if (ui.tab === "golpes") renderGolpes(f, out);
    else if (ui.tab === "tecnicas") renderTecnicas(f, out);
    else if (ui.tab === "transformacoes") renderTransf(f, out);
    else if (ui.tab === "inventario") renderInventario(f, out);
    else renderDescricao(f, out);
  }

  /* ---------- Início ---------- */
  function trava(titulo, texto) { $("dbg-lock-title").textContent = titulo; $("dbg-lock-text").textContent = texto; $("dbg-lock").hidden = false; }
  async function start() {
    if (!local()) return trava("O modo debug roda só no seu computador", "Abra o projeto pelo servidor de debug (node ferramentas/servidor-debug.js) e entre em http://localhost:5500/debug.html.");
    try { await DBORoles.refresh(); } catch (e) {}
    if (!DBORoles.isMaster()) return trava("Essa página é só do mestre", "Entre com a conta do mestre neste endereço (localhost) para usar o modo debug.");
    await carregar();
    $("dbg-app").hidden = false;
    status(modo === "arquivo" ? "Salvo em ferramentas/debug-local/personagem-debug.json" : "Servidor de debug desligado: salvo só neste navegador. Para salvar no arquivo, rode “node ferramentas/servidor-debug.js”.");
    $("dbg-reset").addEventListener("click", function () { if (confirm("Voltar o personagem debug ao começo?")) { c = inicial(); ui.outs = {}; salvar(); render(); } });
    $("dbg-export").addEventListener("click", function () {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: "application/json" }));
      a.download = "personagem-debug.json"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $("dbg-import").addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return;
      file.text().then(function (t) { var d = JSON.parse(t); c = Object.assign(inicial(), d); salvar(); render(); })
        .catch(function () { UI.toast("Esse arquivo não é um JSON de personagem debug."); });
      e.target.value = "";
    });
    render();
  }
  start();
})();
