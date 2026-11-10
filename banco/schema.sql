-- =====================================================================
-- Dragon Ball Omega — banco de dados (Supabase / PostgreSQL)
-- Cole no SQL Editor do Supabase e rode UMA vez num projeto vazio (as políticas não podem ser recriadas;
-- para refazer, apague o schema public e rode de novo). Testado num PostgreSQL 16 com o auth/storage simulados.
-- Sumário:
--  0 Extensões e tipos        6 Técnicas aprendidas, inventário e TP
--  1 Perfis e papéis          7 Funções (aprender, usar, feedback)
--  2 Personagens              8 Combate
--  3 Habilidades e dados      9 Enciclopédia
--  4 Catálogo (padrão)       10 Views públicas
--  5 Regras derivadas        11 RLS (quem pode o quê)  ·  12 Storage
-- Já inclui todas as migrações (01 a 29). Elas ficam em banco/migracoes/ e servem só para atualizar um banco que já
-- existe, rodadas em ordem; um banco novo precisa só deste arquivo. Migração nova: crie banco/migracoes/migracao-NN.sql
-- e acrescente o mesmo trecho ao final deste arquivo.
-- Regras que o banco NÃO guarda de propósito (são calculadas no site / em views):
--  PL, HP, KP, modificadores, RD, limite de inventário, maestria. Só guardamos os dados-base.
-- =====================================================================

-- 0. Extensões e tipos -------------------------------------------------
create extension if not exists pgcrypto;

do $$ begin
  create type papel_usuario  as enum ('jogador', 'mestre', 'admin');
  create type tipo_dano      as enum ('ki', 'fisico');
  create type quando_dado    as enum ('sempre', 'situacional');
  create type tipo_ameaca    as enum ('inofensivo', 'planetaria', 'galaxia', 'hemisferio', 'universal');
  create type secao_cartaz   as enum ('patrulha', 'anonima');
  create type tipo_combatente as enum ('jogador', 'npc');
  create type tipo_tp_mov    as enum ('atributo', 'tecnica', 'treino', 'ajuste');
exception when duplicate_object then null; end $$;

-- Os 9 alinhamentos. Texto com check, para ficar fácil de ler nas consultas.
create domain alinhamento as text check (value in (
  'Bom e Leal','Bom e Neutro','Bom e Caótico',
  'Neutro e Leal','Neutro Puro','Neutro Caótico',
  'Mau e Leal','Mau e Neutro','Mau e Caótico'));

-- 1. Perfis e papéis ----------------------------------------------------
-- A senha NÃO fica aqui: o Supabase Auth guarda o hash (bcrypt) em auth.users.
create table if not exists perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text,
  papel      papel_usuario not null default 'jogador',
  foto_url   text,
  criado_em  timestamptz not null default now()
);

create or replace function eh_mestre() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel in ('mestre','admin'));
$$;
-- E-mail confirmado? (o Supabase preenche email_confirmed_at quando a pessoa clica no link)
create or replace function email_confirmado() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;
create or replace function eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'admin');
$$;

-- Todo cadastro novo vira "jogador". Quem vira mestre é decidido no painel (ver ROTEIRO.md).
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
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function criar_perfil();

-- Ninguém muda o próprio papel (só o admin, pelo painel ou por SQL).
create or replace function proteger_papel() returns trigger
language plpgsql as $$
begin
  if new.papel is distinct from old.papel and not eh_admin() and current_user = 'authenticated' then
    raise exception 'Só um admin pode mudar o papel de alguém.';
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_papel on perfis;
create trigger trg_proteger_papel before update on perfis for each row execute function proteger_papel();

-- 2. Personagens ---------------------------------------------------------
-- Uma campanha só (Dragon Ball Omega): não existe tabela de campanhas.
create table if not exists personagens (
  id            uuid primary key default gen_random_uuid(),
  dono_id       uuid not null references perfis(id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 60),
  nivel         int  not null default 1 check (nivel between 1 and 200),
  xp            bigint not null default 0 check (xp >= 0),
  classe        text not null constraint personagens_classe_ck check (classe in ('Guerreiro','Monge','Artífice','Suporte')),
  subclasse     text not null default '',
  raca          text not null,
  subraca       text not null default '',
  alinhamento   alinhamento not null,
  altura        text check (altura ~ '^[0-9],[0-9]{2}$'),
  idade         int check (idade >= 0),
  foto_url      text,
  -- atributos-base (os modificadores saem da regra do site)
  forca         int not null default 0 check (forca >= 0),
  velocidade    int not null default 0 check (velocidade >= 0),
  resistencia   int not null default 0 check (resistencia >= 0),
  mente         int not null default 0 check (mente >= 0),
  espirito      int not null default 0 check (espirito >= 0),
  concentracao  int not null default 0 check (concentracao >= 0),
  corpo_base    int check (corpo_base is null or corpo_base >= 0),  -- vazio = calculado pelo site (classe + modificador)
  tp_atuais     int not null default 0 check (tp_atuais >= 0),
  tp_gastos     int not null default 40 check (tp_gastos >= 0),
  zeni          bigint not null default 2000 check (zeni >= 0),
  hp_atual      bigint not null default 0 check (hp_atual >= 0),
  kp_atual      bigint not null default 0 check (kp_atual >= 0),
  na_campanha   boolean not null default false,
  ficha_modelo  text check (ficha_modelo is null or ficha_modelo in ('', 'nz1', 'nz2', 'gue', 'pat', 'len')),   -- visual da ficha (migração 06)
  atributos_modelo text check (atributos_modelo is null or atributos_modelo in ('', 'esfera', 'grafico', 'sonar', 'lisa')),   -- 'lisa' na migração 13
  visualizacao_modelo text check (visualizacao_modelo is null or visualizacao_modelo in ('', 'artefato', 'navegacao')),   -- migração 07 (e 13: 'navegacao')
  habilidades_classe text[] not null default '{}',   -- migração 11: ids das habilidades de classe (definições em js/data.js)
  raciais_perdidas text[] not null default '{}',   -- migração 12: habilidades raciais cortadas para sempre
  pd_atual      int check (pd_atual is null or pd_atual between 0 and 9),   -- migração 15: Pontos do Dragão atuais (vazio = cheio)
  furia_atual   int check (furia_atual is null or furia_atual between 0 and 10),   -- migração 18: Fúria do Berserker atual (vazio = 0)
  efeitos_ativos jsonb not null default '[]'::jsonb,   -- migração 17: penalidades e aprimoramentos ativos (js/efeitos-data.js)
  efeitos_turno text,                                 -- migração 17: último turno de combate já processado
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists personagens_dono_idx on personagens(dono_id);
-- Cada pessoa registra no máximo UM personagem na campanha.
create unique index if not exists um_personagem_na_campanha on personagens(dono_id) where na_campanha;

create or replace function toca_atualizado_em() returns trigger
language plpgsql as $$ begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists trg_personagens_upd on personagens;
create trigger trg_personagens_upd before update on personagens for each row execute function toca_atualizado_em();

-- 3. Habilidades e dados adicionais ------------------------------------
-- Bloco de dano compartilhado por técnicas e habilidades de equipamento.
-- dono_personagem_id nulo = habilidade do catálogo (só mestre/admin escrevem).
create table if not exists habilidades (
  id                 uuid primary key default gen_random_uuid(),
  dono_personagem_id uuid references personagens(id) on delete cascade,
  nome               text not null check (char_length(nome) between 1 and 60),
  descricao          text not null default '' check (char_length(descricao) <= 500),
  qtd                int  not null default 1 check (qtd >= 1),
  dado               text not null check (dado in ('d3','d4','d6','d8','d10','d12','d20')),
  modificador        text check (modificador in ('forca','velocidade','resistencia','mente','espirito','concentracao')),
  fixo               int  not null default 0,
  tipo               tipo_dano not null default 'ki',
  efeitos            text[] not null default '{}',
  sem_ki             boolean not null default false, -- física que não gasta ki
  pontaria           boolean not null default false, -- migração 09: aplica o 2x do prato de dados
  tem_dano           boolean not null default true,  -- migração 10: habilidade sem dano guarda qtd = 1 e um dado qualquer
  fortalecimentos    text[] not null default '{}',   -- migração 10: efeitos de fortalecimento (js/efeitos-data.js)
  constraint hab_qtd_max check (qtd <= 50)            -- migração 08: no máximo 50 dados
);
create index if not exists habilidades_dono_idx on habilidades(dono_personagem_id);

-- "Dados adicionais": ex. dano 1d6 + 1d4 (sempre) + 1d8 (só contra voadores).
create table if not exists habilidade_dados (
  id            uuid primary key default gen_random_uuid(),
  habilidade_id uuid not null references habilidades(id) on delete cascade,
  qtd           int  not null default 1 check (qtd >= 1),
  dado          text not null check (dado in ('d3','d4','d6','d8','d10','d12','d20')),
  quando        quando_dado not null default 'sempre',
  condicao      text not null default '' check (char_length(condicao) <= 80),
  constraint hdados_qtd_max check (qtd <= 50)   -- migração 08: no máximo 50 dados
);
create index if not exists habilidade_dados_idx on habilidade_dados(habilidade_id);

-- 4. Catálogo padrão (escrito só por mestre/admin) ------------------------
create table if not exists tecnicas_padrao (
  id            uuid primary key default gen_random_uuid(),
  habilidade_id uuid not null unique references habilidades(id) on delete cascade,
  tp_sugerido   int not null default 0 check (tp_sugerido >= 0),
  inicial       boolean not null default false  -- toda ficha nova já nasce com ela
);
create table if not exists equipamentos_padrao (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text not null default '',
  habilidade_id uuid references habilidades(id) on delete set null
);

-- 5. (Regras derivadas) ---------------------------------------------------
-- Maestria sai dos usos acumulados: M1 <5 · M2 5-9 · M3 10-19 · M4 >=20.
create or replace function maestria(usos int) returns int
language sql immutable as $$
  select case when usos >= 20 then 4 when usos >= 10 then 3 when usos >= 5 then 2 else 1 end;
$$;

-- 6. Técnicas aprendidas, inventário e TP ---------------------------------
-- Aprender COPIA a habilidade do catálogo; origem_id só lembra de onde veio.
create table if not exists tecnicas_aprendidas (
  id            uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references personagens(id) on delete cascade,
  habilidade_id uuid not null unique references habilidades(id) on delete cascade,
  origem_id     uuid references tecnicas_padrao(id) on delete set null,
  tp_gastos     int not null default 0 check (tp_gastos >= 0),
  usos          int not null default 0 check (usos >= 0),
  guardada      boolean not null default false, -- true = está no inventário de técnicas
  aprendida_em  timestamptz not null default now()
);
create index if not exists tec_aprendidas_pers_idx on tecnicas_aprendidas(personagem_id);

create table if not exists inventario (
  id            uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references personagens(id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 60),
  descricao     text not null default '',
  habilidade_id uuid unique references habilidades(id) on delete set null,
  origem_id     uuid references equipamentos_padrao(id) on delete set null,
  usos          int not null default 0 check (usos >= 0)  -- usos da habilidade do equipamento
);
create index if not exists inventario_pers_idx on inventario(personagem_id);

-- Transformações do personagem. Só uma ativa por vez (personagens.transformacao_ativa).
-- Por enquanto são informativas: o multiplicador e o custo de KP não entram nas contas.
create table if not exists transformacoes (
  id            uuid primary key default gen_random_uuid(),
  personagem_id uuid not null references personagens(id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 60),
  descricao     text not null default '' check (char_length(descricao) <= 500),
  requisito     text not null default '' check (char_length(requisito) <= 120),
  mult_pl       numeric(16,2) not null default 1 check (mult_pl >= 1),
  kp_por_rodada int not null default 0 check (kp_por_rodada >= 0),
  usos          int not null default 0 check (usos >= 0),  -- migração 15: ativações (a maestria sobe com isso)
  catalogo_id   text,                              -- migração 02: id do item do catálogo do site (js/transformacoes-data.js)
  bonus_teste   int not null default 0,            -- migração 02: bônus em testes
  bonus_dano    int not null default 0             -- migração 02: bônus em danos
);
create index if not exists transformacoes_pers_idx on transformacoes(personagem_id);
-- Guarda o ID da transformação do catálogo do site (js/transformacoes-data.js), ex.: 'ssj2'. Texto, sem tabela por trás.
alter table personagens add column if not exists transformacao_ativa text;

-- Livro-caixa de TP: cada gasto ou ajuste vira uma linha (dá pra auditar e desfazer).
create table if not exists tp_movimentos (
  id            bigint generated always as identity primary key,
  personagem_id uuid not null references personagens(id) on delete cascade,
  tipo          tipo_tp_mov not null,
  delta_atuais  int not null default 0,
  delta_gastos  int not null default 0,
  nota          text not null default '',
  criado_em     timestamptz not null default now()
);

-- 7. Funções --------------------------------------------------------------
-- Aprender técnica: TUDO numa transação (se algo falhar, nada muda).
-- p_origem: id do catálogo (ou null para técnica personalizada); p_tp: TP a gastar (0..tp_atuais);
-- p_hab: bloco de dano em JSON, usado quando p_origem é null:
--   {"nome","descricao","qtd","dado","modificador","fixo","tipo","efeitos":[],"extras":[{"qtd","dado","quando","condicao"}],"sem_ki"}
create or replace function aprender_tecnica(p_personagem uuid, p_origem uuid, p_tp int, p_hab jsonb default null, p_guardada boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pers personagens%rowtype; v_hab uuid; v_id uuid; v_src habilidades%rowtype;
begin
  select * into v_pers from personagens where id = p_personagem for update;
  if not found or v_pers.dono_id <> auth.uid() then raise exception 'Personagem não encontrado.'; end if;
  if p_tp < 0 or p_tp > v_pers.tp_atuais then raise exception 'Você só tem % TP atuais.', v_pers.tp_atuais; end if;

  if p_origem is not null then
    select h.* into v_src from tecnicas_padrao t join habilidades h on h.id = t.habilidade_id where t.id = p_origem;
    if not found then raise exception 'Técnica do catálogo não existe.'; end if;
    insert into habilidades (dono_personagem_id, nome, descricao, qtd, dado, modificador, fixo, tipo, efeitos, sem_ki, pontaria, tem_dano, fortalecimentos)
    values (p_personagem, v_src.nome, v_src.descricao, v_src.qtd, v_src.dado, v_src.modificador, v_src.fixo, v_src.tipo, v_src.efeitos, v_src.sem_ki, v_src.pontaria, v_src.tem_dano, v_src.fortalecimentos)
    returning id into v_hab;
    insert into habilidade_dados (habilidade_id, qtd, dado, quando, condicao)
      select v_hab, qtd, dado, quando, condicao from habilidade_dados where habilidade_id = v_src.id;
  else
    if p_hab is null then raise exception 'Faltou descrever a técnica.'; end if;
    insert into habilidades (dono_personagem_id, nome, descricao, qtd, dado, modificador, fixo, tipo, efeitos, sem_ki, pontaria, tem_dano, fortalecimentos)
    values (p_personagem, p_hab ->> 'nome', coalesce(p_hab ->> 'descricao',''), coalesce((p_hab ->> 'qtd')::int,1),
            p_hab ->> 'dado', nullif(p_hab ->> 'modificador',''), coalesce((p_hab ->> 'fixo')::int,0),
            (p_hab ->> 'tipo')::tipo_dano,
            coalesce(array(select jsonb_array_elements_text(p_hab -> 'efeitos')), '{}'),
            coalesce((p_hab ->> 'sem_ki')::boolean, false),
            coalesce((p_hab ->> 'pontaria')::boolean, false),
            coalesce((p_hab ->> 'tem_dano')::boolean, true),
            coalesce(array(select jsonb_array_elements_text(p_hab -> 'fortalecimentos')), '{}'))
    returning id into v_hab;
    insert into habilidade_dados (habilidade_id, qtd, dado, quando, condicao)
      select v_hab, (e ->> 'qtd')::int, e ->> 'dado', (e ->> 'quando')::quando_dado, coalesce(e ->> 'condicao','')
      from jsonb_array_elements(coalesce(p_hab -> 'extras','[]'::jsonb)) e;
  end if;

  insert into tecnicas_aprendidas (personagem_id, habilidade_id, origem_id, tp_gastos, guardada)
  values (p_personagem, v_hab, p_origem, p_tp, coalesce(p_guardada, false)) returning id into v_id;
  update personagens set tp_atuais = tp_atuais - p_tp, tp_gastos = tp_gastos + p_tp where id = p_personagem;
  insert into tp_movimentos (personagem_id, tipo, delta_atuais, delta_gastos, nota)
  values (p_personagem, 'tecnica', -p_tp, p_tp, 'Aprendeu técnica');
  return v_id;
end $$;

-- "Usar": soma 1 uso (técnica aprendida ou equipamento). Só o dono.
create or replace function usar_habilidade(p_tipo text, p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_usos int;
begin
  if p_tipo = 'tecnica' then
    update tecnicas_aprendidas t set usos = usos + 1
    from personagens p where t.id = p_id and p.id = t.personagem_id and p.dono_id = auth.uid()
    returning t.usos into v_usos;
  elsif p_tipo = 'equipamento' then
    update inventario i set usos = usos + 1
    from personagens p where i.id = p_id and p.id = i.personagem_id and p.dono_id = auth.uid()
    returning i.usos into v_usos;
  else raise exception 'Tipo inválido.'; end if;
  if v_usos is null then raise exception 'Não encontrado.'; end if;
  return v_usos;
end $$;

-- Feedback: 1 por hora por pessoa.
create table if not exists feedback (
  id        uuid primary key default gen_random_uuid(),
  autor_id  uuid not null default auth.uid() references perfis(id) on delete cascade,
  mensagem  text not null check (char_length(mensagem) between 3 and 2000),
  criado_em timestamptz not null default now()
);
create or replace function limitar_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from feedback where autor_id = new.autor_id and criado_em > now() - interval '1 hour') then
    raise exception 'Você já mandou um feedback na última hora. Tenta de novo mais tarde!';
  end if;
  return new;
end $$;
drop trigger if exists trg_limitar_feedback on feedback;
create trigger trg_limitar_feedback before insert on feedback for each row execute function limitar_feedback();

-- 8. Combate -----------------------------------------------------------------
create table if not exists combates (
  id         uuid primary key default gen_random_uuid(),
  rodada     int not null default 1 check (rodada >= 1),
  ativo      boolean not null default true,
  vez        uuid,   -- migração 17: de quem é a vez (combatentes.id); a ligação fica na migração 17
  criado_em  timestamptz not null default now()
);
create unique index if not exists um_combate_ativo on combates((true)) where ativo;
create table if not exists combatentes (
  id            uuid primary key default gen_random_uuid(),
  combate_id    uuid not null references combates(id) on delete cascade,
  tipo          tipo_combatente not null,
  personagem_id uuid references personagens(id) on delete cascade,  -- jogador
  nome          text not null,                                      -- NPCs
  iniciativa    int not null default 0,
  check ((tipo = 'jogador' and personagem_id is not null) or (tipo = 'npc'))
);

-- 9. Enciclopédia --------------------------------------------------------------
create table if not exists bestiario_pastas (   -- árvore, como a dos planetas (migração 16)
  id uuid primary key default gen_random_uuid(),
  pai_id uuid references bestiario_pastas(id) on delete cascade,
  nome text not null, ordem int not null default 0);
create table if not exists criaturas (
  id            uuid primary key default gen_random_uuid(),
  pasta_id      uuid not null references bestiario_pastas(id) on delete cascade,
  nome          text not null, descricao text not null default '',
  imagem_url    text,  -- opcional (Storage, bucket "fotos")
  imagens       jsonb not null default '[]'::jsonb,  -- várias imagens (carrossel), migração 16
  comportamento alinhamento not null,
  ameaca        tipo_ameaca not null,
  criado_em     timestamptz not null default now()
);
create table if not exists planeta_pastas (   -- árvore: hemisfério > galáxia > ...
  id uuid primary key default gen_random_uuid(),
  pai_id uuid references planeta_pastas(id) on delete cascade,
  nome text not null, ordem int not null default 0);
create table if not exists planetas (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references planeta_pastas(id) on delete cascade,
  nome text not null, descricao text not null default '', imagem_url text, fauna text not null default '',
  flora text not null default '', povo text not null default '', clima text not null default '',
  lugares text not null default '', curiosidades text not null default '',
  criado_em timestamptz not null default now(),
  imagens jsonb not null default '[]'::jsonb   -- migração 03: várias imagens (carrossel)
);
create table if not exists cartazes (
  id          uuid primary key default gen_random_uuid(),
  secao       secao_cartaz not null,
  autor_id    uuid not null default auth.uid() references perfis(id) on delete cascade,
  alvo        text not null check (char_length(alvo) between 1 and 80),
  imagem_url  text,
  recompensa  bigint not null default 0 check (recompensa >= 0),
  descricao   text not null default '', localizacao text not null default '',
  criado_em   timestamptz not null default now()
);
-- Mistérios e Atualizações: vazios por enquanto, mas a estrutura já está pronta.
create table if not exists misterios (
  id uuid primary key default gen_random_uuid(), titulo text not null, texto text not null default '',
  resolvido boolean not null default false, criado_em timestamptz not null default now());
create table if not exists misterio_respostas (   -- tabela separada: o palpite de cada jogador
  id uuid primary key default gen_random_uuid(),
  misterio_id uuid not null references misterios(id) on delete cascade,
  autor_id uuid not null default auth.uid() references perfis(id) on delete cascade,
  resposta text not null, criado_em timestamptz not null default now());
create table if not exists atualizacoes (
  id uuid primary key default gen_random_uuid(), titulo text not null, texto text not null default '',
  criado_em timestamptz not null default now());

-- Sementes: as pastas pedidas.
insert into bestiario_pastas (nome, ordem)
  select v.nome, v.ordem from (values ('Raças',1),('Seres místicos',2),('Bestas Demoníacas',3),('Ameaças universais',4)) v(nome, ordem)
  where not exists (select 1 from bestiario_pastas where pai_id is null and nome = v.nome);
insert into planeta_pastas (nome, ordem)
  select v.nome, v.ordem from (values ('Hemisfério boreal',1),('Hemisfério astral',2)) v(nome, ordem)
  where not exists (select 1 from planeta_pastas where pai_id is null and nome = v.nome);

-- 10. Views públicas ------------------------------------------------------------
-- Quem está na campanha: SÓ nome, classe, raça, nível e foto (security definer de propósito).
create or replace view jogadores_publico with (security_invoker = false) as
  select id, nome, classe, raca, nivel, foto_url, dono_id from personagens where na_campanha;
grant select on jogadores_publico to authenticated;

-- 11. RLS ---------------------------------------------------------------------------
alter table perfis enable row level security;
alter table personagens enable row level security;
alter table habilidades enable row level security;
alter table habilidade_dados enable row level security;
alter table tecnicas_padrao enable row level security;
alter table equipamentos_padrao enable row level security;
alter table tecnicas_aprendidas enable row level security;
alter table inventario enable row level security;
alter table tp_movimentos enable row level security;
alter table transformacoes enable row level security;
alter table feedback enable row level security;
alter table combates enable row level security;
alter table combatentes enable row level security;
alter table bestiario_pastas enable row level security;
alter table criaturas enable row level security;
alter table planeta_pastas enable row level security;
alter table planetas enable row level security;
alter table cartazes enable row level security;
alter table misterios enable row level security;
alter table misterio_respostas enable row level security;
alter table atualizacoes enable row level security;

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

create policy perfis_ler    on perfis for select to authenticated using (id = auth.uid() or eh_mestre());
create policy perfis_editar on perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy pers_ler    on personagens for select to authenticated using (dono_id = auth.uid() or eh_mestre());
-- Só cria personagem quem confirmou o e-mail (além do "Confirm email" ligado no Auth).
create policy pers_criar  on personagens for insert to authenticated with check (dono_id = auth.uid() and email_confirmado());
create policy pers_editar on personagens for update to authenticated using (dono_id = auth.uid()) with check (dono_id = auth.uid());
create policy pers_apagar on personagens for delete to authenticated using (dono_id = auth.uid());

create policy hab_ler    on habilidades for select to authenticated
  using (dono_personagem_id is null or pode_ver_personagem(dono_personagem_id));
create policy hab_escrever on habilidades for all to authenticated
  using ((dono_personagem_id is null and eh_mestre()) or (dono_personagem_id is not null and eh_dono_personagem(dono_personagem_id)))
  with check ((dono_personagem_id is null and eh_mestre()) or (dono_personagem_id is not null and eh_dono_personagem(dono_personagem_id)));
create policy hdados_ler on habilidade_dados for select to authenticated
  using (exists (select 1 from habilidades h where h.id = habilidade_id and (h.dono_personagem_id is null or pode_ver_personagem(h.dono_personagem_id))));
create policy hdados_escrever on habilidade_dados for all to authenticated
  using (exists (select 1 from habilidades h where h.id = habilidade_id and ((h.dono_personagem_id is null and eh_mestre()) or (h.dono_personagem_id is not null and eh_dono_personagem(h.dono_personagem_id)))))
  with check (exists (select 1 from habilidades h where h.id = habilidade_id and ((h.dono_personagem_id is null and eh_mestre()) or (h.dono_personagem_id is not null and eh_dono_personagem(h.dono_personagem_id)))));

create policy tpad_ler on tecnicas_padrao for select to authenticated using (true);
create policy tpad_esc on tecnicas_padrao for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy epad_ler on equipamentos_padrao for select to authenticated using (true);
create policy epad_esc on equipamentos_padrao for all to authenticated using (eh_mestre()) with check (eh_mestre());

create policy tapr_ler on tecnicas_aprendidas for select to authenticated using (pode_ver_personagem(personagem_id));
create policy tapr_esc_w on tecnicas_aprendidas for all to authenticated using (eh_dono_personagem(personagem_id)) with check (eh_dono_personagem(personagem_id));
create policy inv_ler on inventario for select to authenticated using (pode_ver_personagem(personagem_id));
create policy inv_esc_w on inventario for all to authenticated using (eh_dono_personagem(personagem_id)) with check (eh_dono_personagem(personagem_id));
create policy trf_ler on transformacoes for select to authenticated using (pode_ver_personagem(personagem_id));
create policy trf_esc_w on transformacoes for all to authenticated using (eh_dono_personagem(personagem_id)) with check (eh_dono_personagem(personagem_id));
create policy tpm_ler on tp_movimentos for select to authenticated using (pode_ver_personagem(personagem_id));
create policy tpm_ins on tp_movimentos for insert to authenticated with check (eh_dono_personagem(personagem_id));

create policy fb_ins on feedback for insert to authenticated with check (autor_id = auth.uid());
create policy fb_ler on feedback for select to authenticated using (autor_id = auth.uid() or eh_mestre());

create policy comb_ler on combates for select to authenticated using (true);
create policy comb_esc on combates for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy cbt_ler on combatentes for select to authenticated using (true);
create policy cbt_ins on combatentes for insert to authenticated
  with check (eh_mestre() or (tipo = 'jogador' and eh_dono_personagem(personagem_id)));
create policy cbt_upd on combatentes for update to authenticated using (eh_mestre() or eh_dono_personagem(personagem_id)) with check (eh_mestre() or eh_dono_personagem(personagem_id));
create policy cbt_del on combatentes for delete to authenticated using (eh_mestre() or eh_dono_personagem(personagem_id));

-- Enciclopédia: todo mundo conectado lê; só o mestre escreve (cartazes anônimos: o próprio autor).
create policy bpa_ler on bestiario_pastas for select to authenticated using (true);
create policy bpa_esc on bestiario_pastas for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy cri_ler on criaturas for select to authenticated using (true);
create policy cri_esc on criaturas for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy ppa_ler on planeta_pastas for select to authenticated using (true);
create policy ppa_esc on planeta_pastas for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy pla_ler on planetas for select to authenticated using (true);
create policy pla_esc on planetas for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy car_ler on cartazes for select to authenticated using (true);
-- Cartaz anônimo custa Zenis: só nasce pela função criar_cartaz_anonimo (migração 02). Direto, só a patrulha do mestre.
create policy car_ins on cartazes for insert to authenticated
  with check (autor_id = auth.uid() and secao = 'patrulha' and eh_mestre());
create policy car_del on cartazes for delete to authenticated using (autor_id = auth.uid() or eh_mestre());
create policy mis_ler on misterios for select to authenticated using (true);
create policy mis_esc on misterios for all to authenticated using (eh_mestre()) with check (eh_mestre());
create policy mresp_ler on misterio_respostas for select to authenticated using (autor_id = auth.uid() or eh_mestre());
create policy mresp_ins on misterio_respostas for insert to authenticated with check (autor_id = auth.uid());
create policy atu_ler on atualizacoes for select to authenticated using (true);
create policy atu_esc on atualizacoes for all to authenticated using (eh_mestre()) with check (eh_mestre());

-- Funções que mudam dados: só quem está conectado.
revoke all on function aprender_tecnica(uuid, uuid, int, jsonb, boolean) from public, anon;
revoke all on function usar_habilidade(text, uuid) from public, anon;
grant execute on function aprender_tecnica(uuid, uuid, int, jsonb, boolean) to authenticated;
grant execute on function usar_habilidade(text, uuid) to authenticated;

-- Contas criadas ANTES de rodar este arquivo não têm perfil (o gatilho só vale para cadastros novos). Cria os que faltam.
insert into perfis (id, email)
  select id, email from auth.users on conflict (id) do nothing;

-- 12. Storage (fotos) --------------------------------------------------------------
-- Cria o bucket "fotos" (público para leitura) e deixa cada pessoa escrever só na própria pasta (<uid>/arquivo).
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
create policy fotos_escrever on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Passar turno (migração 17) ---------------------------------------------------------
create or replace function passar_turno(p_combate uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_c combates%rowtype; v_ids uuid[]; v_idx int; v_prox uuid; v_rod int;
begin
  select * into v_c from combates where id = p_combate and ativo for update;
  if not found then raise exception 'Não há combate em andamento.' using errcode = 'P0001'; end if;
  -- mesma ordem do site: maior iniciativa primeiro; empate, pela ordem de criação (id)
  select array_agg(id order by iniciativa desc, id asc) into v_ids from combatentes where combate_id = p_combate;
  if v_ids is null then raise exception 'Ninguém entrou no combate ainda.' using errcode = 'P0001'; end if;
  v_idx := array_position(v_ids, v_c.vez);
  if not eh_mestre() then
    if v_idx is null or not exists (select 1 from combatentes where id = v_c.vez and personagem_id is not null and eh_dono_personagem(personagem_id)) then
      raise exception 'Só o mestre ou quem está na vez pode passar o turno.' using errcode = 'P0001';
    end if;
  end if;
  v_rod := v_c.rodada;
  if v_idx is null then v_prox := v_ids[1];
  elsif v_idx >= array_length(v_ids, 1) then v_prox := v_ids[1]; v_rod := v_rod + 1;
  else v_prox := v_ids[v_idx + 1];
  end if;
  update combates set vez = v_prox, rodada = v_rod where id = p_combate;
  return jsonb_build_object('vez', v_prox, 'rodada', v_rod);
end $$;
revoke all on function passar_turno(uuid) from public, anon;
grant execute on function passar_turno(uuid) to authenticated;

-- 13. Sessão da campanha (migração 19) ---------------------------------------------
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

-- 14. Tema da sessão (migração 20) -------------------------------------------------
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

-- ===== migração 22: mapa da sessão e tokens =====
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

-- ===== migração 23: rolagens do jogador no log do mestre =====
create or replace function postar_sessao_log(p_tipo text, p_texto text, p_dados jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro.' using errcode = 'P0001'; end if;
  if not (eh_mestre() or eh_membro_sessao()) then raise exception 'Você não está na sessão.' using errcode = 'P0001'; end if;
  if p_tipo not in ('msg', 'rolagem', 'uso', 'sistema') then raise exception 'Tipo de mensagem inválido.' using errcode = 'P0001'; end if;
  insert into sessao_log (tipo, texto, dados, so_mestre)
  values (p_tipo, left(coalesce(p_texto, ''), 2000), coalesce(p_dados, '{}'::jsonb), p_tipo <> 'msg')
  returning id into v_id;
  return v_id;
end $$;

revoke all on function postar_sessao_log(text, text, jsonb) from public, anon;
grant execute on function postar_sessao_log(text, text, jsonb) to authenticated;

-- ===== migração 24: voar, submergir e cor da borda do token =====
alter table sessao_tokens add column if not exists voando boolean not null default false;
alter table sessao_tokens add column if not exists submerso boolean not null default false;
alter table sessao_tokens add column if not exists borda text check (borda is null or char_length(borda) <= 60);

-- ===== migração 25: NPCs do mestre =====
alter table personagens add column if not exists npc boolean not null default false;
alter table personagens add column if not exists pl_base numeric check (pl_base is null or pl_base >= 0);
create index if not exists personagens_npc on personagens (dono_id) where npc;

-- ===== migração 26: tamanho dos NPCs e NPCs na sessão =====
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

-- ===== migração 27: layers no mapa da sessão; só o mestre põe tokens =====
alter table sessao_tokens add column if not exists layer integer not null default 1 check (layer between -50 and 50);

-- O "upsert" do jogador (mover) passa pela regra de inserir: ela só deixa quando o token já existe.
drop policy if exists stok_jog_ins on sessao_tokens;
create policy stok_jog_ins on sessao_tokens for insert to authenticated
  with check (eh_membro_sessao() and personagem_id is not null and eh_dono_personagem(personagem_id) and id = 'p:' || personagem_id::text
              and exists (select 1 from sessao_tokens t where t.id = 'p:' || personagem_id::text));

-- ===== migração 28: tocha e lanterna (modo caverna) =====
alter table sessao_tokens add column if not exists luz text not null default '' check (luz in ('', 'tocha', 'lanterna'));
alter table sessao_tokens add column if not exists mira real;

-- ===== migração 29: nível até 200 =====
alter table personagens drop constraint if exists personagens_nivel_check;
alter table personagens add constraint personagens_nivel_check check (nivel between 1 and 200);

-- ===== migrações 02 e 08: missões do personagem (validadas pelo mestre), cartaz anônimo e limite de imagens =====
-- Missões que cada personagem pegou. O jogador conclui (fica pendente em concluida_em); o mestre aceita (paga a
-- recompensa e apaga o cartaz) ou rejeita (volta a ser missão ativa).
create table if not exists missoes_personagem (
  personagem_id uuid not null references personagens(id) on delete cascade,
  cartaz_id     uuid not null references cartazes(id)    on delete cascade,   -- cartaz apagado = missão some da ficha
  criado_em     timestamptz not null default now(),
  concluida_em  timestamptz,
  primary key (personagem_id, cartaz_id)
);
alter table missoes_personagem enable row level security;
drop policy if exists mp_ler on missoes_personagem;
drop policy if exists mp_ins on missoes_personagem;
drop policy if exists mp_del on missoes_personagem;
create policy mp_ler on missoes_personagem for select to authenticated using (pode_ver_personagem(personagem_id));
create policy mp_ins on missoes_personagem for insert to authenticated with check (eh_dono_personagem(personagem_id));
create policy mp_del on missoes_personagem for delete to authenticated using (eh_dono_personagem(personagem_id));

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

create or replace function concluir_missao(p_personagem uuid, p_cartaz uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_quando timestamptz;
begin
  if not exists (select 1 from personagens where id = p_personagem and dono_id = auth.uid()) then
    raise exception 'Esse personagem não é seu.';
  end if;
  update missoes_personagem set concluida_em = coalesce(concluida_em, now())
   where personagem_id = p_personagem and cartaz_id = p_cartaz
   returning concluida_em into v_quando;
  if v_quando is null then raise exception 'Esse personagem não pegou esta missão.'; end if;
  return v_quando;
end $$;

create or replace function aceitar_conclusao(p_personagem uuid, p_cartaz uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_rec bigint; v_zeni bigint;
begin
  if not eh_mestre() then raise exception 'Só o mestre pode validar missões.'; end if;
  if not exists (select 1 from missoes_personagem where personagem_id = p_personagem and cartaz_id = p_cartaz and concluida_em is not null) then
    raise exception 'Esse pedido de conclusão não existe mais.';
  end if;
  select recompensa into v_rec from cartazes where id = p_cartaz for update;
  if not found then raise exception 'Esse cartaz não existe mais.'; end if;
  update personagens set zeni = zeni + v_rec where id = p_personagem returning zeni into v_zeni;
  delete from cartazes where id = p_cartaz;      -- as missões dos outros personagens somem junto (cascade)
  return v_zeni;
end $$;

create or replace function rejeitar_conclusao(p_personagem uuid, p_cartaz uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_mestre() then raise exception 'Só o mestre pode validar missões.'; end if;
  update missoes_personagem set concluida_em = null where personagem_id = p_personagem and cartaz_id = p_cartaz;
end $$;

revoke all on function criar_cartaz_anonimo(uuid, text, bigint, text, text, text) from public, anon;
revoke all on function concluir_missao(uuid, uuid)    from public, anon;
revoke all on function aceitar_conclusao(uuid, uuid)  from public, anon;
revoke all on function rejeitar_conclusao(uuid, uuid) from public, anon;
grant execute on function criar_cartaz_anonimo(uuid, text, bigint, text, text, text) to authenticated;
grant execute on function concluir_missao(uuid, uuid)    to authenticated;
grant execute on function aceitar_conclusao(uuid, uuid)  to authenticated;
grant execute on function rejeitar_conclusao(uuid, uuid) to authenticated;

-- Imagens: no máximo 500 KB. Ficam como texto base64; 500 KB de imagem = ~683.000 caracteres.
-- Para mudar o limite, altere só o número desta função. Só confere o que está sendo GRAVADO agora (linha nova ou
-- imagem que mudou): imagens antigas acima do limite continuam lá, e a ficha pode ser editada sem mexer nelas.
create or replace function limite_imagem() returns int language sql immutable as $$ select 683000 $$;
create or replace function checar_imagens() returns trigger
language plpgsql as $$
declare
  col text; v_new jsonb; v_old jsonb; el jsonb;
begin
  foreach col in array tg_argv loop
    v_new := to_jsonb(new) -> col;
    v_old := case when tg_op = 'UPDATE' then to_jsonb(old) -> col else null end;
    if v_new is null or v_new = 'null'::jsonb or v_new is not distinct from v_old then continue; end if;
    if jsonb_typeof(v_new) = 'string' then
      if char_length(v_new #>> '{}') > limite_imagem() then
        raise exception 'A imagem passa de 500 KB. Escolha uma menor.' using errcode = 'P0001';
      end if;
    elsif jsonb_typeof(v_new) = 'array' then
      for el in select * from jsonb_array_elements(v_new) loop
        if jsonb_typeof(el) = 'string' and char_length(el #>> '{}') > limite_imagem()
           and not (v_old is not null and jsonb_typeof(v_old) = 'array' and v_old @> jsonb_build_array(el)) then
          raise exception 'Uma das imagens passa de 500 KB. Escolha uma menor.' using errcode = 'P0001';
        end if;
      end loop;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists trg_img_personagens on personagens;
create trigger trg_img_personagens before insert or update on personagens for each row execute function checar_imagens('foto_url');
drop trigger if exists trg_img_perfis on perfis;
create trigger trg_img_perfis      before insert or update on perfis      for each row execute function checar_imagens('foto_url');
drop trigger if exists trg_img_criaturas on criaturas;
create trigger trg_img_criaturas   before insert or update on criaturas   for each row execute function checar_imagens('imagem_url', 'imagens');
drop trigger if exists trg_img_cartazes on cartazes;
create trigger trg_img_cartazes    before insert or update on cartazes    for each row execute function checar_imagens('imagem_url');
drop trigger if exists trg_img_planetas on planetas;
create trigger trg_img_planetas    before insert or update on planetas    for each row execute function checar_imagens('imagem_url', 'imagens');
