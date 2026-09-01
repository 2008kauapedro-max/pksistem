/* Assinatura: plano atual, uso, upgrade (billing simulado), exportação e exclusão. */
import { useState } from "react";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import { PLANS, getPlan, usagePercent, formatPrice } from "../../lib/plans";
import { Progress, TenantStatusPill } from "../../components/saas";
import { Button, ConfirmDialog, Input, SkeletonRow, ErrorState } from "../../components/ui";
import { I } from "../../components/icons";
import { cn } from "../../lib/utils";

export default function SubscriptionPage() {
  const { membership, refresh } = useAuth();
  const { push } = useToast();
  const tenant = membership?.tenant;
  const tenantId = tenant?.id ?? "";
  const canBilling = membership?.role === "owner" || membership?.role === "admin";

  const [changingTo, setChangingTo] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: usage, loading, error, reload } = useAsyncData(() => api.getUsage(tenantId), [tenantId]);

  if (!tenant) return null;
  const plan = getPlan(tenant.planId);

  async function handleChangePlan(planId: string) {
    setChangingTo(planId);
    try {
      await api.changePlan(tenantId, planId);
      await refresh();
      push("success", `Plano alterado para ${getPlan(planId).name}. (cobrança simulada neste demo)`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao alterar o plano.");
    } finally {
      setChangingTo(null);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      await api.cancelSubscription(tenantId);
      await refresh();
      push("info", "Assinatura cancelada. Seus dados permanecem guardados.");
      setCancelOpen(false);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao cancelar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api.requestDeletion(tenantId);
      await refresh();
      push("info", "Exclusão solicitada. O site saiu do ar e os dados serão removidos após o período de retenção.");
      setDeleteOpen(false);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao solicitar exclusão.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport(format: "json" | "csv") {
    try {
      const content = await api.exportData(tenantId, format);
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saborflow-${tenantId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      push("success", `Exportação ${format.toUpperCase()} baixada.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao exportar.");
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Assinatura</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Seu plano, uso e cobrança.</p>
        </div>
        <TenantStatusPill status={tenant.status} />
      </header>

      {/* Plano atual + uso */}
      <div className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-pine-500">Plano atual</p>
            <p className="font-display text-[26px] font-bold text-pine-950 dark:text-cream">{plan.name}</p>
            <p className="text-[13px] font-semibold text-pine-500">{formatPrice(plan.priceMonthly)}/mês · {plan.tagline}</p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold text-pine-500">
            <I name="creditCard" size={16} />
            Cobrança: arquitetura pronta (provedor + webhooks). Valores simulados no demo.
          </div>
        </div>

        {error ? (
          <div className="mt-4"><ErrorState message={error} onRetry={reload} /></div>
        ) : loading || !usage ? (
          <div className="mt-4 space-y-2"><SkeletonRow /><SkeletonRow /></div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Pratos", key: "maxProducts" as const, used: usage.products },
              { label: "Usuários", key: "maxUsers" as const, used: usage.users },
              { label: "Armazenamento (MB)", key: "maxStorageMb" as const, used: usage.storageMb },
            ].map((row) => {
              const pct = usagePercent(plan, row.key, usage);
              const limit = plan.limits[row.key];
              return (
                <div key={row.key}>
                  <div className="mb-1 flex items-baseline justify-between text-[12.5px] font-bold">
                    <span className="text-pine-700 dark:text-pine-200">{row.label}</span>
                    <span className="text-pine-500">{limit === -1 ? `${row.used} · ilimitado` : `${row.used} / ${limit}`}</span>
                  </div>
                  <Progress value={pct} tone={pct >= 90 ? "danger" : pct >= 70 ? "amber" : "pine"} />
                  {pct >= 90 && limit !== -1 && <p className="mt-1 text-[11px] font-bold text-[#a83a2a]">Você usou {pct}% do limite.</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Planos */}
      {canBilling && (
        <div>
          <h2 className="mb-4 font-display text-[18px] font-bold text-pine-950 dark:text-cream">Mudar de plano</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => {
              const current = p.id === tenant.planId;
              return (
                <div key={p.id} className={cn("flex flex-col rounded-2xl border bg-cream p-4.5 shadow-card dark:bg-[#12211b]", current ? "border-saffron-400 ring-2 ring-saffron-400/40" : "border-pine-100 dark:border-pine-800")}>
                  <p className="font-display text-[17px] font-bold text-pine-950 dark:text-cream">{p.name}</p>
                  <p className="text-[12px] font-semibold text-pine-500">{formatPrice(p.priceMonthly)}/mês</p>
                  <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-pine-600 dark:text-pine-300">{p.tagline}</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    full
                    variant={current ? "secondary" : p.highlight ? "amber" : "secondary"}
                    disabled={current}
                    loading={changingTo === p.id}
                    onClick={() => handleChangePlan(p.id)}
                  >
                    {current ? "Plano atual" : `Mudar para ${p.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exportação + zona de perigo */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
          <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">Exportar meus dados</h2>
          <p className="mt-1 text-[13px] text-pine-600 dark:text-pine-300">Baixe seus pratos, pedidos e clientes. Só os seus — nunca de outro restaurante.</p>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" icon="download" onClick={() => handleExport("csv")}>CSV</Button>
            <Button variant="secondary" icon="download" onClick={() => handleExport("json")}>JSON</Button>
          </div>
        </div>

        {membership?.role === "owner" && (
          <div className="rounded-2xl border border-[#e2bcbc] bg-[#fdf6f4] p-5 dark:border-[#7e2a1a]/40 dark:bg-[#3a1a12]">
            <h2 className="font-display text-[16px] font-bold text-[#7e2a1a] dark:text-[#ffb4a0]">Zona de perigo</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8f4630] dark:text-[#e8c3b8]">
              Cancelar pausa a assinatura (dados preservados). Excluir remove o restaurante após o período de retenção.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {tenant.status !== "canceled" && <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancelar assinatura</Button>}
              <Button variant="danger" icon="trash" onClick={() => setDeleteOpen(true)}>Excluir restaurante</Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancelar assinatura?"
        message="Seu site continua no ar até o fim do período pago. Depois ele fica limitado, mas seus dados não são apagados."
        confirmLabel="Cancelar assinatura"
        loading={busy}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
      />

      <div className={cn("fixed inset-0 z-[80] items-center justify-center bg-pine-950/60 px-4", deleteOpen ? "flex animate-fade-in" : "hidden")} role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl border border-pine-100 bg-cream p-6 shadow-pop animate-scale-in dark:border-pine-800 dark:bg-[#12211b]">
          <h3 className="font-display text-[20px] font-bold text-[#7e2a1a]">Excluir {tenant.name}?</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-pine-600 dark:text-pine-300">
            Isso remove o mini-site, pratos, pedidos e configurações após o período de retenção. <strong>Exporte seus dados antes.</strong> Esta ação não pode ser desfeita.
          </p>
          <p className="mt-3 text-[13px] font-bold text-pine-800 dark:text-pine-100">Digite <span className="text-[#a83a2a]">{tenant.slug}</span> para confirmar:</p>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={tenant.slug} className="mt-2" />
          <div className="mt-5 flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }} disabled={busy}>Voltar</Button>
            <Button variant="danger" icon="trash" disabled={deleteConfirm !== tenant.slug} loading={busy} onClick={handleDelete}>
              Excluir definitivamente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
