// Gera imagem/arte/artes.json com todas as imagens da pasta imagem/arte (em ordem alfabética).
// Uso (na pasta do projeto):  node ferramentas/gerar-artes.mjs
import { readdirSync, writeFileSync } from "node:fs";
const dir = new URL("../imagem/arte/", import.meta.url);
const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f)).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
writeFileSync(new URL("artes.json", dir), JSON.stringify(files, null, 2) + "\n");
console.log(files.length + " arte(s) listada(s):", files.join(", ") || "(nenhuma)");
