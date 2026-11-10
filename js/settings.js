// Dragon Ball Omega — página de Configurações
(function () {
  // Feedback: enviado pelo FormSubmit (serviço que repassa o formulário por e-mail).
  // Na primeira vez, o FormSubmit manda um e-mail de ativação para o endereço abaixo.
  var FEEDBACK_EMAIL = "dragonomegasuporte@gmail.com";
  var FEEDBACK_URL = "https://formsubmit.co/ajax/" + FEEDBACK_EMAIL;
  var COOLDOWN_MS = 60 * 60 * 1000; // um feedback por hora
  var LAST_KEY = "dbo-feedback-last";

  var $ = function (id) { return document.getElementById(id); };

  function setMsg(el, text, type) {
    el.textContent = text || "";
    el.className = "msg" + (type ? " msg--" + type : "");
  }

  /* ---------- Aparência ---------- */
  var darkSwitch = $("dark-switch");
  darkSwitch.checked = DBOTheme.get() === "dark";
  darkSwitch.addEventListener("change", function () {
    DBOTheme.set(darkSwitch.checked ? "dark" : "light");
  });

  var motionSwitch = $("motion-switch");
  motionSwitch.checked = DBOTheme.motionOff();
  motionSwitch.addEventListener("change", function () {
    DBOTheme.setMotionOff(motionSwitch.checked);
  });

  var logoSwitch = $("logo-switch");
  logoSwitch.checked = DBOTheme.logoHidden();
  logoSwitch.addEventListener("change", function () {
    DBOTheme.setLogoHidden(logoSwitch.checked);
    location.reload();   // recarrega só para a fonte do modelo de ficha ser carregada
  });

  // Prato de dados: "dbo-prato" = "off" (sem prato) | "2d" | "3d" (padrão). Lido por js/prato.js.
  // Seletor de 3 opções: a bolinha desliza até a opção escolhida (css/settings.css, .seg).
  var pratoSeg = $("prato-modo"), pratoOps = Array.prototype.slice.call(pratoSeg.querySelectorAll(".seg__op"));
  function pratoModo() { var m; try { m = localStorage.getItem("dbo-prato"); } catch (e) {} return m === "off" || m === "2d" ? m : "3d"; }
  function marcarPrato(v, foco) {
    pratoSeg.setAttribute("data-on", v);
    pratoOps.forEach(function (b) {
      var on = b.getAttribute("data-v") === v;
      b.setAttribute("aria-checked", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      if (on && foco) b.focus();
    });
  }
  marcarPrato(pratoModo());
  pratoOps.forEach(function (b, i) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-v");
      try { localStorage.setItem("dbo-prato", v); } catch (e) { /* sem armazenamento: não persiste */ }
      marcarPrato(v);
    });
    b.addEventListener("keydown", function (e) {   // setas trocam de opção, como num grupo de rádio
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var alvo = pratoOps[(i + d + pratoOps.length) % pratoOps.length]; alvo.click(); alvo.focus();
    });
  });

  /* ---------- Conta ---------- */
  var account = DBOAccountUI.bind({
    tabs: { login: $("tab-login"), register: $("tab-register") },
    forms: { login: $("form-login"), register: $("form-register") },
    msg: $("account-msg"),
    onChange: function () { renderAccount(); if (window.DBOPrefetch) DBOPrefetch(); }
  });

  // Mostra o perfil (foto e e-mail) quando já está conectado.
  function renderAccount() {
    var user = DBOAuth.current();
    $("account-out").hidden = !!user;
    $("account-in").hidden = !user;
    if (!user) return;

    $("profile-mail").textContent = user.email;
    var nickEl = $("profile-nick");
    nickEl.textContent = user.nick || "Sem nick. Altere para colocar um";
    nickEl.classList.toggle("profile__nick--none", !user.nick);
    $("nick-warn").hidden = !!user.nick;
    $("nick-input").value = user.nick || "";
    var avatar = $("avatar");
    avatar.textContent = "";
    if (user.photo) {
      var img = document.createElement("img");
      img.src = user.photo;
      img.alt = "Sua foto de perfil";
      avatar.appendChild(img);
    } else {
      avatar.textContent = user.email.charAt(0).toUpperCase();
    }
  }

  // Sair da conta pede confirmação.
  var logoutDlg = $("logout-dialog");
  $("logout").addEventListener("click", function () { logoutDlg.showModal(); });
  $("logout-stay").addEventListener("click", function () { logoutDlg.close(); });
  $("logout-go").addEventListener("click", function () {
    logoutDlg.close();
    DBOAuth.logout();
    account.showTab("login");
    renderAccount();
  });

  // Trocar o nome de exibição.
  $("form-nick").addEventListener("submit", async function (event) {
    event.preventDefault();
    var msgEl = $("nick-msg"), btn = event.target.querySelector("button[type=submit]");
    btn.disabled = true;
    setMsg(msgEl, "");
    try {
      await DBOAuth.setNick($("nick-input").value);
      renderAccount();
      setMsg(msgEl, "Nome de exibição salvo!", "ok");
    } catch (err) { setMsg(msgEl, err.message, "error"); }
    btn.disabled = false;
  });

  /* ---------- Feedback (um por hora) ---------- */
  var feedbackForm = $("form-feedback");
  var feedbackText = $("feedback-text");
  var feedbackButton = feedbackForm.querySelector("button[type=submit]");
  var feedbackMsg = $("feedback-msg");
  var feedbackWait = $("feedback-wait");

  function lastSent() {
    try { return Number(localStorage.getItem(LAST_KEY)) || 0; } catch (e) { return 0; }
  }

  // Mostra o aviso de espera e trava o botão. Retorna true se ainda estiver esperando.
  function updateCooldown() {
    var left = COOLDOWN_MS - (Date.now() - lastSent());
    var cooling = left > 0;
    feedbackButton.disabled = cooling;
    feedbackWait.hidden = !cooling;
    if (cooling) {
      feedbackWait.textContent = "Você acabou de mandar um feedback. Dá pra mandar outro em " + Math.ceil(left / 60000) + " min.";
    }
    return cooling;
  }

  feedbackForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (updateCooldown()) return;

    var message = feedbackText.value.trim();
    if (!message) {
      setMsg(feedbackMsg, "Escreve alguma coisa antes de enviar.", "error");
      return;
    }

    feedbackButton.disabled = true;
    setMsg(feedbackMsg, "Enviando…");

    var payload = { message: message, _subject: "Feedback do Dragon Ball Omega", _captcha: "false" };
    var user = DBOAuth.current();
    if (user) payload.email = user.email; // vai como e-mail de resposta

    try {
      var response = await fetch(FEEDBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      var result = {};
      try { result = await response.json(); } catch (e) {}
      if (!response.ok || String(result.success) !== "true") {
        var why = String(result.message || "");
        if (/activat|activation/i.test(why)) throw new Error("O e-mail de suporte ainda não foi ativado no FormSubmit. Abra o e-mail de ativação que chegou em " + FEEDBACK_EMAIL + " (olhe o spam) e clique no botão de ativar. Depois é só enviar de novo.");
        throw new Error(why || "o FormSubmit recusou o envio");
      }

      try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (e) {}
      feedbackText.value = "";
      setMsg(feedbackMsg, "Valeu! Seu feedback foi enviado.", "ok");
    } catch (err) {
      var network = err instanceof TypeError; // fetch falhou: sem internet ou bloqueado
      setMsg(feedbackMsg, network ? "Não consegui falar com o serviço de envio. Confere a internet e tenta de novo." : err.message, "error");
    }
    updateCooldown();
  });

  /* ---------- Início ---------- */
  renderAccount();
  updateCooldown();
  setInterval(updateCooldown, 15000);
})();
