// Dragon Ball Omega — papéis (mestre x jogador).
// Modo local (teste): vale a lista "mestresLocais" do js/supabase-config.js (fora do repositório), e isso só
// esconde botões na tela.
// Modo Supabase: o papel vem da coluna perfis.papel ("jogador", "mestre" ou "admin"), e a trava de verdade
// é a RLS do banco. Para promover alguém: update perfis set papel = 'mestre' where email = '...';
window.DBORoles = (function () {
  function mestresLocais() {
    var l = window.DBO_SUPABASE && DBO_SUPABASE.mestresLocais;
    return Array.isArray(l) ? l.map(function (e) { return String(e).toLowerCase(); }) : [];
  }
  var KEY = "dbo-papel"; // guarda { email, papel } da última consulta ao banco

  // (registrado aqui em cima porque o fim da função é um return)
  // Ao abrir a página: mostra o que é do mestre com o papel guardado e, no modo Supabase, confere de novo no banco.
  function inicio() { linkDebug(); if (remote() && window.DBORoles) DBORoles.refresh().catch(function () {}); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicio); else setTimeout(inicio, 0);
  function remote() { return !!window.DBOAuth && DBOAuth.mode === "supabase"; }
  function cached() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  return {
    isMaster: function () {
      var u = window.DBOAuth && DBOAuth.current();
      if (!u) return false;
      if (remote()) {
        var c = cached();
        return !!c && c.email === u.email && (c.papel === "mestre" || c.papel === "admin");
      }
      return mestresLocais().indexOf(String(u.email).toLowerCase()) !== -1;
    },
    // Consulta o papel no banco (modo Supabase). Chame antes de desenhar a página.
    refresh: async function () {
      var u = window.DBOAuth && DBOAuth.current();
      if (!remote() || !u || !u.confirmed || !window.DBOApi) return;
      try {
        var rows = await DBOApi.select("perfis", { select: "papel", id: "eq." + u.id });
        localStorage.setItem(KEY, JSON.stringify({ email: u.email, papel: rows && rows[0] ? rows[0].papel : "jogador" }));
      } catch (e) {}
      linkDebug();
    },
    local: local
  };

  // Modo debug (debug.html): roda só no computador do mestre. O link aparece no cabeçalho só para o mestre e só em localhost.
  function local() { return location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname); }
  function linkDebug() {
    // Partes da página que só o mestre vê (ex.: Mapas e NPCs na Campanha).
    var mestre = !!window.DBORoles && DBORoles.isMaster();
    document.querySelectorAll("[data-so-mestre]").forEach(function (n) { n.hidden = !mestre; });
    document.querySelectorAll("[data-nao-mestre]").forEach(function (n) { n.hidden = mestre; });
    if (!local() || !mestre) return;
    var ul = document.querySelector(".site-header .nav");
    if (!ul || ul.querySelector(".nav__debug")) return;
    var li = document.createElement("li"), a = document.createElement("a");
    a.className = "nav__debug";
    a.href = (/\/(campanha|enciclopedia)\/[^/]*$/.test(location.pathname) ? "../" : "") + "debug.html";
    a.textContent = "Modo debug";
    if (/debug\.html$/.test(location.pathname)) a.setAttribute("aria-current", "page");
    li.appendChild(a); ul.appendChild(li);
  }
})();
