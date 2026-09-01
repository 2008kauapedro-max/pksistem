/* Biblioteca de interface: botões, campos, modais, badges, estados. */
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/utils";
import { I, type IconName } from "./icons";
import type { OrderStatus } from "../lib/utils";
import { STATUS_LABEL } from "../lib/utils";
import type { Category } from "../lib/types";

/* ---------- Spinner ---------- */

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={cn("animate-spin", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber" | "dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: IconName;
  full?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-pine-700 text-cream hover:bg-pine-600 active:bg-pine-800 shadow-card disabled:bg-pine-700/50",
  secondary:
    "bg-cream text-pine-800 border border-pine-200 hover:border-pine-400 hover:bg-pine-50 active:bg-pine-100 disabled:opacity-50",
  ghost: "bg-transparent text-pine-800 hover:bg-pine-100/70 active:bg-pine-100 disabled:opacity-40",
  danger: "bg-[#a83a2a] text-cream hover:bg-[#93311f] active:bg-[#7e2a1a] shadow-card disabled:opacity-50",
  amber: "bg-saffron-400 text-pine-950 hover:bg-saffron-300 active:bg-saffron-500 shadow-card disabled:opacity-50 font-bold",
  dark: "bg-pine-950 text-cream hover:bg-pine-900 active:bg-black shadow-card disabled:opacity-50",
};

const SIZES = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-[52px] px-6 text-base gap-2.5 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  full = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 select-none",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 15 : 17} /> : icon ? <I name={icon} size={size === "sm" ? 16 : 18} /> : null}
      {children}
    </button>
  );
}

/* ---------- Campos ---------- */

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-bold text-pine-900">
        <span>
          {label}
          {required && <span className="ml-0.5 text-[#a83a2a]">*</span>}
        </span>
        {hint && <span className="text-[11px] font-medium text-pine-500">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#a83a2a]">
          <I name="alert" size={14} />
          {error}
        </span>
      )}
    </label>
  );
}

const inputBase =
  "w-full h-11 rounded-xl border bg-cream px-3.5 text-[15px] text-ink placeholder:text-pine-400 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-saffron-400/70 focus:border-saffron-500 disabled:opacity-50 " +
  "dark:bg-pine-950 dark:text-cream dark:placeholder:text-pine-500";

export function Input({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(inputBase, invalid ? "border-[#a83a2a]/60" : "border-pine-200 hover:border-pine-300 dark:border-pine-700 dark:hover:border-pine-600", className)}
      {...rest}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        inputBase,
        "h-auto min-h-[88px] py-2.5 leading-relaxed",
        invalid ? "border-[#a83a2a]/60" : "border-pine-200 hover:border-pine-300 dark:border-pine-700 dark:hover:border-pine-600",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <select
        className={cn(
          inputBase,
          "appearance-none pr-9 cursor-pointer",
          invalid ? "border-[#a83a2a]/60" : "border-pine-200 hover:border-pine-300 dark:border-pine-700 dark:hover:border-pine-600",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <I name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pine-500" />
    </span>
  );
}

/* ---------- Toggle ---------- */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-pine-200 bg-cream px-4 py-3 text-left transition-colors hover:border-pine-300"
    >
      <span>
        <span className="block text-sm font-bold text-pine-900">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] text-pine-600">{description}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-pine-700" : "bg-pine-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  /* onClose fica em ref: o efeito roda só quando `open` muda, senão cada
     tecla digitada num campo do modal re-focaria o painel e roubaria o foco. */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-pine-950/60 backdrop-blur-[2px] animate-fade-in cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-paper shadow-pop outline-none animate-scale-in dark:bg-pine-900 sm:rounded-2xl",
          size === "md" ? "sm:max-w-lg" : "sm:max-w-2xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-pine-100 bg-cream px-5 py-4 dark:border-pine-800 dark:bg-pine-900 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-bold text-pine-950 dark:text-cream">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-pine-600 dark:text-pine-300">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-lg p-2 text-pine-500 transition-colors hover:bg-pine-100 hover:text-pine-900 dark:hover:bg-pine-800 dark:hover:text-cream"
          >
            <I name="x" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-pine-100 bg-cream px-5 py-4 dark:border-pine-800 dark:bg-pine-900 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Imagem com moldura PKSISTEM ---------- */

export function FramedImage({ src, alt, className, frameClassName }: { src: string | null; alt: string; className?: string; frameClassName?: string }) {
  if (!src) return null;
  return (
    <div className={cn("pk-frame", frameClassName)}>
      <img src={src} alt={alt} loading="lazy" className={cn("w-full rounded-2xl border-4 border-white object-cover shadow-lift", className)} />
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Excluir",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} icon="trash">
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3 text-sm leading-relaxed text-pine-800">
        <span className="mt-0.5 shrink-0 rounded-full bg-[#a83a2a]/10 p-2 text-[#a83a2a]">
          <I name="alert" size={18} />
        </span>
        <div>{message}</div>
      </div>
    </Modal>
  );
}

/* ---------- Badges ---------- */

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const styles: Record<OrderStatus, string> = {
    pendente: "bg-saffron-100 text-saffron-800 border-saffron-300/60",
    preparando: "bg-sky-100 text-sky-800 border-sky-300/60",
    pronta: "bg-pine-100 text-pine-800 border-pine-300/60",
    entregue: "bg-stone-200/80 text-stone-600 border-stone-300/70",
  };
  const dot: Record<OrderStatus, string> = {
    pendente: "bg-saffron-500 animate-blink",
    preparando: "bg-sky-500 animate-blink",
    pronta: "bg-pine-600",
    entregue: "bg-stone-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold",
        styles[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const CATEGORY_STYLE: Record<Category, string> = {
  Carnes: "bg-[#f3e1d7] text-[#8a4b2a]",
  Acompanhamentos: "bg-saffron-100 text-saffron-800",
  Saladas: "bg-pine-100 text-pine-700",
  Massas: "bg-[#f0e4ce] text-[#7a5a17]",
  Sobremesas: "bg-[#ebe0ee] text-[#6d4478]",
  Bebidas: "bg-[#dbe9ee] text-[#2f6377]",
};

export function CategoryPill({ category }: { category: Category }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold", CATEGORY_STYLE[category] ?? "bg-pine-100 text-pine-700")}>
      {category}
    </span>
  );
}

/* ---------- Imagem de prato com fallback ---------- */

export function FoodImage({
  src,
  alt,
  category,
  className,
}: {
  src: string | null;
  alt: string;
  category?: Category;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex items-center justify-center",
        CATEGORY_STYLE[category ?? "Acompanhamentos"],
        className,
      )}
    >
      <I name="logo" size={34} className="opacity-60" />
    </div>
  );
}

/* ---------- Estados ---------- */

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-pine-300 bg-pine-50/50 px-6 py-12 text-center animate-fade-in">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-600">
        <I name={icon} size={26} />
      </span>
      <h3 className="font-display text-lg font-bold text-pine-950">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-pine-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#a83a2a]/25 bg-[#a83a2a]/5 px-6 py-10 text-center animate-fade-in">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#a83a2a]/10 text-[#a83a2a]">
        <I name="alert" size={22} />
      </span>
      <p className="max-w-sm text-sm font-semibold text-[#7e2a1a]">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon="refresh" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/* ---------- Skeletons ---------- */

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-pine-100 bg-cream">
      <div className="skeleton h-36 w-full" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-4 w-2/3 rounded-md" />
        <div className="skeleton h-3 w-1/3 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-pine-100 bg-cream p-3.5">
      <div className="skeleton h-14 w-14 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/2 rounded-md" />
        <div className="skeleton h-3 w-1/4 rounded-md" />
      </div>
    </div>
  );
}

/* ---------- Scroll reveal ---------- */

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
