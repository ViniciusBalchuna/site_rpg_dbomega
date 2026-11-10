// Dragon Ball Omega — navegador de pastas da Enciclopédia (Bestiário e Planetas).
// Config: { tipo, itemLabel, folderCreate: bool, fields: [{key,label,type:"text"|"textarea"|"select",options,required}], summary(item) }
window.DBOFolders = function (cfg) {
  var UI = DBOUI, E = DBOEnc, el = UI.el;
  var master = false; // definido depois de consultar o papel (modo Supabase)
  var current = null;   // pasta aberta
  var openItem = null;  // item com os detalhes à mostra
  var tree = document.getElementById("tree"), main = document.getElementById("folder-main");
  var dlg = document.getElementById("enc-dialog"), form = document.getElementById("enc-form"), msg = document.getElementById("enc-msg");
  var mode = null;      // "item" | "pasta"
  var imgs = {};        // campos de imagem do formulário aberto

  function children(pai) { return E.pastas(cfg.tipo).filter(function (p) { return (p.pai || null) === pai; }); }

  function renderTree() {
    tree.textContent = "";
    (function walk(pai, ul, depth) {
      children(pai).forEach(function (p) {
        var li = el("li", "tree__item");
        var b = el("button", "tree__btn" + (current && current.id === p.id ? " is-on" : ""), p.nome);
        b.type = "button";
        b.style.setProperty("--depth", depth);
        b.addEventListener("click", function () { current = p; openItem = null; render(); });
        li.appendChild(b);
        ul.appendChild(li);
        walk(p.id, ul, depth + 1);
      });
    })(null, tree, 0);
    if (master && cfg.folderCreate) {
      var add = el("button", "btn btn--ghost tree__add", "+ Nova pasta");
      add.type = "button";
      add.addEventListener("click", function () { openForm("pasta"); });
      var li = el("li", "tree__tools"); li.appendChild(add); tree.appendChild(li);
    }
  }

  function renderMain() {
    main.textContent = "";
    if (!current) { main.appendChild(el("p", "sec-panel__hint", "Escolha uma pasta à esquerda.")); return; }
    var head = el("div", "folder__head");
    head.appendChild(el("h2", "", current.nome));
    if (master) {
      var add = el("button", "btn", cfg.addLabel);
      add.type = "button";
      add.addEventListener("click", function () { openForm("item"); });
      head.appendChild(add);
    }
    main.appendChild(head);
    var subs = children(current.id);
    if (subs.length) {
      var sl = el("ul", "subfolders");
      subs.forEach(function (p) {
        var li = el("li"), b = el("button", "chip", p.nome);
        b.type = "button";
        b.addEventListener("click", function () { current = p; openItem = null; render(); });
        li.appendChild(b); sl.appendChild(li);
      });
      main.appendChild(sl);
    }
    var items = E.itens(current.id);
    if (!items.length && !subs.length) main.appendChild(el("p", "empty", master ? "Pasta vazia. Que tal adicionar o primeiro?" : "Nada registrado aqui ainda."));
    var ul = el("ul", "entries");
    items.forEach(function (it) {
      var li = el("li", "entry");
      var b = el("button", "entry__name");
      b.type = "button";
      b.setAttribute("aria-expanded", String(openItem === it.id));
      b.appendChild(el("strong", "", it.dados.nome));
      var sum = cfg.summary ? cfg.summary(it.dados) : "";
      if (sum) b.appendChild(el("small", "", sum));
      b.addEventListener("click", function () { openItem = openItem === it.id ? null : it.id; renderMain(); });
      li.appendChild(b);
      if (openItem === it.id) {
        var dl = el("dl", "entry__details");
        if (it.dados.imagem) { var pic = el("img", "entry__img"); pic.src = it.dados.imagem; pic.alt = it.dados.nome; dl.appendChild(pic); }
        cfg.fields.forEach(function (f) {
          if (f.key === "nome" || f.type === "imagem" || !it.dados[f.key]) return;
          var row = el("div"); row.appendChild(el("dt", "", f.label)); row.appendChild(el("dd", "", it.dados[f.key])); dl.appendChild(row);
        });
        li.appendChild(dl);
      }
      ul.appendChild(li);
    });
    main.appendChild(ul);
  }

  function render() { renderTree(); renderMain(); }

  function openForm(kind) {
    mode = kind; msg.textContent = ""; form.textContent = ""; imgs = {};
    var fields = kind === "pasta" ? [{ key: "nome", label: "Nome da pasta", type: "text", required: true }] : cfg.fields;
    document.getElementById("enc-title").textContent = kind === "pasta" ? "Nova pasta" : cfg.addLabel.replace("+ ", "").replace(/^./, function (m) { return m.toUpperCase(); });
    fields.forEach(function (f, i) {
      if (f.type === "imagem") { var imf = E.imageField(f.label); imgs[f.key] = imf; form.appendChild(imf.node); return; }
      var wrap = el("div", "field"), label = el("label", "", f.label + (f.required ? "" : " (opcional)")), c;
      if (f.type === "textarea") { c = el("textarea"); c.rows = 3; c.maxLength = 800; }
      else if (f.type === "select") { c = el("select"); f.options.forEach(function (o) { c.appendChild(new Option(o, o)); }); }
      else { c = el("input"); c.type = "text"; c.maxLength = 80; c.autocomplete = "off"; }
      c.name = f.key; c.id = "ef-" + i; label.htmlFor = c.id;
      wrap.appendChild(label); wrap.appendChild(c); form.appendChild(wrap);
    });
    var row = el("div", "enc-actions");
    var cancel = el("button", "btn btn--ghost", "Cancelar"); cancel.type = "button";
    cancel.addEventListener("click", function () { dlg.close(); });
    var ok = el("button", "btn", "Salvar"); ok.type = "submit";
    row.appendChild(cancel); row.appendChild(ok); form.appendChild(row);
    dlg.showModal();
    form.querySelector("input,textarea,select").focus();
  }

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    if (!master) return;
    var fields = mode === "pasta" ? [{ key: "nome", required: true, label: "O nome" }] : cfg.fields, data = {};
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].type === "imagem") { data[fields[i].key] = imgs[fields[i].key] ? imgs[fields[i].key].get() : ""; continue; }
      var v = form.elements[fields[i].key].value.trim();
      if (fields[i].required && !v) { msg.textContent = "Preencha: " + (fields[i].label || fields[i].key).toLowerCase() + "."; msg.className = "msg msg--error"; return; }
      data[fields[i].key] = v;
    }
    var saveBtn = form.querySelector("button[type=submit]");
    if (saveBtn) saveBtn.disabled = true;
    try {
      if (mode === "pasta") await E.addPasta(cfg.tipo, data.nome, current ? current.id : null);
      else await E.addItem(cfg.tipo, current.id, data);
    } catch (e) { msg.textContent = e.message; msg.className = "msg msg--error"; if (saveBtn) saveBtn.disabled = false; return; }
    if (saveBtn) saveBtn.disabled = false;
    dlg.close();
    render();
  });
  dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });

  // No modo Supabase os dados vêm do banco: espera carregar antes de montar a árvore.
  Promise.resolve(E.ready())
    .then(function () { return DBORoles.refresh && DBORoles.refresh(); })
    .then(function () {
      master = DBORoles.isMaster();
      current = children(null)[0] || null;
      if (E.needsLogin()) {
        main.textContent = "";
        main.appendChild(el("p", "empty", "Conecta na sua conta (com o e-mail confirmado) pra ver a Enciclopédia."));
        var a = el("a", "btn", "Entrar na conta"); a.href = "../configuracoes.html"; main.appendChild(a);
        return;
      }
      render();
    })
    .catch(function (err) { UI.toast("Não consegui carregar a Enciclopédia: " + err.message); });
};
