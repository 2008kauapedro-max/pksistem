/* Landing page comercial do SaborFlow — vitrine do SaaS. */
import { Link } from "react-router-dom";
import { PLANS } from "../lib/plans";
import { IMG } from "../lib/api";
import { Wordmark, PlanCard, Accordion } from "../components/saas";
import { I, type IconName } from "../components/icons";
import { Button } from "../components/ui";
import { Reveal } from "../components/ui";

const TICKER = [
  "Feijão tropeiro", "Frango assado", "Carne de panela", "Arroz branco", "Salada tropical",
  "Macarrão ao molho", "Purê de batata", "Bife acebolado", "Pudim de leite", "Farofa crocante",
];

const BENEFITS: Array<{ icon: IconName; title: string; desc: string; wide?: boolean }> = [
  { icon: "globe", title: "Seu próprio mini-site", desc: "Cada restaurante ganha uma página pública com a sua marca, cores e cardápio — sem precisar de programador.", wide: true },
  { icon: "menuBook", title: "Cardápio sempre atualizado", desc: "Publique o cardápio do dia em segundos e reutilize pratos salvos na sua biblioteca." },
  { icon: "whatsapp", title: "Pedidos pelo WhatsApp", desc: "O cliente monta o pedido no site e ele chega prontinho no seu WhatsApp." },
  { icon: "palette", title: "Personalização total", desc: "Logo, cores, textos e seções. O site fica com a cara do seu restaurante." },
  { icon: "chart", title: "Analytics", desc: "Veja visualizações, pratos mais vistos e pedidos iniciados em tempo real.", wide: true },
  { icon: "users", title: "Gestão de equipe", desc: "Convide funcionários com papéis e permissões: dono, admin, editor ou visualizador." },
];

const FAQ = [
  { q: "Preciso saber programação?", a: "Não. Tudo é visual: você cadastra pratos, monta o cardápio e personaliza o site direto pelo painel, sem escrever uma linha de código." },
  { q: "Posso alterar meu cardápio a qualquer momento?", a: "Sim. O cardápio do dia é atualizado na hora. E com a biblioteca de pratos salvos, você cadastra uma vez e reutiliza sempre." },
  { q: "Posso mudar as cores e a logo?", a: "Sim. Na personalização você define cor principal, secundária, logo, imagem de capa e os textos do site." },
  { q: "Meus clientes precisam criar conta?", a: "Não. O cliente final só acessa o mini-site, vê o cardápio e pede pelo WhatsApp. Zero cadastro, zero fricção." },
  { q: "Meus dados ficam separados de outros restaurantes?", a: "Totalmente. O PKSISTEM é multi-tenant: cada restaurante é isolado no banco de dados. Um restaurante nunca vê os dados de outro." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Não há fidelidade. Você pode fazer upgrade, downgrade ou cancelar a qualquer momento pelo painel." },
];

function PhoneMockup() {
  const dishes = [
    { name: "Frango assado", cat: "Carnes", img: IMG.frango },
    { name: "Feijão tropeiro", cat: "Acompanhamentos", img: IMG.tropeiro },
    { name: "Salada tropical", cat: "Saladas", img: IMG.salada },
  ];
  return (
    <div className="relative mx-auto w-[270px] sm:w-[300px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-saffron-300/30 blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[2.4rem] border-[8px] border-pine-950 bg-paper shadow-pop">
        <div className="flex items-center justify-between bg-pine-900 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-cream">
            <span className="text-saffron-400"><FlowDot /></span>
            <span className="font-display text-[13px] font-bold">Sabor da Casa</span>
          </span>
          <span className="rounded-full bg-saffron-400 px-2.5 py-1 text-[9px] font-extrabold text-pine-950">Pedir marmita</span>
        </div>
        <div className="px-3.5 pt-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-saffron-700">Cardápio de hoje</p>
          <p className="font-display text-[17px] font-bold leading-tight text-pine-950">Comida de verdade<span className="text-saffron-500">.</span></p>
        </div>
        <div className="space-y-2 p-3.5">
          {dishes.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5 rounded-xl border border-pine-100 bg-cream p-2 shadow-card">
              <img src={d.img} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-extrabold text-pine-950">{d.name}</p>
                <p className="text-[9.5px] font-semibold text-pine-500">{d.cat}</p>
              </div>
              <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-pine-800 text-saffron-300"><I name="plus" size={12} /></span>
            </div>
          ))}
          <div className="rounded-xl bg-pine-900 px-3 py-2.5 text-center">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-saffron-300">Enviar pedido pelo WhatsApp</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -top-3 rotate-6 rounded-xl bg-pine-800 px-3 py-2 text-cream shadow-lift">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold"><I name="zap" size={13} className="text-saffron-400" /> 12 pratos hoje</p>
      </div>
      <div className="absolute -bottom-3 -left-5 -rotate-3 rounded-xl bg-saffron-400 px-3 py-2 text-pine-950 shadow-lift">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold"><I name="whatsapp" size={13} /> 24 pedidos hoje</p>
      </div>
    </div>
  );
}

function FlowDot() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 14a7 7 0 0 0 14 0" />
      <path d="M5 14c1.5-1.2 2.5-1.2 3.5 0s2 1.2 3.5 0 2-1.2 3.5 0 2 1.2 3.5 0" strokeOpacity="0.85" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-paper text-ink">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-pine-100/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="SaborFlow — início"><Wordmark /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {/* Rolagem por JS: com HashRouter, href="#ancora" trocaria a rota (404). */}
            {["Recursos", "Como funciona", "Planos", "FAQ"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  document
                    .getElementById(item.toLowerCase().replace(" ", "-"))
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="rounded-lg px-3 py-2 text-[13.5px] font-bold text-pine-700 transition-colors hover:bg-pine-100/70 hover:text-pine-950"
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/cadastro" className="hidden sm:block"><Button size="sm" variant="amber" icon="rocket">Criar conta</Button></Link>
            <Link to="/cadastro" className="sm:hidden"><Button size="sm" variant="amber">Criar</Button></Link>
          </div>
        </div>
      </header>

      {/* ===== HERO (assimétrico, com mockup vivo) ===== */}
      <section className="texture-dark relative overflow-hidden bg-pine-950 text-cream">
        <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full border-[36px] border-pine-800/50" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[30px] border-pine-800/40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-pine-700 bg-pine-900/70 px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-saffron-300">
              <I name="zap" size={14} /> Plataforma para restaurantes
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.3rem,6vw,4rem)] font-semibold leading-[1.04]">
              Seu restaurante merece mais do que um cardápio<span className="text-saffron-400">.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-pine-200">
              Crie seu mini-site, publique seu cardápio do dia e receba pedidos pelo WhatsApp — tudo em uma única plataforma, simples assim.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro"><Button size="lg" variant="amber" icon="rocket">Começar agora — grátis</Button></Link>
              <a href="#/r/sabor-da-casa"><Button size="lg" variant="dark" icon="eye" className="border border-pine-700">Ver demonstração</Button></a>
            </div>
            <p className="mt-5 text-[13px] font-semibold text-pine-400">
              Trial de 14 dias · Sem cartão de crédito · Cancele quando quiser
            </p>
          </Reveal>
          <Reveal delay={120}>
            <PhoneMockup />
          </Reveal>
        </div>

        {/* Marquee de pratos */}
        <div className="relative border-t border-pine-800 bg-pine-900/60 py-3" aria-hidden="true">
          <div className="flex w-max animate-[marquee_32s_linear_infinite] gap-8 whitespace-nowrap">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={`${t}-${i}`} className="flex items-center gap-2 font-display text-[15px] font-semibold text-pine-300">
                <span className="text-saffron-400">✦</span> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NÚMEROS ===== */}
      <section className="border-b border-pine-100 bg-cream">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4">
          {[
            { v: "3 min", l: "para publicar seu site" },
            { v: "100%", l: "dados isolados por restaurante" },
            { v: "0", l: "linhas de código necessárias" },
            { v: "24/7", l: "seu cardápio no ar" },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-display text-[30px] font-bold text-pine-800">{s.v}</p>
              <p className="text-[12.5px] font-semibold text-pine-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== RECURSOS (bento grid) ===== */}
      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-saffron-700">Recursos</p>
          <h2 className="mt-2 font-display text-[clamp(1.7rem,4vw,2.5rem)] font-bold text-pine-950">
            Tudo que seu restaurante precisa<span className="text-saffron-500">.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 60} className={b.wide ? "md:col-span-2" : ""}>
              <div className="group h-full rounded-2xl border border-pine-100 bg-cream p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-saffron-300 hover:shadow-lift">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pine-100 text-pine-700 transition-colors group-hover:bg-saffron-400 group-hover:text-pine-950">
                  <I name={b.icon} size={22} />
                </span>
                <h3 className="mt-4 font-display text-[18px] font-bold text-pine-950">{b.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-pine-600">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="texture-dark scroll-mt-20 bg-pine-950 py-16 text-cream">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-saffron-300">Como funciona</p>
            <h2 className="mt-2 font-display text-[clamp(1.7rem,4vw,2.5rem)] font-bold">Do cadastro ao primeiro pedido<span className="text-saffron-400">.</span></h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { n: "1", t: "Crie sua conta", d: "Cadastre seu restaurante e ganhe um mini-site com endereço próprio." },
              { n: "2", t: "Monte o cardápio", d: "Cadastre pratos uma vez e publique o cardápio do dia em segundos." },
              { n: "3", t: "Compartilhe o link", d: "Divulgue seu endereço. O cliente acessa sem criar conta." },
              { n: "4", t: "Receba no WhatsApp", d: "O pedido chega organizado direto no WhatsApp do restaurante." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative rounded-2xl border border-pine-800 bg-pine-900/60 p-6">
                  <span className="font-display text-[42px] font-bold leading-none text-pine-700">{s.n}</span>
                  <h3 className="mt-3 font-display text-[17px] font-bold text-cream">{s.t}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-pine-300">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <Reveal>
          <div className="text-center">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-saffron-700">Planos</p>
            <h2 className="mt-2 font-display text-[clamp(1.7rem,4vw,2.5rem)] font-bold text-pine-950">Um plano para cada fase<span className="text-saffron-500">.</span></h2>
            <p className="mx-auto mt-3 max-w-xl text-[14.5px] text-pine-600">Comece grátis e evolua quando precisar. Sem fidelidade, sem surpresa.</p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <PlanCard planId={p.id} onSelect={() => { window.location.hash = "#/cadastro"; }} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="text-center">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-saffron-700">Perguntas frequentes</p>
            <h2 className="mt-2 font-display text-[clamp(1.7rem,4vw,2.3rem)] font-bold text-pine-950">Ainda com dúvidas<span className="text-saffron-500">?</span></h2>
          </div>
        </Reveal>
        <div className="mt-8">
          <Accordion items={FAQ} />
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="texture-dark bg-pine-900 py-16 text-center text-cream">
        <Reveal>
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="font-display text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold leading-tight">
              Coloque seu restaurante online hoje<span className="text-saffron-400">.</span>
            </h2>
            <p className="mt-3 text-[15px] text-pine-200">Seu restaurante online, simples assim.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/cadastro"><Button size="lg" variant="amber" icon="rocket">Começar agora — grátis</Button></Link>
              <a href="#/r/sabor-da-casa"><Button size="lg" variant="dark" className="border border-pine-700" icon="eye">Ver demonstração</Button></a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-pine-950 py-10 text-pine-300">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
          <Wordmark dark />
          <nav className="flex flex-wrap justify-center gap-5 text-[13px] font-semibold" aria-label="Rodapé">
            <Link to="/planos" className="transition-colors hover:text-saffron-300">Planos</Link>
            <Link to="/login" className="transition-colors hover:text-saffron-300">Entrar</Link>
            <a href="#/r/sabor-da-casa" className="transition-colors hover:text-saffron-300">Demonstração</a>
            <Link to="/privacidade" className="transition-colors hover:text-saffron-300">Privacidade</Link>
          </nav>
          <p className="text-[12px]">© {new Date().getFullYear()} PKSISTEM</p>
        </div>
      </footer>
    </div>
  );
}
