// Dragon Ball Omega — utilidades de interface (criar elementos, formatar números, aviso)
window.DBOUI = (function () {
  var toastTimer;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // 1234567 -> "1.234.567"
  function fmt(n) { return Number(n).toLocaleString("pt-BR"); }

  // 10000000000 -> "10b", 1500000 -> "1,5m" (k mil, m milhão, b bilhão, t trilhão, q quatrilhão)
  function compact(n) {
    n = Number(n) || 0;
    var sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    var units = [[1e15, "q"], [1e12, "t"], [1e9, "b"], [1e6, "m"], [1e3, "k"]];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][0]) return sign + String(Math.floor(n / units[i][0] * 100) / 100).replace(".", ",") + units[i][1];
    }
    return sign + Math.floor(n);
  }

  // Power Level: até 999.999.999 mostra o número inteiro; de 1 bilhão em diante, abreviado com sufixo
  // (1b = bilhão, 1t = trilhão, 1qd = quatrilhão, 1qt = quintilhão, 1sx = sextilhão, 1sp = septilhão, depois oc, nn, dc).
  // Duas casas decimais, sem arredondar para cima: 1.259.000.000 vira "1,25b". Acima de 10^36, notação científica.
  var SUFIXOS_PL = [[1e33, "dc"], [1e30, "nn"], [1e27, "oc"], [1e24, "sp"], [1e21, "sx"], [1e18, "qt"], [1e15, "qd"], [1e12, "t"], [1e9, "b"]];
  function pl(n) {
    n = Number(n) || 0;
    if (Math.abs(n) < 1e9) return fmt(n);
    var sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1e36) { var e = Math.floor(Math.log10(n)); return sign + String(Math.floor(n / Math.pow(10, e) * 100 + 1e-6) / 100).replace(".", ",") + "e" + e; }
    for (var i = 0; i < SUFIXOS_PL.length; i++) {
      if (n >= SUFIXOS_PL[i][0]) return sign + String(Math.floor(n / SUFIXOS_PL[i][0] * 100 + 1e-6) / 100).replace(".", ",") + SUFIXOS_PL[i][1];
    }
    return sign + fmt(n);
  }

  // Caixa vermelha no canto inferior da tela. Usa a camada superior do navegador (popover)
  // para aparecer também por cima das janelas abertas.
  function toast(message) {
    var node = document.getElementById("toast");
    if (!node) return;
    clearTimeout(toastTimer);
    node.textContent = message;
    try {
      if (node.showPopover) {
        if (node.matches(":popover-open")) node.hidePopover();
        node.showPopover();
      }
    } catch (e) {}
    toastTimer = setTimeout(function () {
      try { if (node.hidePopover) node.hidePopover(); } catch (e) {}
      node.textContent = "";
    }, 4200);
  }

  // Aviso grande, bem chamativo, que entra pela tela (usado quando uma ação é negada). \n quebra a linha.
  var alertTimer;
  function bigAlert(text) {
    var node = document.getElementById("big-alert");
    if (!node) {
      node = document.createElement("div");
      node.id = "big-alert";
      node.className = "big-alert";
      node.setAttribute("popover", "manual");
      node.setAttribute("role", "alert");
      node.addEventListener("click", function () { hide(); });
      document.body.appendChild(node);
    }
    function hide() {
      node.classList.remove("is-in");
      try { if (node.hidePopover && node.matches(":popover-open")) setTimeout(function () { node.hidePopover(); }, 260); } catch (e) {}
    }
    clearTimeout(alertTimer);
    node.textContent = "";
    String(text).split("\n").forEach(function (line, i) {
      var p = document.createElement(i === 0 ? "strong" : "span");
      p.textContent = line;
      node.appendChild(p);
    });
    try { if (node.showPopover && !node.matches(":popover-open")) node.showPopover(); } catch (e) {}
    node.classList.remove("is-in");
    void node.offsetWidth;
    node.classList.add("is-in");
    alertTimer = setTimeout(hide, 3600);
  }

  return { el: el, fmt: fmt, compact: compact, pl: pl, toast: toast, bigAlert: bigAlert };
})();
