-- GAM ANALYTICS WEB — ATUALIZAÇÃO V0.7.1
-- Identidade do Efetivo: foto e referência do Discord.
-- Execute uma vez no SQL Editor do Supabase.

begin;

alter table public.officers
  add column if not exists photo_url text,
  add column if not exists photo_path text,
  add column if not exists discord_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'officer-photos',
  'officer-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "officer_photos_member_select" on storage.objects;
create policy "officer_photos_member_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'officer-photos'
  and exists (
    select 1
    from public.gam_members gm
    where gm.user_id = auth.uid()
      and gm.owner_id::text = (storage.foldername(name))[1]
      and gm.active = true
  )
);

drop policy if exists "officer_photos_admin_insert" on storage.objects;
create policy "officer_photos_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'officer-photos'
  and exists (
    select 1
    from public.gam_members gm
    where gm.user_id = auth.uid()
      and gm.owner_id::text = (storage.foldername(name))[1]
      and gm.role::text = 'Administrador'
      and gm.active = true
  )
);

drop policy if exists "officer_photos_admin_update" on storage.objects;
create policy "officer_photos_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'officer-photos'
  and exists (
    select 1
    from public.gam_members gm
    where gm.user_id = auth.uid()
      and gm.owner_id::text = (storage.foldername(name))[1]
      and gm.role::text = 'Administrador'
      and gm.active = true
  )
)
with check (
  bucket_id = 'officer-photos'
  and exists (
    select 1
    from public.gam_members gm
    where gm.user_id = auth.uid()
      and gm.owner_id::text = (storage.foldername(name))[1]
      and gm.role::text = 'Administrador'
      and gm.active = true
  )
);

drop policy if exists "officer_photos_admin_delete" on storage.objects;
create policy "officer_photos_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'officer-photos'
  and exists (
    select 1
    from public.gam_members gm
    where gm.user_id = auth.uid()
      and gm.owner_id::text = (storage.foldername(name))[1]
      and gm.role::text = 'Administrador'
      and gm.active = true
  )
);

commit;

-- Atualiza o cache da API após a consolidação da V0.7.2.
NOTIFY pgrst, 'reload schema';
