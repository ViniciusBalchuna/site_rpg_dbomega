// Dragon Ball Omega — página Jogadores da campanha
(function () {
  var UI = DBOUI, el = UI.el, C = DBOCampaign;
  var mineBox = document.getElementById("mine");
  var list = document.getElementById("players");
  var empty = document.getElementById("players-empty");

  function avatar(c) {
    var box = el("div", "avatar-c");
    if (c.foto) {
      var img = el("img");
      img.src = c.foto;
      img.alt = "";
      box.appendChild(img);
    } else {
      box.textContent = (c.nome || "?").trim().charAt(0).toUpperCase();
    }
    return box;
  }

  function meta(c) {
    var dl = el("dl", "player__meta");
    [["Classe", c.classe], ["Raça", c.raca], ["Nível", UI.fmt(c.nivel)]].forEach(function (m) {
      var d = el("div");
      d.appendChild(el("dt", "", m[0]));
      d.appendChild(el("dd", "", m[1]));
      dl.appendChild(d);
    });
    return dl;
  }

  // Só o dono vira link pra ficha. Os outros (mestre inclusive) veem o cartão, mas não abrem.
  function card(p) {
    var node = p.mine ? el("a", "player") : el("div", "player");
    if (p.mine) {
      node.href = "../personagem.html?id=" + encodeURIComponent(p.char.id);
      node.setAttribute("aria-label", "Abrir a ficha de " + p.char.nome);
      node.appendChild(el("span", "player__me", "Seu personagem"));
    }
    var info = el("div");
    info.appendChild(el("h3", "player__name", p.char.nome));
    info.appendChild(meta(p.char));
    node.appendChild(info);
    node.appendChild(avatar(p.char));
    var li = el("li");
    li.appendChild(node);
    return li;
  }

  function note(text) { return el("p", "", text); }
  function link(text, href) { var a = el("a", "btn", text); a.href = href; return a; }

  function renderMine() {
    mineBox.textContent = "";
    mineBox.appendChild(el("h2", "", "Seu lugar na campanha"));
    var me = C.user();

    if (!me) {
      mineBox.appendChild(note("Pra entrar na campanha, conecta na sua conta. Cada conta registra um personagem."));
      mineBox.appendChild(link("Entrar na conta", "../configuracoes.html"));
      return;
    }

    var mine = C.mine();
    if (mine) {
      mineBox.appendChild(note("Você está na campanha com " + mine.char.nome + ". Clica no seu cartão pra abrir a ficha."));
      var out = el("button", "btn btn--ghost", "Sair da campanha");
      out.type = "button";
      var armed = false, timer;
      out.addEventListener("click", function () {
        if (!armed) {
          armed = true;
          out.textContent = "Confirmar saída";
          timer = setTimeout(function () { armed = false; out.textContent = "Sair da campanha"; }, 4000);
          return;
        }
        clearTimeout(timer);
        out.disabled = true;
        Promise.resolve(C.leave()).then(render).catch(function (err) { out.disabled = false; UI.toast(err.message); });
      });
      mineBox.appendChild(out);
      return;
    }

    var chars = DBOCharacters.list();
    if (!chars.length) {
      mineBox.appendChild(note("Você ainda não tem personagens. Cria um pra poder entrar."));
      mineBox.appendChild(link("Criar personagem", "../criar-personagem.html"));
      return;
    }

    mineBox.appendChild(note("Escolhe qual personagem vai jogar. Só dá pra ter um na campanha."));
    // Cartões com foto, nome, classe, raça e nível; o escolhido fica destacado.
    var escolhido = chars[0].id;
    var group = el("fieldset", "pick-chars");
    group.appendChild(el("legend", "sr-only", "Personagem para entrar na campanha"));
    chars.forEach(function (c, i) {
      var lab = el("label", "pick-char");
      var r = el("input"); r.type = "radio"; r.name = "pick-char"; r.value = c.id; r.checked = i === 0;
      r.addEventListener("change", function () { escolhido = c.id; });
      lab.appendChild(r);
      lab.appendChild(avatar(c));
      var txt = el("span", "pick-char__txt");
      txt.appendChild(el("strong", "", c.nome));
      txt.appendChild(el("small", "", c.classe + " · " + c.raca + " · nível " + UI.fmt(c.nivel)));
      lab.appendChild(txt);
      lab.appendChild(el("span", "pick-char__check", "✓")).setAttribute("aria-hidden", "true");
      group.appendChild(lab);
    });
    mineBox.appendChild(group);
    var row = el("div", "mine__row");
    var join = el("button", "btn", "Entrar na campanha");
    join.type = "button";
    var msg = el("p", "msg");
    msg.setAttribute("role", "alert");
    join.addEventListener("click", function () {
      join.disabled = true;
      Promise.resolve().then(function () { return C.join(escolhido); }).then(render)
        .catch(function (err) { join.disabled = false; msg.textContent = err.message; msg.className = "msg msg--error"; });
    });
    row.appendChild(join);
    mineBox.appendChild(row);
    mineBox.appendChild(msg);
  }

  function renderPlayers() {
    list.textContent = "";
    var all = C.players();
    // O personagem do jogador fica em primeiro lugar.
    all.sort(function (a, b) { return (b.mine ? 1 : 0) - (a.mine ? 1 : 0); });
    all.forEach(function (p) { list.appendChild(card(p)); });
    empty.hidden = all.length > 0;
  }

  function render() { renderMine(); renderPlayers(); }
  C.ready().then(render).catch(function (err) { UI.toast("Não consegui carregar os personagens: " + err.message); });
})();
