-- =============================================================================
-- FishTrack — skema awal
-- Zona waktu tampilan: Asia/Jakarta. Timestamp disimpan sebagai TIMESTAMPTZ (UTC).
-- Setiap baris dimiliki oleh pengguna yang login (user_id = auth.uid()),
-- dan RLS hanya mengizinkan pemilik membaca/mengubah datanya sendiri.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. KOLAM
-- ---------------------------------------------------------------------------
create table public.ponds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  location      text,
  volume_liters numeric not null check (volume_liters > 0),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index ponds_user_id_idx on public.ponds (user_id);

-- ---------------------------------------------------------------------------
-- 2. SIKLUS BUDIDAYA
-- ---------------------------------------------------------------------------
create table public.cultivation_batches (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- RESTRICT: kolam dengan riwayat siklus tidak bisa dihapus
  pond_id             uuid not null references public.ponds (id) on delete restrict,
  fish_type           text not null check (length(trim(fish_type)) > 0),
  initial_quantity    integer not null check (initial_quantity > 0),
  current_quantity    integer not null check (current_quantity >= 0),
  stocking_date       date not null,
  target_harvest_date date,
  harvest_date        date,
  harvest_quantity    integer check (harvest_quantity is null or harvest_quantity >= 0),
  harvest_weight_kg   numeric check (harvest_weight_kg is null or harvest_weight_kg >= 0),
  status              text not null default 'active' check (status in ('active', 'harvested', 'cancelled')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint current_not_above_initial check (current_quantity <= initial_quantity),
  constraint target_after_stocking check (target_harvest_date is null or target_harvest_date > stocking_date),
  constraint harvest_after_stocking check (harvest_date is null or harvest_date >= stocking_date),
  constraint harvested_has_date check (status <> 'harvested' or harvest_date is not null)
);

-- Aturan: satu kolam hanya boleh punya satu siklus aktif
create unique index one_active_batch_per_pond on public.cultivation_batches (pond_id) where status = 'active';
create index cultivation_batches_user_id_idx on public.cultivation_batches (user_id);
create index cultivation_batches_pond_id_idx on public.cultivation_batches (pond_id);

-- ---------------------------------------------------------------------------
-- 3. CATATAN PAKAN
-- ---------------------------------------------------------------------------
create table public.feed_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  batch_id   uuid not null references public.cultivation_batches (id) on delete restrict,
  feed_name  text not null check (length(trim(feed_name)) > 0),
  quantity   numeric not null check (quantity > 0),
  unit       text not null check (unit in ('kg', 'gram')),
  fed_at     timestamptz not null default now(),
  notes      text,
  created_at timestamptz not null default now()
);
create index feed_logs_user_id_idx on public.feed_logs (user_id);
create index feed_logs_batch_fed_at_idx on public.feed_logs (batch_id, fed_at desc);

-- ---------------------------------------------------------------------------
-- 4. PRODUK VITAMIN (takaran diisi pengguna dari label kemasan; tidak ada data bawaan)
-- ---------------------------------------------------------------------------
create table public.vitamin_products (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  brand              text,
  application_method text,
  dosage_basis       text not null check (dosage_basis in ('water_volume', 'fish_count', 'fish_biomass', 'feed_weight')),
  dosage_value       numeric not null check (dosage_value > 0),
  dosage_unit        text not null check (length(trim(dosage_unit)) > 0),
  reference_quantity numeric not null check (reference_quantity > 0),
  reference_unit     text not null,
  instructions       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Satuan acuan harus cocok dengan dasar takaran
  constraint reference_unit_matches_basis check (
    (dosage_basis = 'water_volume' and reference_unit in ('liter', 'm3')) or
    (dosage_basis = 'fish_count'   and reference_unit = 'ekor') or
    (dosage_basis in ('fish_biomass', 'feed_weight') and reference_unit in ('kg', 'gram'))
  )
);
create index vitamin_products_user_id_idx on public.vitamin_products (user_id);

-- ---------------------------------------------------------------------------
-- 5. CATATAN VITAMIN
-- ---------------------------------------------------------------------------
create table public.vitamin_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  batch_id           uuid not null references public.cultivation_batches (id) on delete restrict,
  vitamin_product_id uuid references public.vitamin_products (id) on delete set null,
  dosage_used        numeric not null check (dosage_used > 0),
  dosage_unit        text not null,
  applied_at         timestamptz not null default now(),
  notes              text,
  created_at         timestamptz not null default now()
);
create index vitamin_logs_user_id_idx on public.vitamin_logs (user_id);
create index vitamin_logs_batch_id_idx on public.vitamin_logs (batch_id);
create index vitamin_logs_product_id_idx on public.vitamin_logs (vitamin_product_id);

-- ---------------------------------------------------------------------------
-- 6. RIWAYAT AKTIVITAS
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  batch_id      uuid not null references public.cultivation_batches (id) on delete restrict,
  activity_type text not null check (activity_type in ('feeding', 'vitamin', 'mortality', 'water_change', 'sorting', 'other')),
  description   text not null,
  quantity      numeric,
  unit          text,
  recorded_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  constraint mortality_quantity_valid check (
    activity_type <> 'mortality' or (quantity is not null and quantity > 0 and quantity = trunc(quantity))
  )
);
create index activity_logs_user_recorded_idx on public.activity_logs (user_id, recorded_at desc);
create index activity_logs_batch_id_idx on public.activity_logs (batch_id);

-- =============================================================================
-- TRIGGER
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ponds_set_updated_at before update on public.ponds
  for each row execute function public.set_updated_at();
create trigger cultivation_batches_set_updated_at before update on public.cultivation_batches
  for each row execute function public.set_updated_at();
create trigger vitamin_products_set_updated_at before update on public.vitamin_products
  for each row execute function public.set_updated_at();

-- Kematian ikan: kurangi populasi secara atomik, tolak jika melebihi populasi
create or replace function public.apply_mortality()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_current integer;
  v_status  text;
begin
  if new.activity_type <> 'mortality' then
    return new;
  end if;

  select current_quantity, status into v_current, v_status
  from public.cultivation_batches
  where id = new.batch_id
  for update;

  if v_current is null then
    raise exception 'Siklus tidak ditemukan.';
  end if;
  if v_status <> 'active' then
    raise exception 'Kematian hanya bisa dicatat pada siklus yang sedang berjalan.';
  end if;
  if new.quantity > v_current then
    raise exception 'Jumlah ikan mati (%) melebihi perkiraan jumlah ikan saat ini (% ekor).', new.quantity::integer, v_current;
  end if;

  update public.cultivation_batches
  set current_quantity = current_quantity - new.quantity::integer
  where id = new.batch_id;

  return new;
end;
$$;

create trigger activity_logs_apply_mortality before insert on public.activity_logs
  for each row execute function public.apply_mortality();

-- Catatan pakan → otomatis masuk riwayat aktivitas (satu transaksi)
create or replace function public.log_feed_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.activity_logs (user_id, batch_id, activity_type, description, quantity, unit, recorded_at)
  values (new.user_id, new.batch_id, 'feeding', 'Beri pakan ' || new.feed_name, new.quantity, new.unit, new.fed_at);
  return new;
end;
$$;

create trigger feed_logs_log_activity after insert on public.feed_logs
  for each row execute function public.log_feed_activity();

-- Catatan vitamin → otomatis masuk riwayat aktivitas (satu transaksi)
create or replace function public.log_vitamin_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_name text;
begin
  select name into v_name from public.vitamin_products where id = new.vitamin_product_id;
  insert into public.activity_logs (user_id, batch_id, activity_type, description, quantity, unit, recorded_at)
  values (new.user_id, new.batch_id, 'vitamin', 'Beri ' || coalesce(v_name, 'vitamin'), new.dosage_used, new.dosage_unit, new.applied_at);
  return new;
end;
$$;

create trigger vitamin_logs_log_activity after insert on public.vitamin_logs
  for each row execute function public.log_vitamin_activity();

-- =============================================================================
-- ROW LEVEL SECURITY — hanya pemilik data (pengguna login) yang punya akses.
-- Peran anon tidak punya policy sama sekali → tidak bisa membaca/menulis apa pun.
-- =============================================================================

alter table public.ponds               enable row level security;
alter table public.cultivation_batches enable row level security;
alter table public.feed_logs           enable row level security;
alter table public.vitamin_products    enable row level security;
alter table public.vitamin_logs        enable row level security;
alter table public.activity_logs       enable row level security;

create policy "ponds: pemilik" on public.ponds
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "vitamin_products: pemilik" on public.vitamin_products
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Baris anak hanya boleh menunjuk ke kolam/siklus milik pengguna yang sama
create policy "cultivation_batches: pemilik" on public.cultivation_batches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.ponds p where p.id = pond_id and p.user_id = (select auth.uid()))
  );

create policy "feed_logs: pemilik" on public.feed_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.cultivation_batches b where b.id = batch_id and b.user_id = (select auth.uid()))
  );

create policy "vitamin_logs: pemilik" on public.vitamin_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.cultivation_batches b where b.id = batch_id and b.user_id = (select auth.uid()))
    and (
      vitamin_product_id is null
      or exists (select 1 from public.vitamin_products v where v.id = vitamin_product_id and v.user_id = (select auth.uid()))
    )
  );

create policy "activity_logs: pemilik" on public.activity_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.cultivation_batches b where b.id = batch_id and b.user_id = (select auth.uid()))
  );
