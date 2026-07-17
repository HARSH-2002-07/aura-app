create extension if not exists pgcrypto;
create extension if not exists vector;

-- 1. AGSE Subscriptions & Analyses
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'free' check (status in ('free', 'active', 'past_due', 'cancelled')),
  analyses_count integer not null default 0 check (analyses_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

-- 2. Style Profiles
create table if not exists public.style_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  color_season text,
  body_shape text,
  style_archetype text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Wardrobe Items
create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  meta jsonb not null,
  embedding vector(512),
  created_at timestamptz not null default now()
);

-- 4. Saved Outfits
create table if not exists public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  item_ids uuid[] not null,
  created_at timestamptz not null default now()
);

-- 5. Outfit Feedback
create table if not exists public.outfit_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_ids uuid[] not null,
  liked boolean not null,
  created_at timestamptz not null default now()
);

-- Triggers for updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger trg_style_profiles_updated_at before update on public.style_profiles for each row execute function public.set_updated_at();

-- Trigger for Auto-provisioning subscription
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id, status, analyses_count) values (new.id, 'free', 0) on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS Enablement
alter table public.subscriptions enable row level security;
alter table public.analyses enable row level security;
alter table public.style_profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.saved_outfits enable row level security;
alter table public.outfit_feedback enable row level security;

-- Select Policies (Users can only see their own)
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can view own analyses" on public.analyses for select using (auth.uid() = user_id);
create policy "Users can view own style_profile" on public.style_profiles for select using (auth.uid() = user_id);
create policy "Users can view own wardrobe" on public.wardrobe_items for select using (auth.uid() = user_id);
create policy "Users can view own outfits" on public.saved_outfits for select using (auth.uid() = user_id);
create policy "Users can view own feedback" on public.outfit_feedback for select using (auth.uid() = user_id);

-- Write Policies (Users can modify their own data except for subscription limits)
create policy "Users can update own style_profile" on public.style_profiles for update using (auth.uid() = user_id);
create policy "Users can insert own style_profile" on public.style_profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own wardrobe" on public.wardrobe_items for update using (auth.uid() = user_id);
create policy "Users can insert own wardrobe" on public.wardrobe_items for insert with check (auth.uid() = user_id);
create policy "Users can delete own wardrobe" on public.wardrobe_items for delete using (auth.uid() = user_id);

create policy "Users can update own outfits" on public.saved_outfits for update using (auth.uid() = user_id);
create policy "Users can insert own outfits" on public.saved_outfits for insert with check (auth.uid() = user_id);
create policy "Users can delete own outfits" on public.saved_outfits for delete using (auth.uid() = user_id);

create policy "Users can insert own feedback" on public.outfit_feedback for insert with check (auth.uid() = user_id);
create policy "Users can delete own feedback" on public.outfit_feedback for delete using (auth.uid() = user_id);
