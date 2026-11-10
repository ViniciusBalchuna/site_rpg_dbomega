-- Dragon Ball Omega — migração 24: relevo no mapa da sessão (voar, submergir) e cor da borda do token.
--   voando    o token está voando (pode subir em lugar alto; não sofre efeito de lugar baixo nem de água)
--   submerso  o token mergulhou num bloco de água (sai sozinho quando deixa a água)
--   borda     cor da borda do token escolhida pelo jogador (vazio = prateada)
-- O jogador já podia mudar o próprio token (migração 22); estas colunas seguem as mesmas regras.
-- Pode ser repetida sem problema. Rode depois da 23.

alter table sessao_tokens add column if not exists voando boolean not null default false;
alter table sessao_tokens add column if not exists submerso boolean not null default false;
alter table sessao_tokens add column if not exists borda text check (borda is null or char_length(borda) <= 60);
