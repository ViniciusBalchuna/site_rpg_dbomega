-- Dragon Ball Omega — migração 18: Fúria do Berserker.
--   personagens.furia_atual   Fúria atual (o máximo é 5, ou 10 a partir do nível 90). Vazio = 0.
-- Pode ser repetida sem problema. Rode depois da 17.

alter table personagens add column if not exists furia_atual int;
alter table personagens drop constraint if exists personagens_furia_atual_ck;
alter table personagens add constraint personagens_furia_atual_ck check (furia_atual is null or furia_atual between 0 and 10);
