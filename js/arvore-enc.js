// Dragon Ball Omega — árvore da Enciclopédia (Planetas e Bestiário usam a mesma página).
// Esquerda: pastas (só o nome, roxo discreto; clicar abre/fecha) e itens (abas) dentro delas.
// Direita: o item escolhido, com carrossel de imagens. O mestre arrasta itens de uma pasta para outra,
// cria pastas dentro de pastas, edita itens e remove tudo pela lixeira (mesma confirmação dos cartazes).
//
// cfg: { tipo, um: "planeta", varios: "planetas", fields: [{ key, label, type: text|textarea|select, options?, required? }], aspect }
window.DBOEncTree = function (cfg) {
  var UI = DBOUI, E = DBOEnc, el = UI.el;
  var TIPO = cfg.tipo, FIELDS = cfg.fields, ASPECT = cfg.aspect || 1.6;
  var UM = cfg.um, VARIOS = cfg.varios, Um = UM.charAt(0).toUpperCase() + UM.slice(1);

  var master = false, closed = {}, selId = null, curFolder = null, delMode = false, picked = {};
  var tree = document.getElementById("tree"), main = document.getElementById("folder-main"), treeTools = document.getElementById("tree-tools");
  var tools = document.getElementById("poster-tools"), bar = document.getElementById("del-bar");
  var dlg = document.getElementById("enc-dialog"), form = document.getElementById("enc-form"), msg = document.getElementById("enc-msg");
  var mode = null, imgsField = null, dragId = null;

  function pastas() { return E.pastas(TIPO); }
  function sub(pai) { return pastas().filter(function (p) { return (p.pai || null) === pai; }); }
  function itens(pid) { return E.itens(pid); }
  function findItem(id) { var r = null; pastas().forEach(function (p) { E.itens(p.id).forEach(function (i) { if (i.id === id) r = i; }); }); return r; }
  function fail(e) { UI.toast(e && e.message ? e.message : String(e)); }
  // Opções "A › B › C" para os seletores de pasta.
  function folderOptions() {
    var out = [];
    (function walk(pai, trail) { sub(pai).forEach(function (p) { var t = trail.concat(p.nome); out.push({ id: p.id, label: t.join(" › ") }); walk(p.id, t); }); })(null, []);
    return out;
  }

  /* ---------- Árvore ---------- */
  function renderTree() {
    tree.textContent = "";
    var any = false;
    (function walk(pai, ul, inheritDel) {
      sub(pai).forEach(function (p) {
        any = true;
        var marked = !!picked["f:" + p.id], gone = inheritDel || marked;
        var li = el("li", "ptree__folder");
        var b = el("button", "pf" + (marked ? " is-del" : gone ? " is-del-in" : ""), p.nome);
        b.type = "button"; b.setAttribute("aria-expanded", String(!closed[p.id]));
        b.addEventListener("click", function () {
          if (delMode) { toggle("f:" + p.id); return; }
          closed[p.id] = !closed[p.id]; curFolder = p.id; renderTree();
        });
        li.appendChild(b);
        if (!closed[p.id]) {
          var inner = el("ul", "ptree__in");
          walk(p.id, inner, gone);
          itens(p.id).forEach(function (it) {
            var pm = !!picked["i:" + it.id];
            var row = el("li", "ptree__planet");
            var t = el("button", "pl" + (selId === it.id && !delMode ? " is-on" : "") + (pm ? " is-del" : gone ? " is-del-in" : ""), it.dados.nome);
            t.type = "button";
            t.addEventListener("click", function () { if (delMode) { toggle("i:" + it.id); return; } selId = it.id; curFolder = p.id; renderTree(); renderMain(true); });
            if (master && !delMode) {
              t.draggable = true;
              t.addEventListener("dragstart", function (ev) { dragId = it.id; t.classList.add("is-drag"); ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", it.id); } catch (e) {} });
              t.addEventListener("dragend", function () { dragId = null; t.classList.remove("is-drag"); tree.querySelectorAll(".is-drop").forEach(function (n) { n.classList.remove("is-drop"); }); });
            }
            row.appendChild(t); inner.appendChild(row);
          });
          if (!inner.children.length) inner.appendChild(el("li", "ptree__empty", "vazia"));
          li.appendChild(inner);
        }
        if (master && !delMode) {                       // solta o item aqui
          li.addEventListener("dragover", function (ev) { if (!dragId) return; ev.preventDefault(); ev.stopPropagation(); tree.querySelectorAll(".is-drop").forEach(function (n) { n.classList.remove("is-drop"); }); li.classList.add("is-drop"); });
          li.addEventListener("dragleave", function (ev) { if (!li.contains(ev.relatedTarget)) li.classList.remove("is-drop"); });
          li.addEventListener("drop", function (ev) { ev.preventDefault(); ev.stopPropagation(); li.classList.remove("is-drop"); if (dragId) move(dragId, p.id); });
        }
        ul.appendChild(li);
      });
    })(null, tree, false);
    if (!any) tree.appendChild(el("li", "ptree__empty", master ? "Nenhuma pasta ainda. Crie a primeira." : "Nada registrado ainda."));
    renderTools();
  }

  function renderTools() {
    treeTools.hidden = !master || delMode;
    treeTools.textContent = "";
    if (!master || delMode) return;
    var nf = el("button", "btn btn--ghost", "+ Nova pasta"); nf.type = "button";
    nf.addEventListener("click", function () { openForm("pasta"); });
    var np = el("button", "btn", "+ Adicionar " + UM); np.type = "button";
    np.addEventListener("click", function () { if (!pastas().length) { UI.toast("Crie uma pasta antes de adicionar " + VARIOS + "."); return; } openForm("item"); });
    treeTools.appendChild(np); treeTools.appendChild(nf);
  }

  async function move(id, pastaId) {
    var it = findItem(id); if (!it || it.pasta === pastaId) return;
    try { await E.mover(id, pastaId); closed[pastaId] = false; selId = id; renderTree(); renderMain(); UI.toast(Um + " movido."); } catch (e) { fail(e); }
  }

  /* ---------- Detalhe do item ---------- */
  function carousel(imgs, alt) {
    var box = el("div", "pcar");
    var track = el("div", "pcar__track");
    imgs.forEach(function (u, i) { var im = el("img"); im.src = u; im.alt = alt + (imgs.length > 1 ? " (" + (i + 1) + " de " + imgs.length + ")" : ""); im.draggable = false; track.appendChild(im); });
    box.appendChild(track);
    if (imgs.length < 2) return box;
    var cur = 0, dots = el("div", "pcar__dots"), dEls = imgs.map(function () { var d = el("i"); dots.appendChild(d); return d; });
    function go(n) {
      cur = (n + imgs.length) % imgs.length;
      track.style.transform = "translateX(" + (-100 * cur) + "%)";
      dEls.forEach(function (d, i) { d.classList.toggle("is-on", i === cur); });
    }
    [["prev", "‹", "Imagem anterior", -1], ["next", "›", "Próxima imagem", 1]].forEach(function (a) {
      var b = el("button", "pcar__arrow pcar__arrow--" + a[0], a[1]); b.type = "button"; b.setAttribute("aria-label", a[2]);
      b.addEventListener("click", function () { go(cur + a[3]); });
      box.appendChild(b);
    });
    box.appendChild(dots); go(0);
    return box;
  }

  function unseen() { return el("p", "pinfo__no", "não analisado"); }

  function renderMain(animate) {
    main.textContent = "";
    var it = selId ? findItem(selId) : null;
    if (!it) { main.appendChild(el("p", "sec-panel__hint", pastas().length ? "Escolha " + (cfg.artigo || "um") + " " + UM + " à esquerda." : "Ainda não há " + VARIOS + ".")); return; }
    var d = it.dados;
    var head = el("div", "pinfo__head");
    head.appendChild(el("h2", "", d.nome));
    if (master) {
      var ed = el("button", "btn btn--ghost pinfo__edit"); ed.type = "button"; ed.title = "Editar " + UM;
      ed.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
      ed.appendChild(el("span", "", "Editar"));
      ed.addEventListener("click", function () { openForm("editar", it); });
      head.appendChild(ed);
    }
    main.appendChild(head);
    var imgs = Array.isArray(d.imagens) && d.imagens.length ? d.imagens : (d.imagem ? [d.imagem] : []);
    if (imgs.length) main.appendChild(carousel(imgs, d.nome));
    else { var ph = el("div", "pcar pcar--none"); ph.appendChild(unseen()); main.appendChild(ph); }
    var dl = el("dl", "pinfo");
    FIELDS.forEach(function (f) {
      if (f.key === "nome") return;
      var row = el("div", "pinfo__row"); row.appendChild(el("dt", "", f.label));
      if (d[f.key]) row.appendChild(el("dd", "", d[f.key])); else row.appendChild(unseen());
      dl.appendChild(row);
    });
    main.appendChild(dl);
    if (animate) { main.classList.remove("is-in"); void main.offsetWidth; main.classList.add("is-in"); }
  }

  /* ---------- Formulários ---------- */
  function folderSelect(id, preferred) {
    var sel = el("select"); sel.id = id; sel.name = id;
    folderOptions().forEach(function (o) { var op = new Option(o.label, o.id); if (o.id === preferred) op.selected = true; sel.appendChild(op); });
    return sel;
  }
  var editando = null;
  function openForm(kind, item) {
    mode = kind; editando = item || null; msg.textContent = ""; form.textContent = ""; imgsField = null;
    document.getElementById("enc-title").textContent = kind === "pasta" ? "Nova pasta" : kind === "editar" ? "Editar " + UM : "Adicionar " + UM;
    if (kind === "pasta") {
      var w = el("div", "field"), l = el("label", "", "Nome da pasta"), i = el("input"); i.type = "text"; i.maxLength = 80; i.autocomplete = "off"; i.name = "nome"; i.id = "ef-nome"; l.htmlFor = i.id;
      w.appendChild(l); w.appendChild(i); form.appendChild(w);
      if (pastas().length) {
        var ck = el("label", "check"), cb = el("input"); cb.type = "checkbox"; cb.id = "ef-inside"; ck.appendChild(cb); ck.appendChild(el("span", "", "Inserir pasta dentro de outra"));
        form.appendChild(ck);
        var sw = el("div", "field"); sw.hidden = true;
        var sl = el("label", "", "Em qual pasta?"); var sel = folderSelect("ef-parent", curFolder); sl.htmlFor = "ef-parent";
        sw.appendChild(sl); sw.appendChild(sel); form.appendChild(sw);
        cb.addEventListener("change", function () { sw.hidden = !cb.checked; });
      }
    } else {
      var atual = item ? item.dados : {};
      var imgsAtuais = Array.isArray(atual.imagens) && atual.imagens.length ? atual.imagens : (atual.imagem ? [atual.imagem] : []);
      FIELDS.forEach(function (f, n) {
        if (f.key === "descricao") { imgsField = E.imagesField("Imagens (todas recortadas)", ASPECT, 8, imgsAtuais); form.appendChild(imgsField.node); }
        var wrap = el("div", "field"), label = el("label", "", f.label + (f.required ? "" : " (opcional)")), c;
        if (f.type === "textarea") { c = el("textarea"); c.rows = 3; c.maxLength = 800; }
        else if (f.type === "select") {
          c = el("select"); c.appendChild(new Option("Escolha…", ""));
          f.options.forEach(function (o) { c.appendChild(new Option(o, o)); });
        } else { c = el("input"); c.type = "text"; c.maxLength = 80; c.autocomplete = "off"; }
        c.name = f.key; c.id = "ef-" + n; label.htmlFor = c.id;
        if (atual[f.key] != null) c.value = atual[f.key];
        wrap.appendChild(label); wrap.appendChild(c); form.appendChild(wrap);
      });
      if (kind !== "editar") {
        var fw = el("div", "field"), fl = el("label", "", "Pasta"); fl.htmlFor = "ef-folder";
        var pre = curFolder || (selId && findItem(selId) ? findItem(selId).pasta : null);
        fw.appendChild(fl); fw.appendChild(folderSelect("ef-folder", pre)); form.appendChild(fw);
      }
    }
    var row = el("div", "enc-actions");
    var cancel = el("button", "btn btn--ghost", "Cancelar"); cancel.type = "button"; cancel.addEventListener("click", function () { dlg.close(); });
    var ok = el("button", "btn", "Salvar"); ok.type = "submit";
    row.appendChild(cancel); row.appendChild(ok); form.appendChild(row);
    dlg.showModal();
    var first = form.querySelector("input[type=text],textarea"); if (first) first.focus();
  }
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    if (!master) return;
    var bad = function (t) { msg.textContent = t; msg.className = "msg msg--error"; };
    var nome = form.elements.nome.value.trim();
    if (!nome) return bad("Preencha: o nome.");
    if (mode !== "pasta") {
      var falta = FIELDS.filter(function (f) { return f.required && f.key !== "nome" && !form.elements[f.key].value.trim(); });
      if (falta.length) return bad("Preencha: " + falta.map(function (f) { return f.label.toLowerCase(); }).join(", ") + ".");
    }
    var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      if (mode === "pasta") {
        var inside = form.elements["ef-inside"] && form.elements["ef-inside"].checked;
        var pai = inside ? form.elements["ef-parent"].value : null;
        var np = await E.addPasta(TIPO, nome, pai);
        if (pai) closed[pai] = false;
        curFolder = np.id;
      } else {
        var data = { imagens: imgsField ? imgsField.get() : [] };
        data.imagem = data.imagens[0] || "";
        FIELDS.forEach(function (f) { data[f.key] = form.elements[f.key].value.trim(); });
        if (mode === "editar") {
          await E.editar(TIPO, editando.id, data);
          selId = editando.id;
        } else {
          var pasta = form.elements["ef-folder"].value;
          var it = await E.addItem(TIPO, pasta, data);
          closed[pasta] = false; curFolder = pasta; selId = it.id;
        }
      }
    } catch (e) { btn.disabled = false; return bad(e.message); }
    btn.disabled = false; dlg.close(); renderTree(); renderMain(true);
    if (mode === "editar") UI.toast(Um + " atualizado.");
  });
  dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });

  /* ---------- Modo de remoção (só o mestre) ---------- */
  function toggle(k) { if (picked[k]) delete picked[k]; else picked[k] = 1; renderTree(); renderBar(); }
  function counts() {
    var f = 0, p = 0; Object.keys(picked).forEach(function (k) { if (k[0] === "f") f++; else p++; });
    return { f: f, p: p };
  }
  function renderBar() {
    var c = counts(), n = c.f + c.p;
    tools.hidden = !master;
    var t = document.getElementById("del-toggle");
    t.classList.toggle("is-on", delMode); t.setAttribute("aria-pressed", String(delMode));
    bar.hidden = !delMode;
    var parts = [];
    if (c.f) parts.push(c.f === 1 ? "1 pasta" : c.f + " pastas");
    if (c.p) parts.push(c.p === 1 ? "1 " + UM : c.p + " " + VARIOS);
    var suf = n === 1 ? (c.f ? " marcada." : " marcado.") : " marcados.";
    document.getElementById("del-count").textContent = n === 0 ? "Marque o que vai sumir." : parts.join(" e ") + suf;
    document.getElementById("del-go").disabled = n === 0;
    main.classList.toggle("is-muted", delMode);
  }
  function setDel(on) { delMode = on; picked = {}; renderTree(); renderBar(); }
  document.getElementById("del-toggle").addEventListener("click", function () { setDel(!delMode); });
  document.getElementById("del-cancel").addEventListener("click", function () { setDel(false); });
  var rmDlg = document.getElementById("rm-dialog");
  document.getElementById("del-go").addEventListener("click", function () {
    var c = counts(); if (!c.f && !c.p) return;
    document.getElementById("rm-text").textContent = c.f
      ? "Pastas somem junto com tudo que há dentro delas (" + VARIOS + " e outras pastas). Isso vale pra todo mundo e não dá pra desfazer."
      : "Isso vale pra todo mundo e não dá pra desfazer.";
    var inp = document.getElementById("rm-word"); inp.value = ""; document.getElementById("rm-confirm").disabled = true;
    rmDlg.showModal(); inp.focus();
  });
  document.getElementById("rm-word").addEventListener("input", function (e) { document.getElementById("rm-confirm").disabled = e.target.value.trim().toUpperCase() !== "REMOVER"; });
  document.getElementById("rm-keep").addEventListener("click", function () { rmDlg.close(); });
  document.getElementById("rm-confirm").addEventListener("click", async function () {
    var fs = [], is = [];
    Object.keys(picked).forEach(function (k) { (k[0] === "f" ? fs : is).push(k.slice(2)); });
    this.disabled = true;
    try { await E.remover(fs, is); } catch (e) { rmDlg.close(); return fail(e); }
    rmDlg.close();
    if (selId && !findItem(selId)) selId = null;
    if (curFolder && !pastas().some(function (p) { return p.id === curFolder; })) curFolder = null;
    picked = {}; delMode = false; renderTree(); renderBar(); renderMain();
    UI.toast("Removido.");
  });

  /* ---------- Início ---------- */
  document.getElementById("rm-title").textContent = "Remover pastas e " + VARIOS + "?";
  Promise.resolve(E.ready())
    .then(function () { return DBORoles.refresh && DBORoles.refresh(); })
    .then(function () {
      master = DBORoles.isMaster();
      if (E.needsLogin()) {
        main.textContent = "";
        main.appendChild(el("p", "empty", "Conecta na sua conta (com o e-mail confirmado) pra ver a Enciclopédia."));
        var a = el("a", "btn", "Entrar na conta"); a.href = "../configuracoes.html"; main.appendChild(a);
        return;
      }
      var f = pastas()[0]; curFolder = f ? f.id : null;
      renderTree(); renderBar(); renderMain();
    })
    .catch(function (err) { UI.toast("Não consegui carregar a Enciclopédia: " + err.message); });
};
