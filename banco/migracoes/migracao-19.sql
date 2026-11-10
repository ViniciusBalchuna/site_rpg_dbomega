-- Dragon Ball Omega — migração 19: Sessão da campanha (a antiga página Combate).
--   sessao_membros   quem está na sessão (ou pediu para entrar). status: pendente | aceito | rejeitado.
--                    Rejeitado fica bloqueado (bloqueado_ate) por 2 minutos antes de poder pedir de novo.
--   sessao_log       log da sessão: mensagens (todos leem), rolagens, técnicas usadas e avisos do sistema (só o mestre lê).
--                    O nome de quem escreveu vem do perfil (perfis.nome), preenchido pelo banco.
--   sessao_notas     anotações (Markdown) de cada jogador; apagadas quando ele sai da sessão.
--   pedir_sessao(personagem)          o jogador pede para entrar (precisa ter nome de exibição).
--   responder_sessao(usuario, aceitar) o mestre aceita ou rejeita.
--   sair_sessao()                     o jogador sai: deixa a sessão, o combate ativo e perde as anotações.
--   fixar_log(id, fixar)              o mestre fixa (uma por vez) ou desfixa uma mensagem.
-- Pode ser repetida sem problema. Rode depois da 18.

create table if not exists sessao_membros (
  usuario_id     uuid primary key references perfis(id) on delete cascade,
  personagem_id  uuid references personagens(id) on delete cascade,
  nome           text not null default 'Jogador',
  status         text not null default 'pendente' check (status in ('pendente','aceito','rejeitado')),
  bloqueado_ate  timestamptz,
  criado_em      timestamptz not null default now()
);

create table if not exists sessao_log (
  id          bigint generated always as identity primary key,
  autor_id    uuid default auth.uid() references perfis(id) on delete set null,
  autor_nome  text not null default 'Jogador',
  tipo        text not null default 'msg' check (tipo in ('msg','rolagem','uso','sistema')),
  texto       text not null default '' check (char_length(texto) <= 2000),
  dados       jsonb not null default '{}'::jsonb,
  so_mestre   boolean not null default false,
  fixada      boolean not null default false,
  criado_em   timestamptz not null default now()
);
create index if not exists sessao_log_uso on sessao_log ((dados ->> 'combate')) where tipo = 'uso';

create table if not exists sessao_notas (
  usuario_id     uuid primary key default auth.uid() references perfis(id) on delete cascade,
  conteudo       text not null default '' check (char_length(conteudo) <= 4000000),
  atualizado_em  timestamptz not null default now()
);

-- Está na sessão (aceito)?
create or replace function eh_membro_sessao() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessao_membros where usuario_id = auth.uid() and status = 'aceito');
$$;

-- Autor e nome do log vêm do banco (ninguém escreve em nome de outro). Mensagens do sistema assinam "Sistema".
create or replace function sessao_log_autor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := auth.uid();
  new.fixada := false;
  if new.tipo = 'sistema' then new.autor_nome := 'Sistema';
  else new.autor_nome := coalesce((select nullif(trim(nome), '') from perfis where id = auth.uid()), 'Jogador');
  end if;
  -- rolagens, usos e sistema são sempre só do mestre
  if new.tipo <> 'msg' then new.so_mestre := true; end if;
  new.criado_em := now();
  return new;
end $$;
drop trigger if exists trg_sessao_log_autor on sessao_log;
create trigger trg_sessao_log_autor before insert on sessao_log for each row execute function sessao_log_autor();

create or replace function pedir_sessao(p_personagem uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v sessao_membros%rowtype; v_nome text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro.' using errcode = 'P0001'; end if;
  if not eh_dono_personagem(p_personagem) then raise exception 'Esse personagem não é seu.' using errcode = 'P0001'; end if;
  select nullif(trim(nome), '') into v_nome from perfis where id = auth.uid();
  if v_nome is null then raise exception 'Você não possui um nome ainda. Escolha um para entrar na sessão.' using errcode = 'P0001'; end if;
  select * into v from sessao_membros where usuario_id = auth.uid();
  if found and v.status = 'aceito' then return; end if;
  if found and v.status = 'rejeitado' and v.bloqueado_ate > now() then
    raise exception 'O mestre recusou seu pedido. Espere um pouco para pedir de novo.' using errcode = 'P0001';
  end if;
  insert into sessao_membros (usuario_id, personagem_id, nome, status, bloqueado_ate, criado_em)
  values (auth.uid(), p_personagem, left(v_nome, 30), 'pendente', null, now())
  on conflict (usuario_id) do update
    set personagem_id = excluded.personagem_id, nome = excluded.nome, status = 'pendente', bloqueado_ate = null, criado_em = now();
end $$;

create or replace function responder_sessao(p_usuario uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_mestre() then raise exception 'Só o mestre responde os pedidos.' using errcode = 'P0001'; end if;
  update sessao_membros
     set status = case when p_aceitar then 'aceito' else 'rejeitado' end,
         bloqueado_ate = case when p_aceitar then null else now() + interval '2 minutes' end
   where usuario_id = p_usuario;
end $$;

create or replace function sair_sessao() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from combatentes
   where personagem_id in (select id from personagens where dono_id = auth.uid())
     and combate_id in (select id from combates where ativo);
  delete from sessao_notas where usuario_id = auth.uid();
  delete from sessao_membros where usuario_id = auth.uid();
end $$;

create or replace function fixar_log(p_id bigint, p_fixar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_mestre() then raise exception 'Só o mestre fixa mensagens.' using errcode = 'P0001'; end if;
  if p_fixar then update sessao_log set fixada = false where fixada and id <> p_id; end if;
  update sessao_log set fixada = p_fixar where id = p_id;
end $$;

revoke all on function pedir_sessao(uuid), responder_sessao(uuid, boolean), sair_sessao(), fixar_log(bigint, boolean) from public, anon;
grant execute on function pedir_sessao(uuid), responder_sessao(uuid, boolean), sair_sessao(), fixar_log(bigint, boolean) to authenticated;

alter table sessao_membros enable row level security;
alter table sessao_log enable row level security;
alter table sessao_notas enable row level security;

drop policy if exists sm_ler on sessao_membros;
drop policy if exists sm_mestre_upd on sessao_membros;
drop policy if exists sm_mestre_del on sessao_membros;
create policy sm_ler on sessao_membros for select to authenticated using (true);
create policy sm_mestre_upd on sessao_membros for update to authenticated using (eh_mestre()) with check (eh_mestre());
create policy sm_mestre_del on sessao_membros for delete to authenticated using (eh_mestre());

drop policy if exists sl_ler on sessao_log;
drop policy if exists sl_ins on sessao_log;
drop policy if exists sl_mestre_upd on sessao_log;
drop policy if exists sl_mestre_del on sessao_log;
create policy sl_ler on sessao_log for select to authenticated using (not so_mestre or eh_mestre());
create policy sl_ins on sessao_log for insert to authenticated with check (eh_mestre() or eh_membro_sessao());
create policy sl_mestre_upd on sessao_log for update to authenticated using (eh_mestre()) with check (eh_mestre());
create policy sl_mestre_del on sessao_log for delete to authenticated using (eh_mestre());

drop policy if exists sn_dono on sessao_notas;
create policy sn_dono on sessao_notas for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
