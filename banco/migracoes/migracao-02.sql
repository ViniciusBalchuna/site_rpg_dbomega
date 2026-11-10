-- Dragon Ball Omega — migração 02: missões do personagem, cartaz anônimo com Zenis e bônus das transformações.
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema). Depois dela, publique os arquivos novos do site.

-- 1. Missões que cada personagem pegou ------------------------------------------------
create table if not exists missoes_personagem (
  personagem_id uuid not null references personagens(id) on delete cascade,
  cartaz_id     uuid not null references cartazes(id)    on delete cascade,   -- cartaz apagado = missão some da ficha
  criado_em     timestamptz not null default now(),
  primary key (personagem_id, cartaz_id)
);
alter table missoes_personagem enable row level security;
drop policy if exists mp_ler on missoes_personagem;
drop policy if exists mp_ins on missoes_personagem;
drop policy if exists mp_del on missoes_personagem;
create policy mp_ler on missoes_personagem for select to authenticated using (pode_ver_personagem(personagem_id));
create policy mp_ins on missoes_personagem for insert to authenticated with check (eh_dono_personagem(personagem_id));
create policy mp_del on missoes_personagem for delete to authenticated using (eh_dono_personagem(personagem_id));

-- 2. Cartaz anônimo agora custa Zenis: só nasce pela função abaixo (que cobra do personagem). --
drop policy if exists car_ins on cartazes;
create policy car_ins on cartazes for insert to authenticated
  with check (autor_id = auth.uid() and secao = 'patrulha' and eh_mestre());

create or replace function criar_cartaz_anonimo(p_personagem uuid, p_alvo text, p_recompensa bigint,
  p_imagem text, p_descricao text, p_localizacao text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_zeni bigint; v_id uuid;
begin
  if not email_confirmado() then raise exception 'Confirme seu e-mail primeiro.'; end if;
  select zeni into v_zeni from personagens where id = p_personagem and dono_id = auth.uid() for update;
  if not found then raise exception 'Personagem não encontrado.'; end if;
  if p_recompensa is null or p_recompensa < 1 then raise exception 'Coloque pelo menos 1 Zeni na recompensa.'; end if;
  if p_recompensa > v_zeni then raise exception 'Zenis insuficientes: o personagem tem %.', v_zeni; end if;
  update personagens set zeni = zeni - p_recompensa where id = p_personagem;
  insert into cartazes (secao, autor_id, alvo, imagem_url, recompensa, descricao, localizacao)
    values ('anonima', auth.uid(), p_alvo, nullif(p_imagem, ''), p_recompensa, coalesce(p_descricao, ''), coalesce(p_localizacao, ''))
    returning id into v_id;
  return v_id;
end $$;

-- 3. Concluir missão: paga a recompensa ao personagem e apaga o cartaz. Devolve os Zenis novos. ----
create or replace function concluir_missao(p_personagem uuid, p_cartaz uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_rec bigint; v_zeni bigint;
begin
  if not exists (select 1 from personagens where id = p_personagem and dono_id = auth.uid()) then
    raise exception 'Esse personagem não é seu.';
  end if;
  if not exists (select 1 from missoes_personagem where personagem_id = p_personagem and cartaz_id = p_cartaz) then
    raise exception 'Esse personagem não pegou esta missão.';
  end if;
  select recompensa into v_rec from cartazes where id = p_cartaz for update;
  if not found then raise exception 'Esse cartaz não existe mais.'; end if;
  update personagens set zeni = zeni + v_rec where id = p_personagem returning zeni into v_zeni;
  delete from cartazes where id = p_cartaz;      -- as missões dos outros personagens somem junto (cascade)
  return v_zeni;
end $$;

revoke all on function criar_cartaz_anonimo(uuid, text, bigint, text, text, text) from public, anon;
revoke all on function concluir_missao(uuid, uuid) from public, anon;
grant execute on function criar_cartaz_anonimo(uuid, text, bigint, text, text, text) to authenticated;
grant execute on function concluir_missao(uuid, uuid) to authenticated;

-- 4. Transformações aprendidas: de qual item do catálogo vieram + bônus em testes e em danos -----
alter table transformacoes add column if not exists catalogo_id text;
alter table transformacoes add column if not exists bonus_teste int not null default 0;
alter table transformacoes add column if not exists bonus_dano  int not null default 0;

-- 5. Conferência rápida (deve listar as 2 funções e a tabela) ------------------------------------
select proname from pg_proc where proname in ('criar_cartaz_anonimo', 'concluir_missao') order by 1;
select to_regclass('public.missoes_personagem') as missoes_personagem;
