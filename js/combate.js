// Dragon Ball Omega — página Sessão da campanha (antiga "Combate")
// Visões (barra de cima, ao lado de "Voltar para a Campanha"):
//   Sessão     esquerda: seu personagem (o mestre vê os jogadores) · centro: mapa (js/mapa.js + js/sessao-mapa.js) · direita: log.
//   Combate    abas Combate / Personagem (jogador) / Resumos (mestre) / Temas (mestre).
//              Combate: esquerda ficha (jogador) ou NPCs (mestre) · centro rodada e iniciativa · direita jogadores.
//   Anotações  caderno em Markdown (js/notas.js), salvo até o jogador sair da sessão.
// Quem não está na sessão vê só o pedido para participar; o mestre aceita ou rejeita (notificação no canto da tela).
// Dados: js/sessao-data.js (membros, log, anotações) e js/combate-data.js (rodada e iniciativa).
(function () {
  var UI = DBOUI, D = DBOData, R = DBORules, el = UI.el, C = DBOCampaign, K = DBOCombat, S = DBOSessao, A = DBOAbility, M = DBOSessaoMapa;
  var main = document.getElementById("sess-main");
  var nav = document.getElementById("sess-nav");
  var notif = document.getElementById("sess-notif");

  var rolls = {};      // rolagens de técnicas e habilidades (só em memória)
  var opened = {};     // detalhes abertos
  var attrRoll = null; // último teste de atributo
  var initRoll = null; // última iniciativa rolada
  var editInit = null; // id de quem está com a iniciativa sendo editada na ordem
  var adjVital = null, adjModo = "sub"; // janela de alterar HP/KP aberta ("hp" ou "kp")

  function lerPref(k, padrao) { try { return sessionStorage.getItem(k) || padrao; } catch (e) { return padrao; } }
  function gravarPref(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  var view = lerPref("dbo-sess-view", "sessao");          // sessao | combate | notas
  var combTab = lerPref("dbo-sess-aba", "combate");        // combate | resumos | temas
  var pane = { sessao: "mapa", combate: "ordem" };         // painel visível no celular
  var resumoSel = null, usosCache = { cid: null, data: {}, t: 0 };
  var regions = {};    // partes da tela que se atualizam sozinhas

  var attrName = {};
  D.ATTRIBUTES.forEach(function (a) { attrName[a[0]] = a[1]; });

  function die(sides) { return Math.floor(Math.random() * sides) + 1; }
  function signed(n) { return n >= 0 ? "+ " + n : "− " + Math.abs(n); }
  function box(extra) { return el("section", "panel-box fight-block" + (extra ? " " + extra : "")); }
  function mestre() { return DBORoles.isMaster(); }

  // KP atual (vazio = cheio) e o KP depois de gastar.
  function kpDe(c) { return c.kpAtual == null || c.kpAtual === "" ? R.kpMax(c) : Number(c.kpAtual) || 0; }
  function hpDe(c) { return c.hpAtual == null || c.hpAtual === "" ? R.hpMax(c) : Number(c.hpAtual) || 0; }
  function semKp(c, custo) { return Math.max(0, kpDe(c) - (Number(custo) || 0)); }
  function atual(c) { return (DBOCharacters.get && DBOCharacters.get(c.id)) || c; }
  // HP depois de gastar HP no lugar de KP; sem gasto, não mexe.
  function hpDepois(c, hp) { var at = hpDe(c); return hp ? Math.max(1, at - hp) : c.hpAtual; }
  function ctxFor(c, onUse) {
    return { rolls: rolls, opened: opened, get: function () { return atual(c); }, refresh: function () { render(); }, onUse: onUse,
      escolherAlvos: escolherAlvos,
      // Ativações (ex.: bônus no próximo teste) também gastam KP.
      onKp: function (custo) { var cur = atual(c); try { DBOCharacters.update(cur.id, { kpAtual: semKp(cur, custo) }); } catch (err) { UI.toast(err.message); } render(); } };
  }

  /* ---------- Retratos ---------- */
  function avatar(c, cls) {
    var a = el("div", cls || "avatar-c");
    if (c && c.foto) { var img = el("img"); img.src = c.foto; img.alt = ""; img.loading = "lazy"; a.appendChild(img); }
    else a.textContent = ((c && c.nome) || "?").trim().charAt(0).toUpperCase();
    return a;
  }
  // Personagem (dados públicos) de quem está na ordem de iniciativa, ou null (NPC).
  function charDoCombatente(e) {
    if (!e || e.tipo === "npc") return null;
    var ps = C.players();
    var p = ps.filter(function (x) { return (e.personagem_id && x.char.id === e.personagem_id) || (!e.personagem_id && x.email && e.id === "p:" + x.email); })[0];
    return p ? p.char : null;
  }
  function charDoMembro(m) {
    var p = C.players().filter(function (x) { return x.char.id === m.personagem_id; })[0];
    return p ? p.char : null;
  }
  // Ficha completa (o mestre lê as de todos; o jogador, a própria).
  function fichaCompleta(id) {
    return (DBOCharacters.get && DBOCharacters.get(id)) || (DBOCharacters.getOther && DBOCharacters.getOther(id)) || null;
  }

  /* =========================================================================
     FICHA DO JOGADOR (esquerda)
     ========================================================================= */
  function headBlock(c) {
    var b = box();
    var who = el("div", "fight__who");
    who.appendChild(avatar(c));
    var info = el("div");
    info.appendChild(el("h2", "", c.nome));
    info.appendChild(el("p", "", c.classe + " · " + c.raca + " · nível " + UI.fmt(c.nivel)));
    who.appendChild(info);
    b.appendChild(who);

    var init = el("div", "init");
    var btn = el("button", "btn init__btn", "Rolar iniciativa");
    btn.type = "button";
    btn.addEventListener("click", function () {
      if (window.DBOPrato && DBOPrato.ocupado()) return;
      var natural = die(20), mod = R.mod(c, "velocidade") + (R.bonusIniciativa ? R.bonusIniciativa(c) : 0);   // Passos de Vento: +2
      var aplicar = function () {
        initRoll = { natural: natural, mod: mod, total: natural + mod };
        var feito;
        try { feito = K.setPlayer(c, initRoll.total); } catch (err) { feito = Promise.reject(err); }
        render();   // a ordem já mostra a iniciativa nova; o banco confirma depois
        Promise.resolve(feito).catch(function (err) { initRoll = null; UI.toast(err.message); }).then(render);
      };
      if (window.DBOPrato) DBOPrato.rolar("Iniciativa", [{ lados: 20, valor: natural }], aplicar, { fixos: [{ rot: "Velocidade", val: mod }], total: natural + mod }); else aplicar();
    });
    init.appendChild(btn);
    if (initRoll) {
      var out = el("div", "init__out");
      out.setAttribute("role", "status");
      out.appendChild(el("b", "init__total", String(initRoll.total)));
      out.appendChild(el("small", "", "d20 " + initRoll.natural + " " + signed(initRoll.mod)));
      init.appendChild(out);
    }
    b.appendChild(init);
    return b;
  }

  function efeitosBlock(c) {
    if (!window.DBOEfeitosUI) return document.createComment("efeitos");
    var host = { get: function () { return atual(c); }, save: function (patch) { DBOCharacters.update(c.id, patch); render(); }, refresh: function () { render(); } };
    DBOEfeitosUI.host = host;
    var p = DBOEfeitosUI.panel(host);
    p.classList.add("panel-box", "fight-block");
    return p;
  }

  function salvaChar(c, patch) {
    try { DBOCharacters.update(c.id, patch); } catch (err) { UI.toast(err.message); }
    render();
  }
  function barraPontos(rotulo, max, cur, classe, onClick, ariaFn) {
    var bar = el("div", "pdbar" + (classe ? " " + classe : "")); bar.style.setProperty("--pd-max", String(max));
    bar.setAttribute("role", "group"); bar.setAttribute("aria-label", rotulo + ": " + cur + " de " + max);
    for (var i = 0; i < max; i++) (function (i) {
      var sg = el(onClick ? "button" : "span", "pdbar__seg" + (i < cur ? " is-on" : ""));
      if (onClick) { sg.type = "button"; sg.setAttribute("aria-label", ariaFn(i)); sg.addEventListener("click", function () { onClick(i); }); }
      bar.appendChild(sg);
    })(i);
    return bar;
  }
  function vitalBlock(c) {
    var b = box("fight-vital");
    b.appendChild(el("h3", "", "Vitalidade"));
    [["hp", "HP", "hpAtual", R.hpMax(c)], ["kp", "KP", "kpAtual", R.kpMax(c)]].forEach(function (v) {
      var max = v[3], cur = Math.max(0, Math.min(max, Number(c[v[2]] == null ? max : c[v[2]]) || 0));
      var row = el("div", "fvital");
      var head = el("div", "fvital__head");
      head.appendChild(el("span", "fvital__label", v[1]));
      var nums = el("span", "fvital__nums"); nums.appendChild(el("b", "", UI.fmt(cur))); nums.appendChild(document.createTextNode(" / " + UI.fmt(max)));
      head.appendChild(nums);
      var plus = el("button", "fvital__plus", "+"); plus.type = "button";
      plus.setAttribute("aria-label", "Alterar " + v[1] + " atual"); plus.setAttribute("aria-expanded", String(adjVital === v[0]));
      plus.addEventListener("click", function () { adjVital = adjVital === v[0] ? null : v[0]; renderLeft(); });
      head.appendChild(plus);
      row.appendChild(head);
      var trk = el("div", "fvital__track"), fill = el("div", "fvital__fill fvital__fill--" + v[0]);
      fill.style.width = (max ? Math.min(100, cur / max * 100) : 0).toFixed(1) + "%";
      trk.appendChild(fill); row.appendChild(trk);
      if (adjVital === v[0]) {
        var form = el("form", "fvital__adj"); form.noValidate = true;
        var seg = el("div", "fvital__seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Tipo de alteração");
        [["sub", "Subtrair"], ["add", "Somar"], ["set", "Definir"]].forEach(function (m) {
          var bt = el("button", "", m[1]); bt.type = "button"; bt.setAttribute("aria-pressed", String(adjModo === m[0]));
          bt.addEventListener("click", function () { adjModo = m[0]; renderLeft(); var i = document.getElementById("fv-in"); if (i) i.focus(); });
          seg.appendChild(bt);
        });
        form.appendChild(seg);
        var line = el("div", "fvital__line");
        var lab = el("label", "sr-only", "Valor"); lab.htmlFor = "fv-in"; line.appendChild(lab);
        var inp = el("input"); inp.id = "fv-in"; inp.type = "number"; inp.min = 0; inp.inputMode = "numeric"; inp.placeholder = "Valor";
        line.appendChild(inp);
        var go = el("button", "btn", "Aplicar"); go.type = "submit"; line.appendChild(go);
        form.appendChild(line);
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var n = Math.max(0, Math.floor(Number(inp.value) || 0));
          var nv = adjModo === "add" ? cur + n : adjModo === "sub" ? cur - n : n;
          var patch = {}; patch[v[2]] = Math.max(0, Math.min(max, nv));
          adjVital = null;
          salvaChar(c, patch);
        });
        row.appendChild(form);
      }
      b.appendChild(row);
    });
    // Fúria do Berserker (acima dos Pontos do Dragão): tocar numa parte vazia enche até ela; numa cheia, esvazia a partir dela
    if (R.furiaMax && R.furiaMax(c) > 0) {
      var fmax = R.furiaMax(c), fcur = R.furiaAtual(c);
      var fu = el("div", "fvital fvital--furia");
      var fh = el("div", "fvital__head");
      fh.appendChild(el("span", "fvital__label", "FÚ"));
      var fn = el("span", "fvital__nums"); fn.appendChild(el("b", "", String(fcur))); fn.appendChild(document.createTextNode(" / " + fmax)); fh.appendChild(fn);
      fu.appendChild(fh);
      var fbar = barraPontos("Fúria", fmax, fcur, "pdbar--furia", function (i) { salvaChar(c, { furiaAtual: i < fcur ? i : i + 1 }); },
        function (i) { return (i < fcur ? "Esvaziar a partir do ponto " : "Encher até o ponto ") + (i + 1) + " de Fúria"; });
      var fwrap = el("div", "furiabar" + (fcur >= fmax ? " is-max" : "")); fwrap.style.setProperty("--pd-max", String(fmax));
      fwrap.appendChild(fbar); fu.appendChild(fwrap);
      b.appendChild(fu);
    }
    // Pontos do Dragão (toque numa parte para definir o atual)
    if (R.pdMax) {
      var pmax = R.pdMax(c), pcur = R.pdAtual(c);
      var pd = el("div", "fvital fvital--pd");
      var ph = el("div", "fvital__head");
      ph.appendChild(el("span", "fvital__label", "PD"));
      var pn = el("span", "fvital__nums"); pn.appendChild(el("b", "", String(pcur))); pn.appendChild(document.createTextNode(" / " + pmax)); ph.appendChild(pn);
      pd.appendChild(ph);
      pd.appendChild(barraPontos("Pontos do Dragão", pmax, pcur, "", function (i) { salvaChar(c, { pdAtual: pcur === i + 1 ? i : i + 1 }); },
        function (i) { return "Definir " + (i + 1) + " de " + pmax + " Pontos do Dragão"; }));
      b.appendChild(pd);
    }
    return b;
  }

  function attrBlock(c) {
    var b = box();
    b.appendChild(el("h3", "", "Atributos"));
    var orb = el("div", "orb");
    DBOOrb.render(orb, {
      editing: false,
      pl: R.powerLevel(c),
      onRoll: function (a) {
        if (window.DBOPrato && DBOPrato.ocupado()) return;
        var natural = die(20);
        var aplicar = function () { attrRoll = { label: a.label, natural: natural, mod: a.mod, total: natural + a.mod }; render(); };
        if (window.DBOPrato) DBOPrato.rolar("Teste de " + a.label, [{ lados: 20, valor: natural }], aplicar, { fixos: [{ rot: a.label, val: a.mod }], total: natural + a.mod }); else aplicar();
      },
      attrs: D.ATTRIBUTES.map(function (a) {
        var raw = (c.atributos || {})[a[0]] || 0;
        return { key: a[0], label: a[1], abbr: a[2], raw: raw, mod: R.mod(c, a[0]) };
      })
    });
    b.appendChild(orb);
    if (attrRoll) {
      var r = attrRoll;
      var p = el("div", "attr-roll" + (r.natural === 20 ? " attr-roll--crit" : r.natural === 1 ? " attr-roll--fail" : ""));
      p.setAttribute("role", "status");
      var close = el("button", "rollclose", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Fechar o teste de " + r.label);
      close.addEventListener("click", function () { attrRoll = null; render(); });
      p.appendChild(close);
      p.appendChild(el("b", "attr-roll__total", String(r.total)));
      var detail = el("span", "attr-roll__detail");
      detail.appendChild(el("strong", "", "Teste de " + r.label));
      detail.appendChild(el("small", "", "d20 " + r.natural + " " + signed(r.mod)));
      p.appendChild(detail);
      b.appendChild(p);
    }
    return b;
  }

  function techBlock(c) {
    var b = box();
    b.appendChild(el("h3", "", "Técnicas"));
    var techs = (c.tecnicas || []).filter(function (t) { return !t.guardada; });
    if (!techs.length) { b.appendChild(el("p", "empty", "Nenhuma técnica ainda.")); return b; }
    var ul = el("ul", "techs");
    techs.forEach(function (t) {
      ul.appendChild(A.node(t, t.id, "li", true, c, ctxFor(c, function (custo, hp) {
        var cur = atual(c);
        DBOCharacters.update(cur.id, { kpAtual: semKp(cur, custo), hpAtual: hpDepois(cur, hp), tecnicas: (cur.tecnicas || []).map(function (x) {
          return x.id === t.id ? Object.assign({}, x, { usos: (Number(x.usos) || 0) + A.usosPorUso(cur) }) : x;
        }) });
        render();
      })));
    });
    b.appendChild(ul);
    return b;
  }

  // Técnicas de classe: o Rugir do Dragão em cima (gasta Pontos do Dragão), depois as habilidades de classe e de sub-classe.
  function classBlock(c) {
    var pd = R.gastoDragao(c), grupos = R.agrupadas(c);
    if (!pd && !grupos.length) return null;
    var b = box("fight-class");
    b.appendChild(el("h3", "", "Técnicas de Classe"));
    var ul = el("ul", "techs");
    if (pd) {
      var ctxPd = ctxFor(c, null);
      ctxPd.onPd = function (n) {
        var cur = atual(c);
        try { DBOCharacters.update(cur.id, { pdAtual: Math.max(0, R.pdAtual(cur) - n) }); UI.toast("Rugir do Dragão usado: −" + n + " PD."); } catch (err) { UI.toast(err.message); }
        render();
      };
      ul.appendChild(A.node(A.daClasse(pd, c), pd.id, "li", false, c, ctxPd));
    }
    grupos.forEach(function (g) {
      var a = g.def.generica ? A.daGenerica(g.def, g.copias, c) : g.def.exclusiva ? A.daExclusiva(g.def, g.copias, c) : A.daClasse(g.def, c);
      var usar = g.def.cura ? function (custo) { var cur = atual(c); try { DBOCharacters.update(cur.id, { kpAtual: semKp(cur, custo) }); } catch (err) { UI.toast(err.message); } render(); } : null;
      ul.appendChild(A.node(a, g.def.id, "li", false, c, ctxFor(c, usar)));
    });
    b.appendChild(ul);
    return b;
  }

  function itemBlock(c) {
    var b = box();
    b.appendChild(el("h3", "", "Equipamentos"));
    var items = c.equipamentos || [];
    if (!items.length) { b.appendChild(el("p", "empty", "Nenhum equipamento ainda.")); return b; }
    var ul = el("ul", "items");
    items.forEach(function (it) {
      var li = el("li", "item");
      var ability = it.habilidade && typeof it.habilidade === "object" ? it.habilidade : null;
      var head = el("div", "item__head");
      head.appendChild(el("h4", "item__name", it.nome));
      if (ability) head.appendChild(el("span", "tag", ability.nome));
      else if (it.habilidade) head.appendChild(el("span", "tag", it.habilidade));
      li.appendChild(head);
      if (it.descricao) li.appendChild(el("p", "item__desc", it.descricao));
      if (ability) {
        li.appendChild(el("p", "item__ability-title", "Habilidade do equipamento"));
        li.appendChild(A.node(ability, "item-" + it.id, "div", false, c, ctxFor(c, function (custo, hp) {
          var cur = atual(c);
          DBOCharacters.update(cur.id, { kpAtual: semKp(cur, custo), hpAtual: hpDepois(cur, hp), equipamentos: (cur.equipamentos || []).map(function (x) {
            if (x.id !== it.id || !x.habilidade || typeof x.habilidade !== "object") return x;
            return Object.assign({}, x, { habilidade: Object.assign({}, x.habilidade, { usos: (Number(x.habilidade.usos) || 0) + A.usosPorUso(cur) }) });
          }) });
          render();
        })));
      }
      ul.appendChild(li);
    });
    b.appendChild(ul);
    return b;
  }

  function fichaInto(node) {
    node.textContent = "";
    var mine = C.mine();
    if (!mine) { node.appendChild(aviso("Você ainda não registrou um personagem na campanha.", "Ir para Jogadores", "jogadores.html")); return; }
    var c = atual(mine.char);
    S.definirPersonagem(c);
    node.appendChild(headBlock(c));
    node.appendChild(vitalBlock(c));
    node.appendChild(efeitosBlock(c));
    node.appendChild(attrBlock(c));
    var cls = classBlock(c);
    if (cls) node.appendChild(cls);
    node.appendChild(techBlock(c));
    node.appendChild(itemBlock(c));
  }

  /* =========================================================================
     ALVOS (pop-up depois de "Usar" quando há combate)
     ========================================================================= */
  // Como a técnica escolhe alvos: null (só em quem usa), { tipo: "ser" }, { tipo: "area" } ou { tipo: "n", n }.
  function modoAlvo(t) {
    var FX = window.DBOEfeitos;
    if (A.temDano(t)) {
      if (t.danoAlvo === "conj") return null;
      if (t.danoAlvo === "area") return { tipo: "area" };
      if (t.danoAlvo === "n") return { tipo: "n", n: FX ? FX.clampN(t.danoN) : Math.max(2, Number(t.danoN) || 2) };
      return { tipo: "ser" };   // "ser" e técnicas antigas
    }
    var lista = FX && FX.itens ? FX.itens(t) : [], modo = null;
    lista.forEach(function (e) {
      if (e.alvo === "area" || e.alvo === "atingidos") modo = { tipo: "area" };
      else if (e.alvo === "n" && (!modo || modo.tipo === "ser")) modo = { tipo: "n", n: e.n || 2 };
      else if ((e.alvo === "ser" || e.alvo === "golpe") && !modo) modo = { tipo: "ser" };
    });
    return modo;
  }
  var dlgAlvos = null;
  function escolherAlvos(t, prosseguir) {
    var modo = modoAlvo(t), ordem = K.active() ? K.ordem() : [];
    if (!modo || !ordem.length) return prosseguir([]);
    if (!dlgAlvos) { dlgAlvos = el("dialog", "modal sess-alvos"); dlgAlvos.setAttribute("aria-labelledby", "alvos-titulo"); document.body.appendChild(dlgAlvos); }
    var d = dlgAlvos;
    d.textContent = "";
    var x = el("button", "modal__close", "×"); x.type = "button"; x.setAttribute("aria-label", "Cancelar"); x.addEventListener("click", function () { d.close(); });
    d.appendChild(x);
    var h = el("h2", "", "Alvo(s)"); h.id = "alvos-titulo"; d.appendChild(h);
    d.appendChild(el("p", "modal__lead", t.nome + " · " + (modo.tipo === "ser" ? "escolha 1 alvo." : modo.tipo === "area" ? "área: escolha um ou mais alvos (botão + para mais um)." : "até " + modo.n + " seres: escolha de 1 a " + modo.n + " alvos.")));
    var lista = el("div", "sess-alvos__lista");
    d.appendChild(lista);
    var cont = 0;
    function novoSeletor(removivel) {
      cont++;
      var linha = el("div", "sess-alvos__linha");
      var lab = el("label", "sr-only", "Alvo " + cont); lab.htmlFor = "alvo-" + cont;
      var sel = el("select"); sel.id = "alvo-" + cont;
      sel.appendChild(new Option(modo.tipo === "n" && cont > 1 ? "— (nenhum)" : "Escolha um alvo", ""));
      ordem.forEach(function (e) { sel.appendChild(new Option(e.nome + (K.isMine(e) ? " (você)" : e.tipo === "npc" ? " · NPC" : ""), e.id)); });
      linha.appendChild(lab); linha.appendChild(sel);
      if (removivel) {
        var rm = el("button", "round", "×"); rm.type = "button"; rm.setAttribute("aria-label", "Tirar este alvo");
        rm.addEventListener("click", function () { linha.remove(); });
        linha.appendChild(rm);
      }
      lista.appendChild(linha);
      return sel;
    }
    var primeiro = novoSeletor(false);
    if (modo.tipo === "n") for (var i = 1; i < modo.n; i++) novoSeletor(false);
    if (modo.tipo === "area") {
      var mais = el("button", "btn btn--ghost sess-alvos__mais", "+"); mais.type = "button"; mais.setAttribute("aria-label", "Adicionar mais um alvo");
      mais.addEventListener("click", function () { novoSeletor(true).focus(); });
      d.appendChild(mais);
    }
    var msg = el("p", "msg"); msg.setAttribute("role", "alert"); d.appendChild(msg);
    var acts = el("div", "modal__actions");
    var cancel = el("button", "btn btn--ghost", "Cancelar"); cancel.type = "button";
    var ok = el("button", "btn", "Confirmar"); ok.type = "button";
    acts.appendChild(cancel); acts.appendChild(ok); d.appendChild(acts);
    cancel.addEventListener("click", function () { d.close(); });
    ok.addEventListener("click", function () {
      var ids = [];
      lista.querySelectorAll("select").forEach(function (s) { if (s.value) ids.push(s.value); });
      if (!ids.length) { msg.textContent = "Escolha pelo menos um alvo."; msg.className = "msg msg--error"; return; }
      if (ids.some(function (v, i) { return ids.indexOf(v) !== i; })) { msg.textContent = "Cada alvo só pode ser escolhido uma vez."; msg.className = "msg msg--error"; return; }
      d.close();
      prosseguir(ids.map(function (id) { var e = ordem.filter(function (o) { return o.id === id; })[0]; return { id: id, nome: e ? e.nome : "" }; }));
    });
    d.showModal();
    primeiro.focus();
  }

  /* =========================================================================
     LOG (direita da Sessão)
     ========================================================================= */
  function hora(iso) { var d = new Date(iso); return isNaN(d) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  var D20 = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 43 14v20L24 45 5 34V14z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 3 14 20h20zM14 20 5 14M34 20l9-6M14 20l10 25 10-25M14 20 5 34M34 20l9 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" opacity=".55"/></svg>';
  function rolagemNode(m) {
    var d = m.dados || {}, tipo = d.tipo || "outro";
    var crit = (tipo === "atributo" || tipo === "teste") && d.natural === 20 ? "is-crit" : (tipo === "atributo" || tipo === "teste") && d.natural === 1 ? "is-fail" : "";
    var n = el("div", "roll-embed roll-embed--" + tipo + (crit ? " " + crit : ""));
    if (crit) n.appendChild(el("span", "roll-embed__crit", ""));
    var dado = el("span", "roll-embed__die"); dado.innerHTML = D20;
    dado.appendChild(el("b", "", String(d.total != null ? UI.fmt(d.total) : "?")));
    n.appendChild(dado);
    var corpo = el("div", "roll-embed__body");
    corpo.appendChild(el("b", "roll-embed__nome", d.personagem || m.autor_nome));
    var rot = tipo === "atributo" ? d.nome : tipo === "dano" ? d.nome : tipo === "teste" ? d.nome : d.nome || "Rolagem";
    corpo.appendChild(el("span", "roll-embed__tipo", rot));
    var det = (tipo === "atributo" ? "Teste de atributo" : tipo === "teste" ? "Teste" : tipo === "dano" ? (d.cura ? "Cura" : "Dano") : "Rolagem") +
      (d.detalhe ? " · " + d.detalhe : "") + (crit === "is-crit" ? " · Crítico!" : crit === "is-fail" ? " · Falha crítica" : "");
    corpo.appendChild(el("small", "roll-embed__det", det));
    n.appendChild(corpo);
    n.appendChild(el("time", "roll-embed__hora", hora(m.criado_em)));
    return n;
  }
  // Modo lixeira (mestre): escolher mensagens para apagar.
  var selecao = null;   // null = desligado; senão { id: true }
  // Abas do log (só o mestre): "msg" = Mensagens (o que os jogadores escrevem) · "dados" = rolagens, técnicas usadas e avisos do sistema.
  var abaLog = lerPref("dbo-sess-log", "msg") === "dados" ? "dados" : "msg";
  var vistos = null;    // maior id já visto em cada aba (para o número de novidades na outra aba)
  function daAba(m, aba) { return aba === "msg" ? m.tipo === "msg" : m.tipo !== "msg"; }
  function marcavel(li, m) {
    if (!selecao || m.pendente) return li;
    li.classList.add("is-marcavel");
    var on = !!selecao[m.id];
    li.classList.toggle("is-marcada", on);
    li.setAttribute("role", "checkbox"); li.setAttribute("aria-checked", String(on)); li.tabIndex = 0;
    var alterna = function () { if (selecao[m.id]) delete selecao[m.id]; else selecao[m.id] = true; atualizarLog(true); atualizarRodapeLog(); };
    li.addEventListener("click", function (e) { if (e.target.closest("button")) return; alterna(); });
    li.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); alterna(); } });
    var cx = el("span", "slog__check"); cx.setAttribute("aria-hidden", "true"); li.insertBefore(cx, li.firstChild);
    return li;
  }
  function mensagemNode(m, naFixa) {
    if (m.tipo === "rolagem") { var li0 = el("li", "slog__item slog__item--rolagem"); li0.appendChild(rolagemNode(m)); return naFixa ? li0 : marcavel(li0, m); }
    var sis = m.tipo === "sistema" || m.tipo === "uso";
    var li = el(naFixa ? "div" : "li", "slog__item" + (sis ? " slog__item--sis" : "") + (m.pendente ? " is-pendente" : ""));
    var head = el("div", "slog__head");
    head.appendChild(el("b", "slog__autor", sis ? "Sistema" : m.autor_nome || "Jogador"));
    head.appendChild(el("time", "slog__hora", m.pendente ? "enviando…" : hora(m.criado_em)));
    if (mestre() && m.tipo === "msg" && !m.pendente && !selecao) {
      var pin = el("button", "slog__pin-btn", m.fixada ? "Desfixar" : "Fixar"); pin.type = "button";
      pin.setAttribute("aria-label", (m.fixada ? "Desfixar" : "Fixar") + " a mensagem de " + (m.autor_nome || "Jogador"));
      pin.addEventListener("click", function () { S.fixar(m.id, !m.fixada).then(function () { atualizarLog(true); }).catch(function (err) { UI.toast(err.message); }); });
      head.appendChild(pin);
    }
    li.appendChild(head);
    li.appendChild(el("p", "slog__texto", m.texto));
    return naFixa ? li : marcavel(li, m);
  }
  function montarLog(node) {
    var sec = el("section", "panel-box slog");
    var h = el("div", "slog__top"); h.appendChild(el("h3", "", "Log"));
    if (mestre()) {
      var ferr = el("div", "slog__ferr");
      var lixo = el("button", "slog__lixo", ""); lixo.type = "button";
      lixo.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      lixo.setAttribute("aria-label", "Escolher mensagens para apagar"); lixo.title = "Apagar mensagens";
      lixo.setAttribute("aria-pressed", String(!!selecao));
      lixo.addEventListener("click", function () { selecao = selecao ? null : {}; lixo.setAttribute("aria-pressed", String(!!selecao)); atualizarLog(true); atualizarRodapeLog(); });
      var limpar = el("button", "slog__limpar", abaLog === "dados" ? "Limpar dados" : "Limpar mensagens"); limpar.type = "button";
      limpar.addEventListener("click", confirmarLimpar);
      ferr.appendChild(lixo); ferr.appendChild(limpar);
      h.appendChild(ferr);
      sec.appendChild(h);
      // abas: Mensagens / Dados
      var abas = el("div", "slog__abas"); abas.setAttribute("role", "tablist"); abas.setAttribute("aria-label", "Partes do log");
      [["msg", "Mensagens"], ["dados", "Dados"]].forEach(function (a) {
        var b = el("button", "slog__aba"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.aba = a[0];
        b.setAttribute("aria-selected", String(abaLog === a[0]));
        b.appendChild(el("span", "", a[1]));
        var badge = el("span", "slog__novas"); badge.hidden = true; b.appendChild(badge);
        b.addEventListener("click", function () {
          if (abaLog === a[0]) return;
          abaLog = a[0]; gravarPref("dbo-sess-log", abaLog);
          selecao = null;
          abas.querySelectorAll(".slog__aba").forEach(function (x) { x.setAttribute("aria-selected", String(x.dataset.aba === abaLog)); });
          limpar.textContent = abaLog === "dados" ? "Limpar dados" : "Limpar mensagens";
          dica.textContent = abaLog === "dados" ? "Rolagens, técnicas usadas e avisos do sistema. Só você vê." : "O que os jogadores escrevem no log.";
          lixo.setAttribute("aria-pressed", "false");
          atualizarLog(true); atualizarRodapeLog();
        });
        abas.appendChild(b);
      });
      sec.appendChild(abas);
      var dica = el("p", "slog__dica", abaLog === "dados" ? "Rolagens, técnicas usadas e avisos do sistema. Só você vê." : "O que os jogadores escrevem no log.");
      sec.appendChild(dica);
    } else sec.appendChild(h);
    var pin = el("div", "slog__fixada"); pin.hidden = true;
    var list = el("ol", "slog__list"); list.setAttribute("aria-live", "polite"); list.setAttribute("aria-label", "Mensagens da sessão");
    var form = el("form", "slog__form"); form.noValidate = true;
    var lab = el("label", "sr-only", "Mensagem"); lab.htmlFor = "slog-msg";
    var ta = el("textarea"); ta.id = "slog-msg"; ta.rows = 2; ta.maxLength = 500; ta.placeholder = "Deixe uma mensagem no log…";
    var send = el("button", "btn", "Enviar"); send.type = "submit";
    form.appendChild(lab); form.appendChild(ta); form.appendChild(send);
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
    // A mensagem aparece na hora (enviando…) e vai para o banco em segundo plano.
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = ta.value.trim();
      if (!t) return;
      ta.value = "";
      var p = S.postar(t);
      atualizarLog(true);
      p.then(function () { atualizarLog(true); }).catch(function (err) { UI.toast("Mensagem não enviada: " + err.message); if (!ta.value) ta.value = t; atualizarLog(true); });
      ta.focus();
    });
    // No modo lixeira, o campo de mensagem dá lugar a "Remover mensagens (n)".
    var rem = el("div", "slog__rem"); rem.hidden = true;
    var remBtn = el("button", "btn btn--danger slog__rem-btn", "Remover mensagens (0)"); remBtn.type = "button";
    var remCancel = el("button", "btn btn--ghost", "Cancelar"); remCancel.type = "button";
    remBtn.addEventListener("click", function () {
      var ids = Object.keys(selecao || {}).map(function (k) { return /^\d+$/.test(k) ? Number(k) : k; });
      if (!ids.length) return;
      selecao = null;
      S.apagar(ids).catch(function (err) { UI.toast(err.message); }).then(function () { atualizarLog(true); });
      sairSelecao();
    });
    remCancel.addEventListener("click", function () { selecao = null; sairSelecao(); });
    rem.appendChild(remBtn); rem.appendChild(remCancel);
    sec.appendChild(pin); sec.appendChild(list); sec.appendChild(form); sec.appendChild(rem);
    node.appendChild(sec);
    regions.log = { sec: sec, pin: pin, list: list, form: form, rem: rem, remBtn: remBtn, sig: "" };
    setTimeout(ajustarLog, 0);
    setTimeout(function () { atualizarLog(true); }, 0);   // depois que o painel entra na página
  }
  function sairSelecao() {
    var r = regions.log; if (!r) return;
    var lx = r.sec.querySelector(".slog__lixo"); if (lx) lx.setAttribute("aria-pressed", "false");
    atualizarLog(true); atualizarRodapeLog();
  }
  function atualizarRodapeLog() {
    var r = regions.log; if (!r) return;
    var n = selecao ? Object.keys(selecao).length : 0;
    r.form.hidden = !!selecao || (mestre() && abaLog === "dados");   // em Dados não se escreve
    r.rem.hidden = !selecao;
    r.remBtn.textContent = "Remover mensagens (" + n + ")"; r.remBtn.disabled = !n;
    r.sec.classList.toggle("is-selecionando", !!selecao);
  }
  // Altura do log: cabe na tela do ponto onde começa até o fim, com o campo de mensagem sempre à vista.
  function ajustarLog() {
    var r = regions.log;
    if (!r || !r.sec.isConnected) return;
    var topo = r.sec.getBoundingClientRect().top + window.scrollY;
    var cel = window.matchMedia("(max-width: 1080px)").matches;
    var h = cel ? window.innerHeight - 150 : window.innerHeight - Math.min(topo, window.innerHeight * 0.5) - 18;
    r.sec.style.height = Math.max(340, Math.round(h)) + "px";
  }
  window.addEventListener("resize", function () { ajustarLog(); });
  var dlgLimpar = null;
  function confirmarLimpar() {
    if (!dlgLimpar) { dlgLimpar = el("dialog", "modal"); dlgLimpar.setAttribute("aria-labelledby", "lim-titulo"); document.body.appendChild(dlgLimpar); }
    var d = dlgLimpar; d.textContent = "";
    var dados = abaLog === "dados";
    var h = el("h2", "", dados ? "Limpar dados" : "Limpar mensagens"); h.id = "lim-titulo"; d.appendChild(h);
    d.appendChild(el("p", "modal__lead", dados
      ? "Deseja mesmo limpar os dados? Todas as rolagens, técnicas usadas e avisos do sistema somem. As mensagens continuam."
      : "Deseja mesmo limpar as mensagens? Todas as mensagens somem para todo mundo. As rolagens e os avisos continuam em Dados."));
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var yes = el("button", "btn btn--danger", dados ? "Limpar dados" : "Limpar mensagens"); yes.type = "button";
    acts.appendChild(no); acts.appendChild(yes); d.appendChild(acts);
    no.addEventListener("click", function () { d.close(); });
    yes.addEventListener("click", function () {
      d.close(); selecao = null; sairSelecao();
      S.limpar(dados ? "dados" : "msg").catch(function (err) { UI.toast(err.message); }).then(function () { atualizarLog(true); });
      atualizarLog(true);
    });
    d.showModal(); no.focus();
  }
  function atualizarLog(forcar) {
    var r = regions.log;
    if (!r || !r.list.isConnected) return;
    var tudo = S.log(), fx = S.fixada(), m0 = mestre();
    var log = m0 ? tudo.filter(function (m) { return daAba(m, abaLog); }) : tudo;
    if (m0) {   // novidades na outra aba (número ao lado do nome)
      var maior = function (aba) { return tudo.reduce(function (mx, m) { return typeof m.id === "number" && daAba(m, aba) && m.id > mx ? m.id : mx; }, 0); };
      if (!vistos) vistos = { msg: maior("msg"), dados: maior("dados") };
      vistos[abaLog] = Math.max(vistos[abaLog], maior(abaLog));
      r.sec.querySelectorAll(".slog__aba").forEach(function (b) {
        var aba = b.dataset.aba, n = aba === abaLog ? 0 : tudo.filter(function (m) { return typeof m.id === "number" && daAba(m, aba) && m.id > vistos[aba]; }).length;
        var badge = b.querySelector(".slog__novas"); badge.hidden = !n; badge.textContent = n > 99 ? "99+" : String(n);
        b.setAttribute("aria-label", b.firstChild.textContent + (n ? " (" + n + (n === 1 ? " nova)" : " novas)") : ""));
      });
    }
    if (m0 && abaLog === "dados") fx = null;   // a mensagem fixada fica em Mensagens
    var sig = abaLog + "|" + log.map(function (m) { return m.id + (m.fixada ? "f" : ""); }).join(",") + "|" + (fx ? fx.id : 0);
    if (!forcar && sig === r.sig) return;
    r.sig = sig;
    var perto = r.list.scrollHeight - r.list.scrollTop - r.list.clientHeight < 80;
    r.list.textContent = "";
    if (!log.length) r.list.appendChild(el("li", "slog__vazio", m0 && abaLog === "dados" ? "Nenhuma rolagem ainda." : "Nenhuma mensagem ainda."));
    log.forEach(function (m) { r.list.appendChild(mensagemNode(m)); });
    r.list.setAttribute("aria-label", m0 && abaLog === "dados" ? "Rolagens e avisos da sessão" : "Mensagens da sessão");
    atualizarRodapeLog();
    r.pin.textContent = "";
    r.pin.hidden = !fx;
    if (fx) {
      r.pin.appendChild(el("span", "slog__fixada-rot", "Mensagem fixada"));
      r.pin.appendChild(mensagemNode(Object.assign({}, fx, { fixada: true }), true));
    }
    if (perto || forcar) r.list.scrollTop = r.list.scrollHeight;
  }

  /* =========================================================================
     JOGADORES NA SESSÃO, NPCs e ORDEM DE INICIATIVA
     ========================================================================= */
  function jogadoresInto(node) {
    node.textContent = "";
    var sec = el("section", "panel-box sess-jog");
    sec.appendChild(el("h3", "", "Jogadores"));
    var lista = S.aceitos();
    if (!lista.length) sec.appendChild(el("p", "empty", "Nenhum jogador na sessão ainda."));
    var ul = el("ul", "sess-jog__lista");
    lista.forEach(function (m) {
      var c = charDoMembro(m) || { nome: "Personagem", classe: "", raca: "" };
      var li = el("li", "sess-jog__item");
      if (mestre() && c.id) arrastavel(li, { id: c.id, nome: c.nome, foto: c.foto || "" });
      li.appendChild(avatar(c, "sess-port"));
      var info = el("div", "sess-jog__info");
      info.appendChild(el("b", "", c.nome));
      info.appendChild(el("span", "", [c.classe, c.raca].filter(Boolean).join(" · ")));
      info.appendChild(el("small", "", "Jogador: " + (m.nome || "—")));
      li.appendChild(info);
      if (mestre()) {
        var rm = el("button", "order__x", "×"); rm.type = "button"; rm.title = "Tirar da sessão";
        rm.setAttribute("aria-label", "Tirar " + (m.nome || "jogador") + " da sessão");
        var armado = false, tm;
        rm.addEventListener("click", function () {
          if (!armado) { armado = true; rm.classList.add("is-armed"); rm.textContent = "?"; tm = setTimeout(function () { armado = false; rm.classList.remove("is-armed"); rm.textContent = "×"; }, 4000); UI.toast("Clique de novo para tirar " + (m.nome || "o jogador") + " da sessão."); return; }
          clearTimeout(tm);
          S.remover(m.usuario_id).then(atualizarMembros).catch(function (err) { UI.toast(err.message); });
        });
        li.appendChild(rm);
      }
      ul.appendChild(li);
    });
    if (lista.length) sec.appendChild(ul);
    if (mestre()) npcsDaSessao(sec);
    node.appendChild(sec);
    marcarNoMapa(sec);
  }
  // Mestre: os jogadores e NPCs da lista vão para o mapa arrastados (ou com um clique, no meio da vista).
  // Soltar um token do mapa em cima desta lista tira ele do mapa.
  function arrastavel(li, p) {
    li.dataset.pid = p.id;
    li.classList.add("is-arrastavel");
    li.addEventListener("pointerdown", function (e) {
      if (!mapaInst || e.target.closest("button, a, select, input")) return;
      mapaInst.arrastarPersonagem(p, li, e);
    });
    li.addEventListener("click", function (e) {
      if (!mapaInst || li._arrastou || e.target.closest("button, a, select, input")) return;
      if (mapaInst.noMapa(p.id)) return UI.toast(p.nome + " já está no mapa. Arraste o token para mover, ou solte-o aqui na lista para tirar.");
      mapaInst.porNoMeio(p);
    });
  }
  function marcarNoMapa(sec) {
    sec = sec && sec.nodeType ? sec : document.querySelector(".sess-jog"); if (!sec) return;
    sec.classList.toggle("tem-mapa", !!mapaInst && mestre());
    sec.querySelectorAll("[data-pid]").forEach(function (li) {
      var no = !!mapaInst && mapaInst.noMapa(li.dataset.pid);
      li.classList.toggle("is-no-mapa", no);
      li.title = !mapaInst ? "" : no ? "No mapa · solte o token aqui para tirar do mapa" : "Arraste para o mapa (ou clique para pôr no meio da vista)";
    });
  }
  // NPCs na sessão (só o mestre vê esta parte): abaixo dos jogadores, depois de uma linha escrita "NPCs".
  function npcsDaSessao(sec) {
    var sep = el("div", "sess-sep"); sep.appendChild(el("span", "", "NPCs")); sec.appendChild(sep);
    var lista = S.npcs();
    if (lista.length) {
      var ul = el("ul", "sess-jog__lista sess-jog__lista--npc");
      lista.forEach(function (n) {
        var li = el("li", "sess-jog__item sess-jog__item--npc");
        arrastavel(li, { id: n.personagem_id, nome: n.nome, foto: n.foto || "", npc: true, tamanho: n.tamanho });
        li.appendChild(avatar({ nome: n.nome, foto: n.foto }, "sess-port"));
        var info = el("div", "sess-jog__info");
        info.appendChild(el("b", "", n.nome));
        var ficha = DBOCharacters.get(n.personagem_id);
        info.appendChild(el("span", "", ficha ? [ficha.classe, ficha.raca, "nível " + ficha.nivel].filter(Boolean).join(" · ") : "NPC"));
        info.appendChild(el("small", "", "Tamanho: " + (window.DBOTamanho ? DBOTamanho.nome(n.tamanho) : n.tamanho)));
        li.appendChild(info);
        var rm = el("button", "order__x", "×"); rm.type = "button"; rm.title = "Tirar da sessão";
        rm.setAttribute("aria-label", "Tirar " + n.nome + " da sessão");
        var armado = false, tm;
        rm.addEventListener("click", function () {
          if (!armado) { armado = true; rm.classList.add("is-armed"); rm.textContent = "?"; tm = setTimeout(function () { armado = false; rm.classList.remove("is-armed"); rm.textContent = "×"; }, 4000); UI.toast("Clique de novo para tirar " + n.nome + " da sessão (o token sai do mapa)."); return; }
          clearTimeout(tm);
          M.removerToken("p:" + n.personagem_id).catch(function () {});
          S.removerNpc(n.personagem_id).then(function () { atualizarMembros(); atualizarMapa(); }).catch(function (err) { UI.toast(err.message); });
        });
        li.appendChild(rm);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
    }
    // Adicionar NPC: escolhe no select e abre a janela do tamanho
    var dentro = {}; lista.forEach(function (n) { dentro[n.personagem_id] = true; });
    // Também entram os personagens do próprio mestre (as fichas dele que não são NPC), num grupo à parte.
    var porNome = function (a, b) { return String(a.nome).localeCompare(String(b.nome), "pt-BR"); };
    var npcsMestre = (DBOCharacters.npcs ? DBOCharacters.npcs() : []).filter(function (c) { return !dentro[c.id]; }).sort(porNome);
    var fichasMestre = (DBOCharacters.list ? DBOCharacters.list() : []).filter(function (c) { return !dentro[c.id]; }).sort(porNome);
    var meus = npcsMestre.concat(fichasMestre);
    var existe = (DBOCharacters.npcs ? DBOCharacters.npcs().length : 0) + (DBOCharacters.list ? DBOCharacters.list().length : 0);
    var box = el("div", "field sess-npc-add");
    var lab = el("label", "", "Adicionar NPC"); lab.htmlFor = "sess-npc-sel";
    var sel = el("select"); sel.id = "sess-npc-sel";
    sel.appendChild(new Option(meus.length ? "Escolha um NPC…" : (existe ? "Todos já estão na sessão" : "Nenhum NPC criado ainda"), ""));
    [["NPCs", npcsMestre], ["Seus personagens", fichasMestre]].forEach(function (g) {
      if (!g[1].length) return;
      var og = el("optgroup"); og.label = g[0];
      g[1].forEach(function (c) { og.appendChild(new Option(c.nome + " · nível " + c.nivel, c.id)); });
      sel.appendChild(og);
    });
    sel.disabled = !meus.length;
    sel.addEventListener("change", function () {
      var c = meus.filter(function (x) { return x.id === sel.value; })[0];
      sel.value = "";
      if (c) janelaAdicionarNpc(c);
    });
    box.appendChild(lab); box.appendChild(sel);
    if (!existe) { var a = el("a", "sess-npc-link", "Criar NPCs na aba NPCs ↗"); a.href = "npcs.html"; a.target = "_blank"; a.rel = "noopener"; box.appendChild(a); }
    sec.appendChild(box);
  }
  // Janela: "Tamanho original?" marcado = usa o tamanho da ficha; desmarcado = escolhe outro (e ele fica salvo na ficha).
  function janelaAdicionarNpc(c) {
    var dlg = document.getElementById("sess-npc-dlg");
    if (!dlg) { dlg = el("dialog", "modal sess-npc-dlg"); dlg.id = "sess-npc-dlg"; dlg.setAttribute("aria-labelledby", "sess-npc-t"); document.body.appendChild(dlg); }
    dlg.textContent = "";
    var h = el("h2", "", "Adicionar " + c.nome); h.id = "sess-npc-t"; dlg.appendChild(h);
    var orig = c.tamanho || "normal";
    dlg.appendChild(el("p", "modal__lead", "Tamanho na ficha: " + DBOTamanho.nome(orig) + "."));
    var chkL = el("label", "check sess-npc-orig");
    var chk = el("input"); chk.type = "checkbox"; chk.checked = true;
    chkL.appendChild(chk); chkL.appendChild(el("span", "", "Tamanho original?"));
    dlg.appendChild(chkL);
    var campo = DBOTamanho.campo(orig);
    var caixa = el("div", "sess-npc-tam"); caixa.appendChild(campo.no);
    caixa.appendChild(el("p", "sess-npc-nota", "O tamanho novo também fica salvo na ficha do NPC."));
    caixa.hidden = true; dlg.appendChild(caixa);
    chk.addEventListener("change", function () { caixa.hidden = chk.checked; });
    var msg = el("p", "msg"); msg.setAttribute("role", "alert"); dlg.appendChild(msg);
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var ok = el("button", "btn", "Adicionar à sessão"); ok.type = "button";
    acts.appendChild(no); acts.appendChild(ok); dlg.appendChild(acts);
    no.addEventListener("click", function () { dlg.close(); });
    ok.addEventListener("click", function () {
      var tam = orig;
      if (!chk.checked) {
        try { tam = campo.ler(); } catch (err) { msg.textContent = err.message; msg.className = "msg msg--error"; return; }
        try { DBOCharacters.update(c.id, { tamanho: tam === "normal" ? "" : tam }); } catch (err) { UI.toast("O tamanho não foi salvo na ficha: " + err.message); }
      }
      dlg.close();
      S.adicionarNpc({ personagem_id: c.id, nome: c.nome, foto: c.foto || "", tamanho: tam || "normal" })
        .then(function () { UI.toast(c.nome + " entrou na sessão. Arraste da lista para o mapa para pôr o token."); atualizarMembros(); atualizarMapa(); })
        .catch(function (err) { UI.toast(err.message); atualizarMembros(); });
    });
    dlg.showModal(); chk.focus();
  }

  function npcsInto(node) {
    node.textContent = "";
    var sec = el("section", "panel-box sess-npcs");
    sec.appendChild(el("h3", "", "NPCs na sessão"));
    var npcs = K.active() ? K.ordem().filter(function (e) { return e.tipo === "npc"; }) : [];
    if (!K.active()) sec.appendChild(el("p", "empty", "Inicie o combate (no centro) para colocar NPCs."));
    else if (!npcs.length) sec.appendChild(el("p", "empty", "Nenhum NPC no combate."));
    else {
      var ul = el("ul", "sess-jog__lista");
      npcs.forEach(function (e) {
        var li = el("li", "sess-jog__item");
        li.appendChild(avatar({ nome: e.nome }, "sess-port sess-port--npc"));
        var info = el("div", "sess-jog__info"); info.appendChild(el("b", "", e.nome)); info.appendChild(el("span", "", "Iniciativa " + e.iniciativa));
        li.appendChild(info);
        var x = el("button", "order__x", "×"); x.type = "button"; x.setAttribute("aria-label", "Tirar " + e.nome + " do combate");
        x.addEventListener("click", function () { act(K.remove(e.id)); });
        li.appendChild(x);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
    }
    if (K.active()) {
      sec.appendChild(el("h4", "sess-npcs__add", "Adicionar criatura ou NPC"));
      var form = el("form", "add-npc"); form.noValidate = true;
      function field(label, id, type, attrs) {
        var f = el("div", "field");
        var l = el("label", "", label); l.htmlFor = id;
        var i = el("input"); i.id = id; i.type = type;
        for (var k in attrs) i[k] = attrs[k];
        f.appendChild(l); f.appendChild(i);
        form.appendChild(f);
        return i;
      }
      var nome = field("Nome", "npc-nome", "text", { maxLength: 40, autocomplete: "off" });
      var ini = field("Iniciativa", "npc-ini", "number", { step: 1, inputMode: "numeric" });
      var go = el("button", "btn", "Adicionar"); go.type = "submit"; form.appendChild(go);
      var msg = el("p", "msg"); msg.setAttribute("role", "alert");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var n = nome.value.trim(), raw = String(ini.value).trim();
        if (!n) { msg.textContent = "Dê um nome."; msg.className = "msg msg--error"; return; }
        if (!/^-?\d+$/.test(raw)) { msg.textContent = "A iniciativa precisa ser um número inteiro."; msg.className = "msg msg--error"; return; }
        act(K.addNpc(n, Number(raw))).then(function () { var f = document.getElementById("npc-nome"); if (f) f.focus(); });
      });
      sec.appendChild(form); sec.appendChild(msg);
    }
    node.appendChild(sec);
  }

  var armedReset = false, resetTimer;
  function ordemInto(node) {
    node.textContent = "";
    var round = el("section", "round");
    round.appendChild(el("span", "round__label", "Rodada"));
    var num = el("b", "round__num", String(K.rodada()));
    num.setAttribute("role", "status");
    round.appendChild(num);
    var actions = el("div", "round__actions");
    var next = el("button", "btn", "Próxima rodada"); next.type = "button";
    next.addEventListener("click", function () { act(K.nextRound()); });
    var end = el("button", "btn btn--ghost", armedReset ? "Confirmar: encerrar combate" : "Encerrar combate"); end.type = "button";
    end.addEventListener("click", function () {
      if (!armedReset) { armedReset = true; resetTimer = setTimeout(function () { armedReset = false; renderRight(); }, 4000); return renderRight(); }
      clearTimeout(resetTimer); armedReset = false; initRoll = null;
      act(K.reset()).then(render);
    });
    var vezE = K.active() ? K.ordem().filter(function (e) { return e.id === K.vez(); })[0] : null;
    if (K.active() && K.ordem().length) {
      round.appendChild(el("p", "round__vez", vezE ? "Vez de " + vezE.nome : "A vez ainda não começou"));
      var pass = el("button", "btn btn--turn", vezE ? "Passar turno" : "Começar turnos"); pass.type = "button";
      pass.disabled = !K.podePassar();
      if (pass.disabled) pass.title = "Só o mestre ou quem está na vez pode passar o turno.";
      pass.addEventListener("click", function () { act(K.passarTurno()).then(render); });
      actions.appendChild(pass);
    }
    if (K.canManage() && K.active()) { actions.appendChild(next); actions.appendChild(end); }
    round.appendChild(actions);
    node.appendChild(round);
    if (!K.active()) {
      var wait = box();
      if (K.canManage()) {
        wait.appendChild(el("p", "", "Não há combate em andamento."));
        var st = el("button", "btn", "Iniciar combate"); st.type = "button";
        st.addEventListener("click", function () { act(K.start()); });
        wait.appendChild(st);
      } else wait.appendChild(el("p", "empty", "Aguardando o mestre iniciar o combate. A tela atualiza sozinha."));
      node.appendChild(wait);
      return;
    }
    var order = box();
    order.appendChild(el("h3", "", "Ordem de iniciativa"));
    var list = K.ordem();
    if (!list.length) order.appendChild(el("p", "empty", "Ninguém entrou no combate ainda. Role a iniciativa" + (K.canManage() ? " ou adicione um NPC." : ".")));
    else {
      var ol = el("ol", "order order--port");
      var vez = K.vez();
      list.forEach(function (e) {
        var li = el("li", e.id === vez ? "is-vez" : "");
        if (e.id === vez) li.setAttribute("aria-current", "step");
        var ch = charDoCombatente(e);
        li.appendChild(avatar(ch || { nome: e.nome }, "sess-port" + (e.tipo === "npc" ? " sess-port--npc" : "")));
        var nm = el("span", "order__name", e.nome);
        if (e.tipo === "npc") nm.appendChild(el("small", "order__tag", "NPC"));
        li.appendChild(nm);
        var podeEditar = K.canManage() || K.isMine(e);
        if (editInit === e.id) {
          var f = el("form", "order__edit"); f.noValidate = true;
          var lab = el("label", "sr-only", "Nova iniciativa de " + e.nome); lab.htmlFor = "init-edit"; f.appendChild(lab);
          var inp = el("input", "order__input"); inp.id = "init-edit"; inp.type = "number"; inp.step = 1; inp.inputMode = "numeric"; inp.value = e.iniciativa;
          f.appendChild(inp);
          var ok = el("button", "order__ok", "OK"); ok.type = "submit"; f.appendChild(ok);
          var feito = false;
          var salvarInit = function () {
            if (feito) return; feito = true;
            var raw = String(inp.value).trim(), antes = e.iniciativa;
            editInit = null;
            if (!/^-?\d+$/.test(raw)) { UI.toast("A iniciativa precisa ser um número inteiro."); return renderRight(); }
            if (Number(raw) === antes) return renderRight();
            if (K.isMine(e) && initRoll) initRoll = null;
            act(Promise.resolve(K.setIniciativa(e.id, Number(raw))).then(function () {
              // Aviso no log (só o mestre lê): quem mudou e de quanto para quanto.
              S.sistema("O personagem " + e.nome + " teve sua iniciativa alterada de " + antes + " para " + Number(raw) + " por " + (S.nick() || "alguém") + ".").then(function () { atualizarLog(); });
            }));
          };
          f.addEventListener("submit", function (ev) { ev.preventDefault(); salvarInit(); });
          inp.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { feito = true; editInit = null; renderRight(); } });
          inp.addEventListener("blur", function () { setTimeout(salvarInit, 120); });
          li.appendChild(f);
          setTimeout(function () { inp.focus(); inp.select(); }, 0);
        } else if (podeEditar) {
          var ib = el("button", "order__init order__init--edit", String(e.iniciativa)); ib.type = "button";
          ib.title = "Alterar iniciativa";
          ib.setAttribute("aria-label", "Iniciativa de " + e.nome + ": " + e.iniciativa + ". Clique para alterar.");
          ib.addEventListener("click", function () { editInit = e.id; renderRight(); });
          li.appendChild(ib);
        } else li.appendChild(el("b", "order__init", String(e.iniciativa)));
        if (e.tipo === "npc" ? K.canManage() : K.isMine(e)) {
          var x = el("button", "order__x", "×"); x.type = "button";
          x.setAttribute("aria-label", "Tirar " + e.nome + " do combate");
          x.addEventListener("click", function () { if (e.tipo !== "npc") initRoll = null; act(K.remove(e.id)).then(render); });
          li.appendChild(x);
        } else li.appendChild(el("span", "order__sp"));
        ol.appendChild(li);
      });
      order.appendChild(ol);
    }
    node.appendChild(order);
  }

  /* =========================================================================
     RESUMOS (mestre)
     ========================================================================= */
  function barraResumo(rot, cur, max, cls) {
    var row = el("div", "fvital");
    var head = el("div", "fvital__head");
    head.appendChild(el("span", "fvital__label", rot));
    var nums = el("span", "fvital__nums"); nums.appendChild(el("b", "", UI.fmt(cur))); nums.appendChild(document.createTextNode(" / " + UI.fmt(max)));
    head.appendChild(nums); row.appendChild(head);
    var trk = el("div", "fvital__track"), fill = el("div", "fvital__fill fvital__fill--" + cls);
    fill.style.width = (max ? Math.min(100, Math.max(0, cur / max * 100)) : 0).toFixed(1) + "%";
    trk.appendChild(fill); row.appendChild(trk);
    return row;
  }
  function resumoDetalhe(node, e) {
    node.textContent = "";
    var pub = charDoCombatente(e);
    var head = el("div", "resumo__head");
    head.appendChild(avatar(pub || { nome: e.nome }, "sess-port sess-port--big" + (e.tipo === "npc" ? " sess-port--npc" : "")));
    var hi = el("div");
    hi.appendChild(el("h3", "", e.nome));
    if (e.tipo === "npc") { hi.appendChild(el("p", "", "NPC · iniciativa " + e.iniciativa)); head.appendChild(hi); node.appendChild(head); node.appendChild(el("p", "empty", "NPCs não têm ficha no site.")); return; }
    var pid = e.personagem_id || (pub && pub.id);
    var c = pid ? fichaCompleta(pid) : null;
    if (!c) {
      head.appendChild(hi); node.appendChild(head);
      node.appendChild(el("p", "empty", "Carregando a ficha…"));
      if (pid && DBOCharacters.hydrate) DBOCharacters.hydrate(pid).then(function () { if (resumoSel === e.id) resumoDetalhe(node, e); }).catch(function () {});
      return;
    }
    if (!c.tecnicas && DBOCharacters.hydrate) DBOCharacters.hydrate(c.id).then(function () { if (resumoSel === e.id) resumoDetalhe(node, e); }).catch(function () {});
    hi.appendChild(el("p", "", [c.classe, c.subclasse, c.raca + (c.subraca ? " (" + c.subraca + ")" : ""), "nível " + UI.fmt(c.nivel)].filter(Boolean).join(" · ")));
    hi.appendChild(el("p", "resumo__ini", "Iniciativa " + e.iniciativa));
    head.appendChild(hi); node.appendChild(head);

    var grid = el("div", "resumo__grid");
    var vit = el("section", "resumo__bloco"); vit.appendChild(el("h4", "", "Vitalidade"));
    vit.appendChild(barraResumo("HP", hpDe(c), R.hpMax(c), "hp"));
    vit.appendChild(barraResumo("KP", kpDe(c), R.kpMax(c), "kp"));
    var pdl = el("p", "resumo__linha"); pdl.appendChild(el("b", "", "Pontos do Dragão: ")); pdl.appendChild(document.createTextNode(R.pdAtual(c) + " / " + R.pdMax(c))); vit.appendChild(pdl);
    if (R.furiaMax(c) > 0) { var ful = el("p", "resumo__linha"); ful.appendChild(el("b", "", "Fúria: ")); ful.appendChild(document.createTextNode(R.furiaAtual(c) + " / " + R.furiaMax(c))); vit.appendChild(ful); }
    var tr = window.DBOTransf ? DBOTransf.ativa(c) : null;
    var trl = el("p", "resumo__linha"); trl.appendChild(el("b", "", "Transformação: ")); trl.appendChild(document.createTextNode(tr ? tr.nome : "nenhuma")); vit.appendChild(trl);
    var pl = el("p", "resumo__linha"); pl.appendChild(el("b", "", "Power Level: ")); pl.appendChild(document.createTextNode(UI.fmt(R.powerLevel(c)))); vit.appendChild(pl);
    grid.appendChild(vit);

    var efb = el("section", "resumo__bloco"); efb.appendChild(el("h4", "", "Efeitos ativos"));
    var ativos = window.DBOEfeitos ? DBOEfeitos.ativos(c) : [];
    var pend = A.pendente ? A.pendente(c) : null;
    if (!ativos.length && !pend) efb.appendChild(el("p", "empty", "Nenhum efeito ativo."));
    else {
      var ulE = el("ul", "resumo__lista");
      ativos.forEach(function (x) {
        var def = DBOEfeitos.POR_ID[x.ef];
        var li = el("li", "fx-name--" + def.tipo);
        li.appendChild(el("b", "", DBOEfeitos.rotulo(def, x.param) + " Grau " + DBOEfeitos.ROMANO[x.grau]));
        li.appendChild(document.createTextNode(x.rodadas == null ? " · sem duração" : " · " + x.rodadas + (x.rodadas === 1 ? " rodada" : " rodadas")));
        ulE.appendChild(li);
      });
      if (pend) ulE.appendChild(el("li", "", "Bônus esperando: +" + pend.valor + " em " + (attrName[pend.atributo] || pend.atributo) + " no próximo teste"));
      efb.appendChild(ulE);
    }
    grid.appendChild(efb);

    var hab = el("section", "resumo__bloco"); hab.appendChild(el("h4", "", "Habilidades"));
    var nomes = R.agrupadas(c).map(function (g) { return g.def.nome + (g.copias > 1 ? " (maestria " + g.copias + ")" : ""); });
    var gd = R.gastoDragao(c); if (gd) nomes.unshift(gd.nome);
    var rac = R.habilidadesRaciais ? R.habilidadesRaciais(c).map(function (h) { return h.nome; }) : [];
    if (!nomes.length && !rac.length) hab.appendChild(el("p", "empty", "Nenhuma habilidade de classe ou raça."));
    if (nomes.length) { hab.appendChild(el("p", "resumo__sub", "Classe e sub-classe")); var u1 = el("ul", "resumo__lista"); nomes.forEach(function (n) { u1.appendChild(el("li", "", n)); }); hab.appendChild(u1); }
    if (rac.length) { hab.appendChild(el("p", "resumo__sub", "Raça")); var u2 = el("ul", "resumo__lista"); rac.forEach(function (n) { u2.appendChild(el("li", "", n)); }); hab.appendChild(u2); }
    grid.appendChild(hab);

    var at = el("section", "resumo__bloco"); at.appendChild(el("h4", "", "Atributos"));
    var dl = el("dl", "resumo__attrs");
    D.ATTRIBUTES.forEach(function (a) {
      var w = el("div"); w.appendChild(el("dt", "", a[2] || a[1])); w.title = a[1];
      var m = R.mod(c, a[0]); w.appendChild(el("dd", "", (m >= 0 ? "+" : "") + m + " (" + ((c.atributos || {})[a[0]] || 0) + ")"));
      dl.appendChild(w);
    });
    at.appendChild(dl);
    grid.appendChild(at);

    var us = el("section", "resumo__bloco resumo__bloco--usos"); us.appendChild(el("h4", "", "Técnicas usadas neste combate"));
    var mapa = usosCache.data[c.id] || {}, chaves = Object.keys(mapa);
    if (!chaves.length) us.appendChild(el("p", "empty", usosCache.t ? "Nenhuma técnica usada neste combate." : "Carregando…"));
    else {
      var ulU = el("ul", "resumo__lista resumo__lista--usos");
      chaves.sort(function (a, b) { return mapa[b] - mapa[a]; }).forEach(function (k) {
        var li = el("li"); li.appendChild(el("span", "", k)); li.appendChild(el("b", "", mapa[k] + "×")); ulU.appendChild(li);
      });
      us.appendChild(ulU);
    }
    grid.appendChild(us);
    node.appendChild(grid);
  }
  function carregarUsos() {
    var cid = K.combateId();
    return S.contarUsos(cid).then(function (d) { usosCache = { cid: cid, data: d, t: Date.now() }; }).catch(function () { usosCache.t = Date.now(); });
  }
  function resumosInto(node) {
    node.textContent = "";
    var lista = K.active() ? K.ordem() : [];
    var sec = el("section", "panel-box resumo");
    sec.appendChild(el("h3", "", "Resumos"));
    if (!lista.length) { sec.appendChild(el("p", "empty", "Ninguém no combate ainda.")); node.appendChild(sec); return; }
    var mini = el("ul", "resumo__mini");
    if (!resumoSel || !lista.some(function (e) { return e.id === resumoSel; })) resumoSel = lista[0].id;
    var det = el("div", "resumo__det");
    lista.forEach(function (e) {
      var li = el("li");
      var b = el("button", "resumo__card" + (e.id === resumoSel ? " is-on" : "")); b.type = "button";
      b.setAttribute("aria-pressed", String(e.id === resumoSel));
      b.appendChild(avatar(charDoCombatente(e) || { nome: e.nome }, "sess-port" + (e.tipo === "npc" ? " sess-port--npc" : "")));
      b.appendChild(el("span", "", e.nome));
      b.addEventListener("click", function () { resumoSel = e.id; resumosInto(node); });
      li.appendChild(b); mini.appendChild(li);
    });
    sec.appendChild(mini);
    sec.appendChild(det);
    node.appendChild(sec);
    var sel = lista.filter(function (e) { return e.id === resumoSel; })[0];
    resumoDetalhe(det, sel);
    if (Date.now() - usosCache.t > 8000 || usosCache.cid !== K.combateId()) carregarUsos().then(function () { if (det.isConnected) resumoDetalhe(det, sel); });
  }

  /* =========================================================================
     TEMAS DA SESSÃO (o mestre escolhe; vale para todos e ignora o claro/escuro do site)
     ========================================================================= */
  var TEMAS = [
    { id: "", nome: "Namizureka", modo: "dark", desc: "O azul da Campanha: arcos góticos e ondas na base da tela." },
    { id: "mar", nome: "Fundo do Mar", modo: "dark", desc: "O mar da tela de início: ondas, bolhas subindo e algas balançando." },
    { id: "caverna", nome: "Cavernoso", modo: "dark", desc: "Trevas de caverna, estalactites no teto e olhos que piscam no escuro." },
    { id: "palacio", nome: "Palácio", modo: "light", desc: "Claro e real: vitrais, rosácea e molduras douradas." },
    { id: "mata", nome: "Mata", modo: "dark", desc: "Dentro da copa de uma árvore: vinhas amarrando as caixas e ervas invadindo pelas beiradas." },
    { id: "tribo", nome: "Tribo", modo: "dark", desc: "Fim de tarde na aldeia: máscaras num varal, casas de madeira e palha e uma trilha de terra até o horizonte." },
    { id: "ceu", nome: "Céu", modo: "dark", desc: "Sol cálido e nuvens cheias passando; de vez em quando uma nuvem ganha forma." },
    { id: "espaco", nome: "Espaço", modo: "dark", desc: "O vazio imensurável: estrelas paradas, aurora roxa e azul e naves cinzas passando." },
    { id: "torneio", nome: "Torneio", modo: "light", desc: "A arena no centro, a trilha até a casa oriental, arquibancadas cheias e montanhas no céu azul." }
  ];
  var temaAplicado = null;
  function aplicarTema() {
    var t = S.tema() || "";
    var def = TEMAS.filter(function (x) { return x.id === t; })[0] || TEMAS[0];
    if (temaAplicado === def.id) return;
    temaAplicado = def.id;
    var root = document.documentElement;
    if (def.id) root.setAttribute("data-sess-tema", def.id); else root.removeAttribute("data-sess-tema");
    root.setAttribute("data-theme", def.modo);     // o tema da sessão manda no claro/escuro desta página
    // cada tema tem o seu favicon (imagem/favicon/favicon_sessao_<tema>.ico; Namizureka é o padrão)
    var icone = document.querySelector('link[rel="icon"]');
    if (icone) icone.href = "../imagem/favicon/favicon_sessao_" + (def.id || "namizureka") + ".ico";
    desenharAtmos(def.id);
  }
  // Camada decorativa fixa atrás de tudo (bolhas, algas, estalactites, olhos, plantas...).
  /* ---------- Cenários dos temas Tribo, Céu, Espaço e Torneio ----------
     Cada um devolve o HTML da camada de fundo (fixa, atrás das caixas). As partes que precisam ficar nas beiradas
     (casas, arquibancadas) são SVGs presos à esquerda e à direita; o centro é um SVG que preenche a tela pela base. */
  function f(n) { return n.toFixed(1); }
  var CENAS = {
    tribo: function (r) {
      var h = "";
      // cena: sol baixo, morros, chão e a trilha de terra que vai longe
      h += '<svg class="tri-cena" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">' +
        '<defs><radialGradient id="triSol"><stop offset="0" stop-color="#FFE3A3"/><stop offset=".35" stop-color="#F7A94B" stop-opacity=".9"/><stop offset="1" stop-color="#E0642C" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="triTrilha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A4E2C"/><stop offset=".55" stop-color="#9A643A"/><stop offset="1" stop-color="#B57A48"/></linearGradient>' +
        '<linearGradient id="triChao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C1D12"/><stop offset="1" stop-color="#160E08"/></linearGradient></defs>' +
        '<circle cx="800" cy="415" r="230" fill="url(#triSol)"/><circle cx="800" cy="420" r="46" fill="#FFD27A" opacity=".85"/>' +
        '<path d="M0 430 C 180 380, 320 400, 470 418 S 700 392, 800 410 S 1030 380, 1180 404 S 1440 372, 1600 420 V900 H0Z" fill="#3A2418"/>' +
        '<path d="M0 446 C 220 420, 420 440, 620 432 S 980 446, 1200 430 S 1480 436, 1600 446 V900 H0Z" fill="url(#triChao)"/>' +
        '<path d="M792 438 C 770 560, 690 700, 520 900 L 1080 900 C 910 700, 830 560, 808 438 Z" fill="url(#triTrilha)"/>' +
        '<path d="M792 438 C 770 560, 690 700, 520 900" fill="none" stroke="#5A3820" stroke-width="3" opacity=".6"/><path d="M808 438 C 830 560, 910 700, 1080 900" fill="none" stroke="#5A3820" stroke-width="3" opacity=".6"/>';
      for (var i = 0; i < 70; i++) { var t = Math.pow(Math.random(), 1.6), y = 450 + t * 440, larg = 10 + t * 270, x = 800 + r(-1, 1) * larg; h += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(1 + t * 5) + '" ry="' + f(.6 + t * 2.4) + '" fill="#5E3B22" opacity=".55"/>'; }
      for (i = 0; i < 60; i++) { var lado = i % 2 ? 1 : -1, t2 = Math.random(), yy = 460 + t2 * 430, xx = 800 + lado * (20 + t2 * 300 + r(10, 60)), alt = 4 + t2 * 22; h += '<path d="M' + f(xx) + ' ' + f(yy) + ' l ' + f(-alt * .3) + ' ' + f(-alt) + ' M' + f(xx) + ' ' + f(yy) + ' l 0 ' + f(-alt * 1.2) + ' M' + f(xx) + ' ' + f(yy) + ' l ' + f(alt * .3) + ' ' + f(-alt) + '" stroke="#4A5A22" stroke-width="' + f(1 + t2 * 1.5) + '" stroke-linecap="round" opacity=".7"/>'; }
      h += '</svg>';
      // varal com máscaras, ao fundo (perto do topo)
      h += '<svg class="tri-varal" viewBox="0 0 1600 120" preserveAspectRatio="none"><path d="M-10 18 Q 800 130 1610 18" fill="none" stroke="#6B4A2E" stroke-width="2.2"/></svg>';
      var cores = [["#C0392B", "#F4E3C1", "#1C120B"], ["#E0A13A", "#1C120B", "#F4E3C1"], ["#2E7D6B", "#F4E3C1", "#C0392B"], ["#F4E3C1", "#C0392B", "#1C120B"], ["#7B3F1E", "#E0A13A", "#F4E3C1"]];
      for (i = 0; i < 9; i++) {
        var px = 6 + i * 11 + r(-1.5, 1.5), u = px / 100 * 2 - 1, py = 18 + 112 * (1 - u * u) * .5, c = cores[i % cores.length], forma = i % 3;
        var face = forma === 0 ? '<ellipse cx="30" cy="40" rx="22" ry="30" fill="' + c[0] + '"/>' : forma === 1 ? '<path d="M8 14 H52 V50 Q30 80 8 50 Z" fill="' + c[0] + '"/>' : '<path d="M30 8 L54 32 L44 74 H16 L6 32 Z" fill="' + c[0] + '"/>';
        h += '<svg class="tri-mascara" style="left:calc(' + f(px) + '% - 21px);top:calc(62px + ' + f(py) + 'px);animation-delay:-' + f(r(0, 6)) + 's" viewBox="0 0 60 92">' +
          '<path d="M30 0 V10" stroke="#6B4A2E" stroke-width="2"/>' +
          '<path d="M12 16 L6 2 M20 12 L18 -2 M40 12 L42 -2 M48 16 L54 2" stroke="' + c[2] + '" stroke-width="3" stroke-linecap="round" opacity=".85"/>' + face +
          '<path d="M16 32 h10 M34 32 h10" stroke="' + c[2] + '" stroke-width="5" stroke-linecap="round"/>' +
          '<path d="M14 46 l6 6 6 -6 6 6 6 -6 6 6 4 -4" fill="none" stroke="' + c[1] + '" stroke-width="2.5"/>' +
          '<path d="M24 62 h12" stroke="' + c[2] + '" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M10 24 v14 M50 24 v14" stroke="' + c[1] + '" stroke-width="3" stroke-linecap="round"/></svg>';
      }
      // casas de madeira e palha nas laterais
      var casa = function (x, y, e, escura) {
        var w = 120 * e, ht = 90 * e, tel = 80 * e, pl = "";
        for (var k = 1; k < 6; k++) pl += '<path d="M' + f(x + k * w / 6) + ' ' + f(y - ht) + ' V' + f(y) + '" stroke="#3A2414" stroke-width="1.4" opacity=".6"/>';
        var palha = "";
        for (k = 0; k < 14; k++) { var xs = x - 14 * e + k * (w + 28 * e) / 13; palha += '<path d="M' + f(x + w / 2) + ' ' + f(y - ht - tel) + ' L' + f(xs) + ' ' + f(y - ht + 6 * e) + '" stroke="#B0884A" stroke-width="1.2" opacity=".55"/>'; }
        return '<g' + (escura ? ' opacity=".82"' : '') + '><rect x="' + f(x) + '" y="' + f(y - ht) + '" width="' + f(w) + '" height="' + f(ht) + '" fill="' + (escura ? "#4A2E1A" : "#6B4426") + '"/>' + pl +
          '<rect x="' + f(x + w * .4) + '" y="' + f(y - ht * .62) + '" width="' + f(w * .22) + '" height="' + f(ht * .62) + '" fill="#1A0F08"/>' +
          '<path d="M' + f(x - 18 * e) + ' ' + f(y - ht + 8 * e) + ' L' + f(x + w / 2) + ' ' + f(y - ht - tel) + ' L' + f(x + w + 18 * e) + ' ' + f(y - ht + 8 * e) + ' Z" fill="' + (escura ? "#8A6A34" : "#C79A55") + '"/>' + palha + '</g>';
      };
      var lat = function (lado) {
        return '<svg class="tri-casas tri-casas--' + lado + '" viewBox="0 0 420 520" preserveAspectRatio="' + (lado === "esq" ? "xMinYMax" : "xMaxYMax") + ' meet">' +
          (lado === "dir" ? '<g transform="translate(420 0) scale(-1 1)">' : "<g>") +
          casa(150, 400, 1.15, true) + casa(-30, 470, 1.6, false) + casa(210, 510, .9, false) + '</g></svg>';
      };
      h += lat("esq") + lat("dir");
      for (i = 0; i < 14; i++) h += '<i class="tri-brasa" style="left:' + f(r(20, 80)) + '%;top:' + f(r(50, 95)) + '%;animation-delay:-' + f(r(0, 9)) + 's;animation-duration:' + f(r(7, 12)) + 's"></i>';
      return h;
    },
    ceu: function (r) {
      var h = '<div class="ceu-sol"></div><div class="ceu-raios"></div><div class="ceu-calor"></div>';
      h += '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="ceuNuvem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#FFF6E6"/><stop offset="1" stop-color="#F6D9B8"/></linearGradient></defs></svg>';
      var nuvem = function () {
        var bolas = "", n = 6 + Math.floor(r(0, 4));
        for (var k = 0; k < n; k++) { var cx = 40 + k * (220 / n) + r(-10, 10), rr = r(28, 52) * (1 - Math.abs(k - n / 2) / n * .8); bolas += '<circle cx="' + f(cx) + '" cy="' + f(90 - rr * .55) + '" r="' + f(rr) + '"/>'; }
        return '<svg viewBox="0 0 300 120"><g fill="url(#ceuNuvem)">' + bolas + '<rect x="30" y="72" width="240" height="34" rx="17"/></g></svg>';
      };
      for (var i = 0; i < 12; i++) {
        var w = Math.round(r(170, 440)), prof = w < 260 ? " ceu-nuvem--longe" : "";
        h += '<div class="ceu-nuvem' + prof + '" style="top:' + f(r(9, 82)) + '%;width:' + w + 'px;animation-duration:' + Math.round(r(70, 150) * (w < 260 ? 1.4 : 1)) + 's;animation-delay:-' + Math.round(r(0, 150)) + 's">' + nuvem() + '</div>';
      }
      h += '<div class="ceu-forma"></div>';
      return h;
    },
    espaco: function (r) {
      var h = '<div class="esp-aurora esp-aurora--1"></div><div class="esp-aurora esp-aurora--2"></div><div class="esp-aurora esp-aurora--3"></div>';
      var est = '<svg class="esp-estrelas" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">';
      for (var i = 0; i < 260; i++) { var tam = Math.pow(Math.random(), 3) * 1.8 + .4; est += '<circle cx="' + f(r(0, 1600)) + '" cy="' + f(r(0, 900)) + '" r="' + f(tam) + '" fill="' + ["#FFFFFF", "#DDE4FF", "#FFE9D6", "#E9DDFF"][i % 4] + '" opacity="' + f(r(.35, 1)) + '"/>'; }
      for (i = 0; i < 9; i++) { var x = r(40, 1560), y = r(40, 860); est += '<g opacity=".9"><circle cx="' + f(x) + '" cy="' + f(y) + '" r="1.8" fill="#fff"/><path d="M' + f(x - 7) + ' ' + f(y) + ' H' + f(x + 7) + ' M' + f(x) + ' ' + f(y - 7) + ' V' + f(y + 7) + '" stroke="#fff" stroke-width=".7" opacity=".7"/></g>'; }
      est += '<g opacity=".35"><circle cx="230" cy="760" r="70" fill="#2A2350"/><circle cx="210" cy="742" r="70" fill="#3A3170" opacity=".5"/><ellipse cx="230" cy="760" rx="120" ry="22" fill="none" stroke="#8C7FD0" stroke-width="3" transform="rotate(-14 230 760)"/></g>';
      h += est + '</svg>';
      var nave = function (tipo) {
        if (tipo === 0) return '<svg viewBox="0 0 120 40"><path d="M6 20 L40 10 H86 L112 20 L86 30 H40 Z" fill="#8E95A3"/><path d="M40 10 L56 2 H78 L86 10 Z M40 30 L56 38 H78 L86 30 Z" fill="#6B7280"/><ellipse cx="88" cy="20" rx="10" ry="4.5" fill="#A8D8FF"/><path d="M6 16 H-14 V24 H6 Z" fill="url(#espFogo)"/><path d="M40 20 H80" stroke="#5B616D" stroke-width="1.2"/></svg>';
        if (tipo === 1) return '<svg viewBox="0 0 80 40"><path d="M10 20 L30 8 L70 18 L70 22 L30 32 Z" fill="#A0A6B2"/><path d="M30 8 L22 -2 L40 12 Z M30 32 L22 42 L40 28 Z" fill="#747B88"/><circle cx="52" cy="20" r="4" fill="#9FD1FF"/><path d="M10 17 H-6 V23 H10 Z" fill="url(#espFogo)"/></svg>';
        return '<svg viewBox="0 0 220 60"><path d="M4 30 L30 14 H170 L214 30 L170 46 H30 Z" fill="#7A808C"/><path d="M50 14 V46 M90 14 V46 M130 14 V46" stroke="#5E6470" stroke-width="2"/><path d="M60 14 L74 4 H140 L150 14 Z" fill="#636976"/><g fill="#FFE7A8" opacity=".8"><rect x="58" y="24" width="6" height="3"/><rect x="98" y="24" width="6" height="3"/><rect x="138" y="24" width="6" height="3"/><rect x="58" y="33" width="6" height="3"/><rect x="118" y="33" width="6" height="3"/></g><path d="M4 26 H-20 V34 H4 Z" fill="url(#espFogo)"/></svg>';
      };
      h += '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="espFogo" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#9FD1FF"/><stop offset=".4" stop-color="#6E8BFF" stop-opacity=".7"/><stop offset="1" stop-color="#6E8BFF" stop-opacity="0"/></linearGradient></defs></svg>';
      var naves = [[0, 120, 14, 38, 1], [1, 60, 34, 26, -1], [2, 260, 58, 90, 1], [1, 46, 72, 32, 1], [0, 90, 24, 52, -1], [2, 170, 86, 120, -1]];
      naves.forEach(function (n, k) {
        h += '<div class="esp-nave' + (n[4] < 0 ? " esp-nave--volta" : "") + (n[0] === 2 ? " esp-nave--longe" : "") + '" style="top:' + n[2] + '%;width:' + n[1] + 'px;animation-duration:' + n[3] + 's;animation-delay:-' + f(r(0, n[3])) + 's">' + nave(n[0]) + '</div>';
      });
      return h;
    },
    torneio: function (r) {
      var h = '<div class="tor-sol"></div>';
      h += '<svg class="tor-cena" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">' +
        '<defs><linearGradient id="torMonte" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FA6C8"/><stop offset="1" stop-color="#B9CBE2"/></linearGradient>' +
        '<linearGradient id="torGrama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FC27A"/><stop offset="1" stop-color="#5E9A4E"/></linearGradient>' +
        '<linearGradient id="torPedra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E2D2"/><stop offset="1" stop-color="#CFC4AC"/></linearGradient></defs>' +
        // nuvens
        '<g fill="#fff" opacity=".85"><ellipse cx="300" cy="150" rx="90" ry="22"/><ellipse cx="350" cy="136" rx="50" ry="22"/><ellipse cx="1260" cy="120" rx="110" ry="24"/><ellipse cx="1210" cy="104" rx="56" ry="24"/><ellipse cx="980" cy="210" rx="70" ry="16"/></g>' +
        // montanhas atrás da casa
        '<path d="M420 470 L560 300 L640 380 L760 230 L860 360 L940 290 L1060 420 L1180 470 Z" fill="url(#torMonte)" opacity=".9"/>' +
        '<path d="M760 230 L730 268 L752 262 L772 280 L790 258 Z M560 300 L540 326 L560 320 L578 332 Z" fill="#F4F8FF"/>' +
        '<path d="M300 480 L470 360 L600 450 L720 380 L800 440 L900 370 L1050 460 L1180 390 L1320 480 Z" fill="#A9BFDB"/>' +
        // chão
        '<path d="M0 470 C 400 456, 1200 456, 1600 470 V900 H0 Z" fill="url(#torGrama)"/>' +
        // casa oriental no fim da trilha
        '<g transform="translate(800 470)"><rect x="-58" y="-46" width="116" height="46" fill="#F3E6CC"/><rect x="-14" y="-30" width="28" height="30" fill="#5A2A18"/>' +
        '<path d="M-58 -46 V0 M58 -46 V0 M-30 -46 V0 M30 -46 V0" stroke="#B5301F" stroke-width="5"/>' +
        '<path d="M-92 -44 Q -60 -54 -70 -64 H70 Q 60 -54 92 -44 Q 0 -58 -92 -44 Z" fill="#C8341F"/>' +
        '<rect x="-40" y="-86" width="80" height="22" fill="#F3E6CC"/><path d="M-40 -86 V-64 M40 -86 V-64" stroke="#B5301F" stroke-width="4"/>' +
        '<path d="M-66 -84 Q -44 -92 -50 -100 H50 Q 44 -92 66 -84 Q 0 -96 -66 -84 Z" fill="#C8341F"/><path d="M0 -100 V-112" stroke="#C8341F" stroke-width="4"/></g>' +
        // trilha da casa até a arena
        '<path d="M786 470 L814 470 L870 640 L730 640 Z" fill="#D9C9A6"/><path d="M786 470 L730 640 M814 470 L870 640" stroke="#B8A47E" stroke-width="2"/>' +
        // arena (vista de cima, em perspectiva)
        '<path d="M560 640 H1040 L1180 820 H420 Z" fill="url(#torPedra)"/>';
      for (var k = 1; k < 8; k++) { var tt = k / 8; h += '<path d="M' + f(560 - 140 * tt) + ' ' + f(640 + 180 * tt) + ' H' + f(1040 + 140 * tt) + '" stroke="#B9AC90" stroke-width="1.6"/>'; }
      for (k = 1; k < 8; k++) { var xa = 560 + 480 * k / 8, xb = 420 + 760 * k / 8; h += '<path d="M' + f(xa) + ' 640 L' + f(xb) + ' 820" stroke="#B9AC90" stroke-width="1.6"/>'; }
      h += '<path d="M420 820 H1180 V856 H420 Z" fill="#B3A68A"/><path d="M420 856 H1180" stroke="#8E8068" stroke-width="3"/>' +
        '<path d="M470 856 h40 v16 h-40z M1090 856 h40 v16 h-40z" fill="#9C8F74"/></svg>';
      // arquibancadas cheias nas laterais
      var arq = function (lado) {
        var g = "", cores = ["#E74C3C", "#F39C12", "#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22", "#1ABC9C", "#ECF0F1", "#34495E"];
        for (var fila = 0; fila < 7; fila++) {
          var y = 230 + fila * 40;
          g += '<rect x="' + (-10 + fila * 6) + '" y="' + (y + 24) + '" width="420" height="16" fill="' + (fila % 2 ? "#8C5A3C" : "#9E6A48") + '"/>';
          for (var p2 = 0; p2 < 16; p2++) {
            var px2 = 6 + fila * 6 + p2 * 25 + r(-4, 4), cor = cores[Math.floor(r(0, cores.length))];
            g += '<g class="tor-pessoa" style="animation-delay:-' + f(r(0, 3)) + 's"><rect x="' + f(px2 - 8) + '" y="' + (y + 6) + '" width="16" height="20" rx="6" fill="' + cor + '"/><circle cx="' + f(px2) + '" cy="' + (y + 1) + '" r="7" fill="' + ["#F2C9A0", "#D9A374", "#A86F45", "#7A4B2C"][p2 % 4] + '"/></g>';
          }
        }
        var mastro = '<path d="M30 230 V90 M380 240 V100" stroke="#5A3A24" stroke-width="5"/><path class="tor-bandeira" d="M30 92 q 30 -8 60 4 q -30 12 -60 22 Z" fill="#E74C3C"/><path class="tor-bandeira tor-bandeira--2" d="M380 102 q -30 -8 -60 4 q 30 12 60 22 Z" fill="#F39C12"/>';
        return '<svg class="tor-arq tor-arq--' + lado + '" viewBox="0 0 420 520" preserveAspectRatio="' + (lado === "esq" ? "xMinYMax" : "xMaxYMax") + ' meet">' +
          (lado === "dir" ? '<g transform="translate(420 0) scale(-1 1)">' : "<g>") +
          '<path d="M0 200 H420 V520 H0 Z" fill="#6E4630"/><path d="M0 200 H420 L400 180 H20 Z" fill="#C8341F"/>' + g + mastro + '</g></svg>';
      };
      h += arq("esq") + arq("dir");
      return h;
    }
  };
  // Céu: de tempos em tempos uma nuvem ganha forma (coração, pássaro, peixe, dragão...), passa devagar e se desfaz.
  var FORMAS = [
    "M150 70 C 150 30, 90 20, 90 60 C 90 90, 150 120, 150 140 C 150 120, 210 90, 210 60 C 210 20, 150 30, 150 70 Z",
    "M30 90 Q 90 30 150 80 Q 210 30 270 90",
    "M40 80 Q 120 20 210 70 L 260 40 L 250 80 L 260 120 L 210 90 Q 120 140 40 80 Z",
    "M20 100 C 60 40, 100 140, 140 80 S 220 40, 250 70 L 280 55 L 270 80 L 290 92 L 262 92",
    "M150 20 L 170 70 L 225 72 L 182 104 L 198 156 L 150 126 L 102 156 L 118 104 L 75 72 L 130 70 Z"
  ];
  function iniciarNuvensFormas(a, r) {
    var vaga = a.querySelector(".ceu-forma"); if (!vaga) return;
    if (!document.getElementById("nuvemFiltro")) {
      var d = document.createElement("div");
      d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="nuvemFiltro" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="3"/><feDisplacementMap in="SourceGraphic" scale="22"/><feGaussianBlur stdDeviation="3.5"/></filter></svg>';
      document.body.appendChild(d.firstChild);
    }
    var mostrar = function () {
      var path = FORMAS[Math.floor(Math.random() * FORMAS.length)];
      vaga.innerHTML = '<svg viewBox="0 0 300 180" style="top:' + f(r(12, 45)) + '%;left:' + f(r(8, 62)) + '%"><path d="' + path + '" fill="#FFFFFF" fill-opacity=".9" stroke="#FFFFFF" stroke-width="30" stroke-linejoin="round" stroke-linecap="round" filter="url(#nuvemFiltro)"/></svg>';
    };
    mostrar();
    timerNuvem = setInterval(mostrar, 22000);
  }
  var timerNuvem = null;
  function desenharAtmos(id) {
    document.querySelectorAll(".sess-atmos").forEach(function (v) { v.remove(); });
    clearInterval(timerNuvem); timerNuvem = null;
    if (!id) return;
    var a = el("div", "sess-atmos sess-atmos--" + id); a.setAttribute("aria-hidden", "true");
    var r = function (min, max) { return min + Math.random() * (max - min); };
    var html = "";
    if (id === "mar") {
      html += '<div class="mar-sup"></div>';
      for (var i = 0; i < 5; i++) html += '<i class="mar-raio" style="left:' + (6 + i * 19) + '%;width:' + Math.round(r(70, 150)) + 'px;animation-delay:-' + Math.round(r(0, 9)) + 's"></i>';
      for (i = 0; i < 18; i++) { var t = Math.round(r(5, 22)); html += '<i class="mar-bolha" style="left:' + r(2, 98).toFixed(1) + '%;width:' + t + 'px;height:' + t + 'px;animation-duration:' + Math.round(r(16, 34)) + 's;animation-delay:-' + Math.round(r(0, 34)) + 's"></i>'; }
      html += '<div class="mar-fundo">';
      for (i = 0; i < 16; i++) { var h = Math.round(r(70, 190)); html += '<svg class="mar-alga mar-alga--' + (i % 2 + 1) + '" style="left:' + (i * 6.4 + r(-1, 2)).toFixed(1) + '%;height:' + h + 'px;animation-duration:' + r(4, 8).toFixed(1) + 's;animation-delay:-' + r(0, 6).toFixed(1) + 's" viewBox="0 0 30 200" preserveAspectRatio="none"><path d="M15 200 C 4 160, 26 130, 13 95 S 22 40, 15 0" fill="none" stroke-width="5" stroke-linecap="round"/><path d="M15 150 q -10 -8 -12 -22 M15 105 q 11 -6 13 -20 M15 60 q -9 -6 -10 -18" fill="none" stroke-width="3" stroke-linecap="round"/></svg>'; }
      html += '</div>';
    } else if (id === "caverna") {
      html += '<div class="cav-teto"></div><div class="cav-teto cav-teto--2"></div><div class="cav-nevoa"></div>';
      var lugares = [[4, 38], [93, 30], [8, 72], [90, 64], [16, 88], [80, 84], [50, 94], [97, 48], [2, 56], [70, 92]];
      lugares.forEach(function (p, k) {
        var cor = k % 3 === 0 ? "vermelho" : "amarelo";
        html += '<span class="cav-olhos cav-olhos--' + cor + '" style="left:' + p[0] + '%;top:' + p[1] + '%;--s:' + r(1, 1.7).toFixed(2) + ';animation-delay:-' + r(0, 12).toFixed(1) + 's,-' + r(0, 7).toFixed(1) + 's"><i></i><i></i></span>';
      });
    } else if (id === "palacio") {
      html += '<div class="pal-raios"></div><svg class="pal-rosa" viewBox="-100 -100 200 200"><g fill="none" stroke-width="1.2">' +
        '<circle r="96"/><circle r="80"/><circle r="40"/><circle r="14"/>' +
        Array.apply(null, Array(16)).map(function (_, k) { var g = k * 22.5; return '<g transform="rotate(' + g + ')"><path d="M0 -40 Q 12 -62 0 -80 Q -12 -62 0 -40"/><circle cy="-88" r="6"/></g>'; }).join("") +
        Array.apply(null, Array(8)).map(function (_, k) { var g = k * 45; return '<g transform="rotate(' + g + ')"><path d="M0 -14 Q 10 -27 0 -40 Q -10 -27 0 -14"/></g>'; }).join("") +
        '</g></svg>';
    } else if (id === "mata") {
      // Dentro da copa de uma árvore: folhagem densa em cima, luz filtrada, chão de floresta com capim e ervas invadindo pelas beiradas.
      var copa = function (camada, cores, n, fundo) {
        var out = '<svg class="mata-copa mata-copa--' + camada + '" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMin slice">';
        for (var k = 0; k < n; k++) {
          var x = r(-20, 1220), borda = fundo + 40 * Math.sin(x / 90) + 26 * Math.sin(x / 37 + camada);
          var y = r(-30, borda), rx = r(16, 34), ry = rx * r(.36, .5), ang = r(-70, 70);
          out += '<ellipse cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" rx="' + rx.toFixed(0) + '" ry="' + ry.toFixed(0) + '" transform="rotate(' + ang.toFixed(0) + ' ' + x.toFixed(0) + ' ' + y.toFixed(0) + ')" fill="' + cores[k % cores.length] + '"/>';
        }
        return out + '</svg>';
      };
      html += '<div class="mata-luz"></div>';
      html += copa(1, ["#062117", "#08291C", "#0A3023"], 260, 150);
      html += copa(2, ["#0D3B29", "#114632", "#0F4030"], 210, 105);
      html += copa(3, ["#17583D", "#1D6B49", "#237A53", "#1A6143"], 170, 62);
      for (var c = 0; c < 7; c++) {   // cipós pendurados da copa
        var hc = Math.round(r(120, 300));
        html += '<svg class="mata-cipo" style="left:' + r(3, 96).toFixed(1) + '%;height:' + hc + 'px;animation-delay:-' + r(0, 9).toFixed(1) + 's" viewBox="0 0 20 200" preserveAspectRatio="none"><path d="M10 0 C 4 50, 16 100, 9 150 S 12 190, 10 200" fill="none" stroke="#1E6B48" stroke-width="2.2"/>' +
          [40, 80, 120, 160].map(function (y, q) { return '<ellipse cx="' + (q % 2 ? 15 : 5) + '" cy="' + y + '" rx="5" ry="2.4" fill="#2A8A5C" transform="rotate(' + (q % 2 ? 30 : -30) + ' ' + (q % 2 ? 15 : 5) + ' ' + y + ')"/>'; }).join("") + '</svg>';
      }
      for (c = 0; c < 9; c++) html += '<i class="mata-sol" style="left:' + r(5, 95).toFixed(1) + '%;top:' + r(22, 70).toFixed(1) + '%;width:' + Math.round(r(60, 160)) + 'px;animation-delay:-' + r(0, 10).toFixed(1) + 's"></i>';
      // chão da floresta: terra escura que some no fundo, com capim fino na borda
      var capim = '<svg class="mata-capim" viewBox="0 0 1200 70" preserveAspectRatio="none">';
      for (c = 0; c < 260; c++) {
        var cx = r(0, 1200), ch = r(14, 60), cw = r(2.5, 5), inc = r(-9, 9);
        capim += '<path d="M' + (cx - cw).toFixed(1) + ' 70 Q ' + (cx + inc * .4).toFixed(1) + ' ' + (70 - ch * .6).toFixed(1) + ' ' + (cx + inc).toFixed(1) + ' ' + (70 - ch).toFixed(1) + ' Q ' + (cx + inc * .3 + 1).toFixed(1) + ' ' + (70 - ch * .5).toFixed(1) + ' ' + (cx + cw).toFixed(1) + ' 70 Z" fill="' + ["#123F2A", "#18513A", "#0D3021", "#1F5E3F"][c % 4] + '"/>';
      }
      html += '<div class="mata-chao">' + capim + '</svg></div>';
      // Ervas na frente, inclinadas para dentro da tela, como se tentassem invadi-la.
      var frente = "";
      var erva = function (lado, hh, off, incl, delay, dur) {
        var folhas = [262, 228, 196, 164, 134, 104, 76, 50, 28];
        return '<svg class="mata-planta mata-planta--' + lado + '" style="' + (lado === "esq" ? "left" : "right") + ':' + off + 'px;height:' + hh + 'px;--incl:' + incl + 'deg;animation-delay:-' + delay + 's;animation-duration:' + dur + 's" viewBox="0 0 90 300" preserveAspectRatio="xMidYMax meet">' +
          '<path class="caule" d="M30 300 C 30 250, 46 210, 44 160 S 62 70, 72 4" fill="none" stroke-width="3.6"/>' +
          folhas.map(function (y, q) {
            var s2 = q % 2 ? 1 : -1, x = 30 + (300 - y) * .14, tam = 1 - q * .06;
            return '<path class="folha" d="M' + x.toFixed(1) + ' ' + y + ' q ' + (s2 * 24 * tam).toFixed(1) + ' -4 ' + (s2 * 38 * tam).toFixed(1) + ' -24 q ' + (s2 * -20 * tam).toFixed(1) + ' 0 ' + (s2 * -38 * tam).toFixed(1) + ' 24 z"/>';
          }).join("") + '</svg>';
      };
      ["esq", "dir"].forEach(function (lado) {
        // na frente, só a beirada aparece (não cobre o conteúdo das caixas); inclinadas para dentro
        for (var j = 0; j < 6; j++) frente += erva(lado, Math.round(r(200, 440)), Math.round(r(-78, -52)), Math.round(r(6, 13)), r(0, 8).toFixed(1), r(7, 12).toFixed(1));
        // atrás das caixas: ervas maiores e cipós rasteiros avançando para o meio, aparecendo entre as caixas
        for (var k2 = 0; k2 < 4; k2++) html += erva(lado, Math.round(r(260, 560)), Math.round(r(20, 140)), Math.round(r(14, 28)), r(0, 8).toFixed(1), r(8, 13).toFixed(1)).replace('class="mata-planta', 'class="mata-planta mata-planta--atras');
        html += '<svg class="mata-rasteira mata-rasteira--' + lado + '" style="' + (lado === "esq" ? "left" : "right") + ':-30px;bottom:' + Math.round(r(30, 120)) + 'px;animation-delay:-' + r(0, 6).toFixed(1) + 's" viewBox="0 0 260 60" preserveAspectRatio="xMinYMid meet">' +
          '<path d="M0 40 C 40 20, 70 52, 110 34 S 170 14, 200 30 S 240 44, 256 26" fill="none" stroke="#1E7A55" stroke-width="3"/>' +
          [30, 70, 110, 150, 190, 230].map(function (x, q) { var up = q % 2 ? -1 : 1; return '<path class="folha" d="M' + x + ' ' + (34 - q) + ' q 8 ' + (up * -14) + ' 20 ' + (up * -16) + ' q -6 ' + (up * 12) + ' -20 ' + (up * 16) + ' z"/>'; }).join("") +
          '<path d="M256 26 q 6 -10 -2 -14 q -6 -2 -6 4" fill="none" stroke="#1E7A55" stroke-width="2"/></svg>';
      });
      var fr = el("div", "sess-atmos sess-atmos--frente"); fr.setAttribute("aria-hidden", "true");
      fr.innerHTML = frente;
      document.body.appendChild(fr);
    }
    else if (CENAS[id]) html = CENAS[id](r, a);
    a.innerHTML = html;
    document.body.insertBefore(a, document.body.firstChild);
    if (id === "ceu") iniciarNuvensFormas(a, r);
  }
  function temasInto(node) {
    node.textContent = "";
    var sec = el("section", "panel-box sess-temas");
    sec.appendChild(el("h3", "", "Temas da sessão"));
    sec.appendChild(el("p", "sess-temas__lead", "O tema vale para todos na sessão e ignora o modo claro ou escuro do site de cada um." + (mestre() ? "" : " Só o mestre pode trocar.")));
    var ul = el("ul", "sess-temas__lista");
    var atual = S.tema() || "";
    TEMAS.forEach(function (t) {
      var li = el("li");
      var b = el("button", "sess-tema" + (t.id === atual ? " is-on" : "")); b.type = "button";
      b.setAttribute("aria-pressed", String(t.id === atual));
      b.appendChild(el("span", "sess-tema__prev sess-tema__prev--" + (t.id || "nz")));
      var tx = el("span", "sess-tema__txt");
      tx.appendChild(el("b", "", t.nome));
      tx.appendChild(el("small", "", (t.modo === "light" ? "Claro · " : "Escuro · ") + t.desc));
      b.appendChild(tx);
      b.appendChild(el("span", "sess-tema__uso", t.id === atual ? "Em uso" : mestre() ? "Usar" : ""));
      if (!mestre()) { b.disabled = true; b.classList.add("is-so-ver"); if (t.id !== atual) b.querySelector(".sess-tema__uso").remove(); }
      b.addEventListener("click", function () {
        if (!mestre() || t.id === (S.tema() || "")) return;
        var p = S.definirTema(t.id);
        aplicarTema(); temasInto(node);       // na hora, para o mestre
        p.catch(function (err) { UI.toast("Não consegui salvar o tema: " + err.message); });
      });
      li.appendChild(b); ul.appendChild(li);
    });
    sec.appendChild(ul);
    node.appendChild(sec);
  }

  /* =========================================================================
     MAPA DA SESSÃO (centro)
     O mestre importa um mapa; todos veem. O mestre arrasta jogadores e NPCs da lista da esquerda
     para o mapa (jogadores não põem tokens); cada jogador move só o próprio token; o mestre tem as
     ferramentas do editor da aba Mapas e limita a área de um jogador clicando no número do zoom.
     ========================================================================= */
  var mapaInst = null, mapaVersao = -1;
  function personagensNoMapa(todos) {
    var mine = C.mine();
    var jog = S.aceitos().map(function (m) {
      var c = charDoMembro(m); if (!c) return null;
      return { id: c.id, nome: c.nome, foto: c.foto || "", meu: !!mine && mine.char.id === c.id };
    }).filter(Boolean);
    // NPCs da sessão: na lista do mapa só o mestre vê (todos = para os retratos e tamanhos de quem está no mapa)
    var npcs = mestre() || todos ? S.npcs().map(function (n) { return { id: n.personagem_id, nome: n.nome, foto: n.foto || "", npc: true, tamanho: n.tamanho }; }) : [];
    return jog.concat(npcs);
  }
  function tamanhoNoMapa(tk) {
    var n = S.npcs().filter(function (x) { return x.personagem_id === tk.personagem_id; })[0];
    return n && window.DBOTamanho ? DBOTamanho.blocos(n.tamanho) : 1;
  }
  // Tokens à vista: os de teste do mestre, os dos personagens que estão na sessão e os dos NPCs da sessão.
  function tokensVisiveis() {
    var ids = {}; personagensNoMapa(true).forEach(function (p) { ids[p.id] = true; });
    return M.tokens().filter(function (t) { return !t.personagem_id || ids[t.personagem_id]; });
  }
  function mapaInto(node) {
    if (mapaInst) { mapaInst.destruir(); mapaInst = null; }
    node.textContent = "";
    var d = M.dados();
    mapaVersao = d ? M.versao() : 0;
    if (!d) {
      var v = el("section", "panel-box sess-mapa-vazio");
      v.appendChild(el("span", "sess-emprod__rot", "Mapa"));
      if (mestre()) {
        v.appendChild(el("b", "", "Nenhum mapa na sessão"));
        v.appendChild(el("p", "", "Traga o mapa da aba Mapas ou uma imagem do computador. Todos na sessão vão ver o mesmo mapa."));
        var b = el("button", "btn", "Importar mapa"); b.type = "button";
        b.addEventListener("click", importarMapa);
        v.appendChild(b);
      } else {
        v.appendChild(el("b", "", "Sem mapa por enquanto"));
        v.appendChild(el("p", "", "Quando o mestre importar um mapa, ele aparece aqui."));
      }
      node.appendChild(v);
      marcarNoMapa();
      return;
    }
    var caixa = el("section", "panel-box sess-mapa"); caixa.setAttribute("aria-label", "Mapa da sessão");
    node.appendChild(caixa);
    var mine = C.mine();
    mapaInst = DBOMapa.criar(caixa, {
      modo: "sessao", mestre: mestre(), dados: d, tokens: tokensVisiveis(),
      personagens: personagensNoMapa,
      // sombras: só a visão dos tokens dos jogadores conta (NPC não)
      // modo caverna: o raio da visão sai do modificador de Concentração da ficha
      concentracao: function (tk) {
        var f = fichaCompleta(tk.personagem_id) || (C.players().filter(function (x) { return x.char.id === tk.personagem_id; })[0] || {}).char;
        try { return f && window.DBORules ? DBORules.mod(f, "concentracao") : 0; } catch (e) { return 0; }
      },
      // Sensor de Presença (genérica, maestria 2): raio do sonar = CON × 3 blocos, no mínimo 1
      sensor: function (tk) {
        var f = fichaCompleta(tk.personagem_id) || (C.players().filter(function (x) { return x.char.id === tk.personagem_id; })[0] || {}).char;
        if (!f || !window.DBORules || !DBORules.maestriaGenerica || DBORules.maestriaGenerica(f, "sensor-de-ki") < 2) return 0;
        return Math.max(1, DBORules.mod(f, "concentracao") * 3);
      },
      // olho do mestre: "ver como" um jogador também usa a área limitada dele
      donoDe: function (tk) { var m = S.aceitos().filter(function (x) { return x.personagem_id === tk.personagem_id; })[0]; return m ? m.usuario_id : ""; },
      ehJogador: function (tk) { return personagensNoMapa(true).some(function (p) { return p.id === tk.personagem_id && !p.npc; }); },
      retrato: function (tk) { var p = personagensNoMapa(true).filter(function (x) { return x.id === tk.personagem_id; })[0]; return p ? { src: p.foto, nome: p.nome } : { src: "", nome: "?" }; },
      tamanho: tamanhoNoMapa,
      podeMover: function (tk) { return !!mine && tk.personagem_id === mine.char.id; },
      // os tokens entram arrastados pelo mestre a partir da lista de Jogadores/NPCs (à esquerda); soltar lá tira do mapa
      zonaTirar: function () { return document.querySelector(".sess-jog"); },
      aoMudarLista: marcarNoMapa,
      jogadores: function () { return S.aceitos().map(function (m) { var c = charDoMembro(m); return { id: m.usuario_id, nome: (c ? c.nome + " · " : "") + (m.nome || "Jogador") }; }); },
      meuId: function () { var r = S.registro(); return r ? r.usuario_id : ""; },
      aoSalvarMapa: function (dados) { M.salvarMapa(dados).then(function () { mapaVersao = M.versao(); }).catch(function (err) { UI.toast("O mapa não foi salvo: " + err.message); }); },
      aoSalvarToken: function (tk) { return M.salvarToken(tk); },
      aoRemoverToken: function (tk) { return M.removerToken(tk.id); },
      aoImportar: importarMapa,
      aoTelaCheia: alternarTelaCheia,
      aoTirar: function () { M.tirarMapa().catch(function (err) { UI.toast(err.message); }).then(function () { if (regions.mapa && regions.mapa.isConnected) mapaInto(regions.mapa); }); }
    });
    marcarNoMapa();
  }
  /* ---------- Tela cheia ----------
     O site todo vira o mapa: a ficha (ou a lista do mestre) fica à esquerda e o log à direita, por cima do mapa.
     Clicar no nome do personagem (ou em "Jogadores") e em "Log" minimiza as caixas. No computador usa a tela cheia do
     navegador (F11 ou Esc saem); no celular, o botão de novo minimiza. */
  var toque = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  function alternarTelaCheia(forcar) {
    var html = document.documentElement, on = typeof forcar === "boolean" ? forcar : !html.classList.contains("sess-tela-cheia");
    html.classList.toggle("sess-tela-cheia", on);
    if (on) {
      if (!toque && html.requestFullscreen && !document.fullscreenElement) html.requestFullscreen().catch(function () {});
      avisoTelaCheia(toque ? "Pressione o botão novamente para minimizar" : "Pressione F11 para minimizar");
      if (toque) document.querySelectorAll(".sess-pane[data-pane]:not([data-pane=mapa])").forEach(function (p) { p.classList.add("is-min"); });
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      document.querySelectorAll(".sess-pane.is-min").forEach(function (p) { p.classList.remove("is-min"); });
    }
  }
  function avisoTelaCheia(txt) {
    var a = document.getElementById("sess-cheia-aviso");
    if (!a) { a = el("div", "sess-cheia-aviso"); a.id = "sess-cheia-aviso"; a.setAttribute("role", "status"); document.body.appendChild(a); }
    a.textContent = txt; a.classList.remove("is-on"); void a.offsetWidth; a.classList.add("is-on");
    clearTimeout(a._t); a._t = setTimeout(function () { a.classList.remove("is-on"); }, 3500);
  }
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && !toque && document.documentElement.classList.contains("sess-tela-cheia")) alternarTelaCheia(false); });
  // Em tela cheia, o título da caixa (nome do personagem, "Jogadores" ou "Log") minimiza / abre a caixa.
  document.addEventListener("click", function (e) {
    if (!document.documentElement.classList.contains("sess-tela-cheia")) return;
    var h = e.target.closest(".sess-pane[data-pane] .fight__who h2, .sess-pane[data-pane] > section > h3, .sess-pane[data-pane] .slog__top h3");
    if (!h) return;
    var pane = h.closest(".sess-pane"); if (!pane || pane.dataset.pane === "mapa") return;
    pane.classList.toggle("is-min");
  });

  // Novidades do banco: mapa novo (ou tirado) redesenha a caixa; tokens e a lista se atualizam sem piscar.
  function atualizarMapa() {
    if (!regions.mapa || !regions.mapa.isConnected) return;
    var d = M.dados(), temAgora = !!d, tinha = !!mapaInst;
    if (temAgora !== tinha) return mapaInto(regions.mapa);
    if (!mapaInst) return;
    if (!mestre() && M.versao() !== mapaVersao) { mapaVersao = M.versao(); mapaInst.trocarDados(d); }
    mapaInst.trocarTokens(tokensVisiveis());
    marcarNoMapa();
  }
  // Janela "Importar mapa": o mapa da aba Mapas (deste navegador) ou uma imagem PNG/JPG.
  function importarMapa() {
    if (!mestre()) return;
    var dlg = document.getElementById("sess-imp-mapa");
    if (!dlg) { dlg = el("dialog", "modal sess-imp"); dlg.id = "sess-imp-mapa"; dlg.setAttribute("aria-labelledby", "sess-imp-t"); document.body.appendChild(dlg); }
    dlg.textContent = "";
    var x = el("button", "modal__close", "×"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.addEventListener("click", function () { dlg.close(); });
    dlg.appendChild(x);
    var h = el("h2", "", "Importar mapa"); h.id = "sess-imp-t"; dlg.appendChild(h);
    dlg.appendChild(el("p", "modal__lead", M.dados() ? "O mapa escolhido substitui o atual, e os tokens saem do mapa." : "Escolha o mapa que vai aparecer na sessão."));
    var msg = el("p", "msg"); msg.setAttribute("role", "status");
    var ocupado = false;
    var usar = function (promessa) {
      if (ocupado) return; ocupado = true;
      msg.className = "msg"; msg.textContent = "Preparando o mapa…";
      promessa.then(function (dados) {
        var antes = M.tokens();
        return M.salvarMapa(dados).then(function () {
          return Promise.all(antes.map(function (t) { return M.removerToken(t.id).catch(function () {}); }));
        });
      }).then(function () {
        dlg.close();
        if (regions.mapa && regions.mapa.isConnected) mapaInto(regions.mapa);
        UI.toast("Mapa na sessão: " + (M.dados() || {}).titulo + ".");
      }).catch(function (err) { msg.className = "msg msg--error"; msg.textContent = err.message; })
        .then(function () { ocupado = false; });
    };
    var opcoes = el("div", "sess-imp__opcoes");
    var aba = DBOMapa.mapaDaAba();
    var o1 = el("button", "sess-imp__op"); o1.type = "button";
    o1.appendChild(el("b", "", "Mapa da aba Mapas"));
    var n1 = aba && aba.celulas ? aba.celulas.length : 0;
    o1.appendChild(el("span", "", aba && (n1 || aba.fundo) ? "“" + (aba.titulo || "Mapa sem título") + "” · " + n1 + (n1 === 1 ? " bloco" : " blocos") + (aba.fundo ? " e imagem de fundo" : "") : "Ainda não há mapa salvo na aba Mapas neste navegador."));
    if (!aba || !(n1 || aba.fundo)) { o1.disabled = true; }
    o1.addEventListener("click", function () { usar(DBOMapa.prepararParaSessao(aba)); });
    opcoes.appendChild(o1);
    var o2 = el("label", "sess-imp__op");
    o2.appendChild(el("b", "", "Arquivo do computador"));
    o2.appendChild(el("span", "", "Um arquivo de mapa .dbomapa (com as paredes) ou uma imagem PNG/JPG (se tiver grade, os blocos seguem a grade dela)."));
    var inp = el("input", "sr-only"); inp.type = "file";   // sem filtro: no celular ".dbomapa" no filtro deixa o arquivo impossível de escolher
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0]; inp.value = "";
      if (f) usar(DBOMapa.ehArquivoDeMapa(f) ? DBOMapa.dadosDeArquivo(f) : DBOMapa.dadosDeImagem(f));
    });
    o2.appendChild(inp);
    opcoes.appendChild(o2);
    dlg.appendChild(opcoes);
    var link = el("a", "sess-imp__link", "Abrir a aba Mapas para desenhar um mapa ↗"); link.href = "mapas.html"; link.target = "_blank"; link.rel = "noopener";
    dlg.appendChild(link);
    dlg.appendChild(msg);
    dlg.showModal();
  }

  /* =========================================================================
     MONTAGEM DAS VISÕES
     ========================================================================= */
  function aviso(text, linkText, href) {
    var b = box("sess-aviso");
    b.appendChild(el("p", "", text));
    if (linkText) { var a = el("a", "btn", linkText); a.href = href; b.appendChild(a); }
    return b;
  }
  function placeholder(titulo, texto) {
    var p = el("section", "panel-box sess-emprod");
    p.appendChild(el("span", "sess-emprod__rot", titulo));
    p.appendChild(el("b", "", "Em produção"));
    if (texto) p.appendChild(el("p", "", texto));
    return p;
  }
  // Abas do celular: mostram um painel por vez.
  function abasCelular(grid, chave, itens) {
    var bar = el("div", "sess-mob"); bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Partes da tela");
    if (!itens.some(function (i) { return i[0] === pane[chave]; })) pane[chave] = itens[0][0];
    itens.forEach(function (it) {
      var b = el("button", "sess-mob__tab", it[1]); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(pane[chave] === it[0]));
      b.addEventListener("click", function () {
        pane[chave] = it[0]; grid.dataset.pane = it[0];
        bar.querySelectorAll(".sess-mob__tab").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        if (it[0] === "log") atualizarLog(true);
      });
      bar.appendChild(b);
    });
    grid.dataset.pane = pane[chave];
    return bar;
  }
  function painel(id) { var p = el("div", "sess-pane"); p.dataset.pane = id; return p; }

  function renderSessao() {
    var wrap = el("div", "sess-view");
    var grid = el("div", "sess-grid");
    var esq = painel(mestre() ? "jogadores" : "ficha"), meio = painel("mapa"), dir = painel("log");
    wrap.appendChild(abasCelular(grid, "sessao", [[mestre() ? "jogadores" : "ficha", mestre() ? "Jogadores" : "Ficha"], ["mapa", "Mapa"], ["log", "Log"]]));
    if (mestre()) { regions.jogadores = esq; jogadoresInto(esq); }
    else { regions.ficha = esq; fichaInto(esq); }
    regions.mapa = meio; mapaInto(meio);
    montarLog(dir);
    grid.appendChild(esq); grid.appendChild(meio); grid.appendChild(dir);
    wrap.appendChild(grid);
    main.appendChild(wrap);
  }

  function renderCombate() {
    var caixa = el("section", "sess-cbox");
    var abas = el("div", "sess-abas"); abas.setAttribute("role", "tablist"); abas.setAttribute("aria-label", "Combate");
    var itens = [["combate", "Combate"]];
    if (!mestre()) itens.push(["personagem", "Personagem"]);
    if (mestre()) itens.push(["resumos", "Resumos"]);
    itens.push(["temas", "Temas"]);   // todos veem; só o mestre troca
    if (!itens.some(function (i) { return i[0] === combTab; })) combTab = "combate";
    itens.forEach(function (it) {
      var b = el("button", "sess-abas__tab", it[1]); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(combTab === it[0]));
      if (it[0] === "personagem") {
        b.removeAttribute("role"); b.removeAttribute("aria-selected");
        b.appendChild(el("span", "sess-abas__ext", "↗"));
        b.title = "Abre sua ficha numa aba nova";
        b.addEventListener("click", function () { var m = C.mine(); if (!m) return UI.toast("Você não tem personagem na campanha."); window.open("../" + DBOCharacters.sheetUrl(m.char.id), "_blank", "noopener"); });
      } else b.addEventListener("click", function () { combTab = it[0]; gravarPref("dbo-sess-aba", combTab); renderAll(); });
      abas.appendChild(b);
    });
    caixa.appendChild(abas);
    var corpo = el("div", "sess-cbox__corpo");
    caixa.appendChild(corpo);
    main.appendChild(caixa);
    if (combTab === "resumos") { regions.resumos = corpo; resumosInto(corpo); return; }
    if (combTab === "temas") { regions.temas = corpo; temasInto(corpo); return; }
    var grid = el("div", "sess-grid sess-grid--combate");
    var esq = painel(mestre() ? "npcs" : "ficha"), meio = painel("ordem"), dir = painel("jogadores");
    corpo.appendChild(abasCelular(grid, "combate", [[mestre() ? "npcs" : "ficha", mestre() ? "NPCs" : "Ficha"], ["ordem", "Iniciativa"], ["jogadores", "Jogadores"]]));
    if (mestre()) { regions.npcs = esq; npcsInto(esq); } else { regions.ficha = esq; fichaInto(esq); }
    regions.ordem = meio; ordemInto(meio);
    regions.jogadores = dir; jogadoresInto(dir);
    grid.appendChild(esq); grid.appendChild(meio); grid.appendChild(dir);
    corpo.appendChild(grid);
  }

  var notasApi = null;
  function renderNotas() {
    var wrap = el("div", "sess-notas");
    main.appendChild(wrap);
    var m = C.mine(), nome = m ? m.char.nome : "mestre";
    notasApi = DBONotas.montar(wrap, {
      ler: function () { return S.notas.ler(); },
      salvar: function (t) { return S.notas.salvar(t); },
      nomeArquivo: "anotacoes-" + String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
    });
  }

  // Pílula que desliza até o botão escolhido (transição fluida entre Sessão, Combate e Anotações).
  var VIEWS = ["sessao", "combate", "notas"];
  var pilulaDe = null, entradaDir = 0;
  function moverPilula(grupo, de) {
    var sel = grupo.querySelector('[aria-pressed="true"]');
    if (!sel) return null;
    var p = grupo.querySelector(".seg-pilula");
    if (!p) { p = el("span", "seg-pilula"); p.setAttribute("aria-hidden", "true"); grupo.insertBefore(p, grupo.firstChild); }
    var alvo = { x: sel.offsetLeft, w: sel.offsetWidth };
    if (!de) {   // sem troca de seção (ex.: abas do combate, atualização): a pílula já nasce no lugar, sem deslizar
      p.style.transition = "none"; p.style.transform = "translateX(" + alvo.x + "px)"; p.style.width = alvo.w + "px";
      void p.offsetWidth; p.style.transition = "";
      return alvo;
    }
    p.style.transition = "none"; p.style.transform = "translateX(" + de.x + "px)"; p.style.width = de.w + "px"; void p.offsetWidth; p.style.transition = "";
    p.style.transform = "translateX(" + alvo.x + "px)"; p.style.width = alvo.w + "px";
    return alvo;
  }
  function renderNav() {
    nav.textContent = "";
    var grupo = el("div", "sess-nav__grupo seg"); grupo.setAttribute("role", "group"); grupo.setAttribute("aria-label", "Seções da sessão");
    [["sessao", "Sessão"], ["combate", "Combate"], ["notas", "Anotações"]].forEach(function (v) {
      var b = el("button", "sess-nav__btn", v[1]); b.type = "button";
      b.setAttribute("aria-pressed", String(view === v[0]));
      b.addEventListener("click", function () {
        if (view === v[0]) return;
        if (notasApi && notasApi.pendente()) notasApi.salvarAgora();
        var atualBtn = grupo.querySelector('[aria-pressed="true"]');
        pilulaDe = atualBtn ? { x: atualBtn.offsetLeft, w: atualBtn.offsetWidth } : null;
        entradaDir = VIEWS.indexOf(v[0]) > VIEWS.indexOf(view) ? 1 : -1;
        view = v[0]; gravarPref("dbo-sess-view", view); renderAll();
      });
      grupo.appendChild(b);
    });
    nav.appendChild(grupo);
    moverPilula(grupo, pilulaDe);
    pilulaDe = null;
    if (!mestre()) {
      var sair = el("button", "sess-nav__sair", "Sair da sessão"); sair.type = "button";
      sair.addEventListener("click", confirmarSaida);
      nav.appendChild(sair);
    }
  }

  /* ---------- Fora da sessão ---------- */
  var timerBloq = null;
  function cartaoEntrar() {
    var mine = C.mine();
    var st = S.status();
    var b = el("section", "panel-box sess-join");
    b.appendChild(el("h2", "", "Sessão em andamento"));
    var p = el("p", "");
    p.appendChild(document.createTextNode("A sessão da campanha está acontecendo aqui. Quer participar com "));
    p.appendChild(el("b", "", mine.char.nome));
    p.appendChild(document.createTextNode("? O mestre recebe o seu pedido e decide se você entra."));
    b.appendChild(p);
    var btn = el("button", "btn sess-join__btn", "Participar da sessão"); btn.type = "button";
    var info = el("p", "sess-join__info"); info.setAttribute("role", "status");
    if (st === "pendente") { btn.classList.add("is-pressed"); btn.setAttribute("aria-pressed", "true"); btn.disabled = true; info.textContent = "Pedido enviado. Aguardando o mestre…"; }
    else if (st === "rejeitado") {
      btn.disabled = true;
      var tick = function () {
        var falta = Math.max(0, S.bloqueadoAte() - Date.now());
        if (!falta) { clearInterval(timerBloq); timerBloq = null; renderAll(); return; }
        var s = Math.ceil(falta / 1000);
        info.textContent = "O mestre recusou o pedido. Você pode pedir de novo em " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + ".";
      };
      tick(); clearInterval(timerBloq); timerBloq = setInterval(tick, 1000);
    }
    btn.addEventListener("click", function () {
      btn.classList.add("is-pressed"); btn.setAttribute("aria-pressed", "true"); btn.disabled = true;
      S.pedir(mine.char.id).then(function () { info.textContent = "Pedido enviado. Aguardando o mestre…"; })
        .catch(function (err) { btn.classList.remove("is-pressed"); btn.removeAttribute("aria-pressed"); btn.disabled = false; info.textContent = err.message; });
    });
    b.appendChild(btn); b.appendChild(info);
    return b;
  }

  /* ---------- Nome de exibição obrigatório ---------- */
  var dlgNome = null;
  function pedirNome() {
    if (!dlgNome) {
      dlgNome = el("dialog", "modal sess-nome"); dlgNome.setAttribute("aria-labelledby", "sn-titulo");
      dlgNome.addEventListener("cancel", function (e) { e.preventDefault(); });
      document.body.appendChild(dlgNome);
    }
    var d = dlgNome; d.textContent = "";
    var h = el("h2", "", "Escolha seu nome"); h.id = "sn-titulo"; d.appendChild(h);
    d.appendChild(el("p", "modal__lead", "Você não possui um nome ainda. É preciso possuir um para poder entrar nessa sessão."));
    var form = el("form"); form.noValidate = true;
    var f = el("div", "field"); var l = el("label", "", "Nome de exibição"); l.htmlFor = "sn-nome";
    var i = el("input"); i.id = "sn-nome"; i.type = "text"; i.maxLength = 30; i.autocomplete = "nickname"; i.required = true;
    f.appendChild(l); f.appendChild(i); form.appendChild(f);
    var msg = el("p", "msg"); msg.setAttribute("role", "alert"); form.appendChild(msg);
    var acts = el("div", "modal__actions");
    var voltar = el("a", "btn btn--ghost", "Voltar"); voltar.href = "../campanha.html";
    var ok = el("button", "btn", "Salvar nome"); ok.type = "submit";
    acts.appendChild(voltar); acts.appendChild(ok); form.appendChild(acts);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      ok.disabled = true;
      Promise.resolve().then(function () { return DBOAuth.setNick(i.value); })
        .then(function () { d.close(); renderAll(); })
        .catch(function (err) { msg.textContent = err.message; msg.className = "msg msg--error"; })
        .then(function () { ok.disabled = false; });
    });
    d.appendChild(form);
    if (!d.open) d.showModal();
    i.focus();
  }

  /* ---------- Sair da sessão ---------- */
  var dlgSair = null;
  function confirmarSaida() {
    if (!dlgSair) { dlgSair = el("dialog", "modal sess-sair"); dlgSair.setAttribute("aria-labelledby", "ss-titulo"); document.body.appendChild(dlgSair); }
    var d = dlgSair; d.textContent = "";
    var h = el("h2", "", "Sair da sessão?"); h.id = "ss-titulo"; d.appendChild(h);
    d.appendChild(el("p", "modal__lead", "Seu personagem sai da sessão e do combate, e suas anotações são apagadas. Para voltar, você precisa pedir ao mestre de novo."));
    var acts = el("div", "modal__actions");
    var no = el("button", "btn btn--ghost", "Cancelar"); no.type = "button";
    var yes = el("button", "btn btn--danger", "Sair da sessão"); yes.type = "button";
    acts.appendChild(no); acts.appendChild(yes); d.appendChild(acts);
    no.addEventListener("click", function () { d.close(); });
    yes.addEventListener("click", function () {
      yes.disabled = true;
      var mine = C.mine();
      // No modo local, tira o personagem da ordem de iniciativa (no Supabase, sair_sessao já faz isso).
      var tirar = !S.remote && mine ? K.ordem().filter(function (e) { return K.isMine(e); }).map(function (e) { return K.remove(e.id); }) : [];
      Promise.all(tirar).then(function () { return S.sair(); })
        .then(function () { d.close(); initRoll = null; view = "sessao"; gravarPref("dbo-sess-view", view); return K.poll(); })
        .catch(function (err) { UI.toast(err.message); })
        .then(function () { yes.disabled = false; renderAll(); });
    });
    d.showModal();
    no.focus();
  }

  /* ---------- Notificações do mestre (canto inferior direito) ---------- */
  var notifSig = "";
  function renderNotif() {
    if (!mestre()) { notif.textContent = ""; notifSig = ""; return; }
    var pend = S.pendentes();
    var sig = pend.map(function (m) { return m.usuario_id + m.criado_em; }).join("|");
    if (sig === notifSig) return;
    notifSig = sig;
    notif.textContent = "";
    pend.forEach(function (m) {
      var c = charDoMembro(m);
      var card = el("div", "sess-notif__card"); card.setAttribute("role", "alert");
      card.appendChild(avatar(c || { nome: m.nome }, "sess-port"));
      var t = el("div", "sess-notif__txt");
      t.appendChild(el("b", "", m.nome || "Jogador"));
      t.appendChild(el("span", "", "quer participar da sessão" + (c ? " com " + c.nome : "") + "."));
      card.appendChild(t);
      var acts = el("div", "sess-notif__acts");
      var rej = el("button", "btn btn--ghost", "Rejeitar"); rej.type = "button";
      var ace = el("button", "btn", "Aceitar"); ace.type = "button";
      rej.addEventListener("click", function () { rej.disabled = ace.disabled = true; S.responder(m.usuario_id, false).then(atualizarMembros).catch(function (err) { UI.toast(err.message); rej.disabled = ace.disabled = false; }); });
      ace.addEventListener("click", function () { rej.disabled = ace.disabled = true; S.responder(m.usuario_id, true).then(function () { return C.reload(); }).then(atualizarMembros).catch(function (err) { UI.toast(err.message); rej.disabled = ace.disabled = false; }); });
      acts.appendChild(rej); acts.appendChild(ace); card.appendChild(acts);
      notif.appendChild(card);
    });
  }

  /* ---------- Desenhar tudo / partes ---------- */
  var statusDesenhado = null;
  function bloqueio() {
    if (!C.user()) return aviso("Conecta na sua conta pra entrar na sessão.", "Entrar na conta", "../configuracoes.html");
    if (!S.nick()) { setTimeout(pedirNome, 0); return aviso("Você não possui um nome ainda. É preciso possuir um para poder entrar nessa sessão.", null); }
    if (mestre()) return null;
    if (!C.mine()) return aviso("Você ainda não registrou um personagem na campanha.", "Ir para Jogadores", "jogadores.html");
    var st = S.status();
    if (st !== "aceito") return cartaoEntrar();
    return null;
  }
  function renderAll() {
    if (mapaInst) { mapaInst.destruir(); mapaInst = null; }
    main.textContent = ""; regions = {}; notasApi = null;
    statusDesenhado = S.status() + "|" + !!S.nick();
    var g = bloqueio();
    nav.hidden = !!g;
    document.body.classList.toggle("sess-fora", !!g);
    if (g) { main.appendChild(g); renderNotif(); return; }
    if (timerBloq) { clearInterval(timerBloq); timerBloq = null; }
    renderNav();
    document.body.dataset.sessView = view;
    if (view === "combate") renderCombate();
    else if (view === "notas") renderNotas();
    else renderSessao();
    if (entradaDir) {   // o conteúdo entra deslizando do lado do botão escolhido
      main.classList.remove("sess-entra--dir", "sess-entra--esq"); void main.offsetWidth;
      main.classList.add(entradaDir > 0 ? "sess-entra--dir" : "sess-entra--esq");
      entradaDir = 0;
    }
    renderNotif();
    setTimeout(syncEfeitos, 0);
  }
  function renderLeft() {
    if (regions.ficha && regions.ficha.isConnected) fichaInto(regions.ficha);
  }
  function renderRight() {
    if (regions.ordem && regions.ordem.isConnected) ordemInto(regions.ordem);
    if (regions.npcs && regions.npcs.isConnected) npcsInto(regions.npcs);
    if (regions.resumos && regions.resumos.isConnected) resumosInto(regions.resumos);
  }
  function atualizarMembros() {
    if (regions.jogadores && regions.jogadores.isConnected) jogadoresInto(regions.jogadores);
    renderNotif();
  }
  function render() { renderLeft(); renderRight(); setTimeout(syncEfeitos, 0); }

  // Espera uma ação (que pode ir ao banco), mostra o erro se houver e redesenha a ordem.
  // A ação já mudou a cópia local (js/combate-data.js): desenha na hora e de novo quando o banco responder.
  function act(promise) {
    renderRight();
    return Promise.resolve(promise).catch(function (err) { UI.toast(err.message); }).then(renderRight);
  }

  /* ---------- Turnos x efeitos ----------
     Quando a vez CHEGA no seu personagem: efeitos de começo de turno (veneno, drenagem, regeneração, recarga, sobrecarga).
     Quando a vez SAI dele: efeitos de fim de turno (queimadura) e a duração de todos diminui 1.
     Cada navegador cuida só do próprio personagem; efeitosTurno guarda o último turno já processado (não aplica duas vezes). */
  var syncando = false;
  function meuId(mine) {
    var me = DBOAuth.current();
    var e = K.ordem().filter(function (x) { return x.tipo !== "npc" && (x.personagem_id ? x.personagem_id === mine.char.id : (me && x.id === "p:" + me.email)); })[0];
    return e ? e.id : null;
  }
  function syncEfeitos() {
    if (syncando || !K.active() || !window.DBOEfeitos || !S.naSessao()) return;
    var mine = C.mine(), vez = K.vez();
    if (!mine || !vez) return;
    var eu = meuId(mine); if (!eu) return;
    var c = atual(mine.char), chave = K.combateId() + "|" + K.rodada() + "|" + vez, antes = c.efeitosTurno || "";
    if (antes === chave) return;
    var p = antes.split("|"), mesmoCombate = p[0] === String(K.combateId()), saiu = mesmoCombate && p[2] === eu, chegou = vez === eu;
    if (!saiu && !chegou) return;
    var patch = { efeitosTurno: chave }, msgs = [], cur = c;
    if (saiu) { var f = DBOEfeitos.fimTurno(cur); Object.assign(patch, f.patch); cur = Object.assign({}, cur, f.patch); msgs = msgs.concat(f.msgs); }
    if (chegou) { var i = DBOEfeitos.inicioTurno(cur); Object.assign(patch, i.patch); msgs = msgs.concat(i.msgs); }
    syncando = true;
    try { DBOCharacters.update(c.id, patch); } catch (err) { UI.toast(err.message); }
    syncando = false;
    if (chegou) msgs.unshift("Sua vez!");
    if (msgs.length) UI.toast(msgs.join(" · "));
    renderLeft();
  }

  /* ---------- Atualização automática ---------- */
  function sigOrdem() { return JSON.stringify([K.active(), K.rodada(), K.vez(), K.ordem()]); }
  function sigMembros() { return S.membros().map(function (m) { return m.usuario_id + ":" + m.status + ":" + m.personagem_id; }).join("|") + "#" + S.npcs().map(function (n) { return n.personagem_id + ":" + n.tamanho; }).join("|"); }
  var pollando = false;
  function atualizar() {
    if (pollando) return;
    pollando = true;
    var o0 = sigOrdem(), m0 = sigMembros();
    Promise.all([K.poll().catch(function () {}), S.poll().catch(function () {}), M.poll().catch(function () {})]).then(function () {
      var mudouMembros = sigMembros() !== m0;
      var antes = Promise.resolve();
      if (mudouMembros) antes = C.reload().catch(function () {});
      return antes.then(function () {
        if (S.status() + "|" + !!S.nick() !== statusDesenhado) { renderAll(); return; }
        if (sigOrdem() !== o0 && !editInit) { renderRight(); syncEfeitos(); if (regions.jogadores && regions.jogadores.isConnected) jogadoresInto(regions.jogadores); }
        if (mudouMembros) atualizarMembros();
        atualizarMapa();
        atualizarLog();
        renderNotif();
        aplicarTema();
      });
    }).then(function () { pollando = false; }, function () { pollando = false; });
  }

  // Tela de carregamento (céu da criação de personagem): some com um fade quando a sessão termina de abrir.
  var telaCarregando = document.getElementById("sess-carregando");
  function esconderCarregando() {
    if (!telaCarregando || telaCarregando.hidden) return;
    telaCarregando.classList.add("is-done");
    setTimeout(function () { telaCarregando.hidden = true; }, 500);
  }
  setTimeout(esconderCarregando, 25000);   // garantia: nunca fica presa

  // No modo Supabase os personagens vêm do banco: espera carregar a lista e as técnicas/equipamentos de cada um.
  DBOCharacters.ready()
    .then(function () { return C.ready(); })
    .then(function () { return DBORoles.refresh && DBORoles.refresh(); })
    .then(function () { return Promise.all([K.ready(), S.ready().catch(function (err) { UI.toast(err.message); }), M.ready().catch(function (err) { UI.toast(err.message); })]); })
    .then(function () { return Promise.all(DBOCharacters.list().map(function (c) { return DBOCharacters.hydrate(c.id); })); })
    .then(function () {
      aplicarTema();
      renderAll();
      esconderCarregando();
      // Atualização automática: a cada 2 s com a aba à vista, a cada 8 s escondida.
      (function laco() { setTimeout(function () { atualizar(); laco(); }, document.hidden ? 8000 : 2000); })();
      document.addEventListener("visibilitychange", function () { if (!document.hidden) atualizar(); });
      // Mudanças feitas aqui mesmo (mensagem enviada, apagada, pedido respondido) aparecem na hora.
      S.aoMudar(function () { atualizarLog(); atualizarMembros(); atualizarMapa(); if (regions.temas && regions.temas.isConnected) temasInto(regions.temas); });
    })
    .catch(function (err) { esconderCarregando(); UI.toast("Não consegui carregar a sessão: " + err.message); });

  // Outra aba do mesmo navegador mexeu na sessão ou no combate (modo local).
  window.addEventListener("storage", function (e) { if (e.key === "dbo-combat" || e.key === "dbo-sessao" || e.key === "dbo-sessao-mapa") atualizar(); });
})();
