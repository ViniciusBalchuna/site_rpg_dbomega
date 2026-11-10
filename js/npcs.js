// Dragon Ball Omega — Campanha > NPCs (só o mestre)
// Lista dos NPCs como a página Personagens: busca, criar, abrir a ficha e remover.
// Um NPC é uma ficha do mestre marcada com npc: true (js/characters.js). Na ficha ele tem PL base editável,
// escolhe o nível e pode ter qualquer técnica, habilidade de classe (de qualquer classe) e equipamento.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var UI = window.DBOUI, R = window.DBORules;
  var npcs = [], busca = "", modoRemover = false, marcados = {};

  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function norm(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function fmt(n) { return UI && UI.fmt ? UI.fmt(n) : String(n); }
  function plTxt(c) { try { return UI && UI.pl ? UI.pl(R.powerLevel(c)) : fmt(R.powerLevel(c)); } catch (e) { return "—"; } }

  function stat(rot, val) { var d = el("div"); d.appendChild(el("dt", "", rot)); d.appendChild(el("dd", "", val)); return d; }
  function foto(c) {
    var w = el("div", "char__photo");
    if (c.foto) { var img = el("img"); img.src = c.foto; img.alt = ""; w.appendChild(img); }
    else w.textContent = (c.nome || "?").charAt(0).toUpperCase();
    return w;
  }
  function cartao(c) {
    var li = el("li");
    var a = el("a", "char npc-card" + (marcados[c.id] ? " is-selected" : ""));
    a.href = "../" + DBOCharacters.sheetUrl(c.id);
    a.addEventListener("click", function (e) {
      if (!modoRemover) return;
      e.preventDefault();
      if (marcados[c.id]) delete marcados[c.id]; else marcados[c.id] = true;
      a.classList.toggle("is-selected", !!marcados[c.id]);
      a.setAttribute("aria-pressed", String(!!marcados[c.id]));
      atualizarBarra();
    });
    if (modoRemover) a.setAttribute("aria-pressed", String(!!marcados[c.id]));
    var info = el("div");
    var nome = el("h3", "char__name");
    nome.appendChild(el("span", "npc-card__tag", "NPC"));
    nome.appendChild(document.createTextNode(c.nome));
    info.appendChild(nome);
    var meta = el("dl", "char__meta");
    meta.appendChild(stat("Nível", fmt(c.nivel)));
    meta.appendChild(stat("Classe", c.classe + (c.subclasse ? " · " + c.subclasse : "")));
    meta.appendChild(stat("Raça", c.raca));
    meta.appendChild(stat("Power Level", plTxt(c)));
    info.appendChild(meta);
    a.appendChild(info);
    a.appendChild(foto(c));
    li.appendChild(a);
    return li;
  }

  function desenhar() {
    var q = norm(busca.trim());
    var lista = npcs.filter(function (c) { return !q || norm(c.nome).indexOf(q) >= 0; })
      .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), "pt-BR"); });
    var ul = $("npcs-lista"); ul.textContent = "";
    lista.forEach(function (c) { ul.appendChild(cartao(c)); });
    var vazio = $("npcs-vazio");
    vazio.hidden = lista.length > 0;
    vazio.textContent = npcs.length ? "Nenhum NPC com esse nome." : "Nenhum NPC ainda. Crie o primeiro!";
    $("npcs-lixo").hidden = !npcs.length;
    if (!npcs.length && modoRemover) ligarRemover(false);
  }

  /* ---------- Remover ---------- */
  function atualizarBarra() {
    var n = Object.keys(marcados).length;
    $("npcs-barra").hidden = !(modoRemover && n);
    $("npcs-conta").textContent = "Removendo: " + n + (n === 1 ? " NPC" : " NPCs");
  }
  function ligarRemover(on) {
    modoRemover = !!on; if (!on) marcados = {};
    document.documentElement.classList.toggle("is-deleting", modoRemover);
    $("npcs-lixo").setAttribute("aria-pressed", String(modoRemover));
    desenhar(); atualizarBarra();
  }
  $("npcs-lixo").addEventListener("click", function () { ligarRemover(!modoRemover); });
  $("npcs-remover").addEventListener("click", function () {
    var ids = Object.keys(marcados); if (!ids.length) return;
    var nomes = npcs.filter(function (c) { return marcados[c.id]; }).map(function (c) { return c.nome; });
    $("npcs-dlg-txt").textContent = "Remover " + nomes.join(", ") + "? A ficha, as técnicas e os equipamentos " + (ids.length === 1 ? "dele somem" : "deles somem") + " para sempre.";
    $("npcs-dlg").showModal(); $("npcs-dlg-nao").focus();
  });
  $("npcs-dlg-nao").addEventListener("click", function () { $("npcs-dlg").close(); });
  $("npcs-dlg-sim").addEventListener("click", function () {
    var ids = Object.keys(marcados);
    $("npcs-dlg").close();
    Promise.resolve(DBOCharacters.remove(ids)).then(function () {
      npcs = DBOCharacters.npcs();
      if (UI && UI.toast) UI.toast(ids.length === 1 ? "NPC removido." : ids.length + " NPCs removidos.");
      ligarRemover(false);
    }).catch(function (err) { $("npcs-notice").textContent = "Não consegui remover: " + err.message; });
  });

  $("npcs-busca").addEventListener("input", function (e) { busca = e.target.value; desenhar(); });

  /* ---------- Início: só o mestre ---------- */
  function abrir() {
    var mestre = window.DBORoles && DBORoles.isMaster();
    document.querySelectorAll("[data-so-mestre]").forEach(function (n) { n.hidden = !mestre; });
    document.querySelectorAll("[data-nao-mestre]").forEach(function (n) { n.hidden = mestre; });
    if (!mestre) return;
    var cache = DBOCharacters.cached && DBOCharacters.cached();
    if (cache && cache.npcs) { npcs = cache.npcs; desenhar(); }   // desenha na hora com a lista da última visita
    DBOCharacters.ready().then(function () { npcs = DBOCharacters.npcs(); desenhar(); })
      .catch(function (err) { $("npcs-notice").textContent = "Não consegui carregar os NPCs: " + err.message; });
  }
  Promise.resolve(window.DBORoles && DBORoles.refresh ? DBORoles.refresh() : null).catch(function () {}).then(abrir);
})();
