// Dragon Ball Omega — combate em andamento (versão local)
// Guarda a rodada e a ordem de iniciativa no localStorage, na chave "dbo-combat":
//   { rodada, ordem: [{ id, nome, iniciativa, tipo: "jogador" | "npc" }] }
// Por enquanto qualquer pessoa pode mexer. Quando houver contas e permissões no back-end,
// limite "próxima rodada", "encerrar" e a remoção de NPCs ao mestre.
window.DBOCombat = (function () {
  var KEY = "dbo-combat";

  function read() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.ordem)) return { rodada: Math.max(1, Number(d.rodada) || 1), ordem: d.ordem, vez: d.vez || null, id: d.id || "local" };
    } catch (e) {}
    return { rodada: 1, ordem: [], vez: null, id: "local" };
  }
  function write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); }
    catch (e) { throw new Error("Não deu pra salvar o combate neste navegador."); }
  }

  var local = {
    rodada: function () { return read().rodada; },

    // Maior iniciativa primeiro. Empate: quem entrou antes.
    ordem: function () {
      return read().ordem
        .map(function (e, i) { return { e: e, i: i }; })
        .sort(function (a, b) { return (b.e.iniciativa - a.e.iniciativa) || (a.i - b.i); })
        .map(function (x) { return x.e; });
    },

    // Cada jogador tem uma única entrada: rolar de novo substitui a anterior.
    setPlayer: function (char, iniciativa) {
      var me = DBOAuth.current(), email = me ? me.email : "", nome = char.nome;
      var d = read(), id = "p:" + email, found = false;
      d.ordem.forEach(function (e) { if (e.id === id) { e.nome = nome; e.iniciativa = iniciativa; found = true; } });
      if (!found) d.ordem.push({ id: id, nome: nome, iniciativa: iniciativa, tipo: "jogador" });
      write(d);
    },
    addNpc: function (nome, iniciativa) {
      var d = read();
      d.ordem.push({ id: "n" + Date.now().toString(36) + Math.floor(Math.random() * 1000), nome: nome, iniciativa: iniciativa, tipo: "npc" });
      write(d);
    },
    // Mudar a iniciativa de quem já está no combate (clicando nela na ordem).
    setIniciativa: function (id, valor) {
      var d = read();
      d.ordem.forEach(function (e) { if (e.id === id) e.iniciativa = valor; });
      write(d);
    },
    remove: function (id) {
      var d = read();
      d.ordem = d.ordem.filter(function (e) { return e.id !== id; });
      write(d);
    },
    // Próxima rodada: a vez volta para o primeiro da ordem.
    nextRound: function () { var d = read(), o = local.ordem(); d.rodada += 1; d.vez = o.length ? o[0].id : null; write(d); },
    reset: function () { write({ rodada: 1, ordem: [], vez: null, id: "c" + Date.now().toString(36) }); },
    // De quem é a vez (id na ordem de iniciativa) e o combate (para saber se a vez mudou).
    vez: function () { return read().vez; },
    combateId: function () { return read().id; },
    // Passar turno: a vez vai para o próximo da ordem; depois do último, volta ao primeiro e a rodada sobe.
    passarTurno: function () {
      var d = read(), o = local.ordem();
      if (!o.length) throw new Error("Ninguém entrou no combate ainda.");
      var i = o.map(function (e) { return e.id; }).indexOf(d.vez);
      if (i < 0) d.vez = o[0].id;
      else if (i >= o.length - 1) { d.vez = o[0].id; d.rodada += 1; }
      else d.vez = o[i + 1].id;
      write(d);
    },
    podePassar: function () { return true; },
    // Perguntas de interface (no modo local qualquer um pode tudo).
    ready: function () { return Promise.resolve(); },
    active: function () { return true; },
    combateId: function () { return read().id; },
    canManage: function () { return true; },
    isMine: function (e) { var me = DBOAuth.current(); return !!me && e.id === "p:" + me.email; },
    start: function () { return Promise.resolve(); },
    poll: function () { return Promise.resolve(); }
  };

  /* =====================================================================
     MODO SUPABASE: combate em andamento = linha de `combates` com ativo = true.
     Só o mestre inicia, passa a rodada, encerra e mexe em NPCs; cada jogador entra e rola a própria iniciativa.
     A tela atualiza sozinha (poll a cada poucos segundos).
     ===================================================================== */
  if (typeof DBOAuth === "undefined" || DBOAuth.mode !== "supabase") return local;

  var fight = null, rows = [];   // combate ativo e seus combatentes
  async function load() {
    if (!window.DBOApi || !DBOApi.enabled) throw new Error("O arquivo js/banco.js não foi carregado. Atualize a página sem cache (Ctrl+Shift+R).");
    var u = DBOAuth.current();
    if (!u || !u.confirmed) { fight = null; rows = []; return; }
    var f = await DBOApi.select("combates", { ativo: "eq.true", limit: 1 });
    fight = f[0] || null;
    rows = fight ? await DBOApi.select("combatentes", { combate_id: "eq." + fight.id, order: "id.asc" }) : [];
  }
  function mineIds() { return DBOCharacters.list().map(function (c) { return c.id; }); }
  function need() {
    if (!fight) throw new Error("Ainda não há combate em andamento. O mestre precisa iniciar um.");
  }
  // Enquanto uma ação está indo para o banco, a atualização automática espera (senão desfaria o que já aparece na tela).
  var emVoo = 0;
  function voo(p) { emVoo++; return Promise.resolve(p).then(function (v) { emVoo--; return v; }, function (e) { emVoo--; throw e; }); }
  var remote = {
    ready: load,
    poll: function () { return emVoo ? Promise.resolve() : load(); },
    active: function () { return !!fight; },
    canManage: function () { return DBORoles.isMaster(); },
    rodada: function () { return fight ? fight.rodada : 1; },
    vez: function () { return fight ? fight.vez || null : null; },
    combateId: function () { return fight ? fight.id : ""; },
    // As ações abaixo mudam a cópia local NA HORA (a tela já mostra o resultado) e depois vão para o banco.
    // Se o banco recusar, o próximo carregamento desfaz.
    // Passar turno: função do banco (migração 17). Mestre passa sempre; jogador, só quando a vez é dele.
    passarTurno: async function () {
      need();
      var o = remote.ordem();
      if (!o.length) throw new Error("Ninguém entrou no combate ainda.");
      var i = o.map(function (e) { return e.id; }).indexOf(fight.vez);
      if (i < 0) fight.vez = o[0].id;
      else if (i >= o.length - 1) { fight.vez = o[0].id; fight.rodada += 1; }
      else fight.vez = o[i + 1].id;
      try { await voo(DBOApi.rpc("passar_turno", { p_combate: fight.id })); } finally { await load(); }
    },
    podePassar: function () {
      if (DBORoles.isMaster()) return true;
      var v = fight && fight.vez, e = rows.filter(function (r) { return r.id === v; })[0];
      return !!e && e.tipo !== "npc" && mineIds().indexOf(e.personagem_id) !== -1;
    },
    ordem: function () {
      return rows.map(function (r, i) { return { e: { id: r.id, nome: r.nome, iniciativa: r.iniciativa, tipo: r.tipo === "npc" ? "npc" : "jogador", personagem_id: r.personagem_id, pendente: !!r.pendente }, i: i }; })
        .sort(function (a, b) { return (b.e.iniciativa - a.e.iniciativa) || (a.i - b.i); })
        .map(function (x) { return x.e; });
    },
    isMine: function (e) { return e.tipo !== "npc" && mineIds().indexOf(e.personagem_id) !== -1; },
    start: async function () {
      if (!DBORoles.isMaster()) throw new Error("Só o mestre inicia o combate.");
      if (!fight) { await DBOApi.insert("combates", [{}]); }
      await load();
    },
    setPlayer: async function (char, iniciativa) {
      need();
      var mine = rows.filter(function (r) { return r.personagem_id === char.id; })[0];
      if (mine) { mine.nome = char.nome; mine.iniciativa = iniciativa; }
      else rows.push({ id: "tmp-" + Date.now(), combate_id: fight.id, tipo: "jogador", personagem_id: char.id, nome: char.nome, iniciativa: iniciativa, pendente: true });
      try {
        if (mine && String(mine.id).indexOf("tmp-") !== 0) await voo(DBOApi.patch("combatentes", { id: "eq." + mine.id }, { nome: char.nome, iniciativa: iniciativa }));
        else await voo(DBOApi.insert("combatentes", [{ combate_id: fight.id, tipo: "jogador", personagem_id: char.id, nome: char.nome, iniciativa: iniciativa }]));
      } finally { await load(); }
    },
    addNpc: async function (nome, iniciativa) {
      if (!DBORoles.isMaster()) throw new Error("Só o mestre adiciona criaturas ao combate.");
      need();
      rows.push({ id: "tmp-" + Date.now(), combate_id: fight.id, tipo: "npc", nome: nome, iniciativa: iniciativa, pendente: true });
      try { await voo(DBOApi.insert("combatentes", [{ combate_id: fight.id, tipo: "npc", nome: nome, iniciativa: iniciativa }])); } finally { await load(); }
    },
    remove: async function (id) {
      rows = rows.filter(function (r) { return r.id !== id; });
      if (String(id).indexOf("tmp-") === 0) return;
      try { await voo(DBOApi.remove("combatentes", { id: "eq." + id })); } finally { await load(); }
    },
    // Mestre muda qualquer um; jogador, só o próprio personagem (a regra também está no banco: política cbt_upd).
    setIniciativa: async function (id, valor) {
      rows.forEach(function (r) { if (r.id === id) r.iniciativa = valor; });
      try { await voo(DBOApi.patch("combatentes", { id: "eq." + id }, { iniciativa: valor })); } finally { await load(); }
    },
    nextRound: async function () {
      if (!DBORoles.isMaster()) throw new Error("Só o mestre passa a rodada.");
      need();
      var o = remote.ordem();
      fight.rodada += 1; fight.vez = o.length ? o[0].id : null;
      try { await voo(DBOApi.patch("combates", { id: "eq." + fight.id }, { rodada: fight.rodada, vez: fight.vez && String(fight.vez).indexOf("tmp-") !== 0 ? fight.vez : null })); } finally { await load(); }
    },
    reset: async function () {
      if (!DBORoles.isMaster()) throw new Error("Só o mestre encerra o combate.");
      var f0 = fight;
      fight = null; rows = [];
      if (f0) { try { await voo(DBOApi.patch("combates", { id: "eq." + f0.id }, { ativo: false })); } finally { await load(); } }
    }
  };
  return remote;
})();
