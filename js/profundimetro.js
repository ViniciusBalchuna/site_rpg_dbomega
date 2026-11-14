// Dragon Ball Omega — landing "Profundímetro" (css/profundimetro.css)
// Faz duas coisas, sem expor nenhum objeto global:
//   1. marca no medidor lateral a seção que está na tela;
//   2. troca a letra "A" da ficha de exemplo pela foto do Ashura, se ela existir em imagem/personagem/.
(function () {
  /* ---------- 1. Medidor: destaca o marcador da seção visível ---------- */
  var linksDoMedidor = document.querySelectorAll(".medidor__link");

  function marcarSecaoAtiva(idDaSecao) {
    linksDoMedidor.forEach(function (link) {
      link.classList.toggle("is-ativo", link.getAttribute("href") === "#" + idDaSecao);
    });
  }

  if ("IntersectionObserver" in window && linksDoMedidor.length) {
    // A seção conta como "atual" quando cruza uma faixa fina no meio da tela.
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) marcarSecaoAtiva(entrada.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    linksDoMedidor.forEach(function (link) {
      var secao = document.querySelector(link.getAttribute("href"));
      if (secao) observador.observe(secao);
    });
  }

  /* ---------- 2. Foto do Ashura: imagem/personagem/ashura.(jpg|jpeg|png|webp|avif) ---------- */
  // Sem arquivo nessa pasta, a letra "A" continua no lugar.
  var caixaDaFoto = document.getElementById("foto-ashura");
  if (caixaDaFoto) {
    var extensoesAceitas = ["jpg", "jpeg", "png", "webp", "avif"];
    var posicaoDaExtensao = 0;
    var foto = new Image();
    foto.alt = "Ashura";
    foto.onload = function () {
      caixaDaFoto.textContent = "";
      caixaDaFoto.appendChild(foto);
    };
    foto.onerror = function () {
      posicaoDaExtensao++;
      if (posicaoDaExtensao < extensoesAceitas.length) {
        foto.src = "imagem/personagem/ashura." + extensoesAceitas[posicaoDaExtensao];
      }
    };
    foto.src = "imagem/personagem/ashura." + extensoesAceitas[0];
  }
})();
