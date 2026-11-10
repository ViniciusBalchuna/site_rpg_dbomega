// Dragon Ball Omega — ficha do personagem: coluna direita (dano, equipamentos e técnicas)
(function () {
  var D = DBOData, UI = DBOUI, R = DBORules, S = DBOSheet, el = UI.el;
  var $ = function (id) { return document.getElementById(id); };

  var rolls = {};   // resultados das rolagens (só em memória), por chave da técnica ou habilidade
  var opened = {};  // técnicas e habilidades com os detalhes abertos
  var A = DBOAbility;

  function refresh() { renderItems(S.get()); renderTechs(S.get()); }

  // Botão "Usar": gasta o KP e soma 1 uso. Os mesmos em Equipamentos/Técnicas e na lista "Habilidades com dano" (Navegação).
  // HP depois de gastar HP no lugar de KP ("Gastar HP, ao invés de KP"). Sem gasto, mantém o HP como está.
  function hpDepois(cur, hp) {
    var atual = cur.hpAtual == null || cur.hpAtual === "" ? R.hpMax(cur) : Number(cur.hpAtual) || 0;
    return hp ? Math.max(1, atual - hp) : cur.hpAtual;
  }
  function useTech(t) {
    return function (custo, hp) {
      var cur = S.get();
      S.save({ kpAtual: Math.max(0, (Number(cur.kpAtual) || 0) - (custo || 0)), hpAtual: hpDepois(cur, hp), tecnicas: cur.tecnicas.map(function (x) {
        return x.id === t.id ? Object.assign({}, x, { usos: (Number(x.usos) || 0) + A.usosPorUso(cur) }) : x;
      }) });
    };
  }
  function useItem(it) {
    return function (custo, hp) {
      var cur = S.get();
      S.save({ kpAtual: Math.max(0, (Number(cur.kpAtual) || 0) - (custo || 0)), hpAtual: hpDepois(cur, hp), equipamentos: cur.equipamentos.map(function (x) {
        if (x.id !== it.id || !x.habilidade || typeof x.habilidade !== "object") return x;
        var h = Object.assign({}, x.habilidade); h.usos = (Number(h.usos) || 0) + A.usosPorUso(cur);
        return Object.assign({}, x, { habilidade: h });
      }) });
    };
  }

  // Contexto repassado ao componente de habilidade; onUse soma 1 uso (botão "Usar").
  function ctxFor(onUse) {
    return { rolls: rolls, opened: opened, get: S.get, refresh: refresh, onUse: onUse, onKp: spendKp };
  }
  // Gasta KP sem contar uso (ativações).
  function spendKp(custo) { var cur = S.get(); S.save({ kpAtual: Math.max(0, (Number(cur.kpAtual) || 0) - (custo || 0)) }); }


  function badge(node, label, value, full) {
    node.textContent = "";
    node.classList.toggle("badge--full", !!full);
    node.appendChild(el("span", "", label));
    node.appendChild(el("b", "", value));
  }


  // Botões Excluir (vermelho) e Editar (verde). Excluir pede uma segunda confirmação.
  // Botão de duas etapas: o primeiro clique arma ("Tem certeza?"), o segundo executa. Desarma sozinho em 4 s.
  function twoClick(btn, label, armedLabel, onConfirm) {
    var armed = false, timer;
    btn.addEventListener("click", function () {
      if (!armed) {
        armed = true;
        btn.textContent = armedLabel;
        btn.classList.add("is-armed");
        timer = setTimeout(function () { armed = false; btn.textContent = label; btn.classList.remove("is-armed"); }, 4000);
        return;
      }
      clearTimeout(timer);
      onConfirm();
    });
    return btn;
  }
  function actionsRow(what, onEdit, onDelete, noDelete, verb) {
    verb = verb || "Excluir";
    var row = el("div", "actions");
    var del = el("button", "act act--del", verb);
    del.type = "button";
    del.setAttribute("aria-label", verb + " " + what);
    twoClick(del, verb, "Têm certeza? Clique novamente", onDelete);
    var edit = el("button", "act act--edit", "Editar");
    edit.type = "button";
    edit.setAttribute("aria-label", "Editar " + what);
    edit.addEventListener("click", onEdit);
    if (!noDelete) row.appendChild(del);
    row.appendChild(edit);
    return row;
  }


  /* ---------- Equipamentos ---------- */
  var eqAberto = {};   // equipamentos com a descrição aberta
  function renderItems(c) {
    var list = $("item-list");
    list.textContent = "";
    $("item-empty").hidden = c.equipamentos.length > 0;
    var max = R.limiteInventario(c);
    badge($("inv-badge"), "Inventário", c.equipamentos.length + "/" + lim(max), c.equipamentos.length >= max);

    c.equipamentos.forEach(function (it) {
      var li = el("li", "item");
      var ability = it.habilidade && typeof it.habilidade === "object" ? it.habilidade : null;
      var key = "item-" + it.id;

      var aberto = !!eqAberto[it.id];
      var head = el("div", "item__head");
      var h3 = el("h3", "item__name"), tog = el("button", "item__toggle", it.nome);
      tog.type = "button"; tog.setAttribute("aria-expanded", aberto ? "true" : "false");
      tog.title = aberto ? "Fechar a descrição" : "Abrir a descrição";
      tog.addEventListener("click", function () { eqAberto[it.id] = !eqAberto[it.id]; renderItems(S.get()); });
      h3.appendChild(tog); head.appendChild(h3);
      if (ability) head.appendChild(el("span", "tag", ability.nome));
      else if (it.habilidade) head.appendChild(el("span", "tag", it.habilidade)); // fichas antigas: só o nome
      li.appendChild(head);
      if (aberto && it.descricao) li.appendChild(el("p", "item__desc", it.descricao));
      if (aberto && it.efeito) { // campo antigo, que não existe mais no formulário
        var eff = el("p", "item__effect");
        eff.appendChild(el("b", "", "Efeito: "));
        eff.appendChild(document.createTextNode(it.efeito));
        li.appendChild(eff);
      }
      if (ability) {
        li.appendChild(el("p", "item__ability-title", "Habilidade do equipamento"));
        li.appendChild(A.node(ability, key, "div", false, c, ctxFor(useItem(it))));
      }
      // Editar e Remover só aparecem com a descrição aberta (e somem enquanto uma rolagem da habilidade estiver aberta).
      if (aberto && !(ability && rolls[key])) {
        li.appendChild(actionsRow(it.nome, function () { openItemForm(it); }, function () {
          delete rolls[key]; delete opened[key]; delete eqAberto[it.id];
          var cur = S.get(), patch = { equipamentos: cur.equipamentos.filter(function (x) { return x.id !== it.id; }) };
          // Se o TP da habilidade foi gasto ("Gastar TP?" marcado), ele volta ao remover o equipamento.
          var pago = ability && ability.gastouTp ? Number(ability.tp) || 0 : 0;
          if (pago > 0) { patch.tpAtuais = (Number(cur.tpAtuais) || 0) + pago; patch.tpGastos = Math.max(0, (Number(cur.tpGastos) || 0) - pago); }
          S.save(patch);
        }, false, "Remover"));
      }
      list.appendChild(li);
    });
  }

  /* ---------- Habilidades com dano (aba Golpes do modo Navegação) ---------- */
  // Mostra de novo, num só lugar, as técnicas e habilidades de equipamento que causam dano. Usa as mesmas rolagens e o mesmo "opened".
  function renderGolpes(c) {
    var list = $("nav-golpes-list"), empty = $("nav-golpes-empty");
    if (!list) return;
    list.textContent = "";
    var any = false;
    c.tecnicas.forEach(function (t) {
      if (t.guardada || !A.temDano(t)) return;
      any = true;
      list.appendChild(A.node(t, t.id, "li", true, c, ctxFor(useTech(t))));
    });
    c.equipamentos.forEach(function (it) {
      var ab = it.habilidade && typeof it.habilidade === "object" ? it.habilidade : null;
      if (!ab || !A.temDano(ab)) return;
      any = true;
      list.appendChild(A.node(ab, "item-" + it.id, "li", false, c, ctxFor(useItem(it))));
    });
    empty.hidden = any;
  }

  /* ---------- Técnicas ---------- */
  function renderTechs(c) {
    var list = $("tech-list");
    list.textContent = "";
    badge($("rd-badge"), "RD de técnica", String(R.rdTecnica(c)), false);
    var lim = R.limiteTecnicas(c), qtd = R.contaTecnicas(c);
    badge($("tech-limit"), "Aprendidas", qtd + "/" + limTxt(lim), qtd > lim);
    var inv = c.tecnicas.filter(function (t) { return t.guardada; }).length;
    $("tech-inv-count").textContent = inv ? String(inv) : "";
    if (invDlg && invDlg.open) renderInventory(c);

    // Duas janelas: as habilidades de classe (inventário próprio, com espaços) e as técnicas aprendidas.
    c.tecnicas.forEach(function (t) { if (!t.guardada) list.appendChild(techNode(t, c)); });
    renderClasse(c);
    renderGolpes(c);
  }
  // Janela "Técnicas de Classe": habilidades de classe (não custam TP, não vão pro inventário de técnicas).
  function renderClasse(c) {
    var listClass = $("tech-class-list");
    listClass.textContent = "";
    var usados = R.contaClasse(c), lim = R.limiteClasse(c);
    // Rugir do Dragão: técnica de classe especial, automática no nível 20, sempre em cima de todas e dourada.
    var pd = R.gastoDragao(c);
    if (pd) {
      var ctxPd = ctxFor(null);
      if (!SHEET_VIEW()) ctxPd.onPd = function (n) { var cur = S.get(); S.save({ pdAtual: Math.max(0, R.pdAtual(cur) - n) }); UI.toast("Rugir do Dragão usado: −" + n + " PD."); };
      listClass.appendChild(A.node(A.daClasse(pd, c), pd.id, "li", false, c, ctxPd));
    }
    R.agrupadas(c).forEach(function (g) {
      var a = g.def.generica ? A.daGenerica(g.def, g.copias, c) : g.def.exclusiva ? A.daExclusiva(g.def, g.copias, c) : A.daClasse(g.def, c);
      var cn = A.node(a, g.def.id, "li", false, c, ctxFor(g.def.cura ? function (custo) { spendKp(custo); } : null));
      if (!SHEET_VIEW() && opened[g.def.id] && !rolls[g.def.id]) {
        var rmc = el("button", "act act--del class-remove", "Remover");
        rmc.type = "button";
        rmc.setAttribute("aria-label", "Remover " + g.def.nome);
        twoClick(rmc, "Remover", "Têm certeza? Clique novamente", function () { removerClasse(g.def.id); });
        var rrow = el("div", "actions"); rrow.appendChild(rmc); cn.appendChild(rrow);
      }
      listClass.appendChild(cn);
    });
    badge($("tech-class-count"), "Espaços", usados + "/" + limTxt(lim), usados >= lim);
    renderRaca(c);
    $("tech-class-add").hidden = SHEET_VIEW();
    renderPendente(c);
  }
  // Limite para mostrar: NPC não tem limite (∞).
  function limTxt(n) { return isFinite(n) ? String(n) : "∞"; }
  function lim(n) { return limTxt(n); }
  // Tira UMA cópia da habilidade de classe (a última pega), liberando o espaço.
  function removerClasse(id) {
    var lista = (S.get().habilidadesClasse || []).slice(), i = lista.lastIndexOf(id);
    if (i < 0) return;
    lista.splice(i, 1);
    delete rolls[id]; delete opened[id];
    S.save({ habilidadesClasse: lista });
    UI.toast("Habilidade de classe removida.");
  }
  // Habilidades de raça: abaixo de uma linha pontilhada, não ocupam espaço. O título recolhe e abre.
  function renderRaca(c) {
    var sec = $("race-section"), list = $("race-list");
    list.textContent = "";
    var todas = R.habilidadesRaciais(c);
    sec.hidden = !todas.length;
    todas.forEach(function (def) {
      var ctx = ctxFor(null);
      if (!SHEET_VIEW()) ctx.onCortar = function (id) { S.save({ raciaisPerdidas: (S.get().raciaisPerdidas || []).concat([id]) }); };
      list.appendChild(A.node(A.daRaca(def, c), "raca-" + def.id, "li", false, c, ctx));
    });
  }
  (function raceFold() {
    var KEY = "dbo-race-fold", btn = $("race-fold"), body = $("race-list");
    function apply(open) { btn.setAttribute("aria-expanded", String(open)); body.hidden = !open; }
    var open = true;
    try { open = localStorage.getItem(KEY) !== "0"; } catch (e) {}
    apply(open);
    btn.addEventListener("click", function () {
      open = btn.getAttribute("aria-expanded") !== "true";
      apply(open);
      try { localStorage.setItem(KEY, open ? "1" : "0"); } catch (e) {}
    });
  })();
  function SHEET_VIEW() { return S.isView && S.isView(); }
  // Aviso do bônus "no próximo teste" (ativações), com botão para cancelar.
  function renderPendente(c) {
    var box = $("tech-pending"), p = A.pendente(c);
    box.textContent = "";
    box.hidden = !p;
    if (!p) return;
    var name = D.ATTRIBUTES.filter(function (a) { return a[0] === p.atributo; })[0][1];
    box.appendChild(el("span", "", p.fonte + ": " + name + " + " + p.valor + " no próximo teste de " + name));
    var x = el("button", "rollclose", "×");
    x.type = "button";
    x.setAttribute("aria-label", "Cancelar o bônus pendente");
    x.addEventListener("click", function () { A.cancelarPendente(S.get()); });
    box.appendChild(x);
  }
  document.addEventListener("dbo-pendente", function () { if (S.get()) renderPendente(S.get()); });
  // "+" das técnicas de classe: janela com busca e filtro (js/escolha-classe.js). Sem custo de TP, ocupa 1 espaço.
  // NPC: qualquer habilidade de classe, de qualquer classe e sub-classe, sem trava e sem limite de espaços.
  $("tech-class-add").addEventListener("click", function () {
    var npc = !!S.get().npc;
    DBOClassPicker.open(S.get(), function (id) {
      var now = S.get();
      if (R.contaClasse(now) >= R.limiteClasse(now)) return "Seus espaços de técnicas de classe estão cheios (" + R.limiteClasse(now) + "). Eles aumentam a cada 15 níveis.";
      S.save({ habilidadesClasse: (now.habilidadesClasse || []).concat([id]) });
      return "";
    }, npc ? { semTrava: true, todas: true } : undefined);
  });
  function techNode(t, c) {
    var node = A.node(t, t.id, "li", true, c, ctxFor(useTech(t)));
    // Clicar na técnica mostra os botões, que somem enquanto a rolagem estiver aberta.
    if (opened[t.id] && !rolls[t.id]) {
      // O Soco (técnica fixa) não sai; as outras podem ser guardadas no inventário ou removidas de vez.
      var row = actionsRow(t.nome, function () { openTechForm(t); }, function () { removerTecnica(t); }, A.fixa(t) || t.nome === "Soco", "Remover");
      if (!A.fixa(t)) {
        var keep = el("button", "act act--keep", "Guardar no inventário");
        keep.type = "button";
        keep.addEventListener("click", function () { delete rolls[t.id]; delete opened[t.id]; setGuardada(t.id, true); });
        row.insertBefore(keep, row.firstChild);
      }
      node.appendChild(row);
    }
    return node;
  }

  // Recolher/abrir as janelas de técnicas: clique no nome. O estado fica guardado neste navegador.
  (function folds() {
    var KEY = "dbo-tech-fold", state = {};
    try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    document.querySelectorAll("[data-fold]").forEach(function (btn) {
      var id = btn.getAttribute("data-fold"), body = $(id);
      function apply(open) { btn.setAttribute("aria-expanded", String(open)); body.hidden = !open; btn.closest(".panel").classList.toggle("is-folded", !open); }
      apply(state[id] !== false);
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") !== "true";
        apply(open);
        state[id] = open; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      });
    });
  })();

  /* ---------- Inventário de técnicas ---------- */
  // Técnicas já aprendidas que ficam fora da lista (não contam no limite). O Soco nunca vai pra cá.
  var invDlg = $("tech-inv-dialog");
  function removerTecnica(t) {
    delete rolls[t.id]; delete opened[t.id];
    var cur = S.get(), volta = Math.max(0, Math.min(Number(t.tp) || 0, Number(cur.tpGastos) || 0));
    var patch = { tecnicas: cur.tecnicas.filter(function (x) { return x.id !== t.id; }) };
    if (volta > 0) { patch.tpAtuais = (Number(cur.tpAtuais) || 0) + volta; patch.tpGastos = (Number(cur.tpGastos) || 0) - volta; }
    S.save(patch);
    UI.toast("Técnica removida: " + t.nome + (volta ? ". " + UI.fmt(volta) + " TP devolvidos." : "."));
  }
  function setGuardada(id, value) {
    S.save({ tecnicas: S.get().tecnicas.map(function (x) {
      return x.id === id && x.nome !== "Soco" ? Object.assign({}, x, { guardada: value }) : x;
    }) });
  }
  var invAberta = {};   // técnicas do inventário com a descrição aberta
  function renderInventory(c) {
    var ul = $("tech-inv-list"), empty = $("tech-inv-empty");
    ul.textContent = "";
    var items = c.tecnicas.filter(function (t) { return t.guardada; });
    empty.hidden = items.length > 0;
    $("tech-inv-lead").textContent = "Aprendidas: " + R.contaTecnicas(c) + " de " + limTxt(R.limiteTecnicas(c)) + " (o Soco não conta).";
    fillInvSelect(c);
    items.forEach(function (t) {
      var li = el("li", "inv-tech");
      var info = el("div", "inv-tech__info");
      info.appendChild(el("strong", "", t.nome));
      info.appendChild(el("small", "", A.damageText(t) + " · " + A.tipoRotulo(t) + " · Maestria " + A.maestria(t, c)));
      var aberta = !!invAberta[t.id];
      if (aberta && t.descricao) info.appendChild(el("span", "inv-tech__desc", t.descricao));
      // Clicar na técnica abre a descrição; só então aparece o "Remover".
      info.setAttribute("role", "button"); info.tabIndex = 0; info.setAttribute("aria-expanded", String(aberta));
      info.style.cursor = "pointer";
      function alterna() { invAberta[t.id] = !invAberta[t.id]; renderInventory(S.get()); }
      info.addEventListener("click", alterna);
      info.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alterna(); } });
      li.appendChild(info);
      var acts = el("div", "inv-tech__acts");
      var take = el("button", "btn", "Colocar na lista");
      take.type = "button";
      take.addEventListener("click", function () {
        var now = S.get();
        if (R.contaTecnicas(now) < R.limiteTecnicas(now)) { setGuardada(t.id, false); return; }
        pickToStore("A lista está cheia (" + R.limiteTecnicas(now) + "). Qual técnica vai pro inventário no lugar de " + t.nome + "?", function (outId) {
          S.save({ tecnicas: S.get().tecnicas.map(function (x) {
            if (x.id === outId) return Object.assign({}, x, { guardada: true });
            if (x.id === t.id) return Object.assign({}, x, { guardada: false });
            return x;
          }) });
        });
      });
      acts.appendChild(take);
      if (aberta && t.nome !== "Soco" && !SHEET_VIEW()) {
        var rm = el("button", "act act--del", "Remover");
        rm.type = "button";
        rm.setAttribute("aria-label", "Remover " + t.nome);
        twoClick(rm, "Remover", "Têm certeza? Clique novamente", function () { removerTecnica(t); });
        acts.appendChild(rm);
      }
      li.appendChild(acts);
      ul.appendChild(li);
    });
  }
  // Seletor: técnicas já aprendidas que estão na lista (menos o Soco). Adicionar = mover pro inventário.
  var invSel = $("tech-inv-select");
  function invCandidates(c) {
    return c.tecnicas.filter(function (t) { return !t.guardada && t.nome !== "Soco"; });
  }
  function fillInvSelect(c) {
    var keep = invSel.value, list = invCandidates(c);
    invSel.textContent = "";
    invSel.appendChild(new Option(list.length ? "Escolha uma técnica…" : "Nenhuma técnica na lista", ""));
    list.forEach(function (t) { invSel.appendChild(new Option(t.nome, t.id)); });
    if (keep && list.some(function (t) { return t.id === keep; })) invSel.value = keep;
    invSel.disabled = !list.length; $("tech-inv-add-btn").disabled = !list.length;
    showInvInfo();
  }
  function showInvInfo() {
    var t = invCandidates(S.get()).filter(function (x) { return x.id === invSel.value; })[0];
    $("tech-inv-info").textContent = t ? A.damageText(t) + " · " + A.tipoRotulo(t) + (t.descricao ? " — " + t.descricao : "") : "";
  }
  invSel.addEventListener("change", showInvInfo);
  $("tech-inv-add-btn").addEventListener("click", function () {
    var msg = $("tech-inv-msg");
    var t = invCandidates(S.get()).filter(function (x) { return x.id === invSel.value; })[0];
    if (!t) { showError(msg, "Escolha uma técnica no seletor."); return; }
    msg.textContent = "";
    invSel.value = "";
    delete rolls[t.id]; delete opened[t.id];
    setGuardada(t.id, true);
  });
  $("tech-inv-btn").addEventListener("click", function () { renderInventory(S.get()); invDlg.showModal(); });

  // Janela "escolha uma técnica da lista": usada para trocar quando o limite estourou.
  var pickDlg = $("tech-pick-dialog"), pickCb = null;
  function pickToStore(lead, cb, onCancel) {
    var now = S.get();
    $("tech-pick-lead").textContent = lead;
    var ul = $("tech-pick-list"); ul.textContent = "";
    now.tecnicas.filter(function (t) { return !t.guardada && t.nome !== "Soco"; }).forEach(function (t) {
      var li = el("li");
      var b = el("button", "choose__pick"); b.type = "button";
      b.appendChild(el("strong", "", t.nome));
      b.appendChild(el("small", "", A.damageText(t) + " · Maestria " + A.maestria(t, now)));
      b.addEventListener("click", function () { pickCb = null; pickDlg.close(); cb(t.id); });
      li.appendChild(b); ul.appendChild(li);
    });
    pickCb = onCancel || function () {};
    pickDlg.showModal();
  }
  pickDlg.addEventListener("close", function () { if (pickCb) { var f = pickCb; pickCb = null; f(); } });
  $("tech-pick-cancel").addEventListener("click", function () { pickDlg.close(); });

  // Técnica nova com a lista cheia: "Quer guardar essa técnica no seu inventário?"
  var keepDlg = $("tech-keep-dialog"), keepCb = null;
  function askKeep(tech, done) {
    $("tech-keep-name").textContent = tech.nome;
    keepCb = done;
    keepDlg.showModal();
  }
  function keepAnswer(answer) { var f = keepCb; keepCb = null; keepDlg.close(); if (f) f(answer); }
  $("tech-keep-yes").addEventListener("click", function () { keepAnswer("sim"); });
  $("tech-keep-no").addEventListener("click", function () { keepAnswer("nao"); });
  $("tech-keep-cancel").addEventListener("click", function () { keepAnswer("cancel"); });
  keepDlg.addEventListener("cancel", function (e) { e.preventDefault(); keepAnswer("cancel"); });

  // Se Mente cair e o limite ficar abaixo de 2, Ki blast e Ki wave vão para o inventário (só elas).
  var BASICAS = ["Ki blast", "Ki wave"];
  function autoStoreBasics(c) {
    if (R.limiteTecnicas(c) >= 2) return;
    var need = c.tecnicas.some(function (t) { return !t.guardada && BASICAS.indexOf(t.nome) >= 0; });
    if (!need) return;
    S.save({ tecnicas: c.tecnicas.map(function (t) {
      return BASICAS.indexOf(t.nome) >= 0 && !t.guardada ? Object.assign({}, t, { guardada: true }) : t;
    }) });
  }

  /* ---------- Formulário de habilidade (usado em técnicas e em equipamentos) ----------
     Três tópicos: Identidade, Efeito de dano e Efeitos.
     (o Power Level vem dos TPs gastos para aprender a técnica, então não há campo de PL aqui). */
  var formCount = 0;

  var FXD = window.DBOEfeitos;
  function abilityForm(root, opts) {
    var uid = "af" + (++formCount);
    root.textContent = "";

    function field(labelText, control, name) {
      var wrap = el("div", "field");
      var label = el("label", "", labelText);
      control.id = uid + "-" + name;
      label.htmlFor = control.id;
      wrap.appendChild(label);
      wrap.appendChild(control);
      return wrap;
    }
    function input(type, props) {
      var node = el("input");
      node.type = type;
      for (var k in props) node[k] = props[k];
      return node;
    }
    function select(options) {
      var node = el("select");
      options.forEach(function (o) { node.appendChild(new Option(o[1], o[0])); });
      return node;
    }
    function topic(title) {
      var set = el("fieldset", "topic");
      set.appendChild(el("legend", "", title));
      root.appendChild(set);
      return set;
    }

    // Identidade
    var nome = input("text", { maxLength: 60, autocomplete: "off" });
    var desc = el("textarea");
    desc.rows = 3;
    desc.maxLength = 500;
    // Modificador: campo principal da habilidade. Entra no teste, no dano (se tiver) e na RD (8 + modificador + nível ÷ 10).
    var mod = select([["", "Sem modificador"]].concat(D.ATTRIBUTES.map(function (a) { return [a[0], a[1]]; })));
    var identity = topic("Identidade");
    identity.appendChild(field(opts.nameLabel || "Nome", nome, "nome"));
    identity.appendChild(field("Descrição", desc, "desc"));
    identity.appendChild(field("Modificador", mod, "mod"));
    identity.appendChild(el("p", "hint", "Entra no teste e na RD da habilidade (8 + modificador + nível ÷ 10), e soma no dano, se ela tiver."));

    /* ---- Efeito de dano (opcional): começa fechado e resumido; o botão abre os campos ---- */
    var hasDamage = false;
    var qtd = input("number", { min: 1, max: 50, step: 1, value: 1 });
    var dado = select(D.DICE.map(function (d) { return [d, d]; }));
    var fixo = input("number", { step: 1, value: 0 });
    var tipo = select([["ki", "Ki"], ["fisico", "Físico"]]);
    var damage = topic("Efeito de dano");
    var dmgSummary = el("p", "hint", "Esta habilidade ainda não causa dano.");
    var dmgAdd = el("button", "btn btn--ghost effect-add", "+ Adicionar efeito de dano");
    dmgAdd.type = "button";
    var dmgBody = el("div", "dmg-body");
    // Bloco de custo, sempre visível acima do botão de confirmar (fora do efeito de dano): TP para aprender e KP ao usar.
    var costBox = el("div", "cost-box");
    var costNote = el("p", "cost-note");      // TP para aprender (R.custoTecnica); só quando a habilidade cobra TP
    var kpNote = el("p", "cost-note cost-note--kp");   // KP (ou HP) ao usar
    var limitNote = el("p", "cost-note");
    costBox.appendChild(costNote); costBox.appendChild(kpNote); costBox.appendChild(limitNote);
    (opts.costHost || root).appendChild(costBox);
    function wantCost() { return typeof opts.showCost === "function" ? !!opts.showCost() : !!opts.showCost; }
    costNote.hidden = !wantCost();
    var row = el("div", "dmg-row");
    row.appendChild(field("Dados", qtd, "qtd"));
    row.appendChild(field("Tipo de dado", dado, "dado"));
    row.appendChild(field("Incremento fixo", fixo, "fixo"));   // ocupa o lugar do modificador, que agora é da habilidade
    dmgBody.appendChild(row);
    dmgBody.appendChild(field("Tipo de dano", tipo, "tipo"));
    // Alvo do dano: muda o custo (Conjurador x0, Ser x0,75, Área x1, N seres x(1 + 0,25 por ser)) e limita o alvo dos efeitos.
    var dmgAlvo = select(Object.keys(FXD.ALVOS_DANO).map(function (k) { return [k, FXD.ALVOS_DANO[k]]; }));
    dmgAlvo.value = "ser";
    var dmgN = input("number", { min: 2, max: 10, step: 1, value: 2 });
    dmgBody.appendChild(field("Alvo do dano", dmgAlvo, "danoalvo"));
    var dmgNField = field("Quantos seres (2 a 10)", dmgN, "danon");
    dmgBody.appendChild(dmgNField);
    function syncDmgAlvo() { dmgNField.hidden = dmgAlvo.value !== "n"; }
    dmgAlvo.addEventListener("change", syncDmgAlvo);
    var semKiBox = input("checkbox", {});
    var semKiWrap = el("label", "check");
    semKiWrap.appendChild(semKiBox);
    semKiWrap.appendChild(el("span", "", "Não gasta ki"));
    dmgBody.appendChild(semKiWrap);
    var pontariaBox = input("checkbox", {});
    var pontariaWrap = el("label", "check");
    pontariaWrap.appendChild(pontariaBox);
    pontariaWrap.appendChild(el("span", "", "Aplicar pontaria (o 2x do prato dobra o dado que cair no centro)"));
    dmgBody.appendChild(pontariaWrap);
    var dmgRemove = el("button", "btn btn--ghost effect-add", "Remover efeito de dano");
    dmgRemove.type = "button";
    dmgBody.appendChild(dmgRemove);
    damage.appendChild(dmgSummary);
    damage.appendChild(dmgAdd);
    damage.appendChild(dmgBody);
    function syncSemKi() { semKiWrap.hidden = tipo.value !== "fisico"; if (semKiWrap.hidden) semKiBox.checked = false; }
    tipo.addEventListener("change", syncSemKi);

    // Dados adicionais: só aparecem depois que existe um efeito de dano. Cada linha é um dado extra, sempre ativo ou só em certa situação
    var extrasBox = el("div", "extras");
    var extraAdd = el("button", "btn btn--ghost effect-add", "+ Adicionar dado");
    extraAdd.type = "button";
    var extrasTopic = topic("Dados adicionais");
    extrasTopic.appendChild(extrasBox);
    extrasTopic.appendChild(extraAdd);

    function setDamage(on) {
      hasDamage = !!on;
      dmgSummary.hidden = hasDamage; dmgAdd.hidden = hasDamage; dmgBody.hidden = !hasDamage;
      extrasTopic.hidden = !hasDamage;
      syncSemKi(); showCost();
    }
    dmgAdd.addEventListener("click", function () { setDamage(true); qtd.focus(); });
    dmgRemove.addEventListener("click", function () { qtd.value = 1; dado.selectedIndex = 0; fixo.value = 0; tipo.selectedIndex = 0; semKiBox.checked = false; pontariaBox.checked = false; extrasBox.textContent = ""; setDamage(false); });

    function addExtraLine(e) {
      e = e || {};
      var line = el("div", "extra");
      var q = input("number", { min: 1, max: 50, step: 1, value: e.qtd || 1 });
      q.setAttribute("aria-label", "Quantidade de dados");
      var d = select(D.DICE.map(function (x) { return [x, x]; }));
      d.setAttribute("aria-label", "Tipo de dado");
      if (e.dado) d.value = e.dado;
      var when = select([["sempre", "Sempre"], ["situacional", "Situacional"]]);
      when.setAttribute("aria-label", "Quando vale");
      if (e.quando) when.value = e.quando;
      var cond = input("text", { maxLength: 80, placeholder: "Condição (ex.: contra voadores)", value: e.condicao || "" });
      cond.setAttribute("aria-label", "Condição");
      cond.hidden = when.value !== "situacional";
      when.addEventListener("change", function () { cond.hidden = when.value !== "situacional"; });
      var remove = el("button", "round", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remover dado adicional");
      remove.addEventListener("click", function () { line.remove(); showCost(); });
      [q, d, when, remove, cond].forEach(function (n) { line.appendChild(n); });
      extrasBox.appendChild(line);
      return q;
    }
    extraAdd.addEventListener("click", function () { addExtraLine().focus(); });

    /* ---- Lista de efeitos: cada clique em + cria um select, mas só se o último já tiver sido escolhido ---- */
    // params (opcional): { "Nome do efeito": [opções] } para efeitos que pedem mais uma escolha (guardado como "Nome: escolha").
    function effectList(title, names, addLabel, emptyText, what, params) {
      params = params || {};
      var box = el("div", "effects");
      var addBtn = el("button", "btn btn--ghost effect-add", addLabel);
      addBtn.type = "button";
      var topicNode = topic(title);
      if (!names.length) { topicNode.appendChild(el("p", "hint", emptyText)); addBtn.disabled = true; }
      topicNode.appendChild(box);
      topicNode.appendChild(addBtn);
      function mains() { return box.querySelectorAll(".effect > select:first-child"); }
      function addLine(value) {
        var line = el("div", "effect");
        var want = FXD.ler(value || "");   // alvo, N e duração que vieram guardados (ou vazio)
        var base = String(value || "").split(" | ")[0];
        var sel = base ? base.split(": ")[0] : "", sub = base && base.indexOf(": ") > 0 ? base.slice(base.indexOf(": ") + 2) : "";
        var choose = select([["", "Escolha um efeito"]].concat(names.map(function (e) { return [e, e]; })));
        choose.setAttribute("aria-label", "Efeito de " + what + " " + (mains().length + 1));
        if (sel) {
          if (!choose.querySelector('option[value="' + sel + '"]')) choose.appendChild(new Option(sel, sel)); // efeito antigo, fora da lista
          choose.value = sel;
        }
        // Segundo campo, só nos efeitos que pedem uma escolha (a penalidade da imunidade, o atributo a aprimorar)
        var extra = select([["", "Escolha..."]]);
        extra.className = "effect__param";
        extra.setAttribute("aria-label", "Detalhe do efeito");
        function syncExtra() {
          var opts = params[choose.value];
          extra.hidden = !opts;
          if (!opts) return;
          var keep = extra.value;
          extra.textContent = "";
          extra.appendChild(new Option(choose.value === "Imunidade a penalidade" ? "Qual penalidade?" : choose.value === "Vulnerabilidade" ? "Físico ou ki?" : "Qual atributo?", ""));
          opts.forEach(function (o) { extra.appendChild(new Option(o, o)); });
          extra.value = keep;
        }
        // Alvo, quantos seres e duração do efeito (as opções mudam conforme o efeito e o dano da técnica).
        var alvoSel = el("select", "effect__alvo"); alvoSel.setAttribute("aria-label", "Alvo do efeito");
        var nIn = input("number", { min: 2, max: 10, step: 1, value: want.n || 2 }); nIn.className = "effect__n"; nIn.setAttribute("aria-label", "Quantos seres (2 a 10)");
        var durSel = select(FXD.DURACOES.map(function (d) { return [d.id, d.nome + " · " + d.texto]; })); durSel.className = "effect__dur"; durSel.setAttribute("aria-label", "Duração do efeito");
        var iniciado = false, travado = false;
        line._sync = function (tech) {
          var def = FXD.POR_NOME[choose.value];
          alvoSel.hidden = nIn.hidden = durSel.hidden = !def;
          if (!def) return;
          var validos = FXD.alvosPermitidos(tech, def), key = validos.join(",");
          var atual = iniciado ? alvoSel.value : (want.alvo || FXD.padraoAlvo(def));
          if (alvoSel.dataset.k !== key) { alvoSel.textContent = ""; validos.forEach(function (k) { alvoSel.appendChild(new Option(FXD.ALVOS[k], k)); }); alvoSel.dataset.k = key; }
          alvoSel.value = validos.indexOf(atual) >= 0 ? atual : validos.indexOf(FXD.padraoAlvo(def)) >= 0 ? FXD.padraoAlvo(def) : validos[0];
          alvoSel.disabled = validos.length < 2;
          var maxN = tech.danoAlvo === "n" && tech.temDano !== false ? FXD.clampN(tech.danoN) : 10;
          nIn.hidden = alvoSel.value !== "n"; nIn.max = maxN;
          if (!nIn.hidden) nIn.value = FXD.clampN(nIn.value, maxN);
          var forcada = def.instantaneo || def.id === "purificacao" ? "inst" : def.id === "aprimorar" ? "curta" : FXD.modoFisico(tech) && def.fisico ? "med" : "";
          if (forcada) { durSel.value = forcada; durSel.disabled = true; travado = true; }
          else { if (!iniciado) durSel.value = want.dur || "curta"; else if (travado) durSel.value = "curta"; durSel.disabled = false; travado = false; }
          if (def.id === "aprimorar") durSel.hidden = true;
          iniciado = true;
        };
        choose.addEventListener("change", function () { extra.value = ""; syncExtra(); iniciado = false; want = {}; });
        var remove = el("button", "round", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", "Remover efeito de " + what);
        remove.addEventListener("click", function () { line.remove(); });
        line.appendChild(choose);
        line.appendChild(extra);
        line.appendChild(alvoSel);
        line.appendChild(nIn);
        line.appendChild(durSel);
        line.appendChild(remove);
        line._lido = function () { return { alvo: alvoSel.value, n: alvoSel.value === "n" ? Number(nIn.value) || 2 : 0, dur: durSel.value }; };
        box.appendChild(line);
        syncExtra();
        if (sub) { if (!extra.querySelector('option[value="' + sub + '"]')) extra.appendChild(new Option(sub, sub)); extra.value = sub; }
        return choose;
      }
      addBtn.addEventListener("click", function () {
        var selects = mains();
        var last = selects[selects.length - 1];
        if (last && (!last.value || (params[last.value] && !last.parentNode.querySelector(".effect__param").value))) {
          UI.toast("Pra adicionar mais um efeito, termine de escolher o anterior primeiro.");
          return;
        }
        addLine("").focus();
      });
      function lines() { return Array.prototype.slice.call(box.querySelectorAll(".effect")); }
      return {
        node: topicNode,
        clear: function () { box.textContent = ""; },
        sync: function (tech) { lines().forEach(function (l) { if (l._sync) l._sync(tech); }); },
        fill: function (list) { (list || []).forEach(function (v) { addLine(v); }); },
        // Só os efeitos completos.
        values: function () {
          var out = [];
          lines().forEach(function (line) {
            var v = line.querySelector("select").value, p = line.querySelector(".effect__param").value;
            if (v && (!params[v] || p)) {
              var d = FXD.POR_NOME[v];
              out.push(d && line._lido && line._lido().alvo ? FXD.texto(d, params[v] ? p : "", line._lido()) : params[v] ? v + ": " + p : v);
            }
          });
          return out;
        },
        // Nome do primeiro efeito que ainda pede a escolha extra (ou "").
        incomplete: function () {
          var found = "";
          lines().forEach(function (line) {
            var v = line.querySelector("select").value;
            if (!found && v && params[v] && !line.querySelector(".effect__param").value) found = v;
          });
          return found;
        }
      };
    }
    // Efeitos: catálogo em js/efeitos-data.js (graus I, II e III pela maestria, custo de TP de cada um).
    var FX = window.DBOEfeitos;
    // Efeitos de assinatura de sub-classe (ex.: Marca, do Caçador) não entram nas técnicas feitas pelo jogador.
    var penNames = FX.penalidades().filter(function (e) { return !e.assinatura; }).map(function (e) { return e.nome; }), bufNames = FX.fortalecimentos().filter(function (e) { return !e.assinatura; }).map(function (e) { return e.nome; });
    var penalties = effectList("Efeitos de Penalidade", penNames, "+ Adicionar efeito de penalidade", "", "penalidade", { "Vulnerabilidade": ["Físico", "Ki"] });
    penalties.node.appendChild(el("p", "hint", "O alvo faz um teste de resistência contra a RD da técnica. O grau do efeito sobe com a maestria: maestria 1–2 = Grau I, 3 = Grau II, 4 = Grau III."));
    var buffParams = { "Imunidade a penalidade": penNames, "Aprimorar": D.ATTRIBUTES.map(function (a) { return a[1]; }) };
    var buffs = effectList("Efeitos de Fortalecimento", bufNames, "+ Adicionar efeito de fortalecimento", "", "fortalecimento", buffParams);
    buffs.node.appendChild(el("p", "hint", "Valem pela duração que você escolher ao usar a técnica. \"Aprimorar\" tem botão Ativar (bônus no próximo teste)."));
    // Gastar HP, ao invés de KP: 60% do custo em KP sai do HP.
    var hpBox = input("checkbox", {});
    var hpWrap = el("label", "check");
    hpWrap.appendChild(hpBox);
    hpWrap.appendChild(el("span", "", "Gastar HP, ao invés de KP"));
    var hpTopic = topic("Custo ao usar");
    hpTopic.appendChild(hpWrap);
    hpTopic.appendChild(el("p", "hint", "Marcado: a habilidade gasta HP no lugar de KP, 60% do custo em KP (o HP nunca cai abaixo de 1)."));

    // Dados da técnica como estão no formulário agora (para o custo em TP).
    function currentTech() {
      var extras = [];
      extrasBox.querySelectorAll(".extra").forEach(function (line) {
        var ins = line.querySelectorAll("input"), sel = line.querySelectorAll("select");
        extras.push({ qtd: Number(ins[0].value), dado: sel[0].value });
      });
      var t = base();
      t.qtd = Number(qtd.value); t.dado = dado.value; t.extras = extras;
      t.efeitos = penalties.values(); t.fortalecimentos = buffs.values();
      return t;
    }
    // Parte da técnica que decide os alvos permitidos dos efeitos (não depende da lista de efeitos).
    function base() {
      return { temDano: hasDamage, tipo: tipo.value, danoAlvo: hasDamage ? dmgAlvo.value : "", danoN: hasDamage && dmgAlvo.value === "n" ? FXD.clampN(dmgN.value) : 0, gastaHp: hpBox.checked, usos: 0 };
    }
    // Regra: até 2 efeitos fora de dano (penalidade e/ou fortalecimento); com 100 TP ou mais em dados, só 1.
    function limitError() {
      var t = currentTech(), n = t.efeitos.length + t.fortalecimentos.length, dados = R.custoDadosAlvo(t);
      return FX.limiteOk(dados, n) ? "" : dados >= FX.LIMITE_DADOS ? "Esta técnica gasta " + UI.fmt(dados) + " TP em dados (" + FX.LIMITE_DADOS + " ou mais): ela só pode ter um efeito, de penalidade ou de fortalecimento." : "Uma habilidade só pode ter 2 efeitos fora de dano (penalidade ou fortalecimento, em qualquer combinação).";
    }
    function currentCost() { return R.custoTecnica(currentTech(), S.get()); }
    function showCost() {
      var b0 = base(); penalties.sync(b0); buffs.sync(b0);
      var t = currentTech(), cur = S.get() || {}, cost = R.custoTecnica(t, cur) || 0, fx = FX.custo(t), inc = R.custoIncremento(t.temDano === false ? 0 : t.fixo), desc = R.descontoTp(cur);
      // TP para aprender: só quando a habilidade cobra TP.
      costNote.hidden = !wantCost();
      if (wantCost()) {
        var have = Number(cur.tpAtuais) || 0, dadosTp = R.custoDadosAlvo(t);
        costNote.textContent = cost > R.LIMITE_TP ? "Custo de TP: mais TP do que o sistema comporta (limite " + UI.fmt(R.LIMITE_TP) + "). Reduza os dados."
          : "Custo de TP para aprender: " + UI.fmt(cost) + " TP" + (fx ? " (" + UI.fmt(dadosTp) + " do dano + " + UI.fmt(fx) + " dos efeitos" + (FX.custoEfeitos(t).reduz ? ", com redução de 60%" : "") + ")" : "") +
            (inc ? " · o incremento +" + t.fixo + " custa " + UI.fmt(inc) + " (o próximo ponto custaria " + UI.fmt(R.custoIncremento(t.fixo + 1) - inc) + ")" : "") +
            (desc ? " · já com −" + Math.round(desc * 100) + "% de Técnicas Otimizadas" : "") + " · você tem " + UI.fmt(have) + ".";
        costNote.classList.toggle("is-short", cost > have || cost > R.LIMITE_TP);
      }
      // KP (ou HP) ao usar: dano + efeitos, somados.
      var pt = A.kpPartes(t, cur.nivel ? cur : { nivel: 1 }), hp = t.gastaHp ? Math.ceil(pt.total * 0.6) : 0;
      kpNote.textContent = pt.total ? "Custo ao usar: " + (hp ? UI.fmt(hp) + " HP (no lugar de " + UI.fmt(pt.total) + " KP)" : UI.fmt(pt.total) + " KP") + (pt.efeitos ? " · " + UI.fmt(Math.ceil(pt.efeitos)) + " vêm dos efeitos" : "") + (pt.reduz ? " (com redução de 60%)" : "") + "." : "Custo ao usar: não gasta KP.";
      var le = limitError();
      limitNote.textContent = le; limitNote.hidden = !le; limitNote.classList.toggle("is-short", !!le);
    }
    root.addEventListener("input", showCost);
    root.addEventListener("change", showCost);
    root.addEventListener("click", function () { setTimeout(showCost, 0); });

    function reset() {
      nome.value = ""; desc.value = "";
      qtd.value = 1; dado.selectedIndex = 0; mod.selectedIndex = 0; fixo.value = 0; tipo.selectedIndex = 0;
      penalties.clear(); buffs.clear();
      extrasBox.textContent = "";
      semKiBox.checked = false; pontariaBox.checked = false; hpBox.checked = false;
      var leg = dmgAlvo.querySelector('option[value=""]'); if (leg) leg.remove();
      dmgAlvo.value = "ser"; dmgN.value = 2; syncDmgAlvo();
      setDamage(false);
    }
    reset();

    return {
      reset: reset,
      cost: currentCost,
      tech: currentTech,
      refresh: showCost,
      focus: function () { nome.focus(); },
      // Preenche o formulário com uma técnica ou habilidade existente (para editar).
      fill: function (a) {
        reset();
        nome.value = a.nome || ""; desc.value = a.descricao || "";
        mod.value = a.mod || "";
        if (a.temDano !== false) {
          setDamage(true);
          qtd.value = a.qtd || 1;
          if (a.dado && !dado.querySelector('option[value="' + a.dado + '"]')) dado.appendChild(new Option(a.dado, a.dado)); // ex.: o d3 do Soco
          dado.value = a.dado; fixo.value = a.fixo || 0; tipo.value = a.tipo;
          semKiBox.checked = a.tipo === "fisico" && !!a.semKi; pontariaBox.checked = !!a.pontaria; syncSemKi();
          (a.extras || []).forEach(function (e) { addExtraLine(e); });
          // Técnica antiga (sem alvo do dano) mantém o custo original até o jogador escolher um alvo.
          if (a.danoAlvo) dmgAlvo.value = a.danoAlvo;
          else { dmgAlvo.insertBefore(new Option("Como antes (custo original)", ""), dmgAlvo.firstChild); dmgAlvo.value = ""; }
          if (a.danoN) dmgN.value = a.danoN;
          syncDmgAlvo();
        }
        hpBox.checked = !!a.gastaHp;
        penalties.fill(FX.normalizar(a.efeitos));      // nomes antigos viram os novos; efeitos removidos somem
        buffs.fill(FX.normalizar(a.fortalecimentos));
        showCost();
      },
      // Retorna { value } com a habilidade pronta, ou { error } com o que falta.
      read: function () {
        var n = nome.value.trim();
        if (!n) return { error: "Dê um nome" + (opts.nameLabel ? " à habilidade." : " à técnica.") };
        var faltou = buffs.incomplete();
        if (faltou) return { error: "Em \"" + faltou + "\", escolha " + (faltou === "Imunidade a penalidade" ? "qual penalidade" : "qual atributo") + "." };
        var faltouP = penalties.incomplete();
        if (faltouP) return { error: "Em \"" + faltouP + "\", escolha físico ou ki." };
        var lim = limitError();
        if (lim) return { error: lim };
        var pen = penalties.values(), buf = buffs.values();
        if (!hasDamage && !pen.length && !buf.length) return { error: "A habilidade precisa de pelo menos um efeito: de dano, de penalidade ou de fortalecimento." };
        var out = { nome: n, descricao: desc.value.trim(), mod: mod.value, efeitos: pen, fortalecimentos: buf, temDano: hasDamage, gastaHp: hpBox.checked };
        if (!hasDamage) {      // sem dano: os campos de dano ficam neutros (o banco pede qtd e dado preenchidos)
          return { value: Object.assign(out, { qtd: 1, dado: "d4", fixo: 0, tipo: "ki", semKi: false, pontaria: false, extras: [] }) };
        }
        var q = Number(qtd.value), f = Number(fixo.value || 0);
        if (!Number.isInteger(q) || q < 1 || q > 50) return { error: "A quantidade de dados vai de 1 a 50." };
        if (!Number.isInteger(f)) return { error: "O incremento fixo precisa ser um número inteiro." };
        var extras = [];
        var lines = extrasBox.querySelectorAll(".extra");
        for (var i = 0; i < lines.length; i++) {
          var ins = lines[i].querySelectorAll("input"), sel = lines[i].querySelectorAll("select");
          var eq = Number(ins[0].value);
          if (!Number.isInteger(eq) || eq < 1 || eq > 50) return { error: "Nos dados adicionais, a quantidade vai de 1 a 50." };
          var quando = sel[1].value;
          extras.push({ qtd: eq, dado: sel[0].value, quando: quando, condicao: quando === "situacional" ? ins[1].value.trim() : "" });
        }
        return {
          value: Object.assign(out, { qtd: q, dado: dado.value, fixo: f, tipo: tipo.value, semKi: tipo.value === "fisico" && semKiBox.checked, pontaria: pontariaBox.checked, extras: extras, danoAlvo: dmgAlvo.value, danoN: dmgAlvo.value === "n" ? FXD.clampN(dmgN.value) : 0 })
        };
      }
    };
  }

  function showError(node, text) { node.textContent = text; node.className = "msg msg--error"; }

  // O × vermelho no canto de cada janela fecha sem salvar.
  document.querySelectorAll("dialog [data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () { btn.closest("dialog").close(); });
  });

  /* ---------- Equipamento: criar e editar ---------- */
  var itemDlg = $("item-dialog"), itemForm = $("item-form"), itemMsg = $("item-msg");
  var hasAbility = $("it-has-ability"), abilityBox = $("item-ability");
  var gastarBox = $("it-gastar"), gastarWrap = $("it-gastar-wrap");
  var itemAbility = abilityForm(abilityBox, { nameLabel: "Nome da habilidade", costHost: $("item-cost"), showCost: function () { return gastarBox.checked; } });
  var editingItem = null;   // equipamento em edição (null = criando um novo)

  hasAbility.addEventListener("change", function () {
    abilityBox.hidden = !hasAbility.checked; gastarWrap.hidden = !hasAbility.checked;
    if (hasAbility.checked) { itemAbility.focus(); itemAbility.refresh(); }
  });
  gastarBox.addEventListener("change", function () { itemAbility.refresh(); });

  function openItemForm(it) {
    editingItem = it || null;
    itemForm.reset();
    itemAbility.reset();
    itemMsg.textContent = "";
    $("item-title").textContent = it ? "Editar equipamento" : "Novo equipamento";
    $("item-submit").textContent = it ? "Salvar" : "Adicionar";
    var ability = it && it.habilidade && typeof it.habilidade === "object" ? it.habilidade : null;
    if (it) {
      $("it-nome").value = it.nome;
      $("it-desc").value = it.descricao || "";
      if (ability) itemAbility.fill(ability);
    }
    hasAbility.checked = !!ability;
    abilityBox.hidden = !ability; gastarWrap.hidden = !ability;
    // Marcado por padrão. Equipamento antigo (sem o registro) abre desmarcado, para não cobrar TP de surpresa ao editar.
    gastarBox.checked = ability ? ability.gastouTp === true : true;
    itemAbility.refresh();
    itemDlg.showModal();
    $("it-nome").focus();
  }

  // "+" de equipamentos: escolher um pronto (esquerda) ou criar o seu (direita).
  $("item-add").addEventListener("click", function () {
    var cur = S.get(), cat = window.DBOCatalog ? DBOCatalog.EQUIPAMENTOS : [];
    var have = cur.equipamentos.map(function (x) { return x.nome; });
    DBOChoose.open({
      title: "Novo equipamento",
      left: {
        title: "Pegar equipamento já existente",
        empty: "Você já pegou todos os equipamentos prontos.",
        items: cat.filter(function (it) { return have.indexOf(it.nome) < 0; }).map(function (it) {
          return { nome: it.nome, sub: it.habilidade ? "Habilidade: " + it.habilidade.nome : "Sem habilidade", detalhes: it.descricao, onPick: function () {
            var now = S.get();
            if (now.equipamentos.length >= R.limiteInventario(now)) return "Inventário cheio.";
            var hab = it.habilidade ? Object.assign({}, JSON.parse(JSON.stringify(it.habilidade)), { id: DBOCharacters.newId("h"), usos: 0 }) : null;
            S.save({ equipamentos: now.equipamentos.concat([{ id: DBOCharacters.newId("e"), nome: it.nome, descricao: it.descricao || "", habilidade: hab }]) });
            return "";
          } };
        })
      },
      right: { title: "Criar próprio equipamento", text: "Monte do seu jeito: nome, descrição e, se quiser, uma habilidade.", label: "Criar equipamento", onClick: function () { openItemForm(null); } }
    });
  });
  $("item-cancel").addEventListener("click", function () { itemDlg.close(); });
  itemForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var nome = $("it-nome").value.trim();
    if (!nome) return showError(itemMsg, "Dê um nome ao equipamento.");
    var old = editingItem;
    var ability = null, gastoTp = 0;
    if (hasAbility.checked) {
      var r = itemAbility.read();
      if (r.error) return showError(itemMsg, r.error);
      ability = r.value;
      var oldAb = old && old.habilidade && typeof old.habilidade === "object" ? old.habilidade : null;
      ability.id = oldAb && oldAb.id ? oldAb.id : DBOCharacters.newId("h");
      ability.usos = oldAb ? Number(oldAb.usos) || 0 : 0;
      // "Gastar TP?": a habilidade custa TP como uma técnica aprendida (R.custoTecnica). Só se cobra a diferença ao editar.
      var pago = oldAb ? Number(oldAb.tp) || 0 : 0;
      ability.gastouTp = gastarBox.checked;
      ability.tp = pago;
      if (gastarBox.checked) {
        var custo = itemAbility.cost(), extra = Math.max(0, custo - pago), tem = Number(S.get().tpAtuais) || 0;
        if (custo > R.LIMITE_TP && !S.get().npc) return showError(itemMsg, "Essa habilidade custaria mais TP do que o sistema comporta (" + UI.fmt(R.LIMITE_TP) + "). Reduza os dados.");
        if (extra > tem) return showError(itemMsg, "TPs insuficientes: faltam " + UI.fmt(extra - tem) + " TP (custo " + UI.fmt(custo) + (pago ? ", já pagos " + UI.fmt(pago) : "") + "). Desmarque \"Gastar TP?\" se o equipamento foi entregue.");
        ability.tp = pago + extra;
        gastoTp = extra;
      }
    } else if (old && typeof old.habilidade === "string") {
      ability = old.habilidade; // ficha antiga: mantém o nome que já existia
    }
    var item = {
      id: old ? old.id : DBOCharacters.newId("e"),
      nome: nome,
      descricao: $("it-desc").value.trim(),
      habilidade: ability
    };
    if (old && old.efeito) item.efeito = old.efeito; // não perde o texto de efeito antigo
    var list = S.get().equipamentos;
    delete rolls["item-" + item.id];
    itemDlg.close();
    var patchEq = {
      equipamentos: old
        ? list.map(function (x) { return x.id === old.id ? item : x; })
        : list.concat([item])
    };
    if (gastoTp > 0) { var cur0 = S.get(); patchEq.tpAtuais = cur0.tpAtuais - gastoTp; patchEq.tpGastos = (Number(cur0.tpGastos) || 0) + gastoTp; }
    S.save(patchEq);
  });

  /* ---------- Técnica: criar e editar ---------- */
  var techDlg = $("tech-dialog"), techFormEl = $("tech-form"), techMsg = $("tech-msg");
  var techGastar = $("tech-gastar");
  var techFields = abilityForm($("tech-fields"), { costHost: $("tech-cost"), showCost: function () { return techGastar.checked; } });
  techGastar.addEventListener("change", function () { techFields.refresh(); });
  var editingTech = null;   // técnica em edição (null = criando uma nova)

  function openTechForm(t) {
    editingTech = t || null;
    techFields.reset();
    techMsg.textContent = "";
    $("tech-title").textContent = t ? "Editar técnica" : "Nova técnica";
    $("tech-submit").textContent = t ? "Salvar" : "Criar técnica";
    if (t) techFields.fill(t);
    // Técnica nova: marcado. Técnica antiga (sem o registro) abre desmarcada, para não cobrar TP de surpresa ao editar.
    techGastar.checked = t ? t.gastouTp === true : true;
    techFields.refresh();
    techDlg.showModal();
    techFields.focus();
  }

  // Técnica nova: o custo em TP sai dos dados da técnica (R.custoTecnica, js/rules.js); não há mais pergunta.
  // "+" de técnicas: escolher uma pronta (esquerda, custa TP) ou criar a sua (direita).
  $("tech-add").addEventListener("click", function () {
    var cur = S.get(), cat = window.DBOCatalog ? DBOCatalog.TECNICAS : [];
    var known = cur.tecnicas.map(function (x) { return x.nome; });
    DBOChoose.open({
      title: "Nova técnica",
      confirmar: true,
      left: {
        title: "Aprender técnica já existente",
        empty: "Você já aprendeu todas as técnicas prontas.",
        items: cat.filter(function (it) { return known.indexOf(it.nome) < 0; }).map(function (it) {
          var custo = R.custoTecnica(it, cur), npc = !!cur.npc;
          return { nome: it.nome, sub: (npc ? "NPC: não custa TP" : custo + " TP") + " · " + A.damageText(it), detalhes: it.descricao, onPick: function () {
            var now = S.get();
            if (npc) {   // NPC aprende qualquer técnica pronta sem gastar TP
              var t0 = JSON.parse(JSON.stringify(it)); delete t0.tp; delete t0.pl;
              t0.id = DBOCharacters.newId("t"); t0.usos = 0; t0.gastouTp = false;
              commitNewTech(t0, 0);
              return "";
            }
            if ((Number(now.tpAtuais) || 0) < custo) return "TPs insuficientes: custa " + UI.fmt(custo) + " e você tem " + UI.fmt(Number(now.tpAtuais) || 0) + ".";
            var tech = JSON.parse(JSON.stringify(it)); delete tech.tp; delete tech.pl;
            tech.id = DBOCharacters.newId("t"); tech.usos = 0;
            commitNewTech(tech, custo);
            return "";
          } };
        })
      },
      right: { title: "Criar própria técnica", text: "Monte a técnica do seu jeito. O custo em TP depende dos dados que ela rola e dos efeitos que ela aplica.", label: "Criar técnica", onClick: startOwnTech }
    });
  });
  function startOwnTech() { openTechForm(null); }
  $("tech-cancel").addEventListener("click", function () { techDlg.close(); });
  techFormEl.addEventListener("submit", function (event) {
    event.preventDefault();
    var r = techFields.read();
    if (r.error) return showError(techMsg, r.error);
    var old = editingTech;
    var tech = r.value;
    tech.id = old ? old.id : DBOCharacters.newId("t");
    tech.usos = old ? Number(old.usos) || 0 : 0;
    if (old && old.origemId) tech.origemId = old.origemId;
    var pago = old ? Number(old.tp) || 0 : 0;
    tech.tp = pago;
    tech.gastouTp = techGastar.checked;
    if (old && old.hid) tech.hid = old.hid; // id da habilidade no banco
    if (old && old.guardada) tech.guardada = true;
    var list = S.get().tecnicas;
    delete rolls[tech.id];
    var custoNovo = R.custoTecnica(tech, S.get()), have0 = Number(S.get().tpAtuais) || 0, extra = 0;
    if (techGastar.checked) {
      extra = old ? Math.max(0, custoNovo - pago) : custoNovo;
      if (custoNovo > R.LIMITE_TP && !S.get().npc) return showError(techMsg, "Essa técnica custaria mais TP do que o sistema comporta (" + UI.fmt(R.LIMITE_TP) + "). Reduza o dano ou os efeitos.");
      if (extra > have0) return showError(techMsg, "TPs insuficientes: faltam " + UI.fmt(extra - have0) + " TP (custo " + UI.fmt(custoNovo) + (pago ? ", já pagos " + UI.fmt(pago) : "") + "). Desmarque \"Gastar TP?\" se a técnica foi entregue.");
    }
    techDlg.close();
    if (!old) {
      commitNewTech(tech, extra); return;
    }
    tech.tp = pago + extra;
    var patchT = { tecnicas: list.map(function (x) { return x.id === old.id ? tech : x; }) };
    if (extra > 0) { patchT.tpAtuais = have0 - extra; patchT.tpGastos = (Number(S.get().tpGastos) || 0) + extra; }
    S.save(patchT);
  });

  // Técnica nova (feita ou pronta): cobra o TP e grava. No banco, uma função só faz tudo (ou nada).
  function commitNewTech(tech, spend) {
    var cur = S.get();
    if (R.contaTecnicas(cur) < R.limiteTecnicas(cur)) return finishNewTech(tech, spend);
    // Passou do limite: guardar no inventário ou trocar por uma da lista.
    askKeep(tech, function (answer) {
      if (answer === "sim") { tech.guardada = true; return finishNewTech(tech, spend); }
      if (answer !== "nao") return; // cancelou: nada é cobrado
      pickToStore("Escolha qual técnica sai da lista (ela vai pro inventário) para entrar " + tech.nome + ".", function (outId) {
        var now = S.get();
        S.save({ tecnicas: now.tecnicas.map(function (x) { return x.id === outId ? Object.assign({}, x, { guardada: true }) : x; }) });
        finishNewTech(tech, spend);
      });
    });
  }
  function finishNewTech(tech, spend) {
    var cur = S.get();
    spend = Math.min(spend, cur.tpAtuais);
    if (tech.gastouTp === undefined) tech.gastouTp = spend > 0;
    tech.tp = spend; // TPs gastos para aprender: é isso que dá Power Level à técnica
    if (DBOCharacters.learn) {
      DBOCharacters.learn(cur.id, tech, spend).then(function () { S.save({}); }).catch(function (err) {
        UI.toast("Não consegui aprender a técnica: " + err.message);
      });
      return;
    }
    var patch = { tecnicas: cur.tecnicas.concat([tech]) };
    if (spend > 0) { patch.tpAtuais = cur.tpAtuais - spend; patch.tpGastos = cur.tpGastos + spend; }
    S.save(patch);
  }

  /* ---------- Zenis ---------- */
  function renderZeni(c) {
    var v = $("zeni-value");
    if (v) v.textContent = UI.fmt(Number(c.zeni) || 0);
  }
  var zeniBtn = $("zeni-edit");
  if (zeniBtn) zeniBtn.addEventListener("click", function () { if (S.edit) S.edit("zeni"); });

  S.subscribe(function (c) { renderZeni(c); renderItems(c); renderTechs(c); if (!S.isView || !S.isView()) autoStoreBasics(c); });
})();
