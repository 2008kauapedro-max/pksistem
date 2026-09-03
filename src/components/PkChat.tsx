import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { PlatformSettings, Tenant } from "../lib/types";
import { cn } from "../lib/utils";
import { I } from "./icons";

interface Msg {
  id: number;
  role: "user" | "bot";
  text: string;
}

const SYSTEM_PROMPT = "Você é o PKChat, assistente do PKSISTEM. Responda em português.";

export default function PkChat({ tenant, compact = false }: { tenant: Tenant | null; compact?: boolean }) {
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const seq = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getPlatformPublic().then(setPlatform).catch(() => {});
    // SEM MENSAGEM INICIAL - começa vazio
    setMessages([]);
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
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: "API Key faltando" }]);
      setThinking(false);
      return;
    }
    
    try {
      const msgs: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
      
      // Adiciona APENAS mensagens do histórico (sem a inicial "bot")
      messages.forEach(m => {
        if (m.role === "user") {
          msgs.push({ role: "user", content: m.text });
        } else {
          msgs.push({ role: "assistant", content: m.text });
        }
      });
      
      // Adiciona mensagem atual
      msgs.push({ role: "user", content: msg });

      console.log("ENVIANDO:", JSON.stringify(msgs, null, 2));

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-llama-70b",
          messages: msgs,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro HTTP " + res.status);
      }

      const reply = data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Resposta vazia");
      
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: reply }]);
      
    } catch (error) {
      console.error("ERRO:", error);
      setMessages((m) => [...m, { 
        id: seq.current++, 
        role: "bot", 
        text: "Erro: " + (error instanceof Error ? error.message : "desconhecido") 
      }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-pine-100 bg-cream shadow-card dark:border-pine-800 dark:bg-pine-900", compact ? "h-[420px]" : "h-[480px]")}>
      <div className="flex items-center gap-3 border-b border-pine-100 bg-pine-950 px-4 py-3.5 dark:border-pine-800">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-400 text-pine-950">
          <I name="zap" size={18} />
        </span>
        <div>
          <p className="text-[14px] font-extrabold text-cream">PKChat</p>
          <p className="text-[11px] font-semibold text-pine-300">IA Conectada</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-pine-500 py-8">
            <p className="text-sm">Olá! Sou o PKChat.</p>
            <p className="text-xs mt-1">Como posso ajudar?</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", 
              m.role === "user" 
                ? "rounded-br-md bg-pine-950 font-semibold text-cream" 
                : "rounded-bl-md border border-pine-100 bg-paper text-pine-800"
            )}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && <div className="text-[12px] font-bold text-pine-500">Pensando…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-pine-100 px-3 py-3">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Digite sua dúvida…" 
          className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px]"
        />
        <button type="submit" disabled={!input.trim() || thinking} className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950">
          <I name="send" size={17} />
        </button>
      </form>
    </div>
  );
}