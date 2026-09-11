-- P14 — Coffee Passport architecture foundation
--
-- Status: DESIGNED, NOT APPLIED. There is no live Supabase project connected
-- to this repository (verified in P13: no Supabase env vars, no project
-- reference anywhere). This migration has never been run against a real
-- database. It is the schema/RLS design deliverable for P14, written so it
-- can be applied via `supabase db push` (or the SQL editor) once a real
-- project exists — see P14_COFFEE_PASSPORT_ARCHITECTURE_FOUNDATION.md.
--
-- Scope: foundation only. Deliberately excludes anything P14 marks
-- out-of-scope (café/guest dashboards, invitations, QR, inventory,
-- production/warehouse management, Coffee Passport tasting migration).
-- The existing D2C site (static src/data/lots.json + localStorage Coffee
-- Passport) is untouched by this file and keeps working exactly as before —
-- nothing here is imported or called by any existing route or component.

-- =============================================================================
-- 1. profiles — one row per authenticated user (Supabase Auth identity)
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile row when a new auth user signs up. Standard Supabase
-- pattern — without this, profiles would never be populated (there is no
-- onboarding UI in this phase to do it manually).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- No insert/delete policy: rows are created only by the trigger above
-- (security definer, bypasses RLS) and are never deleted by application code.

-- =============================================================================
-- 2. organizations — foundation for future Roaster / Café organizations
-- =============================================================================

create type public.organization_role as enum ('roaster', 'cafe');

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Foundation only — not a full org/CRM system. Kind (roaster vs café) lives on organization_members.role, not on this table, since one legal entity could in principle hold either role and P14 does not need more than that to unblock ownership modeling.';

alter table public.organizations enable row level security;

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.organization_members enable row level security;

-- Security-definer helper: avoids RLS self-recursion on organization_members
-- when policies on organizations/organization_members (and every downstream
-- table) need to ask "is this user a member (optionally with a specific
-- role) of this organization?".
create or replace function public.is_org_member(org_id uuid, required_role public.organization_role default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and (required_role is null or m.role = required_role)
  );
$$;

create policy "organizations_select_member"
  on public.organizations for select
  using (public.is_org_member(id));

-- Bootstrap: an authenticated user may create a new organization. There is
-- no invitation/admin flow yet (explicitly deferred), so this is the only
-- way any organization can come into existence in this phase.
create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "organizations_update_roaster_member"
  on public.organizations for update
  using (public.is_org_member(id, 'roaster'));

-- No delete policy: deleting an organization is not a decision this
-- foundation makes on its own (cascades into every canonical entity below).

create policy "organization_members_select_own_orgs"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

-- Bootstrap self-membership: a user may add themselves to an organization
-- only if it currently has no members at all (i.e. the org they themselves
-- just created above) — this is the one bootstrap path in this phase.
-- Inviting *other* users is explicitly out of scope (no invitation UX yet).
create policy "organization_members_bootstrap_self"
  on public.organization_members for insert
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from public.organization_members existing
      where existing.organization_id = organization_members.organization_id
    )
  );

-- No update/delete policy yet: changing/removing membership is a decision
-- deferred to the future org-management stage, not this foundation.

-- =============================================================================
-- 3. coffees — canonical Coffee entity (top of the Roaster -> Coffee chain)
-- =============================================================================

create table if not exists public.coffees (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  roaster_organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  country text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.coffees.public_id is
  'Immutable, globally unique, safe for public URLs. Never reused, never derived from name (so renaming a coffee never breaks a link). Distinct from id (internal uuid) per P14''s explicit "not a slug" requirement.';

alter table public.coffees enable row level security;

create policy "coffees_select_roaster_member"
  on public.coffees for select
  using (public.is_org_member(roaster_organization_id));

create policy "coffees_insert_roaster_member"
  on public.coffees for insert
  with check (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "coffees_update_roaster_member"
  on public.coffees for update
  using (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "coffees_delete_roaster_member"
  on public.coffees for delete
  using (public.is_org_member(roaster_organization_id, 'roaster'));

-- No anonymous/public policy yet: there is no "published" flag on this table
-- (or any table below) to distinguish what a Public Passport may show.
-- Defining public visibility without that flag would mean guessing at a
-- publishing model that hasn't been designed — deferred, see report.

-- =============================================================================
-- 4. green_lots — a specific green-coffee batch, tied to a Coffee
--
-- Fields here are exactly the origin/green-coffee fields already confirmed
-- by the existing product (src/types/lot.ts): farm, variety, process,
-- altitude, Q-score. Nothing invented beyond what the current flat Lot
-- already tracks about the raw bean, before roasting.
-- =============================================================================

create table if not exists public.green_lots (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  coffee_id uuid not null references public.coffees (id) on delete restrict,
  roaster_organization_id uuid not null references public.organizations (id) on delete restrict,
  farm text,
  farm_story text,
  variety text,
  process text,
  altitude_masl integer,
  q_score numeric(4, 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.green_lots enable row level security;

create policy "green_lots_select_roaster_member"
  on public.green_lots for select
  using (public.is_org_member(roaster_organization_id));

create policy "green_lots_insert_roaster_member"
  on public.green_lots for insert
  with check (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "green_lots_update_roaster_member"
  on public.green_lots for update
  using (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "green_lots_delete_roaster_member"
  on public.green_lots for delete
  using (public.is_org_member(roaster_organization_id, 'roaster'));

-- =============================================================================
-- 5. lots — Canonical Lot. The central, canonical source of truth for
--    Coffee Passport. Owned exclusively by the Roaster organization that
--    created it. Deliberately the ONLY lot table — no cafe_lots,
--    local_lots, shadow_lots or guest_lots, per the ownership principle.
-- =============================================================================

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  coffee_id uuid not null references public.coffees (id) on delete restrict,
  green_lot_id uuid not null references public.green_lots (id) on delete restrict,
  roaster_organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  category text,
  tags text[] not null default '{}',
  price_cents integer,
  brew jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.lots is
  'Canonical Lot — ties one Coffee + one Green Lot into a specific sellable offering. Only the owning Roaster organization may create, edit, or delete rows here. Café/Guest/Public never get a write policy on this table in this phase — see P14 report for what that implies today (nothing yet, since no café/guest read scenario is built) and what it will need once it is.';

alter table public.lots enable row level security;

create policy "lots_select_roaster_member"
  on public.lots for select
  using (public.is_org_member(roaster_organization_id));

create policy "lots_insert_roaster_member"
  on public.lots for insert
  with check (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "lots_update_roaster_member"
  on public.lots for update
  using (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "lots_delete_roaster_member"
  on public.lots for delete
  using (public.is_org_member(roaster_organization_id, 'roaster'));

-- =============================================================================
-- 6. roast_batches — a specific roasting run of a Canonical Lot.
--    Deliberately its own table (not mutable fields on `lots`), so a Lot
--    can have many batches over time.
-- =============================================================================

create table if not exists public.roast_batches (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  lot_id uuid not null references public.lots (id) on delete restrict,
  roaster_organization_id uuid not null references public.organizations (id) on delete restrict,
  batch_code text,
  roasted_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.roast_batches enable row level security;

create policy "roast_batches_select_roaster_member"
  on public.roast_batches for select
  using (public.is_org_member(roaster_organization_id));

create policy "roast_batches_insert_roaster_member"
  on public.roast_batches for insert
  with check (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "roast_batches_update_roaster_member"
  on public.roast_batches for update
  using (public.is_org_member(roaster_organization_id, 'roaster'));

create policy "roast_batches_delete_roaster_member"
  on public.roast_batches for delete
  using (public.is_org_member(roaster_organization_id, 'roaster'));

-- =============================================================================
-- 7. reference_roast_profiles — versioned, immutable-once-written roast
--    reference data for a Canonical Lot. Kept deliberately thin: today's
--    product (src/types/lot.ts) has no confirmed roast-technical fields
--    (drop temp, development time, etc.) to migrate — only `brew` (how to
--    *prepare* the coffee), which lives on `lots` instead since it is a
--    retail/preparation fact, not a roast-process fact. See report §8.
-- =============================================================================

create table if not exists public.reference_roast_profiles (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete restrict,
  version integer not null,
  is_current boolean not null default true,
  notes text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  unique (lot_id, version)
);

alter table public.reference_roast_profiles enable row level security;

create policy "reference_roast_profiles_select_roaster_member"
  on public.reference_roast_profiles for select
  using (
    exists (
      select 1 from public.lots l
      where l.id = reference_roast_profiles.lot_id
        and public.is_org_member(l.roaster_organization_id)
    )
  );

create policy "reference_roast_profiles_insert_roaster_member"
  on public.reference_roast_profiles for insert
  with check (
    exists (
      select 1 from public.lots l
      where l.id = reference_roast_profiles.lot_id
        and public.is_org_member(l.roaster_organization_id, 'roaster')
    )
  );

-- No update/delete policy: versions are append-only by design ("не делать
-- его частью mutable Lot" — a new version is a new row, not an edit).

-- =============================================================================
-- 8. reference_taste_profiles — versioned reference taste data for a
--    Canonical Lot. Mirrors the existing 5-axis FlavorProfile
--    (src/types/lot.ts) plus sensory notes and the cup-note line, exactly as
--    already confirmed by the current product. NOT the same thing as an
--    individual/guest tasting snapshot (that stays in localStorage per
--    P14's explicit scope — see report §7 and §12).
-- =============================================================================

create table if not exists public.reference_taste_profiles (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete restrict,
  version integer not null,
  is_current boolean not null default true,
  acidity numeric(3, 1),
  sweetness numeric(3, 1),
  body numeric(3, 1),
  aroma numeric(3, 1),
  finish numeric(3, 1),
  sensory text[] not null default '{}',
  cup_note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  unique (lot_id, version)
);

alter table public.reference_taste_profiles enable row level security;

create policy "reference_taste_profiles_select_roaster_member"
  on public.reference_taste_profiles for select
  using (
    exists (
      select 1 from public.lots l
      where l.id = reference_taste_profiles.lot_id
        and public.is_org_member(l.roaster_organization_id)
    )
  );

create policy "reference_taste_profiles_insert_roaster_member"
  on public.reference_taste_profiles for insert
  with check (
    exists (
      select 1 from public.lots l
      where l.id = reference_taste_profiles.lot_id
        and public.is_org_member(l.roaster_organization_id, 'roaster')
    )
  );

-- No update/delete policy: same append-only-version reasoning as §7.

-- =============================================================================
-- End of P14 foundation migration.
--
-- Deliberately absent (see report for why): any policy granting Café or
-- anonymous/Public read access to coffees/green_lots/lots/roast_batches/
-- reference_*_profiles. Café's actual read needs, and the "published"
-- concept a real Public Passport policy would key off, are not designed
-- yet — granting broad access now would be guessing, not foundation work.
-- =============================================================================
