-- GAM ANALYTICS WEB — DADOS INICIAIS
-- 1. Crie primeiro o usuário rodriguesvieira378@gmail.com no Supabase Auth.
-- 2. Execute schema.sql.
-- 3. Execute este arquivo.

do $$
declare
  v_owner uuid;
begin
  select id
  into v_owner
  from auth.users
  where lower(email) = lower('rodriguesvieira378@gmail.com')
  limit 1;

  if v_owner is null then
    raise exception 'Crie o usuário rodriguesvieira378@gmail.com no Supabase Auth antes de executar o seed.';
  end if;

  insert into public.profiles (user_id, display_name)
  values (v_owner, 'Cássio Vieira Rodrigues')
  on conflict (user_id)
  do update set display_name = excluded.display_name;

  insert into public.officers (
    owner_id, registration, name, role, status, prison_goal, pursuit_goal
  )
  values
    (v_owner, 'GAM001', 'Mike',    'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM002', 'K1ra',    'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM003', 'Dadinho', 'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM004', 'Md',      'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM005', 'Vg',      'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM006', 'Matheus', 'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM007', 'Baiano',  'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM008', 'Flavio',  'Estagiário', 'Ativo', 6, 12),
    (v_owner, 'GAM009', 'Dv',      'Oficial GAM','Ativo', 4, 6),
    (v_owner, 'GAM010', 'Rafa',    'Oficial GAM','Ativo', 4, 6)
  on conflict (owner_id, registration)
  do update set
    name = excluded.name,
    role = excluded.role,
    status = excluded.status,
    prison_goal = excluded.prison_goal,
    pursuit_goal = excluded.pursuit_goal;

  insert into public.weekly_entries (
    owner_id, officer_id, year, month, week, prisons, pursuits, note
  )
  select
    v_owner,
    o.id,
    2026,
    6,
    1,
    values_table.prisons,
    values_table.pursuits,
    ''
  from (
    values
      ('GAM001', 4, 1),
      ('GAM002', 6, 12),
      ('GAM003', 0, 0),
      ('GAM004', 0, 0),
      ('GAM005', 0, 1),
      ('GAM006', 0, 0),
      ('GAM007', 9, 12),
      ('GAM008', 15, 12),
      ('GAM009', 17, 11),
      ('GAM010', 0, 1)
  ) as values_table(registration, prisons, pursuits)
  join public.officers o
    on o.owner_id = v_owner
   and o.registration = values_table.registration
  on conflict (owner_id, officer_id, year, month, week)
  do update set
    prisons = excluded.prisons,
    pursuits = excluded.pursuits,
    note = excluded.note;
end $$;
