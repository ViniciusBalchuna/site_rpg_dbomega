// Dragon Ball Omega — formulários de entrar e criar conta
// Usado na página de Configurações e no pop-up da página Personagens.
// Uso: DBOAccountUI.bind({ tabs, forms, msg, onChange }) -> { showTab }
window.DBOAccountUI = (function () {
  function toWebp(c, q) { // WebP (menor); JPEG se o navegador não souber. Nunca passa de 500 KB (limite do banco): baixa a qualidade até caber.
    function enc(qq) { var u = c.toDataURL("image/webp", qq); return u.indexOf("data:image/webp") === 0 ? u : c.toDataURL("image/jpeg", qq); }
    var u = enc(q); while (u.length > 680000 && q > 0.3) { q -= 0.1; u = enc(q); }
    return u;
  } // WebP (menor); se o navegador não souber, cai pro JPEG
  // Recorta a foto em quadrado e reduz (160px por padrão), para caber no armazenamento.
  function readPhoto(file, size) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.size) return resolve("");
      if (!/^image\//.test(file.type)) return reject(new Error("Escolha um arquivo de imagem."));
      var fail = function () { reject(new Error("Não deu pra ler essa foto.")); };
      var reader = new FileReader();
      reader.onerror = fail;
      reader.onload = function () {
        var img = new Image();
        img.onerror = fail;
        img.onload = function () {
          size = size || 160;
          var side = Math.min(img.width, img.height);
          var canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
          resolve(toWebp(canvas, 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function bind(opts) {
    var tabs = opts.tabs, forms = opts.forms, msg = opts.msg;

    function setMsg(text, ok) {
      msg.textContent = text || "";
      msg.className = "msg" + (text ? (ok ? " msg--ok" : " msg--error") : "");
    }

    // Botão "Reenviar e-mail de confirmação", logo abaixo da mensagem.
    var resendBtn = null;
    function hideResend() { if (resendBtn) { resendBtn.remove(); resendBtn = null; } }
    function showResend(email) {
      hideResend();
      resendBtn = document.createElement("button");
      resendBtn.type = "button";
      resendBtn.className = "btn btn--ghost";
      resendBtn.textContent = "Reenviar e-mail de confirmação";
      resendBtn.addEventListener("click", async function () {
        resendBtn.disabled = true;
        try {
          await DBOAuth.resend(email);
          setMsg("Pronto, mandamos outro e-mail para " + email + ". Confere a caixa de entrada e o spam.", true);
          hideResend();
        } catch (err) { setMsg(err.message); resendBtn.disabled = false; }
      });
      msg.after(resendBtn);
    }

    function showTab(name) {
      hideResend();
      Object.keys(tabs).forEach(function (key) {
        var active = key === name;
        tabs[key].setAttribute("aria-selected", String(active));
        tabs[key].tabIndex = active ? 0 : -1;
        forms[key].hidden = !active;
      });
      if (tabs.login.parentNode) tabs.login.parentNode.setAttribute("data-on", name); // destaque deslizante (css/mare.css)
      setMsg("");
    }
    tabs.login.addEventListener("click", function () { showTab("login"); });
    tabs.register.addEventListener("click", function () { showTab("register"); });

    function handleSubmit(form, action) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        var button = form.querySelector("button[type=submit]");
        button.disabled = true;
        setMsg("");
        try {
          var result = await action(new FormData(form));
          form.reset();
          if (result && result.pending) { // falta confirmar o e-mail: ainda não está conectado
            showTab("login");
            setMsg("Quase lá! Enviamos um e-mail para " + result.email + ". Clica no link da mensagem (olha o spam também) para confirmar a conta. Só depois disso dá pra entrar e criar personagem.", true);
            return;
          }
          if (opts.onChange) opts.onChange(); // a conta mudou (entrou ou criou)
        } catch (err) {
          setMsg(err.message);
        } finally {
          button.disabled = false;
        }
      });
    }

    handleSubmit(forms.login, function (data) {
      return DBOAuth.login({ email: data.get("email"), password: data.get("password") }).catch(function (err) {
        if (DBOAuth.mode === "supabase" && /confirmou o e-mail/.test(err.message)) {
          var email = String(data.get("email") || "");
          showResend(email);
        }
        throw err;
      });
    });
    handleSubmit(forms.register, async function (data) {
      var nick = String(data.get("nick") || "").trim();
      if (!nick) throw new Error("Escolha um nome de exibição.");
      if (nick.length > 30) throw new Error("O nome de exibição pode ter até 30 letras.");
      if (data.get("password") !== data.get("confirm")) throw new Error("As senhas não são iguais.");
      return DBOAuth.register({ email: data.get("email"), password: data.get("password"), nick: nick });
    });

    // "Conectar com o Google": leva para o Google e volta já conectado.
    document.querySelectorAll("[data-google]").forEach(function (b) {
      b.addEventListener("click", function () {
        try { DBOAuth.google(); } catch (err) { setMsg(err.message); }
      });
    });

    showTab("login");
    return { showTab: showTab };
  }

  return { bind: bind, readPhoto: readPhoto };
})();
