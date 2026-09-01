/* Visão geral do Super Admin: métricas da plataforma (MRR/ARR simulados no demo). */
import { Link } from "react-router-dom";
import { useAsyncData } from "../../context/providers";
import { adminApi } from "../../lib/api";
import { getPlan } from "../../lib/plans";
import { ErrorState, SkeletonRow } from "../../components/ui";
import { Stat, TenantStatusPill } from "../../components/saas";
import { I } from "../../components/icons";

export default function SuperDashboard() {
  const { data, loading, error, reload } = useAsyncData(() => adminApi.overview(), []);

  return (
    <div className="animate-fade-up space-y-7">
      <header>
        <h1 className="font-display text-[clamp(1.7rem,4vw,2.3rem)] font-bold text-pine-950 dark:text-cream">Visão geral</h1>
        <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">A saúde da plataforma PKSISTEM em tempo real.</p>
      </header>

      <div className="rounded-xl border border-saffron-300/60 bg-saffron-50 px-4 py-3 text-[12.5px] font-semibold text-saffron-900 dark:border-saffron-700 dark:bg-saffron-900/20 dark:text-saffron-200">
        Valores de receita são <strong>simulados</strong> neste demo (sem provedor de pagamento conectado). A arquitetura de billing + webhooks está pronta.
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !data ? (
        <div className="space-y-3"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon="trend" label="MRR" value={`R$ ${data.mrr.toLocaleString("pt-BR")}`} hint={`ARR ~ R$ ${data.arr.toLocaleString("pt-BR")}`} tone="amber" />
            <Stat icon="building" label="Tenants" value={data.tenantsTotal} hint={`${data.tenantsActive} ativos`} tone="pine" />
            <Stat icon="zap" label="Em trial" value={data.trials} tone="pine" />
            <Stat icon="users" label="Usuários" value={data.usersTotal} tone="pine" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-bold text-pine-950 dark:text-cream">Cadastros recentes</h2>
                <Link to="/super/tenants" className="text-[13px] font-extrabold text-saffron-700 hover:underline">Ver todos →</Link>
              </div>
              <div className="space-y-2.5">
                {data.recentSignups.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-paper px-4 py-3 dark:bg-[#0f1c16]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-100 font-display text-[14px] font-bold text-pine-700 dark:bg-pine-800 dark:text-pine-200">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-extrabold text-pine-950 dark:text-cream">{t.name}</p>
                      <p className="text-[11.5px] font-semibold text-pine-500">/r/{t.slug} · plano {getPlan(t.planId).name}</p>
                    </div>
                    <TenantStatusPill status={t.status} />
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
                <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">Saúde da plataforma</h2>
                <div className="mt-3 space-y-2.5">
                  {[
                    { label: "API", ok: true },
                    { label: "Sites públicos", ok: true },
                    { label: "Painéis", ok: true },
                    { label: "Webhooks de pagamento", ok: false, note: "não configurado (demo)" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-[13px] font-bold">
                      <span className="text-pine-700 dark:text-pine-200">{s.label}</span>
                      <span className={s.ok ? "flex items-center gap-1.5 text-pine-600" : "flex items-center gap-1.5 text-saffron-700"}>
                        <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-pine-600" : "bg-saffron-500"}`} />
                        {s.ok ? "Operacional" : s.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
                <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">Atividade</h2>
                <p className="mt-2 text-[13px] font-semibold text-pine-600 dark:text-pine-300">
                  {data.ordersTotal} pedidos · {data.eventsTotal} eventos de analytics · {data.suspended} tenant(s) suspensos
                </p>
                <Link to="/super/auditoria" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-saffron-700 hover:underline">
                  <I name="shield" size={15} /> Ver auditoria completa
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
