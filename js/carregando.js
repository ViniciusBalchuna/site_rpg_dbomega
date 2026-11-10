// Dragon Ball Omega — textos das telas de carregamento.
// Toda tela de carregamento (.loading) mostra três textos que se alternam a cada 5 segundos de espera:
// "Aguarde alguns instantes...", "Quase lá...." e "Obrigado por esperar!". Quando a tela some, volta ao primeiro.
// Vale para qualquer .loading__msg da página (as que já existem e as que aparecerem depois).
// A tela vermelha de remover personagens mantém o texto dela; quem alterna lá é a linha de baixo (js/personagens.js).
(function () {
  var TEXTOS = ["Aguarde alguns instantes...", "Quase lá....", "Obrigado por esperar!"];
  var ESPERA = 5;   // segundos em cada texto
  window.DBOCarregando = { TEXTOS: TEXTOS };
  function visivel(tela) { return !tela.hidden && !tela.classList.contains("is-done") && tela.getClientRects().length > 0; }
  function passo() {
    document.querySelectorAll(".loading").forEach(function (tela) {
      if (tela.classList.contains("loading--red")) return;
      var msg = tela.querySelector(".loading__msg");
      if (!msg) return;
      var seg = visivel(tela) ? (Number(tela.dataset.espera) || 0) + 1 : 0;
      tela.dataset.espera = String(seg);
      var txt = TEXTOS[Math.floor(seg / ESPERA) % TEXTOS.length];
      if (msg.textContent !== txt) msg.textContent = txt;
    });
  }
  setInterval(passo, 1000);
})();
