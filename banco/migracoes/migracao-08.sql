-- Dragon Ball Omega — migração 08: limite de imagens (500 KB), limite de dados por técnica (50) e missões validadas pelo mestre.
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema), depois das migrações 01 a 07.
-- Faça um backup antes (Database > Backups ou Table Editor > Export CSV).

-- 1. Imagens: no máximo 500 KB --------------------------------------------------------------------
-- As imagens ficam como texto base64 (data:image/webp;base64,...). 500 KB de imagem = ~683.000 caracteres de texto.
-- Para mudar o limite, altere só o número desta função (e rode o arquivo de novo).
create or replace function limite_imagem() returns int language sql immutable as $$ select 683000 $$;

-- Só confere o que está sendo GRAVADO agora (linha nova, ou imagem que mudou). Imagens que já estão no banco e
-- passam do limite continuam lá, e a ficha ainda pode ser editada sem mexer na imagem.
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
create trigger trg_img_criaturas   before insert or update on criaturas   for each row execute function checar_imagens('imagem_url');
drop trigger if exists trg_img_cartazes on cartazes;
create trigger trg_img_cartazes    before insert or update on cartazes    for each row execute function checar_imagens('imagem_url');
drop trigger if exists trg_img_planetas on planetas;
create trigger trg_img_planetas    before insert or update on planetas    for each row execute function checar_imagens('imagem_url', 'imagens');

-- 2. Técnicas: no máximo 50 dados de cada tipo -------------------------------------------------------
update habilidades      set qtd = 50 where qtd > 50;
update habilidade_dados set qtd = 50 where qtd > 50;
alter table habilidades      drop constraint if exists hab_qtd_max;
alter table habilidades      add  constraint hab_qtd_max  check (qtd <= 50);
alter table habilidade_dados drop constraint if exists hdados_qtd_max;
alter table habilidade_dados add  constraint hdados_qtd_max check (qtd <= 50);

-- 3. Missões: concluir pede a validação do mestre ----------------------------------------------------
-- O jogador "conclui" => fica pendente (concluida_em). Só o mestre aceita (paga e apaga o cartaz) ou rejeita (volta a ser missão ativa).
alter table missoes_personagem add column if not exists concluida_em timestamptz;

drop function if exists concluir_missao(uuid, uuid);
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

revoke all on function concluir_missao(uuid, uuid)   from public, anon;
revoke all on function aceitar_conclusao(uuid, uuid)  from public, anon;
revoke all on function rejeitar_conclusao(uuid, uuid) from public, anon;
grant execute on function concluir_missao(uuid, uuid)   to authenticated;
grant execute on function aceitar_conclusao(uuid, uuid)  to authenticated;
grant execute on function rejeitar_conclusao(uuid, uuid) to authenticated;
