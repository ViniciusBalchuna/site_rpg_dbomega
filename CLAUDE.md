# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site de fã para o RPG de mesa **Dragon Ball Omega**: fichas, enciclopédia e uma sessão ao vivo (mapa, combate, rolagens). HTML + CSS + JavaScript puro, **sem build, sem npm, sem linter e sem bibliotecas**; back-end opcional em Supabase. Interface, comentários, banco e termos do jogo são em **português do Brasil**. O `README.md` tem o mapa completo de módulos, páginas e tabelas; este arquivo cobre só o que exige ler vários arquivos para entender.

## Comandos

```bash
cp js/supabase-config.example.js js/supabase-config.js   # uma vez; gitignored; url/key vazios = modo local (localStorage)
python3 -m http.server 5600                               # qualquer servidor estático serve; abra http://localhost:5600
node ferramentas/servidor-debug.js [porta]                # serve o site (porta 5500) + grava o personagem do debug.html em ferramentas/debug-local/
```

- Sempre sirva por HTTP: `file://` quebra os `fetch` e a CSP.
- Não há testes, build nem lint no repositório. O README cita testes em Playwright (Python) contra o modo local, mas os scripts não estão versionados. `BALANCEAMENTO.md`, citado no README, também não existe.
- Verificação visual: sirva a pasta e abra no navegador; para screenshots headless, use o Chrome em `--headless=new` apontando para o servidor local.

## Arquitetura

**Módulos globais.** Cada `js/*.js` é um IIFE que expõe **um** objeto `DBO*` (`DBORules`, `DBOSheet`, `DBOMapa`...). Não há `import`/bundler: cada HTML lista os `<script>` **na ordem das dependências**, e os que mudam muito levam `?v=NN` (suba o número em todas as páginas que o carregam, senão o navegador usa a versão antiga).

**Dois modos de dados, mesma API.** `DBOApi` (`banco.js`) fala com o PostgREST do Supabase por `fetch` (sem SDK). Com `url`/`key` vazios em `js/supabase-config.js`, cada módulo (`DBOAuth`, `DBOCharacters`, `DBOSessao`...) usa `localStorage` (chaves `dbo-*`). A API pública é a mesma; no Supabase só `ready()`, `hydrate()` e as gravações viram assíncronas. Mudou um módulo de dados? Confira os dois caminhos.

**Regras do sistema num lugar só.** PL, HP, KP, RD e maestria **não são gravados**: são calculados por `rules.js` / `habilidades.js`. Mexeu em número do jogo? Altere `rules.js` (fórmulas) ou os `*-data.js` (conteúdo). HP/KP/PD atuais vazios (`null`/`""`) significam "cheio": leia sempre com `R.hpAtual(c)`, `R.kpAtual(c)`, `R.pdAtual(c)`, nunca `c.hpAtual` direto.

**Banco.** `banco/schema.sql` cria tudo do zero; bancos existentes recebem `banco/migracoes/migracao-NN.sql` em ordem. Nunca edite uma migração publicada: crie a próxima **e** acrescente o mesmo trecho ao fim do `schema.sql`. A segurança é RLS no banco (a chave no site é só a `anon`, nunca a `service_role`).

**CSP (`_headers`).** `script-src 'self'`: nada de script inline nem CDN (biblioteca nova = copiar para `js/` e revisar). `style-src` aceita inline e Google Fonts; imagens só do próprio domínio, do Supabase do projeto e do Google. O `_headers` vale na Cloudflare; mudou de domínio/projeto Supabase, ajuste lá.

**Visuais por página.** O `<html class>` escolhe a identidade (`ocean` na landing; `dragon ocean` em Personagens e Configurações; `ki` na criação e ficha; `patrol` na Enciclopédia; `clash` na Campanha) e `data-theme="light"` o tema claro. `js/transition.js` mapeia URL → visual por regex para a transição entre páginas: página nova de um visual precisa entrar lá. Animações devem respeitar `prefers-reduced-motion` **e** a classe `no-motion` no `<html>` (opção "Desligar animações", guardada em `dbo-motion`; ver `theme.js`).

**Motor do mapa.** `js/mapa.js` (≈3 mil linhas, canvas) serve o editor e a Sessão; o cabeçalho do arquivo documenta o formato `.dbomapa`. Tokens da sessão são linhas separadas com gravação otimista (cópia local por 4 s para o poll não "puxar de volta").

## Landing page (`index.html`) — identidade "Profundímetro"

- A página é um mergulho: Superfície (0 m) → Personagens (10 m) → Enciclopédia (30 m) → Campanha (60 m) → Comece (100 m). Um medidor fixo à esquerda (só ≥1180px) marca a seção atual; cada área do site aparece numa miniatura da tela real (ficha, enciclopédia, sessão). Sem bichos nem canvas: o mar é só o gradiente do fundo.
- `css/mare.css` é **compartilhado** com Personagens e Configurações (classes `.m4__*` / `.m5__*`). Não o altere para mudar só a landing: a landing usa `<html class="ocean profundimetro">` (sem `dragao.css`) e `css/profundimetro.css` (carregado depois) sobrescreve os tokens só sob `.profundimetro`, inclusive o tema claro. Classes e variáveis da landing são em português (`.medidor`, `.janela`, `--cor-agua-1`...).
- O cabeçalho e o rodapé são os de sempre (`style.css`); o conteúdo ganha `padding-left: var(--largura-medidor)` em telas largas e o **rodapé recebe o mesmo espaço**, para o texto ficar centralizado com o resto.
- `js/profundimetro.js` (sem global) marca o medidor e troca o "A" da ficha de exemplo pela foto em `imagem/personagem/ashura.(jpg|jpeg|png|webp|avif)`, se existir.
- Os termos do jogo (HP, KP, Power-Level, STR...) só aparecem dentro das miniaturas; os textos da página explicam sem eles.
- `js/dragao.js` (`DBODragon`) só é usado por Personagens: `head()` (tela de carregamento dourada) e `face()` (telas de exclusão). Cores via `--dr-*` (`--dr-horn`, opcional, pinta os chifres; sem ela usa `--dr-light`) e classes `.dr-*` em `css/dragao.css`.

## Fora do versionamento

- `bot/` é um esqueleto não versionado (arquivos `.py` vazios + `bot/.env`). Não leia nem commite o `.env`.
- `.agents/`, `skills-lock.json` (skills instaladas por `npx skills`), `.claude/skills/` e `.claude/settings.local.json` são ignorados pelo git (`.gitignore`); cada máquina recria os seus. A skill `design-taste-frontend` traz um hook `Stop` que roda `gate.mjs`, mas só age se existir `.taste-skill/build.json`.
