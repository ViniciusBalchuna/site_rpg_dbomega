-- Dragon Ball Omega — migração 28: tocha e lanterna no modo caverna do mapa da sessão.
--   sessao_tokens.luz    '' (nenhuma), 'tocha' (visão 1,5× maior) ou 'lanterna' (cone de 2N blocos).
--   sessao_tokens.mira   direção da lanterna, em radianos (0 = para a direita).
--   (Os interruptores "Sombras" e "Modo caverna" ficam no JSON de sessao_mapa.dados.)
-- Pode ser repetida sem problema. Rode depois da 27.

alter table sessao_tokens add column if not exists luz text not null default '' check (luz in ('', 'tocha', 'lanterna'));
alter table sessao_tokens add column if not exists mira real;
