/* Dashboard do restaurante: resumo do dia, uso do plano e ações rápidas. */
import { Link } from "react-router-dom";
import { useAuth, useAsyncData } from "../../context/providers";
import { api } from "../../lib/api";
import { getPlan, usagePercent, hasFeature } from "../../lib/plans";
import { formatDateLong, greeting, todayISO } from "../../lib/utils";
import { Stat, Progress, TenantStatusPill } from "../../components/saas";
import { Button, SkeletonRow, ErrorState, FoodImage } from "../../components/ui";
import { I, type IconName } from "../../components/icons";

export default function DashboardPage() {
  const { membership } = useAuth();
  const tenantId = membership?.tenant.id ?? "";
  const today = todayISO();

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [menu, orders, foods, usage] = await Promise.all([
      api.listMenu(tenantId, today),
      api.listOrders(tenantId),
      api.listFoods(tenantId),
      api.getUsage(tenantId),
    ]);
    return { menu, orders, foods, usage };
  }, [tenantId, today]);

  if (!membership) return null;
  const { tenant, user } = membership;
  const plan = getPlan(tenant.planId);

  const pending = data?.orders.filter((o) => o.status === "pendente").length ?? 0;
  const todayOrders = data?.orders.filter((o) => o.createdAt.startsWith(today)).length ?? 0;

  const quick: Array<{ to: string; icon: IconName; label: string }> = [
    { to: "/app/pratos", icon: "plus", label: "Adicionar prato" },
    { to: "/app/cardapio", icon: "menuBook", label: "Montar cardápio" },
    { to: "/app/site", icon: "palette", label: "Personalizar site" },
    { to: `/r/${tenant.slug}`, icon: "globe", label: "Ver site" },
  ];

  return (
    <div className="animate-fade-up space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-bold capitalize text-saffron-700">{formatDateLong(today)}</p>
          <h1 className="mt-1 font-display text-[clamp(1.7rem,4vw,2.3rem)] font-bold text-pine-950 dark:text-cream">
            {greeting()}, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Veja como está o {tenant.name} hoje.</p>
        </div>
        <TenantStatusPill status={tenant.status} />
      </header>

      {tenant.status === "trialing" && tenant.trialEndsAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-saffron-300 bg-saffron-50 px-5 py-4 dark:border-saffron-700 dark:bg-saffron-900/20">
          <p className="flex items-center gap-2 text-[13.5px] font-bold text-saffron-900 dark:text-saffron-200">
            <I name="zap" size={17} /> Seu trial do plano Pro vai até {new Date(tenant.trialEndsAt).toLocaleDateString("pt-BR")}.
          </p>
          <Link to="/app/assinatura"><Button size="sm" variant="amber" icon="creditCard">Ver planos</Button></Link>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : data ? (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon="menuBook" label="Pratos hoje" value={data.menu.length} tone="pine" />
            <Stat icon="lunchbox" label="Marmitas hoje" value={todayOrders} tone="amber" />
            <Stat icon="clock" label="Pendentes" value={pending} tone="clay" />
            <Stat icon="book" label="Pratos salvos" value={data.foods.filter((f) => f.active).length} tone="pine" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Cardápio de hoje */}
            <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-bold text-pine-950 dark:text-cream">Cardápio de hoje</h2>
                <Link to="/app/cardapio" className="text-[13px] font-extrabold text-saffron-700 hover:underline">Gerenciar →</Link>
              </div>
              {data.menu.length === 0 ? (
                <p className="rounded-xl border border-dashed border-pine-300 px-4 py-6 text-center text-[13.5px] font-semibold text-pine-600">
                  Nenhum prato publicado hoje. Monte seu cardápio para aparecer no site.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {data.menu.slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-pine-100 bg-paper p-2 dark:border-pine-800 dark:bg-[#0f1c16]">
                      <FoodImage src={m.food?.imageUrl ?? null} alt={m.food?.name ?? ""} category={m.food?.category} className="h-10 w-10 shrink-0 rounded-lg" />
                      <p className="truncate text-[12.5px] font-extrabold text-pine-950 dark:text-cream">{m.food?.name}</p>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="mb-3 mt-6 font-display text-[15px] font-bold text-pine-950 dark:text-cream">Marmitas recentes</h3>
              {data.orders.length === 0 ? (
                <p className="text-[13px] font-semibold text-pine-500">Nenhuma marmita ainda.</p>
              ) : (
                <div className="space-y-2">
                  {data.orders.slice(0, 4).map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3.5 py-2.5 dark:bg-[#0f1c16]">
                      <p className="min-w-0 truncate text-[13px] font-extrabold text-pine-950 dark:text-cream">
                        <span className="text-pine-400">#{o.number}</span> {o.customerName}
                      </p>
                      <span className="shrink-0 rounded-full bg-pine-100 px-2.5 py-1 text-[11px] font-extrabold capitalize text-pine-800 dark:bg-pine-800 dark:text-pine-100">{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Uso do plano + ações rápidas */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">Plano {plan.name}</h2>
                  <Link to="/app/assinatura" className="text-[12.5px] font-extrabold text-saffron-700 hover:underline">Gerenciar</Link>
                </div>
                <p className="text-[12px] font-semibold text-pine-500">Uso dos limites do seu plano</p>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Pratos", key: "maxProducts" as const, used: data.usage.products },
                    { label: "Usuários", key: "maxUsers" as const, used: data.usage.users },
                    { label: "Armazenamento (MB)", key: "maxStorageMb" as const, used: data.usage.storageMb },
                  ].map((row) => {
                    const pct = usagePercent(plan, row.key, data.usage);
                    const limit = plan.limits[row.key];
                    return (
                      <div key={row.key}>
                        <div className="mb-1 flex items-baseline justify-between text-[12.5px] font-bold">
                          <span className="text-pine-700 dark:text-pine-200">{row.label}</span>
                          <span className="text-pine-500">{limit === -1 ? `${row.used} · ilimitado` : `${row.used} / ${limit}`}</span>
                        </div>
                        <Progress value={pct} tone={pct >= 90 ? "danger" : pct >= 70 ? "amber" : "pine"} />
                      </div>
                    );
                  })}
                </div>
                {pctProductsHigh(plan, data.usage) && (
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-[#a83a2a]">
                    <I name="alert" size={14} /> Você está perto do limite de pratos. Considere um upgrade.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
                <h2 className="mb-3 font-display text-[16px] font-bold text-pine-950 dark:text-cream">Ações rápidas</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {quick.map((q) => (
                    <a key={q.label} href={`#${q.to}`} className="group flex flex-col items-start gap-2 rounded-xl border border-pine-100 bg-paper p-3.5 transition-all hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-card dark:border-pine-800 dark:bg-[#0f1c16]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine-100 text-pine-700 transition-colors group-hover:bg-saffron-400 group-hover:text-pine-950 dark:bg-pine-800 dark:text-pine-200">
                        <I name={q.icon} size={17} />
                      </span>
                      <span className="text-[12.5px] font-extrabold leading-tight text-pine-950 dark:text-cream">{q.label}</span>
                    </a>
                  ))}
                </div>
                {!hasFeature(tenant, "analytics") && (
                  <p className="mt-3 text-[11.5px] font-semibold text-pine-500">Analytics e mais recursos disponíveis nos planos pagos.</p>
                )}
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}

function pctProductsHigh(plan: ReturnType<typeof getPlan>, usage: { products: number }): boolean {
  return plan.limits.maxProducts !== -1 && usage.products / plan.limits.maxProducts >= 0.9;
}
