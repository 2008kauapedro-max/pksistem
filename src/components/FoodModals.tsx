/* Modais de produtos: criar/editar (foto, adicionais, categoria livre) e escolher da biblioteca.
 * Todo produto criado vai automaticamente para a biblioteca — sem checkbox. */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { api } from "../lib/api";
import { CATEGORIES, type Category, type Food, type FoodExtra } from "../lib/types";
import { MAX_IMAGE_MB, cn, formatBRL, parsePrice, validateImageFile } from "../lib/utils";
import { useToast } from "../context/providers";
import { Button, CategoryPill, Field, FoodImage, Input, Modal, Textarea } from "./ui";
import { I } from "./icons";

/* ---------- Seletor de imagem com validação ---------- */

export function ImagePicker({
  value,
  onChange,
  tenantId,
  label = "Foto do produto",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  tenantId: string;
  label?: string;
}) {
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      push("error", problem);
      return;
    }
    setUploading(true);
    try {
      const url = await api.uploadImage(tenantId, file);
      onChange(url);
      push("success", "Imagem carregada.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Falha ao enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-bold text-pine-900 dark:text-pine-100">{label}</span>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} aria-label={label} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-pine-300 bg-pine-50/60 transition-colors hover:border-saffron-500 dark:border-pine-700 dark:bg-pine-900/40"
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-pine-400">
              <I name="camera" size={20} />
              <span className="text-[9.5px] font-bold">{uploading ? "…" : "Adicionar"}</span>
            </span>
          )}
          {uploading && <span className="absolute inset-0 flex items-center justify-center bg-pine-950/40 text-cream"><I name="refresh" size={18} className="animate-spin" /></span>}
        </button>
        <div className="text-[12px] leading-relaxed text-pine-500 dark:text-pine-400">
          JPG, PNG ou WEBP até {MAX_IMAGE_MB} MB.
          {value && (
            <button type="button" onClick={() => onChange(null)} className="mt-1 block font-bold text-[#a83a2a] hover:underline">
              Remover imagem
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Editor de adicionais (ex.: + ovo R$ 2,00) ---------- */

function ExtrasEditor({ value, onChange }: { value: FoodExtra[]; onChange: (v: FoodExtra[]) => void }) {
  return (
    <div>
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-bold text-pine-900 dark:text-pine-100">
        <span>Adicionais <span className="text-[11px] font-medium text-pine-500">opcionais</span></span>
        <span className="text-[11px] font-medium text-pine-500">o cliente marca na hora do pedido</span>
      </span>
      <div className="space-y-2">
        {value.map((x, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={x.name}
              maxLength={40}
              placeholder="Ex.: Ovo, borda recheada, queijo extra…"
              aria-label={`Nome do adicional ${i + 1}`}
              onChange={(e) => onChange(value.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))}
              className="flex-1"
            />
            <Input
              value={x.price != null ? String(x.price).replace(".", ",") : ""}
              inputMode="decimal"
              placeholder="R$ (opcional)"
              aria-label={`Preço do adicional ${i + 1}`}
              onChange={(e) => onChange(value.map((y, j) => (j === i ? { ...y, price: e.target.value ? parsePrice(e.target.value) : null } : y)))}
              className="w-32"
            />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover adicional"
              className="rounded-lg border border-pine-200 p-2.5 text-[#a83a2a] transition-colors hover:border-[#c0563f] hover:bg-[#a83a2a]/10 dark:border-pine-700">
              <I name="trash" size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, { name: "", price: null }])}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-pine-300 px-3.5 py-2 text-[12.5px] font-extrabold text-pine-600 transition-colors hover:border-saffron-500 hover:text-saffron-700 dark:border-pine-700 dark:text-pine-300"
        >
          <I name="plus" size={14} /> Adicionar adicional
        </button>
      </div>
    </div>
  );
}

/* ---------- Criar / editar produto ---------- */

export function FoodFormModal({
  open,
  onClose,
  tenantId,
  food,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  food?: Food | null;
  /** Categorias do negócio (livres) + sugestões. */
  categories?: string[];
  onSaved: (food: Food) => void;
}) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extras, setExtras] = useState<FoodExtra[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suggestions = useMemo(() => {
    const base = categories?.length ? categories : CATEGORIES;
    return Array.from(new Set([...base, ...(category ? [category] : [])]));
  }, [categories, category]);

  useEffect(() => {
    if (open) {
      setName(food?.name ?? "");
      setCategory(food?.category ?? (categories?.[0] ?? CATEGORIES[0]));
      setPrice(food?.price != null ? String(food.price).replace(".", ",") : "");
      setDescription(food?.description ?? "");
      setImageUrl(food?.imageUrl ?? null);
      setExtras(food?.extras?.length ? food.extras.map((x) => ({ ...x })) : []);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, food]);

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Informe o nome do produto.";
    if (!category.trim()) errs.category = "Informe a categoria.";
    const parsed = price ? parsePrice(price) : null;
    if (price && parsed == null) errs.price = "Preço inválido.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const cleanExtras = extras.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), price: x.price }));
      if (food) {
        const updated = await api.updateFood(tenantId, food.id, {
          name: name.trim(), category: category.trim(), description: description || null, price: parsed, imageUrl, extras: cleanExtras, active: true,
        });
        push("success", "Produto atualizado.");
        onSaved(updated);
      } else {
        const created = await api.createFood(tenantId, {
          name: name.trim(), category: category.trim(), description: description || null, price: parsed, imageUrl, extras: cleanExtras,
        });
        push("success", "Produto criado e salvo na biblioteca automaticamente. 📚");
        onSaved(created);
      }
      onClose();
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={food ? "Editar produto" : "Novo produto"}
      subtitle={food ? undefined : "Criou, ficou salvo na biblioteca para reutilizar sempre."}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving} icon={saving ? undefined : "check"}>
            {food ? "Salvar alterações" : "Criar e salvar na biblioteca"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nome do produto" required error={errors.name}>
          <Input value={name} invalid={Boolean(errors.name)} maxLength={60} placeholder="Ex.: Pastel de carne, Caldo de feijão…"
            onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: "" })); }} autoFocus />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoria" required error={errors.category} hint="escreva ou escolha">
            <>
              <Input
                list="pk-categorias"
                value={category}
                invalid={Boolean(errors.category)}
                maxLength={30}
                placeholder="Ex.: Pastéis"
                onChange={(e) => { setCategory(e.target.value); setErrors((x) => ({ ...x, category: "" })); }}
              />
              <datalist id="pk-categorias">
                {suggestions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </>
          </Field>
          <Field label="Preço (unidade)" error={errors.price} hint="opcional">
            <Input value={price} invalid={Boolean(errors.price)} inputMode="decimal" placeholder="Ex.: 12,50"
              onChange={(e) => { setPrice(e.target.value); setErrors((x) => ({ ...x, price: "" })); }} />
          </Field>
        </div>
        <Field label="Descrição" hint="opcional">
          <Textarea value={description} maxLength={140} placeholder="Ex.: Massa crocante, recheio generoso" onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <ExtrasEditor value={extras} onChange={setExtras} />
        <ImagePicker value={imageUrl} onChange={setImageUrl} tenantId={tenantId} />
      </div>
    </Modal>
  );
}

/* ---------- Escolher produto salvo ---------- */

export function PickSavedModal({
  open,
  onClose,
  tenantId,
  foods,
  alreadyIds,
  dateLabel,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  foods: Food[];
  alreadyIds: string[];
  dateLabel: string;
  onPick: (food: Food) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("Todas");
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setQuery(""); setCat("Todas"); }
  }, [open]);

  const cats = useMemo(() => {
    const used = foods.filter((f) => f.active).map((f) => f.category);
    return Array.from(new Set(used));
  }, [foods]);

  const filtered = useMemo(
    () =>
      foods
        .filter((f) => f.active)
        .filter((f) => (cat === "Todas" ? true : f.category === cat))
        .filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [foods, query, cat],
  );

  async function handlePick(food: Food) {
    setPickingId(food.id);
    try {
      await onPick(food);
    } finally {
      setPickingId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar ao cardápio" subtitle={`${dateLabel} · escolha da sua biblioteca`} size="lg">
      <div className="space-y-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pine-400"><I name="search" size={17} /></span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar produto…" className="pl-10" aria-label="Buscar produto" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Todas", ...cats].map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
              className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-all", cat === c ? "border-pine-950 bg-pine-950 text-saffron-300 dark:bg-saffron-400 dark:text-pine-950" : "border-pine-200 bg-cream text-pine-700 hover:border-pine-400 dark:border-pine-700 dark:bg-pine-900 dark:text-pine-200")}>
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-pine-300 bg-pine-50/60 px-4 py-6 text-center text-[13.5px] font-semibold text-pine-600 dark:border-pine-700 dark:bg-pine-950 dark:text-pine-300">
            Nenhum produto encontrado. Cadastre um novo para reutilizar sempre.
          </p>
        ) : (
          <div className="grid max-h-[380px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {filtered.map((f) => {
              const already = alreadyIds.includes(f.id);
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-pine-100 bg-cream p-2.5 shadow-card dark:border-pine-800 dark:bg-pine-950">
                  <FoodImage src={f.imageUrl} alt={`Foto de ${f.name}`} category={f.category} className="h-[52px] w-[52px] shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-extrabold text-pine-950 dark:text-cream">{f.name}</p>
                    <div className="flex items-center gap-1.5">
                      <CategoryPill category={f.category} />
                      {f.extras.length > 0 && <span className="text-[10.5px] font-extrabold text-saffron-700 dark:text-saffron-300">+{f.extras.length} adicionais</span>}
                    </div>
                  </div>
                  {already ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-pine-100 px-2.5 py-1.5 text-[11.5px] font-extrabold text-pine-700 dark:bg-pine-800 dark:text-pine-200">
                      <I name="check" size={13} /> Já adicionado
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" loading={pickingId === f.id} icon={pickingId === f.id ? undefined : "plus"} onClick={() => handlePick(f)}>
                      Adicionar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

void formatBRL;
