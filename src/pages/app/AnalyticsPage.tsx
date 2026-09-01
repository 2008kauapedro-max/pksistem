/* Analytics do mini-site (recurso por plano). */
import { useMemo } from "react";
import { useAuth, useAsyncData } from "../../context/providers";
import { api } from "../../lib/api";
import { hasFeature } from "../../lib/plans";
import { ErrorState, SkeletonRow } from "../../components/ui";
import { Stat, UpgradeGate } from "../../components/saas";
import type { AnalyticsKind } from "../../lib/types";

const KIND_LABEL: Record<AnalyticsKind, string> = {
  site_view: "Visualizações do site",
  menu_view: "Visualizações do cardápio",
  dish_view: "Pratos visualizados",
  whatsapp_click: "Cliques no WhatsApp",
  order_started: "Pedidos iniciados",
  order_completed: "Pedidos concluídos",
};

export default function AnalyticsPage() {
  const { membership } = useAuth();
  const tenant = membership?.tenant;
  const tenantId = tenant?.id ?? "";
  const allowed = hasFeature(tenant ?? null, "analytics");

  const { data, loading, error, reload } = useAsyncData(
    () => (allowed ? api.getAnalytics(tenantId, 14) : Promise.resolve([])),
    [tenantId, allowed],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    (data ?? []).filter((e) => e.kind === "site_view").forEach((e) => {
      const day = e.createdAt.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const count = (k: AnalyticsKind) => (data ?? []).filter((e) => e.kind === k).length;
  const max = Math.max(1, ...byDay.map(([, v]) => v));

  const topDishes = useMemo(() => {
    const m = new Map<string, number>();
    (data ?? []).filter((e) => e.kind === "dish_view" && e.label).forEach((e) => m.set(e.label as string, (m.get(e.label as string) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data]);

  if (!tenant) return null;

  if (!allowed) {
    return (
      <div className="animate-fade-up">
        <Header />
        <UpgradeGate feature="O Analytics" currentPlanId={tenant.planId} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <Header />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3"><SkeletonRow /><SkeletonRow /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon="eye" label="Visitas ao site" value={count("site_view")} tone="pine" />
            <Stat icon="menuBook" label="Vistas do cardápio" value={count("menu_view")} tone="pine" />
            <Stat icon="whatsapp" label="Cliques WhatsApp" value={count("whatsapp_click")} tone="amber" />
            <Stat icon="lunchbox" label="Pedidos iniciados" value={count("order_started")} tone="clay" hint={`${count("order_completed")} concluídos`} />
          </div>

          <p className="text-[12px] font-semibold text-pine-500">
            “Pedido iniciado” = cliente abriu o WhatsApp. “Concluído” = confirmado pelo restaurante. Não tratamos início como venda.
          </p>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
              <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">Visitas nos últimos 14 dias</h2>
              <div className="mt-5 flex h-44 items-end gap-1.5">
                {byDay.map(([day, v]) => (
                  <div key={day} className="group flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-pine-400 opacity-0 transition-opacity group-hover:opacity-100">{v}</span>
                    <div
                      className="w-full rounded-t-md bg-pine-600 transition-all duration-300 group-hover:bg-saffron-400"
                      style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}
                      title={`${day}: ${v} visitas`}
                    />
                    <span className="text-[9px] font-semibold text-pine-400">{day.slice(8)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
              <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">Pratos mais vistos</h2>
              {topDishes.length === 0 ? (
                <p className="mt-4 text-[13px] font-semibold text-pine-500">Ainda sem dados de pratos.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topDishes.map(([name, v], i) => (
                    <div key={name}>
                      <div className="mb-1 flex items-baseline justify-between text-[13px] font-bold">
                        <span className="text-pine-800 dark:text-pine-100">{i + 1}. {name}</span>
                        <span className="text-pine-500">{v}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-pine-100 dark:bg-pine-900">
                        <div className="h-full rounded-full bg-saffron-400" style={{ width: `${(v / topDishes[0][1]) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6">
      <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Analytics</h1>
      <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Como os clientes estão interagindo com seu site.</p>
    </header>
  );
}

void KIND_LABEL;
