/* PKChat — assistente inteligente do PKSISTEM com IA Groq */
import { useEffect, useRef, useState } from "react";
import Groq from "groq-sdk";
import { api } from "../lib/api";
import type { PlatformSettings, Tenant } from "../lib/types";
import { cn } from "../lib/utils";
import { I } from "./icons";
import { Spinner } from "./ui";

const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Msg {
  id: number;
  role: "user" | "bot";
  text: string;
}

const SYSTEM_PROMPT = `Você é o PKChat, assistente virtual OFICIAL do PKSISTEM.

SUA PERSONALIDADE:
- 🌟 AMIGÁVEL e EMPÁTICO
- 💬 Use emojis naturalmente
- 🎯 SEJA ESPECÍFICO e PRÁTICO
- 📚 Explique PASSO A PASSO quando necessário

Responda SEMPRE em português do Brasil.`;

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
        text: "Olá! 👋 Sou o PKChat, assistente do PKSISTEM. Pergunte sobre cardápio, pedidos, planos ou clientes.",
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
    
    if (!import.meta.env.VITE_GROQ_API_KEY) {
      setMessages((m) => [...m, { 
        id: seq.current++, 
        role: "bot", 
        text: "⚠️ API Key não configurada!" 
      }]);
      setThinking(false);
      return;
    }
    
    try {
      // Construção segura do array de mensagens para a Groq
      const groqMessages: Array<{role: string; content: string}> = [
        { role: "system", content: SYSTEM_PROMPT }
      ];
      
      messages.forEach(m => {
        if (m.role === "user") {
          groqMessages.push({ role: "user", content: m.text });
        } else {
          groqMessages.push({ role: "assistant", content: m.text });
        }
      });
      
      groqMessages.push({ role: "user", content: msg });

      const chatCompletion = await groq.chat.completions.create({
        messages: groqMessages as any, // Type assertion para evitar erro do TS
        model: "llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 1000
      });
      
      const reply = chatCompletion.choices[0]?.message?.content;
      
      if (!reply) {
        throw new Error("IA retornou resposta vazia");
      }
      
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: reply }]);
      
    } catch (error) {
      console.error("ERRO REAL DA IA:", error);
      setMessages((m) => [...m, { 
        id: seq.current++, 
        role: "bot", 
        text: `❌ Erro na IA: ${error instanceof Error ? error.message : "Erro desconhecido"}` 
      }]);
    } finally {
      setThinking(false);
    }
  }

  const quick = ["Como adiciono um produto?", "Como vejo meu dashboard?", "Quais são os planos?"];

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-pine-100 bg-cream shadow-card dark:border-pine-800 dark:bg-pine-900", compact ? "h-[420px]" : "h-[480px]")}>
      <div className="flex items-center gap-3 border-b border-pine-100 bg-pine-950 px-4 py-3.5 dark:border-pine-800">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-400 text-pine-950">
          <I name="zap" size={18} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#3ecf6e] ring-2 ring-pine-950 animate-pulse-dot" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-cream">PKChat</p>
          <p className="text-[11px] font-semibold text-pine-300">{import.meta.env.VITE_GROQ_API_KEY ? "IA Conectada 🧠" : "Modo demo"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed animate-fade-up", 
              m.role === "user" 
                ? "rounded-br-md bg-pine-950 font-semibold text-cream" 
                : "rounded-bl-md border border-pine-100 bg-paper text-pine-800 dark:border-pine-800 dark:bg-[#1a1a16] dark:text-pine-100"
            )}>
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
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Digite sua dúvida…" 
          className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px] text-ink placeholder:text-pine-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-400/60 dark:border-pine-700 dark:bg-pine-950 dark:text-cream" 
        />
        <button 
          type="submit" 
          disabled={!input.trim() || thinking} 
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950 transition-all hover:bg-saffron-300 active:scale-95 disabled:opacity-40"
        >
          <I name="send" size={17} />
        </button>
      </form>
    </div>
  );
}