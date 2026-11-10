-- Dragon Ball Omega — migração 22: mapa da sessão e tokens dos personagens.
--   sessao_mapa     uma linha só (id = 1) com o mapa que o mestre importou para a sessão (dados em JSON:
--                   blocos, imagem de fundo, grade e a borda do mapa). versao muda a cada gravação: os jogadores
--                   só baixam o mapa de novo quando ela muda. Só o mestre grava; quem está na sessão lê.
--   sessao_tokens   tokens no mapa. Token de personagem: id = 'p:' || personagem_id (um por personagem).
--                   O jogador põe e move só o token do próprio personagem; o mestre faz tudo (inclusive tirar).
--                   Quando o jogador sai (ou é tirado) da sessão, o token dele some.
-- Pode ser repetida sem problema. Rode depois da 21.

create table if not exists sessao_mapa (
  id             smallint primary key default 1 check (id = 1),
  dados          jsonb,
  versao         bigint not null default 0,
  atualizado_em  timestamptz not null default now()
);
insert into sessao_mapa (id, dados, versao) values (1, null, 0) on conflict (id) do nothing;

create table if not exists sessao_tokens (
  id             text primary key check (char_length(id) between 1 and 80),
  personagem_id  uuid unique references personagens(id) on delete cascade,
  x              integer not null,
  y              integer not null,
  cor            text not null default '#E0455A' check (char_length(cor) <= 40),
  rot            text not null default '' check (char_length(rot) <= 8),
  atualizado_em  timestamptz not null default now()
);

alter table sessao_mapa enable row level security;
alter table sessao_tokens enable row level security;

drop policy if exists smapa_ler on sessao_mapa;
drop policy if exists smapa_mestre on sessao_mapa;
create policy smapa_ler on sessao_mapa for select to authenticated using (eh_mestre() or eh_membro_sessao());
create policy smapa_mestre on sessao_mapa for all to authenticated using (eh_mestre()) with check (eh_mestre());

drop policy if exists stok_ler on sessao_tokens;
drop policy if exists stok_mestre on sessao_tokens;
drop policy if exists stok_jog_ins on sessao_tokens;
drop policy if exists stok_jog_upd on sessao_tokens;
create policy stok_ler on sessao_tokens for select to authenticated using (eh_mestre() or eh_membro_sessao());
create policy stok_mestre on sessao_tokens for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy stok_jog_ins on sessao_tokens for insert to authenticated
  with check (eh_membro_sessao() and personagem_id is not null and eh_dono_personagem(personagem_id) and id = 'p:' || personagem_id::text);
create policy stok_jog_upd on sessao_tokens for update to authenticated
  using (eh_membro_sessao() and personagem_id is not null and eh_dono_personagem(personagem_id))
  with check (eh_membro_sessao() and personagem_id is not null and eh_dono_personagem(personagem_id) and id = 'p:' || personagem_id::text);

-- Saiu da sessão (ou o mestre tirou): o token do personagem sai do mapa.
create or replace function sessao_tokens_saida() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.personagem_id is not null then delete from sessao_tokens where personagem_id = old.personagem_id; end if;
  return old;
end $$;
drop trigger if exists trg_sessao_tokens_saida on sessao_membros;
create trigger trg_sessao_tokens_saida after delete on sessao_membros for each row execute function sessao_tokens_saida();
