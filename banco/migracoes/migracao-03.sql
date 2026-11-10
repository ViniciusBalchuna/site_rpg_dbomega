-- Dragon Ball Omega — migração 03: várias imagens por planeta.
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema).
alter table planetas add column if not exists imagens jsonb not null default '[]'::jsonb;
-- Planetas antigos: a imagem única vira a primeira da lista.
update planetas set imagens = jsonb_build_array(imagem_url) where imagem_url is not null and imagem_url <> '' and imagens = '[]'::jsonb;
