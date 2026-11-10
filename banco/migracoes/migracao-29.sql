-- Dragon Ball Omega — migração 29: nível até 200 no banco.
--   O site sempre aceitou até o nível 200 (DBOData.MAX_LEVEL), mas a tabela parava no 100: salvar uma ficha acima do
--   nível 100 dava erro no Supabase. Agora o nível também pode ser editado direto na ficha (modo Editar).
-- Pode ser repetida sem problema. Rode depois da 28.

alter table personagens drop constraint if exists personagens_nivel_check;
alter table personagens add constraint personagens_nivel_check check (nivel between 1 and 200);
