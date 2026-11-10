-- Dragon Ball Omega — migração 17: Penalidades e Aprimoramentos ativos, e "Passar turno" no combate.
--   personagens.efeitos_ativos  efeitos ativos no personagem (lista em JSON: efeito, grau, rodadas, acúmulos). Regras em js/efeitos-data.js.
--   personagens.efeitos_turno   último turno de combate já processado (o site aplica veneno, queimadura e a duração uma vez só).
--   combates.vez                de quem é a vez na ordem de iniciativa.
--   passar_turno(combate)       passa a vez para o próximo da ordem (depois do último, volta ao primeiro e a rodada sobe).
--                               O mestre passa sempre; o jogador, só quando a vez é do personagem dele.
-- Pode ser repetida sem problema. Rode depois da 16.

alter table personagens add column if not exists efeitos_ativos jsonb not null default '[]'::jsonb;
alter table personagens add column if not exists efeitos_turno text;

alter table combates add column if not exists vez uuid references combatentes(id) on delete set null;

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
