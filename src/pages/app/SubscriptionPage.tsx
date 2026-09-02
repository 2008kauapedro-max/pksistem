/* Assinatura: plano atual, uso, upgrade (via WhatsApp), exportação e exclusão. */
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

  // NOVO: Estado para controlar Mensal vs Anual
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: usage, loading, error, reload } = useAsyncData(() => api.getUsage(tenantId), [tenantId]);

  if (!tenant) return null;
  const plan = getPlan(tenant.planId);

  // ATUALIZADO: Função que redireciona para o WhatsApp com os dados e o preço correto
  function handleWhatsAppPlanClick(planName: string, displayPrice: number, isPromo: boolean) {
    if (!membership?.user || !membership?.tenant) {
      push("error", "Erro ao identificar conta. Tente fazer login novamente.");
      return;
    }

    const userEmail = membership.user.email;
    const businessName = membership.tenant.name;
    const promoText = isPromo ? ` (Promoção 1º mês por ${formatPrice(displayPrice)})` : "";
    const cycleText = billingCycle === "annual" ? " (Plano Anual)" : "";

    const message = `Olá! 👋 Tenho interesse em assinar o plano *${planName}*${promoText}${cycleText} do PKSISTEM.\n\n` +
      `*Meus dados cadastrados:*\n` +
      `• Negócio: ${businessName}\n` +
      `• E-mail da conta: ${userEmail}\n\n` +
      `Gostaria de saber mais detalhes e como ativar!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/556199314884?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
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
      a.download = `pksistem-${tenantId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      push("success", `Exportação ${format.toUpperCase()} baixada.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao exportar.");
    }
  }

  return (
    <div className="animate-fade-up space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Assinatura</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Escolha o plano que faz sentido para o seu crescimento.</p>
        </div>
        <TenantStatusPill status={tenant.status} />
      </header>

      {/* Plano atual + uso (MANTIDO EXATAMENTE IGUAL) */}
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

      {/* NOVO: Seletor de Ciclo de Cobrança (Mensal / Anual) */}
      {canBilling && (
        <div className="flex flex-col items-center justify-center gap-3">
          <h2 className="font-display text-[18px] font-bold text-pine-950 dark:text-cream">Mudar de plano</h2>
          <div className="flex items-center gap-3 rounded-full border border-pine-200 bg-cream p-1.5 dark:border-pine-700 dark:bg-[#12211b]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-bold transition-all",
                billingCycle === "monthly" ? "bg-pine-950 text-cream dark:bg-cream dark:text-pine-950" : "text-pine-600 hover:text-pine-900 dark:text-pine-400"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={cn(
                "relative rounded-full px-5 py-2 text-sm font-bold transition-all",
                billingCycle === "annual" ? "bg-saffron-400 text-pine-950" : "text-pine-600 hover:text-pine-900 dark:text-pine-400"
              )}
            >
              Anual
              <span className="absolute -right-2 -top-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                -20%
              </span>
            </button>
          </div>
          {billingCycle === "annual" && (
            <p className="text-center text-xs font-semibold text-green-600 dark:text-green-400">
              💡 Economize 20% pagando anualmente. Cobrança única no cartão.
            </p>
          )}
        </div>
      )}

      {/* ATUALIZADO: Grade de Planos (Agora 3 colunas para caber os 6 planos sem esmagar) */}
      {canBilling && (
        <div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((p) => {
              const current = p.id === tenant.planId;
              
              // Lógica de preço: Se for anual, mostra preço anual/12. Se for mensal e não for o plano atual, mostra o preço do 1º mês.
              const displayPrice = billingCycle === "annual" ? (p.priceAnnual / 12) : (current ? p.priceMonthly : (p.firstMonthPrice ?? p.priceMonthly));
              const isPromo = billingCycle === "monthly" && !current && (p.firstMonthPrice ?? 0) < p.priceMonthly;
              const savings = p.priceMonthly - (p.firstMonthPrice ?? p.priceMonthly);

              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-cream p-5 shadow-card transition-all hover:shadow-lg dark:bg-[#12211b]",
                    p.highlight && !current ? "border-saffron-400 ring-2 ring-saffron-400/30" : "border-pine-100 dark:border-pine-800",
                    current && "border-pine-400 ring-2 ring-pine-400/30"
                  )}
                >
                  {p.highlight && !current && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-saffron-400 px-3 py-1 text-[11px] font-extrabold text-pine-950 shadow-sm">
                      ⭐ MAIS POPULAR
                    </span>
                  )}
                  {current && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pine-950 px-3 py-1 text-[11px] font-extrabold text-cream dark:bg-cream dark:text-pine-950">
                      SEU PLANO
                    </span>
                  )}

                  <div className="mb-4">
                    <h3 className="font-display text-[18px] font-bold text-pine-950 dark:text-cream">{p.name}</h3>
                    <p className="text-[12px] font-medium text-pine-500">{p.tagline}</p>
                  </div>

                  <div className="mb-5">
                    {p.isEnterprise ? (
                      <div className="flex flex-col">
                        <span className="font-display text-[28px] font-bold text-pine-950 dark:text-cream">Sob Consulta</span>
                        <span className="text-xs text-pine-500">Para redes e operações em escala</span>
                      </div>
                    ) : isPromo ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-pine-400 line-through">{formatPrice(p.priceMonthly)}/mês</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-[32px] font-extrabold text-pine-950 dark:text-cream">{formatPrice(p.firstMonthPrice!)}</span>
                          <span className="text-sm font-bold text-pine-600 dark:text-pine-300">no 1º mês</span>
                        </div>
                        <span className="text-xs text-pine-500">Depois {formatPrice(p.priceMonthly)}/mês</span>
                        <span className="mt-2 inline-block w-fit rounded bg-green-100 px-2 py-1 text-[11px] font-extrabold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          🔥 Economize {formatPrice(savings)} hoje!
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-display text-[32px] font-extrabold text-pine-950 dark:text-cream">
                          {formatPrice(displayPrice)}
                        </span>
                        <span className="text-sm text-pine-500">
                          {billingCycle === "annual" ? "/mês (cobrado anualmente)" : "/mês"}
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="mb-6 flex-1 space-y-2.5 text-sm">
                    {p.features.slice(0, 5).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-pine-700 dark:text-pine-200">
                        <I name="check" size={16} className="mt-0.5 shrink-0 text-saffron-600" />
                        <span className="text-xs">{FEATURES[feature as FeatureId]?.name || feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-auto"
                    size="sm"
                    full
                    variant={current ? "ghost" : p.highlight ? "amber" : "secondary"}
                    disabled={current}
                    onClick={() => handleWhatsAppPlanClick(p.name, displayPrice, isPromo)}
                    icon={p.isEnterprise ? "message" : "zap"}
                  >
                    {current ? "Plano atual" : p.isEnterprise ? "Falar com especialista" : `Começar com ${p.name}`}
                  </Button>
                  
                  {!current && !p.isEnterprise && (
                    <p className="mt-2 text-center text-[11px] text-pine-500">
                      Redireciona para o WhatsApp
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exportação + zona de perigo (MANTIDO EXATAMENTE IGUAL) */}
      <div className="grid gap-6 lg:grid-cols-2 pt-8 border-t border-pine-200 dark:border-pine-800">
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