/* Gestão de tenants: suspender, reativar, alterar plano e impersonação auditada. */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAsyncData, useToast, useAuth } from "../../context/providers";
import { adminApi } from "../../lib/api";
import { PLANS, getPlan } from "../../lib/plans";
import type { Tenant } from "../../lib/types";
import { cn, formatDateTime } from "../../lib/utils";
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, Select, SkeletonRow, Textarea } from "../../components/ui";
import { TenantStatusPill } from "../../components/saas";
import { I } from "../../components/icons";

type Row = Tenant & { ownerName: string; ownerEmail: string; usage: { products: number; users: number; storageMb: number } };

export default function SuperTenants() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("todos");
  const [suspending, setSuspending] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [changingPlan, setChangingPlan] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload, set } = useAsyncData(() => adminApi.listTenants(), []);

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((t) => (planFilter === "todos" ? true : t.planId === planFilter))
        .filter((t) => `${t.name} ${t.slug} ${t.ownerEmail}`.toLowerCase().includes(query.toLowerCase())),
    [data, query, planFilter],
  );

  async function handleReactivate(t: Row) {
    setBusy(true);
    try {
      const updated = await adminApi.setTenantStatus(t.id, "active");
      set((d) => (d ? d.map((x) => (x.id === t.id ? { ...x, status: updated.status } : x)) : d));
      push("success", `${t.name} reativado.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao reativar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend() {
    if (!suspending) return;
    if (!reason.trim()) { push("error", "Informe o motivo da suspensão."); return; }
    setBusy(true);
    try {
      const updated = await adminApi.setTenantStatus(suspending.id, "suspended", reason.trim());
      set((d) => (d ? d.map((x) => (x.id === suspending.id ? { ...x, status: updated.status } : x)) : d));
      push("success", `${suspending.name} suspenso (registrado em auditoria).`);
      setSuspending(null); setReason("");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao suspender.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePlan(planId: string) {
    if (!changingPlan) return;
    setBusy(true);
    try {
      const updated = await adminApi.setTenantPlan(changingPlan.id, planId);
      set((d) => (d ? d.map((x) => (x.id === changingPlan.id ? { ...x, planId: updated.planId, status: updated.status } : x)) : d));
      push("success", `Plano de ${changingPlan.name} → ${getPlan(planId).name}.`);
      setChangingPlan(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao alterar o plano.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImpersonate(t: Row) {
    try {
      await adminApi.impersonate(t.id);
      await refresh();
      push("info", `Acessando ${t.name} como suporte (ação auditada).`);
      navigate("/app", { replace: true });
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro na impersonação.");
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Tenants</h1>
        <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Todos os restaurantes da plataforma, isolados entre si.</p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pine-400"><I name="search" size={17} /></span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, slug ou dono…" className="pl-10" aria-label="Buscar tenant" />
        </div>
        <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="sm:w-48" aria-label="Filtrar por plano">
          <option value="todos">Todos os planos</option>
          {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2.5"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="building" title="Nenhum tenant encontrado" description="Ajuste a busca ou o filtro." />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <article key={t.id} className="rounded-2xl border border-pine-100 bg-cream p-4 shadow-card transition-all hover:shadow-lift dark:border-pine-800 dark:bg-[#12211b]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pine-100 font-display text-[17px] font-bold text-pine-700 dark:bg-pine-800 dark:text-pine-200">
                  {t.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15.5px] font-extrabold text-pine-950 dark:text-cream">{t.name}</h2>
                    <TenantStatusPill status={t.status} />
                  </div>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-pine-500">
                    /r/{t.slug} · <span className="text-pine-700 dark:text-pine-200">{getPlan(t.planId).name}</span> · {t.ownerName} ({t.ownerEmail})
                  </p>
                  <p className="text-[11.5px] font-semibold text-pine-400">
                    criado {formatDateTime(t.createdAt)} · {t.usage.products} pratos · {t.usage.users} usuário(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon="eye" onClick={() => handleImpersonate(t)}>Entrar como</Button>
                  <Button size="sm" variant="secondary" icon="creditCard" onClick={() => setChangingPlan(t)}>Plano</Button>
                  {t.status === "suspended" ? (
                    <Button size="sm" variant="amber" icon="check" loading={busy} onClick={() => handleReactivate(t)}>Reativar</Button>
                  ) : (
                    <Button size="sm" variant="danger" icon="alert" onClick={() => setSuspending(t)}>Suspender</Button>
                  )}
                  <a href={`#/r/${t.slug}`} className="inline-flex h-9 items-center rounded-lg border border-pine-200 px-3 text-[12.5px] font-bold text-pine-600 hover:border-pine-400 dark:border-pine-700 dark:text-pine-300">
                    <I name="external" size={14} className="mr-1" /> Site
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Suspender com motivo obrigatório */}
      <Modal open={Boolean(suspending)} onClose={() => !busy && setSuspending(null)} title={`Suspender ${suspending?.name}?`}
        subtitle="O mini-site sai do ar e o painel fica bloqueado. A ação fica registrada em auditoria."
        footer={<div className="flex justify-end gap-2.5"><Button variant="ghost" onClick={() => setSuspending(null)} disabled={busy}>Cancelar</Button><Button variant="danger" icon="alert" loading={busy} onClick={handleSuspend}>Suspender tenant</Button></div>}
      >
        <Field label="Motivo da suspensão" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: inadimplência, violação de termos…" maxLength={200} />
        </Field>
      </Modal>

      {/* Alterar plano */}
      <Modal open={Boolean(changingPlan)} onClose={() => !busy && setChangingPlan(null)} title={`Plano de ${changingPlan?.name}`}
        subtitle={`Plano atual: ${changingPlan ? getPlan(changingPlan.planId).name : ""}`}
        footer={null}
      >
        <div className="space-y-2.5">
          {PLANS.map((p) => (
            <button key={p.id} onClick={() => handleChangePlan(p.id)} disabled={busy}
              className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all", changingPlan?.planId === p.id ? "border-saffron-400 bg-saffron-50 dark:bg-saffron-900/20" : "border-pine-200 hover:border-pine-400 dark:border-pine-700")}>
              <span>
                <span className="block text-[14px] font-extrabold text-pine-950 dark:text-cream">{p.name}</span>
                <span className="text-[12px] font-semibold text-pine-500">{p.tagline}</span>
              </span>
              <span className="text-[14px] font-extrabold text-saffron-700">{p.priceMonthly === 0 ? "Grátis" : `R$ ${p.priceMonthly}/mês`}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
