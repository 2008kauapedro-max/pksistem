/* Modelos de dados PKSISTEM — espelham as tabelas do Supabase (supabase/schema.sql). */

/* ---------- Nichos e categorias ---------- */

/** Categoria é texto livre — cada negócio define as suas. */
export type Category = string;

export const RESTAURANT_CATEGORIES: Category[] = [
  "Carnes",
  "Acompanhamentos",
  "Saladas",
  "Massas",
  "Sobremesas",
  "Bebidas",
];

/** Compatibilidade com código antigo. */
export const CATEGORIES: Category[] = RESTAURANT_CATEGORIES;

export type ThemeId = "moderno" | "minimalista" | "elegante" | "bold";

export interface Niche {
  id: string;
  label: string;
  hint: string;
  categories: Category[];
  defaultTheme: ThemeId;
}

/** O PKSISTEM atende vários tipos de negócio — cada nicho já vem com categorias e tema sugeridos. */
export const NICHES: Niche[] = [
  { id: "restaurante", label: "Restaurante / Self-service", hint: "Pratos do dia, acompanhamentos e saladas.", categories: RESTAURANT_CATEGORIES, defaultTheme: "moderno" },
  { id: "pastelaria", label: "Pastelaria", hint: "Pastéis, caldos e porções.", categories: ["Pastéis", "Caldos", "Porções", "Bebidas"], defaultTheme: "bold" },
  { id: "caldos", label: "Caldos & Sopas", hint: "Caldos com adicionais e acompanhamentos.", categories: ["Caldos", "Acompanhamentos", "Bebidas", "Sobremesas"], defaultTheme: "elegante" },
  { id: "lanchonete", label: "Lanchonete", hint: "Lanches, combos e bebidas.", categories: ["Lanches", "Combos", "Porções", "Bebidas"], defaultTheme: "bold" },
  { id: "marmitaria", label: "Marmitaria", hint: "Marmitas montadas e pratos feitos.", categories: ["Marmitas", "Carnes", "Acompanhamentos", "Saladas", "Bebidas"], defaultTheme: "moderno" },
  { id: "doceria", label: "Doceria / Confeitaria", hint: "Doces, bolos e encomendas.", categories: ["Bolos", "Doces", "Salgados", "Bebidas"], defaultTheme: "elegante" },
  { id: "outro", label: "Outro / Personalizado", hint: "Crie suas próprias categorias.", categories: ["Produtos", "Bebidas"], defaultTheme: "minimalista" },
];

export function nicheById(id: string): Niche {
  return NICHES.find((n) => n.id === id) ?? NICHES[NICHES.length - 1];
}

/* ---------- Cardápio / produtos ---------- */

export type Availability = "disponivel" | "indisponivel" | "esgotado" | "oculto";

/** Adicional pago (ex.: ovo no caldo, borda recheada no pastel). */
export interface FoodExtra {
  name: string;
  price: number | null;
}

export interface Food {
  id: string;
  tenantId: string; // ⬅ isolamento por tenant
  name: string;
  category: Category;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  availability: Availability;
  /** Todo prato criado vai automaticamente para a biblioteca (pratos salvos). */
  active: boolean;
  extras: FoodExtra[];
  createdAt: string;
}

export interface DailyMenuItem {
  id: string;
  tenantId: string; // ⬅ isolamento por tenant
  foodId: string;
  menuDate: string; // YYYY-MM-DD (permite agendamento futuro)
  createdAt: string;
  food?: Food;
}

/* ---------- Pedidos / clientes ---------- */

export type Payment = "Pix" | "Dinheiro" | "Cartão" | "Vale-refeição";
export const PAYMENTS: Payment[] = ["Pix", "Dinheiro", "Cartão", "Vale-refeição"];

export const SIZES = ["Pequena", "Média", "Grande"] as const;

/** Linha de item vinda do mini-site (carrinho). */
export interface OrderItemLine {
  name: string;
  qty: number;
  price: number | null;
}

export interface Order {
  id: string;
  number: number;
  tenantId: string; // ⬅ isolamento por tenant
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  size: string;
  protein: string;
  sides: string[];
  observation: string | null;
  payment: Payment;
  status: import("./utils").OrderStatus;
  createdAt: string;
  /** Presente quando o pedido veio do mini-site. */
  items?: OrderItemLine[];
  origin?: "painel" | "site";
}

export interface Customer {
  id: string;
  tenantId: string; // ⬅ isolamento por tenant
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface CustomerWithStats extends Customer {
  orderCount: number;
  lastOrderAt: string | null;
}

/* ---------- Configuração do mini-site (tenant) ---------- */

export type SiteSection = "hero" | "menu" | "marmita" | "info";

export type MenuMode = "diario" | "fixo";

export interface SiteSettings {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  heroUrl: string | null;
  whatsapp: string;
  whatsappMessage: string;
  address: string;
  openingHours: string;
  phone: string;
  instagram: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ctaText: string;
  headline: string;
  theme: ThemeId;
  sections: Record<SiteSection, boolean>;
  published: boolean;
  /* Nicho e categorias do negócio */
  niche: string;
  categories: Category[];
  /* Modo de cardápio */
  menuMode: MenuMode;
  fixedFoodIds: string[]; // cardápio fixo (sempre visível)
  autoWeeklyMenu: boolean; // aplica o template da semana automaticamente
  weeklyTemplate: Record<string, string[]>; // dia da semana (0-6) → foodIds
  /* Textos personalizáveis do site */
  headerTagline: string;
  heroSubtitle: string;
  menuEyebrow: string;
  menuTitle: string;
  marmitaEyebrow: string;
  marmitaTitle: string;
  marmitaSubtitle: string;
  marmitaButtonText: string;
  orderPageTitle: string;
  orderPageSubtitle: string;
  footerText: string;
}

/** Retenção de clientes: manual (guarda tudo) ou automática (apaga inativos). */
export interface ClientRetention {
  mode: "manual" | "auto";
  days: number;
}

/* ---------- Multi-tenancy ---------- */

export type Role = "owner" | "admin" | "editor" | "viewer";
export const ROLES: Role[] = ["owner", "admin", "editor", "viewer"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Dono",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

export type TenantStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "suspended"
  | "pending_deletion";

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  trialing: "Em trial",
  active: "Ativo",
  past_due: "Pagamento pendente",
  paused: "Pausado",
  canceled: "Cancelado",
  suspended: "Suspenso",
  pending_deletion: "Exclusão pendente",
};

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  planId: string;
  status: TenantStatus;
  trialEndsAt: string | null;
  createdAt: string;
  lastActivityAt: string;
  onboardingCompleted: boolean;
  settings: SiteSettings;
  clientRetention?: ClientRetention;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  createdAt: string;
  user?: User;
}

/** Sessão autenticada + vínculo com tenant (derivada da sessão, nunca do frontend). */
export interface Membership {
  user: User;
  tenant: Tenant;
  role: Role;
}

/* ---------- Configurações da plataforma (super admin) ---------- */

export interface PlatformSettings {
  name: string;
  tagline: string;
  supportWhatsapp: string;
  supportEmail: string;
  instagram: string;
  logoUrl: string | null;
  pkchatEnabled: boolean;
}

/* ---------- Planos / Entitlements ---------- */

export type FeatureId =
  | "site_customization"
  | "analytics"
  | "advanced_analytics"
  | "weekly_menu"
  | "scheduled_menu"
  | "custom_domain"
  | "multiple_users"
  | "whatsapp_orders"
  | "priority_support"
  | "export_data";

export interface Plan {
    firstMonthPrice?: number; // Adicione esta linha
  isEnterprise?: boolean;   // Adicione esta linha
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  limits: {
    maxProducts: number; // -1 = ilimitado
    maxCategories: number;
    maxUsers: number;
    maxStorageMb: number;
    maxMonthlyViews: number;
  };
  features: FeatureId[];
  highlight?: boolean;
}

export interface Subscription {
  tenantId: string;
  planId: string;
  status: TenantStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

export interface Usage {
  products: number;
  categories: number;
  users: number;
  storageMb: number;
  monthlyViews: number;
}

/* ---------- Auditoria / Analytics / Notificações ---------- */

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string;
  tenantId: string | null;
  action: string;
  resource: string;
  result: "ok" | "denied" | "error";
  metadata?: Record<string, string>;
  createdAt: string;
}

export type AnalyticsKind =
  | "site_view"
  | "menu_view"
  | "dish_view"
  | "whatsapp_click"
  | "order_started"
  | "order_completed";

export interface AnalyticsEvent {
  id: string;
  tenantId: string;
  kind: AnalyticsKind;
  label?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  tenantId: string | null; // null = plataforma (super admin)
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/* ---------- Entradas de formulário ---------- */

export interface NewFoodInput {
  name: string;
  category: Category;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  extras?: FoodExtra[];
  /** Mantido por compatibilidade — hoje todo prato é salvo na biblioteca automaticamente. */
  saveToLibrary?: boolean;
}

export interface NewOrderInput {
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  size: string;
  protein: string;
  sides: string[];
  observation?: string | null;
  payment: Payment;
  status: import("./utils").OrderStatus;
}

export interface PlacePublicOrderInput {
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: OrderItemLine[];
  observation?: string | null;
}
