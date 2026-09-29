-- Arayya Art & Space — Retail & Financial Operations MVP (Stage 9)
-- products, expense_items (master data) + sales_transactions,
-- expense_transactions (daily recap). No BOM/auto stock deduction — see
-- docs/stage-9-retail-financial-operations-plan.md.

-- ============================================================
-- products
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  price numeric not null check (price > 0),
  unit text not null default 'paket',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.products enable row level security;

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();

create policy "products_select_authenticated" on public.products
  for select to authenticated using (true);
create policy "products_write_admin" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products_update_admin" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_delete_super_admin" on public.products
  for delete to authenticated using (public.is_super_admin());

-- ============================================================
-- expense_items (bahan/consumables catalog)
-- ============================================================
create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  unit text not null default 'pcs',
  default_price numeric check (default_price is null or default_price > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.expense_items enable row level security;

drop trigger if exists set_updated_at on public.expense_items;
create trigger set_updated_at before update on public.expense_items
  for each row execute procedure public.set_updated_at();

create policy "expense_items_select_authenticated" on public.expense_items
  for select to authenticated using (true);
create policy "expense_items_write_admin" on public.expense_items
  for insert to authenticated with check (public.is_admin());
create policy "expense_items_update_admin" on public.expense_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "expense_items_delete_super_admin" on public.expense_items
  for delete to authenticated using (public.is_super_admin());

-- ============================================================
-- updated_by helper — stamps auth.uid() on every UPDATE, so the
-- transaction tables below get a reliable audit trail (who last touched
-- a row) without the app having to remember to pass it on every write.
-- ============================================================
create or replace function public.set_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- ============================================================
-- sales_transactions
-- ============================================================
create table if not exists public.sales_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  quantity integer not null check (quantity > 0),
  -- Snapshot of products.price at insert time — deliberately NOT a live
  -- join, so historical recap stays correct if a product's price changes
  -- later.
  unit_price numeric not null check (unit_price > 0),
  total numeric generated always as (quantity * unit_price) stored,
  transaction_date date not null default current_date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.sales_transactions enable row level security;

drop trigger if exists set_updated_at on public.sales_transactions;
create trigger set_updated_at before update on public.sales_transactions
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_by on public.sales_transactions;
create trigger set_updated_by before update on public.sales_transactions
  for each row execute procedure public.set_updated_by();

-- Model A (Stage 5.3 decision): any authenticated role may create/edit
-- any row — archive (soft delete) and hard delete are the only actions
-- restricted by role.
create policy "sales_transactions_select_authenticated" on public.sales_transactions
  for select to authenticated using (true);
create policy "sales_transactions_insert_authenticated" on public.sales_transactions
  for insert to authenticated with check (true);
create policy "sales_transactions_update_authenticated" on public.sales_transactions
  for update to authenticated using (true) with check (true);
create policy "sales_transactions_delete_super_admin" on public.sales_transactions
  for delete to authenticated using (public.is_super_admin());

-- ============================================================
-- expense_transactions
-- ============================================================
create table if not exists public.expense_transactions (
  id uuid primary key default gen_random_uuid(),
  expense_item_id uuid not null references public.expense_items (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price > 0),
  total numeric generated always as (quantity * unit_price) stored,
  transaction_date date not null default current_date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.expense_transactions enable row level security;

drop trigger if exists set_updated_at on public.expense_transactions;
create trigger set_updated_at before update on public.expense_transactions
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_by on public.expense_transactions;
create trigger set_updated_by before update on public.expense_transactions
  for each row execute procedure public.set_updated_by();

create policy "expense_transactions_select_authenticated" on public.expense_transactions
  for select to authenticated using (true);
create policy "expense_transactions_insert_authenticated" on public.expense_transactions
  for insert to authenticated with check (true);
create policy "expense_transactions_update_authenticated" on public.expense_transactions
  for update to authenticated using (true) with check (true);
create policy "expense_transactions_delete_super_admin" on public.expense_transactions
  for delete to authenticated using (public.is_super_admin());

-- ============================================================
-- Seed master data — from owner-provided product composition file
-- (2026_MASTER_ARayya Art & Creative Space). See plan doc § Master data
-- awal for the source table.
-- ============================================================
insert into public.products (name, category, price) values
  ('Melukis Kanvas Polos', 'Melukis', 29000),
  ('Melukis Kanvas Angka', 'Melukis', 54000),
  ('Melukis Kanvas Pola', 'Melukis', 34000),
  ('Melukis Bucket-Hat', 'Melukis', 39000),
  ('Melukis Tote-Bag', 'Melukis', 24000),
  ('Melukis Pouch', 'Melukis', 24000),
  ('Melukis Cermin', 'Melukis', 39000),
  ('Melukis Beruang', 'Melukis', 34000),
  ('Melukis Akrilik', 'Melukis', 34000),
  ('Melukis Patung', 'Melukis', 19000),
  ('Melukis Pot Tanah Liat', 'Melukis', 39000),
  ('Melukis Pot Gypsum', 'Melukis', 39000),
  ('Melukis Kipas Pola', 'Melukis', 19000),
  ('Melukis Coaster', 'Melukis', 29000),
  ('Menghias Cermin', 'Menghias', 29000),
  ('Meronce Manik-manik', 'Meronce', 29000)
on conflict (name) do nothing;

insert into public.expense_items (name, category, unit, default_price) values
  ('Kanvas 20x20', 'Bahan Melukis', 'pcs', 15000),
  ('Kanvas Angka', 'Bahan Melukis', 'pcs', 35000),
  ('Kanvas Pola', 'Bahan Melukis', 'pcs', 20000),
  ('Bucket-Hat', 'Bahan Melukis', 'pcs', 20000),
  ('Tote Bag', 'Bahan Melukis', 'pcs', 10000),
  ('Pouch', 'Bahan Melukis', 'pcs', 10000),
  ('Cermin Hexagon', 'Bahan Melukis', 'pcs', 20000),
  ('Ganci Beruang', 'Bahan Melukis', 'pcs', 15000),
  ('Ganci Akrilik', 'Bahan Melukis', 'pcs', 15000),
  ('Patung Gypsum', 'Bahan Melukis', 'pcs', 8000),
  ('Pot Tanah Liat', 'Bahan Melukis', 'pcs', 20000),
  ('Pot Gypsum', 'Bahan Melukis', 'pcs', 20000),
  ('Kipas Pola', 'Bahan Melukis', 'pcs', 8000),
  ('Coaster Gypsum', 'Bahan Melukis', 'pcs', 12000),
  ('Cermin Kotak', 'Bahan Menghias', 'pcs', 15000),
  ('Manik-manik', 'Bahan Meronce', 'set', 12000),
  ('Cat 12 Warna', 'Bahan Habis Pakai', 'set', 25000),
  ('Kuas', 'Bahan Habis Pakai', 'pcs', 3000),
  ('Piring Palette', 'Bahan Habis Pakai', 'pcs', 2000),
  ('Benang', 'Bahan Meronce', 'gulung', 5000)
on conflict (name) do nothing;
