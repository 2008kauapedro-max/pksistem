/**
 * Implementação REAL (Supabase) da fachada de dados do PKSISTEM.
 *
 * Usa SOMENTE a chave pública (publishable/anon). A segurança real vive no
 * banco: RLS + funções security definer. A SECRET_KEY nunca toca este arquivo.
 *
 * Cada método espelha a interface do modo demo (tenantStore.ts), então a
 * fachada (api.ts) pode alternar entre demo e produção sem mudar as páginas.
 */
import { supabase, STORAGE_BUCKET, friendlyAuthError, friendlyDbError } from "./supabase";
import type {
  AppNotification, AuditLog, Customer, CustomerWithStats, DailyMenuItem, Food,
  Membership, Order, OrderItemLine, PlatformSettings, Role, SiteSettings,
  Tenant, TenantMember, Usage, User, AnalyticsEvent,
} from "./types";
import { getPlan, checkLimit, hasFeature } from "./plans";
import type { AnalyticsKind } from "./types";
import { fileToDataUrl, uid, type OrderStatus } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

function sb() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

function fail(err: unknown, fallback: string): never {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: string }).message;
    // Mensagens vindas das nossas funções SQL (raise exception) já são amigáveis.
    if (m && !/row-level security|permission denied|violates|policy/i.test(m)) {
      throw new Error(m);
    }
  }
  throw new Error(friendlyDbError(err, fallback));
}

/* ---------- mappers (snake_case do Postgres → modelos do app) ---------- */

const mUser = (r: any): User => ({
  id: r.id, email: r.email ?? "", name: r.name ?? "", isSuperAdmin: Boolean(r.is_super_admin),
  createdAt: r.created_at, lastLoginAt: r.last_login_at ?? null,
});
const mTenant = (r: any): Tenant => ({
  id: r.id, name: r.name, slug: r.slug, planId: r.plan_id, status: r.status,
  trialEndsAt: r.trial_ends_at ?? null, createdAt: r.created_at, lastActivityAt: r.last_activity_at,
  onboardingCompleted: Boolean(r.onboarding_completed),
  settings: (r.settings ?? {}) as SiteSettings,
  clientRetention: r.client_retention ?? { mode: "manual", days: 0 },
});
const mFood = (r: any): Food => ({
  id: r.id, tenantId: r.tenant_id, name: r.name, category: r.category,
  description: r.description ?? null, price: r.price != null ? Number(r.price) : null,
  imageUrl: r.image_url ?? null, availability: r.availability ?? "disponivel",
  active: Boolean(r.active), extras: r.extras ?? [], createdAt: r.created_at,
});
const mItem = (r: any, food?: Food | null): DailyMenuItem => ({
  id: r.id, tenantId: r.tenant_id, foodId: r.food_id, menuDate: r.menu_date,
  createdAt: r.created_at, food: food ?? undefined,
});
const mOrder = (r: any): Order => ({
  id: r.id, number: r.number, tenantId: r.tenant_id, customerId: r.customer_id ?? null,
  customerName: r.customer_name, customerPhone: r.customer_phone ?? null,
  size: r.size, protein: r.protein, sides: r.sides ?? [], items: r.items ?? undefined,
  observation: r.observation ?? null, payment: r.payment, origin: r.origin ?? "painel",
  status: r.status, createdAt: r.created_at,
});
const mCustomer = (r: any): Customer => ({
  id: r.id, tenantId: r.tenant_id, name: r.name, phone: r.phone ?? "", email: r.email ?? "",
  createdAt: r.created_at,
});
const mMember = (r: any, user?: User): TenantMember => ({
  id: r.id, tenantId: r.tenant_id, userId: r.user_id, role: r.role as Role,
  createdAt: r.created_at, user,
});
const mNotif = (r: any): AppNotification => ({
  id: r.id, tenantId: r.tenant_id ?? null, title: r.title, body: r.body ?? "",
  read: Boolean(r.read), createdAt: r.created_at,
});
const mAnalytics = (r: any): AnalyticsEvent => ({
  id: r.id, tenantId: r.tenant_id, kind: r.kind as AnalyticsKind, label: r.label ?? undefined,
  createdAt: r.created_at,
});
const mPlatform = (r: any): PlatformSettings => ({
  name: r.name, tagline: r.tagline, supportWhatsapp: r.support_whatsapp ?? "",
  supportEmail: r.support_email ?? "", instagram: r.instagram ?? "",
  logoUrl: r.logo_url ?? null, pkchatEnabled: Boolean(r.pkchat_enabled),
});

async function requireSuper(): Promise<User> {
  const { data } = await sb().auth.getUser();
  if (!data || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  const { data: p } = await sb().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!p || !p.is_super_admin) throw new Error("Acesso restrito à administração da plataforma.");
  return mUser(p);
}

/* ================= AUTH (real — Supabase Auth) ================= */

export const supabaseAuth = {
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendlyAuthError(error));
    const { data: p } = await sb().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    return mUser(p ?? { id: data.user.id, email: data.user.email, name: "", is_super_admin: false, created_at: new Date().toISOString() });
  },

  async signUp(input: { name: string; email: string; password: string; restaurantName: string; slug: string; whatsapp?: string; niche?: string; categories?: string[] }): Promise<User> {
    const { data, error } = await sb().auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: { data: { name: input.name } },
    });
    if (error) throw new Error(friendlyAuthError(error));
    const user = data.user;
    if (!data.session || !user) {
      // Confirmação de e-mail ativa: o tenant é criado após o usuário confirmar.
      throw new Error("Conta criada! Confirme seu e-mail e entre novamente para concluir a configuração do seu negócio.");
    }
    // Cria tenant + vínculo owner em uma transação server-side (security definer).
    const { error: tenantErr } = await sb().rpc("create_tenant", {
      p_name: input.restaurantName.trim(),
      p_slug: input.slug,
      p_niche: input.niche ?? "restaurante",
      p_whatsapp: input.whatsapp ?? "",
      p_categories: input.categories ?? [],
    });
    if (tenantErr) throw new Error(friendlyDbError(tenantErr, "Não foi possível criar seu negócio. Tente novamente."));
    const { data: p } = await sb().from("profiles").select("*").eq("id", user.id).maybeSingle();
    return mUser(p ?? { id: user.id, email: input.email, name: input.name, is_super_admin: false, created_at: new Date().toISOString() });
  },

  async signOut(): Promise<void> {
    await sb().auth.signOut();
  },

  async getSessionUser(): Promise<User | null> {
    const { data } = await sb().auth.getUser();
    if (!data.user) return null;
    const { data: p } = await sb().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (!p) return null;
    return mUser(p);
  },

  isImpersonating(): boolean {
    // Impersonação real exige service_role (Edge Function) — não disponível no cliente.
    return false;
  },

  async getMembership(): Promise<Membership | null> {
    const { data } = await sb().auth.getUser();
    if (!data.user) return null;
    const { data: p } = await sb().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (!p) return null;
    if (p.is_super_admin) return null; // super admin não tem tenant
    const { data: member } = await sb().from("tenant_members").select("*").eq("user_id", data.user.id).maybeSingle();
    if (!member) return null;
    const { data: tenant } = await sb().from("tenants").select("*").eq("id", member.tenant_id).maybeSingle();
    if (!tenant) return null;
    return { user: mUser(p), tenant: mTenant(tenant), role: member.role as Role };
  },

  async requestPasswordReset(email: string): Promise<{ demoResetToken: string }> {
    // Envia o link por e-mail (Supabase Auth). Retorna vazio — não há token no cliente.
    await sb().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#/recuperar` : undefined,
    });
    return { demoResetToken: "" };
  },

  async resetPassword(_token: string, newPassword: string): Promise<void> {
    // No fluxo real o link do e-mail abre o app com uma sessão de recuperação;
    // a nova senha é definida com updateUser (a sessão já prova a identidade).
    const { error } = await sb().auth.updateUser({ password: newPassword });
    if (error) throw new Error("Não foi possível redefinir a senha. Use o link enviado por e-mail novamente.");
  },
};

/* ================= API DO TENANT (real) ================= */

export const supabaseApi = {
  /* ---- público (mini-site) — via funções security definer ---- */

  async getPublicSite(slug: string): Promise<{ tenant: Tenant; items: DailyMenuItem[] } | null> {
    const { data, error } = await sb().rpc("get_public_site", { p_slug: slug });
    if (error) fail(error, "Não foi possível carregar o site.");
    if (!data) return null;
    return { tenant: mTenant(data.tenant), items: (data.items ?? []).map((i: any) => mItem(i, i.food ? mFood(i.food) : null)) };
  },

  async getPublicMenu(slug: string, _date: string): Promise<DailyMenuItem[]> {
    const site = await this.getPublicSite(slug);
    return site ? site.items : [];
  },

  async trackPublic(slug: string, kind: string): Promise<void> {
    await sb().rpc("track_public_event", { p_slug: slug, p_kind: kind });
  },

  async getPlatformPublic(): Promise<PlatformSettings> {
    const { data, error } = await sb().from("platform_settings").select("*").limit(1).maybeSingle();
    if (error) fail(error, "Não foi possível carregar as configurações.");
    return mPlatform(data ?? {});
  },

  async placePublicOrder(slug: string, input: { customerName: string; customerPhone?: string | null; customerEmail?: string | null; items: OrderItemLine[]; observation?: string | null }): Promise<Order> {
    const { data, error } = await sb().rpc("place_public_order", {
      p_slug: slug,
      p_payload: {
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? "",
        customerEmail: input.customerEmail ?? "",
        items: input.items,
        observation: input.observation ?? "",
      },
    });
    if (error) fail(error, "Não foi possível registrar o pedido.");
    return mOrder(data);
  },

  /* ---- tenant / site ---- */

  async getMyTenant(): Promise<Tenant> {
    const me = await supabaseAuth.getMembership();
    if (!me) throw new Error("Você não tem um negócio associado.");
    return me.tenant;
  },

  async updateSettings(tenantId: string, patch: Partial<SiteSettings>): Promise<Tenant> {
    const { data: t, error: e0 } = await sb().from("tenants").select("*").eq("id", tenantId).maybeSingle();
    if (e0 || !t) throw new Error("Você não tem permissão para acessar este negócio.");
    const settings = { ...(t.settings ?? {}), ...patch };
    const { data, error } = await sb().from("tenants").update({ settings }).eq("id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível salvar as configurações.");
    return mTenant(data);
  },

  async publishSite(tenantId: string, published: boolean): Promise<Tenant> {
    return this.updateSettings(tenantId, { published });
  },

  async completeOnboarding(tenantId: string): Promise<Tenant> {
    const { data, error } = await sb().from("tenants").update({ onboarding_completed: true }).eq("id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível concluir a configuração.");
    return mTenant(data);
  },

  async setClientRetention(tenantId: string, retention: { mode: "manual" | "auto"; days: number }): Promise<void> {
    const { error } = await sb().from("tenants").update({ client_retention: retention }).eq("id", tenantId);
    if (error) fail(error, "Não foi possível salvar a retenção.");
  },

  async requestDeletion(tenantId: string): Promise<void> {
    const { error } = await sb().from("tenants").update({ status: "pending_deletion" }).eq("id", tenantId);
    if (error) fail(error, "Não foi possível solicitar a exclusão.");
  },

  async uploadImage(tenantId: string, file: File): Promise<string> {
    // Caminho isolado por tenant: tenant/{tenant_id}/... (a política RLS confere).
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `tenant/${tenantId}/${Date.now()}-${uid()}.${ext}`;
    const { error } = await sb().storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
    if (error) throw new Error("Não foi possível enviar a imagem. Tente novamente.");
    const { data } = sb().storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  /* ---- produtos ---- */

  async listFoods(tenantId: string): Promise<Food[]> {
    const { data, error } = await sb().from("foods").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (error) fail(error, "Não foi possível carregar os produtos.");
    return (data ?? []).map(mFood);
  },

  async createFood(tenantId: string, input: { name: string; category: string; description?: string | null; price?: number | null; imageUrl?: string | null; extras?: Food["extras"]; saveToLibrary?: boolean }): Promise<Food> {
    // Limite de produtos do plano (checagem de UX; o RLS é a proteção real).
    const me = await supabaseAuth.getMembership();
    if (me) {
      const usage = await this.getUsage(tenantId);
      const blocked = checkLimit(me.tenant, "maxProducts", usage);
      if (blocked) throw new Error(blocked);
    }
    const { data, error } = await sb().from("foods").insert({
      tenant_id: tenantId, name: input.name.trim(), category: input.category,
      description: input.description ?? null, price: input.price ?? null,
      image_url: input.imageUrl ?? null, active: true, extras: input.extras ?? [],
    }).select().maybeSingle();
    if (error) fail(error, "Não foi possível criar o produto.");
    return mFood(data);
  },

  async updateFood(tenantId: string, foodId: string, patch: Partial<Food>): Promise<Food> {
    const { data, error } = await sb().from("foods").update({
      name: patch.name, category: patch.category, description: patch.description,
      price: patch.price, image_url: patch.imageUrl, extras: patch.extras,
    }).eq("id", foodId).eq("tenant_id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível atualizar o produto.");
    return mFood(data);
  },

  async deleteFood(tenantId: string, foodId: string): Promise<void> {
    const { error } = await sb().from("foods").delete().eq("id", foodId).eq("tenant_id", tenantId);
    if (error) fail(error, "Não foi possível excluir o produto.");
  },

  /* ---- cardápio ---- */

  async listMenu(tenantId: string, date: string): Promise<DailyMenuItem[]> {
    const { data, error } = await sb().from("daily_menu_items").select("*").eq("tenant_id", tenantId).eq("menu_date", date);
    if (error) fail(error, "Não foi possível carregar o cardápio.");
    const foods = await this.listFoods(tenantId);
    return (data ?? []).map((i: any) => mItem(i, foods.find((f) => f.id === i.food_id) ?? null)).filter((i) => i.food);
  },

  async listWeekMenu(tenantId: string, dates: string[]): Promise<Record<string, DailyMenuItem[]>> {
    const foods = await this.listFoods(tenantId);
    const out: Record<string, DailyMenuItem[]> = {};
    for (const d of dates) {
      const { data } = await sb().from("daily_menu_items").select("*").eq("tenant_id", tenantId).eq("menu_date", d);
      out[d] = (data ?? []).map((i: any) => mItem(i, foods.find((f) => f.id === i.food_id) ?? null)).filter((i) => i.food);
    }
    return out;
  },

  async addToMenu(tenantId: string, foodId: string, date: string): Promise<DailyMenuItem> {
    const { data, error } = await sb().from("daily_menu_items").insert({ tenant_id: tenantId, food_id: foodId, menu_date: date }).select().maybeSingle();
    if (error) fail(error, "Este produto já está no cardápio desta data.");
    const foods = await this.listFoods(tenantId);
    return mItem(data, foods.find((f) => f.id === foodId) ?? null);
  },

  async removeFromMenu(tenantId: string, itemId: string): Promise<void> {
    const { error } = await sb().from("daily_menu_items").delete().eq("id", itemId).eq("tenant_id", tenantId);
    if (error) fail(error, "Não foi possível remover do cardápio.");
  },

  async copyMenu(tenantId: string, from: string, to: string): Promise<number> {
    const src = await this.listMenu(tenantId, from);
    let added = 0;
    for (const it of src) {
      const { error } = await sb().from("daily_menu_items").insert({ tenant_id: tenantId, food_id: it.foodId, menu_date: to });
      if (!error) added++;
    }
    return added;
  },

  /* ---- pedidos ---- */

  async listOrders(tenantId: string): Promise<Order[]> {
    const { data, error } = await sb().from("orders").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (error) fail(error, "Não foi possível carregar os pedidos.");
    return (data ?? []).map(mOrder);
  },

  async createOrder(tenantId: string, input: { customerName: string; customerPhone?: string | null; customerEmail?: string | null; size: string; protein: string; sides: string[]; observation?: string | null; payment: string; status: OrderStatus }): Promise<Order> {
    // Upsert de cliente por nome (RLS limita ao tenant).
    let customerId: string | null = null;
    const { data: existing } = await sb().from("customers").select("*").eq("tenant_id", tenantId).ilike("name", input.customerName.trim()).maybeSingle();
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: c } = await sb().from("customers").insert({ tenant_id: tenantId, name: input.customerName.trim(), phone: input.customerPhone ?? "", email: input.customerEmail ?? "" }).select().maybeSingle();
      customerId = c?.id ?? null;
    }
    const { data, error } = await sb().from("orders").insert({
      tenant_id: tenantId, customer_id: customerId, customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone ?? null, size: input.size, protein: input.protein,
      sides: input.sides, observation: input.observation ?? null, payment: input.payment,
      origin: "painel", status: input.status,
    }).select().maybeSingle();
    if (error) fail(error, "Não foi possível salvar o pedido.");
    return mOrder(data);
  },

  async updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const { data, error } = await sb().from("orders").update({ status }).eq("id", orderId).eq("tenant_id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível atualizar o pedido.");
    return mOrder(data);
  },

  /* ---- clientes ---- */

  async listCustomers(tenantId: string): Promise<CustomerWithStats[]> {
    const { data, error } = await sb().from("customers").select("*").eq("tenant_id", tenantId);
    if (error) fail(error, "Não foi possível carregar os clientes.");
    const orders = await this.listOrders(tenantId);
    return (data ?? []).map((c: any) => {
      const mine = orders.filter((o) => o.customerId === c.id);
      return { ...mCustomer(c), orderCount: mine.length, lastOrderAt: mine.length ? mine[0].createdAt : null };
    }).sort((a: CustomerWithStats, b: CustomerWithStats) => b.orderCount - a.orderCount);
  },

  async addCustomer(tenantId: string, input: { name: string; phone?: string | null; email?: string | null }): Promise<CustomerWithStats> {
    const { data, error } = await sb().from("customers").insert({ tenant_id: tenantId, name: input.name.trim(), phone: input.phone ?? "", email: input.email ?? "" }).select().maybeSingle();
    if (error) fail(error, "Não foi possível adicionar o cliente.");
    return { ...mCustomer(data), orderCount: 0, lastOrderAt: null };
  },

  async updateCustomer(tenantId: string, customerId: string, patch: Partial<Pick<Customer, "name" | "phone" | "email">>): Promise<Customer> {
    const { data, error } = await sb().from("customers").update(patch).eq("id", customerId).eq("tenant_id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível atualizar o cliente.");
    return mCustomer(data);
  },

  async deleteCustomer(tenantId: string, customerId: string): Promise<void> {
    const { error } = await sb().from("customers").delete().eq("id", customerId).eq("tenant_id", tenantId);
    if (error) fail(error, "Não foi possível excluir o cliente.");
  },

  /* ---- equipe ---- */

  async listMembers(tenantId: string): Promise<TenantMember[]> {
    const { data, error } = await sb().from("tenant_members").select("*").eq("tenant_id", tenantId);
    if (error) fail(error, "Não foi possível carregar a equipe.");
    const ids = (data ?? []).map((m: any) => m.user_id);
    const { data: profs } = await sb().from("profiles").select("*").in("id", ids);
    return (data ?? []).map((m: any) => mMember(m, (profs ?? []).find((p: any) => p.id === m.user_id) ? mUser((profs ?? []).find((p: any) => p.id === m.user_id)) : undefined));
  },

  async inviteMember(tenantId: string, email: string, name: string, role: Role): Promise<TenantMember> {
    void tenantId;
    const { data, error } = await sb().rpc("invite_member", { p_email: email, p_name: name, p_role: role });
    if (error) fail(error, "Não foi possível convidar.");
    return mMember(data);
  },

  async setMemberRole(tenantId: string, memberId: string, role: Role): Promise<TenantMember> {
    const { data, error } = await sb().from("tenant_members").update({ role }).eq("id", memberId).eq("tenant_id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível alterar o papel.");
    return mMember(data);
  },

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    const { error } = await sb().from("tenant_members").delete().eq("id", memberId).eq("tenant_id", tenantId);
    if (error) fail(error, "Não foi possível remover o membro.");
  },

  /* ---- métricas / uso / notificações ---- */

  async getAnalytics(tenantId: string, days: number): Promise<AnalyticsEvent[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb().from("analytics_events").select("*").eq("tenant_id", tenantId).gte("created_at", since);
    if (error) fail(error, "Não foi possível carregar as métricas.");
    return (data ?? []).map(mAnalytics);
  },

  async getUsage(tenantId: string): Promise<Usage> {
    const [foods, members, events] = await Promise.all([
      this.listFoods(tenantId),
      this.listMembers(tenantId),
      this.getAnalytics(tenantId, 30),
    ]);
    const withImage = foods.filter((f) => Boolean(f.imageUrl)).length;
    return {
      products: foods.length,
      categories: new Set(foods.map((f) => f.category)).size,
      users: members.length,
      storageMb: Math.round(withImage * 0.3),
      monthlyViews: events.filter((e) => e.kind === "site_view").length,
    };
  },

  async listNotifications(tenantId: string): Promise<AppNotification[]> {
    const { data, error } = await sb().from("notifications").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mNotif);
  },

  async markNotificationRead(tenantId: string, id: string): Promise<void> {
    void tenantId;
    await sb().from("notifications").update({ read: true }).eq("id", id);
  },

  /* ---- assinatura ---- */

  async changePlan(tenantId: string, planId: string): Promise<Tenant> {
    const { data, error } = await sb().from("tenants").update({ plan_id: planId, status: "active", trial_ends_at: null }).eq("id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível alterar o plano.");
    return mTenant(data);
  },

  async cancelSubscription(tenantId: string): Promise<Tenant> {
    const { data, error } = await sb().from("tenants").update({ status: "canceled" }).eq("id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível cancelar.");
    return mTenant(data);
  },

  async exportData(tenantId: string, format: "json" | "csv"): Promise<string> {
    const [foods, orders, customers] = await Promise.all([
      this.listFoods(tenantId), this.listOrders(tenantId), this.listCustomers(tenantId),
    ]);
    if (format === "json") {
      return JSON.stringify({ exportedAt: new Date().toISOString(), foods, orders, customers }, null, 2);
    }
    const lines = ["tipo,dados"];
    foods.forEach((f) => lines.push(`produto,"${f.name};${f.category};${f.price ?? ""}"`));
    orders.forEach((o) => lines.push(`pedido,"#${o.number};${o.customerName};${o.status}"`));
    customers.forEach((c) => lines.push(`cliente,"${c.name};${c.phone}"`));
    return lines.join("\n");
  },
};

/* ================= SUPER ADMIN (real) ================= */

export const supabaseAdmin = {
  async getPlatform(): Promise<PlatformSettings> {
    await requireSuper();
    const { data, error } = await sb().from("platform_settings").select("*").limit(1).maybeSingle();
    if (error) fail(error, "Não foi possível carregar.");
    return mPlatform(data ?? {});
  },

  async updatePlatform(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    await requireSuper();
    const row: any = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.tagline !== undefined) row.tagline = patch.tagline;
    if (patch.supportWhatsapp !== undefined) row.support_whatsapp = patch.supportWhatsapp;
    if (patch.supportEmail !== undefined) row.support_email = patch.supportEmail;
    if (patch.instagram !== undefined) row.instagram = patch.instagram;
    if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
    if (patch.pkchatEnabled !== undefined) row.pkchat_enabled = patch.pkchatEnabled;
    const { data, error } = await sb().from("platform_settings").update(row).eq("id", true).select().maybeSingle();
    if (error) fail(error, "Não foi possível salvar.");
    return mPlatform(data ?? {});
  },

  async overview() {
    await requireSuper();
    const [tenants, orders, profiles, events] = await Promise.all([
      sb().from("tenants").select("*"),
      sb().from("orders").select("*"),
      sb().from("profiles").select("*"),
      sb().from("analytics_events").select("*"),
    ]);
    const ts = (tenants.data ?? []) as any[];
    const active = ts.filter((t) => t.status === "active").length;
    const trial = ts.filter((t) => t.status === "trialing").length;
    const suspended = ts.filter((t) => t.status === "suspended").length;
    const mrr = ts.reduce((acc, t) => acc + (getPlan(t.plan_id).priceMonthly || 0), 0);
    return {
      tenants: ts.length, activeTenants: active, trials: trial, suspended,
      users: (profiles.data ?? []).length,
      orders: (orders.data ?? []).length,
      events: (events.data ?? []).length,
      mrr, arr: mrr * 12,
    };
  },

  async listTenants() {
    await requireSuper();
    const { data, error } = await sb().from("tenants").select("*").order("created_at", { ascending: false });
    if (error) fail(error, "Não foi possível carregar os tenants.");
    const { data: members } = await sb().from("tenant_members").select("*");
    const { data: profs } = await sb().from("profiles").select("*");
    return (data ?? []).map((t: any) => {
      const owner = (members ?? []).find((m: any) => m.tenant_id === t.id && m.role === "owner");
      const prof = owner ? (profs ?? []).find((p: any) => p.id === owner.user_id) : null;
      return {
        ...mTenant(t),
        ownerName: prof?.name ?? "—", ownerEmail: prof?.email ?? "—",
        usage: { products: 0, users: (members ?? []).filter((m: any) => m.tenant_id === t.id).length, storageMb: 0 },
      };
    });
  },

  async setTenantStatus(tenantId: string, status: Tenant["status"], _reason?: string): Promise<Tenant> {
    await requireSuper();
    const { data, error } = await sb().from("tenants").update({ status }).eq("id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível alterar o status.");
    return mTenant(data);
  },

  async setTenantPlan(tenantId: string, planId: string): Promise<Tenant> {
    await requireSuper();
    const { data, error } = await sb().from("tenants").update({ plan_id: planId }).eq("id", tenantId).select().maybeSingle();
    if (error) fail(error, "Não foi possível alterar o plano.");
    return mTenant(data);
  },

  async impersonate(_tenantId: string): Promise<Membership> {
    await requireSuper();
    // Impersonação real exige service_role (criar sessão para outro usuário),
    // o que só pode rodar em Edge Function — nunca no navegador.
    throw new Error("Impersonação requer uma Edge Function (service_role). Disponível em produção.");
  },

  async listAudit(limit = 200): Promise<AuditLog[]> {
    await requireSuper();
    const { data, error } = await sb().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) fail(error, "Não foi possível carregar a auditoria.");
    return (data ?? []).map((r: any) => ({
      id: r.id, actorId: r.actor_id, actorEmail: r.actor_email, tenantId: r.tenant_id,
      action: r.action, resource: r.resource, result: r.result, metadata: r.metadata ?? undefined,
      createdAt: r.created_at,
    }));
  },

  async listNotifications(): Promise<AppNotification[]> {
    await requireSuper();
    const { data, error } = await sb().from("notifications").select("*").is("tenant_id", null);
    if (error) return [];
    return (data ?? []).map(mNotif);
  },
};

/* Mantém a fachada informando que features de plano valem também aqui. */
export { hasFeature };
