-- P22 — XO Store commercial data layer foundation
--
-- Status: DESIGNED, NOT APPLIED. There is no live Supabase project connected
-- to this repository (verified P13/P14/P17/P21: no Supabase env vars, no
-- project reference anywhere). This migration has never been run against a
-- real database. See P22_XO_STORE_COMMERCIAL_DATA_LAYER_IMPLEMENTATION.md
-- for the full design pass behind every decision below.
--
-- Scope: exactly one table — `products`, the Store's own commercial entity.
-- Deliberately independent of, and structurally unrelated to, the deprecated
-- 20260911120000_coffee_passport_foundation.sql migration in this same
-- directory: no `organizations`, no `coffees`, no `lots`, no ownership
-- model of any kind. XO Store does not own, create, or store a copy of
-- Canonical Lot data — see P21/P22 reports for why. The only connection to
-- Coffee Passport is the opaque `passport_public_id` text column below.
--
-- Not wired to anything yet: the existing storefront keeps reading
-- src/data/lots.json exactly as before (see P22 report §7/§16 — no runtime
-- code changes in this phase). This table exists so a future integration
-- step has somewhere correct to write into; it does not change what the
-- live site does today.

-- =============================================================================
-- products — the Store's own commercial entity. One row per sellable
-- storefront listing. NOT a Canonical Lot, NOT a copy of one — see the
-- comment on passport_public_id below for the one deliberate link.
-- =============================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  -- Store-owned public identity (URL slug), independent of any Passport
  -- concept. Backward-compatible seam: a future backfill of the current 8
  -- static SKUs would set this to today's existing `Lot.id` values
  -- (`lot-014`, `espresso-nol`, ...) so existing cart/order/passport-journal
  -- localStorage references keep resolving — see P22 report §7.
  slug text not null unique,

  -- Commercial/storefront fields. Deliberately NOT the canonical
  -- name/description a Coffee Passport Lot or Coffee might carry — this is
  -- the Store's own merchandising copy, which may differ from (or exist
  -- before) any linked Canonical Lot ever does.
  name text not null,
  description text,

  -- Whole Russian rubles, matching the current live model exactly
  -- (src/lib/format.ts's formatPrice never renders a fractional ruble, and
  -- every price in src/data/lots.json today is a whole number). Stored as
  -- an integer, never floating point, to avoid rounding error — but not
  -- reinterpreted as minor units (kopecks), since nothing in this product
  -- today has ever needed that precision. Revisit only if a real kopeck
  -- price appears.
  price integer not null check (price >= 0),

  -- Storefront visibility. Defaults to false: a newly created Product
  -- starts as an unpublished draft, matching the merchant workflow in the
  -- P22 report (§6) — commercial fields can be filled in before a Canonical
  -- Lot is chosen, without ever being visible on the live storefront.
  published boolean not null default false,

  -- The ONLY reference to Coffee Passport. Immutable, opaque `text` — never
  -- parsed, validated against a format, or treated as a Store-generated
  -- value. Points at a future Canonical Lot's `public.lots.public_id` in
  -- Coffee Passport. Nullable: a draft Product may exist with no Canonical
  -- Lot chosen yet (see §6 of the report). Deliberately NOT unique: one
  -- Canonical Lot may in the future be sold as more than one commercial
  -- Product (e.g. a 250g and a 1kg listing of the same lot) — a unique
  -- constraint here would silently forbid that business shape without it
  -- ever having been confirmed one way or the other. See P22 report §7 for
  -- the full reasoning; revisit only on an explicit product decision.
  --
  -- Never populate this by guessing, deriving it from `slug`/`name`, or
  -- copying today's `Lot.id` values into it — those are Store identity, not
  -- Passport identity (see P17_LOT_ID_PUBLIC_ID_MAPPING_AUDIT.md).
  passport_public_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'XO Store''s own commercial Product. Owns pricing, publication status, and storefront copy. Never owns or copies Canonical Lot data (origin, roast, taste, ownership) — that remains exclusively Coffee Passport''s, referenced here only by the opaque passport_public_id column. See P22_XO_STORE_COMMERCIAL_DATA_LAYER_IMPLEMENTATION.md.';

comment on column public.products.passport_public_id is
  'Opaque reference to a Canonical Lot''s public.lots.public_id in Coffee Passport. Not a foreign key (separate database/system) — referential integrity is enforced by the future read-only integration layer, not Postgres. Nullable (draft Products may have none yet). Deliberately not unique (see table comment). Never derive this value locally.';

-- Non-unique: supports lookups ("which Products reference this Lot") without
-- forbidding more than one Product per Lot. Partial (WHERE ... IS NOT NULL)
-- because most draft Products will have no value here yet, and indexing
-- NULLs would waste space for no query benefit.
create index if not exists products_passport_public_id_idx
  on public.products (passport_public_id)
  where passport_public_id is not null;

alter table public.products enable row level security;

-- Public storefront read: anyone (including anonymous visitors) may read a
-- published Product — this is the entire current storefront's access
-- pattern (catalog is public today, no login exists anywhere on the site).
create policy "products_select_published"
  on public.products for select
  using (published = true);

-- Deliberately no insert/update/delete policy for any client role yet.
-- There is no merchant/admin auth in this repository at all (P21/P22
-- confirmed 0 auth files) — inventing a role system now would be guessing
-- at a shape P24/P25 hasn't designed. Until then, writes can only happen
-- via a service-role key from a trusted server-only context (never the
-- browser), used out of band (e.g. a one-off backfill script) — not through
-- any RLS policy. This is intentionally the narrowest possible default:
-- deny all client-side writes, revisit only when merchant auth is designed.

-- =============================================================================
-- End of P22 foundation migration. No orders/order_items table: P21 found
-- orders are not persisted anywhere today (checkout ends in a Telegram
-- notification only), and P22's brief explicitly excludes building order
-- management. See P22 report §8 for how a future order/order_item table
-- should reference this one without reintroducing a shadow Lot identity.
-- =============================================================================
