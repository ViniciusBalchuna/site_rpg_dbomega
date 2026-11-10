-- Dragon Ball Omega — migração 12: habilidades raciais cortadas para sempre (ex.: Cauda do Deus macaco).
-- Guarda os ids das habilidades raciais que o personagem perdeu. Pode ser repetida sem problema. Rode depois da 11.

alter table personagens add column if not exists raciais_perdidas text[] not null default '{}';
