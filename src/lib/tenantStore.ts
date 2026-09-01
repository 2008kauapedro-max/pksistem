/**
 * STORE MULTI-TENANT DO SABORFLOW (modo demonstração, sem Supabase).
 *
 * ARQUITETURA DE ISOLAMENTO (vale para demo e produção):
 *  1. Toda operação deriva o tenant da SESSÃO autenticada — nunca de um
 *     tenant_id enviado livremente pelo frontend.
 *  2. Toda operação sobre um registro valida: sessão válida + usuário é
 *     membro do tenant + registro pertence ao MESMO tenant (anti-IDOR).
 *  3. Operações sensíveis verificam permissão RBAC (can(role, permission)).
 *  4. Limites de plano são verificados ANTES de criar recursos.
 *  5. Toda ação relevante gera audit log (ator, tenant, ação, resultado).
 *
 * Em produção (Supabase), as mesmas regras vivem no banco via RLS
 * (supabase/schema.sql) — o frontend NUNCA é a camada de segurança.
 *
 * Senhas: neste modo demo são armazenadas com hash simples (djb2) apenas
 * para demonstração do fluxo. Com Supabase, o Auth usa bcrypt/argon2.
 */
import type {
  AnalyticsEvent,
  AnalyticsKind,
  AppNotification,
  AuditLog,
  ClientRetention,
  Customer,
  CustomerWithStats,
  DailyMenuItem,
  Food,
  Membership,
  NewFoodInput,
  NewOrderInput,
  Order,
  OrderItemLine,
  PlatformSettings,
  Role,
  SiteSettings,
  Tenant,
  TenantMember,
  Usage,
  User,
} from "./types";
import { nicheById } from "./types";
import { getPlan, hasFeature, checkLimit, type Permission, can } from "./plans";
import { fileToDataUrl, parseISO, sleep, slugify, todayISO, uid, type OrderStatus } from "./utils";

const DB_KEY = "saborflow_db_v1";
const SESSION_KEY = "saborflow_session_v1";

/* ---------- hash de senha (demo) ---------- */

function hashPassword(pw: string): string {
  let h = 5381;
  const s = `saborflow::${pw}::salt-v1`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(36)}${s.length.toString(36)}`;
}

/* ---------- imagens de demonstração ---------- */

export const IMG = {
  hero: "https://image.qwenlm.ai/generated-images/e1c87aaa-12cb-4a93-8937-52ff98f76dc1/_result.png",
  tropeiro: "https://image.qwenlm.ai/generated-images/abd880c1-f884-43cd-a627-4ff4d34811e2/_result.png",
  frango: "https://image.qwenlm.ai/generated-images/1c492eba-3d69-4102-97fb-b9d94d0a11a4/_result.png",
  carnePanela: "https://image.qwenlm.ai/generated-images/ceb742e9-43df-477e-bd5c-1642b4d07dbb/_result.png",
  arroz: "https://image.qwenlm.ai/generated-images/753a1169-266a-4727-b61f-77edb50fd7c2/_result.png",
  salada: "https://image.qwenlm.ai/generated-images/1f77c9f1-a500-44ff-ab87-3f59f1553e6f/_result.png",
  macarrao: "https://image.qwenlm.ai/generated-images/b3cc8070-1d1b-4565-906e-3fda041a79cc/_result.png",
  pure: "https://image.qwenlm.ai/generated-images/d76ec915-b5c1-4a21-9cae-e44496d85379/_result.png",
  feijaoCarioca: "https://image.qwenlm.ai/generated-images/ffc6b405-a5d3-48ce-8d11-1f25d49deae2/_result.png",
};

export const DEMO_ACCOUNTS = [
  { label: "Super Admin (dono do SaaS)", email: "super@pksistem.com", password: "pk2024" },
  { label: "Negócio Pro (dona)", email: "demo@pksistem.com", password: "demo1234" },
  { label: "Negócio Pro (editor)", email: "editor@pksistem.com", password: "demo1234" },
  { label: "Negócio Starter", email: "maria@temperobom.com", password: "demo1234" },
  { label: "Negócio Grátis", email: "carlos@cantinho.com", password: "demo1234" },
];

/* ---------- modelos internos ---------- */

interface StoredUser extends User {
  passwordHash: string;
}

interface Session {
  userId: string;
  impersonatedBy?: string; // id do super admin (impersonação auditada)
  createdAt: string;
  expiresAt: string; // sessões expiram (7 dias)
}

interface ResetToken {
  token: string; // token COMPLETO (opaco) — nunca apenas o userId
  userId: string;
  expiresAt: string;
  used: boolean;
}

interface TenantDB {
  users: StoredUser[];
  tenants: Tenant[];
  members: TenantMember[];
  foods: Food[];
  menuItems: DailyMenuItem[];
  orders: Order[];
  customers: Customer[];
  audit: AuditLog[];
  analytics: AnalyticsEvent[];
  notifications: AppNotification[];
  seq: number;
  /** Configurações da plataforma (editadas pelo super admin). */
  platform?: PlatformSettings;
  /** Tokens de recuperação de senha: opacos, com expiração e uso único. */
  resetTokens?: ResetToken[];
  /** Proteção anti-brute-force: tentativas de login por e-mail. */
  loginFails?: Record<string, { count: number; until: string }>;
}

/* Sessão válida por 7 dias (renovada a cada login; expiração checada em getSession). */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function sessionExpiry(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

function defaultPlatform(): PlatformSettings {
  return {
    name: "PKSISTEM",
    tagline: "Seu negócio online, simples assim.",
    supportWhatsapp: "5563999990000",
    supportEmail: "contato@pksistem.com",
    instagram: "@pksistem",
    logoUrl: null,
    pkchatEnabled: true,
  };
}

/* ---------- helpers de data ---------- */

function daysAgoISO(n: number, h = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 15, 0, 0);
  return d.toISOString();
}

function daysFromNowISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function defaultSettings(name: string, slug: string, niche = "restaurante"): SiteSettings {
  const n = nicheById(niche);
  return {
    name,
    slug,
    description: "Feito na hora, com ingredientes frescos, todos os dias.",
    logoUrl: null,
    heroUrl: IMG.hero,
    whatsapp: "5563999990000",
    whatsappMessage: "Olá! Vim pelo site e gostaria de fazer um pedido.",
    address: "Av. Brasil, 123 — Centro",
    openingHours: "Seg a Sáb · 11h às 14h30",
    phone: "(63) 3215-0000",
    instagram: "",
    primaryColor: "#141411",
    secondaryColor: "#21211d",
    accentColor: "#efc426",
    ctaText: "Pedir pelo WhatsApp",
    headline: "O sabor que você conhece, agora online.",
    theme: n.defaultTheme,
    sections: { hero: true, menu: true, marmita: true, info: true },
    published: true,
    niche: n.id,
    categories: [...n.categories],
    menuMode: "diario",
    fixedFoodIds: [],
    autoWeeklyMenu: false,
    weeklyTemplate: {},
    headerTagline: "Cardápio digital & pedidos",
    heroSubtitle: "",
    menuEyebrow: "Direto da cozinha",
    menuTitle: "Cardápio de hoje",
    marmitaEyebrow: "Quer fazer um pedido?",
    marmitaTitle: "Monte seu pedido e envie pelo WhatsApp.",
    marmitaSubtitle: "Sem cadastro, sem complicação: escolha os itens e a gente confirma na hora.",
    marmitaButtonText: "Montar meu pedido",
    orderPageTitle: "Monte seu pedido",
    orderPageSubtitle: "Toque para adicionar os itens e envie tudo pelo WhatsApp.",
    footerText: "",
  };
}

/* ---------- seed ---------- */

function seed(): TenantDB {
  const t1 = "t-sabor-da-casa";
  const t2 = "t-tempero-bom";
  const t3 = "t-cantinho";

  const users: StoredUser[] = [
    { id: "u-super", email: "super@pksistem.com", passwordHash: hashPassword("pk2024"), name: "Rafael Teixeira", isSuperAdmin: true, createdAt: daysAgoISO(120), lastLoginAt: daysAgoISO(0, 8) },
    { id: "u-dani", email: "demo@pksistem.com", passwordHash: hashPassword("demo1234"), name: "Daniela Oliveira", isSuperAdmin: false, createdAt: daysAgoISO(60), lastLoginAt: daysAgoISO(0, 7) },
    { id: "u-editor", email: "editor@pksistem.com", passwordHash: hashPassword("demo1234"), name: "Pedro Santos", isSuperAdmin: false, createdAt: daysAgoISO(30), lastLoginAt: daysAgoISO(1, 18) },
    { id: "u-maria", email: "maria@temperobom.com", passwordHash: hashPassword("demo1234"), name: "Maria Souza", isSuperAdmin: false, createdAt: daysAgoISO(9), lastLoginAt: daysAgoISO(0, 9) },
    { id: "u-carlos", email: "carlos@cantinho.com", passwordHash: hashPassword("demo1234"), name: "Carlos Lima", isSuperAdmin: false, createdAt: daysAgoISO(40), lastLoginAt: daysAgoISO(2, 11) },
  ];

  const tenants: Tenant[] = [
    {
      id: t1, name: "Restaurante Sabor da Casa", slug: "sabor-da-casa", planId: "pro", status: "active",
      trialEndsAt: null, createdAt: daysAgoISO(60), lastActivityAt: daysAgoISO(0, 9), onboardingCompleted: true,
      settings: {
        ...defaultSettings("Restaurante Sabor da Casa", "sabor-da-casa"),
        whatsapp: "5563999110101",
        address: "Rua das Palmeiras, 210 — Centro, Palmas/TO",
        openingHours: "Seg a Sáb · 11h às 14h30",
        instagram: "@sabordacasa",
        heroUrl: IMG.hero,
        headline: "Comida de verdade, feita na hora.",
      },
    },
    {
      id: t2, name: "Tempero Bom", slug: "tempero-bom", planId: "starter", status: "trialing",
      trialEndsAt: daysFromNowISO(5), createdAt: daysAgoISO(9), lastActivityAt: daysAgoISO(0, 10), onboardingCompleted: true,
      settings: {
        ...defaultSettings("Tempero Bom", "tempero-bom"),
        whatsapp: "5563999220202",
        address: "Av. Goiás, 88 — Setor Sul, Goiânia/GO",
        openingHours: "Seg a Sex · 11h às 14h",
        instagram: "@temperobom",
        primaryColor: "#7a2e2e",
        secondaryColor: "#3f1e1e",
        accentColor: "#f4d352",
        headline: "O tempero que abraça.",
        theme: "bold",
      },
    },
    {
      id: t3, name: "Cantinho da Mamãe", slug: "cantinho-da-mama", planId: "free", status: "active",
      trialEndsAt: null, createdAt: daysAgoISO(40), lastActivityAt: daysAgoISO(1, 15), onboardingCompleted: true,
      settings: {
        ...defaultSettings("Cantinho da Mamãe", "cantinho-da-mama"),
        whatsapp: "5563999330303",
        address: "Rua 7 de Setembro, 45 — Centro, Araguaína/TO",
        openingHours: "Ter a Dom · 11h às 15h",
        primaryColor: "#8f5e0d",
        secondaryColor: "#6b460c",
        headline: "Feito com carinho de mãe.",
        theme: "elegante",
        heroUrl: IMG.pure,
      },
    },
  ];

  const members: TenantMember[] = [
    { id: "m-1", tenantId: t1, userId: "u-dani", role: "owner", createdAt: daysAgoISO(60) },
    { id: "m-2", tenantId: t1, userId: "u-editor", role: "editor", createdAt: daysAgoISO(30) },
    { id: "m-3", tenantId: t2, userId: "u-maria", role: "owner", createdAt: daysAgoISO(9) },
    { id: "m-4", tenantId: t3, userId: "u-carlos", role: "owner", createdAt: daysAgoISO(40) },
  ];

  const mkFood = (id: string, tenantId: string, name: string, category: Food["category"], days: number, imageUrl: string | null, description: string | null = null, price: number | null = null, extras: Food["extras"] = []): Food => ({
    id, tenantId, name, category, description, price, imageUrl, availability: "disponivel", active: true, extras, createdAt: daysAgoISO(days),
  });

  const foods: Food[] = [
    mkFood("f1-tropeiro", t1, "Feijão tropeiro", "Acompanhamentos", 21, IMG.tropeiro, "Feijão com farofa, bacon e cheiro-verde"),
    mkFood("f1-frango", t1, "Frango assado", "Carnes", 20, IMG.frango, "Assado na casa, com limão e ervas"),
    mkFood("f1-carne", t1, "Carne de panela", "Carnes", 19, IMG.carnePanela, "Cozida lentamente com legumes"),
    mkFood("f1-arroz", t1, "Arroz branco", "Acompanhamentos", 18, IMG.arroz, "Soltinho, feito na hora"),
    mkFood("f1-carioca", t1, "Feijão carioca", "Acompanhamentos", 17, IMG.feijaoCarioca, "O clássico de todo dia"),
    mkFood("f1-salada", t1, "Salada tropical", "Saladas", 15, IMG.salada, "Folhas, manga, tomate-cereja e palmito"),
    mkFood("f1-macarrao", t1, "Macarrão ao molho", "Massas", 12, IMG.macarrao, "Molho de tomate caseiro com manjericão"),
    mkFood("f1-pure", t1, "Purê de batata", "Acompanhamentos", 10, IMG.pure, "Cremoso, com manteiga"),
    mkFood("f1-pudim", t1, "Pudim de leite", "Sobremesas", 8, null, "Receita da vó, com calda de caramelo", 8),
    mkFood("f1-farofa", t1, "Farofa crocante", "Acompanhamentos", 5, null, "Com banana e castanhas"),
    mkFood("f1-bife", t1, "Bife acebolado", "Carnes", 3, null, "Na chapa, com cebolas douradas"),
    mkFood("f1-vina", t1, "Vinagrete da casa", "Saladas", 2, null, "Tomate, cebola, pimentão e coentro"),

    mkFood("f2-frango", t2, "Frango grelhado", "Carnes", 8, IMG.frango, "Grelhado na brasa"),
    mkFood("f2-arroz", t2, "Arroz branco", "Acompanhamentos", 8, IMG.arroz),
    mkFood("f2-feijao", t2, "Feijão carioca", "Acompanhamentos", 7, IMG.feijaoCarioca),
    mkFood("f2-salada", t2, "Salada da casa", "Saladas", 6, IMG.salada),
    mkFood("f2-carne", t2, "Carne assada", "Carnes", 5, IMG.carnePanela, "Ao forno com batatas"),
    mkFood("f2-pudim", t2, "Pudim", "Sobremesas", 3, null, null, 7),

    mkFood("f3-arroz", t3, "Arroz branco", "Acompanhamentos", 30, IMG.arroz),
    mkFood("f3-feijao", t3, "Feijão tropeiro", "Acompanhamentos", 29, IMG.tropeiro),
    mkFood("f3-frango", t3, "Frango assado", "Carnes", 28, IMG.frango),
    mkFood("f3-carne", t3, "Carne de panela", "Carnes", 26, IMG.carnePanela),
    mkFood("f3-salada", t3, "Salada verde", "Saladas", 24, IMG.salada),
    mkFood("f3-macarrao", t3, "Macarrão ao sugo", "Massas", 20, IMG.macarrao),
    mkFood("f3-pure", t3, "Purê de batata", "Acompanhamentos", 18, IMG.pure),
    mkFood("f3-bife", t3, "Bife à rolê", "Carnes", 10, null),
    mkFood("f3-doce", t3, "Doce de leite", "Sobremesas", 6, null, "Caseiro, de colher", 6),
  ];

  const today = todayISO();
  const tomorrow = daysFromNowISO(1);
  const mkItem = (tenantId: string, foodId: string, date: string): DailyMenuItem => ({
    id: uid(), tenantId, foodId, menuDate: date, createdAt: daysAgoISO(0, 7),
  });

  const menuItems: DailyMenuItem[] = [
    mkItem(t1, "f1-frango", today), mkItem(t1, "f1-carne", today), mkItem(t1, "f1-bife", today),
    mkItem(t1, "f1-arroz", today), mkItem(t1, "f1-tropeiro", today), mkItem(t1, "f1-carioca", today),
    mkItem(t1, "f1-salada", today), mkItem(t1, "f1-macarrao", today), mkItem(t1, "f1-pure", today),
    mkItem(t1, "f1-frango", tomorrow), mkItem(t1, "f1-arroz", tomorrow), mkItem(t1, "f1-feijao-carioca", tomorrow), mkItem(t1, "f1-salada", tomorrow),
    mkItem(t2, "f2-frango", today), mkItem(t2, "f2-arroz", today), mkItem(t2, "f2-feijao", today), mkItem(t2, "f2-salada", today),
    mkItem(t3, "f3-frango", today), mkItem(t3, "f3-arroz", today), mkItem(t3, "f3-feijao", today), mkItem(t3, "f3-salada", today), mkItem(t3, "f3-pure", today),
  ];
  // corrige referência do tropeiro no agendamento de amanhã (t1)
  menuItems[11].foodId = "f1-tropeiro";

  const customers: Customer[] = [
    { id: "c-1", tenantId: t1, name: "João Silva", phone: "(63) 99911-0101", email: "joao.silva@email.com", createdAt: daysAgoISO(50) },
    { id: "c-2", tenantId: t1, name: "Maria Aparecida", phone: "(63) 99922-0202", email: "maria.ap@email.com", createdAt: daysAgoISO(40) },
    { id: "c-3", tenantId: t1, name: "Carlos Eduardo", phone: "(63) 99933-0303", email: "", createdAt: daysAgoISO(25) },
    { id: "c-4", tenantId: t1, name: "Ana Beatriz", phone: "(63) 99944-0404", email: "ana.bea@email.com", createdAt: daysAgoISO(10) },
    { id: "c-5", tenantId: t2, name: "Roberto Dias", phone: "(62) 98811-1111", email: "", createdAt: daysAgoISO(6) },
    { id: "c-6", tenantId: t2, name: "Fernanda Alves", phone: "(62) 98822-2222", email: "fer.alves@email.com", createdAt: daysAgoISO(3) },
  ];

  let n = 100;
  const mkOrder = (tenantId: string, customerId: string | null, size: string, protein: string, sides: string[], status: OrderStatus, days: number, h: number, observation: string | null = null): Order => {
    const cust = customers.find((c) => c.id === customerId) ?? null;
    n += 1;
    return {
      id: uid(), number: n, tenantId, customerId,
      customerName: cust?.name ?? "Cliente balcão", customerPhone: cust?.phone ?? null,
      size, protein, sides, observation, payment: n % 3 === 0 ? "Dinheiro" : "Pix",
      status, createdAt: daysAgoISO(days, h),
    };
  };

  const orders: Order[] = [
    mkOrder(t1, "c-1", "Grande", "Frango assado", ["Arroz branco", "Feijão tropeiro", "Salada tropical"], "entregue", 0, 11),
    mkOrder(t1, "c-2", "Média", "Carne de panela", ["Arroz branco", "Purê de batata"], "pronta", 0, 11, "Sem cebola, por favor"),
    mkOrder(t1, "c-3", "Grande", "Bife acebolado", ["Arroz branco", "Feijão carioca", "Vinagrete da casa", "Farofa crocante"], "preparando", 0, 12),
    mkOrder(t1, null, "Média", "Frango assado", ["Arroz branco", "Macarrão ao molho"], "pendente", 0, 12, "Molho à parte"),
    mkOrder(t1, "c-4", "Pequena", "Carne de panela", ["Arroz branco", "Salada tropical"], "pendente", 0, 12),
    mkOrder(t1, "c-1", "Grande", "Frango assado", ["Arroz branco", "Feijão tropeiro"], "entregue", 1, 12),
    mkOrder(t1, "c-2", "Média", "Bife acebolado", ["Arroz branco", "Feijão carioca"], "entregue", 1, 13),
    mkOrder(t1, "c-3", "Grande", "Carne de panela", ["Arroz branco", "Purê de batata", "Salada tropical"], "entregue", 2, 12),
    mkOrder(t2, "c-5", "Média", "Frango grelhado", ["Arroz branco", "Feijão carioca"], "preparando", 0, 12),
    mkOrder(t2, "c-6", "Grande", "Carne assada", ["Arroz branco", "Salada da casa"], "pendente", 0, 12),
    mkOrder(t3, null, "Média", "Frango assado", ["Arroz branco", "Feijão tropeiro"], "entregue", 1, 12),
  ];

  const audit: AuditLog[] = [
    { id: uid(), actorId: "u-super", actorEmail: "super@saborflow.com", tenantId: null, action: "platform.login", resource: "auth", result: "ok", createdAt: daysAgoISO(0, 8) },
    { id: uid(), actorId: "u-dani", actorEmail: "demo@saborflow.com", tenantId: t1, action: "tenant.login", resource: "auth", result: "ok", createdAt: daysAgoISO(0, 7) },
    { id: uid(), actorId: "u-dani", actorEmail: "demo@saborflow.com", tenantId: t1, action: "menu.publish", resource: "daily_menu", result: "ok", metadata: { date: today }, createdAt: daysAgoISO(0, 7) },
    { id: uid(), actorId: "u-maria", actorEmail: "maria@temperobom.com", tenantId: t2, action: "tenant.created", resource: "tenant", result: "ok", createdAt: daysAgoISO(9) },
    { id: uid(), actorId: "u-super", actorEmail: "super@saborflow.com", tenantId: t2, action: "subscription.plan_changed", resource: "subscription", result: "ok", metadata: { to: "starter" }, createdAt: daysAgoISO(9) },
  ];

  const analytics: AnalyticsEvent[] = [];
  const kinds: AnalyticsKind[] = ["site_view", "site_view", "site_view", "menu_view", "menu_view", "dish_view", "whatsapp_click", "order_started"];
  const dishes = ["Frango assado", "Carne de panela", "Feijão tropeiro", "Salada tropical"];
  for (let d = 13; d >= 0; d--) {
    const count = 3 + ((d * 7) % 6);
    for (let i = 0; i < count; i++) {
      const kind = kinds[(d + i) % kinds.length];
      analytics.push({
        id: uid(), tenantId: t1, kind,
        label: kind === "dish_view" ? dishes[(d + i) % dishes.length] : undefined,
        createdAt: daysAgoISO(d, 10 + ((i * 3) % 8)),
      });
    }
  }
  for (let i = 0; i < 14; i++) {
    analytics.push({ id: uid(), tenantId: t2, kind: i % 2 ? "site_view" : "menu_view", createdAt: daysAgoISO(i % 7, 11) });
  }

  const notifications: AppNotification[] = [
    { id: uid(), tenantId: t1, title: "Cardápio de hoje publicado", body: "9 itens disponíveis para seus clientes.", read: false, createdAt: daysAgoISO(0, 7) },
    { id: uid(), tenantId: t1, title: "Novo pedido recebido", body: "Pedido #104 está pendente de confirmação.", read: false, createdAt: daysAgoISO(0, 12) },
    { id: uid(), tenantId: t2, title: "Seu trial termina em 5 dias", body: "Assine o plano Starter para não perder recursos.", read: false, createdAt: daysAgoISO(0, 8) },
    { id: uid(), tenantId: null, title: "Novo tenant cadastrado", body: "Tempero Bom entrou em trial há 9 dias.", read: true, createdAt: daysAgoISO(9) },
  ];

  return { users, tenants, members, foods, menuItems, orders, customers, audit, analytics, notifications, seq: n };
}

/* ---------- persistência ---------- */

let cache: TenantDB | null = null;

/** Migra dados antigos persistidos para o formato atual (novos campos com padrão). */
function migrate(db: TenantDB): TenantDB {
  db.tenants?.forEach((t) => {
    t.settings = { ...defaultSettings(t.name, t.slug, t.settings?.niche), ...t.settings } as SiteSettings;
    if (!t.clientRetention) t.clientRetention = { mode: "manual", days: 0 };
  });
  db.foods?.forEach((f) => {
    if (!Array.isArray(f.extras)) f.extras = [];
  });
  db.customers?.forEach((c) => {
    if (typeof c.email !== "string") c.email = "";
  });
  return db;
}

function loadDB(): TenantDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      cache = migrate(JSON.parse(raw) as TenantDB);
      return cache;
    }
  } catch {
    /* dados corrompidos → recria */
  }
  cache = seed();
  saveDB();
  return cache;
}

function saveDB() {
  if (!cache) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    throw new Error("Não foi possível salvar no armazenamento local do navegador.");
  }
}

export function resetDemoData() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  cache = null;
}

const lag = () => sleep(240 + Math.random() * 260);

/* ---------- sessão ---------- */

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    // Sessão expirada → descartada (o usuário precisa entrar de novo).
    if (!s.expiresAt || new Date(s.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function setSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

function requireUser(): StoredUser {
  const s = getSession();
  const user = s ? loadDB().users.find((u) => u.id === s.userId) : null;
  if (!user) throw new Error("Sessão expirada. Entre novamente para continuar.");
  return user;
}

/* ---------- auditoria ---------- */

function audit(action: string, resource: string, result: AuditLog["result"], opts?: { actor?: StoredUser | null; tenantId?: string | null; metadata?: Record<string, string> }) {
  const db = loadDB();
  const s = getSession();
  const actor = opts?.actor !== undefined ? opts.actor : s ? db.users.find((u) => u.id === s.userId) ?? null : null;
  db.audit.unshift({
    id: uid(),
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? "anônimo",
    tenantId: opts?.tenantId ?? null,
    action,
    resource,
    result,
    metadata: opts?.metadata,
    createdAt: new Date().toISOString(),
  });
  if (db.audit.length > 400) db.audit.length = 400;
  saveDB();
}

/* ---------- guardas de tenant (isolamento + RBAC) ---------- */

interface MemberCtx {
  user: StoredUser;
  tenant: Tenant;
  role: Role;
}

function requireMember(tenantId: string): MemberCtx {
  const user = requireUser();
  const db = loadDB();
  const member = db.members.find((m) => m.tenantId === tenantId && m.userId === user.id);
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!member || !tenant) {
    audit("tenant.access_denied", "tenant", "denied", { actor: user, tenantId });
    throw new Error("Você não tem permissão para acessar este restaurante.");
  }
  if (tenant.status === "suspended" || tenant.status === "pending_deletion") {
    throw new Error("Esta conta está suspensa. Entre em contato com o suporte PKSISTEM.");
  }
  return { user, tenant, role: member.role };
}

function requirePermission(tenantId: string, permission: Permission): MemberCtx {
  const ctx = requireMember(tenantId);
  if (!can(ctx.role, permission)) {
    audit("permission.denied", permission, "denied", { actor: ctx.user, tenantId });
    throw new Error("Seu papel não permite esta ação. Fale com o dono do restaurante.");
  }
  return ctx;
}

function requireSuper(): StoredUser {
  const user = requireUser();
  if (!user.isSuperAdmin) {
    audit("super.access_denied", "platform", "denied", { actor: user });
    throw new Error("Acesso restrito à administração da plataforma.");
  }
  return user;
}

/** Valida que o registro pertence ao tenant da sessão (anti-IDOR). */
function assertTenantRecord<T extends { tenantId: string }>(record: T | undefined, tenantId: string, what: string): T {
  if (!record || record.tenantId !== tenantId) {
    audit("idor.blocked", what, "denied", { tenantId });
    throw new Error("Registro não encontrado neste restaurante.");
  }
  return record;
}

function toUser(u: StoredUser): User {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

/* ================= AUTH API ================= */

/* Anti-brute-force: após 5 falhas, o e-mail fica bloqueado por 60s.
 * (Em produção com Supabase Auth, o rate limiting é do provedor + Edge Function.) */
const MAX_LOGIN_FAILS = 5;
const LOCK_MS = 60 * 1000;

export const tenantAuth = {
  async signIn(email: string, password: string): Promise<User> {
    await lag();
    const db = loadDB();
    const key = email.trim().toLowerCase();
    db.loginFails = db.loginFails ?? {};
    const fail = db.loginFails[key];
    if (fail && fail.count >= MAX_LOGIN_FAILS && new Date(fail.until).getTime() > Date.now()) {
      audit("auth.login_locked", "auth", "denied", { metadata: { email: key } });
      throw new Error("Muitas tentativas. Aguarde 1 minuto e tente novamente.");
    }
    const user = db.users.find((u) => u.email.toLowerCase() === key);
    const ok = user && user.passwordHash === hashPassword(password);
    if (!ok) {
      const count = (fail && new Date(fail.until).getTime() > Date.now() ? fail.count : 0) + 1;
      db.loginFails[key] = { count, until: new Date(Date.now() + LOCK_MS).toISOString() };
      saveDB();
      audit("auth.login_failed", "auth", "denied", { metadata: { email: key } });
      // Mensagem genérica de propósito (anti-enumeração de contas).
      throw new Error("Não foi possível entrar. Verifique seu e-mail e senha.");
    }
    delete db.loginFails[key];
    user.lastLoginAt = new Date().toISOString();
    setSession({ userId: user.id, createdAt: new Date().toISOString(), expiresAt: sessionExpiry() });
    saveDB();
    audit(user.isSuperAdmin ? "platform.login" : "tenant.login", "auth", "ok", { actor: user });
    return toUser(user);
  },

  /** Cadastro cria usuário + tenant + vínculo owner + trial (multi-tenant desde o nascimento). */
  async signUp(input: {
    name: string;
    email: string;
    password: string;
    restaurantName: string;
    slug: string;
    whatsapp?: string;
    niche?: string;
    categories?: string[];
  }): Promise<User> {
    await lag();
    const db = loadDB();
    if (db.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error("Este e-mail já está em uso. Tente entrar ou recuperar a senha.");
    }
    const slug = slugify(input.slug || input.restaurantName);
    if (!slug || db.tenants.some((t) => t.slug === slug)) {
      throw new Error("Este endereço de site já está em uso. Escolha outro.");
    }
    // Número de WhatsApp já cadastrado por outro negócio?
    const wa = (input.whatsapp ?? "").replace(/\D/g, "");
    if (wa && db.tenants.some((t) => t.settings.whatsapp.replace(/\D/g, "") === wa)) {
      throw new Error("Este número de WhatsApp já está em uso por outro negócio no PKSISTEM. Se for seu, fale com o suporte.");
    }
    const userId = uid();
    const tenantId = uid();
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: userId, email: input.email.trim().toLowerCase(), passwordHash: hashPassword(input.password),
      name: input.name.trim(), isSuperAdmin: false, createdAt: now, lastLoginAt: now,
    };
    const tenant: Tenant = {
      id: tenantId, name: input.restaurantName.trim(), slug, planId: "pro", status: "trialing",
      trialEndsAt: daysFromNowISO(14), createdAt: now, lastActivityAt: now, onboardingCompleted: false,
      settings: (() => {
        const s = { ...defaultSettings(input.restaurantName.trim(), slug, input.niche || "restaurante"), published: false };
        if (wa) s.whatsapp = wa;
        if (input.categories?.length) s.categories = [...input.categories];
        return s;
      })(),
    };
    db.users.push(user);
    db.tenants.push(tenant);
    db.members.push({ id: uid(), tenantId, userId, role: "owner", createdAt: now });
    db.notifications.push({
      id: uid(), tenantId, title: "Bem-vindo ao PKSISTEM! 🎉",
      body: "Seu trial do plano Pro começou. Você tem 14 dias para testar tudo.", read: false, createdAt: now,
    });
    setSession({ userId, createdAt: now, expiresAt: sessionExpiry() });
    saveDB();
    audit("tenant.created", "tenant", "ok", { actor: user, tenantId, metadata: { plan: "pro (trial)" } });
    return toUser(user);
  },

  async signOut(): Promise<void> {
    const s = getSession();
    if (s?.impersonatedBy) {
      const db = loadDB();
      const admin = db.users.find((u) => u.id === s.impersonatedBy);
      audit("impersonation.ended", "tenant", "ok", { actor: admin ?? null, tenantId: null });
    }
    setSession(null);
  },

  async getSessionUser(): Promise<User | null> {
    await sleep(120);
    const s = getSession();
    if (!s) return null;
    const user = loadDB().users.find((u) => u.id === s.userId);
    return user ? toUser(user) : null;
  },

  isImpersonating(): boolean {
    return Boolean(getSession()?.impersonatedBy);
  },

  /** Vínculo do usuário com tenant — derivado da sessão. Super admin não tem tenant. */
  async getMembership(): Promise<Membership | null> {
    const s = getSession();
    if (!s) return null;
    const db = loadDB();
    const user = db.users.find((u) => u.id === s.userId);
    if (!user || user.isSuperAdmin) return null;
    const member = db.members.find((m) => m.userId === user.id);
    const tenant = member ? db.tenants.find((t) => t.id === member.tenantId) : null;
    if (!member || !tenant) return null;
    return { user: toUser(user), tenant: { ...tenant }, role: member.role };
  },

  /**
   * Recuperação de senha.
   * SEGURANÇA: o token é OPACO (aleatório), armazenado no banco, validado por
   * igualdade integral, com expiração (30 min) e USO ÚNICO. O userId nunca é
   * aceito sozinho — forjar "userId.qualquercoisa" não funciona.
   * (Demo: o token é exibido na tela porque não há e-mail; em produção ele
   * chega SOMENTE por e-mail via Supabase Auth / Edge Function.)
   */
  async requestPasswordReset(email: string): Promise<{ demoResetToken: string }> {
    await lag();
    const db = loadDB();
    db.resetTokens = db.resetTokens ?? [];
    const key = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === key);
    // Anti-enumeração: resposta idêntica exista ou não o e-mail.
    if (!user) {
      audit("auth.password_reset_requested", "auth", "ok", { metadata: { found: "false" } });
      return { demoResetToken: "noop" };
    }
    // Invalida tokens anteriores deste usuário (só o último vale).
    db.resetTokens.forEach((t) => {
      if (t.userId === user.id) t.used = true;
    });
    const token = `${uid()}${uid()}`.replace(/-/g, "");
    db.resetTokens.push({
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      used: false,
    });
    saveDB();
    audit("auth.password_reset_requested", "auth", "ok", { metadata: { found: "true" } });
    return { demoResetToken: token };
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await lag();
    const db = loadDB();
    db.resetTokens = db.resetTokens ?? [];
    // Validação do token COMPLETO contra o armazenamento (nunca só o prefixo).
    const stored = db.resetTokens.find((t) => t.token === token && !t.used);
    const invalid =
      !stored ||
      token === "noop" ||
      new Date(stored.expiresAt).getTime() < Date.now();
    if (invalid || newPassword.length < 8) {
      audit("auth.password_reset_denied", "auth", "denied", {});
      throw new Error("Link de recuperação inválido ou expirado. Solicite um novo.");
    }
    const user = db.users.find((u) => u.id === stored.userId);
    if (!user) throw new Error("Link de recuperação inválido ou expirado. Solicite um novo.");
    // Uso único: o token é consumido agora.
    stored.used = true;
    user.passwordHash = hashPassword(newPassword);
    saveDB();
    audit("auth.password_reset", "auth", "ok", { actor: user });
  },
};

/* ================= SUPER ADMIN ================= */

export const superApi = {
  /* ---- configurações da plataforma ---- */

  async getPlatform(): Promise<PlatformSettings> {
    requireSuper();
    await lag();
    return { ...(loadDB().platform ?? defaultPlatform()) };
  },

  async updatePlatform(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    requireSuper();
    await lag();
    const db = loadDB();
    db.platform = { ...(db.platform ?? defaultPlatform()), ...patch };
    saveDB();
    audit("platform.updated", "platform", "ok", {});
    return { ...db.platform };
  },

  async overview() {
    requireSuper();
    await lag();
    const db = loadDB();
    const active = db.tenants.filter((t) => t.status === "active" || t.status === "trialing");
    const mrr = db.tenants.reduce((acc, t) => {
      if (t.status === "suspended" || t.status === "canceled" || t.status === "pending_deletion") return acc;
      return acc + getPlan(t.planId).priceMonthly;
    }, 0);
    return {
      tenantsTotal: db.tenants.length,
      tenantsActive: active.length,
      trials: db.tenants.filter((t) => t.status === "trialing").length,
      suspended: db.tenants.filter((t) => t.status === "suspended").length,
      mrr,
      arr: mrr * 12,
      usersTotal: db.users.filter((u) => !u.isSuperAdmin).length,
      ordersTotal: db.orders.length,
      eventsTotal: db.analytics.length,
      recentSignups: [...db.tenants].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((t) => ({
        id: t.id, name: t.name, slug: t.slug, planId: t.planId, status: t.status, createdAt: t.createdAt,
      })),
    };
  },

  async listTenants(): Promise<Array<Tenant & { ownerName: string; ownerEmail: string; usage: Usage }>> {
    requireSuper();
    await lag();
    const db = loadDB();
    return db.tenants.map((t) => {
      const ownerMember = db.members.find((m) => m.tenantId === t.id && m.role === "owner");
      const owner = ownerMember ? db.users.find((u) => u.id === ownerMember.userId) : null;
      return { ...t, ownerName: owner?.name ?? "—", ownerEmail: owner?.email ?? "—", usage: computeUsage(t.id) };
    });
  },

  async setTenantStatus(tenantId: string, status: Tenant["status"], reason?: string): Promise<Tenant> {
    const admin = requireSuper();
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant não encontrado.");
    tenant.status = status;
    saveDB();
    audit(status === "suspended" ? "tenant.suspended" : "tenant.reactivated", "tenant", "ok", {
      actor: admin, tenantId, metadata: reason ? { reason } : undefined,
    });
    return { ...tenant };
  },

  async setTenantPlan(tenantId: string, planId: string): Promise<Tenant> {
    const admin = requireSuper();
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant não encontrado.");
    const from = tenant.planId;
    tenant.planId = planId;
    if (tenant.status === "trialing") tenant.status = "active";
    saveDB();
    audit("subscription.plan_changed", "subscription", "ok", { actor: admin, tenantId, metadata: { from, to: planId } });
    return { ...tenant };
  },

  /** Impersonação auditada: o super admin entra como o tenant, com registro e banner. */
  async impersonate(tenantId: string): Promise<Membership> {
    const admin = requireSuper();
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.id === tenantId);
    const member = db.members.find((m) => m.tenantId === tenantId);
    if (!tenant || !member) throw new Error("Tenant não encontrado.");
    setSession({ userId: member.userId, impersonatedBy: admin.id, createdAt: new Date().toISOString(), expiresAt: sessionExpiry() });
    const user = db.users.find((u) => u.id === member.userId);
    audit("impersonation.started", "tenant", "ok", { actor: admin, tenantId, metadata: { as: user?.email ?? "" } });
    return { user: toUser(user as StoredUser), tenant: { ...tenant }, role: member.role };
  },

  async listAudit(limit = 60): Promise<AuditLog[]> {
    requireSuper();
    await lag();
    return loadDB().audit.slice(0, limit);
  },

  async listNotifications(): Promise<AppNotification[]> {
    requireSuper();
    await lag();
    return loadDB().notifications.filter((nt) => nt.tenantId === null);
  },
};

/* ================= USO / LIMITES ================= */

function computeUsage(tenantId: string): Usage {
  const db = loadDB();
  const foods = db.foods.filter((f) => f.tenantId === tenantId);
  const withImage = foods.filter((f) => Boolean(f.imageUrl)).length;
  const categories = new Set(foods.map((f) => f.category)).size;
  const users = db.members.filter((m) => m.tenantId === tenantId).length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyViews = db.analytics.filter(
    (a) => a.tenantId === tenantId && a.kind === "site_view" && new Date(a.createdAt) >= monthStart,
  ).length;
  return {
    products: foods.length,
    categories,
    users,
    storageMb: Math.round(withImage * 0.8 * 10) / 10,
    monthlyViews,
  };
}

/* ---------- resolução de cardápio (diário / fixo / semanal automático) ---------- */

function resolveMenuItems(db: TenantDB, tenant: Tenant, dateISO: string): DailyMenuItem[] {
  const s = tenant.settings;
  // 1) Cardápio FIXO: os mesmos produtos sempre visíveis, sem data.
  if (s.menuMode === "fixo") {
    return (s.fixedFoodIds ?? [])
      .map((fid) => db.foods.find((f) => f.id === fid && f.tenantId === tenant.id))
      .filter((f): f is Food => Boolean(f))
      .map((food) => ({
        id: `fixed-${food.id}`, tenantId: tenant.id, foodId: food.id,
        menuDate: dateISO, createdAt: food.createdAt, food,
      }));
  }
  // 2) Cardápio do dia montado manualmente.
  // IMPORTANTE: db.menuItems guarda itens SEM o objeto food; é preciso fazer o
  // join aqui (como listMenu faz), senão o mini-site não renderiza nada e o
  // recálculo de preços do pedido público falha. Itens cujo food foi excluído
  // são descartados (integridade referencial).
  const manual = db.menuItems
    .filter((m) => m.tenantId === tenant.id && m.menuDate === dateISO)
    .map((m) => ({ ...m, food: db.foods.find((f) => f.id === m.foodId && f.tenantId === tenant.id) }))
    .filter((m): m is DailyMenuItem & { food: Food } => Boolean(m.food));
  if (manual.length > 0 || !s.autoWeeklyMenu) return manual;
  // 3) Cardápio automático da semana (template por dia da semana).
  const dow = String(parseISO(dateISO).getDay());
  const ids = s.weeklyTemplate?.[dow] ?? [];
  return ids
    .map((fid) => db.foods.find((f) => f.id === fid && f.tenantId === tenant.id))
    .filter((f): f is Food => Boolean(f))
    .map((food) => ({
      id: `wk-${dow}-${food.id}`, tenantId: tenant.id, foodId: food.id,
      menuDate: dateISO, createdAt: food.createdAt, food,
    }));
}

/* ================= API DO TENANT ================= */

export const tenantApi = {
  /* ---- público (mini-site) ---- */

  async getPublicSite(slug: string): Promise<{ tenant: Tenant; items: DailyMenuItem[] } | null> {
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.slug === slugify(slug));
    if (!tenant) return null;
    // SANITIZAÇÃO: o mini-site público recebe APENAS os campos necessários à
    // exibição. Dados internos (retenção de clientes, status, onboarding, etc.)
    // nunca chegam ao navegador do visitante.
    const publicTenant: Tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      planId: "free", // plano é informação interna; o visitante não precisa saber
      status: tenant.status,
      trialEndsAt: null,
      createdAt: tenant.createdAt,
      lastActivityAt: tenant.lastActivityAt,
      onboardingCompleted: true,
      clientRetention: { mode: "manual", days: 0 },
      settings: { ...tenant.settings },
    };
    if (tenant.status === "suspended" || tenant.status === "pending_deletion") {
      return { tenant: publicTenant, items: [] }; // página pública avisa indisponibilidade
    }
    if (!tenant.settings.published) return { tenant: publicTenant, items: [] };
    const items = resolveMenuItems(db, tenant, todayISO()).filter(
      (m) => m.food && m.food.availability !== "oculto",
    );
    return { tenant: publicTenant, items };
  },

  async getPublicMenu(slug: string, date: string): Promise<DailyMenuItem[]> {
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.slug === slugify(slug));
    if (!tenant || !tenant.settings.published) return [];
    return resolveMenuItems(db, tenant, date).filter((m) => m.food && m.food.availability !== "oculto");
  },

  /** Configurações públicas da plataforma (contato do suporte, marca). */
  async getPlatformPublic(): Promise<PlatformSettings> {
    const db = loadDB();
    return { ...(db.platform ?? defaultPlatform()) };
  },

  /**
   * Pedido PÚBLICO vindo do mini-site. O tenant é derivado do slug validado
   * (nunca de um id enviado pelo cliente). Registra o pedido E o cliente no
   * sistema antes de o site abrir o WhatsApp — assim as abas Pedidos/Clientes
   * do painel são povoadas de verdade.
   */
  async placePublicOrder(
    slug: string,
    input: { customerName: string; customerPhone?: string | null; customerEmail?: string | null; items: OrderItemLine[]; observation?: string | null },
  ): Promise<Order> {
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.slug === slugify(slug));
    if (!tenant) throw new Error("Restaurante não encontrado.");
    if (tenant.status === "suspended" || tenant.status === "pending_deletion")
      throw new Error("Este restaurante está temporariamente indisponível.");
    if (!tenant.settings.published) throw new Error("O cardápio ainda não foi publicado.");
    if (!hasFeature(tenant, "whatsapp_orders")) throw new Error("Pedidos pelo site estão desativados neste plano.");

    /* ---- Endurecimento de entrada (anti-spam / anti-flood) ---- */
    if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("Adicione ao menos um item ao pedido.");
    if (input.items.length > 40) throw new Error("O pedido pode ter no máximo 40 itens.");
    const menu = resolveMenuItems(db, tenant, todayISO());
    const validItems = input.items
      .filter((i) => typeof i?.name === "string" && i.name.trim().length > 0)
      .slice(0, 40)
      .map((i) => {
        const qty = Math.min(99, Math.max(1, Math.floor(Number(i.qty) || 1)));
        // O PREÇO vem do cardápio do tenant (server-side) — o cliente não manipula valores.
        const food = menu.find((m) => m.food?.name === i.name.trim())?.food ?? null;
        return { name: i.name.trim().slice(0, 80), qty, price: food?.price ?? null };
      });
    if (!validItems.length) throw new Error("Adicione ao menos um item válido ao pedido.");
    const observation = (input.observation ?? "").trim().slice(0, 300) || null;
    const phone = (input.customerPhone ?? "").trim().slice(0, 24);
    const emailVal = (input.customerEmail ?? "").trim().slice(0, 120);

    /* ---- Cliente: nunca sobrescreve dados existentes (anti-sabotagem) ---- */
    const name = input.customerName.trim().slice(0, 60) || "Cliente do site";
    const phoneDigits = phone.replace(/\D/g, "");
    let customer =
      (phoneDigits.length >= 8 &&
        db.customers.find((c) => c.tenantId === tenant.id && c.phone.replace(/\D/g, "") === phoneDigits)) ||
      db.customers.find((c) => c.tenantId === tenant.id && c.name.toLowerCase() === name.toLowerCase()) ||
      null;
    if (!customer) {
      const novo: Customer = {
        id: uid(), tenantId: tenant.id, name, phone, email: emailVal,
        createdAt: new Date().toISOString(),
      };
      db.customers.push(novo);
      customer = novo;
    } else {
      // Preenche SOMENTE campos vazios — visitante anônimo não altera cadastro existente.
      if (!customer.phone && phone) customer.phone = phone;
      if (!customer.email && emailVal) customer.email = emailVal;
    }

    /* Número do pedido POR TENANT (não vaza volume da plataforma). */
    const tenantMax = db.orders.filter((o) => o.tenantId === tenant.id).reduce((mx, o) => Math.max(mx, o.number), 100);
    const first = validItems[0];
    const order: Order = {
      id: uid(), number: tenantMax + 1, tenantId: tenant.id, customerId: customer.id,
      customerName: customer.name, customerPhone: phone || customer.phone || null,
      size: "Pedido pelo site", protein: first.name,
      sides: validItems.slice(1).map((i) => `${i.qty}x ${i.name}`),
      observation, payment: "Pix", status: "pendente",
      createdAt: new Date().toISOString(), items: validItems, origin: "site",
    };
    db.orders.push(order);
    tenant.lastActivityAt = new Date().toISOString();
    db.analytics.push({ id: uid(), tenantId: tenant.id, kind: "order_completed", createdAt: new Date().toISOString() });
    saveDB();
    audit("orders.created_from_site", "orders", "ok", { tenantId: tenant.id, metadata: { number: String(order.number) } });
    return { ...order };
  },

  /* ---- auth/tenant ---- */

  async getMyTenant(): Promise<Tenant> {
    const s = getSession();
    const me = await tenantAuth.getMembership();
    if (!me) throw new Error("Sessão expirada. Entre novamente para continuar.");
    void s;
    return me.tenant;
  },

  async getUsage(tenantId: string): Promise<Usage> {
    const ctx = requireMember(tenantId);
    await sleep(120);
    void ctx;
    return computeUsage(tenantId);
  },

  async updateSettings(tenantId: string, patch: Partial<SiteSettings>): Promise<Tenant> {
    const { tenant } = requirePermission(tenantId, "site.update");
    await lag();
    const db = loadDB();
    if (patch.slug !== undefined) {
      const slug = slugify(patch.slug);
      if (!slug) throw new Error("Endereço de site inválido.");
      if (db.tenants.some((t) => t.slug === slug && t.id !== tenantId)) {
        throw new Error("Este endereço de site já está em uso por outro restaurante.");
      }
      patch = { ...patch, slug };
    }
    tenant.settings = { ...tenant.settings, ...patch };
    tenant.lastActivityAt = new Date().toISOString();
    saveDB();
    audit("site.settings_updated", "site", "ok", { tenantId });
    return { ...tenant };
  },

  async publishSite(tenantId: string, published: boolean): Promise<Tenant> {
    requirePermission(tenantId, "site.update");
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error("Tenant não encontrado.");
    tenant.settings.published = published;
    if (!tenant.onboardingCompleted) tenant.onboardingCompleted = true;
    saveDB();
    audit(published ? "site.published" : "site.unpublished", "site", "ok", { tenantId });
    return { ...tenant };
  },

  async completeOnboarding(tenantId: string): Promise<void> {
    requireMember(tenantId);
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (tenant) {
      tenant.onboardingCompleted = true;
      saveDB();
      audit("onboarding.completed", "tenant", "ok", { tenantId });
    }
  },

  /* ---- pratos (biblioteca) ---- */

  async listFoods(tenantId: string): Promise<Food[]> {
    requireMember(tenantId);
    await lag();
    return loadDB().foods.filter((f) => f.tenantId === tenantId).map((f) => ({ ...f }));
  },

  async createFood(tenantId: string, input: NewFoodInput): Promise<Food> {
    const { tenant } = requirePermission(tenantId, "products.create");
    await lag();
    const db = loadDB();
    // limite de plano verificado no "backend" (não só na UI)
    const blocked = checkLimit(tenant, "maxProducts", computeUsage(tenantId));
    if (blocked) {
      audit("limit.reached", "products", "denied", { tenantId, metadata: { limit: "maxProducts" } });
      throw new Error(blocked);
    }
    if (!input.name.trim()) throw new Error("Informe o nome do produto.");
    const food: Food = {
      id: uid(), tenantId, name: input.name.trim(), category: input.category,
      description: input.description?.trim() || null, price: input.price ?? null,
      imageUrl: input.imageUrl ?? null, availability: "disponivel",
      // Todo produto criado vai automaticamente para a biblioteca (pratos salvos).
      active: true,
      extras: (input.extras ?? []).filter((x) => x.name.trim()),
      createdAt: new Date().toISOString(),
    };
    db.foods.push(food);
    tenant.lastActivityAt = food.createdAt;
    saveDB();
    audit("products.created", "products", "ok", { tenantId, metadata: { name: food.name } });
    return { ...food };
  },

  async updateFood(tenantId: string, foodId: string, patch: Partial<Food>): Promise<Food> {
    requirePermission(tenantId, "products.update");
    await lag();
    const db = loadDB();
    const food = assertTenantRecord(db.foods.find((f) => f.id === foodId), tenantId, "products");
    Object.assign(food, patch, { id: food.id, tenantId }); // id/tenantId nunca mudam
    saveDB();
    audit("products.updated", "products", "ok", { tenantId, metadata: { name: food.name } });
    return { ...food };
  },

  async deleteFood(tenantId: string, foodId: string): Promise<void> {
    requirePermission(tenantId, "products.delete");
    await lag();
    const db = loadDB();
    const food = assertTenantRecord(db.foods.find((f) => f.id === foodId), tenantId, "products");
    db.foods = db.foods.filter((f) => f.id !== foodId);
    db.menuItems = db.menuItems.filter((m) => m.foodId !== foodId);
    saveDB();
    audit("products.deleted", "products", "ok", { tenantId, metadata: { name: food.name } });
  },

  async uploadImage(tenantId: string, file: File): Promise<string> {
    requireMember(tenantId);
    await sleep(350);
    // Em produção: Supabase Storage em /tenant/{tenant_id}/... com políticas por tenant.
    return fileToDataUrl(file, 900);
  },

  /* ---- cardápio (com agendamento por data) ---- */

  async listMenu(tenantId: string, date: string): Promise<DailyMenuItem[]> {
    requireMember(tenantId);
    await lag();
    const db = loadDB();
    return db.menuItems
      .filter((m) => m.tenantId === tenantId && m.menuDate === date)
      .map((m) => ({ ...m, food: db.foods.find((f) => f.id === m.foodId) }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async listWeekMenu(tenantId: string, dates: string[]): Promise<Record<string, DailyMenuItem[]>> {
    requireMember(tenantId);
    await lag();
    const db = loadDB();
    const out: Record<string, DailyMenuItem[]> = {};
    for (const d of dates) {
      out[d] = db.menuItems
        .filter((m) => m.tenantId === tenantId && m.menuDate === d)
        .map((m) => ({ ...m, food: db.foods.find((f) => f.id === m.foodId && f.tenantId === tenantId) }));
    }
    return out;
  },

  async addToMenu(tenantId: string, foodId: string, date: string): Promise<DailyMenuItem> {
    const { tenant } = requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    const food = assertTenantRecord(db.foods.find((f) => f.id === foodId), tenantId, "foods");
    const dup = db.menuItems.some((m) => m.tenantId === tenantId && m.foodId === foodId && m.menuDate === date);
    if (dup) {
      audit("menu.duplicate_blocked", "daily_menu", "denied", { tenantId });
      throw new Error(`"${food.name}" já está no cardápio de ${date}.`);
    }
    const item: DailyMenuItem = { id: uid(), tenantId, foodId, menuDate: date, createdAt: new Date().toISOString() };
    db.menuItems.push(item);
    tenant.lastActivityAt = item.createdAt;
    saveDB();
    audit("menu.item_added", "daily_menu", "ok", { tenantId, metadata: { food: food.name, date } });
    return { ...item, food: { ...food } };
  },

  async removeFromMenu(tenantId: string, itemId: string): Promise<void> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    const item = assertTenantRecord(db.menuItems.find((m) => m.id === itemId), tenantId, "menu");
    db.menuItems = db.menuItems.filter((m) => m.id !== itemId);
    saveDB();
    audit("menu.item_removed", "daily_menu", "ok", { tenantId, metadata: { date: item.menuDate } });
  },

  async copyMenu(tenantId: string, from: string, to: string): Promise<number> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    const items = db.menuItems.filter((m) => m.tenantId === tenantId && m.menuDate === from);
    let added = 0;
    for (const it of items) {
      const dup = db.menuItems.some((m) => m.tenantId === tenantId && m.foodId === it.foodId && m.menuDate === to);
      if (!dup) {
        db.menuItems.push({ id: uid(), tenantId, foodId: it.foodId, menuDate: to, createdAt: new Date().toISOString() });
        added++;
      }
    }
    saveDB();
    audit("menu.copied", "daily_menu", "ok", { tenantId, metadata: { from, to, added: String(added) } });
    return added;
  },

  /* ---- pedidos ---- */

  async listOrders(tenantId: string): Promise<Order[]> {
    requireMember(tenantId);
    await lag();
    return loadDB().orders
      .filter((o) => o.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({ ...o }));
  },

  async createOrder(tenantId: string, input: NewOrderInput): Promise<Order> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    if (!input.customerName.trim()) throw new Error("Informe o nome do cliente.");
    let customer = db.customers.find(
      (c) => c.tenantId === tenantId && c.name.toLowerCase() === input.customerName.trim().toLowerCase(),
    );
    if (!customer) {
      const novo: Customer = {
        id: uid(), tenantId, name: input.customerName.trim(),
        phone: input.customerPhone?.trim() || "", email: input.customerEmail?.trim() || "",
        createdAt: new Date().toISOString(),
      };
      db.customers.push(novo);
      customer = novo;
    } else {
      if (input.customerPhone?.trim()) customer.phone = input.customerPhone.trim();
      if (input.customerEmail?.trim()) customer.email = input.customerEmail.trim();
    }
    db.seq += 1;
    const order: Order = {
      id: uid(), number: db.seq, tenantId, customerId: customer.id,
      customerName: customer.name, customerPhone: input.customerPhone?.trim() || customer.phone || null,
      size: input.size, protein: input.protein, sides: input.sides,
      observation: input.observation?.trim() || null, payment: input.payment,
      status: input.status, createdAt: new Date().toISOString(), origin: "painel",
    };
    db.orders.push(order);
    saveDB();
    audit("orders.created", "orders", "ok", { tenantId, metadata: { number: String(order.number) } });
    return { ...order };
  },

  async updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<Order> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    const order = assertTenantRecord(db.orders.find((o) => o.id === orderId), tenantId, "orders");
    order.status = status;
    saveDB();
    audit("orders.status_changed", "orders", "ok", { tenantId, metadata: { number: String(order.number), status } });
    return { ...order };
  },

  /* ---- clientes ---- */

  async listCustomers(tenantId: string): Promise<CustomerWithStats[]> {
    requireMember(tenantId);
    await lag();
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.id === tenantId);
    const retention = tenant?.clientRetention ?? { mode: "manual", days: 0 };

    // Retenção automática: remove clientes inativos há mais de N dias.
    if (retention.mode === "auto" && retention.days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retention.days);
      const stale = db.customers.filter((c) => {
        if (c.tenantId !== tenantId) return false;
        const last = db.orders
          .filter((o) => o.tenantId === tenantId && o.customerId === c.id)
          .map((o) => o.createdAt)
          .sort()
          .reverse()[0];
        const ref = last ?? c.createdAt;
        return new Date(ref) < cutoff;
      });
      if (stale.length) {
        const ids = new Set(stale.map((c) => c.id));
        db.customers = db.customers.filter((c) => !ids.has(c.id));
        saveDB();
        audit("customers.auto_purged", "customers", "ok", { tenantId, metadata: { count: String(stale.length) } });
      }
    }

    return db.customers
      .filter((c) => c.tenantId === tenantId)
      .map((c) => {
        const mine = db.orders.filter((o) => o.tenantId === tenantId && o.customerId === c.id);
        const lastOrderAt = mine.length ? mine.map((o) => o.createdAt).sort().reverse()[0] : null;
        return { ...c, orderCount: mine.length, lastOrderAt };
      })
      .sort((a, b) => b.orderCount - a.orderCount);
  },

  async addCustomer(tenantId: string, input: { name: string; phone?: string | null; email?: string | null }): Promise<CustomerWithStats> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    if (!input.name.trim()) throw new Error("Informe o nome do cliente.");
    const customer: Customer = {
      id: uid(), tenantId, name: input.name.trim(),
      phone: input.phone?.trim() || "", email: input.email?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    db.customers.push(customer);
    saveDB();
    audit("customers.created", "customers", "ok", { tenantId, metadata: { name: customer.name } });
    return { ...customer, orderCount: 0, lastOrderAt: null };
  },

  async updateCustomer(tenantId: string, customerId: string, patch: Partial<Pick<Customer, "name" | "phone" | "email">>): Promise<Customer> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    const c = assertTenantRecord(db.customers.find((x) => x.id === customerId), tenantId, "customers");
    Object.assign(c, patch, { id: c.id, tenantId }); // id/tenantId nunca mudam
    saveDB();
    audit("customers.updated", "customers", "ok", { tenantId, metadata: { name: c.name } });
    return { ...c };
  },

  async deleteCustomer(tenantId: string, customerId: string): Promise<void> {
    requirePermission(tenantId, "menu.update");
    await lag();
    const db = loadDB();
    assertTenantRecord(db.customers.find((x) => x.id === customerId), tenantId, "customers");
    db.customers = db.customers.filter((x) => x.id !== customerId);
    // Pedidos são preservados (histórico), mas perdem o vínculo com o cliente removido.
    db.orders.forEach((o) => {
      if (o.customerId === customerId) o.customerId = null;
    });
    saveDB();
    audit("customers.deleted", "customers", "ok", { tenantId });
  },

  /** Define a política de retenção de clientes do tenant (manual ou automática). */
  async setClientRetention(tenantId: string, retention: ClientRetention): Promise<Tenant> {
    const { tenant } = requirePermission(tenantId, "settings.update");
    await lag();
    const db = loadDB();
    const t = db.tenants.find((x) => x.id === tenantId);
    if (!t) throw new Error("Restaurante não encontrado.");
    t.clientRetention = retention.mode === "auto" ? { mode: "auto", days: Math.max(1, retention.days) } : { mode: "manual", days: 0 };
    saveDB();
    audit("settings.client_retention", "settings", "ok", { tenantId, metadata: { mode: t.clientRetention.mode, days: String(t.clientRetention.days) } });
    void tenant;
    return { ...t };
  },

  /* ---- analytics ---- */

  async getAnalytics(tenantId: string, days = 14): Promise<AnalyticsEvent[]> {
    requirePermission(tenantId, "analytics.read");
    await lag();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return loadDB().analytics.filter((a) => a.tenantId === tenantId && new Date(a.createdAt) >= cutoff);
  },

  /** Evento público (mini-site) — o tenant vem do slug validado, não do cliente. */
  async trackPublic(slug: string, kind: AnalyticsKind, label?: string): Promise<void> {
    const db = loadDB();
    const tenant = db.tenants.find((t) => t.slug === slugify(slug));
    if (!tenant) return;
    db.analytics.push({ id: uid(), tenantId: tenant.id, kind, label, createdAt: new Date().toISOString() });
    if (db.analytics.length > 3000) db.analytics.splice(0, db.analytics.length - 3000);
    saveDB();
  },

  /* ---- equipe (RBAC) ---- */

  async listMembers(tenantId: string): Promise<TenantMember[]> {
    requireMember(tenantId);
    await lag();
    const db = loadDB();
    return db.members
      .filter((m) => m.tenantId === tenantId)
      .map((m) => ({ ...m, user: toUser(db.users.find((u) => u.id === m.userId) as StoredUser) }));
  },

  async inviteMember(tenantId: string, email: string, name: string, role: Role): Promise<TenantMember> {
    const { tenant, role: actorRole } = requirePermission(tenantId, "users.manage");
    await lag();
    const db = loadDB();
    /* RBAC real: papel vindo do cliente é validado contra a whitelist;
       só o OWNER pode conceder owner/admin (admin convida editor/viewer). */
    const validRoles: Role[] = ["owner", "admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
      audit("users.invite_denied", "users", "denied", { tenantId, metadata: { reason: "invalid_role" } });
      throw new Error("Papel inválido.");
    }
    if ((role === "owner" || role === "admin") && actorRole !== "owner") {
      audit("users.invite_denied", "users", "denied", { tenantId, metadata: { reason: "role_escalation" } });
      throw new Error("Somente o dono pode convidar administradores ou outro dono.");
    }
    if (!hasFeature(tenant, "multiple_users")) {
      throw new Error("Múltiplos usuários estão disponíveis a partir do plano Pro. Faça upgrade para convidar sua equipe.");
    }
    const blocked = checkLimit(tenant, "maxUsers", computeUsage(tenantId));
    if (blocked) {
      audit("limit.reached", "users", "denied", { tenantId });
      throw new Error(blocked);
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error("Este e-mail já possui conta no PKSISTEM.");
    }
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: uid(), email: email.trim().toLowerCase(), passwordHash: hashPassword(uid()), // senha provisória; fluxo real enviaria convite por e-mail
      name: name.trim() || email.split("@")[0], isSuperAdmin: false, createdAt: now, lastLoginAt: null,
    };
    db.users.push(user);
    const member: TenantMember = { id: uid(), tenantId, userId: user.id, role, createdAt: now };
    db.members.push(member);
    saveDB();
    audit("users.invited", "users", "ok", { tenantId, metadata: { email: user.email, role } });
    return { ...member, user: toUser(user) };
  },

  async setMemberRole(tenantId: string, memberId: string, role: Role): Promise<TenantMember> {
    const { user } = requirePermission(tenantId, "users.manage");
    await lag();
    const db = loadDB();
    const member = db.members.find((m) => m.id === memberId && m.tenantId === tenantId);
    if (!member) throw new Error("Membro não encontrado.");
    if (member.userId === user.id) throw new Error("Você não pode alterar o próprio papel.");
    if (member.role === "owner") throw new Error("O papel do dono não pode ser alterado.");
    member.role = role;
    saveDB();
    audit("users.role_changed", "users", "ok", { tenantId, metadata: { role } });
    return { ...member };
  },

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    const { user } = requirePermission(tenantId, "users.manage");
    await lag();
    const db = loadDB();
    const member = db.members.find((m) => m.id === memberId && m.tenantId === tenantId);
    if (!member) throw new Error("Membro não encontrado.");
    if (member.userId === user.id) throw new Error("Você não pode remover a si mesmo.");
    if (member.role === "owner") throw new Error("O dono do restaurante não pode ser removido.");
    db.members = db.members.filter((m) => m.id !== memberId);
    saveDB();
    audit("users.removed", "users", "ok", { tenantId });
  },

  /* ---- assinatura (arquitetura; cobrança real via provedor + webhooks) ---- */

  async changePlan(tenantId: string, planId: string): Promise<Tenant> {
    const { tenant } = requirePermission(tenantId, "billing.manage");
    await lag();
    const db = loadDB();
    const from = tenant.planId;
    tenant.planId = planId;
    if (tenant.status === "trialing" || tenant.status === "past_due") tenant.status = "active";
    tenant.trialEndsAt = null;
    saveDB();
    audit("subscription.plan_changed", "subscription", "ok", { tenantId, metadata: { from, to: planId, via: "simulado" } });
    return { ...tenant };
  },

  async cancelSubscription(tenantId: string): Promise<Tenant> {
    const { tenant } = requirePermission(tenantId, "billing.manage");
    await lag();
    tenant.status = "canceled";
    const db = loadDB();
    saveDB();
    void db;
    audit("subscription.canceled", "subscription", "ok", { tenantId });
    return { ...tenant };
  },

  /* ---- notificações ---- */

  async listNotifications(tenantId: string): Promise<AppNotification[]> {
    requireMember(tenantId);
    await sleep(120);
    return loadDB().notifications.filter((nt) => nt.tenantId === tenantId);
  },

  async markNotificationRead(tenantId: string, id: string): Promise<void> {
    requireMember(tenantId);
    const db = loadDB();
    const nt = db.notifications.find((x) => x.id === id && x.tenantId === tenantId);
    if (nt) {
      nt.read = true;
      saveDB();
    }
  },

  /* ---- exportação (LGPD: o tenant exporta apenas os PRÓPRIOS dados) ---- */

  async exportData(tenantId: string, format: "json" | "csv"): Promise<string> {
    const { tenant } = requirePermission(tenantId, "data.export");
    await lag();
    const db = loadDB();
    const foods = db.foods.filter((f) => f.tenantId === tenantId);
    const orders = db.orders.filter((o) => o.tenantId === tenantId);
    const customers = db.customers.filter((c) => c.tenantId === tenantId);
    if (format === "json") {
      return JSON.stringify({ tenant: { name: tenant.name, slug: tenant.slug }, foods, orders, customers }, null, 2);
    }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      "tipo;nome;categoria;preco;descricao",
      ...foods.map((f) => ["prato", f.name, f.category, f.price ?? "", f.description ?? ""].map(esc).join(";")),
      "",
      "pedido;numero;cliente;tamanho;proteina;status;data",
      ...orders.map((o) => ["pedido", o.number, o.customerName, o.size, o.protein, o.status, o.createdAt].map(esc).join(";")),
      "",
      "cliente;nome;telefone;pedidos",
      ...customers.map((c) => ["cliente", c.name, c.phone, orders.filter((o) => o.customerId === c.id).length].map(esc).join(";")),
    ];
    return lines.join("\n");
  },

  /** Offboarding: exclusão protegida (status pending_deletion + auditoria). */
  async requestDeletion(tenantId: string): Promise<void> {
    const { tenant } = requirePermission(tenantId, "settings.update");
    await lag();
    tenant.status = "pending_deletion";
    saveDB();
    audit("tenant.deletion_requested", "tenant", "ok", { tenantId });
  },
};
