/* Layout do painel do Super Admin (dono do SaaS) — camada separada do tenant. */
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useTheme, useToast } from "../../context/providers";
import { cn } from "../../lib/utils";
import { I, type IconName } from "../../components/icons";
import { FlowMark } from "../../components/saas";

const NAV: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: "/super", label: "Visão geral", icon: "dashboard", end: true },
  { to: "/super/tenants", label: "Tenants", icon: "building" },
  { to: "/super/planos", label: "Planos & receita", icon: "creditCard" },
  { to: "/super/auditoria", label: "Auditoria", icon: "shield" },
  { to: "/super/plataforma", label: "Plataforma", icon: "gear" },
];

const TITLES: Record<string, string> = {
  "/super": "Visão geral",
  "/super/tenants": "Tenants",
  "/super/planos": "Planos & receita",
  "/super/plataforma": "Plataforma",
  "/super/auditoria": "Auditoria",
};

export default function SuperLayout() {
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const title = TITLES[location.pathname] ?? "Super Admin";

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => { document.title = `${title} · PKSISTEM Admin`; }, [title]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      push("info", "Sessão encerrada.");
      navigate("/login", { replace: true });
    } catch {
      setSigningOut(false);
    }
  }

  const nav = (
    <nav aria-label="Menu do super admin" className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}
          className={({ isActive }) => cn("relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-all",
            isActive ? "bg-pine-800 text-saffron-300" : "text-pine-200 hover:bg-pine-800/60 hover:text-cream")}>
          {({ isActive }) => (
            <>
              <span className={cn("absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-saffron-400", isActive ? "opacity-100" : "opacity-0")} />
              <I name={item.icon} size={19} /> {item.label}
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
        <div className="leading-tight">
          <p className="font-display text-[16px] font-bold text-cream">PKSISTEM</p>
          <p className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-saffron-300"><I name="crown" size={12} /> Super Admin</p>
        </div>
      </div>
      {nav}
      <div className="mt-auto space-y-3 px-4 pb-5">
        <div className="rounded-xl bg-pine-800/70 px-3.5 py-3">
          <p className="truncate text-[13px] font-bold text-cream">{user?.name}</p>
          <p className="truncate text-[11.5px] text-pine-300">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggle} aria-label="Alternar tema" className="flex flex-1 items-center justify-center rounded-xl border border-pine-700 px-3 py-2.5 text-pine-100 hover:border-pine-500 hover:text-cream">
            <I name={dark ? "sun" : "moon"} size={16} />
          </button>
          <button onClick={handleSignOut} disabled={signingOut} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pine-700 px-3 py-2.5 text-[13px] font-bold text-pine-100 hover:border-[#c96a58] hover:text-[#ffb4a0] disabled:opacity-50">
            <I name="logout" size={16} /> {signingOut ? "…" : "Sair"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-paper dark:bg-[#0b120e] lg:pl-[250px]">
      <aside className="texture-dark fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col bg-pine-950 lg:flex">{sidebarInner}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-pine-100 bg-cream/95 px-4 backdrop-blur dark:border-pine-800 dark:bg-[#12211b]/95 lg:hidden">
        <button onClick={() => setDrawer(true)} aria-label="Abrir menu" className="rounded-lg border border-pine-200 p-2 text-pine-800 dark:border-pine-700 dark:text-pine-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6.5h16M4 12h16M4 17.5h10" /></svg>
        </button>
        <p className="flex-1 truncate font-display text-[15.5px] font-bold text-pine-950 dark:text-cream">{title}</p>
        <span className="rounded-full bg-saffron-400/20 px-2.5 py-1 text-[10.5px] font-extrabold uppercase text-saffron-800">Super</span>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-pine-950/60 animate-fade-in" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <aside className="texture-dark absolute inset-y-0 left-0 flex w-[270px] max-w-[85vw] flex-col bg-pine-950 shadow-pop animate-drawer">
            <button onClick={() => setDrawer(false)} aria-label="Fechar" className="absolute right-3 top-5 rounded-lg p-1.5 text-pine-300 hover:bg-pine-800"><I name="x" size={18} /></button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
