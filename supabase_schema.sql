-- =====================================================================
-- HiddenBite - skema Supabase (KOSONG, tanpa data contoh)
-- Cara pakai: Supabase > SQL Editor > New query > tempel semua > Run
-- =====================================================================

-- ---------- Tabel ----------
create table if not exists public.places (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (char_length(nama) between 2 and 100),
  kategori    text not null check (kategori in ('Coto','Jajanan','Mie','Sop Saudara','Cafe','Seafood','Pallubasa')),
  area        text not null check (char_length(area) <= 80),
  alamat      text not null check (char_length(alamat) <= 300),
  patokan     text not null check (char_length(patokan) <= 200),
  maps_url    text not null check (char_length(maps_url) <= 500),
  lat         double precision,
  lng         double precision,
  harga_min   int  not null default 0 check (harga_min >= 0),
  harga_max   int  not null default 0 check (harga_max >= 0),
  jam_buka    time,
  jam_tutup   time,
  suasana     text[] not null default '{}',
  fasilitas   text[] not null default '{}',
  deskripsi   text not null check (char_length(deskripsi) <= 2000),
  video_url   text check (video_url is null or char_length(video_url) <= 300),
  fotos       text[] not null default '{}',
  status      text not null default 'menunggu' check (status in ('menunggu','tampil','sembunyi','ditolak')),
  created_at  timestamptz not null default now()
);

create table if not exists public.menus (
  id        bigint generated always as identity primary key,
  place_id  uuid not null references public.places(id) on delete cascade,
  nama      text not null check (char_length(nama) <= 100),
  harga     int  not null check (harga > 0)
);

create table if not exists public.reviews (
  id         bigint generated always as identity primary key,
  place_id   uuid not null references public.places(id) on delete cascade,
  nama       text not null default 'Anonim' check (char_length(nama) <= 60),
  rating     smallint not null check (rating between 1 and 5),
  komentar   text not null check (char_length(komentar) between 1 and 1000),
  status     text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak')),
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create index if not exists reviews_place_idx on public.reviews(place_id);
create index if not exists menus_place_idx   on public.menus(place_id);

-- ---------- Fungsi bantu (SECURITY DEFINER agar tidak terkena RLS) ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create or replace function public.place_has_status(pid uuid, st text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.places where id = pid and status = st) $$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.place_has_status(uuid, text) to anon, authenticated;

-- ---------- Hak akses tabel ----------
grant usage on schema public to anon, authenticated;
grant select, insert on public.places, public.menus, public.reviews to anon, authenticated;
grant update, delete on public.places, public.menus, public.reviews to authenticated;

-- ---------- RLS ----------
alter table public.places  enable row level security;
alter table public.menus   enable row level security;
alter table public.reviews enable row level security;
alter table public.admins  enable row level security;   -- tanpa policy = tidak bisa diakses lewat API

-- places
drop policy if exists places_select on public.places;
drop policy if exists places_insert on public.places;
drop policy if exists places_update on public.places;
drop policy if exists places_delete on public.places;
create policy places_select on public.places for select to anon, authenticated
  using (status = 'tampil' or public.is_admin());
create policy places_insert on public.places for insert to anon, authenticated
  with check (status = 'menunggu');                       -- pengunjung hanya boleh mengirim ke antrean
create policy places_update on public.places for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy places_delete on public.places for delete to authenticated
  using (public.is_admin());

-- menus
drop policy if exists menus_select on public.menus;
drop policy if exists menus_insert on public.menus;
drop policy if exists menus_update on public.menus;
drop policy if exists menus_delete on public.menus;
create policy menus_select on public.menus for select to anon, authenticated
  using (public.place_has_status(place_id, 'tampil') or public.is_admin());
create policy menus_insert on public.menus for insert to anon, authenticated
  with check (public.place_has_status(place_id, 'menunggu') or public.is_admin());
create policy menus_update on public.menus for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy menus_delete on public.menus for delete to authenticated
  using (public.is_admin());

-- reviews
drop policy if exists reviews_select on public.reviews;
drop policy if exists reviews_insert on public.reviews;
drop policy if exists reviews_update on public.reviews;
drop policy if exists reviews_delete on public.reviews;
create policy reviews_select on public.reviews for select to anon, authenticated
  using (status = 'disetujui' or public.is_admin());
create policy reviews_insert on public.reviews for insert to anon, authenticated
  with check (status = 'menunggu' and public.place_has_status(place_id, 'tampil'));
create policy reviews_update on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy reviews_delete on public.reviews for delete to authenticated
  using (public.is_admin());

-- ---------- Penyimpanan foto ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg','image/png'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png'];

drop policy if exists fotos_upload on storage.objects;
drop policy if exists fotos_hapus  on storage.objects;
create policy fotos_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'fotos');
create policy fotos_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

-- =====================================================================
-- LANGKAH TERAKHIR (jalankan SETELAH membuat user admin di
-- Authentication > Users > Add user, centang "Auto Confirm User"):
--
insert into public.admins (user_id)
select id from auth.users where email = 'toastbreadwithtea@gmail.com';
-- =====================================================================
