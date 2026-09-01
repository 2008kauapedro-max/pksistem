/* Planos, entitlements (recursos) e RBAC do SaborFlow.
 * Preços e limites ficam aqui (e no banco, em produção) — nunca espalhados pela UI.
 */
import type { FeatureId, Plan, Role, Tenant, Usage } from "./types";

/* ---------- Catálogo de recursos (entitlements) ---------- */

export const FEATURES: Record<FeatureId, { name: string; description: string }> = {
  whatsapp_orders: { name: "Pedidos pelo WhatsApp", description: "Botão de pedido que abre o WhatsApp do restaurante." },
  site_customization: { name: "Personalização do mini-site", description: "Cores, logo, capa, textos e seções do site público." },
  analytics: { name: "Analytics", description: "Visualizações, cliques no WhatsApp e pedidos iniciados." },
  advanced_analytics: { name: "Analytics avançado", description: "Pratos mais vistos, categorias e tendências." },
  weekly_menu: { name: "Cardápio semanal", description: "Visualize e copie cardápios da semana." },
  scheduled_menu: { name: "Cardápio agendado", description: "Prepare cardápios de dias futuros com antecedência." },
  custom_domain: { name: "Domínio personalizado", description: "Use seu próprio domínio (ex.: seurestaurante.com.br)." },
  multiple_users: { name: "Múltiplos usuários", description: "Convide sua equipe com papéis e permissões." },
  priority_support: { name: "Suporte prioritário", description: "Atendimento prioritário com tempo de resposta reduzido." },
  export_data: { name: "Exportação de dados", description: "Exporte pratos, pedidos e configurações (CSV/JSON)." },
};

/* ---------- Planos ---------- */

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Grátis",
    tagline: "Para começar a vender hoje",
    priceMonthly: 0,
    priceAnnual: 0,
    limits: { maxProducts: 10, maxCategories: 3, maxUsers: 1, maxStorageMb: 50, maxMonthlyViews: 500 },
    features: ["whatsapp_orders", "site_customization"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Para o dia a dia do restaurante",
    priceMonthly: 49,
    priceAnnual: 470,
    limits: { maxProducts: 50, maxCategories: 6, maxUsers: 2, maxStorageMb: 500, maxMonthlyViews: 5000 },
    features: ["whatsapp_orders", "site_customization", "analytics", "weekly_menu", "export_data"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quem quer crescer",
    priceMonthly: 99,
    priceAnnual: 950,
    limits: { maxProducts: 200, maxCategories: 12, maxUsers: 5, maxStorageMb: 2000, maxMonthlyViews: 50000 },
    features: [
      "whatsapp_orders",
      "site_customization",
      "analytics",
      "advanced_analytics",
      "weekly_menu",
      "scheduled_menu",
      "multiple_users",
      "export_data",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    tagline: "Para operações e redes",
    priceMonthly: 199,
    priceAnnual: 1910,
    limits: { maxProducts: -1, maxCategories: -1, maxUsers: -1, maxStorageMb: 10000, maxMonthlyViews: -1 },
    features: [
      "whatsapp_orders",
      "site_customization",
      "analytics",
      "advanced_analytics",
      "weekly_menu",
      "scheduled_menu",
      "multiple_users",
      "export_data",
      "custom_domain",
      "priority_support",
    ],
  },
];

export function getPlan(planId: string): Plan {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0];
}

export function hasFeature(tenant: Tenant | null, feature: FeatureId): boolean {
  if (!tenant) return false;
  return getPlan(tenant.planId).features.includes(feature);
}

/* ---------- Limites ---------- */

export type LimitKey = "maxProducts" | "maxCategories" | "maxUsers" | "maxStorageMb" | "maxMonthlyViews";

export function limitLabel(key: LimitKey): string {
  const map: Record<LimitKey, string> = {
    maxProducts: "pratos",
    maxCategories: "categorias",
    maxUsers: "usuários",
    maxStorageMb: "armazenamento",
    maxMonthlyViews: "visualizações/mês",
  };
  return map[key];
}

export function limitValue(plan: Plan, key: LimitKey): number {
  return plan.limits[key];
}

export function usageFor(key: LimitKey, usage: Usage): number {
  switch (key) {
    case "maxProducts":
      return usage.products;
    case "maxCategories":
      return usage.categories;
    case "maxUsers":
      return usage.users;
    case "maxStorageMb":
      return usage.storageMb;
    case "maxMonthlyViews":
      return usage.monthlyViews;
  }
}

/** Retorna null se estiver dentro do limite, ou uma mensagem de bloqueio. */
export function checkLimit(tenant: Tenant | null, key: LimitKey, usage: Usage): string | null {
  if (!tenant) return null;
  const plan = getPlan(tenant.planId);
  const limit = plan.limits[key];
  if (limit === -1) return null; // ilimitado
  const used = usageFor(key, usage);
  if (used >= limit) {
    return `Você atingiu o limite de ${limit} ${limitLabel(key)} do plano ${plan.name}. Faça upgrade para continuar.`;
  }
  return null;
}

/** Percentual de uso (para barras de progresso e avisos). */
export function usagePercent(plan: Plan, key: LimitKey, usage: Usage): number {
  const limit = plan.limits[key];
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((usageFor(key, usage) / limit) * 100));
}

/* ---------- RBAC ---------- */

export type Permission =
  | "menu.read"
  | "menu.update"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "site.update"
  | "settings.update"
  | "analytics.read"
  | "users.manage"
  | "billing.manage"
  | "data.export";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "menu.read", "menu.update", "products.create", "products.update", "products.delete",
    "site.update", "settings.update", "analytics.read", "users.manage", "billing.manage", "data.export",
  ],
  admin: [
    "menu.read", "menu.update", "products.create", "products.update", "products.delete",
    "site.update", "analytics.read", "users.manage", "data.export",
  ],
  editor: ["menu.read", "menu.update", "products.create", "products.update", "analytics.read"],
  viewer: ["menu.read", "analytics.read"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/* ---------- Preços formatados ---------- */

export function formatPrice(value: number): string {
  if (value === 0) return "R$ 0";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
