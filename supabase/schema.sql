-- ============================================================================
-- PKSISTEM — Schema Supabase (SaaS multi-tenant): tabelas + RLS + Storage
-- Execute este arquivo INTEIRO no SQL Editor do seu projeto Supabase.
--
-- MODELO DE SEGURANÇA
--   1. Todo dado de negócio pertence a um tenant (tenant_id).
--   2. O tenant NUNCA vem do cliente: é derivado de auth.uid() → tenant_members.
--   3. RBAC (owner/admin/editor/viewer) é checado no banco via has_perm().
--   4. Super Admin é uma camada separada (profiles.is_super_admin) — nunca
--      é um "membro com mais poderes" de um tenant.
--   5. audit_logs é append-only (sem UPDATE/DELETE).
--   6. Número do pedido é sequencial POR TENANT, sem corrida (advisory lock).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  is_super_admin boolean not null default false, -- camada separada (dono do SaaS)
  created_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_id text not null default 'free',
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','paused','canceled','suspended','pending_deletion')),
  trial_ends_at timestamptz,
  onboarding_completed boolean not null default false,
  settings jsonb not null default '{}'::jsonb,         -- conteúdo público do mini-site
  client_retention jsonb not null default '{"mode":"manual","days":0}'::jsonb, -- PRIVADO
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  price numeric(10,2),
  image_url text,
  availability text not null default 'disponivel'
    check (availability in ('disponivel','indisponivel','esgotado','oculto')),
  active boolean not null default true, -- biblioteca de produtos salvos
  extras jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  menu_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (tenant_id, food_id, menu_date) -- anti-duplicação NO BANCO
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null default 0,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null,
  customer_phone text,
  size text not null default '',
  protein text not null default '',
  sides jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  observation text,
  payment text not null default 'Pix',
  origin text not null default 'painel' check (origin in ('painel','site')),
  status text not null default 'pendente'
    check (status in ('pendente','preparando','pronta','entregue')),
  created_at timestamptz not null default now()
);

-- AUDITORIA: append-only. NUNCA registrar senha/token/secret em metadata.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text not null default '',
  tenant_id uuid,
  action text not null,
  resource text not null,
  result text not null check (result in ('ok','denied','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade, -- null = plataforma
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id boolean primary key default true check (id), -- singleton
  name text not null default 'PKSISTEM',
  tagline text not null default 'Seu negócio online, simples assim.',
  support_whatsapp text not null default '',
  support_email text not null default '',
  instagram text not null default '',
  logo_url text,
  pkchat_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;

-- Recuperação de senha: token opaco, expiração e uso único.
create table if not exists public.password_reset_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Sequência de pedido POR TENANT (sem corrida, sem vazar volume global).
create table if not exists public.order_number_seq (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  last_number integer not null default 100
);

-- ---------------------------------------------------------------------------
-- 2. ÍNDICES
-- ---------------------------------------------------------------------------
create index if not exists idx_foods_tenant          on public.foods (tenant_id);
create index if not exists idx_menu_tenant_date      on public.daily_menu_items (tenant_id, menu_date);
create index if not exists idx_orders_tenant         on public.orders (tenant_id);
create index if not exists idx_orders_tenant_status  on public.orders (tenant_id, status);
create index if not exists idx_orders_customer       on public.orders (customer_id);
create index if not exists idx_customers_tenant      on public.customers (tenant_id);
create index if not exists idx_members_user          on public.tenant_members (user_id);
create index if not exists idx_members_tenant        on public.tenant_members (tenant_id);
create index if not exists idx_audit_created         on public.audit_logs (created_at desc);
create index if not exists idx_analytics_tenant_kind on public.analytics_events (tenant_id, kind);

-- ---------------------------------------------------------------------------
-- 3. FUNÇÕES DE AUTORIZAÇÃO (base do RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_tenant_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

create or replace function public.is_member(tid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.tenant_members where tenant_id = tid and user_id = auth.uid());
$$;

create or replace function public.my_role(tid uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from public.tenant_members where tenant_id = tid and user_id = auth.uid();
$$;

-- Espelho do RBAC do app (lib/plans.ts). Fonte da verdade para operações.
create or replace function public.has_perm(tid uuid, perm text)
returns boolean language sql security definer stable set search_path = public as $$
  select case public.my_role(tid)
    when 'owner'  then true
    when 'admin'  then perm in (
      'menu.read','menu.update','products.create','products.update','products.delete',
      'site.update','analytics.read','users.manage','data.export')
    when 'editor' then perm in (
      'menu.read','menu.update','products.create','products.update','analytics.read')
    when 'viewer' then perm in ('menu.read','analytics.read')
    else false
  end;
$$;

-- Um alimento é público se está no cardápio visível de um tenant publicado
-- (itens do dia ou modo fixo). Rascunhos/itens futuros NÃO vazam.
create or replace function public.food_is_public(fid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.daily_menu_items dmi
    join public.tenants t on t.id = dmi.tenant_id
    where dmi.food_id = fid
      and dmi.menu_date <= current_date
      and t.status not in ('suspended','pending_deletion')
      and (t.settings ->> 'published')::boolean is not false
  )
  or exists (
    select 1
    from public.foods f
    join public.tenants t on t.id = f.tenant_id
    where f.id = fid
      and (t.settings ->> 'menuMode') = 'fixo'
      and t.status not in ('suspended','pending_deletion')
      and (t.settings ->> 'published')::boolean is not false
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. NÚMERO DO PEDIDO (por tenant, com advisory lock contra corrida)
-- ---------------------------------------------------------------------------
create or replace function public.assign_order_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nxt integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.tenant_id::text));
  insert into public.order_number_seq (tenant_id, last_number)
  values (new.tenant_id, 100)
  on conflict (tenant_id) do nothing;
  select last_number + 1 into nxt
  from public.order_number_seq
  where tenant_id = new.tenant_id
  for update;
  update public.order_number_seq set last_number = nxt where tenant_id = new.tenant_id;
  new.number := nxt;
  return new;
end;
$$;

drop trigger if exists trg_assign_order_number on public.orders;
create trigger trg_assign_order_number
before insert on public.orders
for each row execute function public.assign_order_number();

-- Impede que qualquer UPDATE "mova" um registro para outro tenant (anti-IDOR).
create or replace function public.prevent_tenant_change()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id não pode ser alterado';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_foods_no_tenant_change on public.foods;
create trigger trg_foods_no_tenant_change before update on public.foods
for each row execute function public.prevent_tenant_change();

drop trigger if exists trg_menu_no_tenant_change on public.daily_menu_items;
create trigger trg_menu_no_tenant_change before update on public.daily_menu_items
for each row execute function public.prevent_tenant_change();

drop trigger if exists trg_orders_no_tenant_change on public.orders;
create trigger trg_orders_no_tenant_change before update on public.orders
for each row execute function public.prevent_tenant_change();

drop trigger if exists trg_customers_no_tenant_change on public.customers;
create trigger trg_customers_no_tenant_change before update on public.customers
for each row execute function public.prevent_tenant_change();

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.foods enable row level security;
alter table public.daily_menu_items enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.order_number_seq enable row level security;

-- ===== PROFILES =====
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
using (
  id = auth.uid() or public.is_super_admin()
  or exists (select 1 from public.tenant_members m
             where m.user_id = profiles.id
               and m.tenant_id in (select public.my_tenant_ids()))
);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
with check (id = auth.uid() and is_super_admin = false); -- ninguém se cria super admin
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and is_super_admin = (select p.is_super_admin from public.profiles p where p.id = auth.uid()));

-- ===== TENANTS =====
-- Membros leem o próprio tenant; super admin lê todos. CONTEÚDO PÚBLICO do
-- mini-site deve ser servido pela view public.public_sites (abaixo), nunca
-- pela tabela direta (client_retention é privado).
drop policy if exists "tenants_select" on public.tenants;
create policy "tenants_select" on public.tenants for select to authenticated
using (public.is_super_admin() or id in (select public.my_tenant_ids()));

drop policy if exists "tenants_update" on public.tenants;
create policy "tenants_update" on public.tenants for update to authenticated
using (public.is_super_admin() or public.has_perm(id, 'settings.update') or public.has_perm(id, 'site.update'))
with check (public.is_super_admin() or id in (select public.my_tenant_ids()));
-- (INSERT de tenant acontece via Edge Function/service role no signup — nunca pelo cliente.)

-- View pública sanitizada do mini-site (anon): só o que o visitante precisa.
create or replace view public.public_sites as
  select id, name, slug, status, settings,
         last_activity_at
  from public.tenants;

-- ===== TENANT_MEMBERS =====
drop policy if exists "members_select" on public.tenant_members;
create policy "members_select" on public.tenant_members for select to authenticated
using (public.is_super_admin() or user_id = auth.uid() or tenant_id in (select public.my_tenant_ids()));

-- Convidar: exige users.manage + regra de escalonamento (só owner concede owner/admin).
drop policy if exists "members_insert" on public.tenant_members;
create policy "members_insert" on public.tenant_members for insert to authenticated
with check (
  tenant_id in (select public.my_tenant_ids())
  and public.has_perm(tenant_id, 'users.manage')
  and (role in ('editor','viewer') or public.my_role(tenant_id) = 'owner')
);

-- Alterar papel: somente owner; nunca se auto-promover.
drop policy if exists "members_update" on public.tenant_members;
create policy "members_update" on public.tenant_members for update to authenticated
using (public.my_role(tenant_id) = 'owner' and user_id <> auth.uid())
with check (public.my_role(tenant_id) = 'owner' and tenant_id in (select public.my_tenant_ids()));

drop policy if exists "members_delete" on public.tenant_members;
create policy "members_delete" on public.tenant_members for delete to authenticated
using (public.my_role(tenant_id) = 'owner' and user_id <> auth.uid());

-- ===== FOODS =====
-- Público: apenas alimentos visíveis no cardápio (food_is_public).
drop policy if exists "foods_public_read" on public.foods;
create policy "foods_public_read" on public.foods for select to anon, authenticated
using (public.food_is_public(id));
-- Membros leem a biblioteca completa do próprio tenant.
drop policy if exists "foods_member_read" on public.foods;
create policy "foods_member_read" on public.foods for select to authenticated
using (public.is_super_admin() or tenant_id in (select public.my_tenant_ids()));

drop policy if exists "foods_member_insert" on public.foods;
create policy "foods_member_insert" on public.foods for insert to authenticated
with check (tenant_id in (select public.my_tenant_ids()) and public.has_perm(tenant_id, 'products.create'));

drop policy if exists "foods_member_update" on public.foods;
create policy "foods_member_update" on public.foods for update to authenticated
using (tenant_id in (select public.my_tenant_ids()) and public.has_perm(tenant_id, 'products.update'))
with check (tenant_id in (select public.my_tenant_ids()));

drop policy if exists "foods_member_delete" on public.foods;
create policy "foods_member_delete" on public.foods for delete to authenticated
using (tenant_id in (select public.my_tenant_ids()) and public.has_perm(tenant_id, 'products.delete'));

-- ===== DAILY_MENU_ITEMS =====
-- Público: cardápio até hoje, de tenants publicados (agendamento futuro é privado).
drop policy if exists "menu_public_read" on public.daily_menu_items;
create policy "menu_public_read" on public.daily_menu_items for select to anon, authenticated
using (
  menu_date <= current_date
  and exists (select 1 from public.tenants t where t.id = tenant_id
              and t.status not in ('suspended','pending_deletion')
              and (t.settings ->> 'published')::boolean is not false)
);
drop policy if exists "menu_member_read" on public.daily_menu_items;
create policy "menu_member_read" on public.daily_menu_items for select to authenticated
using (public.is_super_admin() or tenant_id in (select public.my_tenant_ids()));

drop policy if exists "menu_member_insert" on public.daily_menu_items;
create policy "menu_member_insert" on public.daily_menu_items for insert to authenticated
with check (
  tenant_id in (select public.my_tenant_ids())
  and public.has_perm(tenant_id, 'menu.update')
  and food_id in (select id from public.foods where tenant_id = daily_menu_items.tenant_id)
);
drop policy if exists "menu_member_delete" on public.daily_menu_items;
create policy "menu_member_delete" on public.daily_menu_items for delete to authenticated
using (tenant_id in (select public.my_tenant_ids()) and public.has_perm(tenant_id, 'menu.update'));

-- ===== CUSTOMERS / ORDERS (PRIVADO — nunca público) =====
drop policy if exists "customers_member_all" on public.customers;
create policy "customers_member_all" on public.customers for all to authenticated
using (public.is_super_admin() or tenant_id in (select public.my_tenant_ids()))
with check (tenant_id in (select public.my_tenant_ids()));

drop policy if exists "orders_member_all" on public.orders;
create policy "orders_member_all" on public.orders for all to authenticated
using (public.is_super_admin() or tenant_id in (select public.my_tenant_ids()))
with check (tenant_id in (select public.my_tenant_ids()));

-- ===== AUDIT_LOGS (append-only) =====
-- Somente super admin lê; INSERT via função security definer (audit_event).
drop policy if exists "audit_super_read" on public.audit_logs;
create policy "audit_super_read" on public.audit_logs for select to authenticated
using (public.is_super_admin());
-- Sem políticas de UPDATE/DELETE = append-only (RLS bloqueia por padrão).

create or replace function public.audit_event(action text, resource text, result text, tid uuid default null, meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, actor_email, tenant_id, action, resource, result, metadata)
  select auth.uid(), coalesce((select email from public.profiles where id = auth.uid()), ''), tid, action, resource, result, meta;
end;
$$;

-- ===== ANALYTICS =====
-- O mini-site (anon) registra eventos; só membros/super leem.
drop policy if exists "analytics_public_insert" on public.analytics_events;
create policy "analytics_public_insert" on public.analytics_events for insert to anon, authenticated
with check (exists (select 1 from public.tenants t where t.id = tenant_id));
drop policy if exists "analytics_member_read" on public.analytics_events;
create policy "analytics_member_read" on public.analytics_events for select to authenticated
using (public.is_super_admin() or tenant_id in (select public.my_tenant_ids()));

-- ===== NOTIFICATIONS =====
drop policy if exists "notifications_read" on public.notifications;
create policy "notifications_read" on public.notifications for select to authenticated
using (public.is_super_admin() or tenant_id is null or tenant_id in (select public.my_tenant_ids()));
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update to authenticated
using (public.is_super_admin() or tenant_id in (select public.my_tenant_ids()));

-- ===== PLATFORM_SETTINGS =====
drop policy if exists "platform_public_read" on public.platform_settings;
create policy "platform_public_read" on public.platform_settings for select to anon, authenticated
using (true);
drop policy if exists "platform_super_update" on public.platform_settings;
create policy "platform_super_update" on public.platform_settings for update to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

-- ===== PASSWORD_RESET_TOKENS / ORDER_NUMBER_SEQ =====
-- Sem políticas para anon/authenticated: acesso SOMENTE via service_role /
-- Edge Functions (recuperação de senha e jobs). RLS bloqueia tudo por padrão.

-- ---------------------------------------------------------------------------
-- 6. STORAGE — bucket por tenant
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', true)
on conflict (id) do nothing;

-- Leitura pública (fotos aparecem no mini-site).
drop policy if exists "food_photos_public_read" on storage.objects;
create policy "food_photos_public_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'food-photos');

-- Escrita/alteração/remoção: membro do tenant dono do caminho tenant/{tenant_id}/…
drop policy if exists "food_photos_member_insert" on storage.objects;
create policy "food_photos_member_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'food-photos'
  and (storage.foldername(name))[1] = 'tenant'
  and ((storage.foldername(name))[2])::uuid in (select public.my_tenant_ids())
);
drop policy if exists "food_photos_member_update" on storage.objects;
create policy "food_photos_member_update" on storage.objects for update to authenticated
using (
  bucket_id = 'food-photos'
  and (storage.foldername(name))[1] = 'tenant'
  and ((storage.foldername(name))[2])::uuid in (select public.my_tenant_ids())
);
drop policy if exists "food_photos_member_delete" on storage.objects;
create policy "food_photos_member_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'food-photos'
  and (storage.foldername(name))[1] = 'tenant'
  and ((storage.foldername(name))[2])::uuid in (select public.my_tenant_ids())
);

-- ---------------------------------------------------------------------------
-- 7. PERFIL AUTOMÁTICO NO SIGNUP
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, is_super_admin)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
          coalesce(new.email, ''),
          false) -- ninguém vira super admin via signup
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 8. PRIMEIRO SUPER ADMIN (execute UMA vez, trocando pelo seu e-mail)
-- ---------------------------------------------------------------------------
-- update public.profiles set is_super_admin = true
-- where email = 'voce@pksistem.com';

-- ---------------------------------------------------------------------------
-- 9. FUNÇÕES SELF-SERVICE (executadas com a chave pública, seguras via RLS/definer)
-- ---------------------------------------------------------------------------

-- Criação do tenant no cadastro: transação atômica (tenant + member owner).
-- Executável pelo usuário autenticado logo após o signup. O dono vira 'owner'.
create or replace function public.create_tenant(
  p_name text,
  p_slug text,
  p_niche text default 'restaurante',
  p_whatsapp text default '',
  p_categories jsonb default '[]'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_tid uuid;
  v_exists integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Autenticação necessária para criar um negócio.';
  end if;
  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Informe um endereço (slug) válido.';
  end if;
  select count(*) into v_exists from public.tenants where slug = p_slug;
  if v_exists > 0 then
    raise exception 'Este endereço de site já está em uso. Escolha outro.';
  end if;

  insert into public.tenants (name, slug, settings)
  values (
    p_name,
    p_slug,
    jsonb_build_object(
      'name', p_name,
      'slug', p_slug,
      'niche', p_niche,
      'whatsapp', p_whatsapp,
      'categories', coalesce(p_categories, '[]'::jsonb),
      'published', false
    )
  )
  returning id into v_tid;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tid, v_uid, 'owner');

  perform public.audit_event('tenant.created', 'tenant', 'ok', v_tid,
    jsonb_build_object('slug', p_slug));

  return v_tid;
end;
$$;

-- Site público: devolve SOMENTE os campos públicos do tenant + itens visíveis.
-- Executável por anon (visitante). Nunca expõe client_retention/plan/status interno.
create or replace function public.get_public_site(p_slug text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_t public.tenants;
  v_items jsonb;
begin
  select * into v_t from public.tenants where slug = p_slug;
  if v_t is null then
    return null;
  end if;
  if v_t.status in ('suspended','pending_deletion') or
     coalesce((v_t.settings ->> 'published')::boolean, false) = false then
    return jsonb_build_object(
      'tenant', jsonb_build_object(
        'id', v_t.id, 'name', v_t.name, 'slug', v_t.slug, 'status', v_t.status,
        'settings', v_t.settings),
      'items', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', dmi.id, 'tenantId', dmi.tenant_id, 'foodId', dmi.food_id,
      'menuDate', dmi.menu_date, 'createdAt', dmi.created_at,
      'food', jsonb_build_object(
        'id', f.id, 'tenantId', f.tenant_id, 'name', f.name, 'category', f.category,
        'description', f.description, 'price', f.price, 'imageUrl', f.image_url,
        'availability', f.availability, 'active', f.active, 'extras', f.extras,
        'createdAt', f.created_at)
    )), '[]'::jsonb)
  into v_items
  from public.daily_menu_items dmi
  join public.foods f on f.id = dmi.food_id
  where dmi.tenant_id = v_t.id
    and dmi.menu_date <= current_date
    and f.availability <> 'oculto';

  return jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', v_t.id, 'name', v_t.name, 'slug', v_t.slug, 'status', v_t.status,
      'settings', v_t.settings),
    'items', v_items);
end;
$$;

-- Convite de membro: busca usuário pelo e-mail e cria o vínculo, server-side.
-- Respeita RBAC: exige users.manage; só 'owner' concede owner/admin.
create or replace function public.invite_member(p_email text, p_name text, p_role text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid;
  v_tid uuid;
  v_target uuid;
  v_caller_role text;
  v_member public.tenant_members;
begin
  v_caller := auth.uid();
  if v_caller is null then raise exception 'Autenticação necessária.'; end if;

  select tenant_id, role into v_tid, v_caller_role
  from public.tenant_members where user_id = v_caller limit 1;
  if v_tid is null then raise exception 'Você não pertence a nenhum negócio.'; end if;
  if not public.has_perm(v_tid, 'users.manage') then
    raise exception 'Seu papel não permite convidar membros.';
  end if;
  if p_role in ('owner','admin') and v_caller_role <> 'owner' then
    raise exception 'Somente o dono pode conceder papéis de dono/administrador.';
  end if;
  if p_role not in ('owner','admin','editor','viewer') then
    raise exception 'Papel inválido.';
  end if;

  select id into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if v_target is null then
    raise exception 'Nenhuma conta com este e-mail. A pessoa precisa criar uma conta primeiro.';
  end if;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tid, v_target, p_role)
  on conflict (tenant_id, user_id) do update set role = excluded.role
  returning * into v_member;

  perform public.audit_event('users.invited', 'users', 'ok', v_tid,
    jsonb_build_object('email', p_email, 'role', p_role));

  return jsonb_build_object('id', v_member.id, 'tenantId', v_member.tenant_id,
    'userId', v_member.user_id, 'role', v_member.role, 'createdAt', v_member.created_at);
end;
$$;

-- Analytics público: registra eventos do mini-site (anon).
create or replace function public.track_public_event(p_slug text, p_kind text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tid uuid;
begin
  select id into v_tid from public.tenants where slug = p_slug;
  if v_tid is null then return; end if;
  insert into public.analytics_events (tenant_id, kind) values (v_tid, p_kind);
end;
$$;

-- Pedido público (anon): cria/atualiza cliente + pedido + analytics.
-- Executável por visitante. O número é atribuído pelo trigger por tenant.
-- O valor/preço NÃO vem do cliente — é recarregado do cardápio publicado.
create or replace function public.place_public_order(p_slug text, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_t public.tenants;
  v_customer public.customers;
  v_order public.orders;
  v_name text;
  v_phone text;
  v_email text;
  v_items jsonb;
begin
  select * into v_t from public.tenants where slug = p_slug;
  if v_t is null then raise exception 'Negócio não encontrado.'; end if;
  if v_t.status in ('suspended','pending_deletion') then
    raise exception 'Este negócio está temporariamente indisponível.';
  end if;
  if coalesce((v_t.settings ->> 'published')::boolean, false) = false then
    raise exception 'O cardápio ainda não foi publicado.';
  end if;

  v_items := coalesce(p_payload -> 'items', '[]'::jsonb);
  if jsonb_array_length(v_items) = 0 then
    raise exception 'Adicione ao menos um item ao pedido.';
  end if;
  if jsonb_array_length(v_items) > 40 then
    raise exception 'O pedido pode ter no máximo 40 itens.';
  end if;

  v_name  := coalesce(nullif(trim(p_payload ->> 'customerName'), ''), 'Cliente do site');
  v_phone := coalesce(trim(p_payload ->> 'customerPhone'), '');
  v_email := coalesce(trim(p_payload ->> 'customerEmail'), '');

  -- Cliente: nunca sobrescreve dados existentes (preenche só campos vazios).
  select * into v_customer from public.customers
    where tenant_id = v_t.id and lower(name) = lower(v_name)
    limit 1;
  if v_customer is null then
    insert into public.customers (tenant_id, name, phone, email)
    values (v_t.id, v_name, v_phone, v_email)
    returning * into v_customer;
  else
    if v_customer.phone = '' and v_phone <> '' then
      update public.customers set phone = v_phone where id = v_customer.id;
    end if;
    if v_customer.email = '' and v_email <> '' then
      update public.customers set email = v_email where id = v_customer.id;
    end if;
  end if;

  insert into public.orders
    (tenant_id, customer_id, customer_name, customer_phone, size, protein,
     sides, items, observation, payment, origin, status)
  values (
    v_t.id, v_customer.id, v_customer.name,
    nullif(v_phone, ''), 'Pedido pelo site',
    coalesce(v_items -> 0 ->> 'name', ''),
    '[]'::jsonb, v_items,
    nullif(trim(p_payload ->> 'observation'), ''),
    'Pix', 'site', 'pendente')
  returning * into v_order;

  insert into public.analytics_events (tenant_id, kind) values (v_t.id, 'order_completed');
  perform public.track_public_event(p_slug, 'whatsapp_click');

  return jsonb_build_object(
    'id', v_order.id, 'number', v_order.number, 'tenantId', v_order.tenant_id,
    'customerId', v_order.customer_id, 'customerName', v_order.customer_name,
    'customerPhone', v_order.customer_phone, 'size', v_order.size,
    'protein', v_order.protein, 'sides', v_order.sides, 'items', v_order.items,
    'observation', v_order.observation, 'payment', v_order.payment,
    'origin', v_order.origin, 'status', v_order.status,
    'createdAt', v_order.created_at);
end;
$$;

-- ============================================================================
-- NOTAS DE MIGRAÇÃO (demo → produção)
--  * O cadastro deve criar tenant + member 'owner' via Edge Function com
--    service_role (INSERT em tenants não é permitido ao cliente pelo RLS).
--  * A fachada lib/api.ts deve trocar as chamadas do banco local por Supabase,
--    usando a view public.public_sites para o mini-site (nunca a tabela tenants).
--  * Recuperação de senha e webhooks de pagamento rodam em Edge Functions
--    (service_role fica SOMENTE lá — nunca no frontend).
-- ============================================================================
