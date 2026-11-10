// Dragon Ball Omega — janela "Aprender habilidade de classe" (ficha).
//   Busca pelo nome e filtro (Todas, Classe, Sub-classe, Genéricas). Habilidades que o personagem ainda não pode pegar
//   aparecem escuras, com o motivo embaixo; clicar nelas mostra "Habilidade bloqueada." em vermelho no canto inferior esquerdo.
// DBOClassPicker.open(personagem, onPick)
//   onPick(id) grava a escolha e devolve "" (deu certo) ou um texto de erro (ex.: espaços cheios).
// Também usado pelo modo debug com { semTrava: true }: nada fica bloqueado e todas as sub-classes aparecem.
// NPC: { semTrava: true, todas: true } — além disso, aparecem as habilidades de TODAS as classes.
window.DBOClassPicker = (function () {
  var D = DBOData, R = DBORules, UI = DBOUI, el = UI.el;
  var dlg = null, toastTimer, estado = { filtro: "todas", busca: "" };
  var ROMANO = ["", "I", "II", "III"];

  function normal(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  // Por que o personagem não pode pegar esta habilidade de sub-classe? "" = pode.
  function bloqueio(c, d, tem) {
    if ((c.nivel || 1) < d.nivel) return "Libera no nível " + d.nivel + " (você está no " + (c.nivel || 1) + ")";
    var mesmas = (D.SUBCLASS_ABILITIES[d.subclasse] || []).filter(function (x) { return x.cat === d.cat && x.id !== d.id && tem.indexOf(x.id) >= 0; });
    if (mesmas.length) return "Você já escolheu a variante " + mesmas[0].variante + " da habilidade " + ROMANO[d.cat];
    if (d.cat > 1) {
      var anterior = (D.SUBCLASS_ABILITIES[d.subclasse] || []).some(function (x) { return x.cat === d.cat - 1 && tem.indexOf(x.id) >= 0; });
      if (!anterior) return "Pegue antes uma habilidade " + ROMANO[d.cat - 1] + " da sub-classe";
    }
    return "";
  }

  // Lista de itens: { id, nome, meta, detalhe, grupo: "classe"|"sub"|"generica", travado: "" | motivo, busca }
  function itens(c, opts) {
    var tem = c.habilidadesClasse || [], out = [];
    function copias(id) { return tem.filter(function (x) { return x === id; }).length; }
    var classes = opts.todas ? Object.keys(D.CLASS_ABILITIES || {}) : [c.classe];
    classes.forEach(function (cl) { ((D.CLASS_ABILITIES || {})[cl] || []).forEach(function (d) {
      if (d.exclusiva) {                       // exclusiva: 1ª cópia = maestria 1; 2ª cópia (maestria 2) só no nível 100+
        var n = copias(d.id);
        if (n >= d.max) return;
        var nv = c.nivel || 1, trava = n && nv < d.nivel2 && !opts.semTrava ? "Maestria 2 libera no nível " + d.nivel2 + " (você está no " + nv + ")" : "";
        out.push({ id: d.id, nome: d.nome, grupo: "classe", classe: cl, meta: "Exclusiva de " + cl + " · " + (n ? "maestria 1 → 2" : "maestria 1") + " · não custa TP · ocupa 1 espaço",
          detalhe: "“" + d.frase + "” " + d.m[n].texto, travado: trava });
        return;
      }
      if (tem.indexOf(d.id) >= 0) return;
      out.push({ id: d.id, nome: d.nome, grupo: "classe", classe: cl, meta: "Habilidade de " + cl + " · não custa TP" + (opts.todas ? "" : " · ocupa 1 espaço"), detalhe: d.descricao, travado: "" });
    }); });
    var subs = opts.semTrava ? Object.keys(D.SUBCLASS_ABILITIES || {}) : (c.subclasse ? [c.subclasse] : []);
    subs.forEach(function (sub) {
      (D.SUBCLASS_ABILITIES[sub] || []).forEach(function (raw) {
        if (raw.dragao && !opts.semTrava) return;               // o Rugir do Dragão vem sozinho no nível 20
        if (tem.indexOf(raw.id) >= 0) return;
        var d = R.defSubclasse(raw.id);
        var rot = raw.dragao ? "Rugir do Dragão" : "Habilidade " + ROMANO[d.cat] + (d.variante ? " · variante " + d.variante : "");
        out.push({ id: d.id, nome: d.nome, grupo: "sub", meta: sub + " · " + rot + " · nível " + d.nivel + (d.tipo ? " · " + d.tipo : ""),
          detalhe: (d.frase ? "“" + d.frase + "” " : "") + (d.texto || []).join(" "), travado: opts.semTrava ? "" : bloqueio(c, d, tem) });
      });
    });
    (D.GENERIC_CLASS_ABILITIES || []).forEach(function (d) {
      var n = copias(d.id);
      if (n >= d.max && !opts.semTrava) return;
      if (d.textos) {   // genérica de texto: mostra o que a próxima maestria faz
        var prox = Math.min(d.max, n + 1);
        out.push({ id: d.id, nome: d.nomes ? d.nomes[prox - 1] : d.nome, grupo: "generica",
          meta: "Genérica · " + (d.max === 1 ? "sem maestria a mais" : n ? "maestria " + n + " → " + prox : "maestria 1 de " + d.max) + " · ocupa 1 espaço",
          detalhe: d.textos.map(function (tx, i) { return (d.max > 1 ? "Maestria " + (i + 1) + ": " : "") + tx; }).join(" "), travado: "" });
        return;
      }
      out.push({ id: d.id, nome: d.nome, grupo: "generica",
        meta: "Genérica · " + (n ? "maestria " + n + " → " + (n + 1) : "maestria 1") + " · agora " + DBOAbility.textoGenerica(d, Math.min(d.max, n + 1)) + " · ocupa 1 espaço",
        detalhe: "Vai da maestria 1 à " + d.max + ". Cada maestria: +" + UI.fmt(d.por) + " " + d.rotulo + " (acumula). Maestria máxima: mais +" + UI.fmt(d.maximo) + ".", travado: "" });
    });
    var COR = { "Guerreiro": "guerreiro", "Monge": "monge", "Suporte": "suporte", "Curandeiro": "suporte", "Artífice": "artifice" };
    out.forEach(function (it) { it.faixa = it.grupo === "classe" ? COR[it.classe || c.classe] || "" : it.grupo === "sub" ? "sub" : "generica"; });
    out.forEach(function (it) { it.busca = normal(it.nome + " " + it.meta); });
    return out;
  }

  function toast(texto) {
    var t = dlg.querySelector(".cpick__toast");
    t.textContent = texto;
    t.hidden = false;
    t.classList.remove("is-on"); void t.offsetWidth; t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); t.hidden = true; }, 2600);
  }

  function build() {
    dlg = el("dialog", "modal cpick");
    dlg.setAttribute("aria-labelledby", "cpick-title");
    var x = el("button", "modal__close", "×"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.addEventListener("click", function () { dlg.close(); });
    dlg.appendChild(x);
    var h = el("h2", "", "Aprender habilidade de classe"); h.id = "cpick-title"; dlg.appendChild(h);
    dlg.appendChild(el("p", "modal__lead cpick__lead", ""));
    var tools = el("div", "cpick__tools");
    var lab = el("label", "sr-only", "Buscar habilidade pelo nome"); lab.setAttribute("for", "cpick-busca"); tools.appendChild(lab);
    var busca = el("input", "cpick__busca"); busca.type = "search"; busca.id = "cpick-busca"; busca.placeholder = "Buscar pelo nome…"; busca.autocomplete = "off";
    tools.appendChild(busca);
    var seg = el("div", "cpick__seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Filtrar habilidades");
    [["todas", "Todas"], ["classe", "Classe"], ["sub", "Sub-classe"], ["generica", "Genéricas"]].forEach(function (f) {
      var b = el("button", "", f[1]); b.type = "button"; b.setAttribute("data-filtro", f[0]); seg.appendChild(b);
    });
    tools.appendChild(seg);
    dlg.appendChild(tools);
    dlg.appendChild(el("ul", "cpick__list"));
    dlg.appendChild(el("p", "cpick__vazio"));
    var t = el("p", "cpick__toast"); t.setAttribute("role", "alert"); t.hidden = true; dlg.appendChild(t);
    document.body.appendChild(dlg);
  }

  function open(c, onPick, opts) {
    opts = opts || {};
    if (!dlg) build();
    var lead = dlg.querySelector(".cpick__lead");
    lead.textContent = opts.todas ? "NPC: qualquer habilidade de qualquer classe ou sub-classe, sem trava e sem limite de espaços."
      : opts.semTrava ? "Modo debug: qualquer habilidade, de qualquer classe ou sub-classe, sem limite de espaços."
      : "Não custa TP e ocupa 1 espaço. " + (c.subclasse ? "Sub-classe: " + c.subclasse + "." : "Você ainda não tem sub-classe (ela libera no nível " + D.SUBCLASS_LEVEL + ").");
    var busca = dlg.querySelector(".cpick__busca"), list = dlg.querySelector(".cpick__list"), vazio = dlg.querySelector(".cpick__vazio");
    estado.busca = ""; busca.value = "";
    var todos = itens(c, opts);

    function render() {
      list.textContent = "";
      dlg.querySelectorAll("[data-filtro]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filtro") === estado.filtro)); });
      var q = normal(estado.busca);
      var mostrar = todos.filter(function (it) { return (estado.filtro === "todas" || it.grupo === estado.filtro) && (!q || it.busca.indexOf(q) >= 0); });
      // As livres primeiro, as bloqueadas depois (cada grupo na ordem original).
      mostrar = mostrar.filter(function (it) { return !it.travado; }).concat(mostrar.filter(function (it) { return it.travado; }));
      mostrar.forEach(function (it) {
        var li = el("li", "cpick__row");
        var b = el("button", "cpick__item" + (it.travado ? " is-locked" : "") + (it.grupo === "sub" ? " is-sub" : "") + (it.faixa ? " cpick__item--faixa tech--faixa-" + it.faixa : ""));
        b.type = "button";
        b.setAttribute("aria-expanded", "false");
        b.appendChild(el("strong", "", it.nome));
        b.appendChild(el("small", "", it.meta));
        if (it.travado) b.appendChild(el("em", "cpick__motivo", it.travado));
        var det = null;
        if (it.detalhe) { det = el("span", "cpick__det", it.detalhe); b.appendChild(det); }
        // Clicar na habilidade abre/fecha o texto inteiro (sem as reticências).
        b.addEventListener("click", function () {
          var aberto = b.classList.toggle("is-open");
          b.setAttribute("aria-expanded", String(aberto));
        });
        li.appendChild(b);
        var go = el("button", "btn cpick__go", "Escolher");
        go.type = "button";
        go.setAttribute("aria-label", "Escolher " + it.nome);
        if (it.travado) go.setAttribute("aria-disabled", "true");
        go.addEventListener("click", function () {
          if (it.travado) { toast("Habilidade bloqueada."); return; }
          // Duas etapas: o primeiro clique arma o botão, o segundo escolhe de verdade.
          if (!go.classList.contains("is-armed")) {
            go.classList.add("is-armed");
            go.textContent = "Têm certeza? Clique novamente para confirmar";
            clearTimeout(go._t);
            go._t = setTimeout(function () { go.classList.remove("is-armed"); go.textContent = "Escolher"; }, 4000);
            return;
          }
          clearTimeout(go._t);
          var err = onPick(it.id);
          if (typeof err === "string" && err) { toast(err); go.classList.remove("is-armed"); go.textContent = "Escolher"; } else dlg.close();
        });
        li.appendChild(go);
        list.appendChild(li);
      });
      var msg = "";
      if (!mostrar.length) msg = estado.filtro === "sub" && !c.subclasse && !opts.semTrava ? "Escolha uma sub-classe (no nível " + D.SUBCLASS_LEVEL + ") para ver as habilidades dela." : q ? "Nada encontrado com esse nome." : "Nenhuma habilidade para pegar aqui.";
      vazio.textContent = msg; vazio.hidden = !msg;
    }
    busca.oninput = function () { estado.busca = busca.value; render(); };
    dlg.querySelectorAll("[data-filtro]").forEach(function (b) { b.onclick = function () { estado.filtro = b.getAttribute("data-filtro"); render(); }; });
    render();
    dlg.showModal();
    busca.focus();
  }
  return { open: open, bloqueio: bloqueio };
})();
