-- ============================================================================
-- Lacak Duit Pro: langganan, paket, permintaan pembayaran manual, konfigurasi
-- ============================================================================
-- Jalankan SEKALI di Supabase -> proyek Lacak Duit -> SQL Editor.
-- Aman dijalankan ulang (idempotent): data yang sudah ada tidak ditimpa.
-- Penjelasan lengkap: docs/langganan-pembayaran.md
--
-- Prinsip keamanan:
--   * Browser TIDAK boleh menulis langsung ke app_subscriptions maupun
--     payment_requests. Semua perubahan lewat fungsi security definer di bawah.
--   * Harga & durasi paket dibaca dari database (subscription_plans), bukan
--     dari kiriman browser.
--   * Aksi admin (setujui/tolak/beri akses) dicek lewat is_platform_admin().
-- ============================================================================

-- Prasyarat: fungsi is_platform_admin() dari docs/analitik-pengunjung.md (Bagian 2)
do $$
begin
  if to_regprocedure('public.is_platform_admin()') is null then
    raise exception 'Jalankan dulu "Bagian 2" di docs/analitik-pengunjung.md: fungsi is_platform_admin() belum ada.';
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 1. Paket langganan (harga bisa diubah kapan saja lewat SQL Editor, tanpa deploy)
-- ----------------------------------------------------------------------------
create table if not exists subscription_plans (
  plan        text primary key check (plan ~ '^[a-z0-9]+$'),
  label       text not null check (char_length(label) <= 60),
  price       integer not null check (price > 0),
  days        integer not null check (days > 0),
  sort_order  integer not null default 0,
  active      boolean not null default true
);

-- Paket "seumurhidup" sengaja NONAKTIF dulu supaya tidak menggerus langganan
-- berulang. Aktifkan hanya untuk promo terbatas:
--   update subscription_plans set active = true where plan = 'seumurhidup';
insert into subscription_plans (plan, label, price, days, sort_order, active) values
  ('1bulan',      '1 Bulan',                 19000,    30, 1, true),
  ('3bulan',      '3 Bulan',                 49000,    90, 2, true),
  ('12bulan',     '12 Bulan',               149000,   365, 3, true),
  ('seumurhidup', 'Seumur Hidup (promo terbatas)', 249000, 36500, 4, false)
on conflict (plan) do nothing;

alter table subscription_plans enable row level security;

drop policy if exists "Paket aktif terbaca pengguna login" on subscription_plans;
create policy "Paket aktif terbaca pengguna login"
on subscription_plans
for select
to authenticated
using (active);

revoke all on subscription_plans from anon, authenticated;
grant select on subscription_plans to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Status langganan per pengguna
-- ----------------------------------------------------------------------------
create table if not exists app_subscriptions (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  status         text not null default 'trial' check (status in ('trial', 'aktif')),
  trial_ends_at  timestamptz not null,
  paid_until     timestamptz,
  plan           text references subscription_plans (plan),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table app_subscriptions enable row level security;

drop policy if exists "Pengguna membaca langganan sendiri" on app_subscriptions;
create policy "Pengguna membaca langganan sendiri"
on app_subscriptions
for select
to authenticated
using (user_id = auth.uid());

-- Tidak ada policy INSERT/UPDATE/DELETE: browser tidak bisa mengubah status
-- langganannya sendiri. Hak tabel juga dicabut sebagai lapisan kedua.
revoke all on app_subscriptions from anon, authenticated;
grant select on app_subscriptions to authenticated;

-- Dipanggil aplikasi setelah login: membuat trial 30 hari bila belum ada baris.
create or replace function ensure_my_subscription()
returns app_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row app_subscriptions;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu';
  end if;

  insert into app_subscriptions (user_id, status, trial_ends_at)
  values (auth.uid(), 'trial', now() + interval '30 days')
  on conflict (user_id) do nothing;

  select * into v_row from app_subscriptions where user_id = auth.uid();
  return v_row;
end
$$;

-- ----------------------------------------------------------------------------
-- 3. Permintaan pembayaran manual (transfer / QRIS + kode unik)
-- ----------------------------------------------------------------------------
create table if not exists payment_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  plan         text not null references subscription_plans (plan),
  base_price   integer not null check (base_price > 0),
  unique_code  integer not null check (unique_code between 1 and 99),
  amount       integer not null check (amount > 0),
  days         integer not null check (days > 0),
  status       text not null default 'menunggu'
               check (status in ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
  admin_note   text check (char_length(admin_note) <= 200),
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid
);

-- Satu permintaan "menunggu" per pengguna.
create unique index if not exists payment_requests_one_pending_per_user
  on payment_requests (user_id) where status = 'menunggu';

create index if not exists payment_requests_status_created_idx
  on payment_requests (status, created_at desc);

create index if not exists payment_requests_user_created_idx
  on payment_requests (user_id, created_at desc);

alter table payment_requests enable row level security;

drop policy if exists "Pengguna membaca permintaan bayar sendiri" on payment_requests;
create policy "Pengguna membaca permintaan bayar sendiri"
on payment_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admin membaca semua permintaan bayar" on payment_requests;
create policy "Admin membaca semua permintaan bayar"
on payment_requests
for select
to authenticated
using (is_platform_admin());

revoke all on payment_requests from anon, authenticated;
grant select on payment_requests to authenticated;

-- Pengguna membuat tagihan. Harga & durasi diambil dari subscription_plans.
-- Kode unik (1-99) ditambahkan ke nominal supaya mudah mencocokkan mutasi bank.
create or replace function create_payment_request(p_plan text)
returns payment_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  subscription_plans;
  v_code  integer;
  v_try   integer := 0;
  v_today integer;
  v_row   payment_requests;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu';
  end if;

  select * into v_plan from subscription_plans where plan = p_plan and active;
  if not found then
    raise exception 'Paket tidak tersedia';
  end if;

  select count(*) into v_today
  from payment_requests
  where user_id = auth.uid() and created_at > now() - interval '24 hours';
  if v_today >= 5 then
    raise exception 'Terlalu banyak permintaan hari ini, coba lagi besok';
  end if;

  -- Ganti paket: batalkan permintaan menunggu yang lama milik pengguna ini.
  update payment_requests
     set status = 'dibatalkan', processed_at = now()
   where user_id = auth.uid() and status = 'menunggu';

  loop
    v_code := 1 + floor(random() * 99)::integer;
    exit when not exists (
      select 1 from payment_requests
      where status = 'menunggu' and base_price = v_plan.price and unique_code = v_code
    );
    v_try := v_try + 1;
    if v_try > 200 then
      raise exception 'Sistem sedang penuh, coba lagi nanti';
    end if;
  end loop;

  insert into payment_requests (user_id, plan, base_price, unique_code, amount, days)
  values (auth.uid(), v_plan.plan, v_plan.price, v_code, v_plan.price + v_code, v_plan.days)
  returning * into v_row;

  return v_row;
end
$$;

create or replace function cancel_my_payment_request()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu';
  end if;
  update payment_requests
     set status = 'dibatalkan', processed_at = now()
   where user_id = auth.uid() and status = 'menunggu';
  get diagnostics v_rows = row_count;
  return v_rows;
end
$$;

-- ----------------------------------------------------------------------------
-- 4. Fungsi admin platform
-- ----------------------------------------------------------------------------
create or replace function admin_list_payments(p_status text default 'menunggu')
returns table (
  id          bigint,
  user_id     uuid,
  email       text,
  plan        text,
  plan_label  text,
  amount      integer,
  days        integer,
  status      text,
  admin_note  text,
  created_at  timestamptz,
  processed_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select r.id, r.user_id, u.email::text, r.plan, p.label, r.amount, r.days,
         r.status, r.admin_note, r.created_at, r.processed_at
  from public.payment_requests r
  join auth.users u on u.id = r.user_id
  join public.subscription_plans p on p.plan = r.plan
  where public.is_platform_admin()
    and (p_status is null or r.status = p_status)
  order by r.created_at desc
  limit 200
$$;

-- Perpanjangan dihitung dari akhir masa aktif/trial yang masih berjalan,
-- sehingga sisa trial tidak hangus.
create or replace function admin_approve_payment(p_id bigint)
returns app_subscriptions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_req  payment_requests;
  v_sub  app_subscriptions;
  v_base timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'Bukan admin';
  end if;

  select * into v_req from payment_requests where id = p_id and status = 'menunggu' for update;
  if not found then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses';
  end if;

  insert into app_subscriptions (user_id, status, trial_ends_at)
  values (v_req.user_id, 'trial', now())
  on conflict (user_id) do nothing;

  select * into v_sub from app_subscriptions where user_id = v_req.user_id for update;
  v_base := greatest(now(), coalesce(v_sub.paid_until, v_sub.trial_ends_at));

  update app_subscriptions
     set status = 'aktif',
         paid_until = v_base + v_req.days * interval '1 day',
         plan = v_req.plan,
         updated_at = now()
   where user_id = v_req.user_id
   returning * into v_sub;

  update payment_requests
     set status = 'disetujui', processed_at = now(), processed_by = auth.uid()
   where id = v_req.id;

  return v_sub;
end
$$;

create or replace function admin_reject_payment(p_id bigint, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rows integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Bukan admin';
  end if;

  update payment_requests
     set status = 'ditolak',
         admin_note = left(p_note, 200),
         processed_at = now(),
         processed_by = auth.uid()
   where id = p_id and status = 'menunggu';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses';
  end if;
  return v_rows;
end
$$;

-- Beri akses Pro manual (mis. hadiah, penguji, pelanggan Dokter Laundry).
create or replace function admin_grant_days(p_email text, p_days integer)
returns app_subscriptions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid  uuid;
  v_sub  app_subscriptions;
  v_base timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'Bukan admin';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'Jumlah hari harus 1 sampai 3650';
  end if;

  select id into v_uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_uid is null then
    raise exception 'Akun dengan email itu tidak ditemukan';
  end if;

  insert into app_subscriptions (user_id, status, trial_ends_at)
  values (v_uid, 'trial', now())
  on conflict (user_id) do nothing;

  select * into v_sub from app_subscriptions where user_id = v_uid for update;
  v_base := greatest(now(), coalesce(v_sub.paid_until, v_sub.trial_ends_at));

  update app_subscriptions
     set status = 'aktif',
         paid_until = v_base + p_days * interval '1 day',
         updated_at = now()
   where user_id = v_uid
   returning * into v_sub;

  return v_sub;
end
$$;

-- ----------------------------------------------------------------------------
-- 5. Konfigurasi pembayaran (diisi manual lewat SQL Editor, tidak ada di kode)
-- ----------------------------------------------------------------------------
-- Repo ini publik, jadi nomor rekening dan nomor WhatsApp disimpan di database.
create table if not exists app_config (
  key   text primary key check (key in ('payment_text', 'qris_url', 'admin_wa')),
  value text not null check (char_length(value) <= 1000)
);

alter table app_config enable row level security;

drop policy if exists "Konfigurasi terbaca pengguna login" on app_config;
create policy "Konfigurasi terbaca pengguna login"
on app_config
for select
to authenticated
using (true);

revoke all on app_config from anon, authenticated;
grant select on app_config to authenticated;

-- Contoh pengisian (ganti isinya, lalu jalankan SENDIRI di SQL Editor):
--   insert into app_config (key, value) values
--     ('payment_text', E'Bank BRI\nNo. Rekening: 0000 0000 0000\nAtas Nama: Nama Anda'),
--     ('qris_url',     'https://alamat-gambar-qris-anda.png'),
--     ('admin_wa',     '628xxxxxxxxxx')
--   on conflict (key) do update set value = excluded.value;

-- ----------------------------------------------------------------------------
-- 6. Hak eksekusi fungsi
-- ----------------------------------------------------------------------------
revoke all on function ensure_my_subscription() from public, anon;
revoke all on function create_payment_request(text) from public, anon;
revoke all on function cancel_my_payment_request() from public, anon;
revoke all on function admin_list_payments(text) from public, anon;
revoke all on function admin_approve_payment(bigint) from public, anon;
revoke all on function admin_reject_payment(bigint, text) from public, anon;
revoke all on function admin_grant_days(text, integer) from public, anon;

grant execute on function ensure_my_subscription() to authenticated;
grant execute on function create_payment_request(text) to authenticated;
grant execute on function cancel_my_payment_request() to authenticated;
grant execute on function admin_list_payments(text) to authenticated;
grant execute on function admin_approve_payment(bigint) to authenticated;
grant execute on function admin_reject_payment(bigint, text) to authenticated;
grant execute on function admin_grant_days(text, integer) to authenticated;
