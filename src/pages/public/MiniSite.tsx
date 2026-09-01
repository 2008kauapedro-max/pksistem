/* Mini-site público do tenant (/r/:slug) — a vitrine do cliente final.
 * Temas funcionais (moderno/minimalista/elegante/bold), moldura na foto de capa,
 * adicionais pagos e registro do pedido + cliente antes de abrir o WhatsApp. */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { DailyMenuItem, Food, SiteSettings, Tenant, ThemeId } from "../../lib/types";
import { cn, formatBRL, formatDateLong, todayISO, waLink } from "../../lib/utils";
import { useAsyncData } from "../../context/providers";
import { Button, EmptyState, ErrorState, FoodImage, FramedImage, Input, Reveal, Textarea } from "../../components/ui";
import { I } from "../../components/icons";
import { PkMark } from "../../components/saas";

function useSite(slug: string | undefined) {
  return useAsyncData(async () => {
    if (!slug) return null;
    const data = await api.getPublicSite(slug);
    if (data) api.trackPublic(slug, "site_view");
    return data;
  }, [slug]);
}

/* Configurações visuais por tema — cada tema muda o site DE VERDADE. */
interface ThemeStyle {
  heroLayout: "split" | "center";
  heroUppercase: boolean;
  menuPhotos: boolean;
  cardRadius: string;
  divider: boolean;
  serif: boolean;
}
const THEME_STYLE: Record<ThemeId, ThemeStyle> = {
  moderno: { heroLayout: "split", heroUppercase: false, menuPhotos: true, cardRadius: "rounded-2xl", divider: false, serif: false },
  minimalista: { heroLayout: "center", heroUppercase: false, menuPhotos: false, cardRadius: "rounded-lg", divider: true, serif: false },
  elegante: { heroLayout: "split", heroUppercase: false, menuPhotos: true, cardRadius: "rounded-xl", divider: true, serif: true },
  bold: { heroLayout: "center", heroUppercase: true, menuPhotos: true, cardRadius: "rounded-2xl", divider: false, serif: false },
};

function Shell({ tenant, children, active }: { tenant: Tenant; children: React.ReactNode; active: "home" | "pedido" }) {
  const s = tenant.settings;
  return (
    <div className="min-h-dvh bg-[#f4f4f1]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link to={`/r/${tenant.slug}`} className="flex min-w-0 items-center gap-2.5" aria-label="Página inicial">
            {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <PkMark size={38} />}
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[16px] font-bold text-[#16161a]">{s.name}</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#16161a]/45 sm:block">{s.headerTagline || "Cardápio digital"}</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Link to={`/r/${tenant.slug}`} className={cn("hidden rounded-lg px-3 py-2 text-[13.5px] font-bold transition-colors sm:block", active === "home" ? "text-[#16161a]" : "text-[#16161a]/55 hover:text-[#16161a]")}>
              Cardápio
            </Link>
            {s.sections.marmita && (
              <Link to={`/r/${tenant.slug}/pedido`} className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[13px] font-extrabold text-white shadow-card transition-all hover:brightness-110 active:scale-[0.98] sm:px-4" style={{ backgroundColor: s.primaryColor }}>
                <I name="lunchbox" size={17} /> {s.ctaText}
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
      <Footer tenant={tenant} />
    </div>
  );
}

function Footer({ tenant }: { tenant: Tenant }) {
  const s = tenant.settings;
  if (!s.sections.info) return null;
  const infos = [
    { icon: "pin" as const, label: "Endereço", value: s.address },
    { icon: "clock" as const, label: "Horário", value: s.openingHours },
    { icon: "whatsapp" as const, label: "WhatsApp", value: s.whatsapp ? `+${s.whatsapp}` : "", href: s.whatsapp ? waLink(s.whatsapp, s.whatsappMessage) : undefined },
    { icon: "instagram" as const, label: "Instagram", value: s.instagram, href: s.instagram ? `https://instagram.com/${s.instagram.replace(/^@+/, "")}` : undefined },
  ].filter((i) => i.value);
  return (
    <footer className="texture-dark mt-16 text-white" style={{ backgroundColor: s.secondaryColor }}>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {infos.map((info) => (
            <div key={info.label} className="rounded-2xl border border-white/15 bg-white/5 p-4.5">
              <p className="flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: s.accentColor }}>
                <I name={info.icon} size={15} /> {info.label}
              </p>
              {info.href ? (
                <a href={info.href} target="_blank" rel="noreferrer" className="mt-2 block break-words text-[14px] font-semibold leading-relaxed text-white underline-offset-4 transition-colors hover:underline" style={{ textDecorationColor: s.accentColor }}>{info.value}</a>
              ) : (
                <p className="mt-2 break-words text-[14px] font-semibold leading-relaxed text-white/90">{info.value}</p>
              )}
            </div>
          ))}
        </div>
        {s.footerText && <p className="mt-8 text-center text-[13.5px] font-semibold leading-relaxed text-white/80">{s.footerText}</p>}
        <p className="mt-4 text-center text-[12px] text-white/50">
          © {new Date().getFullYear()} {s.name} · Feito com <span className="font-extrabold" style={{ color: s.accentColor }}>PKSISTEM</span>
        </p>
      </div>
    </footer>
  );
}

export function MiniSitePage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useSite(slug);
  const s = data?.tenant.settings;

  useEffect(() => {
    if (s) document.title = `${s.name} · Cardápio`;
  }, [s]);

  if (loading) return <MiniLoading />;
  if (error || !data) return <MiniError message={error ?? "Página não encontrada."} onRetry={reload} />;

  const { tenant, items } = data;
  const st = tenant.settings;
  const theme = THEME_STYLE[st.theme ?? "moderno"];

  if (tenant.status === "suspended" || tenant.status === "pending_deletion") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 text-center">
        <PkMark size={56} />
        <h1 className="mt-4 font-display text-2xl font-bold text-pine-950">Temporariamente indisponível</h1>
        <p className="mt-2 max-w-sm text-[14px] text-pine-600">Este estabelecimento está com o site suspenso no momento. Volte em breve!</p>
      </div>
    );
  }
  if (!st.published) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 text-center">
        <PkMark size={56} />
        <h1 className="mt-4 font-display text-2xl font-bold text-pine-950">Site em construção</h1>
        <p className="mt-2 max-w-sm text-[14px] text-pine-600">Este negócio ainda não publicou o cardápio. Volte em instantes!</p>
      </div>
    );
  }

  const cats = Array.from(new Set([...st.categories, ...items.map((i) => i.food?.category).filter(Boolean) as string[]]));
  const groups = cats.map((cat) => ({ cat, list: items.filter((i) => i.food?.category === cat) })).filter((g) => g.list.length > 0);
  const isFixed = st.menuMode === "fixo";

  return (
    <Shell tenant={tenant} active="home">
      {/* Hero — o layout muda conforme o tema */}
      {st.sections.hero && (
        <section className="texture-dark relative overflow-hidden text-white" style={{ backgroundColor: st.secondaryColor }}>
          <div className={cn("mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16", theme.heroLayout === "split" ? "grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]" : "flex flex-col items-center text-center")}>
            <Reveal className={theme.heroLayout === "center" ? "max-w-2xl" : ""}>
              <p className={cn("inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em]", theme.heroLayout === "center" && "mx-auto")} style={{ color: st.accentColor }}>
                <I name="calendar" size={14} /> {isFixed ? "Nosso cardápio" : `Cardápio de hoje · ${formatDateLong(todayISO())}`}
              </p>
              <h1 className={cn("mt-5 font-display leading-[1.06]", theme.heroUppercase && "uppercase tracking-tight", theme.serif && "italic", theme.heroLayout === "center" ? "text-[clamp(2.2rem,7vw,3.6rem)]" : "text-[clamp(2rem,6vw,3.2rem)]")}>
                {st.headline}<span style={{ color: st.accentColor }}>.</span>
              </h1>
              <p className={cn("mt-4 max-w-lg text-[16px] leading-relaxed text-white/80", theme.heroLayout === "center" && "mx-auto")}>{st.heroSubtitle || st.description}</p>
              {st.sections.marmita && (
                <div className={cn("mt-7 flex flex-wrap gap-3", theme.heroLayout === "center" && "justify-center")}>
                  <Link to={`/r/${tenant.slug}/pedido`}>
                    <Button size="lg" variant="amber" icon="lunchbox">{st.ctaText}</Button>
                  </Link>
                </div>
              )}
            </Reveal>
            {st.heroUrl && theme.heroLayout === "split" && (
              <Reveal delay={120}>
                <FramedImage src={st.heroUrl} alt={`Foto de destaque do ${st.name}`} className="mx-auto aspect-[4/5] max-w-md" />
              </Reveal>
            )}
          </div>
          {st.heroUrl && theme.heroLayout === "center" && (
            <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
              <Reveal delay={120}><FramedImage src={st.heroUrl} alt={`Foto de destaque do ${st.name}`} className="aspect-[21/9] w-full" /></Reveal>
            </div>
          )}
        </section>
      )}

      {/* Cardápio */}
      {st.sections.menu && (
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Reveal>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em]" style={{ color: st.primaryColor }}>{st.menuEyebrow || "Direto da cozinha"}</p>
            <h2 className={cn("mt-1 font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-[#16161a]", theme.serif && "italic")}>{st.menuTitle || "Cardápio de hoje"}</h2>
          </Reveal>

          {items.length === 0 ? (
            <div className="mt-8">
              <EmptyState icon="menuBook" title="O cardápio ainda não foi publicado" description="Volte em instantes — a cozinha está preparando as delícias do dia." />
            </div>
          ) : (
            <div className="mt-8 space-y-9">
              {groups.map((g, gi) => (
                <Reveal key={g.cat} delay={gi * 60}>
                  <section aria-label={g.cat}>
                    <div className="mb-4 flex items-center gap-3">
                      <h3 className={cn("font-display text-[21px] font-bold text-[#16161a]", theme.serif && "italic")}>{g.cat}</h3>
                      <span className="h-px flex-1 bg-black/10" />
                      <span className="text-[12px] font-bold text-black/45">{g.list.length} {g.list.length === 1 ? "opção" : "opções"}</span>
                    </div>
                    <div className={theme.menuPhotos ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-0"}>
                      {g.list.map((item) => (
                        <MenuItemCard key={item.id} item={item} settings={st} slug={tenant.slug} theme={theme} />
                      ))}
                    </div>
                  </section>
                </Reveal>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Banda de pedidos */}
      {st.sections.marmita && (
        <section className="texture-dark py-12 text-white" style={{ backgroundColor: st.secondaryColor }}>
          <Reveal>
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <p className="flex items-center justify-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.16em]" style={{ color: st.accentColor }}>
                <I name="lunchbox" size={16} /> {st.marmitaEyebrow || "Quer fazer um pedido?"}
              </p>
              <h2 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-bold">{st.marmitaTitle || "Monte seu pedido e envie pelo WhatsApp."}</h2>
              <p className="mt-2 text-[14.5px] text-white/75">{st.marmitaSubtitle || "Sem complicação: escolha os itens e a gente confirma na hora."}</p>
              <Link to={`/r/${tenant.slug}/pedido`} className="mt-6 inline-block">
                <Button size="lg" variant="amber" icon="whatsapp">{st.marmitaButtonText || "Montar meu pedido"}</Button>
              </Link>
            </div>
          </Reveal>
        </section>
      )}
    </Shell>
  );
}

function MenuItemCard({ item, settings: st, slug, theme }: { item: DailyMenuItem; settings: SiteSettings; slug: string; theme: ThemeStyle }) {
  const f = item.food;
  const unavailable = f?.availability === "indisponivel" || f?.availability === "esgotado";

  /* tema minimalista: linha limpa, sem foto */
  if (!theme.menuPhotos) {
    return (
      <Link to={`/r/${slug}/pedido`} className={cn("group flex items-baseline justify-between gap-4 border-b border-black/10 py-3.5 transition-colors hover:bg-white/70", unavailable && "opacity-50")}>
        <span className="min-w-0">
          <span className="block truncate text-[15.5px] font-extrabold text-[#16161a]">{f?.name}</span>
          {f?.description && <span className="mt-0.5 block truncate text-[12.5px] text-black/50">{f.description}</span>}
          {(f?.extras.length ?? 0) > 0 && <span className="mt-0.5 block text-[11px] font-extrabold" style={{ color: st.primaryColor }}>+ {f?.extras.map((x) => x.name).join(" · ")}</span>}
        </span>
        <span className="shrink-0 text-[14.5px] font-extrabold" style={{ color: st.primaryColor }}>{f?.price != null ? formatBRL(f.price) : ""}</span>
      </Link>
    );
  }

  return (
    <article className={cn("group flex items-center gap-3.5 border border-black/5 bg-white p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift", theme.cardRadius, unavailable && "opacity-60")}>
      <FoodImage src={f?.imageUrl ?? null} alt={`Foto de ${f?.name ?? "produto"}`} category={f?.category} className="h-16 w-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-extrabold text-[#16161a]">{f?.name}</span>
          {f?.price != null && <span className="shrink-0 text-[13px] font-extrabold" style={{ color: st.primaryColor }}>{formatBRL(f.price)}</span>}
        </p>
        {f?.description && <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-relaxed text-black/50">{f.description}</p>}
        {(f?.extras.length ?? 0) > 0 && <p className="mt-0.5 text-[11px] font-extrabold" style={{ color: st.accentColor }}>+ adicionais: {f?.extras.map((x) => x.name).join(", ")}</p>}
        {unavailable && <p className="mt-1 text-[11px] font-extrabold uppercase text-[#a83a2a]">{f?.availability === "esgotado" ? "Esgotado hoje" : "Indisponível"}</p>}
      </div>
      <Link to={`/r/${slug}/pedido`} aria-label={`Pedir ${f?.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110" style={{ backgroundColor: st.primaryColor }}>
        <I name="plus" size={16} />
      </Link>
    </article>
  );
}

/* ---------- Página de pedido (carrinho + adicionais + dados do cliente → WhatsApp) ---------- */

export function MiniSiteOrderPage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!slug) return null;
    const [site, items] = await Promise.all([api.getPublicSite(slug), api.getPublicMenu(slug, todayISO())]);
    if (site) api.trackPublic(slug, "order_started");
    return site ? { tenant: site.tenant, items } : null;
  }, [slug]);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [chosenExtras, setChosenExtras] = useState<Record<string, string[]>>({});
  const [observation, setObservation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const s = data?.tenant.settings;

  useEffect(() => {
    if (s) document.title = `Pedir · ${s.name}`;
  }, [s]);

  const entries = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ item: data?.items.find((i) => i.id === id), qty })).filter((e) => e.item && e.qty > 0),
    [cart, data],
  );
  const extrasTotal = entries.reduce((acc, e) => {
    const food = e.item?.food;
    const picked = chosenExtras[e.item?.id ?? ""] ?? [];
    return acc + (food?.extras ?? []).filter((x) => picked.includes(x.name) && x.price != null).reduce((a, x) => a + (x.price ?? 0), 0) * e.qty;
  }, 0);
  const itemsTotal = entries.reduce((acc, e) => acc + (e.item?.food?.price ?? 0) * e.qty, 0);
  const total = itemsTotal + extrasTotal;

  if (loading) return <MiniLoading />;
  if (error || !data || !s) return <MiniError message={error ?? "Não foi possível carregar."} onRetry={reload} />;
  const { tenant, items } = data;

  function add(id: string) { setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 })); setSent(false); }
  function sub(id: string) { setCart((c) => { const q = (c[id] ?? 0) - 1; const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; }); setSent(false); }
  function toggleExtra(itemId: string, name: string) {
    setChosenExtras((m) => {
      const cur = m[itemId] ?? [];
      return { ...m, [itemId]: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name] };
    });
    setSent(false);
  }

  async function send() {
    if (!s || entries.length === 0 || sending) return;
    setSending(true);
    const orderItems = entries.map((e) => ({ name: e.item?.food?.name ?? "", qty: e.qty, price: e.item?.food?.price ?? null }));
    const lines: string[] = [];
    entries.forEach((e) => {
      const f = e.item?.food as Food | undefined;
      lines.push(`• ${e.qty}x ${f?.name}${f?.price != null ? ` (${formatBRL(f.price)})` : ""}`);
      const picked = (chosenExtras[e.item?.id ?? ""] ?? []).map((n) => f?.extras.find((x) => x.name === n)).filter(Boolean);
      picked.forEach((x) => lines.push(`   + ${x?.name}${x?.price != null ? ` (${formatBRL(x.price)})` : ""}`));
    });
    const msg = [
      `Olá! Gostaria de fazer um pedido pelo site do ${s.name}. 🍽️`,
      ``,
      ...lines,
      ``,
      total > 0 ? `Total estimado: ${formatBRL(total)}` : null,
      observation.trim() ? `\nObservação: ${observation.trim()}` : null,
      customerName.trim() ? `\nNome: ${customerName.trim()}` : null,
      customerPhone.trim() ? `Telefone: ${customerPhone.trim()}` : null,
      customerEmail.trim() ? `E-mail: ${customerEmail.trim()}` : null,
      ``,
      `Gostaria de saber a disponibilidade e confirmar o valor.`,
    ].filter(Boolean).join("\n");
    try {
      // Registra pedido + cliente no sistema ANTES de abrir o WhatsApp.
      await api.placePublicOrder(tenant.slug, {
        customerName, customerPhone: customerPhone || null, customerEmail: customerEmail || null,
        items: orderItems, observation: observation || null,
      });
      setSent(true);
    } catch {
      /* mesmo se o registro falhar, o pedido segue pelo WhatsApp */
    }
    api.trackPublic(tenant.slug, "whatsapp_click");
    window.open(waLink(s.whatsapp, msg), "_blank", "noopener,noreferrer");
    setSending(false);
  }

  const cats = Array.from(new Set([...s.categories, ...items.map((i) => i.food?.category).filter(Boolean) as string[]]));

  return (
    <Shell tenant={tenant} active="pedido">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to={`/r/${tenant.slug}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-black/55 transition-colors hover:text-black">
          <I name="arrowLeft" size={15} /> Voltar ao cardápio
        </Link>
        <h1 className="mt-3 font-display text-[clamp(1.7rem,4.5vw,2.4rem)] font-bold text-[#16161a]">{s.orderPageTitle || "Monte seu pedido"}<span style={{ color: s.primaryColor }}>.</span></h1>
        <p className="mt-1.5 text-[14.5px] text-black/55">{s.orderPageSubtitle || "Toque para adicionar os itens e envie tudo pelo WhatsApp."}</p>

        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_330px]">
          <div className="space-y-8">
            {cats.map((cat) => {
              const list = items.filter((i) => i.food?.category === cat && i.food?.availability !== "oculto");
              if (list.length === 0) return null;
              return (
                <section key={cat} aria-label={cat}>
                  <h2 className="mb-3.5 font-display text-[19px] font-bold text-[#16161a]">{cat}</h2>
                  <div className="space-y-3">
                    {list.map((item) => {
                      const qty = cart[item.id] ?? 0;
                      const f = item.food;
                      const unavailable = f?.availability === "indisponivel" || f?.availability === "esgotado";
                      const picked = chosenExtras[item.id] ?? [];
                      return (
                        <div key={item.id} className={cn("rounded-2xl border border-black/5 bg-white p-3.5 shadow-card", unavailable && "opacity-50")}>
                          <div className="flex items-center gap-3">
                            <FoodImage src={f?.imageUrl ?? null} alt={f?.name ?? ""} category={f?.category} className="h-14 w-14 shrink-0 rounded-xl" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14.5px] font-extrabold text-[#16161a]">{f?.name}</p>
                              <p className="text-[12.5px] font-bold" style={{ color: s.primaryColor }}>{f?.price != null ? `${formatBRL(f.price)} / un.` : f?.category}</p>
                            </div>
                            {unavailable ? (
                              <span className="text-[11px] font-extrabold uppercase text-[#a83a2a]">{f?.availability === "esgotado" ? "Esgotado" : "Indisponível"}</span>
                            ) : qty === 0 ? (
                              <button onClick={() => add(item.id)} aria-label={`Adicionar ${f?.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-110" style={{ backgroundColor: s.primaryColor }}>
                                <I name="plus" size={16} />
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => sub(item.id)} aria-label={`Remover um ${f?.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black/15 text-black/65 transition-colors hover:border-black/40">
                                  <I name="x" size={14} />
                                </button>
                                <span className="w-5 text-center text-[14px] font-extrabold text-[#16161a]">{qty}</span>
                                <button onClick={() => add(item.id)} aria-label={`Adicionar mais ${f?.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110" style={{ backgroundColor: s.primaryColor }}>
                                  <I name="plus" size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          {/* adicionais pagos */}
                          {!unavailable && qty > 0 && (f?.extras.length ?? 0) > 0 && (
                            <div className="mt-3 border-t border-black/5 pt-2.5">
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-black/45">Adicionais</p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {f?.extras.map((x) => {
                                  const on = picked.includes(x.name);
                                  return (
                                    <button key={x.name} onClick={() => toggleExtra(item.id, x.name)} aria-pressed={on}
                                      className={cn("inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[12px] font-bold transition-all active:scale-[0.97]", on ? "border-current bg-current/10" : "border-black/15 text-black/60 hover:border-black/35")}
                                      style={on ? { color: s.primaryColor, backgroundColor: `${s.primaryColor}14`, borderColor: s.primaryColor } : undefined}>
                                      {on && <I name="check" size={12} />}
                                      + {x.name}{x.price != null && <span className="opacity-70">{formatBRL(x.price)}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Resumo / carrinho */}
          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Resumo do pedido">
            <div className="texture-dark overflow-hidden rounded-3xl text-white shadow-lift" style={{ backgroundColor: s.secondaryColor }}>
              <div className="border-b border-white/15 px-5 py-4">
                <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: s.accentColor }}>
                  <I name="lunchbox" size={16} /> Seu pedido
                </p>
              </div>
              <div className="min-h-[90px] px-5 py-4">
                {entries.length === 0 ? (
                  <p className="text-[13.5px] leading-relaxed text-white/60">Seu pedido aparece aqui. Comece adicionando os itens do dia.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {entries.map((e) => {
                      const f = e.item?.food;
                      const picked = (chosenExtras[e.item?.id ?? ""] ?? []).filter((n) => f?.extras.some((x) => x.name === n));
                      return (
                        <li key={e.item?.id}>
                          <p className="flex items-baseline justify-between gap-2 text-[13.5px] font-bold">
                            <span className="min-w-0 truncate">{e.qty}x {f?.name}</span>
                            {f?.price != null && <span className="shrink-0 text-white/70">{formatBRL((f.price ?? 0) * e.qty)}</span>}
                          </p>
                          {picked.map((n) => {
                            const x = f?.extras.find((y) => y.name === n);
                            return <p key={n} className="pl-3 text-[12px] font-semibold text-white/65">+ {n}{x?.price != null ? ` · ${formatBRL(x.price)}` : ""}</p>;
                          })}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="space-y-3 bg-black/20 px-5 py-4">
                <div>
                  <label htmlFor="cli-nome" className="mb-1 block text-[11.5px] font-extrabold text-white/70">Seu nome</label>
                  <Input id="cli-nome" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setSent(false); }} placeholder="Como podemos te chamar?" maxLength={60} className="h-10 bg-white/95 text-[13.5px] dark:bg-white/95 dark:text-[#16161a]" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="cli-fone" className="mb-1 block text-[11.5px] font-extrabold text-white/70">Telefone</label>
                    <Input id="cli-fone" value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setSent(false); }} placeholder="(63) 99999-0000" inputMode="tel" maxLength={20} className="h-10 bg-white/95 text-[13.5px] dark:bg-white/95 dark:text-[#16161a]" />
                  </div>
                  <div>
                    <label htmlFor="cli-mail" className="mb-1 block text-[11.5px] font-extrabold text-white/70">E-mail</label>
                    <Input id="cli-mail" type="email" value={customerEmail} onChange={(e) => { setCustomerEmail(e.target.value); setSent(false); }} placeholder="voce@email.com" maxLength={80} className="h-10 bg-white/95 text-[13.5px] dark:bg-white/95 dark:text-[#16161a]" />
                  </div>
                </div>
                <div>
                  <label htmlFor="obs" className="mb-1 block text-[11.5px] font-extrabold text-white/70">Observação (opcional)</label>
                  <Textarea id="obs" value={observation} onChange={(e) => { setObservation(e.target.value); setSent(false); }} placeholder="Ex.: sem cebola, molho à parte…" maxLength={200} className="bg-white/95 text-[13.5px] dark:bg-white/95 dark:text-[#16161a]" />
                </div>
                {total > 0 && <p className="flex items-baseline justify-between text-[14px] font-extrabold"><span>Total estimado</span><span style={{ color: s.accentColor }}>{formatBRL(total)}</span></p>}
                <Button variant="amber" size="lg" full icon="whatsapp" disabled={entries.length === 0} loading={sending} onClick={send}>
                  Enviar pedido pelo WhatsApp
                </Button>
                {sent && <p className="flex items-center justify-center gap-1.5 text-center text-[12px] font-bold animate-fade-in" style={{ color: s.accentColor }}><I name="check" size={14} /> Pedido registrado! Abrimos o WhatsApp para você confirmar.</p>}
                {entries.length === 0 && <p className="text-center text-[12px] font-semibold text-white/55">Adicione ao menos um item para continuar.</p>}
              </div>
            </div>
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-black/45">
              Seu pedido fica salvo no sistema de {s.name} e o WhatsApp abre com tudo pronto. O valor final é confirmado pelo estabelecimento.
            </p>
          </aside>
        </div>
      </main>
    </Shell>
  );
}

/* ---------- Estados ---------- */

function MiniLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
      <div className="skeleton h-10 w-2/3 rounded-xl" />
      <div className="skeleton h-28 w-full rounded-2xl" />
      <div className="skeleton h-28 w-full rounded-2xl" />
      <div className="skeleton h-28 w-full rounded-2xl" />
    </div>
  );
}

function MiniError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md">
        <ErrorState message={message} onRetry={onRetry} />
        <div className="mt-4 text-center">
          <Link to="/" className="text-[13.5px] font-bold text-saffron-700 hover:underline">Conhecer o PKSISTEM</Link>
        </div>
      </div>
    </div>
  );
}
