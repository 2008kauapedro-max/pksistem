/* Clientes: lista organizada + cadastro manual + histórico de pedidos + retenção. */
import { useMemo, useState } from "react";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import type { ClientRetention, CustomerWithStats, Order } from "../../lib/types";
import { STATUS_LABEL } from "../../lib/utils";
import { cn, formatBRL, formatDateTime } from "../../lib/utils";
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, SkeletonRow, StatusBadge } from "../../components/ui";
import { I } from "../../components/icons";

const RETENTION_PRESETS: Array<{ label: string; days: number }> = [
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "3 semanas", days: 21 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
];

export default function CustomersPage() {
  const { membership, refresh } = useAuth();
  const { push } = useToast();
  const tenant = membership?.tenant;
  const tenantId = tenant?.id ?? "";
  const retention: ClientRetention = tenant?.clientRetention ?? { mode: "manual", days: 0 };

  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<CustomerWithStats | null>(null);
  const [showRetention, setShowRetention] = useState(false);
  const [customDays, setCustomDays] = useState("45");

  const { data: customers, loading, error, reload, set } = useAsyncData(() => api.listCustomers(tenantId), [tenantId]);
  const { data: orders } = useAsyncData(() => api.listOrders(tenantId), [tenantId]);

  const selectedOrders = useMemo(
    () => (selected ? (orders ?? []).filter((o) => o.customerId === selected.id || (o.customerName === selected.name && !o.customerId)) : []),
    [selected, orders],
  );

  async function handleRetention(mode: "manual" | "auto", days: number) {
    try {
      await api.setClientRetention(tenantId, { mode, days });
      await refresh();
      push("success", mode === "manual" ? "Retenção manual: todos os clientes ficam salvos." : `Clientes inativos há mais de ${days} dias serão removidos automaticamente.`);
      setShowRetention(false);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao salvar a retenção.");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api.deleteCustomer(tenantId, deleting.id);
      set((d) => (d ? d.filter((c) => c.id !== deleting.id) : d));
      push("success", `Cliente "${deleting.name}" removido. O histórico de pedidos foi preservado.`);
      setSelected(null);
      setDeleting(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao excluir o cliente.");
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Clientes</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">
            Quem já pediu no seu negócio — clique em um cliente para ver o histórico dele.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" icon="clock" onClick={() => setShowRetention(true)}>
            {retention.mode === "auto" ? `Apagar inativos: ${retention.days}d` : "Retenção: manual"}
          </Button>
          <Button icon="plus" onClick={() => setShowAdd(true)}>Adicionar cliente</Button>
        </div>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2.5"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : (customers ?? []).length === 0 ? (
        <EmptyState
          icon="users"
          title="Nenhum cliente ainda"
          description="Quando alguém fizer um pedido pelo site (informando o nome) ou você cadastrar manualmente, aparece aqui."
          action={<Button icon="plus" onClick={() => setShowAdd(true)}>Adicionar cliente</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(customers ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelected(c); setEditing(false); }}
              className="group rounded-2xl border border-pine-100 bg-cream p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-lift dark:border-pine-800 dark:bg-pine-900"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-950 font-display text-[16px] font-bold text-saffron-300 dark:bg-saffron-400 dark:text-pine-950">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-extrabold text-pine-950 dark:text-cream">{c.name}</p>
                  <p className="truncate text-[12px] font-semibold text-pine-500 dark:text-pine-400">{c.phone || "sem telefone"}{c.email ? ` · ${c.email}` : ""}</p>
                </div>
                <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-[12px] font-extrabold text-saffron-800 dark:bg-saffron-900/40 dark:text-saffron-200">
                  {c.orderCount} {c.orderCount === 1 ? "pedido" : "pedidos"}
                </span>
              </div>
              <p className="mt-2.5 flex items-center justify-between text-[11.5px] font-semibold text-pine-500 dark:text-pine-400">
                <span>{c.lastOrderAt ? `Último: ${formatDateTime(c.lastOrderAt)}` : "Nenhum pedido registrado"}</span>
                <span className="font-extrabold text-saffron-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-saffron-300">Ver histórico →</span>
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ---- Histórico / edição do cliente ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={`${selected?.orderCount ?? 0} pedido(s) · cliente desde ${selected ? new Date(selected.createdAt).toLocaleDateString("pt-BR") : ""}`}
        size="lg"
        footer={
          selected && (
            <div className="flex flex-wrap justify-between gap-2.5">
              <Button variant="danger" icon="trash" onClick={() => setDeleting(selected)}>Excluir cliente</Button>
              <div className="flex gap-2.5">
                <Button variant="secondary" icon="gear" onClick={() => setEditing((v) => !v)}>{editing ? "Fechar edição" : "Editar dados"}</Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>
              </div>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {editing && (
              <EditCustomerForm
                customer={selected}
                tenantId={tenantId}
                onSaved={(c) => {
                  setSelected({ ...selected, ...c });
                  set((d) => (d ? d.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : d));
                  setEditing(false);
                  push("success", "Dados do cliente atualizados.");
                }}
              />
            )}

            <div className="grid gap-2.5 sm:grid-cols-3">
              <InfoTile icon="phone" label="Telefone" value={selected.phone || "—"} />
              <InfoTile icon="send" label="E-mail" value={selected.email || "—"} />
              <InfoTile icon="lunchbox" label="Pedidos" value={String(selected.orderCount)} />
            </div>

            <div>
              <h3 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-wide text-pine-500 dark:text-pine-400">Histórico de pedidos</h3>
              {selectedOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-pine-300 px-4 py-5 text-center text-[13px] font-semibold text-pine-500 dark:border-pine-700">
                  Nenhum pedido registrado para este cliente ainda.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedOrders.map((o) => (
                    <OrderRow key={o.id} order={o} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <AddCustomerModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        tenantId={tenantId}
        onAdded={(c) => {
          set((d) => (d ? [c, ...d] : [c]));
          setShowAdd(false);
        }}
      />

      {/* ---- Retenção ---- */}
      <Modal
        open={showRetention}
        onClose={() => setShowRetention(false)}
        title="Retenção de clientes"
        subtitle="O que fazer com clientes antigos?"
        footer={<div className="flex justify-end"><Button variant="ghost" onClick={() => setShowRetention(false)}>Fechar</Button></div>}
      >
        <div className="space-y-2.5">
          <button onClick={() => handleRetention("manual", 0)}
            className={cn("flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all", retention.mode === "manual" ? "border-saffron-500 bg-saffron-50 dark:bg-saffron-900/20" : "border-pine-200 hover:border-pine-400 dark:border-pine-700")}>
            <I name="users" size={18} className="mt-0.5 shrink-0 text-saffron-700 dark:text-saffron-300" />
            <span>
              <span className="block text-[14px] font-extrabold text-pine-950 dark:text-cream">Manual — guardar todos</span>
              <span className="text-[12px] text-pine-600 dark:text-pine-300">Todos os clientes ficam salvos para sempre. Você exclui manualmente quando quiser.</span>
            </span>
          </button>
          <div className={cn("rounded-xl border-2 p-3.5", retention.mode === "auto" ? "border-saffron-500 bg-saffron-50 dark:bg-saffron-900/20" : "border-pine-200 dark:border-pine-700")}>
            <p className="flex items-center gap-2 text-[14px] font-extrabold text-pine-950 dark:text-cream">
              <I name="clock" size={17} className="text-saffron-700 dark:text-saffron-300" /> Automática — apagar inativos
            </p>
            <p className="mt-0.5 text-[12px] text-pine-600 dark:text-pine-300">Clientes sem pedidos há mais de N dias são removidos (pedidos são preservados).</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {RETENTION_PRESETS.map((p) => (
                <button key={p.days} onClick={() => handleRetention("auto", p.days)}
                  className={cn("rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all", retention.mode === "auto" && retention.days === p.days ? "border-pine-950 bg-pine-950 text-saffron-300 dark:bg-saffron-400 dark:text-pine-950" : "border-pine-200 text-pine-700 hover:border-saffron-500 dark:border-pine-700 dark:text-pine-200")}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <Input value={customDays} onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" className="h-9 w-24 text-center" aria-label="Dias personalizados" />
              <span className="text-[12.5px] font-bold text-pine-600 dark:text-pine-300">dias (personalizado)</span>
              <Button size="sm" variant="secondary" onClick={() => handleRetention("auto", Math.max(1, Number(customDays) || 45))}>Aplicar</Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir "${deleting?.name}"?`}
        message="O cliente sai da lista. O histórico de pedidos dele é preservado, mas perde o vínculo."
        confirmLabel="Excluir cliente"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------- subcomponentes ---------- */

function InfoTile({ icon, label, value }: { icon: Parameters<typeof I>[0]["name"]; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pine-100 bg-paper p-3 dark:border-pine-800 dark:bg-pine-950">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-pine-500 dark:text-pine-400"><I name={icon} size={13} /> {label}</p>
      <p className="mt-1 break-words text-[13.5px] font-bold text-pine-900 dark:text-cream">{value}</p>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const total = (order.items ?? []).reduce((acc, i) => acc + (i.price ?? 0) * i.qty, 0);
  return (
    <div className="rounded-xl border border-pine-100 bg-paper p-3.5 dark:border-pine-800 dark:bg-pine-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[15px] font-bold text-pine-300 dark:text-pine-600">#{order.number}</span>
        <StatusBadge status={order.status} />
        <span className="ml-auto text-[11.5px] font-semibold text-pine-500 dark:text-pine-400">{formatDateTime(order.createdAt)}</span>
      </div>
      {order.items && order.items.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-pine-800 dark:text-pine-100">
              <span>{i.qty}x {i.name}</span>
              {i.price != null && <span className="text-pine-500">{formatBRL(i.price * i.qty)}</span>}
            </li>
          ))}
          {total > 0 && <li className="flex items-baseline justify-between border-t border-pine-200 pt-1 text-[12.5px] font-extrabold text-pine-950 dark:border-pine-700 dark:text-cream"><span>Total</span><span>{formatBRL(total)}</span></li>}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] font-semibold text-pine-800 dark:text-pine-100">
          {order.protein}{order.sides.length > 0 && ` + ${order.sides.join(", ")}`} <span className="text-pine-500">({order.size})</span>
        </p>
      )}
      {order.observation && <p className="mt-1.5 text-[12px] italic text-pine-500">“{order.observation}”</p>}
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-pine-400">{order.payment} · {STATUS_LABEL[order.status]}</p>
    </div>
  );
}

function EditCustomerForm({ customer, tenantId, onSaved }: { customer: CustomerWithStats; tenantId: string; onSaved: (c: CustomerWithStats) => void }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  return (
    <div className="rounded-xl border border-saffron-300/60 bg-saffron-50/60 p-4 dark:border-saffron-700/40 dark:bg-saffron-900/15">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome" required><Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Telefone"><Input value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="E-mail"><Input type="email" value={email} maxLength={80} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          icon="check"
          loading={busy}
          onClick={async () => {
            if (!name.trim()) { push("error", "Informe o nome."); return; }
            setBusy(true);
            try {
              const c = await api.updateCustomer(tenantId, customer.id, { name, phone, email });
              onSaved({ ...customer, ...c });
            } catch (err) {
              push("error", err instanceof Error ? err.message : "Erro ao salvar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Salvar dados
        </Button>
      </div>
    </div>
  );
}

function AddCustomerModal({ open, onClose, tenantId, onAdded }: { open: boolean; onClose: () => void; tenantId: string; onAdded: (c: CustomerWithStats) => void }) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleAdd() {
    if (!name.trim()) { setErr("Informe o nome do cliente."); return; }
    setBusy(true);
    try {
      const c = await api.addCustomer(tenantId, { name, phone, email });
      push("success", `Cliente "${c.name}" cadastrado.`);
      setName(""); setPhone(""); setEmail(""); setErr("");
      onAdded(c);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Erro ao cadastrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar cliente"
      subtitle="Cadastre manualmente — ex.: cliente de balcão ou de telefone."
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button icon="plus" loading={busy} onClick={handleAdd}>Cadastrar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" required error={err}>
          <Input value={name} invalid={Boolean(err)} maxLength={60} placeholder="Ex.: João Silva" onChange={(e) => { setName(e.target.value); setErr(""); }} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone" hint="opcional"><Input value={phone} inputMode="tel" maxLength={20} placeholder="(63) 99999-0000" onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="E-mail" hint="opcional"><Input type="email" value={email} maxLength={80} placeholder="cliente@email.com" onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
