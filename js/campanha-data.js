// Dragon Ball Omega — quem está na campanha (versão local)
// Regra: cada conta conectada registra UM personagem. Os dados públicos (nome, classe, raça,
// nível e foto) aparecem pra todos os jogadores, mas só o dono abre a ficha.
// Guardado no localStorage, na chave "dbo-campaign": { jogadores: [{ email, charId }] }.
// Quando o site tiver back-end, troque só read() e write() (e as buscas em players()).
window.DBOCampaign = (function () {
  var KEY = "dbo-campaign";

  function read() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      if (data && Array.isArray(data.jogadores)) return data;
    } catch (e) {}
    return { jogadores: [] };
  }
  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { throw new Error("Não deu pra salvar a campanha neste navegador."); }
  }
  function user() { return DBOAuth.current(); }

  var local = {
    user: user,

    // Todos os jogadores registrados: [{ email, mine, char }]. Ignora registros de personagens que já não existem.
    players: function () {
      var me = user();
      return read().jogadores.map(function (e) {
        var char = DBOCharacters.ofOwner(e.email).filter(function (c) { return c.id === e.charId; })[0];
        return { email: e.email, mine: !!me && me.email === e.email, char: char || null };
      }).filter(function (p) { return p.char; });
    },

    // O registro do jogador conectado, ou null.
    mine: function () {
      return api.players().filter(function (p) { return p.mine; })[0] || null;
    },

    // Registra um personagem do jogador conectado. Só um por conta.
    join: function (charId) {
      var me = user();
      if (!me) throw new Error("Entre na sua conta pra participar da campanha.");
      var data = read();
      if (data.jogadores.some(function (e) { return e.email === me.email; })) throw new Error("Você já tem um personagem na campanha.");
      var own = DBOCharacters.ofOwner(me.email).filter(function (c) { return c.id === charId; })[0];
      if (!own) throw new Error("Esse personagem não é seu.");
      data.jogadores.push({ email: me.email, charId: charId });
      write(data);
    },

    leave: function () {
      var me = user();
      if (!me) return;
      var data = read();
      data.jogadores = data.jogadores.filter(function (e) { return e.email !== me.email; });
      write(data);
    }
  };
  var api = local;

  /* =====================================================================
     MODO SUPABASE: "estar na campanha" = personagens.na_campanha = true (no máximo um por conta).
     A lista pública vem da view jogadores_publico (só nome, classe, raça, nível, foto e dono).
     ===================================================================== */
  if (typeof DBOAuth !== "undefined" && DBOAuth.mode === "supabase") {
    var rows = [], readyPromise = null, readyFor = null;
    var load = async function () {
      if (!window.DBOApi || !DBOApi.enabled) throw new Error("O arquivo js/banco.js não foi carregado. Atualize a página sem cache (Ctrl+Shift+R).");
      rows = user() && user().confirmed ? await DBOApi.select("jogadores_publico", { order: "nome.asc" }) : [];
    };
    api = {
      user: user,
      ready: function () {
        var who = (user() || {}).id || "";
        if (readyPromise && readyFor !== who) readyPromise = null;
        if (!readyPromise) {
          readyFor = who;
          readyPromise = DBOCharacters.ready().then(load);
          readyPromise.catch(function () { readyPromise = null; });
        }
        return readyPromise;
      },
      reload: function () { return load(); },
      players: function () {
        var me = DBOAuth.userId();
        return rows.map(function (r) {
          var mine = !!me && r.dono_id === me;
          var full = mine ? DBOCharacters.list().filter(function (c) { return c.id === r.id; })[0] : null;
          return { email: "", mine: mine, char: full || { id: r.id, nome: r.nome, classe: r.classe, raca: r.raca, nivel: r.nivel, foto: r.foto_url || "" } };
        });
      },
      mine: function () { return api.players().filter(function (p) { return p.mine; })[0] || null; },
      join: async function (charId) {
        if (!user()) throw new Error("Entre na sua conta pra participar da campanha.");
        if (api.mine()) throw new Error("Você já tem um personagem na campanha.");
        try { await DBOApi.patch("personagens", { id: "eq." + charId }, { na_campanha: true }); }
        catch (e) { throw new Error(e.code === "23505" ? "Você já tem um personagem na campanha." : e.message); }
        await load();
      },
      leave: async function () {
        var m = api.mine();
        if (!m) return;
        await DBOApi.patch("personagens", { id: "eq." + m.char.id }, { na_campanha: false });
        await load();
      }
    };
  } else {
    local.ready = function () { return DBOCharacters.ready(); };
    local.reload = function () { return Promise.resolve(); };
  }
  return api;
})();
