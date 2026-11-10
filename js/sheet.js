// Dragon Ball Omega — ficha do personagem: estado, coluna esquerda e modo de edição
// Outros arquivos usam: DBOSheet.get(), DBOSheet.save(patch), DBOSheet.subscribe(fn)
(function () {
  var D = DBOData, UI = DBOUI, R = DBORules, el = UI.el;
  var $ = function (id) { return document.getElementById(id); };

  var c = null;          // personagem aberto
  var editing = false;   // modo de edição da coluna esquerda
  var listeners = [];

  /* ---------- Campos editáveis ---------- */
  var FIELDS = {
    nome: { label: "Nome", type: "text", required: true },
    // sobe sozinho com a experiência; no NPC o mestre escolhe o nível direto
    // Nível: editável no modo Editar (ex.: começar no nível 30). Cada nível a mais dá 5 TP; a EXP guardada não muda.
    nivel: { label: "Nível", type: "number", min: 1, max: D.MAX_LEVEL },
    plBase: { label: "Power Level base", type: "number", min: 0 },   // só NPC: substitui o PL de raça + classe
    xp: { label: "Experiência", type: "number", min: 0 },
    alinhamento: { label: "Alinhamento", type: "select", options: function () { return D.ALIGNMENTS; } },
    raca: { label: "Raça", type: "select", options: function () { return Object.keys(D.RACES); } },
    subraca: { label: "Sub-raça", type: "select", options: function () { return D.RACES[c.raca] || []; } },
    classe: { label: "Classe", type: "select", options: function () { return D.CLASSES; } },
    subclasse: { label: "Sub-classe", type: "select", options: function () { return D.SUBCLASSES[c.classe] || []; } },
    tpAtuais: { label: "TPs atuais", type: "number", min: 0 },
    tpGastos: { label: "TPs gastos", type: "number", min: 0 },
    zeni: { label: "Zenis", type: "number", min: 0 },
    hpAtual: { label: "HP atual", type: "number", min: 0, clamp: true }, // somar/subtrair nunca passa de 0
    kpAtual: { label: "KP atual", type: "number", min: 0, clamp: true },
    corpoBase: { label: "Corpo Base", type: "number", min: 0 }
  };
  D.ATTRIBUTES.forEach(function (a) { FIELDS["atributos." + a[0]] = { label: a[1], type: "number", min: 0 }; });

  function getVal(key) {
    if (key.indexOf("atributos.") === 0) return (c.atributos || {})[key.slice(10)] || 0;
    if (key === "corpoBase") return c.corpoBase !== undefined ? c.corpoBase : R.corpoBase(c);
    if (key === "plBase") return R.plInicial(c);
    return c[key];
  }
  function patchFor(key, value) {
    if (key.indexOf("atributos.") === 0) {
      var next = {};
      for (var k in c.atributos) next[k] = c.atributos[k];
      next[key.slice(10)] = value;
      return { atributos: next };
    }
    var patch = {};
    patch[key] = value;
    return patch;
  }

  /* ---------- Estado ---------- */
  // Todo personagem tem o Soco. Fichas antigas ganham ele na primeira vez que abrem.
  function hasSoco(ch) { return (ch.tecnicas || []).some(function (t) { return t.nome === "Soco"; }); }
  function withSoco(ch) {
    var soco = JSON.parse(JSON.stringify(D.INITIAL_TECHNIQUES.filter(function (t) { return t.nome === "Soco"; })[0]));
    soco.id = DBOCharacters.newId ? DBOCharacters.newId("t") : soco.id;
    return [soco].concat(ch.tecnicas);
  }
  function ensureDefaults(ch) {
    var patch = {};
    if (!ch.atributos) patch.atributos = {};
    if (ch.xp === undefined) patch.xp = 0;
    if (ch.subclasse === undefined) patch.subclasse = "";
    if (ch.classe === "Curandeiro") { patch.classe = "Suporte"; ch = Object.assign({}, ch, { classe: "Suporte" }); }   // a classe mudou de nome
    if (ch.tpAtuais === undefined) patch.tpAtuais = 0;
    if (ch.tpGastos === undefined) patch.tpGastos = D.START_TP;
    if (ch.zeni === undefined) patch.zeni = 2000;
    if (ch.hpAtual === undefined) patch.hpAtual = R.hpMax(ch);
    if (ch.kpAtual === undefined) patch.kpAtual = R.kpMax(ch);
    if (!ch.equipamentos) patch.equipamentos = [];
    if (!ch.transformacoes) patch.transformacoes = [];
    var hc = classAbilitiesFix(ch);
    if (hc) patch.habilidadesClasse = hc;
    if (!ch.tecnicas) patch.tecnicas = JSON.parse(JSON.stringify(D.INITIAL_TECHNIQUES));
    else if (!hasSoco(ch)) patch.tecnicas = withSoco(ch);
    // Fichas criadas antes das regras atuais: recalcula HP/KP atuais e dá os 40 TPs iniciais.
    if ((ch.v || 1) < D.SCHEMA) {
      patch.v = D.SCHEMA;
      patch.hpAtual = R.hpMax(ch);
      patch.kpAtual = R.kpMax(ch);
      if (!ch.tpAtuais && !ch.tpGastos) patch.tpGastos = D.START_TP;
    }
    var fix = tpCorrigido(ch, patch.tecnicas || ch.tecnicas, patch.tpGastos !== undefined ? patch.tpGastos : ch.tpGastos);
    if (fix !== null) patch.tpGastos = fix;
    return Object.keys(patch).length ? DBOCharacters.update(ch.id, patch) : ch;
  }

  // Habilidades de classe: todo personagem tem a inicial da classe desde o nível 1, e nada de outra classe.
  // Devolve a lista corrigida, ou null se já está certa (fichas antigas ainda não tinham o campo).
  function classAbilitiesFix(ch) {
    var atual = Array.isArray(ch.habilidadesClasse) ? ch.habilidadesClasse : [];
    if (ch.npc) {   // NPC pode ter qualquer habilidade de classe: só saem as que não existem mais
      var existem = atual.filter(function (id) { return !!R.defClasse(id); });
      return existem.length === atual.length && Array.isArray(ch.habilidadesClasse) ? null : existem;
    }
    // Fica: genéricas, as da classe e as da sub-classe atual (habilidade de outra sub-classe some ao trocar de sub-classe).
    var valido = atual.filter(function (id) { var d = R.defClasse(id); return d && (d.generica || (d.classe === ch.classe && (!d.sub || d.subclasse === ch.subclasse))); });
    var ini = R.inicialDaClasse(ch.classe);
    if (ini && valido.indexOf(ini.id) < 0) valido.unshift(ini.id);
    return JSON.stringify(valido) === JSON.stringify(atual) && Array.isArray(ch.habilidadesClasse) ? null : valido;
  }

  // Confere as contas: atributos (valores, não modificadores) + TPs gastos nas técnicas nunca podem passar dos TPs gastos.
  // Se passar, a diferença é somada aos TPs gastos. Devolve o novo valor ou null se está tudo certo.
  function tpCorrigido(ch, tecnicas, tpGastos) {
    var attrs = Object.keys(ch.atributos || {}).reduce(function (n, k) { return n + (Number(ch.atributos[k]) || 0); }, 0);
    var techs = (tecnicas || []).reduce(function (n, t) { return n + (Number(t.tp) || 0); }, 0);
    var total = attrs + techs, gastos = Number(tpGastos) || 0;
    return total > gastos ? total : null;
  }

  var viewOnly = false; // ficha de outra pessoa, aberta pelo mestre

  // Mesmos padrões do ensureDefaults, mas só em memória (nada é gravado na ficha de outra pessoa).
  function ensureDefaultsLocal(ch) {
    var d = {};
    if (!ch.atributos) d.atributos = {};
    if (ch.xp === undefined) d.xp = 0;
    if (ch.subclasse === undefined) d.subclasse = "";
    if (ch.classe === "Curandeiro") { d.classe = "Suporte"; ch = Object.assign({}, ch, { classe: "Suporte" }); }
    if (ch.tpAtuais === undefined) d.tpAtuais = 0;
    if (ch.tpGastos === undefined) d.tpGastos = D.START_TP;
    if (ch.zeni === undefined) d.zeni = 2000;
    if (ch.hpAtual === undefined) d.hpAtual = R.hpMax(ch);
    if (ch.kpAtual === undefined) d.kpAtual = R.kpMax(ch);
    if (!ch.equipamentos) d.equipamentos = [];
    if (!ch.transformacoes) d.transformacoes = [];
    var hc = classAbilitiesFix(ch);
    if (hc) d.habilidadesClasse = hc;
    if (!ch.tecnicas) d.tecnicas = JSON.parse(JSON.stringify(D.INITIAL_TECHNIQUES));
    else if (!hasSoco(ch)) d.tecnicas = withSoco(ch);
    var fix = tpCorrigido(ch, d.tecnicas || ch.tecnicas, d.tpGastos !== undefined ? d.tpGastos : ch.tpGastos);
    if (fix !== null) d.tpGastos = fix; // só em memória: a ficha de outra pessoa não é gravada
    return d;
  }

  function save(patch) {
    if (viewOnly) { UI.toast("Você está só olhando esta ficha. Só o dono pode alterar."); return false; }
    try {
      // Subir de nível ou ganhar Resistência/Espírito (pontos ou treino) aumenta o HP/KP máximo: o atual ganha a mesma diferença.
      var ganho = ("nivel" in patch || "atributos" in patch) && !("hpAtual" in patch) && !("kpAtual" in patch);
      var antes = ganho ? { hp: R.hpMax(c), kp: R.kpMax(c) } : null;
      c = DBOCharacters.update(c.id, patch);
      if (antes) {
        var dHp = R.hpMax(c) - antes.hp, dKp = R.kpMax(c) - antes.kp, up = {};
        if (dHp > 0) up.hpAtual = Math.min(R.hpMax(c), (Number(c.hpAtual) || 0) + dHp);
        if (dKp > 0) up.kpAtual = Math.min(R.kpMax(c), (Number(c.kpAtual) || 0) + dKp);
        if (up.hpAtual !== undefined || up.kpAtual !== undefined) c = DBOCharacters.update(c.id, up);
      }
      // Se o máximo caiu (ex.: atributo reduzido), vida e KP atuais não passam dele.
      var cap = {};
      if (c.hpAtual > R.hpMax(c)) cap.hpAtual = R.hpMax(c);
      if (c.kpAtual > R.kpMax(c)) cap.kpAtual = R.kpMax(c);
      if (cap.hpAtual !== undefined || cap.kpAtual !== undefined) c = DBOCharacters.update(c.id, cap);
    } catch (err) {
      UI.toast(err.message);
      return false;
    }
    render();
    return true;
  }

  function render(focusKey) {
    // Sessão da campanha: rolagens desta ficha vão para o log do mestre (só se ela for o personagem na sessão).
    if (window.DBOSessao && DBOSessao.definirPersonagem) DBOSessao.definirPersonagem(viewOnly ? null : c);
    renderLeft();
    if (typeof focusKey === "string") {
      var again = $("sheet-grid").querySelector('[data-field="' + focusKey + '"]');
      if (again) again.focus();
    }
    listeners.forEach(function (fn) { fn(c); });
  }

  /* ---------- Peças da coluna esquerda ---------- */
  function addButton(key, label) {
    var b = el("button", "add", "+");
    b.type = "button";
    b.dataset.field = key;
    b.setAttribute("aria-label", "Alterar " + label);
    b.title = "Alterar " + label;
    b.addEventListener("click", function () { openField(key); });
    return b;
  }

  function subclassOpen() { return c.nivel >= D.SUBCLASS_LEVEL; }

  // Modo de visualização "Navegação" (Personalizar): duas colunas, a da esquerda fica parada e a da direita tem abas.
  function isNav() { return !!window.DBOFichas && DBOFichas.modo(c) === "navegacao"; }
  var navTab = "golpes";
  var NAV_TABS = [["golpes", "Golpes"], ["tecnicas", "Técnicas"], ["inventario", "Inventário"], ["descricao", "Descrição"]];

  function row(key, label, display) {
    var f = FIELDS[key];
    var item = el("div", "row");
    item.appendChild(el("dt", "", label));
    var dd = el("dd");
    dd.appendChild(el("span", "", display === "" || display === undefined ? "—" : display));
    var canEdit = editing && !f.readonly && !(key === "subraca" && f.options().length === 0) && !(key === "subclasse" && !subclassOpen());
    if (canEdit) dd.appendChild(addButton(key, label));
    item.appendChild(dd);
    return item;
  }

  function photo() {
    var box = el("div", "who__photo");
    if (c.foto) {
      var img = el("img");
      img.src = c.foto;
      img.alt = "Foto de " + c.nome;
      box.appendChild(img);
    } else {
      box.appendChild(el("span", "", c.nome.charAt(0).toUpperCase()));
    }
    if (editing) {
      var label = el("label", "add who__photo-edit", "+");
      label.title = "Trocar foto";
      var input = el("input");
      input.type = "file";
      input.accept = "image/*";
      input.className = "sr-only";
      input.setAttribute("aria-label", "Trocar foto do personagem");
      input.addEventListener("change", function () {
        DBOCropper.pick(input.files[0], 320).then(function (data) {
          if (data) save({ foto: data });
        }).catch(function (err) { UI.toast(err.message); });
        input.value = "";
      });
      label.appendChild(input);
      box.appendChild(label);
    }
    return box;
  }

  function headerCard() {
    var card = el("section", "panel who");
    card.appendChild(photo());

    var name = el("div", "who__text");
    var line = el("div", "who__line");
    line.appendChild(el("h1", "who__name", c.nome));
    if (editing) line.appendChild(addButton("nome", "Nome"));
    name.appendChild(line);
    var art = window.DBOFichas && DBOFichas.artefato(c);   // modo de visualização "artefato" (Personalizar)
    name.appendChild(el("p", "who__sub", "Nível " + UI.fmt(c.nivel) + (art ? " · " + c.raca + " · " + c.classe : "")));
    if (c.npc) {   // NPC: etiqueta e o Power Level base (editável)
      var npcLine = el("p", "who__npc");
      npcLine.appendChild(el("span", "who__npc-tag", "NPC"));
      npcLine.appendChild(el("span", "", "PL base " + UI.fmt(R.plInicial(c))));
      if (editing) npcLine.appendChild(addButton("plBase", "Power Level base"));
      name.appendChild(npcLine);
      // tamanho no mapa da Sessão (js/tamanho.js)
      if (window.DBOTamanho) {
        var tamLine = el("p", "who__npc who__tam");
        tamLine.appendChild(el("span", "", "Tamanho: " + DBOTamanho.nome(c.tamanho)));
        var tamBtn = el("button", "btn btn--ghost who__tam-btn", "Alterar tamanho"); tamBtn.type = "button";
        tamBtn.addEventListener("click", function () {
          DBOTamanho.abrir({ titulo: "Alterar tamanho de " + c.nome, valor: c.tamanho, aoEscolher: function (v) { save({ tamanho: v === "normal" ? "" : v }); } });
        });
        if (!viewOnly) tamLine.appendChild(tamBtn);
        name.appendChild(tamLine);
      }
    }
    card.appendChild(name);
    if (art) {
      var plbox = el("div", "who__pl");
      plbox.appendChild(el("span", "", DBOFichas.plLabel(c)));
      var plv = el("b", "who__pl-value", UI.pl(R.powerLevel(c))); plv.title = UI.fmt(R.powerLevel(c)) + (c.npc ? " (PL base " + UI.fmt(R.powerLevelBase(c)) + " = PL do NPC " + UI.fmt(R.plInicial(c)) + " + TPs " + UI.fmt(R.powerLevelBase(c) - R.plInicial(c)) + ")" : " (PL base " + UI.fmt(R.powerLevelBase(c)) + " = raça " + UI.fmt(R.plRaca(c)) + " + classe " + UI.fmt(R.plClasse(c)) + " + TPs " + UI.fmt(R.powerLevelBase(c) - R.plRaca(c) - R.plClasse(c)) + ")"); plbox.appendChild(plv);
      card.appendChild(plbox);
    }

    var toggle = el("button", "btn who__toggle" + (editing ? "" : " btn--ghost"));
    toggle.id = "edit-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", String(editing));
    toggle.textContent = editing ? "Concluir edição" : "Editar";
    toggle.addEventListener("click", function () {
      editing = !editing;
      render();
      $("edit-toggle").focus();
    });
    card.appendChild(toggle);
    return card;
  }

  function infoCard() {
    var card = el("section", "panel");
    card.appendChild(el("h2", "", "Ficha"));
    var list = el("dl", "rows");
    list.appendChild(row("nivel", "Nível", UI.fmt(c.nivel)));
    list.appendChild(row("xp", "Experiência", c.nivel >= D.MAX_LEVEL
      ? UI.fmt(c.xp) + " (nível máximo)"
      : UI.fmt(c.xp) + " / " + UI.fmt(R.xpProximoNivel(c.nivel))));
    list.appendChild(row("alinhamento", "Alinhamento", c.alinhamento));
    list.appendChild(row("raca", "Raça", c.raca));
    var noSub = (D.RACES[c.raca] || []).length === 0;
    list.appendChild(row("subraca", "Sub-raça", noSub ? "Sem sub-raça" : c.subraca));
    list.appendChild(row("classe", "Classe", c.classe));
    list.appendChild(row("subclasse", "Sub-classe", c.subclasse || (subclassOpen() ? "" : "Libera no nível " + D.SUBCLASS_LEVEL)));
    var custom = el("div", "row row--custom");
    custom.appendChild(el("dt", "", "Personalização"));
    var cdd = el("dd");
    var cbtn = el("button", "btn btn--ghost custom-btn", "Personalizar");
    cbtn.type = "button";
    cbtn.addEventListener("click", function () { if (window.DBOFichas) DBOFichas.open(); });
    cdd.appendChild(cbtn);
    custom.appendChild(cdd);
    list.appendChild(custom);
    card.appendChild(list);
    return card;
  }

  function tile(label, value, key, extra) {
    var t = el("div", "tile" + (extra ? " " + extra : ""));
    t.appendChild(el("span", "tile__label", label));
    var line = el("div", "tile__line");
    line.appendChild(el("b", "tile__value", UI.fmt(value)));
    if (editing && key) line.appendChild(addButton(key, label));
    t.appendChild(line);
    return t;
  }

  function tpTiles() {
    var grid = el("div", "tiles");
    grid.appendChild(tile("Atuais", c.tpAtuais, "tpAtuais"));
    grid.appendChild(tile("Gastos", c.tpGastos, null)); // só muda ao somar atributos e aprender técnicas
    grid.appendChild(tile("Totais", c.tpAtuais + c.tpGastos, null, "tile--total"));
    return grid;
  }

  function tpCard() {
    var card = el("section", "panel");
    card.appendChild(el("h2", "", "Pontos de Treino (TP)"));
    card.appendChild(tpTiles());
    card.appendChild(el("p", "note", "Totais são a soma dos atuais com os gastos. Cada TP gasto soma 10 ao valor base do Power Level."));
    var train = el("button", "btn btn--block", "Treino");
    train.id = "train-open";
    train.type = "button";
    train.addEventListener("click", openTrain);
    card.appendChild(train);
    return card;
  }

  var attrRoll = null; // último teste de atributo rolado (só em memória)

  function rollPanel() {
    var r = attrRoll;
    var box = el("div", "attr-roll" + (r.natural === 20 ? " attr-roll--crit" : r.natural === 1 ? " attr-roll--fail" : ""));
    box.setAttribute("role", "status");
    var close = el("button", "rollclose", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Fechar o teste de " + r.label);
    close.addEventListener("click", function () { attrRoll = null; render(); });
    box.appendChild(close);
    box.appendChild(el("b", "attr-roll__total", String(r.total)));
    var detail = el("span", "attr-roll__detail");
    detail.appendChild(el("strong", "", "Teste de " + r.label));
    detail.appendChild(el("small", "", "d20 " + r.natural + " " + (r.mod >= 0 ? "+ " + r.mod : "− " + Math.abs(r.mod)) +
      (r.bonus ? " " + (r.bonus > 0 ? "+ " : "− ") + Math.abs(r.bonus) + " (transformação)" : "") +
      (r.ativ ? " + " + r.ativ + " (ativação)" : "")));
    box.appendChild(detail);
    return box;
  }

  function orbCard() {
    var card = el("section", "panel panel--orb");
    var art = window.DBOFichas && DBOFichas.artefato(c);
    var model = window.DBOFichas ? DBOFichas.atributos(c) : "esfera";
    card.appendChild(el("h2", art && !isNav() ? "" : "sr-only", model === "sonar" ? "Sonar de atributos" : "Atributos"));
    if (isNav()) {                                       // TPs em cima da esfera, com o botão de treino
      var strip = el("div", "navtp");
      strip.appendChild(tpTiles());
      var train = el("button", "btn navtp__train", "Treino");
      train.id = "train-open";
      train.type = "button";
      train.addEventListener("click", openTrain);
      strip.appendChild(train);
      card.appendChild(strip);
    }
    var orb = el("div", model === "esfera" ? "orb" : "attr attr--" + model);
    DBOAttr.render(orb, {
      model: model,
      plLabel: window.DBOFichas ? DBOFichas.plLabel(c) : "Power Level",
      editing: editing,
      pl: R.powerLevel(c),
      noPl: !!art,
      center: art ? { label: "Corpo Base", value: c.corpoBase !== undefined ? c.corpoBase : R.corpoBase(c) } : null,
      addButton: addButton,
      onRoll: function (a) {
        if (window.DBOPrato && DBOPrato.ocupado()) return;
        var natural = Math.floor(Math.random() * 20) + 1;
        var bonus = window.DBOTransf ? DBOTransf.bonus(c).teste : 0;    // bônus em testes da transformação ativa
        var pend = window.DBOAbility ? DBOAbility.usarPendente(c, a.key) : null, ativ = pend ? pend.valor : 0;   // ativação (Inventor...)
        var efx = window.DBOEfeitos ? DBOEfeitos.teste(c, a.key) : 0;   // efeitos ativos (Concussão em Mente e Concentração)
        var aplicar = function () { attrRoll = { label: a.label, natural: natural, mod: a.mod, bonus: bonus + efx, ativ: ativ, total: natural + a.mod + bonus + ativ + efx }; render(); };
        if (window.DBOPrato) DBOPrato.rolar("Teste de " + a.label, [{ lados: 20, valor: natural }], aplicar, { fixos: [{ rot: a.label, val: a.mod }, { rot: "transformação", val: bonus }, { rot: pend ? "ativação" : "", val: ativ }, { rot: "efeitos", val: efx }], total: natural + a.mod + bonus + ativ + efx }); else aplicar();
      },
      attrs: D.ATTRIBUTES.map(function (a) {
        var raw = (c.atributos || {})[a[0]] || 0;
        return { key: a[0], label: a[1], abbr: a[2], raw: raw, mod: R.mod(c, a[0]) };
      })
    });
    card.appendChild(orb);
    if (attrRoll) card.appendChild(rollPanel());
    return card;
  }

  // Último valor mostrado de cada barra (por personagem), para a barra "cair" com transição em vez de pular.
  var lastVital = {};
  function countTo(node, from, to) {
    if (from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = UI.fmt(to); return; }
    var t0 = performance.now(), dur = 650;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.textContent = UI.fmt(Math.round(from + (to - from) * e));
      if (k < 1 && node.isConnected) requestAnimationFrame(step);
    })(t0);
  }

  function vital(kind, label, curKey, cur, max) {
    cur = Math.min(cur, max); // fichas antigas podem ter o atual acima do novo máximo
    var key = c.id + ":" + kind, prev = lastVital[key], pct = max > 0 ? Math.min(100, cur / max * 100) : 0;
    var prevPct = prev ? Math.min(100, max > 0 ? prev.cur / max * 100 : 0) : pct;
    lastVital[key] = { cur: cur };
    var box = el("div", "vital vital--" + kind);
    var head = el("div", "vital__head");
    head.appendChild(el("span", "vital__label", label));
    var nums = el("span", "vital__nums");
    var num = el("b", "", UI.fmt(prev ? prev.cur : cur));
    nums.appendChild(num);
    nums.appendChild(document.createTextNode(" / " + UI.fmt(max)));
    head.appendChild(nums);
    if (editing || (isNav() && !viewOnly)) head.appendChild(addButton(curKey, label + " atual"));
    box.appendChild(head);
    var track = el("div", "track");
    var ghost = el("div", "ghost"), fill = el("div", "fill");
    ghost.style.width = prevPct + "%"; fill.style.width = prevPct + "%";
    track.appendChild(ghost); track.appendChild(fill);
    box.appendChild(track);
    if (prev && prev.cur !== cur) {
      var drop = cur < prev.cur;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        fill.style.width = pct + "%";
        if (drop) { ghost.classList.add("is-drop"); box.classList.add("is-hit"); }
        ghost.style.width = pct + "%";
        countTo(num, prev.cur, cur);
      }); });
    } else { countTo(num, cur, cur); }
    return box;
  }

  // Pontos do Dragão: barra reta e dourada que cresce com o máximo (1 no começo, +1 a cada 25 níveis, 9 no fim),
  // dividida em partes por cortes inclinados de 15°. Tocar numa parte define o atual (só o dono da ficha).
  function pdRow() {
    var max = R.pdMax(c), cur = R.pdAtual(c);
    var box = el("div", "vital vital--pd");
    var head = el("div", "vital__head");
    head.appendChild(el("span", "vital__label", "PD"));
    head.appendChild(el("span", "vital__hint", "Pontos do Dragão"));
    var nums = el("span", "vital__nums");
    nums.appendChild(el("b", "", String(cur)));
    nums.appendChild(document.createTextNode(" / " + max));
    head.appendChild(nums);
    box.appendChild(head);
    var bar = el("div", "pdbar");
    bar.style.setProperty("--pd-max", String(max));
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Pontos do Dragão: " + cur + " de " + max);
    for (var i = 0; i < max; i++) (function (i) {
      var seg = el(viewOnly ? "span" : "button", "pdbar__seg" + (i < cur ? " is-on" : ""));
      if (!viewOnly) {
        seg.type = "button";
        seg.setAttribute("aria-label", "Definir " + (i + 1) + " de " + max + " Pontos do Dragão");
        seg.addEventListener("click", function () { save({ pdAtual: cur === i + 1 ? i : i + 1 }); });
      }
      bar.appendChild(seg);
    })(i);
    box.appendChild(bar);
    return box;
  }

  // Fúria do Berserker: barra vermelha acima dos Pontos do Dragão. Metade da largura com máximo 5; largura cheia com 10 (nível 90).
  // Tocar numa parte vazia enche até ela; tocar numa cheia esvazia a partir dela. Cada ponto dá +1 no dano físico.
  function furiaRow() {
    var max = R.furiaMax(c), cur = R.furiaAtual(c);
    var box = el("div", "vital vital--furia");
    var head = el("div", "vital__head");
    head.appendChild(el("span", "vital__label", "FÚ"));
    head.appendChild(el("span", "vital__hint", "Fúria · +1 no dano físico por ponto"));
    var nums = el("span", "vital__nums");
    nums.appendChild(el("b", "", String(cur)));
    nums.appendChild(document.createTextNode(" / " + max));
    head.appendChild(nums);
    box.appendChild(head);
    var bar = el("div", "pdbar pdbar--furia");
    bar.style.setProperty("--pd-max", String(max));
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Fúria: " + cur + " de " + max);
    for (var i = 0; i < max; i++) (function (i) {
      var seg = el(viewOnly ? "span" : "button", "pdbar__seg" + (i < cur ? " is-on" : ""));
      if (!viewOnly) {
        seg.type = "button";
        seg.setAttribute("aria-label", (i < cur ? "Esvaziar a partir do ponto " : "Encher até o ponto ") + (i + 1) + " de Fúria");
        seg.addEventListener("click", function () { save({ furiaAtual: i < cur ? i : i + 1 }); });
      }
      bar.appendChild(seg);
    })(i);
    var wrap = el("div", "furiabar" + (max > 0 && cur >= max ? " is-max" : ""));   // no máximo, uma linha vermelha gira na borda
    wrap.style.setProperty("--pd-max", String(max));
    wrap.appendChild(bar);
    box.appendChild(wrap);
    return box;
  }

  // Penalidades e Aprimoramentos (js/efeitos-ui.js): efeitos ativos no personagem, com duração em rodadas.
  var efeitosHost = { get: function () { return c; }, save: function (patch) { save(patch); }, refresh: function () { render(); } };
  function efeitosCard() {
    if (!window.DBOEfeitosUI) return document.createComment("efeitos");
    if (!viewOnly) DBOEfeitosUI.host = efeitosHost;
    return DBOEfeitosUI.panel(efeitosHost, { readOnly: viewOnly });
  }

  function vitalsCard() {
    var card = el("section", "panel");
    card.appendChild(el("h2", "", "Vitalidade"));
    card.appendChild(vital("hp", "HP", "hpAtual", c.hpAtual, R.hpMax(c)));
    card.appendChild(vital("kp", "KP", "kpAtual", c.kpAtual, R.kpMax(c)));
    if (R.furiaMax(c) > 0) card.appendChild(furiaRow());
    card.appendChild(pdRow());
    if (!isNav()) {                                      // na Navegação o Corpo Base já está no centro da esfera
      var ca = el("div", "vital vital--ca");
      var info = el("div");
      info.appendChild(el("span", "vital__label", "Corpo Base"));
      info.appendChild(el("span", "vital__hint", "Classe de armadura"));
      ca.appendChild(info);
      var val = el("div", "vital__ca-value");
      val.appendChild(el("b", "", UI.fmt(getVal("corpoBase"))));
      if (editing) val.appendChild(addButton("corpoBase", "Corpo Base"));
      ca.appendChild(val);
      card.appendChild(ca);
    }
    var restore = el("div", "restore");
    [["HP", "hpAtual", R.hpMax(c)], ["KP", "kpAtual", R.kpMax(c)]].forEach(function (r) {
      var b = el("button", "btn btn--ghost restore__btn restore__btn--" + r[0].toLowerCase(), "Restaurar " + r[0]);
      b.type = "button";
      b.disabled = c[r[1]] >= r[2];
      b.addEventListener("click", function () {
        var patch = {};
        patch[r[1]] = r[2];
        save(patch);
      });
      restore.appendChild(b);
    });
    var bp = el("button", "btn btn--ghost restore__btn restore__btn--pd", "Restaurar PD");
    bp.type = "button";
    bp.disabled = R.pdAtual(c) >= R.pdMax(c);
    bp.addEventListener("click", function () { save({ pdAtual: R.pdMax(c) }); });
    restore.appendChild(bp);
    card.appendChild(restore);
    return card;
  }

  /* ---------- Missões ativas (cartazes que o personagem pegou na Enciclopédia) ---------- */
  var missionsOpen = {};
  var missionsLoaded = false;
  function missionsCard() {
    if (!window.DBOEnc || !missionsLoaded) return null;
    var list = DBOEnc.missoesDe(c.id);
    if (!list.length) return null;                      // sem missões ativas: a caixa nem aparece
    var card = el("section", "panel panel--missions");
    card.id = "missions-card";
    card.appendChild(el("h2", "", "Missões"));
    var ul = el("ul", "missions");
    list.forEach(function (m) {
      var li = el("li", "mission" + (missionsOpen[m.id] ? " is-open" : ""));
      var head = el("button", "mission__head");
      head.type = "button";
      head.setAttribute("aria-expanded", String(!!missionsOpen[m.id]));
      head.appendChild(el("strong", "", m.alvo));
      head.appendChild(el("small", "", UI.fmt(m.recompensa) + " Z"));
      head.addEventListener("click", function () { missionsOpen[m.id] = !missionsOpen[m.id]; render(); });
      li.appendChild(head);
      if (missionsOpen[m.id]) {
        var body = el("div", "mission__body");
        body.appendChild(el("h3", "", "Descrição"));
        body.appendChild(el("p", "", m.descricao || "Sem descrição."));
        body.appendChild(el("h3", "", "Localização do alvo"));
        body.appendChild(el("p", "", m.localizacao || "Não informada."));
        if (!viewOnly) {
          var acts = el("div", "mission__acts");
          var ab = el("button", "btn btn--red", "Abandonar");
          ab.type = "button";
          ab.addEventListener("click", function () {      // sem pedir confirmação
            DBOEnc.abandonar(c.id, m.id).then(function () { delete missionsOpen[m.id]; render(); }).catch(function (e) { UI.toast(e.message); });
          });
          var ok = el("button", "btn btn--purple", "Concluir");
          ok.type = "button";
          ok.addEventListener("click", function () {      // a confirmação e o carimbo acontecem no cartaz, na Enciclopédia
            var url = "enciclopedia/missoes.html?cartaz=" + encodeURIComponent(m.id) + "&personagem=" + encodeURIComponent(c.id) + "&concluir=1";
            if (window.DBOTransition) DBOTransition.go(url); else location.href = url;
          });
          acts.appendChild(ab); acts.appendChild(ok);
          body.appendChild(acts);
        }
        li.appendChild(body);
      }
      ul.appendChild(li);
    });
    card.appendChild(ul);
    return card;
  }

  function renderLeft() {
    var root = $("sheet-left");
    root.textContent = "";
    root.classList.toggle("is-editing", editing);
    if (editing) {
      var banner = el("p", "edit-banner");
      banner.appendChild(el("span", "edit-banner__dot"));
      banner.appendChild(document.createTextNode("Modo de edição: use o + ao lado de um campo para mudar o valor."));
      root.appendChild(banner);
    }
    // Modo "artefato": o cabeçalho ocupa a largura toda, acima das duas colunas.
    var nav = isNav(), head = $("sheet-head"), wide = !!window.DBOFichas && DBOFichas.modo(c) === "artefato";
    head.textContent = "";
    head.hidden = !wide;
    head.classList.toggle("is-editing", editing);
    $("sheet-grid").classList.toggle("is-nav", nav);
    (wide ? head : root).appendChild(headerCard());
    if (nav) {                       // Navegação: personagem, esfera (com TPs) e vitalidade; o resto vai para as abas da direita
      root.appendChild(orbCard());
      root.appendChild(vitalsCard());
      root.appendChild(efeitosCard());
    } else {
      root.appendChild(infoCard());
      root.appendChild(tpCard());
      root.appendChild(orbCard());
      root.appendChild(vitalsCard());
      root.appendChild(efeitosCard());
      var mc = missionsCard();
      if (mc) root.appendChild(mc);
    }
    renderNavRight(nav);
  }

  /* ---------- Navegação: abas da coluna direita ---------- */
  function applyTabs(nav) {
    var right = $("sheet-right");
    right.classList.toggle("is-nav", nav);
    right.querySelectorAll("[data-tab]").forEach(function (n) { n.classList.toggle("nav-off", nav && n.dataset.tab !== navTab); });
    var g = $("nav-golpes");
    if (g) g.hidden = !nav;
    var bar = $("nav-tabs");
    bar.hidden = !nav;
    bar.querySelectorAll("[role=tab]").forEach(function (b) {
      var on = b.dataset.nav === navTab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }
  function renderNavRight(nav) {
    var bar = $("nav-tabs"), info = $("nav-info");
    if (!bar.firstChild) {
      NAV_TABS.forEach(function (t) {
        var b = el("button", "navtab", t[1]);
        b.type = "button";
        b.id = "navtab-" + t[0];
        b.dataset.nav = t[0];
        b.setAttribute("role", "tab");
        b.addEventListener("click", function () { navTab = t[0]; applyTabs(true); });
        b.addEventListener("keydown", function (e) {      // setas movem entre as abas
          var i = NAV_TABS.map(function (x) { return x[0]; }).indexOf(navTab), d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          navTab = NAV_TABS[(i + d + NAV_TABS.length) % NAV_TABS.length][0];
          applyTabs(true);
          $("navtab-" + navTab).focus();
        });
        bar.appendChild(b);
      });
    }
    info.textContent = "";
    info.classList.toggle("is-editing", editing && nav);
    if (nav) {
      info.appendChild(infoCard());
      var mc = missionsCard();
      if (mc) info.appendChild(mc);
    }
    info.hidden = !nav;
    applyTabs(nav);
  }

  // Experiência acumulada vira nível: cada nível gasta o custo do próximo e o resto fica guardado.
  function levelUp(patch) {
    var n = c.nivel, xp = patch.xp;
    while (n < D.MAX_LEVEL && xp >= R.xpProximoNivel(n)) {
      xp -= R.xpProximoNivel(n);
      n++;
    }
    patch.xp = xp;
    if (n !== c.nivel) {
      patch.nivel = n;
      patch.tpAtuais = (patch.tpAtuais !== undefined ? patch.tpAtuais : c.tpAtuais) + 5 * (n - c.nivel); // 5 TP por nível
    }
  }

  /* ---------- Janela do botão + (editar, somar, subtrair, alterar) ---------- */
  /* ---------- Treino ---------- */
  // Tipo: multiplicador do modificador de CON. Gravidade: bônus fixo de TP somado ao resultado.
  var TRAINING = [["precario", "Precário", 0.5], ["normal", "Normal", 1], ["excelente", "Excelente", 2], ["quase", "Quase perfeito", 3], ["perfeito", "Perfeito", 4]];
  var GRAVITIES = [[1, 0], [2, 1], [5, 3], [10, 5], [25, 7], [50, 10], [100, 15]];

  function trainGain() {
    var mult = TRAINING[$("tr-tipo").selectedIndex][2];
    var con = R.mod(c, "concentracao");
    var grav = GRAVITIES[$("tr-grav").selectedIndex];
    var fator = window.DBOEfeitos && DBOEfeitos.fatorMod ? DBOEfeitos.fatorMod(c, "treino") : 1;   // Fome e Cansaço reduzem o treino
    var base = Math.floor(con * mult * fator);
    return { con: con, mult: mult, base: base, grav: grav[0], bonus: grav[1], fator: fator, total: Math.max(0, base + grav[1]) };
  }
  function trainPreview() {
    var g = trainGain();
    $("tr-preview").textContent = "Você ganha " + UI.fmt(g.total) + " TP (CON " + g.con + " × " + g.mult + (g.fator < 1 ? " × " + String(g.fator).replace(".", ",") + " (efeito)" : "") + " = " + g.base + (g.bonus ? ", +" + g.bonus + " da gravidade" : "") + ")";
  }
  function openTrain() {
    var tipo = $("tr-tipo"), grav = $("tr-grav");
    if (!tipo.options.length) {
      TRAINING.forEach(function (t) { tipo.appendChild(new Option(t[1], t[0])); });
      GRAVITIES.forEach(function (g) { grav.appendChild(new Option(g[0] + "x" + (g[1] ? " (+" + g[1] + " TP)" : " (sem bônus)"), String(g[0]))); });
      tipo.addEventListener("change", trainPreview);
      grav.addEventListener("change", trainPreview);
      $("train-form").addEventListener("submit", function (event) {
        event.preventDefault();
        var g = trainGain();
        if (save({ tpAtuais: c.tpAtuais + g.total })) {
          var msg = $("tr-msg");
          msg.className = "msg msg--ok";
          msg.textContent = "Treino concluído! +" + UI.fmt(g.total) + " TP. Agora você tem " + UI.fmt(c.tpAtuais) + " TP atuais.";
        }
      });
    }
    $("tr-msg").textContent = "";
    trainPreview();
    $("train-dialog").showModal();
    tipo.focus();
  }

  /* ---------- Escolher sub-classe: lista à esquerda, descrição da escolhida ao lado ---------- */
  function openSubclasse() {
    var dlg = $("field-dialog"), opcoes = D.SUBCLASSES[c.classe] || [], escolhida = c.subclasse || opcoes[0] || "";
    var ROM = ["", "I", "II", "III"];
    dlg.textContent = "";
    dlg.classList.add("modal--sub");
    dlg.addEventListener("close", function limpa() { dlg.classList.remove("modal--sub"); dlg.removeEventListener("close", limpa); });
    var form = el("form", "subpick");
    form.noValidate = true;
    var x = el("button", "modal__close", "×"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.addEventListener("click", function () { dlg.close(); });
    form.appendChild(x);
    form.appendChild(el("h2", "", "Escolher sub-classe"));
    form.appendChild(el("p", "modal__lead", c.classe + (c.subclasse ? " · atual: " + c.subclasse : " · nenhuma escolhida ainda") + ". Trocar de sub-classe perde as habilidades da antiga."));
    var grid = el("div", "subpick__grid");
    var lista = el("fieldset", "subpick__list");
    lista.appendChild(el("legend", "sr-only", "Sub-classes de " + c.classe));
    var desc = el("div", "subpick__desc");
    desc.setAttribute("aria-live", "polite");
    function mostra(sub) {
      desc.textContent = "";
      var inf = (D.SUBCLASS_INFO || {})[sub] || {};
      desc.appendChild(el("h3", "", sub));
      if (inf.estilo) desc.appendChild(el("p", "subpick__estilo", inf.estilo));
      if (inf.base) { var b = el("p", "subpick__base"); b.appendChild(el("b", "", "Aumento-base: ")); b.appendChild(document.createTextNode(inf.base + ".")); desc.appendChild(b); }
      var hs = (D.SUBCLASS_ABILITIES || {})[sub] || [];
      var ul = el("ul", "subpick__habs");
      hs.forEach(function (h) {
        var li = el("li", h.dragao ? "is-dragao" : "");
        var tit = el("div", "subpick__hab");
        tit.appendChild(el("span", "subpick__num", h.dragao ? "PD" : ROM[h.cat] + (h.variante && h.variante !== "A" ? h.variante : "")));
        tit.appendChild(el("strong", "", h.nome));
        tit.appendChild(el("small", "", "nível " + h.nivel + (h.tipo ? " · " + h.tipo : "")));
        li.appendChild(tit);
        var resumo = h.texto && h.texto[0] ? h.texto[0] : "";
        if (resumo) li.appendChild(el("p", "", resumo.length > 180 ? resumo.slice(0, 177).replace(/\s+\S*$/, "") + "…" : resumo));
        ul.appendChild(li);
      });
      desc.appendChild(ul);
    }
    opcoes.forEach(function (sub) {
      var lab = el("label", "subpick__opt");
      var r = el("input"); r.type = "radio"; r.name = "subclasse"; r.value = sub; r.checked = sub === escolhida;
      r.addEventListener("change", function () { escolhida = sub; mostra(sub); });
      lab.appendChild(r);
      var corpo = el("span", "subpick__opt-body");
      corpo.appendChild(el("strong", "", sub));
      var inf = (D.SUBCLASS_INFO || {})[sub] || {};
      if (inf.base) corpo.appendChild(el("small", "", inf.base));
      lab.appendChild(corpo);
      lista.appendChild(lab);
    });
    grid.appendChild(lista);
    grid.appendChild(desc);
    form.appendChild(grid);
    var msg = el("p", "msg"); msg.setAttribute("role", "alert"); form.appendChild(msg);
    var actions = el("div", "modal__actions");
    var cancel = el("button", "btn btn--ghost", "Cancelar"); cancel.type = "button"; cancel.addEventListener("click", function () { dlg.close(); });
    var ok = el("button", "btn", "Escolher"); ok.type = "submit";
    actions.appendChild(cancel); actions.appendChild(ok);
    form.appendChild(actions);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!escolhida) { msg.textContent = "Escolha uma sub-classe."; msg.className = "msg msg--error"; return; }
      if (escolhida === c.subclasse) { dlg.close(); return; }
      var patch = { subclasse: escolhida, habilidadesClasse: (c.habilidadesClasse || []).filter(function (id) { var d = R.defClasse(id); return !d || !d.sub; }) };
      if (save(patch)) dlg.close();
    });
    dlg.appendChild(form);
    if (escolhida) mostra(escolhida);
    dlg.showModal();
    var sel = lista.querySelector("input:checked") || lista.querySelector("input");
    if (sel) sel.focus();
  }

  function openField(key) {
    if (key === "subclasse") return openSubclasse();
    var f = FIELDS[key];
    var dlg = $("field-dialog");
    var current = getVal(key);
    var isNumber = f.type === "number";
    var modes = isNumber
      ? [["editar", "Editar"], ["somar", "Somar"], ["subtrair", "Subtrair"], ["alterar", "Alterar"]]
      : [["editar", "Editar"], ["alterar", "Alterar"]];
    var mode = "editar";

    dlg.textContent = "";
    var form = el("form");
    form.noValidate = true;
    form.appendChild(el("h2", "", f.label));
    form.appendChild(el("p", "modal__lead", "Valor atual: " + (isNumber ? UI.fmt(current) : (current || "vazio"))));

    var seg = el("fieldset", "seg");
    seg.appendChild(el("legend", "sr-only", "O que fazer com o campo"));
    modes.forEach(function (m) {
      var label = el("label", "seg__opt");
      var radio = el("input");
      radio.type = "radio";
      radio.name = "mode";
      radio.value = m[0];
      radio.checked = m[0] === mode;
      radio.addEventListener("change", function () { mode = m[0]; buildInput(); });
      label.appendChild(radio);
      label.appendChild(el("span", "", m[1]));
      seg.appendChild(label);
    });
    form.appendChild(seg);

    var body = el("div", "field");
    var preview = el("p", "modal__preview");
    var msg = el("p", "msg");
    msg.setAttribute("role", "alert");
    form.appendChild(body);
    form.appendChild(preview);
    form.appendChild(msg);

    var actions = el("div", "modal__actions");
    var cancel = el("button", "btn btn--ghost", "Cancelar");
    cancel.type = "button";
    cancel.addEventListener("click", function () { dlg.close(); });
    var apply = el("button", "btn", "Aplicar");
    apply.type = "submit";
    actions.appendChild(cancel);
    actions.appendChild(apply);
    form.appendChild(actions);
    dlg.appendChild(form);

    var input;
    function buildInput() {
      body.textContent = "";
      msg.textContent = "";
      preview.textContent = "";
      var text = { editar: "Novo valor", somar: "Quanto somar", subtrair: "Quanto subtrair", alterar: "Escreva um valor novo (substitui o atual)" }[mode];
      var label = el("label", "", text);
      label.htmlFor = "fd-input";

      if (mode === "somar" || mode === "subtrair") {
        input = el("input");
        input.type = "number";
        input.step = "1";
        input.min = "0";
      } else if (f.type === "select") {
        input = el("select");
        if (mode === "alterar") input.appendChild(new Option("Escolha uma opção", ""));
        f.options().forEach(function (o) { input.appendChild(new Option(o, o)); });
        if (mode === "editar") input.value = current;
      } else {
        input = el("input");
        input.type = isNumber ? "number" : "text";
        if (isNumber) input.step = "1";
        else input.maxLength = 60;
        if (mode === "editar") input.value = current;
      }
      input.id = "fd-input";
      input.addEventListener("input", showPreview);
      body.appendChild(label);
      body.appendChild(input);
      if (key === "raca") preview.textContent = "Ao mudar a raça, a sub-raça é limpa. Depois é só escolher a nova no campo Sub-raça.";
      input.focus();
    }

    // Mudar um atributo move TPs: 1 TP por ponto. Subir gasta (atuais → gastos); descer devolve (gastos → atuais).
    function spendsTP() { return key.indexOf("atributos.") === 0; }

    function compute() {
      var r = computeValue();
      if (!r.error && key === "nivel") {   // descer de nível devolve os 5 TP de cada nível, que precisam estar nos TPs atuais
        var tira = 5 * (current - r.value);
        if (tira > 0 && tira > c.tpAtuais) return { error: "Descer para o nível " + r.value + " tira " + UI.fmt(tira) + " TP, e você só tem " + UI.fmt(c.tpAtuais) + " TPs atuais. Devolva TPs dos atributos antes." };
      }
      if (r.error || !spendsTP()) return r;
      var delta = r.value - current;
      if (delta > 0 && key.indexOf("atributos.") === 0) {
        // Limite de pontos por atributo conforme o nível. Quem já passou dele não perde nada, mas não sobe mais até o nível permitir.
        var lim = R.limiteAtributo(c.nivel), prox = R.nivelDoLimite(current > lim ? current + 1 : r.value);
        if (r.value > lim) {
          var jaAcima = current > lim;
          return { error: (jaAcima ? "Este atributo já está acima do limite do seu nível (" + UI.fmt(lim) + " pontos); você não perde nada, mas não pode aumentá-lo mais por enquanto. " : "No nível " + c.nivel + " um atributo vai até " + UI.fmt(lim) + " pontos (você tentou " + UI.fmt(r.value) + "). ") + (prox ? "O limite chega a " + UI.fmt(prox.limite) + " no nível " + prox.nivel + (current > lim ? ", quando você poderá aumentá-lo." : ".") : "Esse é o limite máximo do sistema.") };
        }
      }
      if (delta > c.tpAtuais) {
        return { error: c.tpAtuais > 0 ? "Você só tem " + UI.fmt(c.tpAtuais) + " TPs atuais, e cada ponto custa 1 TP." : "Você não tem TPs atuais pra gastar." };
      }
      if (-delta > c.tpGastos) return { error: "Você só tem " + UI.fmt(c.tpGastos) + " TPs gastos pra recuperar." };
      return r;
    }

    function computeValue() {
      var raw = String(input.value).trim();
      if (mode === "somar" || mode === "subtrair") {
        if (raw === "" || !/^\d+$/.test(raw)) return { error: "Digite um número inteiro, sem sinal." };
        var next = current + (mode === "somar" ? 1 : -1) * Number(raw);
        if (f.clamp && f.min !== undefined && next < f.min) next = f.min; // vida e KP param em 0
        return checkRange(next);
      }
      if (isNumber) {
        if (raw === "" || !/^-?\d+$/.test(raw)) return { error: "Digite um número inteiro." };
        return checkRange(Number(raw));
      }
      if (f.type === "select") return raw ? { value: raw } : { error: "Escolha uma opção." };
      if (f.required && !raw) return { error: "Esse campo não pode ficar vazio." };
      return { value: raw };
    }
    function checkRange(v) {
      if (f.min !== undefined && v < f.min) return { error: "O menor valor possível é " + UI.fmt(f.min) + "." };
      if (f.max !== undefined && v > f.max) return { error: "O maior valor possível é " + UI.fmt(f.max) + "." };
      if (!Number.isSafeInteger(v)) return { error: "Esse número é grande demais." };
      return { value: v };
    }
    function showPreview() {
      msg.textContent = "";
      if (mode !== "somar" && mode !== "subtrair" && !spendsTP() && key !== "nivel") return;
      var r = compute();
      if (r.error) { preview.textContent = ""; return; }
      var d = r.value - current;
      if (key === "nivel") { preview.textContent = d ? "Nível " + current + " → " + r.value + (d > 0 ? " (ganha " : " (perde ") + UI.fmt(Math.abs(5 * d)) + " TP; a EXP fica como está)" : ""; return; }
      preview.textContent = "Atual " + UI.fmt(current) + " → novo " + UI.fmt(r.value) +
        (spendsTP() && d !== 0 ? (d > 0 ? " (gasta " + UI.fmt(d) + " TP)" : " (devolve " + UI.fmt(-d) + " TP)") : "");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var r = compute();
      if (r.error) { msg.textContent = r.error; msg.className = "msg msg--error"; return; }
      if (key === "classe" && !R.alinhamentoOk(r.value, c.alinhamento)) { msg.textContent = "O " + r.value + " só aceita alinhamentos " + D.CLASS_ALIGNMENT[r.value] + "s. Troque o alinhamento primeiro."; msg.className = "msg msg--error"; return; }
      if (key === "alinhamento" && !R.alinhamentoOk(c.classe, r.value)) { msg.textContent = "O " + c.classe + " só aceita alinhamentos " + D.CLASS_ALIGNMENT[c.classe] + "s."; msg.className = "msg msg--error"; return; }
      var patch = patchFor(key, r.value);
      if (key === "subclasse" && r.value !== c.subclasse) {
        // Trocar de sub-classe perde as habilidades da sub-classe antiga.
        patch.habilidadesClasse = (c.habilidadesClasse || []).filter(function (id) { var d = R.defClasse(id); return !d || !d.sub; });
      }
      if (spendsTP()) {
        var cost = r.value - current;
        patch.tpAtuais = c.tpAtuais - cost;
        patch.tpGastos = c.tpGastos + cost;
      }
      if (key === "xp") levelUp(patch);
      if (key === "nivel" && r.value !== current) patch.tpAtuais = c.tpAtuais + 5 * (r.value - current);   // 5 TP por nível, como ao subir pela EXP
      if (key === "classe" && r.value !== c.classe) {
        // Trocar de classe perde as habilidades de classe: pede confirmação (a janela de edição fica aberta por trás).
        var ini = R.inicialDaClasse(r.value);
        patch.habilidadesClasse = ini ? [ini.id] : [];
        if ((D.SUBCLASSES[r.value] || []).indexOf(c.subclasse) < 0) patch.subclasse = "";
        return confirmClassChange(patch, r.value, function () { finish(); });
      }
      if (key === "classe" && (D.SUBCLASSES[r.value] || []).indexOf(c.subclasse) < 0) patch.subclasse = "";
      if (key === "raca" && (D.RACES[r.value] || []).indexOf(c.subraca) < 0) patch.subraca = "";
      finish();
      function finish() {
        dlg.close();
        if (save(patch)) {
          var again = $("sheet-left").querySelector('[data-field="' + key + '"]');
          if (again) again.focus();
        }
      }
    });

    buildInput();
    dlg.showModal();
  }

  // Janela de confirmação da troca de classe. `ok` roda se a pessoa confirmar.
  function confirmClassChange(patch, nova, ok) {
    var box = $("class-confirm-dialog");
    var perdidas = R.habilidadesAgrupadas(c).map(function (g) { return g.def.nome + (g.copias > 1 ? " (maestria " + g.copias + ")" : ""); });
    var ini = R.inicialDaClasse(nova);
    $("class-confirm-lost").textContent = perdidas.length ? perdidas.join(", ") : "nenhuma por enquanto";
    $("class-confirm-new").textContent = ini ? ini.nome : "nenhuma";
    function close() { $("class-confirm-yes").onclick = null; $("class-confirm-no").onclick = null; box.close(); }
    $("class-confirm-no").onclick = close;
    $("class-confirm-yes").onclick = function () { close(); ok(); };
    box.showModal();
  }

  /* ---------- Início ---------- */
  window.DBOSheet = {
    get: function () { return c; },
    save: save,
    isView: function () { return viewOnly; },
    edit: function (key) { openField(key); },
    subscribe: function (fn) { listeners.push(fn); },
    refresh: function () { if (c) render(); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () { doneLoading(); }, 20000); // garantia: nunca deixa a tela de carregamento presa
    var id = new URLSearchParams(location.search).get("id");
    DBOCharacters.ready()
      .then(function () { return id ? DBOCharacters.hydrate(id) : null; })
      .then(function () { start(id); })
      .catch(function (err) {
        $("sheet-grid").hidden = true;
        $("not-found").hidden = false;
        var why = $("not-found-why");
        why.textContent = "Motivo: " + err.message;
        why.hidden = false;
        UI.toast("Não consegui carregar a ficha: " + err.message);
        doneLoading();
      });
  });

  // Esconde a tela de carregamento (some com um fade curto).
  function doneLoading() {
    var box = $("sheet-loading");
    if (!box) return;
    document.documentElement.classList.remove("is-sheet-loading");
    box.classList.add("is-done");
    setTimeout(function () { box.hidden = true; }, 350);
  }

  function start(id) {
    var found = id && DBOCharacters.get(id);
    if (!found && id) {
      var other = DBOCharacters.getOther(id);
      if (other) {
        viewOnly = true;
        document.documentElement.classList.add("sheet-view");
        $("view-banner").hidden = false;
        found = JSON.parse(JSON.stringify(other));
      }
    }
    if (!found) {
      $("sheet-grid").hidden = true;
      $("not-found").hidden = false;
      doneLoading();
      return;
    }
    c = viewOnly ? Object.assign(found, ensureDefaultsLocal(found)) : ensureDefaults(found);
    document.title = c.nome + (c.npc ? " (NPC)" : "") + " | Dragon Ball Omega";
    if (c.npc) {   // NPC: volta para a lista de NPCs da Campanha
      document.documentElement.classList.add("ficha-npc");
      document.querySelectorAll("a.back").forEach(function (a) { a.href = "campanha/npcs.html"; a.textContent = "Voltar para NPCs"; });
    }
    render();
    doneLoading();
    // As missões vêm da Enciclopédia: carregam em seguida e a caixa aparece se houver alguma ativa.
    if (window.DBOEnc) Promise.resolve(DBOEnc.ready()).then(function () { missionsLoaded = true; render(); }).catch(function () {});
  }
})();
