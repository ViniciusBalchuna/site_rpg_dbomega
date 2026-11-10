-- Dragon Ball Omega — migração 06: personalização da ficha (botão "Personalizar").
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema).
-- ficha_modelo: '' (clássica), 'nz1', 'nz2', 'gue', 'pat' ou 'len'.   atributos_modelo: '' (esfera), 'grafico' ou 'sonar'.
alter table personagens add column if not exists ficha_modelo text;
alter table personagens add column if not exists atributos_modelo text;
alter table personagens drop constraint if exists personagens_ficha_modelo_ck;
alter table personagens add constraint personagens_ficha_modelo_ck check (ficha_modelo is null or ficha_modelo in ('', 'nz1', 'nz2', 'gue', 'pat', 'len'));
alter table personagens drop constraint if exists personagens_atributos_modelo_ck;
alter table personagens add constraint personagens_atributos_modelo_ck check (atributos_modelo is null or atributos_modelo in ('', 'esfera', 'grafico', 'sonar'));
