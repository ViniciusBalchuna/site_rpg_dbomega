// Dragon Ball Omega — ficha: transformações.
// O personagem começa sem nenhuma e aprende pelo botão "Aprender transformação" (as da raça dele vêm de js/transformacoes-data.js).
// Só uma fica ativa por vez (c.transformacaoAtiva guarda o id dela). A ativa multiplica o Power Level e os danos,
// soma os bônus do catálogo em testes e danos e deixa a ficha em "modo transformado" (nuvens vermelhas e mais rápidas, aura, esfera clara).
(function () {
  var UI = DBOUI, S = DBOSheet, T = DBOTransf, R = DBORules, el = UI.el;
  var $ = function (id) { return document.getElementById(id); };
  var opened = {};

  function pct(n) { return String(n).replace(".", ",") + "%"; }
  function comma(n) { return String(n).replace(".", ","); }

  // Ativar: soma 1 uso na transformação (a maestria sobe com os usos). O Super Saiyajin pergunta qual grade usar.
  function ativar(c, t) {
    // Concussão e Selamento de Ki Grau III impedem ativar uma transformação.
    var trava = window.DBOEfeitos ? DBOEfeitos.ativos(c).filter(function (e) { return e.ef === "concussao" || (e.ef === "selamento" && e.grau >= 3); })[0] : null;
    if (trava) { UI.bigAlert("Interação falhou: " + DBOEfeitos.POR_ID[trava.ef].nome + " impede ativar uma transformação.\nSeu uso foi negado."); return; }
    var gs = T.grades(c, t.id);
    function liga(id) {
      var cur = S.get();
      S.save({ transformacaoAtiva: id, transformacoes: (cur.transformacoes || []).map(function (e) {
        return e.id === t.eid ? Object.assign({}, e, { usos: (Number(e.usos) || 0) + 1 }) : e;
      }) });
    }
    if (gs.length <= 1) return liga(t.id);
    DBOChoose.open({
      title: "Qual grade usar?",
      left: {
        title: t.nome + " · maestria " + t.maestria,
        items: gs.map(function (g) {
          var x = T.CATALOGO[g.id];
          return { nome: g.nome, sub: (g.livre ? "" : "Bloqueada: libera com maestria " + g.n + " · ") + linha(x), detalhes: bonusTexto(x), onPick: function () {
            if (!g.livre) return "Habilidade bloqueada. Esta grade libera com maestria " + g.n + " no " + t.nome + ".";
            liga(g.id); return "";
          } };
        })
      }
    });
  }
  function linha(t) { return "Poder ×" + UI.fmt(t.pl) + " · Danos +" + comma(t.danoPct) + "% · " + (t.kpPct ? pct(t.kpPct) + " KP/rodada" : "sem gasto de KP"); }
  function bonusTexto(t) {
    var p = [];
    if (t.teste) p.push((t.teste > 0 ? "+" : "−") + Math.abs(t.teste) + " em testes");
    if (t.dano) p.push((t.dano > 0 ? "+" : "−") + Math.abs(t.dano) + " em danos");
    if (t.mods) Object.keys(t.mods).forEach(function (k) { var a = DBOData.ATTRIBUTES.filter(function (x) { return x[0] === k; })[0]; p.push((t.mods[k] > 0 ? "+" : "−") + Math.abs(t.mods[k]) + " no modificador de " + (a ? a[1] : k)); });
    return p.length ? p.join(" · ") : "Sem bônus em testes ou danos";
  }

  function render(c) {
    var list = $("tf-list");
    list.textContent = "";
    var all = T.lista(c);
    var active = T.ativa(c);
    document.documentElement.classList.toggle("is-transformed", !!active);   // dispara o visual de transformado (CSS)

    var badge = $("tf-badge");
    badge.textContent = "";
    badge.appendChild(el("span", "", "Ativa"));
    badge.appendChild(el("b", "", active ? active.nome : "Nenhuma"));
    $("tf-empty").hidden = all.length > 0;

    var kpMax = R.kpMax(c);
    all.forEach(function (t) {
      var on = !!active && active.baseId === t.id;
      var li = el("li", "item" + (on ? " item--on" : ""));
      var head = el("div", "item__head");
      var name = el("button", "tech__name");
      name.type = "button";
      name.setAttribute("aria-expanded", String(!!opened[t.id]));
      name.appendChild(el("strong", "", on && active.id !== t.id ? active.nome : t.nome));
      name.appendChild(el("small", "", linha(on ? active : t) + " · Maestria " + t.maestria));
      name.addEventListener("click", function () { opened[t.id] = !opened[t.id]; render(S.get()); });
      head.appendChild(name);
      if (!S.isView || !S.isView()) {
        var toggle = el("button", "btn" + (on ? "" : " btn--ghost"), on ? "Desativar" : "Ativar");
        toggle.type = "button";
        toggle.setAttribute("aria-pressed", String(on));
        toggle.addEventListener("click", function () { if (on) S.save({ transformacaoAtiva: "" }); else ativar(S.get(), t); });
        head.appendChild(toggle);
      }
      li.appendChild(head);
      if (opened[t.id]) {
        var x = on ? active : t, dl = el("dl", "tech__details");
        var prox = T.MAESTRIA_USOS[t.maestria - 1];
        [["Poder de luta base", "×" + UI.fmt(x.pl)],
         ["Todos os danos", "+" + comma(x.danoPct) + "% (dano final × " + comma(x.multDano) + ")"],
         ["Bônus", bonusTexto(x)],
         ["Custo por rodada", x.kpPct ? pct(x.kpPct) + " do KP máximo (" + UI.fmt(Math.round(kpMax * x.kpPct / 100)) + " KP)" : "Não gasta KP"],
         ["Maestria", "Maestria " + t.maestria + " · " + t.usos + " ativações" + (prox ? " · próxima com " + prox : " · máxima")]].forEach(function (r) {
          var row = el("div", "tech__row"); row.appendChild(el("dt", "", r[0])); row.appendChild(el("dd", "", r[1])); dl.appendChild(row);
        });
        var gs = T.grades(c, t.id);
        if (gs.length > 1) {
          var row = el("div", "tech__row"); row.appendChild(el("dt", "", "Grades"));
          row.appendChild(el("dd", "", gs.map(function (g) { return "Grade " + g.n + (g.livre ? " (liberada)" : " (maestria " + g.n + ")"); }).join(" · ")));
          dl.appendChild(row);
        }
        if (x.divina) { var dv = el("div", "tech__row"); dv.appendChild(el("dt", "", "Tipo")); dv.appendChild(el("dd", "", "Divina (Híbrido Kaioshin)")); dl.appendChild(dv); }
        if (x.wip) { var wp = el("div", "tech__row"); wp.appendChild(el("dt", "", "Valores")); wp.appendChild(el("dd", "", "W.I.P: em produção")); dl.appendChild(wp); }
        var actions = el("div", "actions");
        var del = el("button", "act act--del", "Remover");
        del.type = "button";
        del.setAttribute("aria-label", "Remover " + t.nome);
        var armed = false, timer;
        del.addEventListener("click", function () {      // 2º clique confirma, como no Excluir do arsenal
          if (!armed) {
            armed = true; del.textContent = "Confirmar remoção";
            timer = setTimeout(function () { armed = false; del.textContent = "Remover"; }, 4000);
            return;
          }
          clearTimeout(timer);
          var cur = S.get(), patch = { transformacoes: (cur.transformacoes || []).filter(function (e) { return e.id !== t.eid; }) };
          if (on) patch.transformacaoAtiva = "";
          delete opened[t.id];
          S.save(patch);
        });
        if (!S.isView || !S.isView()) actions.appendChild(del);
        dl.appendChild(actions);
        li.appendChild(dl);
      }
      list.appendChild(li);
    });
  }

  /* ---------- Aprender transformação ---------- */
  $("tf-learn").addEventListener("click", function () {
    var c = S.get();
    var avail = T.disponiveis(c);
    var wip = T.wip(c);
    DBOChoose.open({
      title: "Aprender transformação",
      left: {
        title: "Aprender transformação já existente",
        empty: wip ? "W.I.P: sua raça ainda não tem transformações cadastradas." : "Você já aprendeu todas as transformações da sua raça.",
        items: avail.map(function (t) {
          return { nome: t.nome + (t.divina ? " · divina" : ""), sub: (t.bloqueio ? "Bloqueada: " + t.bloqueio + " · " : "") + linha(t), detalhes: bonusTexto(t), onPick: function () {
            if (t.bloqueio) return "Habilidade bloqueada. " + t.bloqueio + ".";
            var cur = S.get();
            var entry = { id: DBOCharacters.newId("f"), nome: t.nome.slice(0, 60), descricao: "", requisito: "", mult: t.pl, kp: Math.round(t.kpPct), catalogoId: t.id, bonusTeste: t.teste, bonusDano: t.dano, usos: 0 };
            S.save({ transformacoes: (cur.transformacoes || []).concat([entry]) });
            return "";
          } };
        })
      },
      right: { title: "Criar própria transformação", text: "Em breve. Por enquanto, só dá pra aprender as que já existem.", label: "Criar", disabled: true, onClick: function () {} }
    });
  });

  S.subscribe(render);
})();
