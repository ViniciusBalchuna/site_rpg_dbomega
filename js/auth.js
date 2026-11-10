// Dragon Ball Omega — contas (versão local)
//
// ATENÇÃO: esta versão guarda as contas no localStorage, ou seja, só neste navegador.
// As senhas são salvas com hash (PBKDF2), mas isso NÃO substitui um servidor de verdade.
// Quando o site tiver um back-end (Firebase, Supabase etc.), troque só as quatro funções
// abaixo (register, login, logout, current) e o resto do site continua funcionando igual.
window.DBOAuth = (function () {
  var USERS_KEY = "dbo-users";
  var SESSION_KEY = "dbo-session";

  // MODO SUPABASE: se js/supabase-config.js tiver url e key, o cadastro manda um e-mail de confirmação
  // e só quem confirmou consegue entrar. Sem config, vale o modo local (teste): as contas ficam
  // neste navegador, sem e-mail, e já nascem confirmadas.
  var CFG = window.DBO_SUPABASE || {};
  var remote = !!(CFG.url && CFG.key);
  // Aceita a URL com ou sem "/rest/v1/" no fim e sem barra final: usamos só o endereço-base do projeto.
  var BASE = String(CFG.url || "").trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "").replace(/\/+$/, "");
  var SB_KEY = "dbo-sb-session"; // { email, confirmed, access, refresh }

  function jwtClaim(token, name) {
    try {
      var part = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(part))))[name];
    } catch (e) { return undefined; }
  }
  function sbSession() {
    try { return JSON.parse(localStorage.getItem(SB_KEY)); } catch (e) { return null; }
  }
  async function sb(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json", apikey: CFG.key };
    if (options.token) headers.Authorization = "Bearer " + options.token;
    var res;
    try {
      res = await fetch(BASE + "/auth/v1" + path, { method: options.method || "POST", headers: headers, body: options.body ? JSON.stringify(options.body) : undefined });
    } catch (e) { throw new Error("Não consegui falar com o servidor. Confere a internet e tenta de novo."); }
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      var code = data.error_code || data.code || "";
      var err = new Error(friendly(code, data));
      err.code = code;
      throw err;
    }
    return data;
  }
  function friendly(code, data) {
    var map = {
      email_not_confirmed: "Você ainda não confirmou o e-mail. Abre a mensagem que enviamos (olha o spam também) e clica no link.",
      invalid_credentials: "E-mail ou senha incorretos.",
      user_already_exists: "Esse e-mail já tem conta. Que tal entrar?",
      weak_password: "Essa senha é fraca demais. Use pelo menos 8 caracteres.",
      over_email_send_rate_limit: "Muitos e-mails em pouco tempo. Espera um pouquinho e tenta de novo.",
      email_address_invalid: "Esse e-mail não parece certo."
    };
    return map[code] || (data && (data.msg || data.error_description)) || "Algo deu errado. Tenta de novo.";
  }
  function saveSb(data) {
    var u = data.user || {};
    try {
      var meta = u.user_metadata || {};
      var prev = sbSession() || {};
      localStorage.setItem(SB_KEY, JSON.stringify({
        id: u.id || jwtClaim(data.access_token, "sub"), email: String(u.email || "").toLowerCase(), confirmed: !!u.email_confirmed_at,
        access: data.access_token, refresh: data.refresh_token,
        nick: meta.nome_exibicao || meta.full_name || meta.name || (u.id ? "" : prev.nick) || "",   // nome de exibição
        photo: meta.avatar_url || meta.picture || (u.id ? "" : prev.photo) || ""                    // foto: a do Google
      }));
    } catch (e) {}
  }
  // Volta do link do e-mail: o Supabase abre o site com #access_token=...&type=signup
  (function readConfirmationLink() {
    if (!remote || location.hash.indexOf("access_token=") === -1) return;
    var q = new URLSearchParams(location.hash.slice(1));
    var token = q.get("access_token");
    if (!token) return;
    sb("/user", { method: "GET", token: token }).then(function (user) {
      saveSb({ user: user, access_token: token, refresh_token: q.get("refresh_token") });
      history.replaceState(null, "", location.pathname + location.search);
      try { sessionStorage.setItem("dbo-just-confirmed", "1"); } catch (e) {}
      location.reload();
    }).catch(function () {});
  })();

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    catch (e) { throw new Error("Não deu pra salvar a conta neste navegador. Tenta uma foto menor."); }
  }
  function setSession(email) {
    try { localStorage.setItem(SESSION_KEY, email); } catch (e) {}
  }
  function normalize(email) {
    return String(email || "").trim().toLowerCase();
  }

  function toBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
  }
  function requireCrypto() {
    if (!window.crypto || !crypto.subtle) {
      throw new Error("Seu navegador bloqueou a criptografia. Abra o site por https.");
    }
  }
  async function hashPassword(password, saltB64) {
    requireCrypto();
    var salt = Uint8Array.from(atob(saltB64), function (c) { return c.charCodeAt(0); });
    var key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    var bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, key, 256);
    return toBase64(bits);
  }

  return {
    // Cria a conta e já deixa a pessoa conectada.
    // Modo: "supabase" (com e-mail de confirmação) ou "local" (teste, sem e-mail).
    mode: remote ? "supabase" : "local",

    // Usados pela camada de banco (js/banco.js). No modo local não existem.
    base: BASE,
    key: CFG.key || "",
    userId: function () {
      var s = remote ? sbSession() : null;
      return s ? (s.id || jwtClaim(s.access, "sub") || null) : null;
    },
    // Token de acesso válido (renova sozinho quando está para vencer).
    token: async function () {
      var s = sbSession();
      if (!s || !s.access) throw new Error("Você precisa entrar na conta.");
      var exp = Number(jwtClaim(s.access, "exp")) || 0;
      if (exp - Date.now() / 1000 > 60) return s.access;
      if (!s.refresh) throw new Error("Sua sessão expirou. Entre de novo.");
      try {
        var out = await sb("/token?grant_type=refresh_token", { body: { refresh_token: s.refresh } });
        saveSb(out);
        return out.access_token;
      } catch (e) {
        try { localStorage.removeItem(SB_KEY); } catch (x) {}
        throw new Error("Sua sessão expirou. Entre de novo.");
      }
    },

    // Reenvia o e-mail de confirmação (só no modo Supabase).
    resend: async function (emailRaw) {
      if (!remote) return;
      await sb("/resend", { body: { type: "signup", email: normalize(emailRaw) } });
    },

    register: async function (data) {
      if (remote) {
        var em = normalize(data.email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error("Esse e-mail não parece certo.");
        if (!data.password || data.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        var nick = String(data.nick || "").trim();
        if (!nick) throw new Error("Escolha um nome de exibição.");
        await sb("/signup?redirect_to=" + encodeURIComponent(location.origin + "/personagens.html"), { body: { email: em, password: data.password, data: { nome_exibicao: nick } } });
        // Com "Confirm email" ligado no Supabase, não vem sessão: a pessoa precisa clicar no link.
        return { pending: true, email: em };
      }
      var email = normalize(data.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Esse e-mail não parece certo.");
      if (!data.password || data.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
      if (!String(data.nick || "").trim()) throw new Error("Escolha um nome de exibição.");
      var users = loadUsers();
      if (users[email]) throw new Error("Esse e-mail já tem conta. Que tal entrar?");
      requireCrypto();
      var salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
      users[email] = { salt: salt, hash: await hashPassword(data.password, salt), photo: "", nick: String(data.nick).trim() };
      saveUsers(users);
      setSession(email);
    },

    // Confere e-mail e senha e conecta.
    login: async function (data) {
      if (remote) {
        var out = await sb("/token?grant_type=password", { body: { email: normalize(data.email), password: data.password } });
        if (!out.user || !out.user.email_confirmed_at) throw new Error(friendly("email_not_confirmed"));
        saveSb(out);
        return;
      }
      var email = normalize(data.email);
      var user = loadUsers()[email];
      var fail = new Error("E-mail ou senha incorretos.");
      if (!user) throw fail;
      if ((await hashPassword(data.password || "", user.salt)) !== user.hash) throw fail;
      setSession(email);
    },

    // Entrar com o Google (só no modo Supabase, com o provider Google ligado no painel).
    // A volta do Google cai em readConfirmationLink (acima), que guarda a sessão.
    google: function () {
      if (!remote) throw new Error("O login com o Google só funciona com o banco de dados conectado.");
      location.href = BASE + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(location.origin + "/personagens.html");
    },

    // Troca o nome de exibição (vazio não vale).
    setNick: async function (nickRaw) {
      var nick = String(nickRaw || "").trim();
      if (!nick) throw new Error("Escreva um nome de exibição.");
      if (nick.length > 30) throw new Error("O nome de exibição pode ter até 30 letras.");
      if (remote) {
        var tok = await this.token(), sess = sbSession() || {};
        await sb("/user", { method: "PUT", token: tok, body: { data: { nome_exibicao: nick } } });
        try {
          await fetch(BASE + "/rest/v1/perfis?id=eq." + sess.id, { method: "PATCH", headers: { apikey: CFG.key, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify({ nome: nick }) });
        } catch (e) {}
        sess.nick = nick;
        try { localStorage.setItem(SB_KEY, JSON.stringify(sess)); } catch (e) {}
        return;
      }
      var users = loadUsers(), email = localStorage.getItem(SESSION_KEY);
      if (!email || !users[email]) throw new Error("Entre na conta primeiro.");
      users[email].nick = nick;
      saveUsers(users);
    },

    logout: function () {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("dbo-roster:") === 0) localStorage.removeItem(k); }); } catch (e) {}
      if (remote) { try { localStorage.removeItem(SB_KEY); } catch (e) {} return; }
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    },

    // Retorna { email, photo, confirmed } da pessoa conectada, ou null.
    // Só quem tem e-mail confirmado pode criar personagem.
    current: function () {
      if (remote) {
        var s = sbSession();
        return s && s.email ? { email: s.email, photo: s.photo || "", nick: s.nick || "", confirmed: !!s.confirmed, id: s.id || jwtClaim(s.access, "sub") } : null;
      }
      try {
        var email = localStorage.getItem(SESSION_KEY);
        var user = email && loadUsers()[email];
        return user ? { email: email, photo: user.photo, nick: user.nick || "", confirmed: true } : null;
      } catch (e) { return null; }
    }
  };
})();
