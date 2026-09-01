/* PKChat — assistente do PKSISTEM com IA Groq. */
import { useEffect, useRef, useState } from "react";
import Groq from "groq-sdk";
import { api } from "../lib/api";
import type { PlatformSettings, Tenant } from "../lib/types";
import { formatBRL } from "../lib/utils";
import { cn } from "../lib/utils";
import { I } from "./icons";
import { Spinner } from "./ui";
import { getPlan } from "../lib/plans";

// Inicializa a Groq com a chave que você colocou no .env
const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Necessário para rodar no frontend (em produção, use um backend)
});

interface Msg {
  id: number;
  role: "user" | "bot";
  text: string;
}

const AI_URL = (import.meta.env.VITE_PKCHAT_API_URL as string | undefined) ?? "";

/* System Prompt: O "cérebro" da IA. */
const SYSTEM_PROMPT = `Você é o PKChat, o assistente virtual oficial do PKSISTEM, uma plataforma SaaS para negócios de alimentação (restaurantes, pastelarias, lanchonetes, etc.).

SEU OBJETIVO: Ajudar o dono do negócio a usar o sistema de forma simples e direta.

REGRAS RÍGIDAS:
1. Responda sempre em português do Brasil, de forma amigável e profissional.
2. Se o usuário pedir para EXECUTAR UMA AÇÃO (ex: "adicionar produto", "mudar cor do site", "criar categoria"), responda: "Entendi! Para fazer isso, você precisa ir até a aba [NOME_DA_ABA] no seu painel. Posso te guiar passo a passo?" (NÃO finja que fez a ação).
3. Se o usuário perguntar sobre funcionalidades, explique de forma clara onde encontrar no painel (ex: Cardápio, Produtos salvos, Pedidos, Clientes, Meu site, Métricas, Equipe, Assinatura).
4. Se o usuário relatar um erro, peça detalhes e sugira: recarregar a página, verificar a conexão, ou contatar o suporte.
5. NUNCA invente informações sobre o sistema. Se não souber, diga que vai encaminhar para o suporte humano.
6. Seja conciso. Respostas longas devem ser divididas em tópicos.`;

/* Motor local por regras — conhecimento do produto (usado como fallback). */
function localAnswer(q: string, tenant: Tenant | null, platform: PlatformSettings | null): string {
  const s = q.toLowerCase();
  const plan = tenant ? getPlan(tenant.planId) : null;

  if (/(oi|olá|ola|bom dia|boa tarde|boa noite|e ai|eai)/.test(s) && s.length < 25) {
    return "Olá! 👋 Eu sou o PKChat. Posso ajudar com cardápio, pedidos, WhatsApp, planos, clientes e erros comuns. O que você precisa?";
  }
  if (/(plano|preço|preco|valor|mensalidade|cobran|upgrade|assinatura)/.test(s)) {
    const atual = plan ? `Seu plano atual é o ${plan.name} (${formatBRL(plan.priceMonthly)}/mês). ` : "";
    return `${atual}Temos 4 planos: Grátis, Starter, Pro e Business. Você pode ver os detalhes na aba "Assinatura" do painel ou na página de planos. Para mudar de plano, vá em Assinatura → "Mudar de plano". A cobrança é simulada neste demo — em produção ela é feita por um provedor seguro (cartão/Pix), nunca dentro do site.`;
  }
  if (/(card[áa]pio|menu|prato do dia|hoje)/.test(s)) {
    return `Na aba "Cardápio" você monta o que aparece no site hoje: crie um produto novo ou use "Escolher salvo" para reutilizar da biblioteca. Dica: ative o "Cardápio automático da semana" para o sistema montar cada dia sozinho, ou use o "Cardápio fixo" para produtos que nunca saem do site.`;
  }
  if (/(biblioteca|salvo|salvos|reutiliz)/.test(s)) {
    return `Todo produto que você cria vai automaticamente para a biblioteca ("Produtos salvos"). Na semana seguinte, é só ir em Cardápio → "Escolher salvo" e adicionar em um toque. Para remover de vez, use a lixeira na aba "Produtos salvos".`;
  }
  if (/(whatsapp|zap|pedido do site|pedido pelo site)/.test(s)) {
    return `O número do WhatsApp é configurado em "Meu site" → Contato. Quando um cliente monta um pedido no seu mini-site, o pedido fica registrado na aba "Pedidos" do painel (com nome e telefone, se o cliente informar) e o WhatsApp abre com a mensagem pronta para você confirmar.`;
  }
  if (/(cliente|clientes|cadastro de cliente)/.test(s)) {
    return `Na aba "Clientes" você vê todos os clientes com histórico de pedidos. Clique em um para ver o que ele já pediu, editar ou excluir. Use "+ Adicionar cliente" para cadastrar manualmente (ex.: cliente de balcão). Em Configurações você define a retenção: guardar para sempre ou apagar inativos após N dias.`;
  }
  if (/(site|personaliz|cor|logo|tema|apar[êe]ncia)/.test(s)) {
    return `Na aba "Meu site" você personaliza tudo: logo (por arquivo), imagem de capa, cores, tema (moderno, minimalista, elegante ou bold), textos e seções. A prévia ao vivo mostra exatamente como fica. Não esqueça de salvar e publicar!`;
  }
  if (/(erro|n[ãa]o funciona|bug|travou|problema)/.test(s)) {
    return `Sinto muito pelo problema! Tente: 1) recarregar a página; 2) conferir sua conexão; 3) sair e entrar de novo. Se persistir, fale com nosso suporte pelo WhatsApp (${platform?.supportWhatsapp ?? ""}) ou e-mail (${platform?.supportEmail ?? ""}) — me diga o que aconteceu que eu repasso o contexto.`;
  }
  if (/(equipe|funcion[áa]rio|membro|convite|permiss)/.test(s)) {
    return `Na aba "Equipe" você convida pessoas com papéis diferentes: Dono (tudo), Administrador, Editor (cardápio e produtos) e Visualizador (só ver). Múltiplos usuários estão disponíveis a partir do plano Pro. As permissões valem de verdade — cada papel só consegue fazer o que pode.`;
  }
  if (/(m[ée]tricas|analytics|visualiza|estat[íi]stica|relat[óo]rio)/.test(s)) {
    return `Na aba "Métricas" você vê visualizações do site, cliques no WhatsApp e pedidos iniciados × concluídos. Importante: "pedido iniciado" é quando o cliente começou a montar; "concluído" é quando ele enviou pelo WhatsApp.`;
  }
  if (/(cancelar|excluir|apagar conta|sair da plataforma)/.test(s)) {
    return `Para cancelar a assinatura ou excluir o negócio, vá em "Assinatura" → Zona de perigo. Antes de excluir, exporte seus dados (CSV/JSON) — a exportação fica na mesma aba. A exclusão tem confirmação dupla e período de retenção.`;
  }
  if (/(pastel|caldo|nicho|categoria|meu neg[óo]cio n[ãa]o [ée] restaurante)/.test(s)) {
    return `O PKSISTEM atende qualquer tipo de negócio! Em "Meu site" → "Categorias do negócio" você cria as categorias que quiser (ex.: Pastéis, Caldos, Porções). Cada produto pode ter preço próprio e adicionais (ex.: + ovo R$ 2). No cadastro você também pode escolher o nicho para já começar com as categorias certas.`;
  }
  return `Boa pergunta! Ainda estou aprendendo sobre isso. 🤖\n\nPara falar com um humano do suporte: WhatsApp ${platform?.supportWhatsapp ?? ""} ou ${platform?.supportEmail ?? ""}. Posso ajudar com: cardápio, produtos salvos, WhatsApp, clientes, planos, equipe, site ou erros.`;
}

export default function PkChat({ tenant, compact = false }: { tenant: Tenant | null; compact?: boolean }) {
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const seq = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getPlatformPublic().then(setPlatform).catch(() => {});
    setMessages([
      {
        id: 0,
        role: "bot",
        text: "Olá! 👋 Eu sou o PKChat, o assistente do PKSISTEM. Pergunte sobre cardápio, pedidos, planos, clientes ou qualquer erro que encontrar.",
      },
    ]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    setInput("");
    setMessages((m) => [...m, { id: seq.current++, role: "user", text: msg }]);
    setThinking(true);
    try {
      let reply: string;
      
      // Se tiver uma URL de API externa definida, usa ela (modo produção seguro)
      if (AI_URL) {
        const res = await fetch(AI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantSlug: tenant?.slug ?? null, messages: [...messages, { role: "user", text: msg }] }),
        });
        const data = (await res.json()) as { reply?: string };
        reply = data.reply ?? localAnswer(msg, tenant, platform);
      } 
      // Se tiver a chave da Groq no .env, usa a IA diretamente (modo desenvolvimento/rápido)
      else if (import.meta.env.VITE_GROQ_API_KEY) {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.text })),
            { role: "user", content: msg }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 500
        });
        reply = chatCompletion.choices[0]?.message?.content || "Desculpe, não entendi. Pode reformular?";
      } 
      // Fallback para o motor local
      else {
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
        reply = localAnswer(msg, tenant, platform);
      }
      
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: reply }]);
    } catch (error) {
      console.error("Erro no PKChat:", error);
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: "Ops! Tive um problema aqui. Tenta de novo em alguns segundos." }]);
    } finally {
      setThinking(false);
    }
  }

  const quick = ["Como monto o cardápio?", "Como funciona o WhatsApp?", "Quais são os planos?", "Como adiciono um cliente?"];

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-pine-100 bg-cream shadow-card dark:border-pine-800 dark:bg-pine-900", compact ? "h-[420px]" : "h-[480px]")}>
      {/* cabeçalho */}
      <div className="flex items-center gap-3 border-b border-pine-100 bg-pine-950 px-4 py-3.5 dark:border-pine-800">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-400 text-pine-950">
          <I name="zap" size={18} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#3ecf6e] ring-2 ring-pine-950 animate-pulse-dot" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-cream">PKChat</p>
          <p className="text-[11px] font-semibold text-pine-300">{AI_URL || import.meta.env.VITE_GROQ_API_KEY ? "Assistente com IA conectada" : "Assistente PKSISTEM · online"}</p>
        </div>
      </div>

      {/* mensagens */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed animate-fade-up",
                m.role === "user"
                  ? "rounded-br-md bg-pine-950 font-semibold text-cream"
                  : "rounded-bl-md border border-pine-100 bg-paper text-pine-800 dark:border-pine-800 dark:bg-[#1a1a16] dark:text-pine-100",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-[12px] font-bold text-pine-500">
            <Spinner size={14} /> PKChat está pensando…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* sugestões rápidas */}
      {messages.length <= 2 && !thinking && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {quick.map((q) => (
            <button key={q} onClick={() => send(q)} className="rounded-full border border-pine-200 bg-cream px-3 py-1.5 text-[11.5px] font-bold text-pine-700 transition-colors hover:border-saffron-500 hover:bg-saffron-50 dark:border-pine-700 dark:bg-pine-900 dark:text-pine-200 dark:hover:bg-pine-800">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-pine-100 px-3 py-3 dark:border-pine-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua dúvida…"
          aria-label="Mensagem para o PKChat"
          className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px] text-ink placeholder:text-pine-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-400/60 dark:border-pine-700 dark:bg-pine-950 dark:text-cream"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          aria-label="Enviar mensagem"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950 transition-all hover:bg-saffron-300 active:scale-95 disabled:opacity-40"
        >
          <I name="send" size={17} />
        </button>
      </form>
    </div>
  );
}