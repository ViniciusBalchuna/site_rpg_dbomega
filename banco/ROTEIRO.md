# Roteiro: ligar o Dragon Ball Omega ao Supabase

O site hoje guarda tudo no `localStorage` (cada navegador tem o seu mundo). O `schema.sql` desta pasta cria o banco; este roteiro mostra a ordem de ligar as peças. Faça um passo, teste, só então o próximo.

## 0. Antes de tudo
1. Crie um projeto em supabase.com (região mais perto de você, ex.: São Paulo).
2. Em **SQL Editor**, cole o `schema.sql` inteiro e rode. Deve terminar sem erro.
   **Já rodou uma versão antiga do `schema.sql`?** Não rode o novo por cima (dá erro). Rode só o `migracoes/migracao-01.sql`, que atualiza o banco existente e pode ser repetido sem problema.
3. Em **Project Settings → API** copie a **Project URL** e a chave **anon / publishable**. Só essas duas vão para o site.
   **Nunca** coloque a `service_role` no site: ela ignora todas as travas.

## 1. Login (Auth)
1. **Authentication → Providers**: deixe e-mail/senha ligado. Para o login com Google, ligue o provider Google (cria o Client ID no Google Cloud) — é o que traz a foto do perfil (`avatar_url`) que ainda falta.
2. **Authentication → Providers → Email**: deixe **Confirm email** LIGADO. Assim o cadastro manda o e-mail de confirmação e quem não confirmou nem consegue entrar. O `schema.sql` ainda trava no banco: personagem só é criado por quem tem e-mail confirmado. Em **Authentication → Email Templates** você pode traduzir o texto do e-mail.
3. **Authentication → URL Configuration**: Site URL = o endereço do site (ex.: `https://seu-site.workers.dev`) (e `http://localhost:xxxx` para testar).
4. No site, preencha `url` e `key` em `js/supabase-config.js` (só a chave pública). Com isso o `js/auth.js` já troca sozinho do modo local para o Supabase: cadastro com e-mail de confirmação, login só para quem confirmou, botão de reenviar e retorno do link. O PBKDF2 local deixa de existir: o hash (bcrypt) fica no Supabase.
5. O `_headers` já libera `*.supabase.co` no CSP (conexão e imagens). Se usar domínio próprio no Supabase, ajuste.

## 2. Virar mestre
Cadastros novos são `jogador`. Para promover (SQL Editor):
```sql
update perfis set papel = 'mestre' where email = 'seu-email@exemplo.com';
```
Troque `DBORoles.isMaster()` (js/papeis.js) para ler `perfis.papel`. A lista `mestresLocais` (do `supabase-config.js`) só vale no modo local. A partir daí a trava é **do banco** (RLS), não só dos botões.

## 3. Trocar os módulos locais, um por vez
Com a URL e a chave em `js/supabase-config.js`, o site já troca sozinho do modo local para o Supabase. Cada peça abaixo usa a tabela indicada. **Situação atual:**

| Peça do site | Tabelas | Situação |
|---|---|---|
| Login e e-mail de confirmação (`DBOAuth`) | Supabase Auth + `perfis` | pronto |
| Papel de mestre (`DBORoles`) | `perfis.papel` | pronto |
| Fichas (`DBOCharacters`): atributos, TP, Zenis, HP/KP | `personagens` | pronto |
| Técnicas, equipamentos e habilidades | `habilidades`, `habilidade_dados`, `tecnicas_aprendidas`, `inventario` | pronto (aprender técnica usa a função `aprender_tecnica`) |
| Transformações | `transformacoes` + `personagens.transformacao_ativa` | pronto |
| Mestre vendo as fichas de todos | RLS (só leitura) | pronto |
| Campanha e Jogadores (`DBOCampaign`) | `personagens.na_campanha` + view `jogadores_publico` | pronto |
| Combate (`DBOCombat`) | `combates`, `combatentes` | pronto |
| Enciclopédia (`DBOEnc`) | `bestiario_pastas`, `criaturas`, `planeta_pastas`, `planetas`, `cartazes` | pronto |
| Feedback (1 por hora) | `feedback` | falta (hoje vai por e-mail) |

**Como testar o que já está pronto:** crie a conta, confirme o e-mail, crie um personagem, mexa na ficha (Zenis, técnica, equipamento, transformação) e abra a ficha no celular com a mesma conta. Tudo tem que aparecer igual. Com a conta do mestre, a seção "Fichas dos jogadores" mostra as dos outros, só para olhar.

**Se der erro de permissão ao criar personagem:** rode o `migracoes/migracao-01.sql` de novo (ele cria o perfil das contas feitas antes do banco) e confira se o e-mail foi confirmado.

**Fotos:** por enquanto a foto do personagem é guardada como texto na própria tabela (`foto_url`). Funciona, mas o ideal é mandar para o Storage numa próxima etapa.

## 4. Migrar o que já existe
Dados do `localStorage` não sobem sozinhos. Para poucas fichas, o mais seguro é recriar. Se quiser migrar, faça um botão temporário "Enviar minhas fichas" que leia `dbo-characters` e chame os `insert`/RPCs acima.

## 5. Fotos (Storage)
O `schema.sql` já cria o bucket `fotos` com a regra "cada pessoa só mexe na própria pasta". Suba o recorte do `DBOCropper` (blob) em `fotos/<user-id>/<arquivo>.jpg` e guarde a URL em `personagens.foto_url` / `perfis.foto_url`. Limite o tamanho (ex.: 1 MB) no bucket.

Imagens opcionais de criaturas, planetas e cartazes também vão para o bucket `fotos` (`<user-id>/...`), e a URL fica em `imagem_url`. No site, `DBOEnc.imageField` hoje guarda a imagem reduzida (640 px) em texto no navegador; troque por upload no Storage.

## 6. Testes de segurança antes de abrir pra todo mundo
- Com a conta de **mestre**: deve ler todas as fichas, técnicas, equipamentos e transformações, mas qualquer `update`/`insert` nelas deve falhar (mestre é só leitura nas fichas dos outros).
- Com **outra conta de jogador**: tente ler a ficha de alguém (`select * from personagens`) → deve vir vazio; abrir `/personagem.html?id=` alheio → "não encontrado".
- Jogador tentando criar criatura/planeta/cartaz da Patrulha → deve falhar.
- Segundo feedback na mesma hora → deve falhar.
- Segundo personagem com `na_campanha = true` na mesma conta → deve falhar.
- Em **Authentication → Policies**, confira que todas as tabelas mostram RLS ligado.

## 7. Limites conhecidos (decida depois)
- O dono do personagem pode editar os próprios números (`zeni`, `tp_atuais`, `hp_atual`…) por RLS. Num grupo de amigos é aceitável; para travar de verdade, mova essas mudanças para funções (`security definer`) como `aprender_tecnica` e tire o `update` direto.
- PL, HP, KP, RD e maestria **não** ficam no banco: são calculados pelo site. O mestre vê o mesmo número porque usa a mesma regra (`js/rules.js`, `js/habilidades.js`).
- Remova o `noindex` e o `robots.txt` restritivo só quando for lançar.
