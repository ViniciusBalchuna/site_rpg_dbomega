// Dragon Ball Omega — Enciclopédia: menu de sessões à esquerda e bloco com a descrição.
// Para mudar um texto ou o endereço de uma sessão, edite a lista SECTIONS.
(function () {
  var el = DBOUI.el;

  var SECTIONS = [
    { id: "bestiario", nome: "Bestiário", href: "enciclopedia/bestiario.html",
      lead: "As criaturas que o universo inteiro teme.",
      itens: ["Quem é a criatura e o quão perigosa ela é", "O que ela faz de pior", "Onde costuma ser encontrada"] },
    { id: "missoes", nome: "Missões", href: "enciclopedia/missoes.html",
      lead: "Trabalhos à espera de quem topar.",
      itens: ["A tarefa de cada missão", "A recompensa por cumprir"] },
    { id: "planetas", nome: "Planetas", href: "enciclopedia/planetas.html",
      lead: "Cada mundo conhecido, catalogado.",
      itens: ["Biodiversidade: fauna e flora", "Clima, povos e lugares marcantes", "Curiosidades de cada planeta"] },
    { id: "misterios", nome: "Mistérios", href: "enciclopedia/misterios.html",
      lead: "O que ainda não tem resposta no universo.",
      itens: ["O que se sabe até agora", "Pistas soltas por aí", "Aviso: algumas respostas valem muito"] },
    { id: "atualizacoes", nome: "Atualizações", href: "enciclopedia/atualizacoes.html",
      lead: "Novidades do site em si. Meio \"metagame\".",
      itens: ["O que mudou no site", "Quando mudou"] }
  ];

  var menu = document.getElementById("sec-menu");
  var panel = document.getElementById("sec-panel");
  var buttons = {};

  function show(sec) {
    SECTIONS.forEach(function (s) { buttons[s.id].setAttribute("aria-expanded", String(s === sec)); });
    panel.textContent = "";
    panel.appendChild(el("h2", "", sec.nome));
    panel.appendChild(el("p", "sec-panel__lead", sec.lead));
    panel.appendChild(el("p", "sec-panel__label", "Você vai encontrar"));
    var list = el("ul");
    sec.itens.forEach(function (t) { list.appendChild(el("li", "", t)); });
    panel.appendChild(list);
    var go = el("a", "btn btn--cta", "Seguir para o conteúdo");
    go.href = sec.href;
    panel.appendChild(go);

    panel.classList.remove("is-in");
    void panel.offsetWidth; // reinicia a animação de entrada
    panel.classList.add("is-in");
    // No celular o bloco abre abaixo do menu: traz ele pra tela.
    if (window.matchMedia("(max-width: 720px)").matches) panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  SECTIONS.forEach(function (sec) {
    var li = el("li");
    var b = el("button", "sec-btn", sec.nome);
    b.type = "button";
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", "sec-panel");
    b.addEventListener("click", function () { show(sec); });
    buttons[sec.id] = b;
    li.appendChild(b);
    menu.appendChild(li);
  });
})();
