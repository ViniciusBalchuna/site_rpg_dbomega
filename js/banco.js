// Dragon Ball Omega — acesso ao banco (Supabase / PostgREST), sem biblioteca.
// Só existe quando js/supabase-config.js está preenchido. Toda chamada leva o token da pessoa conectada,
// então quem manda é a RLS do banco (a chave pública sozinha não dá acesso a nada).
window.DBOApi = (function () {
  var enabled = !!(window.DBOAuth && DBOAuth.base && DBOAuth.key);

  function friendly(status, body) {
    var msg = body && (body.message || body.msg || body.error_description);
    if (status === 401) return "Sua sessão expirou. Entre de novo.";
    if (body && body.code === "42501") return "Você não tem permissão para fazer isso.";
    if (body && body.code === "23505") return "Isso já existe.";
    if (body && body.code === "P0001" && msg) return msg; // erros escritos por nós no SQL (ex.: feedback 1 por hora)
    return msg || "O servidor recusou o pedido (código " + status + ").";
  }

  async function call(method, path, opts) {
    opts = opts || {};
    var token = await DBOAuth.token();
    var headers = { apikey: DBOAuth.key, Authorization: "Bearer " + token };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.prefer) headers.Prefer = opts.prefer;
    var res;
    try {
      res = await fetch(DBOAuth.base + "/rest/v1/" + path, { method: method, headers: headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
    } catch (e) { throw new Error("Não consegui falar com o servidor. Confere a internet e tenta de novo."); }
    var data = null, text = "";
    try { text = await res.text(); data = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) { var err = new Error(friendly(res.status, data)); err.status = res.status; err.code = data && data.code; throw err; }
    return data;
  }
  function q(params) {
    var parts = [];
    Object.keys(params || {}).forEach(function (k) { parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k])); });
    return parts.length ? "?" + parts.join("&") : "";
  }
  // Monta "in.(a,b,c)" para filtros por lista de ids.
  function list(ids) { return "in.(" + ids.join(",") + ")"; }

  return {
    enabled: enabled,
    list: list,
    select: function (table, params) { return call("GET", table + q(Object.assign({ select: "*" }, params))); },
    // semVolta: não pede a linha gravada de volta. Necessário quando quem grava não pode LER a linha
    // (ex.: rolagem do jogador no log, que só o mestre lê): com a volta, a RLS recusa o insert inteiro.
    insert: function (table, rows, semVolta) { return call("POST", table + q({}), { body: rows, prefer: semVolta ? "return=minimal" : "return=representation" }); },
    // Insere ou atualiza pela chave primária (on conflict do update).
    upsert: function (table, rows) { return call("POST", table + q({}), { body: rows, prefer: "resolution=merge-duplicates,return=representation" }); },
    patch: function (table, filter, body) { return call("PATCH", table + q(filter), { body: body, prefer: "return=representation" }); },
    remove: function (table, filter) { return call("DELETE", table + q(filter)); },
    rpc: function (name, args) { return call("POST", "rpc/" + name, { body: args || {} }); }
  };
})();
