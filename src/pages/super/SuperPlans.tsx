/* Planos & receita: catálogo de planos (configurável) e receita por plano (simulada). */
import { useMemo } from "react";
import { useAsyncData } from "../../context/providers";
import { adminApi } from "../../lib/api";
import { PLANS, FEATURES, formatPrice } from "../../lib/plans";
import { ErrorState, SkeletonRow } from "../../components/ui";
import { I } from "../../components/icons";

export default function SuperPlans() {
  const { data: tenants, loading, error, reload } = useAsyncData(() => adminApi.listTenants(), []);

  const revenueByPlan = useMemo(() => {
    return PLANS.map((p) => {
      const count = (tenants ?? []).filter((t) => t.planId === p.id && t.status !== "canceled" && t.status !== "suspended").length;
      return { plan: p, count, mrr: count * p.priceMonthly };
    });
  }, [tenants]);

  const unlimited = (v: number) => (v === -1 ? "Ilimitado" : v.toLocaleString("pt-BR"));

  return (
    <div className="animate-fade-up space-y-7">
      <header>
        <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Planos & receita</h1>
        <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">
          Preços e limites são configuráveis aqui (e no banco, em produção) — nunca espalhados no código da interface.
        </p>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3"><SkeletonRow /><SkeletonRow /></div>
      ) : (
        <>
          {/* Receita por plano */}
          <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
            <h2 className="font-display text-[17px] font-bold text-pine-950 dark:text-cream">Receita por plano <span className="text-[11px] font-bold uppercase text-saffron-700">simulado</span></h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {revenueByPlan.map(({ plan, count, mrr }) => (
                <div key={plan.id} className="rounded-xl bg-paper p-4 dark:bg-[#0f1c16]">
                  <p className="text-[13px] font-extrabold text-pine-950 dark:text-cream">{plan.name}</p>
                  <p className="mt-1 font-display text-[22px] font-bold text-pine-800 dark:text-saffron-300">{formatPrice(mrr)}</p>
                  <p className="text-[11.5px] font-semibold text-pine-500">{count} tenant(s) · {formatPrice(plan.priceMonthly)}/mês cada</p>
                </div>
              ))}
            </div>
          </section>

          {/* Catálogo de planos */}
          <section>
            <h2 className="mb-4 font-display text-[18px] font-bold text-pine-950 dark:text-cream">Catálogo de planos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((p) => (
                <article key={p.id} className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-[18px] font-bold text-pine-950 dark:text-cream">{p.name}</h3>
                    <span className="text-[15px] font-extrabold text-saffron-700">{formatPrice(p.priceMonthly)}/mês</span>
                  </div>
                  <p className="text-[12.5px] font-semibold text-pine-500">{p.tagline} · anual {formatPrice(p.priceAnnual)}</p>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                    {[
                      ["Pratos", unlimited(p.limits.maxProducts)],
                      ["Categorias", unlimited(p.limits.maxCategories)],
                      ["Usuários", unlimited(p.limits.maxUsers)],
                      ["Storage", `${unlimited(p.limits.maxStorageMb)} MB`],
                    ].map(([k, v]) => (
                      <p key={k} className="flex justify-between font-semibold"><span className="text-pine-500">{k}</span><span className="font-extrabold text-pine-800 dark:text-pine-100">{v}</span></p>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.features.map((f) => (
                      <span key={f} className="rounded-full bg-pine-100 px-2.5 py-1 text-[11px] font-extrabold text-pine-700 dark:bg-pine-800 dark:text-pine-200">
                        {FEATURES[f].name}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[12.5px] font-semibold text-pine-500">
              <I name="info" size={15} /> Recursos são entitlements (<code>feature_*</code>) — o acesso é validado no backend, não pelo nome do plano.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
