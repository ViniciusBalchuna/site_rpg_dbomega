-- Dragon Ball Omega — migração 25: NPCs do mestre (Campanha > NPCs).
--   Um NPC é uma ficha comum da tabela personagens, do mestre, marcada com npc = true.
--   pl_base: Power Level base escolhido pelo mestre (substitui o PL de raça + classe; vazio = raça + classe).
--   NPCs não aparecem na página Personagens nem na lista de jogadores da campanha.
--   As regras de acesso são as mesmas das fichas (o dono, que é o mestre, edita; ninguém mais mexe).
-- Pode ser repetida sem problema. Rode depois da 24.

alter table personagens add column if not exists npc boolean not null default false;
alter table personagens add column if not exists pl_base numeric check (pl_base is null or pl_base >= 0);
create index if not exists personagens_npc on personagens (dono_id) where npc;
