-- =====================================================================
-- Dragon Ball Omega — MIGRAÇÃO para quem já rodou uma versão antiga do schema.sql
-- Rode este arquivo (e SÓ ele) no SQL Editor do banco que você já criou. Pode rodar mais de uma vez: ele é idempotente.
-- NÃO rode o schema.sql de novo nesse banco (dá erro: tipos, domínio e políticas já existem).
-- O que ele traz: transformações, imagens opcionais (criaturas/planetas/cartazes), confirmação de e-mail
-- para criar personagem, mestre só leitura nas fichas dos outros.
-- =====================================================================

-- 1. Tabelas e colunas novas ------------------------------------------------
create table if not exists transformacoes (
  id            uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references personagens(id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 60),
  descricao     text not null default '' check (char_length(descricao) <= 500),
  requisito     text not null default '' check (char_length(requisito) <= 120),
  mult_pl       numeric(8,2) not null default 1 check (mult_pl >= 1),
  kp_por_rodada int not null default 0 check (kp_por_rodada >= 0)
);
create index if not exists transformacoes_pers_idx on transformacoes(personagem_id);
alter table transformacoes enable row level security;
alter table personagens add column if not exists transformacao_ativa text;
alter table personagens add column if not exists zeni bigint not null default 2000 check (zeni >= 0);
alter table criaturas add column if not exists imagem_url text;
alter table planetas  add column if not exists imagem_url text;
alter table cartazes  add column if not exists imagem_url text;
alter table habilidades drop constraint if exists habilidades_dado_check;
alter table habilidades add constraint habilidades_dado_check check (dado in ('d3','d4','d6','d8','d10','d12','d20'));
alter table habilidade_dados drop constraint if exists habilidade_dados_dado_check;
alter table habilidade_dados add constraint habilidade_dados_dado_check check (dado in ('d3','d4','d6','d8','d10','d12','d20'));

-- 2. Funções (create or replace: seguro repetir) ---------------------------
create or replace function email_confirmado() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;
-- Quem pode VER um personagem: o dono e o mestre (o mestre enxerga todas as fichas).
-- Quem pode ALTERAR: só o dono. O mestre fica em modo leitura.
create or replace function pode_ver_personagem(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personagens where id = p and (dono_id = auth.uid() or eh_mestre()));
$$;
create or replace function eh_dono_personagem(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from personagens where id = p and dono_id = auth.uid());
$$;

create or replace function aprender_tecnica(p_personagem uuid, p_origem uuid, p_tp int, p_hab jsonb default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pers personagens%rowtype; v_hab uuid; v_pl bigint := 0; v_id uuid; v_src habilidades%rowtype;
begin
  select * into v_pers from personagens where id = p_personagem for update;
  if not found or v_pers.dono_id <> auth.uid() then raise exception 'Personagem não encontrado.'; end if;
  if p_tp < 0 or p_tp > v_pers.tp_atuais then raise exception 'Você só tem % TP atuais.', v_pers.tp_atuais; end if;

  if p_origem is not null then
    select h.* into v_src from tecnicas_padrao t join habilidades h on h.id = t.habilidade_id where t.id = p_origem;
    if not found then raise exception 'Técnica do catálogo não existe.'; end if;
    select pl_bonus into v_pl from tecnicas_padrao where id = p_origem;
    insert into habilidades (dono_personagem_id, nome, descricao, qtd, dado, modificador, fixo, tipo, efeitos)
    values (p_personagem, v_src.nome, v_src.descricao, v_src.qtd, v_src.dado, v_src.modificador, v_src.fixo, v_src.tipo, v_src.efeitos)
    returning id into v_hab;
    insert into habilidade_dados (habilidade_id, qtd, dado, quando, condicao)
      select v_hab, qtd, dado, quando, condicao from habilidade_dados where habilidade_id = v_src.id;
  else
    if p_hab is null then raise exception 'Faltou descrever a técnica.'; end if;
    insert into habilidades (dono_personagem_id, nome, descricao, qtd, dado, modificador, fixo, tipo, efeitos)
    values (p_personagem, p_hab ->> 'nome', coalesce(p_hab ->> 'descricao',''), coalesce((p_hab ->> 'qtd')::int,1),
            p_hab ->> 'dado', nullif(p_hab ->> 'modificador',''), coalesce((p_hab ->> 'fixo')::int,0),
            (p_hab ->> 'tipo')::tipo_dano,
            coalesce(array(select jsonb_array_elements_text(p_hab -> 'efeitos')), '{}'))
    returning id into v_hab;
    insert into habilidade_dados (habilidade_id, qtd, dado, quando, condicao)
      select v_hab, (e ->> 'qtd')::int, e ->> 'dado', (e ->> 'quando')::quando_dado, coalesce(e ->> 'condicao','')
      from jsonb_array_elements(coalesce(p_hab -> 'extras','[]'::jsonb)) e;
    v_pl := coalesce((p_hab ->> 'pl_bonus')::bigint, 0);
  end if;

  insert into tecnicas_aprendidas (personagem_id, habilidade_id, origem_id, tp_gastos, pl_bonus)
  values (p_personagem, v_hab, p_origem, p_tp, v_pl) returning id into v_id;
  update personagens set tp_atuais = tp_atuais - p_tp, tp_gastos = tp_gastos + p_tp where id = p_personagem;
  insert into tp_movimentos (personagem_id, tipo, delta_atuais, delta_gastos, nota)
  values (p_personagem, 'tecnica', -p_tp, p_tp, 'Aprendeu técnica');
  return v_id;
end $$;


-- 3. Políticas: apaga as antigas e recria ----------------------------------
drop policy if exists tapr_esc on tecnicas_aprendidas;
drop policy if exists inv_esc on inventario;
drop policy if exists trf_esc on transformacoes;

drop policy if exists pers_criar on personagens;
create policy pers_criar  on personagens for insert to authenticated with check (dono_id = auth.uid() and email_confirmado());

drop policy if exists pers_editar on personagens;
create policy pers_editar on personagens for update to authenticated using (dono_id = auth.uid()) with check (dono_id = auth.uid());

drop policy if exists pers_apagar on personagens;
create policy pers_apagar on personagens for delete to authenticated using (dono_id = auth.uid());

drop policy if exists hab_ler on habilidades;
create policy hab_ler    on habilidades for select to authenticated
  using (dono_personagem_id is null or pode_ver_personagem(dono_personagem_id));

drop policy if exists hab_escrever on habilidades;
create policy hab_escrever on habilidades for all to authenticated
  using ((dono_personagem_id is null and eh_mestre()) or (dono_personagem_id is not null and eh_dono_personagem(dono_personagem_id)))
  with check ((dono_personagem_id is null and eh_mestre()) or (dono_personagem_id is not null and eh_dono_personagem(dono_personagem_id)));

drop policy if exists hdados_ler on habilidade_dados;
create policy hdados_ler on habilidade_dados for select to authenticated
  using (exists (select 1 from habilidades h where h.id = habilidade_id and (h.dono_personagem_id is null or pode_ver_personagem(h.dono_personagem_id))));

drop policy if exists hdados_escrever on habilidade_dados;
create policy hdados_escrever on habilidade_dados for all to authenticated
  using (exists (select 1 from habilidades h where h.id = habilidade_id and ((h.dono_personagem_id is null and eh_mestre()) or (h.dono_personagem_id is not null and eh_dono_personagem(h.dono_personagem_id)))))
  with check (exists (select 1 from habilidades h where h.id = habilidade_id and ((h.dono_personagem_id is null and eh_mestre()) or (h.dono_personagem_id is not null and eh_dono_personagem(h.dono_personagem_id)))));

drop policy if exists tapr_ler on tecnicas_aprendidas;
create policy tapr_ler on tecnicas_aprendidas for select to authenticated using (pode_ver_personagem(personagem_id));

drop policy if exists tapr_esc_w on tecnicas_aprendidas;
create policy tapr_esc_w on tecnicas_aprendidas for all to authenticated using (eh_dono_personagem(personagem_id)) with check (eh_dono_personagem(personagem_id));

drop policy if exists inv_ler on inventario;
create policy inv_ler on inventario for select to authenticated using (pode_ver_personagem(personagem_id));

drop policy if exists inv_esc_w on inventario;
create policy inv_esc_w on inventario for all to authenticated using (eh_dono_personagem(personagem_id)) with check (eh_dono_personagem(personagem_id));

drop policy if exists trf_ler on transformacoes;
create policy trf_ler on transformacoes for select to authenticated using (pode_ver_personagem(personagem_id));

drop policy if exists trf_esc_w on transformacoes;
create policy trf_esc_w on transformacoes for all to authenticated using (eh_dono_personagem(personagem_id)) with check (eh_dono_personagem(personagem_id));

drop policy if exists tpm_ler on tp_movimentos;
create policy tpm_ler on tp_movimentos for select to authenticated using (pode_ver_personagem(personagem_id));

drop policy if exists tpm_ins on tp_movimentos;
create policy tpm_ins on tp_movimentos for insert to authenticated with check (eh_dono_personagem(personagem_id));

drop policy if exists cbt_ins on combatentes;
create policy cbt_ins on combatentes for insert to authenticated
  with check (eh_mestre() or (tipo = 'jogador' and eh_dono_personagem(personagem_id)));

drop policy if exists cbt_upd on combatentes;
create policy cbt_upd on combatentes for update to authenticated using (eh_mestre() or eh_dono_personagem(personagem_id)) with check (eh_mestre() or eh_dono_personagem(personagem_id));

drop policy if exists cbt_del on combatentes;
create policy cbt_del on combatentes for delete to authenticated using (eh_mestre() or eh_dono_personagem(personagem_id));


-- Contas criadas ANTES de rodar este arquivo não têm perfil (o gatilho só vale para cadastros novos). Cria os que faltam.
insert into perfis (id, email)
  select id, email from auth.users on conflict (id) do nothing;

-- Campanha: a lista pública agora também informa o dono (para o site saber qual cartão é o seu).
create or replace view jogadores_publico with (security_invoker = false) as
  select id, nome, classe, raca, nivel, foto_url, dono_id from personagens where na_campanha;
grant select on jogadores_publico to authenticated;

-- Corpo Base: vazio (null) = o site calcula pela classe. Antes o banco guardava 0 e a ficha mostrava 0.
alter table personagens alter column corpo_base drop not null;
alter table personagens alter column corpo_base drop default;
update personagens set corpo_base = null where corpo_base = 0;

-- Transformações agora vêm do catálogo do site: a coluna da ativa passa a guardar o ID dele (texto).
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'personagens' and column_name = 'transformacao_ativa' and data_type = 'uuid') then
    alter table personagens drop column transformacao_ativa;   -- só guardava um ponteiro antigo; nada de valor se perde
  end if;
end $$;
alter table personagens add column if not exists transformacao_ativa text;

-- Nome de exibição e foto do Google: o gatilho que cria o perfil passa a copiar os dois.
create or replace function criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, email, nome, foto_url)
  values (new.id, new.email,
          nullif(left(coalesce(new.raw_user_meta_data ->> 'nome_exibicao', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 30), ''),
          coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'))
  on conflict (id) do nothing;
  return new;
end $$;

-- 4. Conferência rápida (deve listar as 4 funções e a tabela transformacoes) --
select proname from pg_proc where proname in ('email_confirmado','pode_ver_personagem','eh_dono_personagem','aprender_tecnica') order by 1;
select to_regclass('public.transformacoes') as transformacoes;
