/* Rotas PKSISTEM: landing, mini-sites por tenant, auth, painel do negócio e super admin.
 * Usa createHashRouter (data router) para habilitar guards de navegação (useBlocker). */
import { useEffect } from "react";
import {
  createHashRouter,
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { AuthProvider, FullScreenLoader, ThemeProvider, ToastProvider, useAuth } from "./context/providers";
import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
import PlansPage from "./pages/PlansPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPage from "./pages/auth/ForgotPage";
import OnboardingPage from "./pages/OnboardingPage";
import { MiniSitePage, MiniSiteOrderPage } from "./pages/public/MiniSite";
import DashboardPage from "./pages/app/DashboardPage";
import MenuPage from "./pages/app/MenuPage";
import LibraryPage from "./pages/app/LibraryPage";
import OrdersPage from "./pages/app/OrdersPage";
import CustomersPage from "./pages/app/CustomersPage";
import SitePage from "./pages/app/SitePage";
import AnalyticsPage from "./pages/app/AnalyticsPage";
import TeamPage from "./pages/app/TeamPage";
import SubscriptionPage from "./pages/app/SubscriptionPage";
import HelpPage from "./pages/app/HelpPage";
import SuperLayout from "./pages/super/SuperLayout";
import SuperDashboard from "./pages/super/SuperDashboard";
import SuperTenants from "./pages/super/SuperTenants";
import SuperPlans from "./pages/super/SuperPlans";
import SuperAudit from "./pages/super/SuperAudit";
import PlatformPage from "./pages/super/PlatformPage";
import { Button } from "./components/ui";
import { PkMark } from "./components/saas";
import { I } from "./components/icons";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/* ---------- Guards ----------
 * A verificação aqui é de UX. A proteção REAL está no banco (RLS): sem sessão
 * válida nenhum dado é retornado, mesmo que a URL seja descoberta.
 * O painel do SUPER ADMIN é uma camada totalmente separada dos tenants.
 */

/** Exige usuário autenticado com vínculo a um tenant. */
function RequireTenant() {
  const { status, user, membership } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader label="Verificando sua sessão…" />;
  if (status === "signedOut") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // Super admin não tem tenant — não deve cair no painel do negócio.
  if (user?.isSuperAdmin) return <Navigate to="/super" replace />;
  if (!membership) return <Navigate to="/cadastro" replace />;
  return <Outlet />;
}

/** Exige super admin (camada separada dos tenants). */
function RequireSuper() {
  const { status, user } = useAuth();
  if (status === "loading") return <FullScreenLoader label="Verificando permissões…" />;
  if (status === "signedOut") return <Navigate to="/login" replace />;
  if (!user?.isSuperAdmin) return <Forbidden />;
  return <Outlet />;
}

function Forbidden() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 text-center">
      <span className="text-[#a83a2a]"><PkMark size={56} /></span>
      <h1 className="mt-4 font-display text-2xl font-bold text-pine-950 dark:text-cream">Acesso negado (403)</h1>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-pine-600 dark:text-pine-300">
        Sua conta não tem permissão para esta área. O acesso do Super Admin é verificado no backend.
      </p>
      <Link to="/app" className="mt-6"><Button icon="arrowLeft">Ir para meu painel</Button></Link>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="font-display text-[72px] font-bold leading-none text-pine-200 dark:text-pine-800">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-pine-950 dark:text-cream">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-[14px] text-pine-600 dark:text-pine-300">O endereço acessado não existe ou foi movido.</p>
      <div className="mt-6">
        <Link to="/"><Button icon="arrowLeft" variant="secondary">Voltar ao site</Button></Link>
      </div>
    </div>
  );
}

/* ---------- Páginas legais (LGPD) ---------- */

function LegalPage({ kind }: { kind: "privacidade" | "termos" }) {
  const isPriv = kind === "privacidade";
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-pine-600 hover:text-pine-950 dark:text-pine-300 dark:hover:text-cream"><I name="arrowLeft" size={15} /> Voltar</Link>
      <h1 className="mt-4 font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">
        {isPriv ? "Política de Privacidade" : "Termos de Uso"}
      </h1>
      <div className="mt-5 space-y-4 text-[14.5px] leading-relaxed text-pine-700 dark:text-pine-200">
        {isPriv ? (
          <>
            <p>O PKSISTEM trata dados de negócios (tenants) e de usuários finais com responsabilidade, em linha com a LGPD quando aplicável.</p>
            <p><strong>Isolamento:</strong> cada negócio é um tenant isolado. Um negócio nunca acessa dados de outro.</p>
            <p><strong>Dados do cliente final:</strong> o mini-site não exige cadastro. Nome, telefone e e-mail informados no pedido servem apenas para o próprio negócio atender o cliente.</p>
            <p><strong>Exportação e exclusão:</strong> o dono do negócio pode exportar seus dados (CSV/JSON) e solicitar a exclusão da conta a qualquer momento.</p>
            <p className="text-pine-500">Este texto é um modelo para demonstração e não constitui parecer jurídico.</p>
          </>
        ) : (
          <>
            <p>Ao usar o PKSISTEM você concorda em fornecer informações verídicas sobre seu estabelecimento e em não utilizar a plataforma para fins ilícitos.</p>
            <p><strong>Planos e cobrança:</strong> os limites de cada plano são aplicados automaticamente. Você pode cancelar quando quiser, sem fidelidade.</p>
            <p><strong>Suspensão:</strong> contas podem ser suspensas em caso de inadimplência ou violação destes termos, com registro em auditoria.</p>
            <p className="text-pine-500">Este texto é um modelo para demonstração e não constitui parecer jurídico.</p>
          </>
        )}
      </div>
    </div>
  );
}

const router = createHashRouter([
  /* ===== Públicas ===== */
  { path: "/", element: <><ScrollToTop /><LandingPage /></> },
  { path: "/planos", element: <><ScrollToTop /><PlansPage /></> },
  { path: "/privacidade", element: <><ScrollToTop /><LegalPage kind="privacidade" /></> },
  { path: "/termos", element: <><ScrollToTop /><LegalPage kind="termos" /></> },
  { path: "/r/:slug", element: <><ScrollToTop /><MiniSitePage /></> },
  { path: "/r/:slug/pedido", element: <><ScrollToTop /><MiniSiteOrderPage /></> },

  /* ===== Auth ===== */
  { path: "/login", element: <><ScrollToTop /><LoginPage /></> },
  { path: "/cadastro", element: <><ScrollToTop /><SignupPage /></> },
  { path: "/recuperar", element: <><ScrollToTop /><ForgotPage /></> },

  /* ===== Onboarding (tenant) ===== */
  {
    element: <RequireTenant />,
    children: [{ path: "/onboarding", element: <><ScrollToTop /><OnboardingPage /></> }],
  },

  /* ===== Painel do negócio (tenant) ===== */
  {
    element: <RequireTenant />,
    children: [
      {
        path: "/app",
        element: <><ScrollToTop /><AppLayout /></>,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "cardapio", element: <MenuPage /> },
          { path: "pratos", element: <LibraryPage /> },
          { path: "pedidos", element: <OrdersPage /> },
          { path: "marmitas", element: <Navigate to="/app/pedidos" replace /> },
          { path: "clientes", element: <CustomersPage /> },
          { path: "site", element: <SitePage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "equipe", element: <TeamPage /> },
          { path: "assinatura", element: <SubscriptionPage /> },
          { path: "ajuda", element: <HelpPage /> },
        ],
      },
    ],
  },

  /* ===== Super Admin (camada separada) ===== */
  {
    element: <RequireSuper />,
    children: [
      {
        path: "/super",
        element: <><ScrollToTop /><SuperLayout /></>,
        children: [
          { index: true, element: <SuperDashboard /> },
          { path: "tenants", element: <SuperTenants /> },
          { path: "planos", element: <SuperPlans /> },
          { path: "auditoria", element: <SuperAudit /> },
          { path: "plataforma", element: <PlatformPage /> },
        ],
      },
    ],
  },

  /* ===== Apelidos comuns nunca expõem dados sem sessão ===== */
  { path: "/admin", element: <Navigate to="/login" replace /> },
  { path: "/admin/login", element: <Navigate to="/login" replace /> },
  { path: "/dashboard", element: <Navigate to="/app" replace /> },
  { path: "/painel", element: <Navigate to="/app" replace /> },

  { path: "*", element: <NotFound /> },
]);

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
