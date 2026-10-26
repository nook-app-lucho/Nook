-- ============================================================================
-- NOOK — SUPABASE SETUP
-- Reconstructed from the live project metadata exported on 2026-10-25.
--
-- Purpose:
--   Recreate the database structure required by the Nook frontend in a new
--   Supabase project using SQL Editor.
--
-- This file intentionally DOES NOT contain:
--   - auth users
--   - real couple/profile data
--   - expenses, lists, goals, memories, notes or other user data
--   - Storage objects/photos
--   - API keys or secrets
--
-- Notes:
--   1. Designed primarily for a fresh Supabase project.
--   2. Most objects are made re-runnable where practical (policies/triggers).
--   3. CREATE TABLE IF NOT EXISTS does not migrate an incompatible old table.
--      Schema evolution after this baseline should use separate migrations.
--   4. Current frontend is aligned with the private photo contract:
--      <couple_id>/... paths are persisted and resolved with temporary signed URLs.
--   5. In the current product flow, approved=false means the second member has
--      not joined yet. nook_join() sets p2_email and approved=true atomically.
--      It is not an administrator-approval workflow.
-- ============================================================================

begin;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
-- Supabase normally provides these extensions. pgcrypto is the only extension
-- directly relevant to this schema (gen_random_uuid), but uuid-ossp is retained
-- because it exists in the current project.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- One row represents one shared Nook/couple.
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
    couple_id uuid not null default gen_random_uuid(),
    p1_email text not null,
    p2_email text,
    p1_name text,
    p2_name text,
    start_date date,
    avatar_p1 text,
    avatar_p2 text,
    hero_cover text,
    invite_code text not null,
    approved boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profiles_pkey primary key (couple_id),
    constraint profiles_invite_code_key unique (invite_code),
    constraint profiles_p1_email_key unique (p1_email),
    constraint profiles_p2_email_key unique (p2_email),

    constraint profiles_check
        check (p2_email is null or p2_email <> p1_email),

    constraint profiles_invite_code_check
        check (invite_code = upper(trim(both from invite_code))),

    constraint profiles_p1_email_check
        check (p1_email = lower(trim(both from p1_email))),

    constraint profiles_p2_email_check
        check (
            p2_email is null
            or p2_email = lower(trim(both from p2_email))
        )
);


-- ----------------------------------------------------------------------------
-- agenda
-- ----------------------------------------------------------------------------

create table if not exists public.agenda (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    title text not null,
    date date not null,
    time time without time zone not null,
    owner text not null,
    subtitle text,
    created_by text,
    confirmed boolean not null default false,
    nook_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint agenda_pkey primary key (id),

    constraint agenda_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint agenda_created_by_check
        check (created_by = any (array['p1'::text, 'p2'::text])),

    constraint agenda_nook_version_check
        check (nook_version > 0),

    constraint agenda_owner_check
        check (owner = any (array['IS'::text, 'VO'::text, 'Casal'::text])),

    constraint agenda_title_check
        check (
            length(trim(both from title)) >= 1
            and length(trim(both from title)) <= 160
        )
);


-- ----------------------------------------------------------------------------
-- expenses
-- ----------------------------------------------------------------------------

create table if not exists public.expenses (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    title text not null,
    amount numeric not null,
    category text not null default 'outros'::text,
    date date not null,
    owner text not null,
    completed boolean not null default false,
    nook_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint expenses_pkey primary key (id),

    constraint expenses_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint expenses_amount_check
        check (amount > 0::numeric),

    constraint expenses_category_check
        check (
            category = any (
                array[
                    'moradia'::text,
                    'mercado'::text,
                    'lazer'::text,
                    'transporte'::text,
                    'outros'::text
                ]
            )
        ),

    constraint expenses_nook_version_check
        check (nook_version > 0),

    constraint expenses_owner_check
        check (owner = any (array['IS'::text, 'VO'::text, 'Casal'::text])),

    constraint expenses_title_check
        check (
            length(trim(both from title)) >= 1
            and length(trim(both from title)) <= 160
        )
);


-- ----------------------------------------------------------------------------
-- finances
-- One configuration row per couple.
-- ----------------------------------------------------------------------------

create table if not exists public.finances (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    model text not null default '50/50'::text,
    income_is numeric not null default 0,
    income_vo numeric not null default 0,
    settle_mode text not null default 'transfer'::text,
    configured boolean not null default false,
    nook_version integer not null default 1,
    updated_at timestamptz not null default now(),

    constraint finances_pkey primary key (id),

    constraint finances_couple_id_key unique (couple_id),

    constraint finances_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint finances_income_is_check
        check (income_is >= 0::numeric),

    constraint finances_income_vo_check
        check (income_vo >= 0::numeric),

    constraint finances_model_check
        check (
            model = any (
                array[
                    '50/50'::text,
                    'proportional'::text,
                    '100-p1'::text,
                    '100-p2'::text,
                    'single'::text,
                    'custom'::text
                ]
            )
        ),

    constraint finances_nook_version_check
        check (nook_version > 0),

    constraint finances_settle_mode_check
        check (settle_mode = any (array['transfer'::text, 'next'::text]))
);


-- ----------------------------------------------------------------------------
-- goals
-- ----------------------------------------------------------------------------

create table if not exists public.goals (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    type text not null,
    title text not null,
    icon text,
    owner text not null,
    target numeric not null,
    current numeric not null default 0,
    unit text,
    deadline date,
    history jsonb not null default '[]'::jsonb,
    nook_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint goals_pkey primary key (id),

    constraint goals_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint goals_current_check
        check (current >= 0::numeric),

    constraint goals_history_check
        check (jsonb_typeof(history) = 'array'::text),

    constraint goals_nook_version_check
        check (nook_version > 0),

    constraint goals_owner_check
        check (owner = any (array['IS'::text, 'VO'::text, 'Casal'::text])),

    constraint goals_target_check
        check (target > 0::numeric),

    constraint goals_title_check
        check (
            length(trim(both from title)) >= 1
            and length(trim(both from title)) <= 160
        ),

    constraint goals_type_check
        check (type = any (array['financial'::text, 'habit'::text]))
);


-- ----------------------------------------------------------------------------
-- lists
-- Items remain JSONB by design to keep this personal app simple.
-- ----------------------------------------------------------------------------

create table if not exists public.lists (
    id text not null,
    couple_id uuid not null,
    name text not null,
    type text not null default 'standard'::text,
    items jsonb not null default '[]'::jsonb,
    nook_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint lists_pkey primary key (id),

    constraint lists_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint lists_items_check
        check (jsonb_typeof(items) = 'array'::text),

    constraint lists_name_check
        check (
            length(trim(both from name)) >= 1
            and length(trim(both from name)) <= 120
        ),

    constraint lists_nook_version_check
        check (nook_version > 0),

    constraint lists_type_check
        check (type = any (array['standard'::text, 'decision'::text]))
);


-- ----------------------------------------------------------------------------
-- memories
-- photo stores the photo reference currently used by the frontend.
-- Follow-up frontend work should store a private Storage path instead of a
-- public URL.
-- ----------------------------------------------------------------------------

create table if not exists public.memories (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    title text not null,
    date date not null,
    note text,
    photo text,
    nook_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint memories_pkey primary key (id),

    constraint memories_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint memories_nook_version_check
        check (nook_version > 0),

    constraint memories_title_check
        check (
            length(trim(both from title)) >= 1
            and length(trim(both from title)) <= 160
        )
);


-- ----------------------------------------------------------------------------
-- moods
-- One current mood row per couple.
-- ----------------------------------------------------------------------------

create table if not exists public.moods (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    p1 text,
    p2 text,
    date date,
    updated_at timestamptz not null default now(),

    constraint moods_pkey primary key (id),

    constraint moods_couple_id_key unique (couple_id),

    constraint moods_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint moods_p1_check
        check (
            p1 is null
            or p1 = any (
                array[
                    'energia'::text,
                    'cansado'::text,
                    'lanche'::text,
                    'apaixonado'::text,
                    'estresse'::text,
                    'feliz'::text
                ]
            )
        ),

    constraint moods_p2_check
        check (
            p2 is null
            or p2 = any (
                array[
                    'energia'::text,
                    'cansado'::text,
                    'lanche'::text,
                    'apaixonado'::text,
                    'estresse'::text,
                    'feliz'::text
                ]
            )
        )
);


-- ----------------------------------------------------------------------------
-- notes / mural
-- ----------------------------------------------------------------------------

create table if not exists public.notes (
    id uuid not null default gen_random_uuid(),
    couple_id uuid not null,
    text text not null,
    color text not null default 'yellow'::text,
    owner text not null,
    date timestamptz not null default now(),
    expires_at timestamptz,
    reactions jsonb not null default '[]'::jsonb,
    nook_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint notes_pkey primary key (id),

    constraint notes_couple_id_fkey
        foreign key (couple_id)
        references public.profiles(couple_id)
        on delete cascade,

    constraint notes_color_check
        check (color = any (array['yellow'::text, 'pink'::text, 'blue'::text])),

    constraint notes_nook_version_check
        check (nook_version > 0),

    constraint notes_reactions_check
        check (jsonb_typeof(reactions) = 'array'::text),

    constraint notes_text_check
        check (
            length(trim(both from text)) >= 1
            and length(trim(both from text)) <= 500
        )
);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================
-- Unique indexes created implicitly by PRIMARY KEY / UNIQUE constraints above
-- are intentionally not duplicated here.

create index if not exists agenda_couple_date_idx
    on public.agenda using btree (couple_id, date, time);

create index if not exists expenses_couple_date_idx
    on public.expenses using btree (couple_id, date);

create index if not exists goals_couple_idx
    on public.goals using btree (couple_id);

create index if not exists lists_couple_idx
    on public.lists using btree (couple_id);

create index if not exists memories_couple_date_idx
    on public.memories using btree (couple_id, date desc);

create index if not exists notes_couple_expiry_idx
    on public.notes using btree (couple_id, expires_at);

-- This index exists in the current database even though the UNIQUE constraint
-- on p2_email already creates an equivalent btree index. It is retained here
-- for fidelity with the current project and can be removed in a cleanup later.
create index if not exists profiles_p2_email_idx
    on public.profiles using btree (p2_email);


-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

create or replace function public.nook_current_email()
returns text
language sql
stable
as $function$
    select lower(nullif(auth.jwt() ->> 'email', ''));
$function$;


create or replace function public.nook_is_member(target_couple uuid)
returns boolean
language sql
stable
as $function$
    select exists (
        select 1
        from public.profiles p
        where p.couple_id = target_couple
          and public.nook_current_email() in (p.p1_email, p.p2_email)
    );
$function$;


-- Legacy helper found in the current database.
-- No current trigger references it; it is retained to mirror today's schema.
create or replace function public.nook_bump_version()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
    new.nook_version := coalesce(old.nook_version, 0) + 1;
    return new;
end
$function$;


create or replace function public.nook_increment_version()
returns trigger
language plpgsql
as $function$
begin
    new.nook_version = old.nook_version + 1;
    new.updated_at = now();
    return new;
end;
$function$;


create or replace function public.nook_touch_updated_at()
returns trigger
language plpgsql
as $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;


-- ============================================================================
-- 5. PRODUCT RPCs
-- ============================================================================

create or replace function public.nook_join(p_code text)
returns public.profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    result public.profiles;
    email text := public.nook_current_email();
    normalized text := upper(trim(p_code));
begin
    if email is null then
        raise exception 'Sessão inválida';
    end if;

    update public.profiles
       set p2_email = email,
           approved = true
     where invite_code = normalized
       and p2_email is null
       and p1_email <> email
    returning * into result;

    if result.couple_id is null then
        raise exception 'Convite inválido, já utilizado ou inexistente';
    end if;

    return result;
end;
$function$;


create or replace function public.nook_set_mood(p_mood text, p_date date)
returns public.moods
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    result public.moods;
    p public.profiles;
    email text := public.nook_current_email();
begin
    select *
      into p
      from public.profiles
     where email in (p1_email, p2_email)
     limit 1;

    if p.couple_id is null then
        raise exception 'Casal não encontrado';
    end if;

    insert into public.moods (couple_id, p1, p2, date)
    values (
        p.couple_id,
        case when email = p.p1_email then p_mood end,
        case when email = p.p2_email then p_mood end,
        p_date
    )
    on conflict (couple_id) do update set
        p1 = case
            when email = p.p1_email then excluded.p1
            else public.moods.p1
        end,
        p2 = case
            when email = p.p2_email then excluded.p2
            else public.moods.p2
        end,
        date = excluded.date
    returning * into result;

    return result;
end;
$function$;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

drop trigger if exists agenda_version on public.agenda;
create trigger agenda_version
before update on public.agenda
for each row
execute function public.nook_increment_version();

drop trigger if exists expenses_version on public.expenses;
create trigger expenses_version
before update on public.expenses
for each row
execute function public.nook_increment_version();

drop trigger if exists finances_version on public.finances;
create trigger finances_version
before update on public.finances
for each row
execute function public.nook_increment_version();

drop trigger if exists goals_version on public.goals;
create trigger goals_version
before update on public.goals
for each row
execute function public.nook_increment_version();

drop trigger if exists lists_version on public.lists;
create trigger lists_version
before update on public.lists
for each row
execute function public.nook_increment_version();

drop trigger if exists memories_version on public.memories;
create trigger memories_version
before update on public.memories
for each row
execute function public.nook_increment_version();

drop trigger if exists notes_version on public.notes;
create trigger notes_version
before update on public.notes
for each row
execute function public.nook_increment_version();

drop trigger if exists moods_touch on public.moods;
create trigger moods_touch
before update on public.moods
for each row
execute function public.nook_touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
before update on public.profiles
for each row
execute function public.nook_touch_updated_at();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.agenda enable row level security;
alter table public.expenses enable row level security;
alter table public.finances enable row level security;
alter table public.goals enable row level security;
alter table public.lists enable row level security;
alter table public.memories enable row level security;
alter table public.moods enable row level security;
alter table public.notes enable row level security;


-- ----------------------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------------------

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert
on public.profiles
as permissive
for insert
to authenticated
with check (
    public.nook_current_email() = p1_email
    and p2_email is null
);

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
as permissive
for select
to authenticated
using (
    public.nook_current_email() = p1_email
    or public.nook_current_email() = p2_email
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
as permissive
for update
to authenticated
using (
    public.nook_current_email() = p1_email
    or public.nook_current_email() = p2_email
)
with check (
    public.nook_current_email() = p1_email
    or public.nook_current_email() = p2_email
);


-- ----------------------------------------------------------------------------
-- Generic couple-scoped policies
-- ----------------------------------------------------------------------------
-- Repeated explicitly to keep this setup easy to inspect in Supabase.

drop policy if exists agenda_select on public.agenda;
create policy agenda_select on public.agenda
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists agenda_insert on public.agenda;
create policy agenda_insert on public.agenda
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists agenda_update on public.agenda;
create policy agenda_update on public.agenda
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists agenda_delete on public.agenda;
create policy agenda_delete on public.agenda
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists finances_select on public.finances;
create policy finances_select on public.finances
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists finances_insert on public.finances;
create policy finances_insert on public.finances
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists finances_update on public.finances;
create policy finances_update on public.finances
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists finances_delete on public.finances;
create policy finances_delete on public.finances
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists goals_update on public.goals;
create policy goals_update on public.goals
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists goals_delete on public.goals;
create policy goals_delete on public.goals
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists lists_select on public.lists;
create policy lists_select on public.lists
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists lists_insert on public.lists;
create policy lists_insert on public.lists
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists lists_update on public.lists;
create policy lists_update on public.lists
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists lists_delete on public.lists;
create policy lists_delete on public.lists
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists memories_select on public.memories;
create policy memories_select on public.memories
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists memories_insert on public.memories;
create policy memories_insert on public.memories
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists memories_update on public.memories;
create policy memories_update on public.memories
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists memories_delete on public.memories;
create policy memories_delete on public.memories
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists moods_select on public.moods;
create policy moods_select on public.moods
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists moods_insert on public.moods;
create policy moods_insert on public.moods
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists moods_update on public.moods;
create policy moods_update on public.moods
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists moods_delete on public.moods;
create policy moods_delete on public.moods
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
as permissive for select to authenticated
using (public.nook_is_member(couple_id));

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
as permissive for insert to authenticated
with check (public.nook_is_member(couple_id));

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
as permissive for update to authenticated
using (public.nook_is_member(couple_id))
with check (public.nook_is_member(couple_id));

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
as permissive for delete to authenticated
using (public.nook_is_member(couple_id));


-- ============================================================================
-- 8. STORAGE
-- ============================================================================
-- Private photo bucket. The first path segment MUST be the couple UUID:
--
--   <couple_id>/avatars/...
--   <couple_id>/covers/...
--   <couple_id>/memories/...
--
-- This matches the current Storage RLS design.

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'photos',
    'photos',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
    name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists photos_select on storage.objects;
create policy photos_select
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'photos'
    and public.nook_is_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists photos_insert on storage.objects;
create policy photos_insert
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'photos'
    and public.nook_is_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists photos_update on storage.objects;
create policy photos_update
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'photos'
    and public.nook_is_member(((storage.foldername(name))[1])::uuid)
)
with check (
    bucket_id = 'photos'
    and public.nook_is_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists photos_delete on storage.objects;
create policy photos_delete
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'photos'
    and public.nook_is_member(((storage.foldername(name))[1])::uuid)
);


-- ============================================================================
-- 9. GRANTS
-- ============================================================================
-- The complete live export contains 189 table grants:
-- 9 public tables × 3 roles × 7 privileges.
--
-- For every Nook table, anon, authenticated and service_role currently have:
-- DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE.
--
-- Therefore GRANT ALL PRIVILEGES below reproduces the current database exactly
-- at the SQL privilege layer. RLS remains the real row-level access boundary.
-- A later hardening migration could reduce privileges if desired, but that
-- would be a deliberate behavior change rather than reconstruction.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on table
    public.profiles,
    public.agenda,
    public.expenses,
    public.finances,
    public.goals,
    public.lists,
    public.memories,
    public.moods,
    public.notes
to anon, authenticated, service_role;


-- Function grants observed in the current project.

grant execute on function public.nook_bump_version()
to anon, authenticated, service_role;

grant execute on function public.nook_current_email()
to anon, authenticated, service_role;

grant execute on function public.nook_increment_version()
to anon, authenticated, service_role;

grant execute on function public.nook_is_member(uuid)
to anon, authenticated, service_role;

grant execute on function public.nook_join(text)
to anon, authenticated, service_role;

grant execute on function public.nook_set_mood(text, date)
to anon, authenticated, service_role;

grant execute on function public.nook_touch_updated_at()
to anon, authenticated, service_role;


-- ============================================================================
-- 10. REALTIME
-- ============================================================================
-- The current frontend subscribes to postgres_changes for schema public.
-- Ensure all Nook tables are members of Supabase's Realtime publication.
--
-- This was inferred from the frontend requirement; the publication export was
-- not included in the metadata files received. The block is safe to rerun.

do $$
declare
    table_name text;
begin
    if exists (
        select 1
        from pg_publication
        where pubname = 'supabase_realtime'
    ) then
        foreach table_name in array array[
            'profiles',
            'agenda',
            'expenses',
            'finances',
            'goals',
            'lists',
            'memories',
            'moods',
            'notes'
        ]
        loop
            if not exists (
                select 1
                from pg_publication_tables
                where pubname = 'supabase_realtime'
                  and schemaname = 'public'
                  and tablename = table_name
            ) then
                execute format(
                    'alter publication supabase_realtime add table public.%I',
                    table_name
                );
            end if;
        end loop;
    end if;
end
$$;


commit;

-- ============================================================================
-- END OF NOOK SETUP
-- ============================================================================
