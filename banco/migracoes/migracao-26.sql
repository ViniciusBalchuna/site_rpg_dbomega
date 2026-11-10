-- Dragon Ball Omega — migração 26: tamanho dos NPCs e NPCs na sessão.
--   personagens.tamanho   tamanho do NPC no mapa: pequeno, medio, grande, enorme, colossal ou um número N (N×N blocos).
--                         Vazio = normal (1 bloco).
--   sessao_npcs           NPCs que o mestre pôs na sessão. Guarda nome, foto e tamanho para os jogadores verem
--                         o token no mapa (eles não leem a ficha do mestre). Só o mestre põe e tira.
--                         Quando o NPC sai da sessão, o token dele sai do mapa.
-- Pode ser repetida sem problema. Rode depois da 25.

alter table personagens add column if not exists tamanho text check (tamanho is null or char_length(tamanho) <= 12);

create table if not exists sessao_npcs (
  personagem_id  uuid primary key references personagens(id) on delete cascade,
  nome           text not null default 'NPC' check (char_length(nome) <= 60),
  foto           text,
  tamanho        text not null default 'normal' check (char_length(tamanho) <= 12),
  criado_em      timestamptz not null default now()
);
alter table sessao_npcs enable row level security;
drop policy if exists snpc_ler on sessao_npcs;
drop policy if exists snpc_mestre on sessao_npcs;
create policy snpc_ler on sessao_npcs for select to authenticated using (eh_mestre() or eh_membro_sessao());
create policy snpc_mestre on sessao_npcs for all to authenticated using (eh_mestre()) with check (eh_mestre());

create or replace function sessao_npcs_saida() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from sessao_tokens where personagem_id = old.personagem_id;
  return old;
end $$;
drop trigger if exists trg_sessao_npcs_saida on sessao_npcs;
create trigger trg_sessao_npcs_saida after delete on sessao_npcs for each row execute function sessao_npcs_saida();
