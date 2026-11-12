-- Añade las categorías Desayuno y Repostería.
-- Pegar en Supabase -> SQL Editor -> New query -> Run

alter table public.recetas drop constraint if exists recetas_categoria_check;
alter table public.recetas add constraint recetas_categoria_check
  check (categoria in ('desayuno', 'comida', 'cena', 'reposteria', 'otros'));
