-- Dragon Ball Omega — migração 14: a classe "Curandeiro" passa a se chamar "Suporte".
-- Troca o nome nas fichas que já existem e atualiza a regra da coluna classe. Pode ser repetida sem problema. Rode depois da 13.
-- (As habilidades de sub-classe ficam na mesma coluna habilidades_classe: não precisa de coluna nova.)

alter table personagens drop constraint if exists personagens_classe_check;
alter table personagens drop constraint if exists personagens_classe_ck;
update personagens set classe = 'Suporte' where classe = 'Curandeiro';
alter table personagens add constraint personagens_classe_ck check (classe in ('Guerreiro', 'Monge', 'Artífice', 'Suporte'));
