-- Dragon Ball Omega — migração 13: modo de visualização "Navegação" e modelo de atributos "Esfera lisa" (botão "Personalizar").
-- visualizacao_modelo passa a aceitar 'navegacao' e atributos_modelo passa a aceitar 'lisa'. Pode ser repetida sem problema. Rode depois da 12.

alter table personagens drop constraint if exists personagens_visualizacao_modelo_ck;
alter table personagens add constraint personagens_visualizacao_modelo_ck check (visualizacao_modelo is null or visualizacao_modelo in ('', 'artefato', 'navegacao'));
alter table personagens drop constraint if exists personagens_atributos_modelo_ck;
alter table personagens add constraint personagens_atributos_modelo_ck check (atributos_modelo is null or atributos_modelo in ('', 'esfera', 'grafico', 'sonar', 'lisa'));
