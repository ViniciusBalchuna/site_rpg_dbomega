-- Dragon Ball Omega — migração 20: tema da sessão e limpeza do log.
--   sessao_estado   uma linha só (id = 1) com o tema visual da sessão, escolhido pelo mestre na aba Temas.
--                   Todos leem; só o mestre grava. Temas: '' (Namizureka), mar, caverna, palacio, mata.
--   O mestre já podia apagar mensagens do log (política sl_mestre_del da migração 19): a lixeira e "Limpar log" usam ela.
-- Pode ser repetida sem problema. Rode depois da 19.

create table if not exists sessao_estado (
  id             smallint primary key default 1 check (id = 1),
  tema           text not null default '' check (tema in ('', 'mar', 'caverna', 'palacio', 'mata', 'tribo', 'ceu', 'espaco', 'torneio')),
  atualizado_em  timestamptz not null default now()
);
insert into sessao_estado (id, tema) values (1, '') on conflict (id) do nothing;

alter table sessao_estado enable row level security;
drop policy if exists se_ler on sessao_estado;
drop policy if exists se_mestre on sessao_estado;
create policy se_ler on sessao_estado for select to authenticated using (true);
create policy se_mestre on sessao_estado for all to authenticated using (eh_mestre()) with check (eh_mestre());
