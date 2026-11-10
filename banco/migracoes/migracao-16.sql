-- Dragon Ball Omega — migração 16: Bestiário igual aos Planetas.
--   bestiario_pastas.pai_id   pastas dentro de pastas (como nos planetas).
--   bestiario_pastas.nome     deixa de ser único (duas subpastas podem ter o mesmo nome em lugares diferentes).
--   criaturas.imagens         várias imagens por ser (carrossel), como nos planetas.
-- Pode ser repetida sem problema. Rode depois da 15.

alter table bestiario_pastas add column if not exists pai_id uuid references bestiario_pastas(id) on delete cascade;
alter table bestiario_pastas drop constraint if exists bestiario_pastas_nome_key;

alter table criaturas add column if not exists imagens jsonb not null default '[]'::jsonb;
update criaturas set imagens = jsonb_build_array(imagem_url) where imagem_url is not null and imagem_url <> '' and imagens = '[]'::jsonb;

-- O limite de 500 KB por imagem passa a valer também para a lista de imagens dos seres.
drop trigger if exists trg_img_criaturas on criaturas;
create trigger trg_img_criaturas before insert or update on criaturas for each row execute function checar_imagens('imagem_url', 'imagens');
