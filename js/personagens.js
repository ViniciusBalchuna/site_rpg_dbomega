// Dragon Ball Omega — página Personagens
(function () {
  var DISMISS_KEY = "dbo-gate-dismissed";
  var MAX_SUGGESTIONS = 6;

  var $ = function (id) { return document.getElementById(id); };
  var gate = $("gate");
  var list = $("char-list");
  var emptyMsg = $("empty");
  var search = $("search");
  var box = $("suggestions");

  var chars = [];   // todos os personagens
  var delMode = false;   // modo de remoção (ícone da lixeira)
  var selected = {};     // ids marcados para remover
  var othersQuery = "";  // busca do mestre nas fichas dos jogadores
  var othersData = null; // [{ owner, char }] mais recentes
  var query = "";   // texto da busca
  var shown = [];   // sugestões visíveis
  var active = -1;  // sugestão destacada pelo teclado

  /* ---------- Busca ---------- */
  function norm(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Sem busca: todos. Com busca: quem começa com o texto vem primeiro, depois quem só contém.
  function matches() {
    var q = norm(query.trim());
    if (!q) return chars.slice();
    return chars
      .map(function (c) { return { c: c, pos: norm(c.nome).indexOf(q) }; })
      .filter(function (m) { return m.pos >= 0; })
      .sort(function (a, b) { return (a.pos > 0) - (b.pos > 0) || a.c.nome.localeCompare(b.c.nome, "pt-BR"); })
      .map(function (m) { return m.c; });
  }

  /* ---------- Montagem dos elementos ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function photo(c, className) {
    var wrap = el("div", className);
    if (c.foto) {
      var img = el("img");
      img.src = c.foto;
      img.alt = "";
      wrap.appendChild(img);
    } else {
      wrap.textContent = c.nome.charAt(0).toUpperCase();
    }
    return wrap;
  }

  function stat(label, value) {
    var item = el("div");
    item.appendChild(el("dt", "", label));
    item.appendChild(el("dd", "", value));
    return item;
  }

  function card(c, selectable) {
    var li = el("li");
    var link = el("a", "char");
    link.href = DBOCharacters.sheetUrl(c.id);
    if (selectable) {
      if (selected[c.id]) link.classList.add("is-selected");
      link.addEventListener("click", function (event) {
        if (!delMode) return;
        event.preventDefault();               // no modo de remoção clicar só marca, não abre
        if (selected[c.id]) delete selected[c.id]; else selected[c.id] = true;
        link.classList.toggle("is-selected", !!selected[c.id]);
        updateBar();
      });
    }

    var info = el("div");
    info.appendChild(el("h3", "char__name", c.nome));
    var meta = el("dl", "char__meta");
    meta.appendChild(stat("Nível", c.nivel));
    meta.appendChild(stat("Classe", c.classe));
    meta.appendChild(stat("Raça", c.raca));
    info.appendChild(meta);

    link.appendChild(info);
    link.appendChild(photo(c, "char__photo"));
    li.appendChild(link);
    return li;
  }

  function renderList() {
    var found = matches();
    list.textContent = "";
    found.forEach(function (c) { list.appendChild(card(c, true)); });
    emptyMsg.hidden = found.length > 0;
    emptyMsg.textContent = chars.length
      ? "Nenhum personagem com esse nome. Confere a escrita ou limpa a busca."
      : "Você ainda não tem nenhum personagem. Bora criar o primeiro?";
  }

  /* ---------- Autocomplete ---------- */
  function closeSuggestions() {
    box.hidden = true;
    search.setAttribute("aria-expanded", "false");
    search.removeAttribute("aria-activedescendant");
  }

  function choose(c) {
    search.value = c.nome;
    query = c.nome;
    active = -1;
    renderList();
    closeSuggestions();
  }

  function renderSuggestions() {
    box.textContent = "";
    shown = query.trim() ? matches().slice(0, MAX_SUGGESTIONS) : [];
    shown.forEach(function (c, i) {
      var li = el("li");
      li.id = "opt-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === active));
      li.appendChild(photo(c, "mini"));
      var text = el("div");
      text.appendChild(el("span", "", c.nome));
      text.appendChild(el("small", "", "Nível " + c.nivel + ", " + c.classe));
      li.appendChild(text);
      li.addEventListener("mousedown", function (event) { event.preventDefault(); choose(c); });
      box.appendChild(li);
    });
    box.hidden = shown.length === 0;
    search.setAttribute("aria-expanded", String(shown.length > 0));
    if (active >= 0) search.setAttribute("aria-activedescendant", "opt-" + active);
    else search.removeAttribute("aria-activedescendant");
  }

  search.addEventListener("input", function () {
    query = search.value;
    active = -1;
    renderList();
    renderSuggestions();
  });
  search.addEventListener("focus", renderSuggestions);
  search.addEventListener("blur", closeSuggestions);
  search.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown" && shown.length) {
      event.preventDefault();
      active = (active + 1) % shown.length;
      renderSuggestions();
    } else if (event.key === "ArrowUp" && shown.length) {
      event.preventDefault();
      active = (active - 1 + shown.length) % shown.length;
      renderSuggestions();
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  /* ---------- Pop-up de entrar / criar conta ---------- */
  function dismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { return false; }
  }
  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
  }

  var overlay = $("roster-loading");
  var notice = $("roster-notice");
  function setNotice(text) { notice.textContent = text || ""; }

  function load() {
    emptyMsg.hidden = true;
    setNotice("");
    var user = DBOAuth.current();
    var cached = user && DBOCharacters.cached && DBOCharacters.cached();
    if (cached) {                                       // lista da última visita: desenha na hora
      chars = cached.mine;
      selected = {};
      renderList();
      drawOthers(cached.others);
      trashVisible();
    } else if (user && DBOAuth.mode === "supabase") {   // primeira vez neste aparelho: tela de carregamento
      overlay.hidden = false;
    }
    return DBOCharacters.ready().then(draw).catch(function (err) {
      emptyMsg.hidden = false;
      emptyMsg.textContent = "Não consegui carregar seus personagens: " + err.message;
    }).then(function () {
      if (!overlay.hidden) { overlay.classList.add("is-done"); setTimeout(function () { overlay.hidden = true; overlay.classList.remove("is-done"); }, 320); }
    });
  }

  function trashVisible() { $("del-toggle").hidden = !(DBOAuth.current() && chars.length); if ($("del-toggle").hidden && delMode) setDelMode(false); }

  function draw() {
    chars = DBOCharacters.list();
    var keep = {};
    chars.forEach(function (c) { if (selected[c.id]) keep[c.id] = true; });
    selected = keep;
    renderList();
    trashVisible();
    updateBar();
    drawOthers(DBOCharacters.others());
  }

  function drawOthers(others) {
    othersData = others || [];
    var box2 = $("others");
    box2.hidden = !othersData.length;
    var q = norm(othersQuery.trim());
    var shownO = othersData.filter(function (x) { return !q || norm(x.char.nome).indexOf(q) >= 0 || norm(x.owner).indexOf(q) >= 0; });
    var ol = $("others-list");
    ol.textContent = "";
    shownO.forEach(function (x) {
      var li = card(x.char, false);
      li.querySelector(".char__name").after(el("small", "char__owner", x.owner));
      ol.appendChild(li);
    });
    $("others-empty").hidden = shownO.length > 0 || !othersData.length;
  }
  $("others-search").addEventListener("input", function (e) { othersQuery = e.target.value; drawOthers(othersData); });

  /* ---------- Modo de remoção ---------- */
  var bar = $("del-bar"), delDlg = $("del-dialog"), delInput = $("del-input"), delMsg = $("del-msg");
  function count() { return Object.keys(selected).length; }
  function updateBar() {
    var n = count();
    bar.hidden = !(delMode && n > 0);
    $("del-count").textContent = "Removendo: " + n + (n === 1 ? " personagem" : " personagens");
  }
  function setDelMode(on) {
    delMode = !!on;
    document.documentElement.classList.toggle("is-deleting", delMode);
    $("del-toggle").setAttribute("aria-pressed", String(delMode));
    if (!delMode) selected = {};
    renderList();
    updateBar();
  }
  $("del-toggle").addEventListener("click", function () { setDelMode(!delMode); });

  // Dragões de fundo (decoração)
  document.querySelectorAll(".gate__dragon, .loading--red .loading__dragon").forEach(function (n) { if (window.DBODragon) n.innerHTML = DBODragon.face(); });
  document.querySelectorAll(".loading--gold .loading__dragon").forEach(function (n) { if (window.DBODragon) n.innerHTML = DBODragon.head(); });

  $("del-open").addEventListener("click", function () {
    delInput.value = ""; delMsg.textContent = "";
    delDlg.showModal();
    delInput.focus();
  });
  $("del-close").addEventListener("click", function () { delDlg.close(); });
  if ($("del-cancel")) $("del-cancel").addEventListener("click", function () { delDlg.close(); });

  var MESSAGES = (window.DBOCarregando && DBOCarregando.TEXTOS) || ["Aguarde alguns instantes...", "Quase lá....", "Obrigado por esperar!"];
  $("del-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (delInput.value.trim() !== "REMOVER") {            // errou: a janela treme e avisa
      delMsg.textContent = "escreva: REMOVER para deletar os personagens.";
      delDlg.classList.remove("shake"); void delDlg.offsetWidth; delDlg.classList.add("shake");
      delInput.focus();
      return;
    }
    var ids = Object.keys(selected);
    delDlg.close();
    var loading = $("del-loading"), sub = $("del-loading-sub"), k = 0;
    sub.textContent = MESSAGES[0]; k = 1;
    loading.hidden = false;
    var timer = setInterval(function () { sub.textContent = MESSAGES[k % MESSAGES.length]; k++; }, 5000);
    try {
      await DBOCharacters.remove(ids);
      setDelMode(false);
      draw();
      emptyMsg.hidden = chars.length > 0;
    } catch (err) {
      setNotice("Não consegui remover: " + err.message);
    } finally {
      clearInterval(timer);
      loading.hidden = true;
    }
  });
  delDlg.addEventListener("close", function () { delMsg.textContent = ""; });

  DBOAccountUI.bind({
    tabs: { login: $("gate-tab-login"), register: $("gate-tab-register") },
    forms: { login: $("gate-form-login"), register: $("gate-form-register") },
    msg: $("gate-msg"),
    onChange: function () { gate.close(); load(); }
  });
  $("gate-skip").addEventListener("click", function () { dismiss(); gate.close(); });
  gate.addEventListener("cancel", dismiss); // tecla Esc conta como "continuar sem conectar"

  /* ---------- Início ---------- */
  load();
  if (!DBOAuth.current() && !dismissed()) gate.showModal();
})();
