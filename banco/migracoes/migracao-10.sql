-- Dragon Ball Omega — migração 10: habilidades com efeito de dano opcional, efeitos de penalidade e de fortalecimento.
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema), depois das migrações 01 a 09.
-- Habilidades que já existem continuam iguais: todas causavam dano (tem_dano = true) e os "efeitos" antigos viram efeitos de penalidade.

alter table habilidades add column if not exists tem_dano boolean not null default true;
alter table habilidades add column if not exists fortalecimentos text[] not null default '{}';
-- (habilidade sem dano guarda qtd = 1 e um dado qualquer só para preencher as colunas; o site ignora)

-- Aprender técnica: passa a guardar tem_dano e fortalecimentos (copia do catálogo e técnica própria).
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

revoke all on function aprender_tecnica(uuid, uuid, int, jsonb, boolean) from public, anon;
grant execute on function aprender_tecnica(uuid, uuid, int, jsonb, boolean) to authenticated;
