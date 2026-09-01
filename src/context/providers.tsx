/* Providers globais: toasts, autenticação multi-tenant, tema (dark mode) e dados. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, api } from "../lib/api";
import type { Membership, User } from "../lib/types";
import { I } from "../components/icons";
import { Spinner } from "../components/ui";
import { cn } from "../lib/utils";

/* ================= Toasts ================= */

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<{ push: (kind: ToastKind, message: string) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

let toastSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const icons: Record<ToastKind, ReactNode> = {
    success: <I name="check" size={16} />,
    error: <I name="alert" size={16} />,
    info: <I name="info" size={16} />,
  };
  const styles: Record<ToastKind, string> = {
    success: "border-pine-600/40 bg-pine-800 text-pine-50 [&_svg]:text-saffron-300",
    error: "border-[#a83a2a]/50 bg-[#5e2113] text-[#ffe9e2] [&_svg]:text-[#ffb4a0]",
    info: "border-saffron-500/40 bg-pine-900 text-pine-50 [&_svg]:text-saffron-300",
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-4 z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-[13.5px] font-semibold shadow-pop animate-toast",
              styles[t.kind],
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
            <span className="leading-snug">{t.message}</span>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="ml-auto shrink-0 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Fechar notificação"
            >
              <I name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ================= Tema (dark mode do painel) ================= */

const THEME_KEY = "saborflow_theme";

const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      /* ok */
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/* ================= Autenticação multi-tenant ================= */

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  membership: Membership | null; // null para super admin ou sem vínculo
  isImpersonating: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User; membership: Membership | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  status: "loading",
  user: null,
  membership: null,
  isImpersonating: false,
  signIn: async () => ({ user: null as unknown as User, membership: null }),
  signOut: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const refresh = useCallback(async () => {
    const [u, me] = await Promise.all([authApi.getSessionUser(), authApi.getMembership()]);
    setUser(u);
    setMembership(me);
    setIsImpersonating(authApi.isImpersonating());
    setStatus(u ? "signedIn" : "signedOut");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [u, me] = await Promise.all([authApi.getSessionUser(), authApi.getMembership()]);
        if (!active) return;
        setUser(u);
        setMembership(me);
        setIsImpersonating(authApi.isImpersonating());
        setStatus(u ? "signedIn" : "signedOut");
      } catch {
        if (!active) return;
        setStatus("signedOut");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const logged = await authApi.signIn(email, password);
    const me = await authApi.getMembership();
    setUser(logged);
    setMembership(me);
    setIsImpersonating(authApi.isImpersonating());
    setStatus("signedIn");
    return { user: logged, membership: me };
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
    setMembership(null);
    setIsImpersonating(false);
    setStatus("signedOut");
  }, []);

  const value = useMemo(
    () => ({ status, user, membership, isImpersonating, signIn, signOut, refresh }),
    [status, user, membership, isImpersonating, signIn, signOut, refresh],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/* ================= Hook de dados ================= */

export function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Algo deu errado. Tente novamente.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, set: setData };
}

/* ================= Tela de carregamento ================= */

export function FullScreenLoader({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper dark:bg-[#0b120e]">
      <span className="text-pine-700">
        <Spinner size={34} />
      </span>
      <p className="text-sm font-semibold text-pine-600 dark:text-pine-300">{label}</p>
    </div>
  );
}

void api;
