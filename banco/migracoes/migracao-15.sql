-- Dragon Ball Omega — migração 15: Pontos do Dragão e transformações novas.
--   personagens.pd_atual   Pontos do Dragão atuais (o máximo é calculado pelo nível: 1 + 1 a cada 25 níveis). Vazio = cheio.
--   transformacoes.usos    quantas vezes a transformação foi ativada (a maestria sobe com isso).
--   transformacoes.mult_pl aumenta o tamanho: as transformações novas chegam a ×50.000.000.
-- Pode ser repetida sem problema. Rode depois da 14.

alter table personagens add column if not exists pd_atual int;
alter table personagens drop constraint if exists personagens_pd_atual_ck;
alter table personagens add constraint personagens_pd_atual_ck check (pd_atual is null or pd_atual between 0 and 9);

alter table transformacoes add column if not exists usos int not null default 0;
alter table transformacoes drop constraint if exists transformacoes_usos_ck;
alter table transformacoes add constraint transformacoes_usos_ck check (usos >= 0);
alter table transformacoes alter column mult_pl type numeric(16,2);
