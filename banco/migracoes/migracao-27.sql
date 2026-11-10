-- Dragon Ball Omega — migração 27: layers (andares) no mapa da sessão.
--   sessao_tokens.layer   em que layer o token está (1 = chão; 0 = embaixo; 2 = em cima; e assim por diante).
--   Os jogadores não põem mais tokens no mapa: só o mestre põe (arrastando da lista de Jogadores/NPCs).
--   O jogador continua movendo o token do próprio personagem que já está no mapa.
--   (O mapa em si — layers, escadas e a área de cada jogador — fica no JSON de sessao_mapa.dados.)
-- Pode ser repetida sem problema. Rode depois da 26.

alter table sessao_tokens add column if not exists layer integer not null default 1 check (layer between -50 and 50);

-- O "upsert" do jogador (mover) passa pela regra de inserir: ela só deixa quando o token já existe.
drop policy if exists stok_jog_ins on sessao_tokens;
create policy stok_jog_ins on sessao_tokens for insert to authenticated
  with check (eh_membro_sessao() and personagem_id is not null and eh_dono_personagem(personagem_id) and id = 'p:' || personagem_id::text
              and exists (select 1 from sessao_tokens t where t.id = 'p:' || personagem_id::text));
