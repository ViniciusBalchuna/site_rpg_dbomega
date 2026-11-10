// Dragon Ball Omega — painel "Penalidades e Aprimoramentos" (ficha e combate).
//   DBOEfeitosUI.panel(host, { readOnly }) → <section> com os efeitos ativos e os botões de adicionar.
//   host: { get(): personagem, save(patch): grava (e redesenha a página) }
//   DBOEfeitosUI.host = host  → usado quando uma técnica com fortalecimentos é usada (DBOEfeitosUI.aplicarTecnica).
// Regras e números: js/efeitos-data.js.
window.DBOEfeitosUI = (function () {
  var UI = DBOUI, FX = DBOEfeitos, el = UI.el;
  var abertos = {};       // detalhes abertos de cada efeito ativo (por id)

  function avisar(msgs) { if (msgs && msgs.length) UI.toast(msgs.join(" · ")); }
  function gravar(host, patch, msgs) {
    try { host.save(patch); } catch (e) { UI.toast(e.message); return; }
    avisar(msgs);
  }
  function tipoNome(def) { return def.tipo === "penalidade" ? "Penalidade" : "Aprimoramento"; }

  /* ---------- Painel ---------- */
  function panel(host, opts) {
    opts = opts || {};
    var c = host.get(), card = el("section", "panel fxpanel");
    var head = el("div", "fxpanel__head");
    head.appendChild(el("h2", "", "Penalidades e Aprimoramentos"));
    card.appendChild(head);
    var lista = FX.ativos(c);
    if (!lista.length) card.appendChild(el("p", "fxpanel__empty", "Nenhum efeito ativo."));
    var ul = el("ul", "fxlist");
    lista.forEach(function (e) { ul.appendChild(cartao(host, e, opts)); });
    if (lista.length) card.appendChild(ul);
    if (!opts.readOnly) {
      var acts = el("div", "fxpanel__acts");
      var bp = el("button", "btn btn--ghost fxbtn fxbtn--pen", "+ Adicionar penalidade"); bp.type = "button";
      bp.addEventListener("click", function () { abrirSeletor(host, "penalidade"); });
      var bf = el("button", "btn btn--ghost fxbtn fxbtn--for", "+ Adicionar aprimoramento"); bf.type = "button";
      bf.addEventListener("click", function () { abrirSeletor(host, "fortalecimento"); });
      acts.appendChild(bp); acts.appendChild(bf);
      card.appendChild(acts);
    }
    return card;
  }

  function cartao(host, e, opts) {
    var def = FX.POR_ID[e.ef], li = el("li", "fxcard fxcard--" + def.tipo);
    var top = el("div", "fxcard__top");
    var nome = el("button", "fxcard__name");
    nome.type = "button";
    nome.setAttribute("aria-expanded", String(!!abertos[e.id]));
    nome.appendChild(el("strong", "", FX.rotulo(def, e.param)));
    nome.appendChild(el("span", "fx-grau", "Grau " + FX.ROMANO[e.grau]));
    if (def.acumula) nome.appendChild(el("span", "fxcard__stack", "×" + (e.acumulos || 1)));
    nome.addEventListener("click", function () { abertos[e.id] = !abertos[e.id]; if (host.refresh) host.refresh(); else host.save({ efeitosAtivos: (host.get().efeitosAtivos || []).slice() }); });
    top.appendChild(nome);
    top.appendChild(el("span", "fxcard__dur", e.rodadas == null ? "sem duração" : e.rodadas + (e.rodadas === 1 ? " rodada" : " rodadas")));
    if (!opts.readOnly) {
      var x = el("button", "fxcard__x", "×"); x.type = "button";
      x.setAttribute("aria-label", "Tirar " + def.nome);
      x.addEventListener("click", function () { gravar(host, { efeitosAtivos: FX.remover(host.get(), e.id) }, [FX.rotulo(def, e.param) + " removido."]); });
      top.appendChild(x);
    }
    li.appendChild(top);
    li.appendChild(el("p", "fxcard__res", FX.resumo(e) + (e.fonte ? " · " + e.fonte : "")));
    if (abertos[e.id]) {
      var det = el("div", "fxcard__det");
      det.appendChild(el("p", "fxcard__frase", def.frase));
      def.texto.forEach(function (t) { det.appendChild(el("p", "", t)); });
      if (def.escudo) det.appendChild(el("p", "", "Agora: absorve até " + UI.fmt(Math.round(DBORules.hpMax(host.get()) * FX.valorGrau(def.escudo, e.grau) / 100)) + " de dano."));
      var g = el("ol", "fxcard__graus");
      def.graus.forEach(function (txt, i) { g.appendChild(el("li", i + 1 === e.grau ? "is-on" : "", "Grau " + FX.ROMANO[i + 1] + ": " + txt)); });
      det.appendChild(g);
      li.appendChild(det);
    }
    if (!opts.readOnly) {
      var acts = el("div", "fxcard__acts");
      var passa = el("button", "btn btn--ghost fxcard__btn", "Passar rodada"); passa.type = "button";
      passa.title = "Aplica o começo e o fim do turno deste efeito e diminui 1 rodada";
      passa.addEventListener("click", function () { var r = FX.passarRodada(host.get(), e.id); gravar(host, r.patch, r.msgs.length ? r.msgs : [def.nome + ": rodada passada."]); });
      acts.appendChild(passa);
      if (def.acumula) {
        var mais = el("button", "btn btn--ghost fxcard__btn", "+1 acúmulo"); mais.type = "button";
        mais.disabled = (e.acumulos || 1) >= def.acumula;
        mais.addEventListener("click", function () { var r = FX.adicionar(host.get(), def.id, { grau: e.grau, param: e.param, rodadas: e.rodadas }); gravar(host, { efeitosAtivos: r.lista }, r.msgs); });
        acts.appendChild(mais);
      }
      if (def.tick && def.tick.quando === "acao") {
        var sg = el("button", "btn btn--ghost fxcard__btn", "Ação ou reação"); sg.type = "button";
        sg.title = "Você gastou uma ação ou fez uma reação: role o sangramento";
        sg.addEventListener("click", function () { var r = FX.sangrar(host.get(), e.id); gravar(host, r.patch, r.msgs); });
        acts.appendChild(sg);
      }
      if (def.id === "queimadura") {
        var ap = el("button", "btn btn--ghost fxcard__btn", "Apagar (1 ação)"); ap.type = "button";
        ap.addEventListener("click", function () { gravar(host, { efeitosAtivos: FX.remover(host.get(), e.id) }, ["Chamas apagadas."]); });
        acts.appendChild(ap);
      }
      li.appendChild(acts);
    }
    return li;
  }

  /* ---------- Pop-up de escolher efeito ---------- */
  var dlg = null, estado = null;
  function montar() {
    if (dlg) return dlg;
    dlg = el("dialog", "fxdlg fxpick");
    dlg.setAttribute("aria-labelledby", "fxpick-title");
    dlg.innerHTML =
      '<button class="fxdlg__x" type="button" data-fx-close aria-label="Fechar">&times;</button>' +
      '<h2 id="fxpick-title"></h2>' +
      '<label class="sr-only" for="fxpick-busca">Pesquisar efeito</label>' +
      '<input id="fxpick-busca" class="fxpick__busca" type="search" placeholder="Pesquisar efeito" autocomplete="off">' +
      '<div class="fxpick__grid"><ul class="fxpick__list" id="fxpick-list" role="listbox" aria-label="Efeitos"></ul><div class="fxpick__desc" id="fxpick-desc" aria-live="polite"></div></div>' +
      '<div class="fxpick__foot">' +
      '<label class="check fxpick__dur"><input id="fxpick-durbox" type="checkbox"><span>Adicionar duração</span></label>' +
      '<label class="fxpick__rod" id="fxpick-rodwrap" hidden><select id="fxpick-rod" aria-label="Duração">' + DURS() + '</select></label>' +
      '<button class="btn" type="button" id="fxpick-ok" disabled>Confirmar seleção</button>' +
      '</div>';
    document.body.appendChild(dlg);
    dlg.querySelector("[data-fx-close]").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector("#fxpick-busca").addEventListener("input", desenharLista);
    dlg.querySelector("#fxpick-durbox").addEventListener("change", function (ev) {
      dlg.querySelector("#fxpick-rodwrap").hidden = !ev.target.checked;
      if (ev.target.checked) dlg.querySelector("#fxpick-rod").focus();
    });
    dlg.querySelector("#fxpick-ok").addEventListener("click", confirmar);
    return dlg;
  }
  function semAcento(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function abrirSeletor(host, tipo) {
    montar();
    estado = { host: host, tipo: tipo, sel: null, grau: 1, param: "" };
    dlg.querySelector("#fxpick-title").textContent = tipo === "penalidade" ? "Adicionar penalidade" : "Adicionar aprimoramento";
    dlg.querySelector("#fxpick-busca").value = "";
    dlg.querySelector("#fxpick-durbox").checked = false;
    dlg.querySelector("#fxpick-rodwrap").hidden = true;
    dlg.querySelector("#fxpick-rod").value = "curta";
    desenharLista(); desenharDesc();
    dlg.showModal();
    dlg.querySelector("#fxpick-busca").focus();
  }
  function desenharLista() {
    var ul = dlg.querySelector("#fxpick-list"), q = semAcento(dlg.querySelector("#fxpick-busca").value.trim());
    ul.textContent = "";
    var lista = (estado.tipo === "penalidade" ? FX.penalidades() : FX.fortalecimentos()).filter(function (d) {
      return !q || semAcento(d.nome + " " + d.frase).indexOf(q) >= 0;
    });
    if (!lista.length) { ul.appendChild(el("li", "fxpick__vazio", "Nenhum efeito com esse nome.")); return; }
    lista.forEach(function (d) {
      var li = el("li");
      var b = el("button", "fxpick__item" + (estado.sel === d.id ? " is-on" : ""));
      b.type = "button"; b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(estado.sel === d.id));
      b.appendChild(el("strong", "", d.nome));
      b.appendChild(el("small", "", d.frase));
      b.addEventListener("click", function () { estado.sel = d.id; estado.param = ""; desenharLista(); desenharDesc(); });
      b.addEventListener("dblclick", function () { estado.sel = d.id; if (!d.param) confirmar(); });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function desenharDesc() {
    var box = dlg.querySelector("#fxpick-desc"), ok = dlg.querySelector("#fxpick-ok");
    box.textContent = "";
    var d = estado.sel && FX.POR_ID[estado.sel];
    if (!d) { box.appendChild(el("p", "fxpick__hint", "Escolha um efeito na lista.")); ok.disabled = true; return; }
    box.appendChild(el("h3", "fx-name fx-name--" + d.tipo, d.nome));
    box.appendChild(el("p", "fxpick__frase", d.frase));
    if (d.tipo === "penalidade") box.appendChild(el("p", "", "Resiste com: " + FX.resisteTexto(d)));
    d.texto.forEach(function (t) { box.appendChild(el("p", "", t)); });
    if (d.param) {
      var opts = d.param === "penalidade" ? FX.penalidades().map(function (p) { return p.nome; }) : d.param === "atributo" ? DBOData.ATTRIBUTES.map(function (a) { return a[1]; }) : ["Físico", "Ki"];
      var w = el("div", "field"), lb = el("label", "", d.param === "penalidade" ? "Qual penalidade?" : d.param === "atributo" ? "Qual atributo?" : "Físico ou ki?"), sel = el("select");
      sel.id = "fxpick-param"; lb.htmlFor = sel.id;
      sel.appendChild(new Option("Escolha...", ""));
      opts.forEach(function (o) { sel.appendChild(new Option(o, o)); });
      sel.value = estado.param;
      sel.addEventListener("change", function () { estado.param = sel.value; ok.disabled = !estado.param; });
      w.appendChild(lb); w.appendChild(sel); box.appendChild(w);
    }
    // Grau
    var gset = el("fieldset", "fxpick__graus");
    gset.appendChild(el("legend", "", "Grau"));
    d.graus.forEach(function (txt, i) {
      var lab = el("label", "fxpick__grau"), r = el("input");
      r.type = "radio"; r.name = "fxpick-grau"; r.value = String(i + 1); r.checked = estado.grau === i + 1;
      r.addEventListener("change", function () { estado.grau = i + 1; });
      lab.appendChild(r);
      var sp = el("span"); sp.appendChild(el("b", "", "Grau " + FX.ROMANO[i + 1])); sp.appendChild(document.createTextNode(" " + txt));
      lab.appendChild(sp); gset.appendChild(lab);
    });
    box.appendChild(gset);
    box.appendChild(el("p", "fxpick__tp", "Custo de TP para aplicar (em técnicas): " + d.tp + " TP"));
    ok.disabled = !!d.param && !estado.param;
  }
  function DURS() { return FX.DURACOES.filter(function (d) { return d.id !== "inst"; }).map(function (d) { return '<option value="' + d.id + '"' + (d.id === "curta" ? " selected" : "") + ">" + d.nome + " (" + d.texto + ")</option>"; }).join(""); }
  function confirmar() {
    var d = estado.sel && FX.POR_ID[estado.sel];
    if (!d || (d.param && !estado.param)) return;
    var host = estado.host, c = host.get();
    var dur = dlg.querySelector("#fxpick-durbox").checked, rod = dur ? FX.rolarDuracao(dlg.querySelector("#fxpick-rod").value) : null;
    // Aprimorar é um bônus no próximo teste (o mesmo do botão Ativar), não um efeito com duração.
    if (d.id === "aprimorar") {
      var chave = null; DBOData.ATTRIBUTES.forEach(function (a) { if (a[1] === estado.param) chave = a[0]; });
      if (window.DBOAbility && DBOAbility.definirPendente) DBOAbility.definirPendente(c, { atributo: chave, valor: FX.valorGrau(d.bonus, estado.grau), fonte: "Aprimorar " + estado.param });
      dlg.close();
      UI.toast("Aprimorar " + estado.param + ": +" + FX.valorGrau(d.bonus, estado.grau) + " no seu próximo teste de " + estado.param + ".");
      return;
    }
    if (d.instantaneo) {   // Morte Instantânea: aplica na hora, se o HP estiver no limiar
      var hpMax = DBORules.hpMax(c), hp = DBORules.hpAtual(c), lim = FX.valorGrau(d.limiar, estado.grau);
      if (FX.imune(c, d.id, estado.grau)) { dlg.close(); return UI.toast("Morte Instantânea: você é imune."); }
      dlg.close();
      if (hp > hpMax * lim * 2 / 100) return UI.toast("Morte Instantânea não funciona: seu HP está acima de " + lim * 2 + "% do máximo.");
      return pedirMorte(host, hp, hpMax, lim);
    }
    var r = FX.adicionar(c, d.id, { grau: estado.grau, param: estado.param, rodadas: rod });
    if (r.bloqueado) { avisar(r.msgs); return; }
    dlg.close();
    if (d.id === "purificacao") return purificar(host, estado.grau);
    gravar(host, { efeitosAtivos: r.lista }, [FX.rotulo(d, estado.param) + " Grau " + FX.ROMANO[estado.grau] + " adicionado" + (rod ? " por " + rod + (rod === 1 ? " rodada" : " rodadas") : "") + "."].concat(r.msgs));
  }
  // Morte Instantânea: o jogador diz se o limiar é o normal ou o dobrado (PL do atacante maior que o seu).
  function pedirMorte(host, hp, hpMax, lim) {
    var pct = Math.round(hp / hpMax * 1000) / 10;
    var dobra = pct > lim;   // só dá certo se o atacante tiver PL maior (limiar dobrado)
    if (dobra && !window.confirm("Seu HP está em " + String(pct).replace(".", ",") + "%: só funciona se quem atacou tiver Poder de Luta MAIOR que o seu (limiar " + lim * 2 + "%). Ele tem?")) return UI.toast("Morte Instantânea não funcionou.");
    gravar(host, { hpAtual: 0 }, ["Morte Instantânea: seu HP foi a 0."]);
  }
  // Purificação: encerra penalidades suas de grau coberto (as de maior grau primeiro).
  function purificar(host, grau) {
    var p = FX.valorGrau(FX.POR_ID.purificacao.purifica, grau), qtd = p[0], ate = p[1], c = host.get();
    var pens = FX.ativos(c).filter(function (e) { return FX.POR_ID[e.ef].tipo === "penalidade" && e.grau <= ate; }).sort(function (a, b) { return b.grau - a.grau; }).slice(0, qtd);
    if (!pens.length) return UI.toast("Purificação: nenhuma penalidade de grau coberto para encerrar.");
    var ids = pens.map(function (e) { return e.id; }), lista = (c.efeitosAtivos || []).filter(function (e) { return ids.indexOf(e.id) < 0; });
    if (!FX.ativos({ efeitosAtivos: lista }).length) lista = [];
    gravar(host, { efeitosAtivos: lista }, ["Purificação: " + pens.map(function (e) { return FX.rotulo(FX.POR_ID[e.ef], e.param); }).join(", ") + " encerrada" + (pens.length > 1 ? "s" : "") + "."]);
  }

  /* ---------- Usar uma técnica com fortalecimentos ---------- */
  var dlgT = null;
  function aplicarTecnica(nomeTec, lista, grau) {
    var host = api.host;
    if (!host || !lista.length) return;
    if (!dlgT) {
      dlgT = el("dialog", "fxdlg fxapply");
      dlgT.innerHTML = '<button class="fxdlg__x" type="button" data-fx-close aria-label="Fechar">&times;</button><h2 id="fxapply-title"></h2>' +
        '<p class="fxpick__hint">Os fortalecimentos da técnica valem em você. Se a técnica já define a duração do efeito, ela é rolada sozinha; senão, marque e escolha a duração.</p>' +
        '<ul class="fxapply__list" id="fxapply-list"></ul>' +
        '<div class="fxpick__foot"><label class="check fxpick__dur"><input id="fxapply-durbox" type="checkbox"><span>Adicionar duração</span></label>' +
        '<label class="fxpick__rod" id="fxapply-rodwrap" hidden><select id="fxapply-rod" aria-label="Duração">' + DURS() + '</select></label>' +
        '<button class="btn btn--ghost" type="button" id="fxapply-no">Agora não</button><button class="btn" type="button" id="fxapply-ok">Aplicar</button></div>';
      document.body.appendChild(dlgT);
      dlgT.querySelector("[data-fx-close]").addEventListener("click", function () { dlgT.close(); });
      dlgT.querySelector("#fxapply-no").addEventListener("click", function () { dlgT.close(); });
      dlgT.querySelector("#fxapply-durbox").addEventListener("change", function (ev) { dlgT.querySelector("#fxapply-rodwrap").hidden = !ev.target.checked; });
    }
    dlgT.querySelector("#fxapply-title").textContent = nomeTec + ": fortalecimentos";
    var ul = dlgT.querySelector("#fxapply-list"); ul.textContent = "";
    lista.forEach(function (r) {
      var li = el("li");
      li.appendChild(el("b", "fx-name fx-name--fortalecimento", FX.rotulo(r.def, r.param)));
      li.appendChild(el("span", "fx-grau", "Grau " + FX.ROMANO[grau]));
      li.appendChild(el("small", "", FX.valorGrau(r.def.graus, grau)));
      ul.appendChild(li);
    });
    dlgT.querySelector("#fxapply-durbox").checked = false; dlgT.querySelector("#fxapply-rodwrap").hidden = true; dlgT.querySelector("#fxapply-rod").value = "curta";
    dlgT.querySelector("#fxapply-ok").onclick = function () {
      var dur = dlgT.querySelector("#fxapply-durbox").checked, catEsc = dlgT.querySelector("#fxapply-rod").value;
      var c = host.get(), msgs = [], purif = false;
      lista.forEach(function (r) {
        if (r.def.id === "purificacao") { purif = true; return; }
        var rod = r.dur ? FX.rolarDuracao(r.dur) : (dur ? FX.rolarDuracao(catEsc) : null);
        var x = FX.adicionar(c, r.def.id, { grau: grau, param: r.param, rodadas: rod, fonte: nomeTec });
        c = Object.assign({}, c, { efeitosAtivos: x.lista }); msgs = msgs.concat(x.msgs);
      });
      dlgT.close();
      gravar(host, { efeitosAtivos: c.efeitosAtivos || [] }, [nomeTec + ": fortalecimentos aplicados."].concat(msgs));
      if (purif) purificar(host, grau);
    };
    dlgT.showModal();
  }

  var api = { panel: panel, abrirSeletor: abrirSeletor, aplicarTecnica: aplicarTecnica, purificar: purificar, host: null };
  return api;
})();
