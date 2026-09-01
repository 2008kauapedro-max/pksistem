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

// Inicializa a Groq com a chave do .env
const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Msg {
  id: number;
  role: "user" | "bot";
  text: string;
}

const AI_URL = (import.meta.env.VITE_PKCHAT_API_URL as string | undefined) ?? "";

const SYSTEM_PROMPT = `Você é o PKChat, assistente virtual do PKSISTEM. Responda sempre em português do Brasil, seja amigável e direto. Se não souber algo, diga que vai encaminhar para o suporte.`;

function localAnswer(q: string, tenant: Tenant | null, platform: PlatformSettings | null): string {
  const s = q.toLowerCase();
  if (/(oi|olá|ola|bom dia|boa tarde)/.test(s) && s.length < 25) {
    return "Olá! 👋 Eu sou o PKChat. Como posso ajudar com cardápio, pedidos, planos ou clientes?";
  }
  if (/(plano|preço|valor|assinatura)/.test(s)) {
    return "Temos 4 planos: Grátis (10 produtos), Starter (R$49/mês), Pro (R$99/mês) e Business (R$199/mês). Vá em 'Assinatura' para ver detalhes.";
  }
  if (/(cardápio|menu|produto)/.test(s)) {
    return "Na aba 'Cardápio' você cria produtos novos ou usa 'Escolher salvo' para reutilizar da biblioteca. Dica: ative o 'Cardápio automático da semana'!";
  }
  return "Boa pergunta! Para falar com o suporte: WhatsApp ou e-mail na aba 'Ajuda'. Posso ajudar com cardápio, produtos, WhatsApp, clientes ou planos.";
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
        text: "Olá! 👋 Eu sou o PKChat, o assistente do PKSISTEM. Pergunte sobre cardápio, pedidos, planos ou clientes.",
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
      
      // Tenta usar a Groq (IA real)
      if (import.meta.env.VITE_GROQ_API_KEY) {
        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.map(m => ({ role: (m.role === "bot" ? "assistant" : "user") as "assistant" | "user", content: m.text })),
              { role: "user", content: msg }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 500
          });
          reply = chatCompletion.choices[0]?.message?.content || "Desculpe, não entendi. Pode reformular?";
        } catch (groqError) {
          console.error("Erro na Groq:", groqError);
          reply = localAnswer(msg, tenant, platform); // Fallback para respostas locais
        }
      } else {
        // Sem chave da Groq, usa respostas locais
        await new Promise((r) => setTimeout(r, 500));
        reply = localAnswer(msg, tenant, platform);
      }
      
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: reply }]);
    } catch (error) {
      console.error("Erro geral no PKChat:", error);
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: "Ops! Tive um problema. Tenta de novo em alguns segundos." }]);
    } finally {
      setThinking(false);
    }
  }

  const quick = ["Como monto o cardápio?", "Quais são os planos?", "Como adiciono um cliente?"];

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-pine-100 bg-cream shadow-card dark:border-pine-800 dark:bg-pine-900", compact ? "h-[420px]" : "h-[480px]")}>
      <div className="flex items-center gap-3 border-b border-pine-100 bg-pine-950 px-4 py-3.5 dark:border-pine-800">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-400 text-pine-950">
          <I name="zap" size={18} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#3ecf6e] ring-2 ring-pine-950 animate-pulse-dot" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-cream">PKChat</p>
          <p className="text-[11px] font-semibold text-pine-300">{import.meta.env.VITE_GROQ_API_KEY ? "Assistente com IA conectada" : "Assistente PKSISTEM · online"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed animate-fade-up", m.role === "user" ? "rounded-br-md bg-pine-950 font-semibold text-cream" : "rounded-bl-md border border-pine-100 bg-paper text-pine-800 dark:border-pine-800 dark:bg-[#1a1a16] dark:text-pine-100")}>
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

      {messages.length <= 2 && !thinking && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {quick.map((q) => (
            <button key={q} onClick={() => send(q)} className="rounded-full border border-pine-200 bg-cream px-3 py-1.5 text-[11.5px] font-bold text-pine-700 transition-colors hover:border-saffron-500 hover:bg-saffron-50 dark:border-pine-700 dark:bg-pine-900 dark:text-pine-200 dark:hover:bg-pine-800">
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-pine-100 px-3 py-3 dark:border-pine-800">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva sua dúvida…" aria-label="Mensagem para o PKChat" className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px] text-ink placeholder:text-pine-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-400/60 dark:border-pine-700 dark:bg-pine-950 dark:text-cream" />
        <button type="submit" disabled={!input.trim() || thinking} aria-label="Enviar mensagem" className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950 transition-all hover:bg-saffron-300 active:scale-95 disabled:opacity-40">
          <I name="send" size={17} />
        </button>
      </form>
    </div>
  );
}