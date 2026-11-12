-- =====================================================================
-- Recetas: esquema, permisos y recetas iniciales
-- Pegar entero en Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- Tablas ----------------------------------------------------

create table if not exists public.invitados (
  email      text primary key check (email = lower(email)),
  es_admin   boolean not null default false,
  creado     timestamptz not null default now()
);

create table if not exists public.recetas (
  id             uuid primary key default gen_random_uuid(),
  categoria      text not null check (categoria in ('comida', 'cena', 'otros')),
  titulo         text not null check (length(trim(titulo)) > 0),
  raciones       int  not null default 2 check (raciones between 1 and 50),
  ingredientes   text[] not null default '{}',
  instrucciones  text[] not null default '{}',
  notas          text,
  autor          uuid references auth.users(id) on delete set null,
  autor_nombre   text,
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now()
);

create index if not exists recetas_categoria_idx on public.recetas (categoria, titulo);

-- ---------- Administrador inicial ------------------------------------
-- Cambia el correo si vas a entrar con otra cuenta de Google.
insert into public.invitados (email, es_admin)
values ('zbnjaime@gmail.com', true)
on conflict (email) do update set es_admin = true;

-- ---------- Funciones de ayuda ----------------------------------------

create or replace function public.mi_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.es_invitado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invitados where email = public.mi_email());
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invitados where email = public.mi_email() and es_admin);
$$;

revoke all on function public.es_invitado() from public, anon;
revoke all on function public.es_admin()    from public, anon;
grant execute on function public.es_invitado() to authenticated;
grant execute on function public.es_admin()    to authenticated;

-- ---------- Triggers: autor y fecha -----------------------------------

create or replace function public.recetas_antes_insert()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new.autor := auth.uid();
    new.autor_nombre := coalesce(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      split_part(public.mi_email(), '@', 1)
    );
  end if;
  new.creado := now();
  new.actualizado := now();
  return new;
end $$;

create or replace function public.recetas_antes_update()
returns trigger language plpgsql as $$
begin
  new.autor := old.autor;               -- el autor no se puede cambiar
  new.autor_nombre := old.autor_nombre;
  new.creado := old.creado;
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists recetas_insert on public.recetas;
create trigger recetas_insert before insert on public.recetas
  for each row execute function public.recetas_antes_insert();

drop trigger if exists recetas_update on public.recetas;
create trigger recetas_update before update on public.recetas
  for each row execute function public.recetas_antes_update();

-- ---------- Seguridad (RLS) ------------------------------------------

alter table public.recetas   enable row level security;
alter table public.invitados enable row level security;

revoke all on public.recetas, public.invitados from anon;
grant select, insert, update, delete on public.recetas, public.invitados to authenticated;

-- Recetas: todos los invitados ven todo y pueden añadir;
-- cada uno edita las suyas (el admin, todas); solo el admin borra.
drop policy if exists recetas_ver     on public.recetas;
drop policy if exists recetas_crear   on public.recetas;
drop policy if exists recetas_editar  on public.recetas;
drop policy if exists recetas_borrar  on public.recetas;

create policy recetas_ver on public.recetas
  for select to authenticated using (public.es_invitado());

create policy recetas_crear on public.recetas
  for insert to authenticated with check (public.es_invitado());

create policy recetas_editar on public.recetas
  for update to authenticated
  using      (public.es_invitado() and (autor = auth.uid() or public.es_admin()))
  with check (public.es_invitado() and (autor = auth.uid() or public.es_admin()));

create policy recetas_borrar on public.recetas
  for delete to authenticated using (public.es_admin());

-- Invitados: el admin gestiona la lista; cada uno solo ve su propia fila.
drop policy if exists invitados_ver    on public.invitados;
drop policy if exists invitados_crear  on public.invitados;
drop policy if exists invitados_editar on public.invitados;
drop policy if exists invitados_borrar on public.invitados;

create policy invitados_ver on public.invitados
  for select to authenticated using (public.es_admin() or email = public.mi_email());

create policy invitados_crear on public.invitados
  for insert to authenticated with check (public.es_admin());

create policy invitados_editar on public.invitados
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

create policy invitados_borrar on public.invitados
  for delete to authenticated using (public.es_admin() and email <> public.mi_email());

-- ---------- Recetas iniciales -----------------------------------------

insert into public.recetas (categoria, titulo, raciones, ingredientes, instrucciones, notas, autor_nombre)
select * from (values
  ('comida', 'Coleslaw proteico con pollo', 2,
   array[
     '400 g de col blanca',
     '1 zanahoria grande',
     '1 cebolleta',
     '1/2 cdta de sal',
     '350 g de pechuga de pollo (en crudo)',
     '200 g de yogur griego 0% o skyr',
     '1 cda de mostaza de Dijon',
     '1 cda de zumo de limón o vinagre de manzana',
     '1 cdta de miel (opcional)',
     '1/4 cdta de pimienta negra'
   ],
   array[
     'Cortar la col en tiras muy finas, rallar la zanahoria y picar la cebolleta. Salar la col y dejar reposar 15 min para que suelte agua.',
     'Mientras, hacer el pollo a la plancha o hervido. Templar y desmenuzar con dos tenedores.',
     'Mezclar yogur, mostaza, limón, miel y pimienta.',
     'Escurrir y apretar la col con las manos. Juntar todo con el aliño.',
     'Reposar 20 min en la nevera antes de servir.'
   ],
   'Unas 370 kcal y 55 g de proteína por ración. El pollo se puede cambiar por 2-3 latas de atún al natural. Aguanta 2-3 días en la nevera.',
   'Jaime'),
  ('cena', 'Okonomiyaki de col con gambas', 2,
   array[
     '4 huevos',
     '200 ml de claras de huevo',
     '40 g de harina de trigo o de avena',
     '1 cda de salsa de soja',
     '300 g de col blanca',
     '2 cebolletas',
     '200 g de gambas peladas',
     '2 cdta de aceite de oliva',
     '1 cda de ketchup',
     '1 cda de salsa Worcestershire (Perrins)',
     '1 cda de mayonesa ligera'
   ],
   array[
     'Batir huevos, claras, harina y soja hasta que no queden grumos.',
     'Cortar la col en tiras finas y cortas, picar la cebolleta y trocear las gambas. Mezclar con la masa (más col que masa).',
     'Calentar 1 cdta de aceite en sartén antiadherente a fuego medio. Verter la mitad, aplanar a 2 cm y tapar 5 min.',
     'Darle la vuelta con ayuda de un plato y cocinar 5 min más tapada. Repetir con la otra mitad.',
     'Mezclar ketchup y Worcestershire, pintar por encima y terminar con líneas de mayonesa y cebolleta.'
   ],
   'Unas 500 kcal y 45 g de proteína por ración. Las gambas se pueden cambiar por pollo picado o atún. Para que no se rompa al voltear, no la hagas más ancha que la sartén.',
   'Jaime')
) as v(categoria, titulo, raciones, ingredientes, instrucciones, notas, autor_nombre)
where not exists (select 1 from public.recetas r where r.titulo = v.titulo);
