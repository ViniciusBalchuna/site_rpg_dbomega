-- Dragon Ball Omega — migração 21: temas novos da sessão (Tribo, Céu, Espaço e Torneio).
-- Só amplia a lista de temas aceitos em sessao_estado.tema. Pode ser repetida sem problema. Rode depois da 20.

alter table sessao_estado drop constraint if exists sessao_estado_tema_check;
alter table sessao_estado add constraint sessao_estado_tema_check
  check (tema in ('', 'mar', 'caverna', 'palacio', 'mata', 'tribo', 'ceu', 'espaco', 'torneio'));
