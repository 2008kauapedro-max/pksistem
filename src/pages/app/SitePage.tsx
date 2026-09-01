/* Editor do mini-site: personalização TUDO + rascunho/publicação + trava de "não salvou" + prévia ao vivo. */
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useBlocker } from "react-router-dom";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import { NICHES, nicheById, type SiteSettings, type ThemeId } from "../../lib/types";
import { cn, fileToDataUrl, isValidSlug, onlyDigits, slugify, validateImageFile } from "../../lib/utils";
import { Button, ErrorState, Field, Input, Modal, SkeletonRow, Spinner, Textarea, Toggle } from "../../components/ui";
import { PkMark } from "../../components/saas";
import { I } from "../../components/icons";

const THEMES: Array<{ id: ThemeId; label: string; hint: string }> = [
  { id: "moderno", label: "Moderno", hint: "Hero lado a lado, cards arredondados e fotos em destaque." },
  { id: "minimalista", label: "Minimalista", hint: "Limpo e direto: lista de produtos sem fotos, foco no nome e preço." },
  { id: "elegante", label: "Elegante", hint: "Títulos serifados, divisores finos e moldura clássica na foto." },
  { id: "bold", label: "Bold", hint: "Tipografia gigante e alto contraste — ideal para pastelarias e lanchonetes." },
];

const COLOR_PRESETS = ["#141411", "#2b2b26", "#7a2e2e", "#173f5c", "#5b3a7a", "#8c6a0d", "#134e4a", "#9d3b6b", "#1c523b", "#b45309"];

const TEXT_FIELDS: Array<{ key: keyof SiteSettings; label: string; placeholder: string; area?: boolean }> = [
  { key: "headerTagline", label: "Subtítulo do cabeçalho", placeholder: "Ex.: Cardápio digital & pedidos" },
  { key: "heroSubtitle", label: "Subtítulo da abertura", placeholder: "Frase curta abaixo do título principal" },
  { key: "menuEyebrow", label: "Chamada acima do cardápio", placeholder: "Ex.: Direto da cozinha" },
  { key: "menuTitle", label: "Título do cardápio", placeholder: "Ex.: Cardápio de hoje" },
  { key: "marmitaEyebrow", label: "Chamada da seção de pedidos", placeholder: "Ex.: Quer fazer um pedido?" },
  { key: "marmitaTitle", label: "Título da seção de pedidos", placeholder: "Ex.: Monte seu pedido e envie pelo WhatsApp." },
  { key: "marmitaSubtitle", label: "Subtítulo da seção de pedidos", placeholder: "Ex.: Sem cadastro, sem complicação…" },
  { key: "marmitaButtonText", label: "Botão da seção de pedidos", placeholder: "Ex.: Montar meu pedido" },
  { key: "orderPageTitle", label: "Título da página de pedido", placeholder: "Ex.: Monte seu pedido" },
  { key: "orderPageSubtitle", label: "Subtítulo da página de pedido", placeholder: "Ex.: Toque para adicionar os itens…" },
  { key: "footerText", label: "Frase do rodapé", placeholder: "Ex.: Aceitamos Pix, cartão e vale-refeição." },
];

export default function SitePage() {
  const { membership, refresh } = useAuth();
  const { push } = useToast();
  const tenantId = membership?.tenant.id ?? "";

  const { data: tenant, loading, error, reload } = useAsyncData(() => api.getMyTenant(), [tenantId]);
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    if (tenant) { setForm(tenant.settings); setDirty(false); }
  }, [tenant]);

  /* ---- trava de segurança: sair sem salvar ---- */
  const blocker = useBlocker(dirty && !saving);

  const preview = useMemo(() => form, [form]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setDirty(true);
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  async function handleSave() {
    if (!form) return;
    const errs: Record<string, string> = {};
    const slug = slugify(form.slug);
    if (!isValidSlug(slug)) errs.slug = "Endereço inválido.";
    if (!form.name.trim()) errs.name = "Informe o nome.";
    if (form.whatsapp && onlyDigits(form.whatsapp).length < 10) errs.whatsapp = "Número incompleto (DDI + DDD).";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { push("error", "Revise os campos destacados."); return; }
    setSaving(true);
    try {
      await api.updateSettings(tenantId, { ...form, slug });
      await refresh();
      setDirty(false);
      push("success", "Alterações salvas.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(published: boolean) {
    if (!form) return;
    setSaving(true);
    try {
      if (dirty) await api.updateSettings(tenantId, { ...form, slug: slugify(form.slug) });
      await api.publishSite(tenantId, published);
      await refresh();
      setDirty(false);
      push("success", published ? "Site publicado! Seus clientes já podem ver. 🟢" : "Site despublicado.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setSaving(false);
    }
  }

  function addCategory() {
    if (!form) return;
    const cat = newCat.trim();
    if (!cat) return;
    if (form.categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      push("error", "Essa categoria já existe.");
      return;
    }
    update("categories", [...form.categories, cat]);
    setNewCat("");
  }

  if (loading) return <div className="space-y-4"><div className="skeleton h-9 w-56 rounded-xl" /><SkeletonRow /><SkeletonRow /></div>;
  if (error || !form || !preview || !tenant) return <ErrorState message={error ?? "Erro ao carregar."} onRetry={reload} />;

  const published = tenant.settings.published;
  const niche = nicheById(form.niche);

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Meu site</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold", published ? "bg-pine-100 text-pine-800 dark:bg-pine-800 dark:text-pine-100" : "bg-saffron-100 text-saffron-800 dark:bg-saffron-900/40 dark:text-saffron-200")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", published ? "bg-pine-600" : "bg-saffron-500")} />
              {published ? "Publicado" : "Rascunho"}
            </span>
            {dirty && <span className="text-[12px] font-bold text-saffron-700 dark:text-saffron-300">Alterações não salvas</span>}
            <a href={`#/r/${preview.slug}`} className="text-[12.5px] font-extrabold text-saffron-700 hover:underline dark:text-saffron-300">pksistem.app/r/{preview.slug}</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {published ? (
            <Button variant="secondary" icon="eye" onClick={() => handlePublish(false)} disabled={saving}>Despublicar</Button>
          ) : (
            <Button variant="amber" icon="rocket" onClick={() => handlePublish(true)} loading={saving}>Publicar site</Button>
          )}
          <Button icon="check" onClick={handleSave} loading={saving} disabled={!dirty && published}>Salvar</Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          {/* Identidade */}
          <Section title="Identidade" icon="logo">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nome do negócio" required error={errors.name}>
                  <Input value={form.name} invalid={Boolean(errors.name)} maxLength={60} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="Endereço do site (slug)" required error={errors.slug}>
                  <Input value={form.slug} invalid={Boolean(errors.slug)} maxLength={40} onChange={(e) => update("slug", slugify(e.target.value))} />
                </Field>
              </div>
              <Field label="Título de destaque">
                <Input value={form.headline} maxLength={60} onChange={(e) => update("headline", e.target.value)} />
              </Field>
              <Field label="Descrição / slogan">
                <Textarea value={form.description} maxLength={160} onChange={(e) => update("description", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ImageUpload label="Logo" hint="PNG ou JPG quadrada" value={form.logoUrl} onPick={(url) => update("logoUrl", url)} onClear={() => update("logoUrl", null)} square />
                <ImageUpload label="Imagem de capa" hint="Foto de destaque da abertura" value={form.heroUrl} onPick={(url) => update("heroUrl", url)} onClear={() => update("heroUrl", null)} />
              </div>
            </div>
          </Section>

          {/* Categorias do negócio */}
          <Section title="Categorias do negócio" icon="layers">
            <p className="mb-3 text-[13px] leading-relaxed text-pine-600 dark:text-pine-300">
              Nicho: <strong className="text-pine-900 dark:text-pine-100">{niche.label}</strong>. Crie as categorias que fizerem sentido — ex.: Pastéis, Caldos, Porções…
            </p>
            <div className="flex flex-wrap gap-2">
              {form.categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-pine-100 px-3 py-1.5 text-[13px] font-bold text-pine-800 dark:bg-pine-800 dark:text-pine-100">
                  {c}
                  <button onClick={() => update("categories", form.categories.filter((x) => x !== c))} aria-label={`Remover ${c}`} className="text-pine-500 transition-colors hover:text-[#a83a2a]">
                    <I name="x" size={13} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newCat} maxLength={24} placeholder="Nova categoria…" onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
              <Button variant="secondary" icon="plus" onClick={addCategory} className="shrink-0">Adicionar</Button>
            </div>
            <p className="mt-2 text-[11.5px] font-semibold text-pine-500 dark:text-pine-400">Dica: troque de nicho para sugerir categorias prontas.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {NICHES.map((n) => (
                <button key={n.id} onClick={() => update("niche", n.id)} aria-pressed={form.niche === n.id}
                  className={cn("rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all", form.niche === n.id ? "border-pine-950 bg-pine-950 text-saffron-300" : "border-pine-200 text-pine-600 hover:border-pine-400 dark:border-pine-700 dark:text-pine-300")}>
                  {n.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Textos do site */}
          <Section title="Textos do site" icon="menuBook">
            <p className="mb-4 text-[13px] text-pine-600 dark:text-pine-300">Personalize <strong>todos</strong> os textos que aparecem no mini-site. Vazio = texto padrão.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TEXT_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.area ? (
                    <Textarea value={(form[f.key] as string) ?? ""} maxLength={140} placeholder={f.placeholder} onChange={(e) => update(f.key, e.target.value as never)} />
                  ) : (
                    <Input value={(form[f.key] as string) ?? ""} maxLength={90} placeholder={f.placeholder} onChange={(e) => update(f.key, e.target.value as never)} />
                  )}
                </Field>
              ))}
              <Field label="Texto do botão do cabeçalho" required>
                <Input value={form.ctaText} maxLength={30} onChange={(e) => update("ctaText", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Contato */}
          <Section title="Contato e informações" icon="whatsapp">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="WhatsApp" required error={errors.whatsapp} hint="DDI + DDD">
                  <Input value={form.whatsapp} invalid={Boolean(errors.whatsapp)} inputMode="tel" maxLength={20} onChange={(e) => update("whatsapp", onlyDigits(e.target.value))} />
                </Field>
                <Field label="Telefone fixo" hint="opcional">
                  <Input value={form.phone} maxLength={20} onChange={(e) => update("phone", e.target.value)} />
                </Field>
              </div>
              <Field label="Mensagem inicial do WhatsApp" hint="vai pré-preenchida">
                <Input value={form.whatsappMessage} maxLength={120} onChange={(e) => update("whatsappMessage", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Endereço">
                  <Input value={form.address} maxLength={120} onChange={(e) => update("address", e.target.value)} />
                </Field>
                <Field label="Horário de funcionamento">
                  <Input value={form.openingHours} maxLength={60} onChange={(e) => update("openingHours", e.target.value)} />
                </Field>
              </div>
              <Field label="Instagram">
                <Input value={form.instagram} placeholder="@seunegocio" maxLength={40} onChange={(e) => update("instagram", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Aparência */}
          <Section title="Aparência" icon="palette">
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-[13px] font-bold text-pine-900 dark:text-pine-100">Tema do mini-site</span>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => update("theme", t.id)} aria-pressed={form.theme === t.id}
                      className={cn("rounded-xl border-2 p-3.5 text-left transition-all", form.theme === t.id ? "border-saffron-500 bg-saffron-50 shadow-card dark:bg-saffron-900/20" : "border-pine-200 hover:border-pine-400 dark:border-pine-700")}>
                      <span className="flex items-center justify-between text-[13.5px] font-extrabold text-pine-950 dark:text-cream">
                        {t.label}
                        {form.theme === t.id && <I name="check" size={15} className="text-saffron-600" />}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-pine-600 dark:text-pine-300">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <ColorRow label="Cor principal" hint="botões e destaques" value={form.primaryColor} onChange={(c) => update("primaryColor", c)} />
              <ColorRow label="Cor secundária" hint="faixas escuras e rodapé" value={form.secondaryColor} onChange={(c) => update("secondaryColor", c)} />
              <ColorRow label="Cor de destaque" hint="detalhes e preços" value={form.accentColor} onChange={(c) => update("accentColor", c)} />
            </div>
          </Section>

          {/* Seções */}
          <Section title="Seções do site" icon="layers">
            <div className="space-y-3">
              <Toggle checked={form.sections.hero} onChange={(v) => update("sections", { ...form.sections, hero: v })} label="Abertura (hero)" description="Título, slogan e imagem de capa." />
              <Toggle checked={form.sections.menu} onChange={(v) => update("sections", { ...form.sections, menu: v })} label="Cardápio / produtos" description="Lista do que está disponível hoje (ou fixo)." />
              <Toggle checked={form.sections.marmita} onChange={(v) => update("sections", { ...form.sections, marmita: v })} label="Pedidos pelo WhatsApp" description="Botão e página para o cliente montar o pedido." />
              <Toggle checked={form.sections.info} onChange={(v) => update("sections", { ...form.sections, info: v })} label="Informações (rodapé)" description="Endereço, horário, WhatsApp e Instagram." />
            </div>
          </Section>
        </div>

        {/* Prévia ao vivo — ROLÁVEL e com as cores escolhidas */}
        <aside className="xl:sticky xl:top-6 xl:self-start" aria-label="Prévia do site">
          <p className="mb-2.5 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-pine-500 dark:text-pine-400"><I name="eye" size={15} /> Prévia ao vivo</p>
          <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[7px] border-pine-950 bg-paper shadow-pop">
            <div className="h-5 bg-pine-950" />
            {/* área rolável da prévia */}
            <div className="h-[520px] overflow-y-auto">
              {/* cabeçalho */}
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/5 bg-paper/95 px-3 py-2.5 backdrop-blur">
                {preview.logoUrl ? <img src={preview.logoUrl} alt="" className="h-6 w-6 rounded-md object-cover" /> : <PkMark size={24} />}
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[10px] font-extrabold text-ink">{preview.name || "Seu negócio"}</span>
                  <span className="block truncate text-[7px] font-bold uppercase tracking-widest text-ink/45">{preview.headerTagline || "Cardápio digital"}</span>
                </span>
                {preview.sections.marmita && (
                  <span className="ml-auto shrink-0 rounded-md px-2 py-1 text-[8px] font-extrabold text-white" style={{ backgroundColor: preview.primaryColor }}>{preview.ctaText || "Pedir"}</span>
                )}
              </div>

              {/* hero — reflete o tema */}
              {preview.sections.hero && (
                <div className="px-3 pt-3" style={{ backgroundColor: preview.theme === "bold" ? preview.secondaryColor : "transparent" }}>
                  <p className="text-[7.5px] font-extrabold uppercase tracking-widest" style={{ color: preview.accentColor }}>
                    {preview.theme === "bold" ? preview.name : "Cardápio de hoje"}
                  </p>
                  <p className={cn("mt-1 font-display font-bold leading-tight", preview.theme === "bold" ? "text-[20px] uppercase text-white" : "text-[15px] text-ink", preview.theme === "elegante" && "italic")}>
                    {(preview.headline || "Seu título")}{preview.theme !== "bold" && <span style={{ color: preview.accentColor }}>.</span>}
                  </p>
                  <p className={cn("mt-1 line-clamp-2 text-[8.5px] leading-snug", preview.theme === "bold" ? "text-white/70" : "text-ink/55")}>
                    {preview.heroSubtitle || preview.description}
                  </p>
                  <div className="pk-frame mt-3">
                    {preview.heroUrl ? (
                      <img src={preview.heroUrl} alt="" className="aspect-[4/3] w-full rounded-2xl border-4 border-white object-cover shadow-card" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border-4 border-white shadow-card" style={{ backgroundColor: preview.secondaryColor }}>
                        <PkMark size={34} />
                      </div>
                    )}
                  </div>
                  <span className="mt-3 inline-block rounded-lg px-2.5 py-1.5 text-[8.5px] font-extrabold text-white" style={{ backgroundColor: preview.primaryColor }}>
                    {preview.marmitaButtonText || "Montar meu pedido"}
                  </span>
                </div>
              )}

              {/* cardápio */}
              {preview.sections.menu && (
                <div className="px-3 py-3">
                  <p className="text-[7.5px] font-extrabold uppercase tracking-widest" style={{ color: preview.primaryColor }}>{preview.menuEyebrow || "Direto da cozinha"}</p>
                  <p className="font-display text-[12px] font-bold text-ink">{preview.menuTitle || "Cardápio de hoje"}</p>
                  <div className={cn("mt-2 space-y-1.5", preview.theme === "minimalista" && "divide-y divide-ink/10 space-y-0")}>
                    {["Produto exemplo 1", "Produto exemplo 2", "Produto exemplo 3"].map((n, i) => (
                      <div key={n} className={cn("flex items-center gap-2", preview.theme === "minimalista" ? "py-1.5" : "rounded-lg border border-ink/8 bg-cream p-1.5")}>
                        {preview.theme !== "minimalista" && <span className="h-7 w-7 shrink-0 rounded-md" style={{ backgroundColor: `${preview.accentColor}33` }} />}
                        <span className="flex-1 truncate text-[8.5px] font-extrabold text-ink">{n}</span>
                        <span className="text-[8px] font-extrabold" style={{ color: preview.primaryColor }}>R$ {12 + i * 3},00</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* seção de pedidos */}
              {preview.sections.marmita && (
                <div className="mx-3 mb-3 rounded-xl px-3 py-3 text-center" style={{ backgroundColor: preview.secondaryColor }}>
                  <p className="text-[7.5px] font-extrabold uppercase tracking-widest" style={{ color: preview.accentColor }}>{preview.marmitaEyebrow || "Quer fazer um pedido?"}</p>
                  <p className="mt-1 font-display text-[10.5px] font-bold leading-tight text-white">{preview.marmitaTitle || "Monte seu pedido e envie pelo WhatsApp."}</p>
                  <span className="mt-1.5 inline-block rounded-lg bg-saffron-400 px-2.5 py-1 text-[8px] font-extrabold text-pine-950">{preview.marmitaButtonText || "Montar meu pedido"}</span>
                </div>
              )}

              {/* rodapé */}
              {preview.sections.info && (
                <div className="px-3 py-2.5" style={{ backgroundColor: preview.secondaryColor }}>
                  {[preview.address, preview.openingHours, preview.instagram].filter(Boolean).slice(0, 3).map((l) => (
                    <p key={l} className="truncate text-[7.5px] font-semibold text-white/75">• {l}</p>
                  ))}
                  {preview.footerText && <p className="mt-1 text-[7.5px] italic text-white/60">{preview.footerText}</p>}
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-pine-500 dark:text-pine-400">
            Role a prévia para ver o site inteiro. Salve e publique para valer.
          </p>
        </aside>
      </div>

      {/* ---- trava: sair sem salvar ---- */}
      <Modal
        open={blocker.state === "blocked"}
        onClose={() => blocker.state === "blocked" && blocker.reset()}
        title="Opa! Alterações não salvas"
        subtitle="Você editou o mini-site e ainda não salvou."
        footer={
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="ghost" onClick={() => blocker.state === "blocked" && blocker.reset()}>Continuar editando</Button>
            <Button variant="danger" onClick={() => blocker.state === "blocked" && blocker.proceed()}>Sair sem salvar</Button>
            <Button
              icon="check"
              onClick={async () => {
                await handleSave();
                if (blocker.state === "blocked") blocker.proceed();
              }}
              loading={saving}
            >
              Salvar e sair
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 text-sm leading-relaxed text-pine-800 dark:text-pine-100">
          <span className="mt-0.5 shrink-0 rounded-full bg-saffron-100 p-2 text-saffron-700 dark:bg-saffron-900/40 dark:text-saffron-300"><I name="alert" size={18} /></span>
          <p>Deseja salvar as alterações do seu mini-site antes de sair desta página? Sem salvar, tudo que você editou aqui será perdido.</p>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- subcomponentes ---------- */

function Section({ title, icon, children }: { title: string; icon: Parameters<typeof I>[0]["name"]; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-pine-900">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-[17px] font-bold text-pine-950 dark:text-cream">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine-100 text-pine-700 dark:bg-pine-800 dark:text-pine-200"><I name={icon} size={17} /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Upload de imagem por ARQUIVO (dono de negócio não precisa saber o que é URL). */
function ImageUpload({ label, hint, value, onPick, onClear, square }: {
  label: string; hint: string; value: string | null;
  onPick: (url: string) => void; onClear: () => void; square?: boolean;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) { push("error", problem); return; }
    setBusy(true);
    try {
      const url = await fileToDataUrl(file, square ? 400 : 1200);
      onPick(url);
      push("success", `${label} atualizada. Lembre de salvar!`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Não foi possível processar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-bold text-pine-900 dark:text-pine-100">{label}</span>
      <div className="flex items-center gap-3">
        <div className={cn("shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-pine-300 bg-paper dark:border-pine-700 dark:bg-pine-950", square ? "h-16 w-16" : "h-16 w-24")}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-pine-400"><I name="image" size={20} /></div>}
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-pine-950 px-3.5 text-[12.5px] font-bold text-cream transition-colors hover:bg-pine-800 dark:bg-saffron-400 dark:text-pine-950 dark:hover:bg-saffron-300">
            {busy ? <Spinner size={14} /> : <I name="camera" size={14} />}
            {value ? "Trocar arquivo" : "Enviar arquivo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} disabled={busy} />
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-pine-500 dark:text-pine-400">{hint}</span>
            {value && <button onClick={onClear} className="text-[11px] font-extrabold text-[#a83a2a] hover:underline">Remover</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-pine-900 dark:text-pine-100">{label}</span>
        <span className="text-[11px] font-semibold text-pine-500 dark:text-pine-400">{hint}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_PRESETS.map((c) => (
          <button key={c} onClick={() => onChange(c)} aria-label={`Cor ${c}`} aria-pressed={value.toLowerCase() === c}
            className={cn("h-8 w-8 rounded-full border-2 transition-transform hover:scale-110", value.toLowerCase() === c ? "border-pine-950 ring-2 ring-saffron-400 ring-offset-2 dark:border-cream dark:ring-offset-pine-900" : "border-black/10")}
            style={{ backgroundColor: c }} />
        ))}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-pine-200 bg-paper px-2.5 py-1.5 text-[12px] font-bold text-pine-700 dark:border-pine-700 dark:bg-pine-950 dark:text-pine-200">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0" aria-label={`Personalizar ${label}`} />
          Qualquer cor
        </label>
      </div>
    </div>
  );
}
