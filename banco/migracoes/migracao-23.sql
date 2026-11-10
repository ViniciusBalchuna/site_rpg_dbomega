-- Dragon Ball Omega — migração 23: rolagens e técnicas do jogador chegam ao log do mestre.
-- O problema: rolagens, técnicas usadas e avisos do sistema ficam no log com so_mestre = true (só o mestre lê).
-- Quando o JOGADOR gravava uma dessas linhas direto na tabela, o PostgREST pede a linha de volta (RETURNING) e,
-- como o jogador não pode ler essa linha, o banco recusa a gravação inteira — e a rolagem nunca chegava.
-- Agora quem está na sessão grava pelo postar_sessao_log(), que confere se a pessoa está na sessão e grava
-- sem precisar ler a linha. O autor e o nome continuam vindo do banco (trigger da migração 19).
-- Pode ser repetida sem problema. Rode depois da 22.

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
