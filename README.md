# Dragon Ball Omega

Site completo para o RPG de mesa **Dragon Ball Omega (Ω)**, um sistema de fã: criação e ficha de personagens,
enciclopédia do universo e uma **sessão ao vivo** para o mestre e os jogadores, com mapa, combate, rolagens e log
compartilhados.

**HTML + CSS + JavaScript puro**, sem framework, sem build e sem bibliotecas externas, com **Supabase**
(Postgres + Auth + Storage) no back-end.

<!-- Capturas de tela: salve as imagens em docs/capturas/ e tire o comentário abaixo.
![Ficha do personagem](docs/capturas/ficha.png)
![Sessão ao vivo com o mapa](docs/capturas/sessao.png)
![Prato de dados 3D](docs/capturas/prato-3d.gif)
-->

🔗 **Site no ar:** <https://rpg.dbomega.workers.dev/>

## Destaques

- **Motor de mapa em `<canvas>`:** blocos com relevo, vários andares (layers), escadas, voo, paredes finas, névoa,
  textos e **visão por linha de visão** com sombras entre andares, modo caverna com tocha e lanterna.
- **Prato de dados 3D sem bibliotecas:** física de corpo rígido feita à mão (colisões com o prato e entre os dados),
  câmera em perspectiva e renderização em canvas 2D; o valor sorteado é decidido antes e "colocado" na face de cima.
- **Sessão em tempo real** entre mestre e jogadores: tokens com gravação otimista, log de mensagens e rolagens,
  ordem de iniciativa, NPCs, visão "ver como" do mestre.
- **Regras do sistema num lugar só** (`js/rules.js`): poder de luta, HP, KP, multiplicadores de dano, custos de TP;
  o balanceamento está documentado em [`BALANCEAMENTO.md`](BALANCEAMENTO.md).
- **Segurança no banco:** cada tabela tem RLS (Row Level Security); a CSP do site (`_headers`) só aceita scripts do
  próprio domínio.
- **Dois modos sem mudar o código:** com o Supabase configurado, tudo vai para o banco; sem ele, o site roda inteiro
  no navegador (`localStorage`), ótimo para testar.
- **Acessibilidade:** navegação por teclado, foco visível, `aria-label`, alvos de toque de 44 px e respeito ao
  `prefers-reduced-motion`.

## Tecnologias

| Camada | Uso |
|---|---|
| Front-end | HTML, CSS (temas claro/escuro e visuais por área), JavaScript ES5/ES2017 em módulos IIFE |
| Gráficos | Canvas 2D (mapa e prato 3D), SVG (prato 2D), Web Audio (sons sintetizados) |
| Back-end | Supabase: Postgres + PostgREST (sem SDK, `fetch` direto), Auth, Storage |
| Hospedagem | Arquivos estáticos na Cloudflare, cabeçalhos de segurança em `_headers` |
| Testes | Playwright (Python) contra o servidor local, no modo local |

Interface, comentários, banco e todos os termos do jogo em **português do Brasil**.

---

## 1. Como rodar

```bash
# 1. crie a configuração a partir do modelo (vazia = modo local, sem banco)
cp js/supabase-config.example.js js/supabase-config.js

# 2. qualquer servidor estático serve; na raiz do projeto:
python3 -m http.server 5600
# abra http://localhost:5600
```

| Modo | Quando | Onde ficam os dados |
|---|---|---|
| **Local (teste)** | `js/supabase-config.js` com `url` e `key` vazios | `localStorage` do navegador (cada navegador é um mundo) |
| **Supabase** | `url` e `key` (chave **pública** anon) preenchidos | tabelas do Postgres, com RLS |

O site troca de modo sozinho. A API pública de cada módulo é a mesma nos dois modos; no Supabase só
`ready()`, `hydrate()` e as gravações viram assíncronas.

> O `js/supabase-config.js` fica fora do Git (`.gitignore`): cada ambiente tem o seu. Use só a chave **pública**
> (anon); **nunca** a `service_role`, que ignora as travas do banco. No modo local, os e-mails em `mestresLocais`
> entram como mestre.

Passo a passo para ligar o banco: [`banco/ROTEIRO.md`](banco/ROTEIRO.md).

---

## 2. Estrutura de pastas

```
/                     páginas principais (index, personagens, personagem, criar-personagem, campanha,
                      enciclopedia, configuracoes, debug) + _headers + robots.txt
campanha/             páginas do mestre e da mesa: combate.html (Sessão), mapas.html, npcs.html,
                      jogadores.html, historico.html
enciclopedia/         bestiário, planetas, missões, mistérios, atualizações
css/                  um arquivo por área (style.css é a base; mapa.css, sessao.css, sheet.css...)
js/                   um módulo por área (ver seção 4)
banco/                schema.sql (banco completo) + ROTEIRO.md (como ligar o Supabase)
banco/migracoes/      migracao-NN.sql: atualizações de um banco que já existe, em ordem
imagem/               logo, favicons (um por tema da sessão), artes
ferramentas/          scripts de apoio (gerar artes, servidor do modo debug)
```

---

## 3. Páginas

| Página | Para quem | O que faz |
|---|---|---|
| `index.html` | todos | landing page |
| `personagens.html` | jogador | lista das fichas da conta |
| `criar-personagem.html` | jogador / mestre (`?npc=1`) | assistente de criação em 5 passos |
| `personagem.html?id=` | dono / mestre | a ficha: atributos, vitalidade, técnicas, equipamentos, habilidades de classe, transformações, efeitos |
| `campanha.html` | todos | entrada da campanha |
| `campanha/combate.html` | mesa | **Sessão**: jogadores e NPCs (esquerda), mapa (centro), log com rolagens (direita); abas Combate e Anotações |
| `campanha/mapas.html` | mestre | editor de mapas (tela cheia) |
| `campanha/npcs.html` | mestre | fichas de NPC |
| `campanha/jogadores.html` / `historico.html` | todos | quem está na campanha / histórico |
| `enciclopedia/*.html` | todos (mestre edita) | bestiário, planetas, missões (cartazes), mistérios, atualizações |
| `configuracoes.html` | todos | conta, tema, feedback |
| `debug.html` | mestre, local | ficha de teste ligada a um JSON do projeto |

---

## 4. Módulos JavaScript

Cada arquivo expõe **um** objeto global `DBO*` (padrão IIFE). As páginas carregam os scripts na ordem das
dependências, com `?v=NN` nos que mudam com frequência, para o navegador não usar a versão antiga.

### Base
| Módulo | Arquivo | Papel |
|---|---|---|
| `DBOUI` | `ui.js` | criar elementos, formatar números, toast |
| `DBOTheme`, `DBOTransition` | `theme.js`, `transition.js` | tema claro/escuro e transição entre os visuais (jade, laranja, roxo, azul) |
| `DBOAuth` | `auth.js` | contas (PBKDF2 local ou Supabase Auth) |
| `DBOApi` | `banco.js` | PostgREST sem biblioteca: `select`, `insert`, `upsert`, `remove`, `rpc` |
| `DBORoles` | `papeis.js` | mestre × jogador |
| `DBOCarregando` | `carregando.js` | textos das telas de carregamento |

### Regras e dados do sistema
| Módulo | Arquivo | Papel |
|---|---|---|
| `DBOData` | `data.js` | listas fixas: classes, raças, atributos, níveis |
| `DBORules` | `rules.js` | **todas as fórmulas**: PL, HP, KP, corpo, multiplicadores de dano, RD, limites, custo de TP das técnicas |
| `DBOAbility` | `habilidades.js` | técnicas: maestria, dados adicionais, rolagem de dano, componente visual |
| `DBOEfeitos` | `efeitos-data.js` | efeitos de penalidade e fortalecimento (3 graus) e o custo deles |
| `DBOCatalog` | `catalogo.js` | técnicas e equipamentos prontos |
| `DBOTransf` | `transformacoes-data.js`, `transformacoes.js` | catálogo e uso das transformações |
| (dados) | `subclasses-data.js`, `subracas-data.js`, `classes-exclusivas.js` | habilidades de sub-classe, sub-raça e exclusivas de classe |

### Personagens e ficha
| Módulo | Arquivo | Papel |
|---|---|---|
| `DBOCharacters` | `characters.js` | CRUD das fichas (local ou tabelas `personagens`, `habilidades`, `inventario`...) |
| `DBOSheet` | `sheet.js` | estado da ficha aberta: `get()`, `save(patch)`, `subscribe(fn)` |
| — | `arsenal.js` | coluna direita da ficha (dano, equipamentos, técnicas) |
| `DBOAttr`, `DBOOrb` | `atributos.js`, `orb.js` | modelos visuais dos atributos |
| `DBOFichas` | `fichas.js`, `fichas-arte.js`, `ficha-cedo.js` | modelos visuais da ficha |
| `DBOClassPicker`, `DBOChoose` | `escolha-classe.js`, `escolha.js` | janelas de escolha |
| `DBOPrato`, `DBOPrato3D`, `DBOSom` | `prato.js`, `prato3d.js`, `som.js` | prato de dados (3D padrão, 2D ou sem, em Configurações) e som sintetizado |
| `DBOTamanho` | `tamanho.js` | tamanho do NPC no mapa (pequeno a colossal, N×N) |

### Campanha e sessão
| Módulo | Arquivo | Papel |
|---|---|---|
| `DBOCampaign` | `campanha-data.js` | quem está na campanha (um personagem por conta) |
| `DBOSessao` | `sessao-data.js` | membros, pedidos, log (mensagens e rolagens), NPCs, tema, anotações |
| `DBOSessaoMapa` | `sessao-mapa.js` | mapa da sessão (versionado) e tokens (gravação otimista) |
| `DBOMapa` | `mapa.js` | **motor do mapa** em canvas (editor e sessão) — ver seção 6 |
| `DBOCombat` | `combate-data.js` | rodada e ordem de iniciativa |
| — | `combate.js` | a página Sessão inteira |
| `DBONotas` | `notas.js` | caderno de anotações em Markdown |
| `DBOCor` | `cor.js` | seletor de cor com conta-gotas |

### Enciclopédia
`DBOEnc` (`enciclopedia-data.js`), `DBOEncTree` (`arvore-enc.js`), `DBOFolders` (`pastas.js`), além de
`bestiario.js`, `planetas.js`, `missoes.js` e `aviso-missoes.js`.

---

## 5. Dados

### Personagem (formato do `DBOCharacters`)
```js
{ id, nome, nivel, xp, classe, subclasse, raca, subraca, alinhamento, altura, idade, foto,
  atributos: { forca, velocidade, resistencia, mente, espirito, concentracao },
  tpAtuais, tpGastos, zeni, hpAtual, kpAtual, pdAtual,
  tecnicas: [...], equipamentos: [...], transformacoes: [...], habilidadesClasse: [...],
  efeitos: [...], transformacaoAtiva,
  npc, plBase, tamanho }          // só NPC
```
PL, HP, KP, RD e maestria **não** são guardados: o site calcula com `rules.js` / `habilidades.js`, e todos veem o
mesmo número por usarem a mesma regra.

### Chaves do modo local (`localStorage`)
`dbo-users`, `dbo-session`, `dbo-papel` (contas) · `dbo-characters` (fichas por dono) · `dbo-campaign` ·
`dbo-sessao` (membros, log, NPCs) · `dbo-sessao-mapa` (mapa e tokens da sessão) · `dbo-mapa` (editor) ·
`dbo-combat` · `dbo-enc` (enciclopédia) · preferências: `dbo-theme`, `dbo-ficha`, `dbo-prato`, `dbo-som`...

### Banco (Supabase)
`banco/schema.sql` cria tudo do zero. Bancos já existentes recebem as `banco/migracoes/migracao-NN.sql` **em ordem**, a partir da
primeira que o banco ainda não tem. Principais tabelas:

| Área | Tabelas |
|---|---|
| Contas | `perfis` (papel: jogador / mestre / admin) |
| Fichas | `personagens`, `habilidades`, `habilidade_dados`, `tecnicas_aprendidas`, `inventario`, `transformacoes`, `tp_movimentos` |
| Catálogo | `tecnicas_padrao`, `equipamentos_padrao` |
| Campanha | `combates`, `combatentes` |
| Sessão | `sessao_membros`, `sessao_log` (+ RPC `postar_sessao_log`), `sessao_notas`, `sessao_estado`, `sessao_npcs`, `sessao_mapa`, `sessao_tokens` |
| Enciclopédia | `bestiario_pastas`, `criaturas`, `planeta_pastas`, `planetas`, `cartazes`, `missoes_personagem`, `misterios`, `misterio_respostas`, `atualizacoes` |
| Outros | `feedback` |

Regras de segurança (RLS): cada jogador só escreve no que é dele; o mestre lê todas as fichas; na sessão, o
mestre põe e tira tokens e o jogador só move o token do próprio personagem.

---

## 6. Motor do mapa (`js/mapa.js`)

`DBOMapa.criar(container, opts)` monta o mapa em `<canvas>` em dois modos: **editor** (aba Mapas) e **sessão**
(`opts.modo = "sessao"`, com `opts.mestre`).

- **Blocos:** espaço, parede ou terra, cada um com cor e relevo (normal, água, escada de mão, degraus).
  Guardados em `Map("x,y,layer" → { t, c, r })`.
- **Layers (andares):** 1 = chão, 0 = embaixo, 2 = em cima; o mestre cria mais. Movimento por layer: escadas
  (Escalar / Descer), voo (escolhe o layer; pousar desce) e queda até o apoio de baixo. A explosão derruba a
  coluna inteira acima.
- **Tokens:** retrato com borda (cor escolhida pelo jogador), tamanho N×N para NPC, estados (voando, submerso),
  `z` = layer, luz (tocha / lanterna) e mira.
- **Visão:** sombras por linha de visão em 3D simples (paredes, lajes e terreno tapam; de cima vê até 4 layers
  para baixo). Modo caverna: raio 2 × (mod. Concentração + 1), tocha 1,5×, lanterna em cone de 2N.
- **Paredes finas:** a borda entre um bloco e o vazio é parede; paredes internas ficam em `mapa.muros`
  ("x,y,layer,h|v"). Barram o andar e a visão (quem voa passa por cima).
- **Névoa e textos:** `mapa.nevoa` ("x,y") e `mapa.textos` (etiquetas e textos corridos, até 50 caracteres).
- **Mestre:** todas as ferramentas, olho "ver como" (jogador ou NPC), área limitada por jogador (clique no zoom),
  olho fechado nos tokens que nenhum jogador vê.
- **Arquivo `.dbomapa`:** JSON legível, uma linha de texto por linha do mapa e por layer (versão 2). O cabeçalho do
  `mapa.js` documenta o formato.
- **Gravação na sessão:** o mestre grava o mapa inteiro (versão nova a cada mudança); tokens são linhas
  separadas, gravadas na hora (cópia otimista por 4 s para o poll não "puxar de volta").

---

## 7. Convenções

- **Nomes:** os termos do jogo ficam sempre em português e com o nome que o jogador vê (`rugirDoDragao`,
  `pdAtual`, `maestria`, `tecnicas`, colunas do banco). Nomes técnicos genéricos podem ficar em inglês (`render`,
  `save`, `el`, módulos como `DBOSheet`). Um nome descreve o que a coisa **é**: nada de `pd` guardando uma habilidade
  ou `mult` guardando o tipo de dano.
- **Valores atuais:** HP, KP e PD atuais vazios (`null` ou `""`) valem "cheio"; leia sempre com `R.hpAtual(c)`,
  `R.kpAtual(c)` e `R.pdAtual(c)`, nunca `c.hpAtual` direto.
- **Comentários** explicam o *porquê* e a regra de jogo.
- **Regras num lugar só:** número do sistema mudou? Mexa em `rules.js` (fórmulas) ou no `*-data.js` (conteúdo).
- **Sem bibliotecas externas:** a CSP (`script-src 'self'`) bloqueia CDN. Qualquer biblioteca precisa ser copiada
  para `js/` e revisada.
- **Cache:** ao mudar um script ou CSS muito usado, suba o `?v=NN` nas páginas que o carregam.
- **Migrações:** nunca edite uma migração já publicada; crie a próxima em `banco/migracoes/` (`migracao-NN.sql`) e acrescente o mesmo
  trecho ao final do `schema.sql`.
- **Acessibilidade:** botões com `aria-label`, foco visível, alvos de toque ≥ 44 px, `prefers-reduced-motion`.

### Testes
Os testes rodam com Playwright (Python) contra o servidor local, no modo local: cada script preenche o
`localStorage` (contas, fichas, sessão, mapa), executa o fluxo e confere o resultado e as capturas de tela. O prato
3D tem ainda um teste de física: centenas de rolagens conferindo que nenhum dado atravessa o prato e que o valor
sorteado sempre termina na face de cima.

---

## 8. Próximos passos

- Fotos no Storage (hoje vão como texto na tabela).
- Feedback pelo banco (hoje por e-mail).
- Travar os números da ficha com funções `security definer` em vez de `update` direto.
- Sistema de Naves e de Descanso e Refeição (já escritos, entrando no guia de regras).

---

## Aviso

Projeto de fã, sem fins lucrativos e sem vínculo oficial. **Dragon Ball** e seus personagens pertencem a Akira
Toriyama, Bird Studio, Shueisha e Toei Animation. O sistema Dragon Ball Omega (regras, textos e código) é criação
própria.

Desenvolvido por **Vinicius Balchuna** (Análise e Desenvolvimento de Sistemas — Fatec São Paulo), com o auxílio de
IA (Claude) na escrita do código.
