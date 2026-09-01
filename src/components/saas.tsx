/* Componentes específicos do SaaS: marca SaborFlow, progresso, planos, status. */
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { I, type IconName } from "./icons";
import { Button } from "./ui";
import type { TenantStatus } from "../lib/types";
import { TENANT_STATUS_LABEL } from "../lib/types";
import { getPlan, formatPrice } from "../lib/plans";

/* ---------- Marca PKSISTEM ---------- */

/** Selo PK — placa amarela com recorte, a assinatura visual da plataforma. */
export function PkMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="13" fill="#efc426" />
      <rect x="3" y="3" width="42" height="42" rx="13" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
      <text x="24" y="29.5" textAnchor="middle" fontFamily="'Space Grotesk','Arial Black',sans-serif" fontWeight="700" fontSize="19" fill="#141411" letterSpacing="-1">PK</text>
      <rect x="13" y="34" width="22" height="3" rx="1.5" fill="#141411" opacity="0.85" />
    </svg>
  );
}

/** Compatibilidade com código antigo. */
export const FlowMark = PkMark;

export function Wordmark({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-[23px]" : size === "sm" ? "text-[15px]" : "text-[18px]";
  return (
    <span className={cn("inline-flex items-center gap-2.5", dark ? "text-cream" : "text-pine-950")}>
      <PkMark size={size === "lg" ? 40 : size === "sm" ? 28 : 34} />
      <span className={cn("font-display font-bold uppercase leading-none tracking-[0.02em]", text)}>
        PK<span className="text-saffron-600">Sistem</span>
      </span>
    </span>
  );
}

/* ---------- Progress ---------- */

export function Progress({ value, tone = "pine", className }: { value: number; tone?: "pine" | "amber" | "danger"; className?: string }) {
  const bar = tone === "danger" ? "bg-[#c0563f]" : tone === "amber" ? "bg-saffron-400" : "bg-pine-600";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-pine-100 dark:bg-pine-900", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all duration-500", bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ---------- Stat ---------- */

export function Stat({
  icon,
  label,
  value,
  hint,
  tone = "pine",
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "pine" | "amber" | "clay";
}) {
  const iconBg = tone === "amber" ? "bg-saffron-100 text-saffron-800" : tone === "clay" ? "bg-[#f3ddd6] text-[#8f4630]" : "bg-pine-100 text-pine-700";
  return (
    <div className="rounded-2xl border border-pine-100 bg-cream p-4.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift dark:border-pine-800 dark:bg-[#12211b]">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <I name={icon} size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold uppercase tracking-wide text-pine-500 dark:text-pine-400">{label}</p>
          <p className="font-display text-[24px] font-bold leading-tight text-pine-950 dark:text-cream">{value}</p>
          {hint && <p className="truncate text-[11.5px] font-semibold text-pine-500 dark:text-pine-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ id: T; label: string; icon?: IconName }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-xl border border-pine-100 bg-cream p-1 dark:border-pine-800 dark:bg-[#12211b]", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all",
            value === t.id ? "bg-pine-800 text-cream shadow-card" : "text-pine-600 hover:bg-pine-100/70 dark:text-pine-300 dark:hover:bg-pine-800/50",
          )}
        >
          {t.icon && <I name={t.icon} size={15} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Accordion (FAQ) ---------- */

export function Accordion({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-pine-100 rounded-2xl border border-pine-100 bg-cream dark:divide-pine-800 dark:border-pine-800 dark:bg-[#12211b]">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-pine-50/60 dark:hover:bg-pine-900/40"
            >
              <span className="font-display text-[16px] font-semibold text-pine-950 dark:text-cream">{item.q}</span>
              <span className={cn("shrink-0 text-pine-500 transition-transform duration-200", isOpen && "rotate-180")}>
                <I name="chevronDown" size={18} />
              </span>
            </button>
            <div className={cn("grid transition-all duration-300", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[14px] leading-relaxed text-pine-600 dark:text-pine-300">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Status de tenant / assinatura ---------- */

const STATUS_TONE: Record<TenantStatus, string> = {
  active: "bg-pine-100 text-pine-800 border-pine-200",
  trialing: "bg-saffron-100 text-saffron-800 border-saffron-200",
  past_due: "bg-[#f7e3d5] text-[#8f4630] border-[#eac4ae]",
  paused: "bg-pine-50 text-pine-600 border-pine-200",
  canceled: "bg-[#f0dede] text-[#7e2a1a] border-[#e2bcbc]",
  suspended: "bg-[#f0dede] text-[#7e2a1a] border-[#e2bcbc]",
  pending_deletion: "bg-[#e8e0dc] text-[#5c4a3e] border-[#d6c8bf]",
};

export function TenantStatusPill({ status }: { status: TenantStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold", STATUS_TONE[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-pine-600" : status === "trialing" ? "bg-saffron-500" : "bg-current")} />
      {TENANT_STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- Gate de plano (upgrade) ---------- */

export function UpgradeGate({
  feature,
  currentPlanId,
  children,
}: {
  feature: string;
  currentPlanId: string;
  children?: ReactNode;
}) {
  void children;
  const current = getPlan(currentPlanId);
  return (
    <div className="rounded-2xl border-2 border-dashed border-saffron-300 bg-saffron-50 p-8 text-center dark:border-saffron-700 dark:bg-saffron-900/20">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-saffron-400 text-pine-950">
        <I name="lock" size={24} />
      </span>
      <h3 className="mt-4 font-display text-[20px] font-bold text-pine-950 dark:text-cream">{feature} está bloqueado</h3>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-pine-600 dark:text-pine-300">
        Seu plano atual é o <strong>{current.name}</strong>. Faça upgrade para desbloquear este recurso e continuar crescendo.
      </p>
      <Link to="/app/assinatura" className="mt-5 inline-block">
        <Button variant="amber" icon="zap">
          Fazer upgrade
        </Button>
      </Link>
    </div>
  );
}

/* ---------- Cartão de plano (landing / preços) ---------- */

export function PlanCard({
  planId,
  annual = false,
  ctaLabel = "Começar agora",
  onSelect,
}: {
  planId: string;
  annual?: boolean;
  ctaLabel?: string;
  onSelect?: (planId: string) => void;
}) {
  const plan = getPlan(planId);
  const price = annual ? Math.round(plan.priceAnnual / 12) : plan.priceMonthly;
  const unlimited = (v: number) => (v === -1 ? "Ilimitado" : v.toLocaleString("pt-BR"));
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-cream p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift",
        plan.highlight ? "border-saffron-400 ring-2 ring-saffron-400/40" : "border-pine-100",
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-saffron-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-pine-950">
          Mais popular
        </span>
      )}
      <h3 className="font-display text-[20px] font-bold text-pine-950">{plan.name}</h3>
      <p className="mt-0.5 text-[12.5px] font-semibold text-pine-500">{plan.tagline}</p>
      <p className="mt-4">
        <span className="font-display text-[34px] font-bold text-pine-950">{formatPrice(price)}</span>
        <span className="text-[13px] font-semibold text-pine-500"> /mês</span>
      </p>
      {annual && plan.priceAnnual > 0 && <p className="text-[11.5px] font-semibold text-saffron-700">cobrado anualmente ({formatPrice(plan.priceAnnual)})</p>}

      <ul className="mt-5 flex-1 space-y-2.5">
        <li className="flex items-start gap-2 text-[13.5px] text-pine-700">
          <I name="check" size={16} className="mt-0.5 shrink-0 text-pine-600" />
          <span><strong>{unlimited(plan.limits.maxProducts)}</strong> pratos</span>
        </li>
        <li className="flex items-start gap-2 text-[13.5px] text-pine-700">
          <I name="check" size={16} className="mt-0.5 shrink-0 text-pine-600" />
          <span><strong>{unlimited(plan.limits.maxUsers)}</strong> usuários</span>
        </li>
        {plan.features.includes("analytics") && (
          <li className="flex items-start gap-2 text-[13.5px] text-pine-700">
            <I name="chart" size={16} className="mt-0.5 shrink-0 text-pine-600" /> Analytics
          </li>
        )}
        {plan.features.includes("scheduled_menu") && (
          <li className="flex items-start gap-2 text-[13.5px] text-pine-700">
            <I name="calendar" size={16} className="mt-0.5 shrink-0 text-pine-600" /> Cardápio agendado
          </li>
        )}
        {plan.features.includes("custom_domain") && (
          <li className="flex items-start gap-2 text-[13.5px] text-pine-700">
            <I name="globe" size={16} className="mt-0.5 shrink-0 text-pine-600" /> Domínio personalizado
          </li>
        )}
        {plan.features.includes("priority_support") && (
          <li className="flex items-start gap-2 text-[13.5px] text-pine-700">
            <I name="star" size={16} className="mt-0.5 shrink-0 text-pine-600" /> Suporte prioritário
          </li>
        )}
      </ul>

      <Button
        className="mt-6"
        full
        variant={plan.highlight ? "amber" : "secondary"}
        onClick={() => onSelect?.(planId)}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
