// Dragon Ball Omega — dados da Enciclopédia (versão local, no localStorage "dbo-enc").
// Formato espelha as tabelas do banco (banco/schema.sql): pastas, itens e cartazes.
//   pastas:   { id, tipo: "bestiario"|"planetas", nome, pai: id|null }
//   itens:    { id, tipo, pasta, dados: { campo: valor } }
//   cartazes: { id, secao: "patrulha"|"anonima", alvo, recompensa, descricao, localizacao, dono }
// Quando o back-end existir, troque só read() e write().
window.DBOEnc = (function () {
  function toWebp(c, q) { // WebP (menor); JPEG se o navegador não souber. Nunca passa de 500 KB (limite do banco): baixa a qualidade até caber.
    function enc(qq) { var u = c.toDataURL("image/webp", qq); return u.indexOf("data:image/webp") === 0 ? u : c.toDataURL("image/jpeg", qq); }
    var u = enc(q); while (u.length > 680000 && q > 0.3) { q -= 0.1; u = enc(q); }
    return u;
  } // WebP (menor); se o navegador não souber, cai pro JPEG
  var KEY = "dbo-enc";

  function seed() {
    return {
      pastas: [
        { id: "b-racas", tipo: "bestiario", nome: "Raças", pai: null },
        { id: "b-misticos", tipo: "bestiario", nome: "Seres místicos", pai: null },
        { id: "b-demonios", tipo: "bestiario", nome: "Bestas Demoníacas", pai: null },
        { id: "b-universais", tipo: "bestiario", nome: "Ameaças universais", pai: null },
        { id: "p-boreal", tipo: "planetas", nome: "Hemisfério boreal", pai: null },
        { id: "p-astral", tipo: "planetas", nome: "Hemisfério astral", pai: null }
      ],
      itens: [],
      cartazes: []
    };
  }
  function read() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.pastas) && Array.isArray(d.itens) && Array.isArray(d.cartazes)) return d;
    } catch (e) {}
    return seed();
  }
  function write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); }
    catch (e) { throw new Error("Não deu pra salvar neste navegador."); }
  }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // Campo de imagem opcional. Reduz a foto (máx. 640 px, JPEG) para caber no localStorage.
  // Devolve { node, get(): data URL ou "" }. Com o banco, troque por upload no Storage.
  function imageField(labelText, aspect) {
    var UI = DBOUI, el = UI.el, url = "";
    var wrap = el("div", "field imgfield");
    var id = "img-" + uid("");
    var label = el("label", "", labelText + " (opcional)");
    label.htmlFor = id;
    var input = el("input"); input.type = "file"; input.id = id; input.accept = "image/png,image/jpeg,image/webp,image/gif";
    var preview = el("img", "imgfield__preview"); preview.alt = "Prévia da imagem"; preview.hidden = true;
    var remove = el("button", "btn btn--ghost imgfield__remove", "Remover imagem"); remove.type = "button"; remove.hidden = true;
    var msg = el("p", "imgfield__msg"); msg.setAttribute("role", "status");
    function clear() { url = ""; input.value = ""; preview.hidden = true; remove.hidden = true; }
    remove.addEventListener("click", function () { clear(); msg.textContent = ""; });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      msg.textContent = "";
      if (!file) return clear();
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { clear(); msg.textContent = "Use uma imagem PNG, JPG, WEBP ou GIF."; return; }
      if (file.size > 8 * 1024 * 1024) { clear(); msg.textContent = "A imagem é grande demais (máximo 8 MB)."; return; }
      if (aspect && window.DBOCropper) {   // quem monta o cartaz escolhe o recorte
        DBOCropper.pick(file, 640, aspect).then(function (data) {
          if (!data) return clear();
          url = data; preview.src = url; preview.hidden = false; remove.hidden = false;
        }).catch(function (e) { clear(); msg.textContent = e.message; });
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 640 / Math.max(img.width, img.height));
          var cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
          var ctx = cv.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          url = toWebp(cv, 0.8);
          preview.src = url; preview.hidden = false; remove.hidden = false;
        };
        img.onerror = function () { clear(); msg.textContent = "Não consegui abrir essa imagem."; };
        img.src = reader.result;
      };
      reader.onerror = function () { clear(); msg.textContent = "Não consegui ler esse arquivo."; };
      reader.readAsDataURL(file);
    });
    [label, input, preview, remove, msg].forEach(function (n) { wrap.appendChild(n); });
    return { node: wrap, get: function () { return url; } };
  }

  // Várias imagens, todas recortadas por quem cria. Devolve { node, get(): [data URLs] }.
  function imagesField(labelText, aspect, max, inicial) {
    var UI = DBOUI, el = UI.el, list = Array.isArray(inicial) ? inicial.filter(Boolean).slice() : [];
    max = max || 8;
    var wrap = el("div", "field imgsfield");
    var label = el("label", "", labelText + " (opcional)");
    var id = "imgs-" + uid("");
    label.htmlFor = id;
    var grid = el("div", "imgsfield__grid");
    var input = el("input"); input.type = "file"; input.id = id; input.accept = "image/png,image/jpeg,image/webp,image/gif"; input.hidden = true;
    var add = el("button", "btn btn--ghost imgsfield__add", "+ Adicionar imagem"); add.type = "button";
    var msg = el("p", "imgfield__msg"); msg.setAttribute("role", "status");
    function draw() {
      grid.textContent = "";
      list.forEach(function (u, i) {
        var f = el("figure", "imgsfield__item");
        var im = el("img"); im.src = u; im.alt = "Imagem " + (i + 1);
        var x = el("button", "imgsfield__x", "×"); x.type = "button"; x.setAttribute("aria-label", "Remover imagem " + (i + 1));
        x.addEventListener("click", function () { list.splice(i, 1); draw(); });
        f.appendChild(im); f.appendChild(x); grid.appendChild(f);
      });
      add.hidden = list.length >= max;
    }
    add.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0]; input.value = ""; msg.textContent = "";
      if (!file) return;
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { msg.textContent = "Use uma imagem PNG, JPG, WEBP ou GIF."; return; }
      if (file.size > 8 * 1024 * 1024) { msg.textContent = "A imagem é grande demais (máximo 8 MB)."; return; }
      DBOCropper.pick(file, 640, aspect || 1.6).then(function (data) { if (data) { list.push(data); draw(); } })
        .catch(function (e) { msg.textContent = e.message; });
    });
    [label, grid, add, input, msg].forEach(function (n) { wrap.appendChild(n); });
    draw();
    return { node: wrap, get: function () { return list.slice(); } };
  }

  // Quem pediu a conclusão (modo local): nome do personagem e do usuário.
  function pedido(m) {
    var ch = window.DBOCharacters && DBOCharacters.get ? DBOCharacters.get(m.p) : null, u = window.DBOAuth && DBOAuth.current ? DBOAuth.current() : null;
    return { p: m.p, quando: m.ok, personagem: ch ? ch.nome : "Personagem", usuario: u ? (u.nick || u.nome || u.email) : "" };
  }

  var local = {
    imageField: imageField,
    imagesField: imagesField,
    pastas: function (tipo) { return read().pastas.filter(function (p) { return p.tipo === tipo; }); },
    itens: function (pastaId) { return read().itens.filter(function (i) { return i.pasta === pastaId; }); },
    addPasta: function (tipo, nome, pai) {
      var d = read(), p = { id: uid("f"), tipo: tipo, nome: nome, pai: pai || null };
      d.pastas.push(p); write(d); return p;
    },
    addItem: function (tipo, pasta, dados) {
      var d = read(), i = { id: uid("i"), tipo: tipo, pasta: pasta, dados: dados };
      d.itens.push(i); write(d); return i;
    },
    // Edita os dados de um item (planeta ou ser do bestiário).
    editar: async function (tipo, itemId, dados) {
      var d = read(), it = d.itens.filter(function (i) { return i.id === itemId; })[0];
      if (!it) throw new Error("Esse item não existe mais.");
      it.dados = dados; write(d); return it;
    },
    mover: async function (itemId, pastaId) {
      var d = read(), it = d.itens.filter(function (i) { return i.id === itemId; })[0];
      if (!it) throw new Error("Esse item não existe mais.");
      it.pasta = pastaId; write(d);
    },
    // Apaga pastas (com tudo que há dentro, inclusive subpastas) e itens soltos.
    remover: async function (pastaIds, itemIds) {
      var d = read(), gone = {};
      pastaIds.forEach(function (id) { gone[id] = 1; });
      var grew = true;
      while (grew) { grew = false; d.pastas.forEach(function (p) { if (p.pai && gone[p.pai] && !gone[p.id]) { gone[p.id] = 1; grew = true; } }); }
      d.pastas = d.pastas.filter(function (p) { return !gone[p.id]; });
      d.itens = d.itens.filter(function (i) { return !gone[i.pasta] && itemIds.indexOf(i.id) < 0; });
      write(d);
    },
    cartazes: function (secao) { return read().cartazes.filter(function (c) { return c.secao === secao; }); },
    addCartaz: function (c) {
      var d = read(); c.id = uid("c"); d.cartazes.push(c); write(d); return c;
    },
    // --- Missões (cartazes que cada personagem pegou) ---
    missoesDe: function (pid) {
      var d = read(), ids = (d.missoes || []).filter(function (m) { return m.p === pid; }).map(function (m) { return m.c; });
      return d.cartazes.filter(function (c) { return ids.indexOf(c.id) >= 0; });
    },
    pegaram: function (cid) { return (read().missoes || []).filter(function (m) { return m.c === cid; }).map(function (m) { return m.p; }); },
    pegar: async function (pid, cid) {
      var d = read(); d.missoes = d.missoes || [];
      if (!d.missoes.some(function (m) { return m.p === pid && m.c === cid; })) d.missoes.push({ p: pid, c: cid });
      write(d);
    },
    abandonar: async function (pid, cid) {
      var d = read(); d.missoes = (d.missoes || []).filter(function (m) { return !(m.p === pid && m.c === cid); }); write(d);
    },
    // Concluir = pedir a validação do mestre. Os Zenis só saem quando o mestre aceita.
    concluir: async function (pid, cid) {
      var d = read(), m = (d.missoes || []).filter(function (x) { return x.p === pid && x.c === cid; })[0];
      if (!m) throw new Error("Esse personagem não pegou esta missão.");
      if (!m.ok) m.ok = Date.now();
      write(d);
    },
    // Pedidos de conclusão esperando o mestre, de um cartaz: [{ p, quando, personagem, usuario }]
    concluidos: function (cid) {
      return (read().missoes || []).filter(function (m) { return m.c === cid && m.ok; }).map(function (m) { return pedido(m); });
    },
    // Todos os pedidos pendentes (aviso do mestre na Enciclopédia): [{ p, c, alvo, quando, personagem, usuario }]
    pendentes: function () {
      var d = read();
      return (d.missoes || []).filter(function (m) { return m.ok; }).map(function (m) {
        var cz = d.cartazes.filter(function (c) { return c.id === m.c; })[0];
        return cz ? Object.assign({ c: m.c, alvo: cz.alvo }, pedido(m)) : null;
      }).filter(Boolean);
    },
    aceitar: async function (pid, cid) {
      var d = read(), cz = d.cartazes.filter(function (c) { return c.id === cid; })[0];
      if (!cz) throw new Error("Esse cartaz não existe mais.");
      var ch = DBOCharacters.get(pid);
      if (!ch) throw new Error("Personagem não encontrado.");
      var zeni = (Number(ch.zeni) || 0) + cz.recompensa;
      DBOCharacters.update(pid, { zeni: zeni });
      d.cartazes = d.cartazes.filter(function (c) { return c.id !== cid; });
      d.missoes = (d.missoes || []).filter(function (m) { return m.c !== cid; });
      write(d);
      return zeni;
    },
    rejeitar: async function (pid, cid) {
      var d = read(); (d.missoes || []).forEach(function (m) { if (m.p === pid && m.c === cid) m.ok = null; }); write(d);
    },
    removerCartazes: async function (ids) {
      var d = read();
      d.cartazes = d.cartazes.filter(function (c) { return ids.indexOf(c.id) < 0; });
      d.missoes = (d.missoes || []).filter(function (m) { return ids.indexOf(m.c) < 0; });
      write(d);
    },
    // Cartaz anônimo: a recompensa sai dos Zenis do personagem.
    criarAnonimo: async function (pid, c) {
      var ch = DBOCharacters.get(pid);
      if (!ch) throw new Error("Personagem não encontrado.");
      if (c.recompensa < 1) throw new Error("Coloque pelo menos 1 Zeni na recompensa.");
      if (c.recompensa > (Number(ch.zeni) || 0)) throw new Error("Zenis insuficientes.");
      DBOCharacters.update(pid, { zeni: (Number(ch.zeni) || 0) - c.recompensa });
      c.secao = "anonima";
      return local.addCartaz(c);
    }
  };

  /* =====================================================================
     MODO SUPABASE: criaturas, planetas, pastas e cartazes ficam no banco.
     Leitura (síncrona) vem da memória carregada em ready(); escrita (assíncrona) grava no banco.
     Quem pode escrever é decidido pela RLS: só o mestre cria criaturas, planetas e pastas; qualquer
     jogador conectado cria cartaz anônimo; só o mestre cria cartaz da Patrulha.
     ===================================================================== */
  var remote = typeof DBOAuth !== "undefined" && DBOAuth.mode === "supabase";
  var AMEACA = { "Inofensivo": "inofensivo", "Planetária": "planetaria", "Galáxia": "galaxia", "Hemisfério": "hemisferio", "Universal": "universal" };
  var AMEACA_REV = {};
  Object.keys(AMEACA).forEach(function (k) { AMEACA_REV[AMEACA[k]] = k; });
  // Tabelas de cada seção em pastas.
  var T = { bestiario: { pastas: "bestiario_pastas", itens: "criaturas" }, planetas: { pastas: "planeta_pastas", itens: "planetas" } };
  function comImagens(d) {
    var imgs = Array.isArray(d.imagens) ? d.imagens : (d.imagem ? [d.imagem] : []);
    return Object.assign({}, d, { imagens: imgs, imagem: imgs[0] || "" });
  }
  // Dados do site -> colunas do banco.
  function linhaDe(tipo, d) {
    if (tipo === "bestiario") return { nome: d.nome, descricao: d.descricao || "", imagem_url: d.imagens[0] || null, imagens: d.imagens,
      comportamento: d.comportamento, ameaca: AMEACA[d.ameaca] || "inofensivo" };
    return { nome: d.nome, descricao: d.descricao || "", imagem_url: d.imagens[0] || null, imagens: d.imagens,
      fauna: d.fauna || "", flora: d.flora || "", povo: d.povo || "", clima: d.clima || "", lugares: d.lugares || "", curiosidades: d.curiosidades || "" };
  }
  // Antes da migração 16, criaturas não tem a coluna "imagens": grava só a primeira imagem.
  async function gravar(tipo, fn, linha) {
    try { return await fn(linha); }
    catch (e) {
      if (tipo !== "bestiario" || !/imagens/.test(e.message || "")) throw e;
      var sem = Object.assign({}, linha); delete sem.imagens;
      if (window.console) console.warn("Rode banco/migracoes/migracao-16.sql para guardar várias imagens por ser.");
      return await fn(sem);
    }
  }
  var R = { pastas: [], itens: [], cartazes: [], missoes: [], quem: {} };   // quem[personagemId] = { personagem, usuario } (só o mestre enxerga os de outros)
  var readyPromise = null, readyFor = null, loaded = false;

  /* -- Cache dos cartazes: a página Missões desenha na hora com a cópia da última visita e confere com o banco em seguida -- */
  var CACHE = "dbo-missoes:";
  function cacheKey() { var id = (DBOAuth.current() || {}).id; return id ? CACHE + id : null; }
  function saveCache() {
    var k = cacheKey(); if (!k || !loaded) return;
    try { localStorage.setItem(k, JSON.stringify({ cartazes: R.cartazes, missoes: R.missoes, quem: R.quem, t: Date.now() })); } catch (e) {
      try { localStorage.setItem(k, JSON.stringify({ cartazes: R.cartazes.map(function (c) { return Object.assign({}, c, { imagem: "" }); }), missoes: R.missoes, quem: R.quem, t: Date.now() })); } catch (e2) {}
    }
  }
  window.addEventListener("pagehide", saveCache);

  function session() { var u = DBOAuth.current(); return u && u.confirmed ? u : null; }
  function needApi() {
    if (!window.DBOApi || !DBOApi.enabled) throw new Error("O arquivo js/banco.js não foi carregado. Atualize a página sem cache (Ctrl+Shift+R) e confira se ele foi publicado.");
  }
  // Nome do personagem e do usuário de cada pedido de conclusão (o mestre enxerga todos; o jogador, só os seus).
  async function carregarQuem() {
    var ids = R.missoes.filter(function (m) { return m.ok; }).map(function (m) { return m.p; });
    ids = ids.filter(function (id, i) { return ids.indexOf(id) === i; });
    R.quem = {};
    if (!ids.length) return;
    try {
      var chars = await DBOApi.select("personagens", { select: "id,nome,dono_id", id: DBOApi.list(ids) });
      var donos = chars.map(function (c) { return c.dono_id; }).filter(function (id, i, a) { return a.indexOf(id) === i; });
      var perfis = donos.length ? await DBOApi.select("perfis", { select: "id,nome,email", id: DBOApi.list(donos) }) : [];
      chars.forEach(function (c) {
        var pf = perfis.filter(function (x) { return x.id === c.dono_id; })[0];
        R.quem[c.id] = { personagem: c.nome, usuario: pf ? (pf.nome || pf.email) : "" };
      });
    } catch (e) { if (window.console) console.warn("Não consegui ler quem concluiu a missão: " + e.message); }
  }
  function pedidoRemoto(m) {
    var q = R.quem[m.p] || {};
    return { p: m.p, quando: m.ok, personagem: q.personagem || "Personagem", usuario: q.usuario || "" };
  }
  async function load() {
    needApi();
    R = { pastas: [], itens: [], cartazes: [], missoes: [], quem: {} };
    if (!session()) return;
    var r = await Promise.all([
      DBOApi.select("bestiario_pastas", { order: "ordem.asc" }),
      DBOApi.select("criaturas", { order: "criado_em.asc" }),
      DBOApi.select("planeta_pastas", { order: "ordem.asc" }),
      DBOApi.select("planetas", { order: "criado_em.asc" }),
      DBOApi.select("cartazes", { order: "criado_em.asc" }),
      // Antes de rodar o banco/migracoes/migracao-02.sql a tabela não existe: o site abre mesmo assim.
      DBOApi.select("missoes_personagem").catch(function (e) { if (window.console) console.warn("missoes_personagem indisponível (" + e.message + "). Rode banco/migracoes/migracao-02.sql."); return []; })
    ]);
    R.missoes = r[5].map(function (m) { return { p: m.personagem_id, c: m.cartaz_id, ok: m.concluida_em || null }; });
    await carregarQuem();
    r[0].forEach(function (p) { R.pastas.push({ id: p.id, tipo: "bestiario", nome: p.nome, pai: p.pai_id || null }); });
    r[2].forEach(function (p) { R.pastas.push({ id: p.id, tipo: "planetas", nome: p.nome, pai: p.pai_id || null }); });
    r[1].forEach(function (c) {
      R.itens.push({ id: c.id, tipo: "bestiario", pasta: c.pasta_id, dados: { nome: c.nome, descricao: c.descricao || "", imagem: c.imagem_url || "", imagens: (Array.isArray(c.imagens) && c.imagens.length) ? c.imagens : (c.imagem_url ? [c.imagem_url] : []), comportamento: c.comportamento, ameaca: AMEACA_REV[c.ameaca] || "" } });
    });
    r[3].forEach(function (p) {
      R.itens.push({ id: p.id, tipo: "planetas", pasta: p.pasta_id, dados: { nome: p.nome, descricao: p.descricao || "", imagem: p.imagem_url || "", imagens: (Array.isArray(p.imagens) && p.imagens.length) ? p.imagens : (p.imagem_url ? [p.imagem_url] : []), fauna: p.fauna || "", flora: p.flora || "", povo: p.povo || "", clima: p.clima || "", lugares: p.lugares || "", curiosidades: p.curiosidades || "" } });
    });
    r[4].forEach(function (c) {
      R.cartazes.push({ id: c.id, secao: c.secao, alvo: c.alvo, recompensa: Number(c.recompensa) || 0, descricao: c.descricao || "", localizacao: c.localizacao || "", imagem: c.imagem_url || "", dono: c.autor_id });
    });
    loaded = true; saveCache();
  }

  var remoteApi = {
    imageField: imageField,
    imagesField: imagesField,
    // Espera os dados carregarem (recarrega se outra conta entrou). No modo local resolve na hora.
    ready: function () {
      var who = (DBOAuth.current() || {}).id || "";
      if (readyPromise && readyFor !== who) readyPromise = null;
      if (!readyPromise) {
        readyFor = who;
        readyPromise = load();
        readyPromise.catch(function () { readyPromise = null; });
      }
      return readyPromise;
    },
    needsLogin: function () { return !session(); },
    // Copia da última visita (só cartazes e missões pegas). Devolve true se havia cópia e ela foi aplicada.
    hydrate: function () {
      if (loaded || !session()) return false;
      try {
        var d = JSON.parse(localStorage.getItem(cacheKey()));
        if (!d || !Array.isArray(d.cartazes)) return false;
        R.cartazes = d.cartazes; R.missoes = d.missoes || []; R.quem = d.quem || {}; return true;
      } catch (e) { return false; }
    },
    pastas: function (tipo) { return R.pastas.filter(function (p) { return p.tipo === tipo; }); },
    itens: function (pastaId) { return R.itens.filter(function (i) { return i.pasta === pastaId; }); },
    cartazes: function (secao) { return R.cartazes.filter(function (c) { return c.secao === secao; }); },

    addPasta: async function (tipo, nome, pai) {
      var row = (await DBOApi.insert(T[tipo].pastas, [pai ? { nome: nome, pai_id: pai } : { nome: nome }]))[0];
      var p = { id: row.id, tipo: tipo, nome: row.nome, pai: row.pai_id || null };
      R.pastas.push(p);
      return p;
    },
    addItem: async function (tipo, pasta, d) {
      d = comImagens(d);
      var row = (await gravar(tipo, function (linha) { return DBOApi.insert(T[tipo].itens, [linha]); }, Object.assign({ pasta_id: pasta }, linhaDe(tipo, d))))[0];
      var item = { id: row.id, tipo: tipo, pasta: pasta, dados: d };
      R.itens.push(item);
      return item;
    },
    editar: async function (tipo, itemId, d) {
      d = comImagens(d);
      await gravar(tipo, function (linha) { return DBOApi.patch(T[tipo].itens, { id: "eq." + itemId }, linha); }, linhaDe(tipo, d));
      var it = R.itens.filter(function (i) { return i.id === itemId; })[0];
      if (it) it.dados = d;
      return it;
    },
    mover: async function (itemId, pastaId) {
      var it = R.itens.filter(function (i) { return i.id === itemId; })[0];
      if (!it) throw new Error("Esse item não existe mais.");
      await DBOApi.patch(T[it.tipo].itens, { id: "eq." + itemId }, { pasta_id: pastaId });
      it.pasta = pastaId;
    },
    remover: async function (pastaIds, itemIds) {
      var tipoDe = function (lista, id) { var x = lista.filter(function (o) { return o.id === id; })[0]; return x ? x.tipo : null; };
      var tipo = tipoDe(R.pastas, pastaIds[0]) || tipoDe(R.itens, itemIds[0]);
      if (!tipo) return;
      if (pastaIds.length) await DBOApi.remove(T[tipo].pastas, { id: DBOApi.list(pastaIds) });   // o banco apaga o que está dentro (cascade)
      if (itemIds.length) await DBOApi.remove(T[tipo].itens, { id: DBOApi.list(itemIds) });
      var gone = {};
      pastaIds.forEach(function (id) { gone[id] = 1; });
      var grew = true;
      while (grew) { grew = false; R.pastas.forEach(function (p) { if (p.pai && gone[p.pai] && !gone[p.id]) { gone[p.id] = 1; grew = true; } }); }
      R.pastas = R.pastas.filter(function (p) { return !gone[p.id]; });
      R.itens = R.itens.filter(function (i) { return !gone[i.pasta] && itemIds.indexOf(i.id) < 0; });
    },
    addCartaz: async function (c) {
      var row = (await DBOApi.insert("cartazes", [{ secao: c.secao, alvo: c.alvo, recompensa: c.recompensa, descricao: c.descricao || "", localizacao: c.localizacao || "", imagem_url: c.imagem || null }]))[0];
      var out = { id: row.id, secao: row.secao, alvo: row.alvo, recompensa: Number(row.recompensa) || 0, descricao: row.descricao || "", localizacao: row.localizacao || "", imagem: row.imagem_url || "", dono: row.autor_id };
      R.cartazes.push(out);
      return out;
    },
    // --- Missões ---
    missoesDe: function (pid) {
      var ids = R.missoes.filter(function (m) { return m.p === pid; }).map(function (m) { return m.c; });
      return R.cartazes.filter(function (c) { return ids.indexOf(c.id) >= 0; });
    },
    pegaram: function (cid) { return R.missoes.filter(function (m) { return m.c === cid; }).map(function (m) { return m.p; }); },
    pegar: async function (pid, cid) {
      await DBOApi.insert("missoes_personagem", [{ personagem_id: pid, cartaz_id: cid }]);
      if (!R.missoes.some(function (m) { return m.p === pid && m.c === cid; })) R.missoes.push({ p: pid, c: cid });
    },
    abandonar: async function (pid, cid) {
      await DBOApi.remove("missoes_personagem", { personagem_id: "eq." + pid, cartaz_id: "eq." + cid });
      R.missoes = R.missoes.filter(function (m) { return !(m.p === pid && m.c === cid); });
    },
    // Concluir = pedir a validação do mestre. Os Zenis só saem quando o mestre aceita.
    concluir: async function (pid, cid) {
      var quando = await DBOApi.rpc("concluir_missao", { p_personagem: pid, p_cartaz: cid });
      R.missoes.forEach(function (m) { if (m.p === pid && m.c === cid) m.ok = quando || new Date().toISOString(); });
      await carregarQuem();
    },
    concluidos: function (cid) { return R.missoes.filter(function (m) { return m.c === cid && m.ok; }).map(pedidoRemoto); },
    pendentes: function () {
      return R.missoes.filter(function (m) { return m.ok; }).map(function (m) {
        var cz = R.cartazes.filter(function (c) { return c.id === m.c; })[0];
        return cz ? Object.assign({ c: m.c, alvo: cz.alvo }, pedidoRemoto(m)) : null;
      }).filter(Boolean);
    },
    aceitar: async function (pid, cid) {
      var zeni = Number(await DBOApi.rpc("aceitar_conclusao", { p_personagem: pid, p_cartaz: cid })) || 0;
      R.cartazes = R.cartazes.filter(function (c) { return c.id !== cid; });
      R.missoes = R.missoes.filter(function (m) { return m.c !== cid; });
      return zeni;
    },
    rejeitar: async function (pid, cid) {
      await DBOApi.rpc("rejeitar_conclusao", { p_personagem: pid, p_cartaz: cid });
      R.missoes.forEach(function (m) { if (m.p === pid && m.c === cid) m.ok = null; });
    },
    removerCartazes: async function (ids) {
      if (!ids.length) return;
      await DBOApi.remove("cartazes", { id: DBOApi.list(ids) });
      R.cartazes = R.cartazes.filter(function (c) { return ids.indexOf(c.id) < 0; });
      R.missoes = R.missoes.filter(function (m) { return ids.indexOf(m.c) < 0; });
    },
    criarAnonimo: async function (pid, c) {
      var id = await DBOApi.rpc("criar_cartaz_anonimo", { p_personagem: pid, p_alvo: c.alvo, p_recompensa: c.recompensa, p_imagem: c.imagem || "", p_descricao: c.descricao || "", p_localizacao: c.localizacao || "" });
      var ch = DBOCharacters.get(pid);
      if (ch) DBOCharacters.patchCache(pid, { zeni: (Number(ch.zeni) || 0) - c.recompensa });
      var out = { id: id, secao: "anonima", alvo: c.alvo, recompensa: c.recompensa, descricao: c.descricao || "", localizacao: c.localizacao || "", imagem: c.imagem || "", dono: (DBOAuth.current() || {}).id };
      R.cartazes.push(out);
      return out;
    }
  };

  local.ready = function () { return Promise.resolve(); };
  local.needsLogin = function () { return false; };
  local.hydrate = function () { return false; };
  return remote ? remoteApi : local;
})();
