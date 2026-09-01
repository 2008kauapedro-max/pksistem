/* Pedidos: fila com fluxo de status, itens vindos do site e cadastro manual. */
import { useMemo, useState } from "react";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import { PAYMENTS, SIZES, type NewOrderInput, type Order, type Payment } from "../../lib/types";
import { NEXT_LABEL, NEXT_STATUS, STATUS_LABEL, cn, formatBRL, formatDateTime, type OrderStatus } from "../../lib/utils";
import { Button, EmptyState, ErrorState, Field, Input, Modal, Select, SkeletonRow, StatusBadge, Textarea } from "../../components/ui";
import { I } from "../../components/icons";

const FILTERS: Array<OrderStatus | "todos"> = ["todos", "pendente", "preparando", "pronta", "entregue"];

export default function OrdersPage() {
  const { membership } = useAuth();
  const { push } = useToast();
  const tenantId = membership?.tenant.id ?? "";
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [showNew, setShowNew] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const { data, loading, error, reload, set } = useAsyncData(() => api.listOrders(tenantId), [tenantId]);

  const counts = useMemo(() => {
    const orders = data ?? [];
    const c: Record<string, number> = { todos: orders.length };
    for (const s of Object.keys(STATUS_LABEL)) c[s] = orders.filter((o) => o.status === s).length;
    return c;
  }, [data]);

  const visible = useMemo(() => (data ?? []).filter((o) => filter === "todos" || o.status === filter), [data, filter]);

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancingId(order.id);
    try {
      const updated = await api.updateOrderStatus(tenantId, order.id, next);
      set((d) => (d ? d.map((o) => (o.id === order.id ? updated : o)) : d));
      push("success", `#${order.number} → ${STATUS_LABEL[next]}.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao atualizar o status.");
    } finally {
      setAdvancingId(null);
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Pedidos</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Do site ou do balcão · Pendente → Preparando → Pronto → Entregue.</p>
        </div>
        <Button icon="plus" onClick={() => setShowNew(true)}>Novo pedido</Button>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por status">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            className={cn("rounded-full border px-3.5 py-2 text-[13px] font-bold transition-all", filter === f ? "border-pine-800 bg-pine-800 text-cream shadow-card" : "border-pine-200 bg-cream text-pine-700 hover:border-pine-400 dark:border-pine-700 dark:bg-[#12211b] dark:text-pine-200")}>
            {f === "todos" ? "Todas" : STATUS_LABEL[f]}
            <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-extrabold", filter === f ? "bg-saffron-400 text-pine-950" : "bg-pine-100 text-pine-700 dark:bg-pine-800 dark:text-pine-200")}>{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2.5"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="lunchbox"
          title={filter === "todos" ? "Nenhum pedido ainda" : `Nenhum pedido "${STATUS_LABEL[filter as OrderStatus]}"`}
          description={filter === "todos" ? "Os pedidos feitos pelo seu site aparecem aqui automaticamente. Também dá para cadastrar pedidos de telefone/balcão." : "Troque o filtro para ver os demais pedidos."}
          action={filter === "todos" ? <Button icon="plus" onClick={() => setShowNew(true)}>Novo pedido</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <article key={order.id} className={cn("rounded-2xl border bg-cream p-4 shadow-card transition-all hover:shadow-lift dark:bg-[#12211b]", order.status === "pendente" ? "border-saffron-300/70 dark:border-saffron-700" : "border-pine-100 dark:border-pine-800")}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span className="font-display text-[22px] font-bold leading-none text-pine-300">#{order.number}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <h2 className="text-[15.5px] font-extrabold text-pine-950 dark:text-cream">{order.customerName}</h2>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-0.5 text-[12px] font-semibold text-pine-500">
                        {formatDateTime(order.createdAt)}
                        {order.customerPhone && <> · {order.customerPhone}</>} · <span className="text-pine-700 dark:text-pine-200">{order.payment}</span>
                      </p>
                    </div>
                  </div>
                  {next && (
                    <Button size="sm" variant={order.status === "pendente" ? "amber" : "secondary"} loading={advancingId === order.id}
                      icon={advancingId === order.id ? undefined : "flame"} onClick={() => advance(order)}>
                      {NEXT_LABEL[order.status]}
                    </Button>
                  )}
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-pine-100 pt-3.5 dark:border-pine-800">
                  {order.origin === "site" && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-pine-950 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-saffron-300 dark:bg-saffron-400 dark:text-pine-950">
                      <I name="globe" size={12} /> Pelo site
                    </span>
                  )}
                  {order.items && order.items.length > 0 ? (
                    <>
                      {order.items.map((it, idx) => (
                        <span key={idx} className="rounded-lg bg-pine-100 px-2.5 py-1.5 text-[12.5px] font-extrabold text-pine-800 dark:bg-pine-800 dark:text-pine-100">
                          {it.qty}x {it.name}{it.price != null && <span className="ml-1 font-bold text-pine-500">{formatBRL(it.price * it.qty)}</span>}
                        </span>
                      ))}
                    </>
                  ) : (
                    <>
                      <span className="rounded-lg bg-pine-800 px-2.5 py-1.5 text-[12px] font-extrabold text-cream">{order.size}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-pine-100 px-2.5 py-1.5 text-[12.5px] font-extrabold text-pine-800 dark:bg-pine-800 dark:text-pine-100">
                        <I name="flame" size={13} /> {order.protein}
                      </span>
                      {order.sides.map((s) => (
                        <span key={s} className="rounded-lg bg-saffron-100 px-2.5 py-1.5 text-[12px] font-bold text-saffron-900 dark:bg-saffron-900/40 dark:text-saffron-200">{s}</span>
                      ))}
                    </>
                  )}
                  {order.observation && (
                    <span className="flex w-full items-start gap-1.5 rounded-lg bg-paper px-3 py-2 text-[12.5px] font-semibold italic text-pine-700 sm:w-auto sm:flex-1 dark:bg-[#0f1c16] dark:text-pine-200">
                      <I name="info" size={14} className="mt-0.5 shrink-0 text-saffron-700" /> “{order.observation}”
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <NewOrderModal open={showNew} onClose={() => setShowNew(false)} tenantId={tenantId} onCreated={(o) => set((d) => (d ? [o, ...d] : [o]))} />
    </div>
  );
}

function NewOrderModal({ open, onClose, onCreated, tenantId }: { open: boolean; onClose: () => void; onCreated: (o: Order) => void; tenantId: string }) {
  const { push } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [size, setSize] = useState("Média");
  const [protein, setProtein] = useState("");
  const [observation, setObservation] = useState("");
  const [payment, setPayment] = useState<Payment>("Pix");
  const [status, setStatus] = useState<OrderStatus>("pendente");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; protein?: string }>({});

  async function handleSubmit() {
    const errs: { name?: string; protein?: string } = {};
    if (!customerName.trim()) errs.name = "Informe o nome do cliente.";
    if (!protein.trim()) errs.protein = "Informe o produto principal.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const input: NewOrderInput = { customerName, customerPhone: phone.trim() || null, customerEmail: email.trim() || null, size, protein: protein.trim(), sides: [], observation: observation || null, payment, status };
      const order = await api.createOrder(tenantId, input);
      push("success", `Pedido #${order.number} registrado.`);
      setCustomerName(""); setPhone(""); setEmail(""); setProtein(""); setObservation("");
      onClose();
      onCreated(order);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao salvar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Novo pedido" subtitle="Cadastro manual — telefone ou balcão."
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving} icon={saving ? undefined : "lunchbox"}>Salvar pedido</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do cliente" required error={errors.name}>
            <Input placeholder="Ex.: João Silva" value={customerName} invalid={Boolean(errors.name)} maxLength={60}
              onChange={(e) => { setCustomerName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} autoFocus />
          </Field>
          <Field label="Telefone" hint="opcional">
            <Input placeholder="(63) 99999-0000" inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="E-mail do cliente" hint="opcional">
          <Input type="email" placeholder="cliente@email.com" value={email} maxLength={80} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tamanho" required>
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Proteína" required error={errors.protein}>
            <Input placeholder="Ex.: Frango assado" value={protein} invalid={Boolean(errors.protein)}
              onChange={(e) => { setProtein(e.target.value); setErrors((x) => ({ ...x, protein: undefined })); }} />
          </Field>
        </div>
        <Field label="Observações" hint="opcional">
          <Textarea placeholder="Ex.: sem cebola…" value={observation} maxLength={200} onChange={(e) => setObservation(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pagamento" required>
            <Select value={payment} onChange={(e) => setPayment(e.target.value as Payment)}>
              {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Status inicial" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
