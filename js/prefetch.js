// Dragon Ball Omega — pré-carregamento dos personagens e dos cartazes das missões.
// Quando a pessoa já está conectada (ou acabou de conectar), busca a lista no banco em segundo plano
// e guarda uma cópia neste aparelho. Assim a página Personagens abre na hora.
// Precisa de: supabase-config.js, auth.js, banco.js, papeis.js e characters.js carregados antes.
(function () {
  function go() {
    try {
      var u = window.DBOAuth && DBOAuth.mode === "supabase" && DBOAuth.current();
      if (u && u.confirmed && window.DBOCharacters) { DBOCharacters.ready().catch(function () {}); if (window.DBOEnc && DBOEnc.ready) Promise.resolve(DBOEnc.ready()).catch(function () {}); }
    } catch (e) {}
  }
  window.DBOPrefetch = go;
  setTimeout(go, 50);
})();
