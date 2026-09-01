/* Layout do painel do negócio: sidebar (desktop) / drawer (mobile) + faixa de suporte. */
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useTheme, useToast, useAsyncData } from "../context/providers";
import { api, backendMode } from "../lib/api";
import { getPlan } from "../lib/plans";
import { cn } from "../lib/utils";
import { I, type IconName } from "./icons";
import { FlowMark } from "./saas";

const NAV: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: "/app", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/app/cardapio", label: "Cardápio", icon: "menuBook" },
  { to: "/app/pratos", label: "Produtos salvos", icon: "book" },
  { to: "/app/pedidos", label: "Pedidos", icon: "lunchbox" },
  { to: "/app/clientes", label: "Clientes", icon: "users" },
  { to: "/app/site", label: "Meu site", icon: "palette" },
  { to: "/app/analytics", label: "Métricas", icon: "chart" },
  { to: "/app/equipe", label: "Equipe", icon: "users" },
  { to: "/app/assinatura", label: "Assinatura", icon: "creditCard" },
  { to: "/app/ajuda", label: "Ajuda & PKChat", icon: "zap" },
];

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/cardapio": "Cardápio",
  "/app/pratos": "Produtos salvos",
  "/app/pedidos": "Pedidos",
  "/app/clientes": "Clientes",
  "/app/site": "Meu site",
  "/app/analytics": "Métricas",
  "/app/equipe": "Equipe",
  "/app/assinatura": "Assinatura",
  "/app/ajuda": "Ajuda & PKChat",
};

export default function AppLayout() {
  const { membership, user, signOut, isImpersonating } = useAuth();
  const { dark, toggle } = useTheme();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const title = TITLES[location.pathname] ?? "Painel";
  const tenantId = membership?.tenant.id ?? "";

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => { document.title = `${title} · PKSISTEM`; }, [title]);

  const { data: notifications, set: setNotifications } = useAsyncData(
    () => (tenantId ? api.listNotifications(tenantId) : Promise.resolve([])),
    [tenantId],
  );
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      push("info", "Sessão encerrada. Até logo!");
      navigate("/login", { replace: true });
    } catch {
      push("error", "Não foi possível sair. Tente novamente.");
      setSigningOut(false);
    }
  }

  if (!membership || !user) return null;
  const plan = getPlan(membership.tenant.planId);

  const nav = (
    <nav aria-label="Menu do painel" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-all duration-150",
              isActive
                ? "bg-pine-800 text-saffron-300 shadow-[inset_0_0_0_1px_rgba(233,178,59,0.2)]"
                : "text-pine-200 hover:bg-pine-800/60 hover:text-cream",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn("absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-saffron-400 transition-all", isActive ? "opacity-100" : "opacity-0")} />
              <I name={item.icon} size={19} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="text-saffron-400"><FlowMark size={40} /></span>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[16px] font-bold text-cream">{membership.tenant.name.replace(/^Restaurante\s+/i, "")}</p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-pine-300">Plano {plan.name}</p>
        </div>
      </div>
      {nav}
      <div className="mt-auto space-y-3 px-4 pb-5">
        <a
          href={`#/r/${membership.tenant.slug}`}
          className="flex items-center gap-2.5 rounded-xl border border-pine-700 px-3.5 py-2.5 text-[13px] font-semibold text-pine-200 transition-colors hover:border-pine-500 hover:text-cream"
        >
          <I name="globe" size={17} /> Ver meu site
          <I name="external" size={14} className="ml-auto opacity-60" />
        </a>
        <div className="rounded-xl bg-pine-800/70 px-3.5 py-3">
          <p className="truncate text-[13px] font-bold text-cream">{user.name}</p>
          <p className="truncate text-[11.5px] capitalize text-pine-300">{membership.role === "owner" ? "Dono" : membership.role}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggle}
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pine-700 px-3 py-2.5 text-[13px] font-bold text-pine-100 transition-colors hover:border-pine-500 hover:text-cream"
          >
            <I name={dark ? "sun" : "moon"} size={16} />
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pine-700 px-3 py-2.5 text-[13px] font-bold text-pine-100 transition-colors hover:border-[#c96a58] hover:bg-[#a83a2a]/15 hover:text-[#ffb4a0] disabled:opacity-50"
          >
            <I name="logout" size={16} />
            {signingOut ? "Saindo…" : "Sair"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-paper dark:bg-[#0b120e] lg:pl-[264px]">
      {/* Banner de impersonação (nunca escondido) */}
      {isImpersonating && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-saffron-400 px-4 py-2 text-center text-[13px] font-extrabold text-pine-950 shadow-card">
          Você está acessando esta conta como suporte PKSISTEM.
          <button onClick={handleSignOut} className="ml-3 underline underline-offset-2">Sair</button>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className={cn("texture-dark fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-pine-900 lg:flex", isImpersonating && "lg:pt-9")}>
        {sidebarInner}
      </aside>

      {/* Topbar mobile */}
      <header className={cn("sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-pine-100 bg-cream/95 px-4 backdrop-blur dark:border-pine-800 dark:bg-[#12211b]/95 lg:hidden", isImpersonating && "mt-9")}>
        <button onClick={() => setDrawer(true)} aria-label="Abrir menu" className="rounded-lg border border-pine-200 p-2 text-pine-800 dark:border-pine-700 dark:text-pine-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6.5h16M4 12h16M4 17.5h10" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15.5px] font-bold text-pine-950 dark:text-cream">{title}</p>
        </div>
        {backendMode === "demo" ? (
          <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-saffron-800" title="Banco local de demonstração">Demo</span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-pine-100 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-pine-800 dark:bg-pine-800 dark:text-pine-100" title="Conectado ao Supabase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf6e] animate-pulse-dot" /> Cloud
          </span>
        )}
        {/* Notificações */}
        <div className="relative">
          <button onClick={() => setNotifOpen((v) => !v)} aria-label="Notificações" className="relative rounded-lg border border-pine-200 p-2 text-pine-800 dark:border-pine-700 dark:text-pine-200">
            <I name="bell" size={17} />
            {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#c0563f] px-1 text-[10px] font-extrabold text-cream">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-[300px] max-w-[85vw] rounded-2xl border border-pine-100 bg-cream p-3 shadow-pop animate-scale-in dark:border-pine-800 dark:bg-[#12211b]">
              <p className="px-2 pb-2 text-[12px] font-extrabold uppercase tracking-wide text-pine-500">Notificações</p>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {(notifications ?? []).length === 0 && <p className="px-2 py-4 text-center text-[13px] font-semibold text-pine-500">Nenhuma notificação.</p>}
                {(notifications ?? []).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      api.markNotificationRead(tenantId, n.id);
                      setNotifications((d) => (d ? d.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : d));
                    }}
                    className={cn("w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-pine-50 dark:hover:bg-pine-900/50", !n.read && "bg-saffron-50 dark:bg-saffron-900/20")}
                  >
                    <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-pine-950 dark:text-cream">
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-500" />}
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-pine-600 dark:text-pine-300">{n.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-saffron-500"><FlowMark size={30} /></span>
      </header>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-pine-950/60 animate-fade-in cursor-default" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <aside className="texture-dark absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-pine-900 shadow-pop animate-drawer">
            <button onClick={() => setDrawer(false)} aria-label="Fechar menu" className="absolute right-3 top-5 rounded-lg p-1.5 text-pine-300 hover:bg-pine-800 hover:text-cream">
              <I name="x" size={18} />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1060px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <SupportStrip />
        <Outlet />
      </main>
    </div>
  );
}

/* Faixa de suporte da plataforma (contatos do dono do SaaS, editados no Super Admin). */
function SupportStrip() {
  const { data: platform } = useAsyncData(() => api.getPlatformPublic().catch(() => null), []);
  if (!platform) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-pine-100 bg-pine-950 px-4 py-2.5 text-[12px] font-bold text-pine-200 dark:border-pine-800">
      <span className="flex items-center gap-1.5 text-saffron-300"><I name="zap" size={13} /> Suporte {platform.name}</span>
      {platform.instagram && (
        <a href={`https://instagram.com/${platform.instagram.replace(/^@+/, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-cream">
          <I name="instagram" size={13} /> {platform.instagram}
        </a>
      )}
      <a href={`mailto:${platform.supportEmail}`} className="flex items-center gap-1.5 transition-colors hover:text-cream">
        <I name="send" size={13} /> {platform.supportEmail}
      </a>
      <Link to="/app/ajuda" className="ml-auto flex items-center gap-1.5 text-saffron-300 transition-colors hover:text-saffron-200">
        <I name="info" size={13} /> Central de ajuda
      </Link>
    </div>
  );
}
