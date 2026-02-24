-- ============================================================
-- STEP 3: Friendships table + expanded RLS policies
-- ============================================================

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  user_a_id  uuid references public.profiles(id) on delete cascade,
  user_b_id  uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_a_id, user_b_id)
);

alter table public.friendships enable row level security;

-- Anyone involved in a friendship can see it
create policy "friendship_participants_can_read"
  on public.friendships
  for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- Either user can create a friendship
create policy "users_can_create_friendship"
  on public.friendships
  for insert
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- ============================================================
-- Updated profile policies
-- ============================================================

-- Drop old read policy
drop policy if exists "users_read_own_profile" on public.profiles;

-- Policy 1: Users can read their own profile
create policy "read_own_profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Policy 2: Friends can read each other's profiles
create policy "friends_can_read_profile"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.friendships f
      where
        (f.user_a_id = auth.uid() and f.user_b_id = id) or
        (f.user_b_id = auth.uid() and f.user_a_id = id)
    )
  );

-- Policy 3: Admins can read ALL profiles
create policy "admins_read_all_profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
