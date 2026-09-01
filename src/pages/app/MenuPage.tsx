/* Cardápio: visão de hoje + semana (agendamento e cópia entre dias). */
import { useMemo, useState } from "react";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import { getPlan, hasFeature } from "../../lib/plans";
import { type DailyMenuItem, type Food, type MenuMode, type Tenant } from "../../lib/types";
import { cn, formatDateLong, todayISO } from "../../lib/utils";
import { Button, CategoryPill, ConfirmDialog, EmptyState, ErrorState, FoodImage, SkeletonRow, Toggle } from "../../components/ui";
import { Tabs, UpgradeGate } from "../../components/saas";
import { FoodFormModal, PickSavedModal } from "../../components/FoodModals";
import { I } from "../../components/icons";

function isoAddDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MenuPage() {
  const { membership, refresh } = useAuth();
  const { push } = useToast();
  const tenantId = membership?.tenant.id ?? "";
  const tenant = membership?.tenant;
  const today = todayISO();

  const [view, setView] = useState<"hoje" | "semana">("hoje");
  const [showCreate, setShowCreate] = useState(false);
  const [showPick, setShowPick] = useState(false);
  const [removing, setRemoving] = useState<DailyMenuItem | null>(null);
  const [copyFrom, setCopyFrom] = useState<string | null>(null);

  const { data: menu, loading, error, reload, set } = useAsyncData(() => api.listMenu(tenantId, today), [tenantId, today]);
  const { data: foods, set: setFoods } = useAsyncData(() => api.listFoods(tenantId), [tenantId]);

  const weekDays = useMemo(() => {
    const base = new Date();
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => isoAddDays(monday, i));
  }, []);

  const { data: week, set: setWeek } = useAsyncData(
    () => (hasFeature(tenant ?? null, "weekly_menu") ? api.listWeekMenu(tenantId, weekDays) : Promise.resolve(null)),
    [tenantId, weekDays.join(","), view],
  );

  if (!tenant) return null;
  const canWeekly = hasFeature(tenant, "weekly_menu");
  const canSchedule = hasFeature(tenant, "scheduled_menu");

  async function handlePick(food: Food) {
    try {
      const item = await api.addToMenu(tenantId, food.id, today);
      set((d) => (d ? [...d, item] : [item]));
      push("success", `"${food.name}" adicionado ao cardápio de hoje.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao adicionar ao cardápio.");
    }
  }

  async function handleRemove() {
    if (!removing) return;
    try {
      await api.removeFromMenu(tenantId, removing.id);
      set((d) => (d ? d.filter((m) => m.id !== removing.id) : d));
      push("success", "Item removido do cardápio.");
      setRemoving(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao remover o item.");
    }
  }

  async function handleCopy(from: string, to: string) {
    try {
      const added = await api.copyMenu(tenantId, from, to);
      push("success", `${added} item(ns) copiado(s) para ${formatDateLong(to)}.`);
      if (week) setWeek(await api.listWeekMenu(tenantId, weekDays));
      setCopyFrom(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao copiar o cardápio.");
    }
  }

  /* Categorias do negócio (configuráveis) + categorias já em uso no cardápio. */
  const cats = useMemo(() => {
    const base = tenant?.settings.categories ?? [];
    const used = (menu ?? []).map((m) => m.food?.category).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...used]));
  }, [tenant, menu]);

  const grouped = cats.map((cat) => ({
    cat,
    items: (menu ?? []).filter((m) => m.food?.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Cardápio</h1>
          <p className="mt-1 text-[14px] capitalize text-pine-600 dark:text-pine-300">{formatDateLong(today)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs
            tabs={[{ id: "hoje", label: "Hoje", icon: "menuBook" }, { id: "semana", label: "Semana", icon: "calendar" }]}
            value={view}
            onChange={setView}
          />
          <Button variant="secondary" icon="book" onClick={() => setShowPick(true)}>Escolher prato salvo</Button>
          <Button icon="plus" onClick={() => setShowCreate(true)}>Criar novo produto</Button>
        </div>
      </header>

      {/* Modo de cardápio: diário / fixo / semanal automático */}
      <ModeCard tenant={tenant} foods={foods ?? []} onChanged={refresh} />

      {view === "hoje" ? (
        error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-3"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
        ) : (menu ?? []).length === 0 ? (
          <EmptyState
            icon="menuBook"
            title="Nenhum prato publicado hoje"
            description="Escolha um prato salvo ou crie um novo para publicar o cardápio de hoje no seu site."
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button variant="secondary" icon="book" onClick={() => setShowPick(true)}>Escolher prato salvo</Button>
                <Button icon="plus" onClick={() => setShowCreate(true)}>Criar novo prato</Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-8">
            {grouped.map((g) => (
              <section key={g.cat} aria-label={g.cat}>
                <div className="mb-3.5 flex items-center gap-3">
                  <h2 className="font-display text-[19px] font-bold text-pine-950 dark:text-cream">{g.cat}</h2>
                  <span className="h-px flex-1 bg-pine-200 dark:bg-pine-800" />
                  <span className="text-[12px] font-bold text-pine-500">{g.items.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((m) => (
                    <article key={m.id} className="group flex items-center gap-3 rounded-2xl border border-pine-100 bg-cream p-3 shadow-card transition-all hover:border-pine-300 hover:shadow-lift dark:border-pine-800 dark:bg-[#12211b]">
                      <FoodImage src={m.food?.imageUrl ?? null} alt={m.food?.name ?? ""} category={m.food?.category} className="h-14 w-14 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-extrabold text-pine-950 dark:text-cream">{m.food?.name}</p>
                        <CategoryPill category={m.food?.category ?? "Acompanhamentos"} />
                      </div>
                      <button onClick={() => setRemoving(m)} aria-label={`Remover ${m.food?.name}`}
                        className="rounded-lg border border-pine-200 p-2 text-[#a83a2a] opacity-70 transition-all hover:border-[#c0563f] hover:bg-[#a83a2a]/10 hover:opacity-100 dark:border-pine-700">
                        <I name="trash" size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : !canWeekly ? (
        <UpgradeGate feature="O cardápio semanal" currentPlanId={tenant.planId} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((d) => {
            const items = week?.[d] ?? [];
            const isToday = d === today;
            const isFuture = d > today;
            return (
              <div key={d} className={cn("flex flex-col rounded-2xl border bg-cream p-3.5 shadow-card dark:bg-[#12211b]", isToday ? "border-saffron-400 ring-2 ring-saffron-400/30" : "border-pine-100 dark:border-pine-800")}>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-pine-500">
                  {new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}
                </p>
                <p className={cn("font-display text-[15px] font-bold", isToday ? "text-saffron-700" : "text-pine-950 dark:text-cream")}>
                  {new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  {isToday && <span className="ml-1.5 rounded-full bg-saffron-400 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-pine-950">hoje</span>}
                </p>
                <div className="mt-2.5 flex-1 space-y-1.5">
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-pine-200 px-2 py-3 text-center text-[11px] font-semibold text-pine-400 dark:border-pine-700">vazio</p>
                  ) : (
                    items.slice(0, 5).map((m) => (
                      <p key={m.id} className="truncate rounded-lg bg-paper px-2 py-1.5 text-[11.5px] font-bold text-pine-800 dark:bg-[#0f1c16] dark:text-pine-100">{m.food?.name}</p>
                    ))
                  )}
                  {items.length > 5 && <p className="text-[10.5px] font-bold text-pine-400">+{items.length - 5} itens</p>}
                </div>
                {canSchedule && isFuture && (
                  <button onClick={() => setCopyFrom(d)} className="mt-2.5 flex items-center justify-center gap-1 rounded-lg border border-pine-200 px-2 py-1.5 text-[11px] font-extrabold text-pine-600 transition-colors hover:border-saffron-400 hover:text-saffron-700 dark:border-pine-700">
                    <I name="copy" size={12} /> Copiar para cá
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FoodFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        tenantId={tenantId}
        categories={tenant.settings.categories}
        onSaved={(food) => {
          setFoods((d) => (d ? [food, ...d] : [food]));
          void handlePick(food).then(() => setShowCreate(false));
        }}
      />
      <PickSavedModal
        open={showPick}
        onClose={() => setShowPick(false)}
        tenantId={tenantId}
        foods={foods ?? []}
        alreadyIds={(menu ?? []).map((m) => m.foodId)}
        dateLabel="hoje"
        onPick={handlePick}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remover "${removing?.food?.name}" do cardápio?`}
        message="O prato continua salvo na biblioteca — só sai do cardápio de hoje."
        confirmLabel="Remover"
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
      />

      {/* Copiar cardápio (agendamento) */}
      {copyFrom && (
        <CopyDialog
          onClose={() => setCopyFrom(null)}
          target={copyFrom}
          menu={menu ?? []}
          onCopy={(from, to) => handleCopy(from, to)}
          today={today}
        />
      )}
    </div>
  );
}

/* ---------- Modo de cardápio: diário, fixo e semanal automático ---------- */

function ModeCard({ tenant, foods, onChanged }: { tenant: Tenant; foods: Food[]; onChanged: () => Promise<void> }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const s = tenant.settings;
  const tenantId = tenant.id;
  const mode: MenuMode = s.menuMode ?? "diario";
  const auto = s.autoWeeklyMenu ?? false;
  const template = s.weeklyTemplate ?? {};

  const DOW = [
    { k: "1", label: "Segunda" }, { k: "2", label: "Terça" }, { k: "3", label: "Quarta" },
    { k: "4", label: "Quinta" }, { k: "5", label: "Sexta" }, { k: "6", label: "Sábado" }, { k: "0", label: "Domingo" },
  ];

  async function patch(p: Parameters<typeof api.updateSettings>[1]) {
    setBusy(true);
    try {
      await api.updateSettings(tenantId, p);
      await onChanged();
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  function toggleFoodInDay(dow: string, foodId: string) {
    const cur = template[dow] ?? [];
    const next = cur.includes(foodId) ? cur.filter((x) => x !== foodId) : [...cur, foodId];
    void patch({ weeklyTemplate: { ...template, [dow]: next } });
  }

  const fixedFoods = (s.fixedFoodIds ?? [])
    .map((id) => foods.find((f) => f.id === id))
    .filter((f): f is Food => Boolean(f));
  const availableForFixed = foods.filter((f) => !(s.fixedFoodIds ?? []).includes(f.id));

  return (
    <section className="mb-6 rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-pine-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-pine-950 dark:text-cream">
            <I name="calendar" size={17} className="text-saffron-600" /> Modo de cardápio
          </h2>
          <p className="mt-0.5 text-[12.5px] text-pine-600 dark:text-pine-300">
            {mode === "diario" ? "Você monta o que aparece a cada dia (ou deixa a semana no automático)." : "Os produtos abaixo ficam SEMPRE no site, sem precisar montar todo dia."}
          </p>
        </div>
        <div className="flex rounded-xl border border-pine-200 p-1 dark:border-pine-700" role="tablist" aria-label="Modo de cardápio">
          {([["diario", "Diário"], ["fixo", "Fixo"]] as Array<[MenuMode, string]>).map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} disabled={busy}
              onClick={() => void patch({ menuMode: m }).then(() => push("success", m === "fixo" ? "Cardápio fixo ativado: os produtos escolhidos ficam sempre no site." : "Modo diário ativado."))}
              className={cn("rounded-lg px-4 py-2 text-[13px] font-extrabold transition-all", mode === m ? "bg-pine-950 text-saffron-300 shadow-card dark:bg-saffron-400 dark:text-pine-950" : "text-pine-600 hover:text-pine-950 dark:text-pine-300 dark:hover:text-cream")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cardápio fixo: produtos permanentes */}
      {mode === "fixo" && (
        <div className="mt-4 animate-fade-up rounded-xl border border-saffron-300/60 bg-saffron-50/70 p-4 dark:border-saffron-700/40 dark:bg-saffron-900/15">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-saffron-800 dark:text-saffron-200">Produtos fixos no site ({fixedFoods.length})</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {fixedFoods.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[12.5px] font-bold text-pine-800 shadow-card dark:bg-pine-950 dark:text-pine-100">
                {f.name}
                <button onClick={() => void patch({ fixedFoodIds: (s.fixedFoodIds ?? []).filter((x) => x !== f.id) })} aria-label={`Remover ${f.name} do fixo`} className="text-pine-400 hover:text-[#a83a2a]"><I name="x" size={13} /></button>
              </span>
            ))}
            <label className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-saffron-500/60 px-3 py-1 text-[12px] font-extrabold text-saffron-700 dark:text-saffron-300">
              <I name="plus" size={13} />
              <select
                value=""
                aria-label="Adicionar produto ao cardápio fixo"
                onChange={(e) => { if (e.target.value) void patch({ fixedFoodIds: [...(s.fixedFoodIds ?? []), e.target.value] }); }}
                className="cursor-pointer bg-transparent text-[12px] font-extrabold outline-none"
              >
                <option value="">Adicionar…</option>
                {availableForFixed.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          </div>
          {fixedFoods.length === 0 && <p className="mt-2 text-[12px] font-semibold text-saffron-800/80 dark:text-saffron-200/80">Adicione produtos — eles aparecem no site imediatamente, todos os dias.</p>}
        </div>
      )}

      {/* Semanal automático */}
      {mode === "diario" && (
        <div className="mt-4">
          <Toggle
            checked={auto}
            onChange={(v) => void patch({ autoWeeklyMenu: v }).then(() => push("success", v ? "Cardápio automático da semana ativado! Defina os produtos de cada dia abaixo." : "Cardápio automático desativado."))}
            label="Cardápio automático da semana"
            description="Defina os produtos de cada dia UMA vez. Se o dia não tiver cardápio manual, o sistema publica o template sozinho."
          />
          {auto && (
            <div className="mt-3 animate-fade-up grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {DOW.map((d) => {
                const ids = template[d.k] ?? [];
                return (
                  <div key={d.k} className="rounded-xl border border-pine-100 bg-paper p-2.5 dark:border-pine-800 dark:bg-pine-950">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-pine-500 dark:text-pine-400">{d.label} <span className="text-saffron-600">({ids.length})</span></p>
                    <div className="mt-1.5 max-h-36 space-y-1 overflow-y-auto pr-0.5">
                      {foods.length === 0 && <p className="text-[11px] font-semibold text-pine-400">Crie produtos primeiro.</p>}
                      {foods.map((f) => {
                        const on = ids.includes(f.id);
                        return (
                          <button key={f.id} onClick={() => toggleFoodInDay(d.k, f.id)} aria-pressed={on}
                            className={cn("flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11.5px] font-bold transition-colors", on ? "bg-pine-950 text-saffron-300 dark:bg-saffron-400 dark:text-pine-950" : "text-pine-700 hover:bg-pine-100 dark:text-pine-200 dark:hover:bg-pine-800")}>
                            <I name={on ? "check" : "plus"} size={11} />
                            <span className="truncate">{f.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CopyDialog({
  onClose,
  target,
  menu,
  onCopy,
  today,
}: {
  onClose: () => void;
  target: string;
  menu: DailyMenuItem[];
  onCopy: (from: string, to: string) => Promise<void>;
  today: string;
}) {
  const [from, setFrom] = useState(today);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-pine-950/60 px-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-pine-100 bg-cream p-5 shadow-pop animate-scale-in dark:border-pine-800 dark:bg-[#12211b]">
        <h3 className="font-display text-[18px] font-bold text-pine-950 dark:text-cream">Copiar cardápio</h3>
        <p className="mt-1 text-[13px] text-pine-600 dark:text-pine-300">
          Copie os itens de um dia para <strong>{formatDateLong(target)}</strong>.
        </p>
        <label className="mt-4 block text-[13px] font-bold text-pine-900 dark:text-pine-100">Copiar de:</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[today, target].filter((v, i, a) => a.indexOf(v) === i && v !== target).concat([today]).filter((v, i, a) => a.indexOf(v) === i).map((d) => (
            <button key={d} onClick={() => setFrom(d)} aria-pressed={from === d}
              className={cn("rounded-full border px-3 py-1.5 text-[12px] font-bold", from === d ? "border-pine-800 bg-pine-800 text-cream" : "border-pine-200 text-pine-700")}>
              {d === today ? "Hoje" : formatDateLong(d)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] font-semibold text-pine-500">{menu.length} item(ns) no cardápio de origem.</p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button
            icon="copy"
            loading={busy}
            onClick={async () => { setBusy(true); await onCopy(from, target); setBusy(false); }}
          >
            Copiar
          </Button>
        </div>
      </div>
    </div>
  );
}

void getPlan;
