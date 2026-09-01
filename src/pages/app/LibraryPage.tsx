/* Biblioteca de pratos salvos — o diferencial: cadastre uma vez, reutilize sempre. */
import { useMemo, useState } from "react";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import { getPlan } from "../../lib/plans";
import { type Category, type Food } from "../../lib/types";
import { formatBRL, todayISO } from "../../lib/utils";
import { Button, CategoryPill, ConfirmDialog, EmptyState, ErrorState, FoodImage, Input, Select, SkeletonCard } from "../../components/ui";
import { FoodFormModal } from "../../components/FoodModals";
import { I } from "../../components/icons";

export default function LibraryPage() {
  const { membership } = useAuth();
  const { push } = useToast();
  const tenantId = membership?.tenant.id ?? "";
  const tenant = membership?.tenant;

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "Todas">("Todas");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [deleting, setDeleting] = useState<Food | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: foods, loading, error, reload, set } = useAsyncData(() => api.listFoods(tenantId), [tenantId]);
  const { data: todayMenu, set: setTodayMenu } = useAsyncData(() => api.listMenu(tenantId, todayISO()), [tenantId]);

  const filtered = useMemo(
    () =>
      (foods ?? [])
        .filter((f) => (cat === "Todas" ? true : f.category === cat))
        .filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [foods, query, cat],
  );

  const limit = tenant ? getPlan(tenant.planId).limits.maxProducts : -1;
  const used = (foods ?? []).length;
  const todayFoodIds = (todayMenu ?? []).map((m) => m.foodId);

  async function handleAddToday(food: Food) {
    setAddingId(food.id);
    try {
      const item = await api.addToMenu(tenantId, food.id, todayISO());
      setTodayMenu((d) => (d ? [...d, item] : [item]));
      push("success", `"${food.name}" adicionado ao cardápio de hoje.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao adicionar ao cardápio.");
    } finally {
      setAddingId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api.deleteFood(tenantId, deleting.id);
      set((d) => (d ? d.filter((f) => f.id !== deleting.id) : d));
      push("success", `"${deleting.name}" excluído da biblioteca.`);
      setDeleting(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao excluir o prato.");
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Pratos salvos</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">
            Cadastre seus pratos uma vez e reutilize sempre.{" "}
            <span className="font-bold text-pine-800 dark:text-pine-100">
              {limit === -1 ? `${used} pratos` : `${used} de ${limit} pratos do plano`}
            </span>
          </p>
        </div>
        <Button icon="plus" onClick={() => { setEditing(null); setShowForm(true); }}>Novo prato</Button>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pine-400"><I name="search" size={17} /></span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar prato…" className="pl-10" aria-label="Buscar prato" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value as Category | "Todas")} className="sm:w-52" aria-label="Filtrar por categoria">
          <option value="Todas">Todas as categorias</option>
          {Array.from(new Set((foods ?? []).map((f) => f.category))).map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="book"
          title={foods?.length === 0 ? "Nenhum prato cadastrado" : "Nenhum prato encontrado"}
          description={foods?.length === 0 ? "Cadastre seu primeiro prato para começar a montar cardápios em segundos." : "Ajuste a busca ou o filtro para encontrar o prato."}
          action={foods?.length === 0 ? <Button icon="plus" onClick={() => { setEditing(null); setShowForm(true); }}>Adicionar prato</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => {
            const inToday = todayFoodIds.includes(f.id);
            return (
              <article key={f.id} className="group flex flex-col overflow-hidden rounded-2xl border border-pine-100 bg-cream shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift dark:border-pine-800 dark:bg-[#12211b]">
                <div className="relative h-36">
                  <FoodImage src={f.imageUrl} alt={`Foto de ${f.name}`} category={f.category} className="h-full w-full" />
                  <span className="absolute left-3 top-3"><CategoryPill category={f.category} /></span>
                  {f.availability !== "disponivel" && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#5e2113]/90 px-2.5 py-1 text-[10.5px] font-extrabold uppercase text-cream">{f.availability}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-[16.5px] font-bold text-pine-950 dark:text-cream">{f.name}</h2>
                    {f.price != null && <span className="shrink-0 text-[13px] font-extrabold text-saffron-700">{formatBRL(f.price)}</span>}
                  </div>
                  {f.description && <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-pine-600 dark:text-pine-300">{f.description}</p>}

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    {inToday ? (
                      <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-pine-100 px-3 py-2 text-[12.5px] font-extrabold text-pine-700 dark:bg-pine-800 dark:text-pine-100">
                        <I name="check" size={15} /> No cardápio de hoje
                      </span>
                    ) : (
                      <Button size="sm" variant="secondary" full loading={addingId === f.id} icon={addingId === f.id ? undefined : "plus"} onClick={() => handleAddToday(f)}>
                        Adicionar hoje
                      </Button>
                    )}
                    <button onClick={() => { setEditing(f); setShowForm(true); }} aria-label={`Editar ${f.name}`}
                      className="rounded-lg border border-pine-200 p-2 text-pine-600 transition-colors hover:border-pine-400 hover:text-pine-900 dark:border-pine-700 dark:text-pine-300">
                      <I name="gear" size={16} />
                    </button>
                    <button onClick={() => setDeleting(f)} aria-label={`Excluir ${f.name}`}
                      className="rounded-lg border border-pine-200 p-2 text-[#a83a2a] transition-colors hover:border-[#c0563f] hover:bg-[#a83a2a]/10 dark:border-pine-700">
                      <I name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <FoodFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        tenantId={tenantId}
        food={editing}
        categories={tenant?.settings.categories}
        onSaved={(food) =>
          set((d) => {
            if (!d) return [food];
            return d.some((f) => f.id === food.id) ? d.map((f) => (f.id === food.id ? food : f)) : [food, ...d];
          })
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir "${deleting?.name}"?`}
        message="O prato será removido da biblioteca e de todos os cardápios. Esta ação não pode ser desfeita."
        confirmLabel="Excluir prato"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
