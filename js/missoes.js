// Dragon Ball Omega — Missões: cartazes de procurado em papiro, da esquerda pra direita.
// Mestre: cria cartaz da Patrulha e remove cartazes (modo de deleção).
// Jogador: pega cartaz com um personagem, abandona ou conclui (carimbo + recompensa em Zenis), e cria cartaz anônimo pagando com os Zenis do personagem.
(function () {
  var UI = DBOUI, E = DBOEnc, el = UI.el, master = false;
  var strip = document.getElementById("posters");
  var dlg = document.getElementById("enc-dialog"), form = document.getElementById("enc-form"), msg = document.getElementById("enc-msg");
  var section = "patrulha";
  var imgField = null;
  var myChars = [];                       // personagens da conta
  var delMode = false, picked = {};       // modo de deleção e cartazes marcados
  var CZ_ASPECT = 1.6;                    // proporção do recorte da imagem do cartaz

  var q = new URLSearchParams(location.search);
  var focus = q.get("cartaz") ? { cartaz: q.get("cartaz"), personagem: q.get("personagem"), concluir: q.get("concluir") === "1" } : null;

  function charName(id) { var c = myChars.filter(function (x) { return x.id === id; })[0]; return c ? c.nome : "Personagem"; }
  function btn(text, cls, fn) { var b = el("button", "btn " + cls, text); b.type = "button"; b.addEventListener("click", fn); return b; }
  function fail(e) { UI.toast(e && e.message ? e.message : String(e)); }

  /* ---------- Cartaz ---------- */
  function poster(c) {
    var p = el("article", "poster");
    p.dataset.id = c.id;
    p.appendChild(el("p", "poster__top", c.secao === "patrulha" ? "Procurado" : "Ocorrência anônima"));
    p.appendChild(el("h2", "poster__target", c.alvo));
    if (c.imagem) { var pic = el("img", "poster__img"); pic.src = c.imagem; pic.alt = "Imagem de " + c.alvo; p.appendChild(pic); }
    var r = el("p", "poster__reward");
    r.appendChild(el("span", "", "Recompensa"));
    r.appendChild(el("b", "", UI.fmt(c.recompensa) + " Z"));
    p.appendChild(r);
    if (c.descricao) { p.appendChild(el("h3", "", "Descrição")); p.appendChild(el("p", "", c.descricao)); }
    if (c.localizacao) { p.appendChild(el("h3", "", "Localização")); p.appendChild(el("p", "", c.localizacao)); }

    if (delMode) {                      // modo de deleção: clicar marca o cartaz
      p.classList.add("poster--pick");
      p.classList.toggle("is-picked", !!picked[c.id]);
      p.tabIndex = 0;
      p.setAttribute("role", "checkbox");
      p.setAttribute("aria-checked", String(!!picked[c.id]));
      function toggle() { if (picked[c.id]) delete picked[c.id]; else picked[c.id] = true; render(); }
      p.addEventListener("click", toggle);
      p.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
      return p;
    }

    // Pedido de conclusão esperando o mestre: o cartaz desbota, ganha o carimbo e (para o mestre) os botões de validar.
    var pend = E.concluidos ? E.concluidos(c.id) : [];
    var pm = master && pend.length ? ((focus && focus.personagem && pend.filter(function (x) { return x.p === focus.personagem; })[0]) || pend[0]) : null;
    if (pm) {
      var body = el("div", "poster__body poster__body--done");
      while (p.firstChild) body.appendChild(p.firstChild);
      p.appendChild(body);
      p.appendChild(el("div", "poster__stamp", "Concluído"));
      var v = el("div", "poster__valida");
      v.appendChild(el("p", "poster__user", pm.usuario || "Usuário"));
      v.appendChild(el("p", "poster__char", pm.personagem));
      var vacts = el("div", "poster__acts");
      vacts.appendChild(btn("Rejeitar", "btn--red", function () { validate(pm, c, false); }));
      vacts.appendChild(btn("Aceitar", "btn--green", function () { validate(pm, c, true); }));
      v.appendChild(vacts);
      if (pend.length > 1) v.appendChild(el("small", "poster__fila", "+" + (pend.length - 1) + " pedido" + (pend.length > 2 ? "s" : "") + " na fila"));
      p.appendChild(v);
      return p;
    }

    var foot = el("div", "poster__foot");
    var took = E.pegaram ? E.pegaram(c.id).filter(function (id) { return myChars.some(function (x) { return x.id === id; }); }) : [];
    took.forEach(function (pid) {
      var row = el("div", "poster__mine");
      row.appendChild(el("span", "poster__who", charName(pid)));
      if (pend.some(function (x) { return x.p === pid; })) {        // já pediu a conclusão: espera o mestre
        row.appendChild(el("span", "poster__wait", "Concluída · aguardando o mestre"));
        foot.appendChild(row);
        return;
      }
      var acts = el("div", "poster__acts");
      acts.appendChild(btn("Abandonar", "btn--red", function () { abandon(pid, c.id); }));
      acts.appendChild(btn("Concluir", "", function () { askConclude(pid, c.id); }));
      row.appendChild(acts);
      foot.appendChild(row);
    });
    var free = myChars.filter(function (x) { return took.indexOf(x.id) < 0; });
    if (free.length) foot.appendChild(btn("Pegar cartaz", "btn--take", function () { openPick(c, free); }));
    if (foot.children.length) p.appendChild(foot);
    return p;
  }

  function createCard(label, sec) {
    var b = el("button", "poster poster--new");
    b.type = "button";
    b.appendChild(el("span", "poster__plus", "+"));
    b.appendChild(el("span", "", label));
    b.addEventListener("click", function () { if (sec === "anonima") openAnon(); else openForm(sec); });
    return b;
  }

  function render() {
    var keep = strip.scrollLeft;
    strip.textContent = "";
    var user = DBOAuth.current();
    E.cartazes("patrulha").forEach(function (c) { strip.appendChild(poster(c)); });
    if (master && !delMode) strip.appendChild(createCard("Criar cartaz da Patrulha", "patrulha"));
    if (!E.cartazes("patrulha").length && !master) strip.appendChild(el("p", "empty poster__empty", "A Patrulha ainda não afixou nenhum cartaz."));

    var div = el("section", "poster-divider");
    div.appendChild(el("h2", "", "Ocorrências anônimas"));
    div.appendChild(el("p", "", "Cartazes criados pelos jogadores. Sem selo oficial, por sua conta e risco."));
    strip.appendChild(div);
    E.cartazes("anonima").forEach(function (c) { strip.appendChild(poster(c)); });
    if (user && !delMode) strip.appendChild(createCard("Criar cartaz anônimo", "anonima"));
    else if (!user) strip.appendChild(el("p", "empty poster__empty", "Conecte-se na sua conta para criar cartazes."));
    strip.scrollLeft = keep;
    renderBar();
  }

  /* ---------- Modo de deleção (só o mestre) ---------- */
  var tools = document.getElementById("poster-tools"), bar = document.getElementById("del-bar");
  function renderBar() {
    var n = Object.keys(picked).length;
    tools.hidden = !master;
    var t = document.getElementById("del-toggle");
    t.classList.toggle("is-on", delMode);
    t.setAttribute("aria-pressed", String(delMode));
    bar.hidden = !delMode;
    document.getElementById("del-count").textContent = n === 0 ? "Marque os cartazes que vão sumir." : n === 1 ? "1 cartaz marcado." : n + " cartazes marcados.";
    document.getElementById("del-go").disabled = n === 0;
  }
  document.getElementById("del-toggle").addEventListener("click", function () { delMode = !delMode; picked = {}; render(); });
  document.getElementById("del-cancel").addEventListener("click", function () { delMode = false; picked = {}; render(); });
  var rmDlg = document.getElementById("rm-dialog");
  document.getElementById("del-go").addEventListener("click", function () {
    var n = Object.keys(picked).length; if (!n) return;
    document.getElementById("rm-text").textContent = n === 1 ? "Esse cartaz some pra todo mundo, junto com as missões que jogadores pegaram dele." : "Esses " + n + " cartazes somem pra todo mundo, junto com as missões que jogadores pegaram deles.";
    var inp = document.getElementById("rm-word"); inp.value = ""; document.getElementById("rm-confirm").disabled = true;
    rmDlg.showModal(); inp.focus();
  });
  document.getElementById("rm-word").addEventListener("input", function (e) { document.getElementById("rm-confirm").disabled = e.target.value.trim().toUpperCase() !== "REMOVER"; });
  document.getElementById("rm-keep").addEventListener("click", function () { rmDlg.close(); });
  document.getElementById("rm-confirm").addEventListener("click", async function () {
    var ids = Object.keys(picked);
    this.disabled = true;
    try { await E.removerCartazes(ids); } catch (e) { rmDlg.close(); return fail(e); }
    rmDlg.close(); picked = {}; delMode = false; render();
    UI.toast(ids.length === 1 ? "Cartaz removido." : ids.length + " cartazes removidos.");
  });

  /* ---------- Pegar, abandonar, concluir ---------- */
  var pickDlg = document.getElementById("pick-dialog");
  function openPick(c, chars) {
    document.getElementById("pick-lead").textContent = "Cartaz: " + c.alvo + " (" + UI.fmt(c.recompensa) + " Z)";
    var list = document.getElementById("pick-list"); list.textContent = "";
    chars.forEach(function (ch) {
      var b = el("button", "pick__char"); b.type = "button";
      b.appendChild(el("strong", "", ch.nome));
      b.appendChild(el("small", "", ch.classe + " · nível " + ch.nivel));
      b.addEventListener("click", async function () {
        pickDlg.close();
        try { await E.pegar(ch.id, c.id); UI.toast(ch.nome + " pegou o cartaz de " + c.alvo + "."); render(); } catch (e) { fail(e); }
      });
      list.appendChild(b);
    });
    pickDlg.showModal();
  }
  document.getElementById("pick-cancel").addEventListener("click", function () { pickDlg.close(); });

  async function abandon(pid, cid) {            // sem pedir confirmação
    try { await E.abandonar(pid, cid); render(); } catch (e) { fail(e); }
  }

  // Mestre: aceita (paga a recompensa e tira o cartaz) ou rejeita (a missão volta para o jogador).
  async function validate(pm, c, accept) {
    try {
      if (accept) { var zeni = await E.aceitar(pm.p, c.id); UI.toast(pm.personagem + " recebeu " + UI.fmt(c.recompensa) + " Zenis." + (zeni ? "" : "")); }
      else { await E.rejeitar(pm.p, c.id); UI.toast("Conclusão de " + pm.personagem + " rejeitada."); }
      render();
    } catch (e) { fail(e); }
  }

  var cfDlg = document.getElementById("cf-dialog"), cfPending = null;
  function askConclude(pid, cid) {
    cfPending = { pid: pid, cid: cid };
    cfDlg.showModal();
  }
  document.getElementById("cf-no").addEventListener("click", function () { cfPending = null; cfDlg.close(); });
  document.getElementById("cf-yes").addEventListener("click", async function () {
    var job = cfPending; cfPending = null; cfDlg.close();
    if (!job) return;
    try { await E.concluir(job.pid, job.cid); } catch (e) { return fail(e); }
    UI.toast("Pedido enviado: o mestre vai validar a conclusão de " + charName(job.pid) + ".");
    render();
  });

  /* ---------- Cartaz da Patrulha (mestre) ---------- */
  function openForm(sec) {
    section = sec; msg.textContent = ""; form.textContent = "";
    document.getElementById("enc-title").textContent = "Cartaz da Patrulha";
    [["alvo", "Alvo", "text", true], ["recompensa", "Recompensa (em Zenis)", "number", true], ["descricao", "Descrição", "textarea"], ["localizacao", "Localização", "text"]].forEach(function (f, i) {
      var wrap = el("div", "field"), label = el("label", "", f[1] + (f[3] ? "" : " (opcional)")), c;
      if (f[2] === "textarea") { c = el("textarea"); c.rows = 3; c.maxLength = 600; }
      else { c = el("input"); c.type = f[2]; c.maxLength = 80; c.autocomplete = "off"; if (f[2] === "number") { c.min = 0; c.step = 1; c.value = 0; delete c.maxLength; } }
      c.name = f[0]; c.id = "pf-" + i; label.htmlFor = c.id;
      wrap.appendChild(label); wrap.appendChild(c); form.appendChild(wrap);
    });
    actionsRow("Afixar cartaz");
    dlg.showModal(); form.elements.alvo.focus();
  }
  function actionsRow(okText) {
    imgField = E.imageField("Imagem do alvo", CZ_ASPECT);
    form.appendChild(imgField.node);
    var row = el("div", "enc-actions");
    var cancel = el("button", "btn btn--red", "Cancelar"); cancel.type = "button";
    cancel.addEventListener("click", function () { dlg.close(); });
    var ok = el("button", "btn", okText); ok.type = "submit";
    row.appendChild(cancel); row.appendChild(ok); form.appendChild(row);
  }

  /* ---------- Cartaz anônimo: 1) personagem e Zenis; 2) dados do cartaz ---------- */
  var anon = { pid: "", zeni: 0 };
  function openAnon() {
    if (!myChars.length) return UI.toast("Você precisa de um personagem para criar um cartaz anônimo.");
    section = "anonima"; msg.textContent = ""; form.textContent = "";
    document.getElementById("enc-title").textContent = "Cartaz anônimo";
    form.appendChild(el("p", "enc-step", "Passo 1 de 2: quem paga a recompensa?"));
    var f1 = el("div", "field"), l1 = el("label", "", "Personagem"); l1.htmlFor = "an-char";
    var sel = el("select"); sel.id = "an-char";
    sel.appendChild(new Option("Escolha um personagem", ""));
    myChars.forEach(function (ch) { sel.appendChild(new Option(ch.nome + " (" + UI.fmt(Number(ch.zeni) || 0) + " Z)", ch.id)); });
    f1.appendChild(l1); f1.appendChild(sel); form.appendChild(f1);

    var f2 = el("div", "field"), l2 = el("label", "", "Zenis do cartaz"); l2.htmlFor = "an-zeni";
    var amount = el("input"); amount.id = "an-zeni"; amount.type = "number"; amount.min = 1; amount.step = 1; amount.inputMode = "numeric"; amount.placeholder = "Quanto vai pagar?";
    f2.appendChild(l2); f2.appendChild(amount); form.appendChild(f2);

    var warn = el("div", "enc-warn"); warn.hidden = true;
    warn.appendChild(el("p", "", "zenis insuficientes. Quer gastar todos?"));
    var wrow = el("div", "enc-warn__btns");
    var yes = btn("Sim, gastar todos", "btn--green", function () { amount.value = String(zeniOf()); check(); });
    var no = btn("Não", "btn--red", function () { amount.value = ""; check(); amount.focus(); });
    wrow.appendChild(yes); wrow.appendChild(no); warn.appendChild(wrow); form.appendChild(warn);

    var row = el("div", "enc-actions enc-actions--split");
    var next = el("button", "btn", "Continuar"); next.type = "button"; next.disabled = true;
    var cancel = el("button", "btn btn--red", "Cancelar"); cancel.type = "button";
    cancel.addEventListener("click", function () { dlg.close(); });
    row.appendChild(next); row.appendChild(cancel); form.appendChild(row);

    function zeniOf() { var ch = myChars.filter(function (x) { return x.id === sel.value; })[0]; return ch ? Number(ch.zeni) || 0 : 0; }
    function check() {
      var raw = String(amount.value).trim(), have = zeniOf();
      var ok = !!sel.value && /^\d+$/.test(raw) && Number(raw) >= 1;
      var over = ok && Number(raw) > have;
      warn.hidden = !over || have < 1;
      if (over && have < 1) { msg.textContent = "Esse personagem está sem Zenis."; msg.className = "msg msg--error"; } else if (!over) msg.textContent = "";
      next.disabled = !(ok && !over);
    }
    sel.addEventListener("change", check); amount.addEventListener("input", check);
    next.addEventListener("click", function () {
      if (next.disabled) return;
      anon = { pid: sel.value, zeni: Number(amount.value) };
      openAnonDetails();
    });
    dlg.showModal(); sel.focus();
  }
  function openAnonDetails() {
    msg.textContent = ""; form.textContent = "";
    form.appendChild(el("p", "enc-step", "Passo 2 de 2: o cartaz (recompensa: " + UI.fmt(anon.zeni) + " Z, paga por " + charName(anon.pid) + ")"));
    [["alvo", "Alvo", "text", true], ["descricao", "Descrição", "textarea"], ["localizacao", "Localização", "text"]].forEach(function (f, i) {
      var wrap = el("div", "field"), label = el("label", "", f[1] + (f[3] ? "" : " (opcional)")), c;
      if (f[2] === "textarea") { c = el("textarea"); c.rows = 3; c.maxLength = 600; } else { c = el("input"); c.type = "text"; c.maxLength = 80; c.autocomplete = "off"; }
      c.name = f[0]; c.id = "pf-" + i; label.htmlFor = c.id; wrap.appendChild(label); wrap.appendChild(c); form.appendChild(wrap);
    });
    actionsRow("Afixar cartaz");
    form.elements.alvo.focus();
  }

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var user = DBOAuth.current();
    if (section === "patrulha" ? !master : !user) return;
    function err(t) { msg.textContent = t; msg.className = "msg msg--error"; }
    var alvo = form.elements.alvo ? form.elements.alvo.value.trim() : "";
    if (!alvo) return err("Diga quem é o alvo.");
    var saveBtn = form.querySelector("button[type=submit]");
    if (saveBtn) saveBtn.disabled = true;
    try {
      var base = { alvo: alvo, imagem: imgField ? imgField.get() : "", descricao: form.elements.descricao.value.trim(), localizacao: form.elements.localizacao.value.trim() };
      if (section === "patrulha") {
        var rec = String(form.elements.recompensa.value).trim();
        if (!/^\d+$/.test(rec)) { if (saveBtn) saveBtn.disabled = false; return err("A recompensa precisa ser um número inteiro, de 0 pra cima."); }
        await E.addCartaz(Object.assign(base, { secao: "patrulha", recompensa: Number(rec), dono: user ? user.email : "" }));
      } else {
        await E.criarAnonimo(anon.pid, Object.assign(base, { recompensa: anon.zeni, dono: user ? user.email : "" }));
      }
    } catch (e) { if (saveBtn) saveBtn.disabled = false; return err(e.message); }
    if (saveBtn) saveBtn.disabled = false;
    dlg.close(); render();
  });
  dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });

  // A rodinha do mouse anda pro lado (a menos que o cartaz precise rolar na vertical).
  strip.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var max = strip.scrollWidth - strip.clientWidth;
    if ((e.deltaY < 0 && strip.scrollLeft <= 0) || (e.deltaY > 0 && strip.scrollLeft >= max - 1)) return;
    e.preventDefault();
    strip.scrollLeft += e.deltaY;
  }, { passive: false });
  var drag = null;
  strip.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.target.closest("button")) return;
    drag = { x: e.clientX, left: strip.scrollLeft };
  });
  window.addEventListener("pointermove", function (e) { if (drag) strip.scrollLeft = drag.left - (e.clientX - drag.x); });
  window.addEventListener("pointerup", function () { drag = null; });

  // Pré-carregamento: se há cópia da última visita, desenha na hora e confere com o banco em seguida.
  try {
    if (E.hydrate && E.hydrate()) {
      var cc = window.DBOCharacters && DBOCharacters.cached && DBOCharacters.cached();
      master = !!(window.DBORoles && DBORoles.isMaster && DBORoles.isMaster());
      myChars = cc ? cc.mine.slice() : [];
      render();
    }
  } catch (e) {}

  Promise.resolve(E.ready())
    .then(function () { return DBORoles.refresh && DBORoles.refresh(); })
    .then(function () { return window.DBOCharacters ? DBOCharacters.ready() : null; })
    .then(function () {
      master = DBORoles.isMaster();
      myChars = window.DBOCharacters && DBOAuth.current() ? DBOCharacters.list().slice() : [];
      render();
      if (E.needsLogin()) UI.toast("Conecta na sua conta (com o e-mail confirmado) pra ver os cartazes.");
      if (focus) {                                // veio da ficha: vai direto pro cartaz
        var node = strip.querySelector('.poster[data-id="' + focus.cartaz + '"]');
        if (node) {
          node.classList.add("poster--spot");
          node.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
          if (focus.concluir && focus.personagem && myChars.some(function (x) { return x.id === focus.personagem; })) askConclude(focus.personagem, focus.cartaz);
        } else UI.toast("Esse cartaz não existe mais.");
        history.replaceState(null, "", location.pathname);
      }
    })
    .catch(function (err) { UI.toast("Não consegui carregar as missões: " + err.message); });
})();
