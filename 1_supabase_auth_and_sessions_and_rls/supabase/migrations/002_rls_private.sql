-- ============================================================
-- STEP 2: Enable RLS — users can only read their own profile
-- ============================================================

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "users_read_own_profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "users_update_own_profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
