// Dragon Ball Omega — servidor local do modo debug (não precisa instalar nada além do Node).
//
//   Rode na pasta do projeto:   node ferramentas/servidor-debug.js
//   Depois abra:                http://localhost:5500/debug.html   (entre com a conta do mestre)
//
// Ele serve o site inteiro (como o Live Server) e guarda o personagem debug em
// ferramentas/debug-local/personagem-debug.json, que você abre e edita no VSCode quando quiser.
// O arquivo continua lá depois de desligar o computador. Para usar outra porta: node ferramentas/servidor-debug.js 8080
// Este servidor é só para o seu computador: não envie a pasta "ferramentas" para o Cloudflare.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const PASTA = path.join(__dirname, "debug-local");
const ARQUIVO = path.join(PASTA, "personagem-debug.json");
const PORTA = Number(process.argv[2]) || 5500;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8"
};

function responder(res, status, corpo, tipo) {
  res.writeHead(status, { "Content-Type": tipo || "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(corpo);
}

function api(req, res) {
  if (req.method === "GET") {
    fs.readFile(ARQUIVO, "utf8", (err, txt) => responder(res, 200, err ? "{}" : txt, TIPOS[".json"]));
    return;
  }
  if (req.method === "PUT" || req.method === "POST") {
    let corpo = "";
    req.on("data", (pedaco) => { corpo += pedaco; if (corpo.length > 5e6) req.destroy(); });
    req.on("end", () => {
      try { JSON.parse(corpo); } catch (e) { return responder(res, 400, "JSON inválido"); }
      fs.mkdirSync(PASTA, { recursive: true });
      // Grava num arquivo temporário e troca: se o computador desligar no meio, o JSON antigo não se perde.
      const tmp = ARQUIVO + ".tmp";
      fs.writeFile(tmp, corpo, "utf8", (err) => {
        if (err) return responder(res, 500, "Não deu para gravar: " + err.message);
        fs.rename(tmp, ARQUIVO, (err2) => responder(res, err2 ? 500 : 200, err2 ? "Não deu para gravar" : "ok"));
      });
    });
    return;
  }
  responder(res, 405, "Método não permitido");
}

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/__debug/personagem") return api(req, res);
  let alvo = path.normalize(path.join(RAIZ, url));
  if (!alvo.startsWith(RAIZ)) return responder(res, 403, "Proibido");
  fs.stat(alvo, (err, st) => {
    if (!err && st.isDirectory()) alvo = path.join(alvo, "index.html");
    fs.readFile(alvo, (err2, dados) => {
      if (err2) return responder(res, 404, "Não encontrado: " + url);
      responder(res, 200, dados, TIPOS[path.extname(alvo).toLowerCase()] || "application/octet-stream");
    });
  });
}).listen(PORTA, "localhost", () => {
  console.log("Modo debug pronto: http://localhost:" + PORTA + "/debug.html");
  console.log("O personagem debug fica em " + path.relative(RAIZ, ARQUIVO));
});
