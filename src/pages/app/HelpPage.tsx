/* Ajuda: guia rápido do painel + PKChat + contratação/contato do suporte. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useAsyncData } from "../../context/providers";
import { api } from "../../lib/api";
import type { PlatformSettings } from "../../lib/types";
import { waLink } from "../../lib/utils";
import PkChat from "../../components/PkChat";
import { Button } from "../../components/ui";
import { I, type IconName } from "../../components/icons";
import { Accordion } from "../../components/saas";

const GUIDE: Array<{ icon: IconName; tab: string; to: string; text: string }> = [
  { icon: "dashboard", tab: "Dashboard", to: "/app", text: "Visão geral: produtos de hoje, pedidos, plano e atalhos para as ações mais usadas." },
  { icon: "menuBook", tab: "Cardápio", to: "/app/cardapio", text: "O que aparece no site hoje. Monte manualmente, use o automático da semana ou o cardápio fixo." },
  { icon: "book", tab: "Produtos salvos", to: "/app/pratos", text: "Sua biblioteca permanente. Tudo que você cria fica aqui para reutilizar em segundos." },
  { icon: "lunchbox", tab: "Pedidos", to: "/app/pedidos", text: "Pedidos que chegam pelo site e os manuais. Fluxo: Pendente → Preparando → Pronto → Entregue." },
  { icon: "users", tab: "Clientes", to: "/app/clientes", text: "Quem já pediu, com histórico. Clique em um cliente para ver os pedidos dele." },
  { icon: "palette", tab: "Meu site", to: "/app/site", text: "Personalize logo, cores, temas, textos e seções do seu mini-site, com prévia ao vivo." },
  { icon: "chart", tab: "Métricas", to: "/app/analytics", text: "Visualizações, cliques no WhatsApp e pedidos iniciados × concluídos." },
  { icon: "users", tab: "Equipe", to: "/app/equipe", text: "Convide funcionários com papéis e permissões diferentes (plano Pro+)." },
  { icon: "creditCard", tab: "Assinatura", to: "/app/assinatura", text: "Seu plano, uso, mudança de plano, exportação de dados e zona de perigo." },
];

const FAQ = [
  { q: "Meu negócio não é restaurante. Funciona para mim?", a: "Sim! Na criação da conta você escolhe o nicho (pastelaria, caldos, lanchonete…) e pode criar as categorias que quiser em Meu site → Categorias do negócio. Cada produto pode ter preço unitário e adicionais." },
  { q: "O cliente precisa criar conta para pedir?", a: "Não. O cliente monta o pedido no seu mini-site e envia pelo WhatsApp. Se ele informar nome e telefone, o pedido já aparece registrado no seu painel." },
  { q: "Como o cardápio automático da semana funciona?", a: "Você define os produtos de cada dia da semana uma única vez. Todo dia, se não houver um cardápio manual montado, o sistema usa o template daquele dia automaticamente." },
  { q: "Perdi acesso à minha conta, e agora?", a: "Use \"Esqueci minha senha\" na tela de login ou chame o suporte pelo PKChat abaixo." },
  { q: "Posso usar o PKSISTEM no celular como um app?", a: "Sim! O sistema é um PWA: no navegador do celular, use \"Adicionar à tela inicial\" e ele vira um aplicativo." },
];

export default function HelpPage() {
  const { membership } = useAuth();
  const [wantHire, setWantHire] = useState(false);
  const { data: platform } = useAsyncData<PlatformSettings | null>(() => api.getPlatformPublic().catch(() => null), []);

  return (
    <div className="animate-fade-up space-y-6">
      <header>
        <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Ajuda</h1>
        <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">
          Guia rápido, respostas instantâneas com o <strong className="text-saffron-700 dark:text-saffron-300">PKChat</strong> e contato direto com o suporte.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* Guia rápido */}
          <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-pine-900">
            <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold text-pine-950 dark:text-cream">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-800 dark:bg-saffron-900/40 dark:text-saffron-200"><I name="rocket" size={17} /></span>
              Guia rápido do painel
            </h2>
            <p className="mt-1 text-[13px] text-pine-600 dark:text-pine-300">O que cada aba faz — clique para ir direto.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {GUIDE.map((g) => (
                <Link key={g.tab} to={g.to} className="group flex items-start gap-3 rounded-xl border border-pine-100 bg-paper p-3.5 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-card dark:border-pine-800 dark:bg-pine-950">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine-100 text-pine-700 transition-colors group-hover:bg-saffron-400 group-hover:text-pine-950 dark:bg-pine-800 dark:text-pine-200">
                    <I name={g.icon} size={16} />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-extrabold text-pine-950 dark:text-cream">{g.tab}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-pine-600 dark:text-pine-300">{g.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Contratar PKChat / suporte humano */}
          <section className="texture-dark overflow-hidden rounded-2xl bg-pine-950 p-5 text-white shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-saffron-300">
                  <I name="zap" size={15} /> Suporte PKSISTEM
                </p>
                <h2 className="mt-1.5 font-display text-[20px] font-bold">Quer o PKChat configurado para o seu negócio?</h2>
                <p className="mt-1 max-w-md text-[13px] leading-relaxed text-pine-300">
                  A gente configura o assistente com as respostas do seu cardápio, preços e políticas — ou fale direto com um humano.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="amber" icon="zap" onClick={() => setWantHire((v) => !v)}>Quero contratar o PKChat</Button>
                {platform?.supportWhatsapp && (
                  <a href={waLink(platform.supportWhatsapp, "Olá! Preciso de ajuda com o PKSISTEM.")} target="_blank" rel="noreferrer">
                    <Button variant="secondary" icon="whatsapp" className="border-pine-700 bg-transparent text-cream hover:bg-pine-800">Chamar no WhatsApp</Button>
                  </a>
                )}
              </div>
            </div>
            {wantHire && platform && (
              <div className="mt-4 rounded-xl border border-saffron-400/30 bg-saffron-400/10 px-4 py-3.5 text-[13px] leading-relaxed text-saffron-100 animate-fade-up">
                Perfeito! 🎉 Mande uma mensagem para <strong>{platform.supportEmail}</strong> ou chame no WhatsApp <strong>+{platform.supportWhatsapp}</strong> dizendo
                {" "}"Quero contratar o PKChat para o {membership?.tenant.name ?? "meu negócio"}". Respondemos rapidinho!
              </div>
            )}
            <p className="mt-3 text-[11.5px] text-pine-400">
              {platform?.instagram && <>Instagram: <strong className="text-pine-200">{platform.instagram}</strong> · </>}
              E-mail: <strong className="text-pine-200">{platform?.supportEmail}</strong>
            </p>
          </section>

          {/* FAQ */}
          <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-pine-900">
            <h2 className="font-display text-[17px] font-bold text-pine-950 dark:text-cream">Perguntas frequentes</h2>
            <div className="mt-3 space-y-2.5">
              <Accordion items={FAQ} />
            </div>
          </section>
        </div>

        {/* PKChat ao lado */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <PkChat tenant={membership?.tenant ?? null} />
          <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-pine-500 dark:text-pine-400">
            O PKChat responde na hora. Em produção ele pode ser conectado a uma IA (endpoint configurável).
          </p>
        </aside>
      </div>
    </div>
  );
}
