// Dragon Ball Omega — criação de personagem (assistente em 5 passos)
(function () {
  var TOTAL_POINTS = 50;
  var MAX_PER_ATTR = DBOData.MAX_ATTR_CREATION;
  var REQUIRE_ALL_POINTS = true; // true: só avança depois de gastar os 50 pontos

  var RACES = DBOData.RACES;
  var ATTRIBUTES = DBOData.ATTRIBUTES;
  var ALIGNMENTS = DBOData.ALIGNMENTS;
  var STEPS = ["Identidade", "Classe", "Raça", "Atributos", "Imagem e resumo"];
  var OBRIGATORIAS = 4;   // as quatro primeiras; a imagem é opcional

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var ALTURA = /^[0-9][,][0-9]{2}$/; // altura em metros: 1,75
  var state = { nome: "", altura: "", idade: "", alinhamento: "", classe: "", raca: "", subraca: "", atributos: {}, foto: "" };
  ATTRIBUTES.forEach(function (a) { state.atributos[a[0]] = 0; });
  var current = 0;
  var blocked = false;
  // criar-personagem.html?npc=1: o mestre cria um NPC (Campanha > NPCs). Mesmos passos; na ficha ele ganha liberdades de NPC.
  var NPC = new URLSearchParams(location.search).get("npc") === "1";
  var VOLTAR = NPC ? "campanha/npcs.html" : "personagens.html";
  if (NPC) {
    document.title = "Criar NPC | Dragon Ball Omega";
    $("wizard-title").textContent = "Criar NPC";
    document.querySelector(".wizard__lead").textContent = "O NPC começa no nível 1. Depois, na ficha dele, você escolhe o nível, o Power Level base e pode dar qualquer técnica, habilidade de classe e equipamento.";
  }

  // Só cria personagem quem está conectado e com o e-mail confirmado. NPC: só o mestre.
  (function guard() {
    var user = DBOAuth.current(), text = null;
    if (!user) text = "Pra criar um personagem, você precisa ter uma conta. Crie uma (ou entre) em Configurações. Depois é só confirmar o e-mail que a gente manda.";
    else if (!user.confirmed) text = "Seu e-mail ainda não foi confirmado. Abre a mensagem que enviamos (olha o spam também) e clica no link. Depois volta aqui.";
    else if (NPC && !(window.DBORoles && DBORoles.isMaster())) text = "Só o mestre cria NPCs.";
    if (!text) return;
    $("blocked-text").textContent = text;
    $("blocked").hidden = false;
    $("wizard-title").hidden = true;
    document.querySelector(".wizard__lead").hidden = true;
    $("wizard").hidden = true;
    document.querySelector(".progress").hidden = true;
    $("progress-label").hidden = true;
    $("secao-box").hidden = true;
    blocked = true;
  })();

  var form = $("wizard");
  var msg = $("wizard-msg");
  var backBtn = $("back");
  var nextBtn = $("next");
  var panels = form.querySelectorAll(".step");
  var bars = document.querySelectorAll(".progress li");

  function setMsg(text) {
    msg.textContent = text || "";
    msg.className = "msg" + (text ? " msg--error" : "");
  }

  /* ---------- Passo 1: identidade ---------- */
  ["nome", "altura", "idade"].forEach(function (key) {
    $("f-" + key).addEventListener("input", function (e) { state[key] = e.target.value; });
  });

  ALIGNMENTS.forEach(function (name) {
    var chip = el("label", "chip");
    var input = el("input");
    input.type = "radio";
    input.name = "alinhamento";
    input.value = name;
    input.addEventListener("change", function () { state.alinhamento = name; });
    chip.appendChild(input);
    chip.appendChild(el("span", "", name));
    $("alignments").appendChild(chip);
  });

  /* ---------- Passo 2: classe ---------- */
  form.querySelectorAll("input[name=classe]").forEach(function (input) {
    input.addEventListener("change", function () { state.classe = input.value; });
  });
  form.querySelectorAll("[data-descricao]").forEach(function (node) {   // texto de cada classe: DBOData.CLASS_INFO
    var text = (DBOData.CLASS_INFO || {})[node.getAttribute("data-descricao")];
    if (text) node.textContent = text;
  });

  /* ---------- Passo 3: raça e sub-raça ---------- */
  // Lista de raças à esquerda; à direita, a caixa com a sub-raça (se tiver) e o texto de características (DBOData.RACE_INFO).
  function infoDe(nome) { var i = (DBOData.RACE_INFO || {})[nome] || {}; return { fisico: i.fisico || "W.I.P", ingame: i.ingame || "W.I.P" }; }
  function bloco(titulo, texto) {
    var s = el("section");
    s.appendChild(el("h5", "", titulo));
    if (texto != null) s.appendChild(el("p", "", texto));
    return s;
  }
  function semAcento(t) { return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  // Cartão de uma habilidade (raça ou sub-raça): nome, tipo (Mecânica, Narrativa, Híbrida) e texto.
  function habCard(h) {
    var d = el("div", "habinfo"), top = el("div", "habinfo__top");
    top.appendChild(el("strong", "", h.nome));
    if (h.tipo) top.appendChild(el("span", "habinfo__tag habinfo__tag--" + semAcento(h.tipo), h.tipo));
    d.appendChild(top);
    d.appendChild(el("p", "habinfo__txt", h.descricao));
    return d;
  }
  function listaHabs(titulo, habs) {
    var s = el("section", "habsec");
    s.appendChild(el("h5", "", titulo));
    habs.forEach(function (h) { s.appendChild(habCard(h)); });
    return s;
  }
  // Fatos fixos de uma sub-raça (ou raça sem sub-raça): bônus de atributo, Soco, imunidades.
  function fatos(raca, sub) {
    var out = [], tm = DBOData.SUBRACE_MODS || {}, m = tm[raca + "|" + sub] || tm[raca];
    if (m) {
      var txt = ATTRIBUTES.filter(function (a) { return m[a[0]]; }).map(function (a) { return a[1] + " " + (m[a[0]] > 0 ? "+" : "−") + Math.abs(m[a[0]]); });
      if (txt.length) out.push(["Modificadores", txt.join(", ")]);
    }
    var t = DBOData.RACE_MASTERY || {};
    var pk = DBORules.chaveRaca({ raca: raca, subraca: sub });
    if (pk) out.push(["PL base da raça", String(DBOData.SUBRACE_PL[pk]).replace(/\B(?=(\d{3})+$)/g, ".")]);
    out.push(["Maestria do Soco", String(t[raca + "|" + sub] || t[raca] || 1)]);
    if (sub === "Construto" || sub === "Mecânico") out.push(["Imunidades", "Envenenamento e Sangramento"]);
    if (sub === "Cerealjin") out.push(["Imunidades", "Cegueira"]);
    return out;
  }
  function renderRaceText() {
    var box = $("race-text");
    box.textContent = "";
    var subs = RACES[state.raca] || [];
    var daRaca = (DBOData.RACE_ABILITIES || {})[state.raca] || [];
    if (subs.length && !state.subraca) {
      box.appendChild(bloco("Características físicas", infoDe(state.raca).fisico));
      box.appendChild(el("p", "raceinfo__hint", "Clica numa sub-raça para ler as características dela."));
      if (daRaca.length) box.appendChild(listaHabs("Habilidades de todo " + state.raca, daRaca));
      return;
    }
    var info = infoDe(state.subraca || state.raca);
    box.appendChild(bloco("Características físicas", info.fisico));
    var jogo = bloco("Características no jogo", info.ingame === "W.I.P" ? null : info.ingame);
    var dl = el("dl", "fatos");
    fatos(state.raca, state.subraca).forEach(function (f) {
      dl.appendChild(el("dt", "", f[0])); dl.appendChild(el("dd", "", f[1]));
    });
    jogo.appendChild(dl);
    box.appendChild(jogo);
    if (daRaca.length) box.appendChild(listaHabs(subs.length ? "Habilidades de todo " + state.raca : "Habilidades de raça", daRaca));
    var daSub = (DBOData.SUBRACE_ABILITIES || {})[state.raca + "|" + state.subraca] || [];
    if (daSub.length) box.appendChild(listaHabs("Habilidades de " + state.subraca, daSub));
    box.appendChild(el("p", "raceinfo__nota", "Habilidades de raça e de sub-raça valem desde o nível 1 e não ocupam espaço nas técnicas."));
  }
  function renderRaces() {
    var box = $("races");
    Object.keys(RACES).forEach(function (race) {
      var label = el("label", "choice");
      var input = el("input");
      input.type = "radio";
      input.name = "raca";
      input.value = race;
      input.addEventListener("change", function () {
        state.raca = race;
        state.subraca = "";
        renderSubraces();
      });
      var body = el("span", "choice__body");
      body.appendChild(el("strong", "", race));
      label.appendChild(input);
      label.appendChild(body);
      box.appendChild(label);
    });
  }

  function renderSubraces() {
    var subs = RACES[state.raca] || [];
    var list = $("subraces-list");
    list.textContent = "";
    $("race-hint").hidden = true;
    $("race-detail").hidden = false;
    $("race-name").textContent = state.raca;
    $("subraces").hidden = subs.length === 0;
    subs.forEach(function (name) {
      var chip = el("label", "chip");
      var input = el("input");
      input.type = "radio";
      input.name = "subraca";
      input.value = name;
      input.addEventListener("change", function () { state.subraca = name; renderRaceText(); });
      chip.appendChild(input);
      chip.appendChild(el("span", "", name));
      list.appendChild(chip);
    });
    renderRaceText();
  }

  /* ---------- Passo 4: atributos ---------- */
  var attrRows = {};

  function pointsLeft() {
    return TOTAL_POINTS - ATTRIBUTES.reduce(function (sum, a) { return sum + state.atributos[a[0]]; }, 0);
  }

  function updateAttributes() {
    var left = pointsLeft();
    $("points-left").textContent = left;
    ATTRIBUTES.forEach(function (a) {
      var row = attrRows[a[0]];
      var value = state.atributos[a[0]];
      var m = DBORules.mod({ raca: state.raca, subraca: state.subraca, atributos: state.atributos }, a[0]);   // já com o bônus da sub-raça
      row.value.textContent = String(value);
      row.mod.textContent = "modificador " + (m >= 0 ? "+" + m : "−" + Math.abs(m));
      row.mod.classList.toggle("is-zero", m === 0);
      row.minus.disabled = row.minus5.disabled = value <= 0;
      row.plus.disabled = row.plus5.disabled = left <= 0 || value >= MAX_PER_ATTR;
    });
    renderOrb();
  }

  // Esfera do dragão com os modificadores de agora, igual à da ficha.
  function renderOrb() {
    var box = $("attr-orb");
    if (!box || !window.DBOOrb) return;
    var temp = { nivel: 1, classe: state.classe, raca: state.raca, subraca: state.subraca, atributos: state.atributos, transformacoes: [], tpGastos: DBOData.START_TP };
    var pl = 0;
    try { pl = DBORules.powerLevel(temp); } catch (e) { pl = 0; }
    DBOOrb.render(box, {
      editing: false,
      pl: pl,
      attrs: ATTRIBUTES.map(function (a) {
        var raw = state.atributos[a[0]] || 0;
        return { key: a[0], label: a[1], abbr: a[2], raw: raw, mod: DBORules.mod(temp, a[0]) };
      })
    });
  }

  function change(key, delta) {
    if (delta > 0) delta = Math.min(delta, pointsLeft(), MAX_PER_ATTR - state.atributos[key]); // "+5" usa o que couber
    else if (delta < 0) delta = -Math.min(-delta, state.atributos[key]);                         // "−5" tira só o que houver
    var next = state.atributos[key] + delta;
    if (delta === 0 || next < 0 || next > MAX_PER_ATTR || (delta > 0 && pointsLeft() <= 0)) return;
    state.atributos[key] = next;
    updateAttributes();
  }

  function renderAttributes() {
    var list = $("attrs");
    ATTRIBUTES.forEach(function (a) {
      var li = el("li", "attr");
      var info = el("div", "attr__info");
      info.appendChild(el("span", "attr__name", a[1]));
      var mod = el("span", "attr__mod", "modificador +0");
      info.appendChild(mod);
      li.appendChild(info);
      var ctrl = el("div", "attr__ctrl");
      var minus5 = el("button", "round round--five", "−5");
      var minus = el("button", "round", "−");
      var plus = el("button", "round", "+");
      var plus5 = el("button", "round round--five", "+5");
      var value = el("span", "attr__val", "0");
      minus5.type = minus.type = plus.type = plus5.type = "button";
      minus5.setAttribute("aria-label", "Diminuir " + a[1] + " em 5");
      minus.setAttribute("aria-label", "Diminuir " + a[1]);
      plus.setAttribute("aria-label", "Aumentar " + a[1]);
      plus5.setAttribute("aria-label", "Aumentar " + a[1] + " em 5");
      minus5.addEventListener("click", function () { change(a[0], -5); });
      plus5.addEventListener("click", function () { change(a[0], 5); });
      minus.addEventListener("click", function () { change(a[0], -1); });
      plus.addEventListener("click", function () { change(a[0], 1); });
      ctrl.appendChild(minus5);
      ctrl.appendChild(minus);
      ctrl.appendChild(value);
      ctrl.appendChild(plus);
      ctrl.appendChild(plus5);
      li.appendChild(ctrl);
      list.appendChild(li);
      attrRows[a[0]] = { minus: minus, minus5: minus5, plus: plus, plus5: plus5, value: value, mod: mod };
    });
    updateAttributes();
  }

  /* ---------- Passo 5: imagem e resumo ---------- */
  function renderPhoto() {
    var preview = $("photo-preview");
    preview.textContent = "";
    if (state.foto) {
      var img = el("img");
      img.src = state.foto;
      img.alt = "";
      preview.appendChild(img);
    } else {
      preview.textContent = (state.nome.trim().charAt(0) || "?").toUpperCase();
    }
    $("photo-remove").hidden = !state.foto;
  }

  $("photo").addEventListener("change", async function () {
    var file = this.files[0];
    if (!file) return;
    try {
      var cropped = await DBOCropper.pick(file, 320); // abre a janela de zoom e recorte
      if (cropped) state.foto = cropped;
      setMsg("");
    } catch (err) {
      setMsg(err.message);
    }
    this.value = ""; // deixa escolher o mesmo arquivo de novo
    renderPhoto();
  });
  $("photo-remove").addEventListener("click", function () {
    state.foto = "";
    $("photo").value = "";
    renderPhoto();
  });

  function renderSummary() {
    var box = $("summary");
    box.textContent = "";
    var race = state.raca + (state.subraca ? " (" + state.subraca + ")" : "");
    var attrs = ATTRIBUTES.map(function (a) { return a[1] + " " + state.atributos[a[0]]; }).join(", ");
    var plTxt = "";
    if (state.classe && state.raca) { try { plTxt = UI.fmt(DBORules.powerLevel({ nivel: 1, classe: state.classe, raca: state.raca, subraca: state.subraca, atributos: state.atributos, transformacoes: [], tpGastos: DBOData.START_TP })); } catch (e) {} }
    [["Nome", state.nome.trim()], ["Nível", "1"], ["Classe", state.classe], ["Raça", race],
     ["Alinhamento", state.alinhamento], ["Altura", state.altura.trim()], ["Idade", state.idade],
     ["Atributos", attrs], ["Poder de luta", plTxt]].forEach(function (pair) {
      box.appendChild(el("dt", "", pair[0]));
      box.appendChild(el("dd", "", pair[1]));
    });
    var faltam = [];
    for (var i = 0; i < OBRIGATORIAS; i++) if (validate(i)) faltam.push(STEPS[i]);
    if (faltam.length) {
      box.appendChild(el("dt", "summary__falta", "Falta preencher"));
      box.appendChild(el("dd", "summary__falta", faltam.join(", ")));
    }
  }

  /* ---------- Validação e navegação ---------- */
  // Cada seção pode ser preenchida em qualquer ordem. validate() devolve o que falta numa seção ("" = pronta).
  function validate(step) {
    if (step === 0) {
      if (!state.nome.trim()) return "Falta o nome do personagem.";
      if (!state.altura.trim()) return "Falta a altura.";
      if (!ALTURA.test(state.altura.trim())) return "A altura precisa estar no formato 1,75 (em metros, com vírgula).";
      if (state.idade === "" || !Number.isInteger(Number(state.idade)) || Number(state.idade) < 0) return "A idade precisa ser um número inteiro, sem negativos.";
      if (!state.alinhamento) return "Escolhe um alinhamento.";
    }
    if (step === 1) {
      if (!state.classe) return "Escolhe uma classe pra continuar.";
      if (state.alinhamento && !DBORules.alinhamentoOk(state.classe, state.alinhamento)) return "O " + state.classe + " só aceita alinhamentos " + DBOData.CLASS_ALIGNMENT[state.classe] + "s. Troque o alinhamento (seção Identidade) ou a classe.";
    }
    if (step === 2) {
      if (!state.raca) return "Escolhe uma raça pra continuar.";
      if (RACES[state.raca].length && !state.subraca) return "Escolhe uma sub-raça pra continuar.";
    }
    if (step === 3 && REQUIRE_ALL_POINTS && pointsLeft() > 0) {
      return "Ainda sobram " + pointsLeft() + " pontos. Distribui todos os " + TOTAL_POINTS + " pra continuar.";
    }
    return "";
  }
  function pronta(i) { return i < OBRIGATORIAS ? validate(i) === "" : !!state.foto; }
  function primeiraPendencia() {
    for (var i = 0; i < OBRIGATORIAS; i++) { var p = validate(i); if (p) return { step: i, msg: p }; }
    return null;
  }

  // O select do topo escolhe a seção; as marcas ✓ mostram o que já está pronto.
  var secao = $("secao");
  STEPS.forEach(function (name, i) { var o = el("option", "", name); o.value = String(i); secao.appendChild(o); });
  function status() {
    var feitas = 0;
    STEPS.forEach(function (name, i) {
      var ok = pronta(i);
      if (ok && i < OBRIGATORIAS) feitas++;
      secao.options[i].textContent = (ok ? "✓ " : "") + (i + 1) + ". " + name;
      bars[i].classList.toggle("is-done", ok && i !== current);
    });
    $("progress-label").textContent = "Seção " + (current + 1) + " de " + STEPS.length + ": " + STEPS[current] + " · " + feitas + " de " + OBRIGATORIAS + " obrigatórias prontas";
  }
  secao.addEventListener("change", function () { go(Number(secao.value), true); });
  form.addEventListener("input", status);
  form.addEventListener("change", status);
  form.addEventListener("click", function () { setTimeout(status, 0); });

  function go(step, moveFocus) {
    current = step;
    panels.forEach(function (panel, i) { panel.hidden = i !== step; });
    bars.forEach(function (bar, i) { bar.classList.toggle("is-current", i === step); });
    secao.value = String(step);
    nextBtn.textContent = step === STEPS.length - 1 ? (NPC ? "Criar NPC" : "Criar personagem") : "Continuar";
    backBtn.textContent = step === 0 ? "Cancelar" : "Voltar";
    setMsg("");
    if (step === 3) renderOrb();
    if (step === 4) { renderPhoto(); renderSummary(); }
    status();
    if (moveFocus) {
      window.scrollTo({ top: 0 });
      panels[step].querySelector("h2").focus();
    }
  }

  function create() {
    var u = DBOAuth.current();
    if (blocked || !u || !u.confirmed) return;
    nextBtn.disabled = true;
    $("creating").hidden = false;     // já mostra a tela de carregamento da ficha: salvar demora um pouco e a tela não pode parecer travada
    var character = {
      nome: state.nome.trim(),
      nivel: 1,
      v: DBOData.SCHEMA,
      tpAtuais: 0,
      tpGastos: DBOData.START_TP,
      zeni: 2000,
      classe: state.classe,
      raca: state.raca,          // por fora aparece só a raça (ex.: "Sayajin")
      subraca: state.subraca,    // a sub-raça só aparece dentro da ficha
      altura: state.altura.trim(),
      idade: Number(state.idade),
      alinhamento: state.alinhamento,
      atributos: state.atributos,
      foto: state.foto
    };
    // Já nasce com vida/KP cheios, as técnicas iniciais e as listas vazias (no banco, isso vira linhas nas tabelas).
    character.hpAtual = DBORules.hpMax(character);
    character.kpAtual = DBORules.kpMax(character);
    character.tecnicas = JSON.parse(JSON.stringify(DBOData.INITIAL_TECHNIQUES));
    character.equipamentos = [];
    character.transformacoes = [];
    var ini = DBORules.inicialDaClasse(state.classe);          // habilidade de classe inicial (Destemido!, Inventor...)
    character.habilidadesClasse = ini ? [ini.id] : [];
    if (NPC) character.npc = true;
    // add() devolve o personagem (modo local) ou uma Promise (modo Supabase).
    Promise.resolve().then(function () { return DBOCharacters.add(character); }).then(function (saved) {
      if (!saved || !saved.id) throw new Error("O personagem não foi salvo. Confira se todos os arquivos da pasta js estão atualizados e tente de novo.");
      leaving = true;   // personagem criado: sair sem perguntar
      DBOTransition.go(DBOCharacters.sheetUrl(saved.id));
    }).catch(function (err) {
      $("creating").hidden = true;
      setMsg(err.message);
      nextBtn.disabled = false;
    });
  }


  /* ---------- Aviso ao sair no meio da criação ---------- */
  var leaving = false;   // vira true depois do "Sim" (ou de criar o personagem): aí ninguém mais pergunta
  var leaveDlg = null, leaveHref = "";
  function buildLeave() {
    leaveDlg = el("dialog", "leave");
    leaveDlg.setAttribute("aria-labelledby", "leave-title");
    var h = el("h2", "", "Tem certeza que quer ser redirecionado?"); h.id = "leave-title";
    var sub = el("p", "leave__sub", "Se sair agora, perderá todas informações de seu personagem.");
    var row = el("div", "leave__actions");
    var yes = el("button", "btn leave__yes", "Sim"); yes.type = "button";
    var no = el("button", "btn leave__no", "Não"); no.type = "button";
    yes.addEventListener("click", function () { leaving = true; leaveDlg.close(); DBOTransition.go(leaveHref); });
    no.addEventListener("click", function () { leaveDlg.close(); });
    row.appendChild(yes); row.appendChild(no);
    [h, sub, row].forEach(function (n) { leaveDlg.appendChild(n); });
    document.body.appendChild(leaveDlg);
  }
  function askLeave(href) {
    if (leaving) { DBOTransition.go(href); return; }
    if (!leaveDlg) buildLeave();
    leaveHref = href;
    leaveDlg.showModal();
    leaveDlg.querySelector(".leave__no").focus();   // o foco começa no "Não", pra um Enter sem querer não apagar tudo
  }
  // Qualquer link que leve pra outra página (menu, logo, configurações...) passa pelo aviso.
  document.addEventListener("click", function (event) {
    if (blocked || leaving || event.defaultPrevented) return;
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || link.hasAttribute("download")) return;
    var raw = link.getAttribute("href");
    if (!raw || raw.charAt(0) === "#" || /^(mailto|tel|javascript):/i.test(raw)) return;
    var url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return; // mesma página
    event.preventDefault();
    event.stopImmediatePropagation();   // o efeito de transição só roda se a pessoa confirmar
    askLeave(link.href);
  }, true);
  // Fechar a aba, atualizar ou voltar pelo navegador: só o aviso padrão do navegador consegue aparecer.
  window.addEventListener("beforeunload", function (event) {
    if (blocked || leaving) return;
    if (!state.nome.trim() && !state.classe && !state.raca) return;   // ainda não digitou nada
    event.preventDefault(); event.returnValue = "";
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (current < STEPS.length - 1) return go(current + 1, true);
    var pend = primeiraPendencia();     // na última seção, confere todas e leva a pessoa até a que falta
    if (pend) { go(pend.step, true); return setMsg(pend.msg); }
    create();
  });
  backBtn.addEventListener("click", function () {
    if (current === 0) askLeave(VOLTAR);
    else go(current - 1, true);
  });

  /* ---------- Início ---------- */
  renderRaces();
  renderAttributes();
  go(0, false);
})();
