-- Dragon Ball Omega — migração 11: habilidades de classe.
-- Guarda, em cada personagem, os ids das habilidades de classe que ele tem (a definição de cada uma fica em js/data.js).
-- Pode ser repetida sem problema. Rode depois da 10.

alter table personagens add column if not exists habilidades_classe text[] not null default '{}';

-- Personagens que já existem ganham a habilidade inicial da classe (todo personagem a tem desde o nível 1).
update personagens set habilidades_classe = case classe
    when 'Guerreiro'  then array['destemido']
    when 'Monge'      then array['soberano-espirito']
    when 'Artífice'   then array['inventor']
    when 'Curandeiro' then array['medicina-aplicada']
    else '{}'::text[]
  end
  where coalesce(array_length(habilidades_classe, 1), 0) = 0;
