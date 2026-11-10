-- Dragon Ball Omega — migração 07: modo de visualização da ficha (clássico ou como nos artefatos), no botão "Personalizar".
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema). Rode a migração 06 antes.
-- visualizacao_modelo: '' (clássico) ou 'artefato'.
alter table personagens add column if not exists visualizacao_modelo text;
alter table personagens drop constraint if exists personagens_visualizacao_modelo_ck;
alter table personagens add constraint personagens_visualizacao_modelo_ck check (visualizacao_modelo is null or visualizacao_modelo in ('', 'artefato'));
