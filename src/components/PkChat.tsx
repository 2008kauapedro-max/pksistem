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

const SYSTEM_PROMPT = `Você é o PKChat, assistente virtual do PKSISTEM (SaaS para restaurantes e delivery).

REGRAS RIGOROSAS DE RESPOSTA:
1. SEJA CURTO E DIRETO: Máximo de 2 a 3 frases ou 4 tópicos curtos. O cliente quer agilidade.
2. DOMÍNIO ESTREITO: Você SÓ sabe sobre: Cardápio digital, Pedidos pelo WhatsApp, Gestão de Clientes, Planos e Mini-site. Ignore perguntas sobre TI genérica.
3. FORMATAÇÃO LIMPA: Use **negrito** para destacar. Use - para listas. NÃO use tabelas ou cabeçalhos ###.
4. AÇÃO NO SISTEMA: Se pedirem para adicionar algo, diga: "Acesse a aba Cardápio no menu lateral para adicionar. Posso te guiar nos 3 passos rápidos se quiser!"`;

// Função para formatar o texto da IA (transforma **texto** em negrito real)
function formatarTexto(texto: string) {
  let html = texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negrito
    .replace(/\n- /g, '<br>• ') // Listas
    .replace(/\n/g, '<br>'); // Quebras de linha
  return { __html: html };
}

export default function PkChat({ tenant, compact = false }: { tenant: Tenant | null; compact?: boolean }) {
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const seq = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  // Configuração do Reconhecimento de Voz (Web Speech API)
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    api.getPlatformPublic().then(setPlatform).catch(() => {});
    setMessages([]);

    // Inicializa o reconhecimento de voz se o navegador suportar
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "pt-BR";
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz. Tente usar o Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput(""); // Limpa antes de ouvir
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    
    setInput("");
    setMessages((m) => [...m, { id: seq.current++, role: "user", text: msg }]);
    setThinking(true);
    
    if (!import.meta.env.VITE_GROQ_API_KEY) {
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: "⚠️ API Key não configurada!" }]);
      setThinking(false);
      return;
    }
    
    try {
      const msgs: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
      messages.forEach(m => {
        msgs.push({ role: m.role === "user" ? "user" : "assistant", content: m.text });
      });
      msgs.push({ role: "user", content: msg });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Modelo inteligente e rápido
          messages: msgs,
          temperature: 0.3, // Temperatura baixa = respostas mais focadas e menos "criativas/alucinadas"
          max_tokens: 300 // Limita o tamanho da resposta para ser curta!
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Erro HTTP " + res.status);

      const reply = data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Resposta vazia");
      
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: reply }]);
    } catch (error) {
      console.error("ERRO:", error);
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: "❌ Erro: " + (error instanceof Error ? error.message : "desconhecido") }]);
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
          <p className="text-[11px] font-semibold text-pine-300">Assistente Inteligente</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-pine-500 py-8">
            <p className="text-sm font-bold">Olá! Sou o PKChat. 👋</p>
            <p className="text-xs mt-1">Pergunte sobre cardápio, pedidos ou planos.</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", 
              m.role === "user" 
                ? "rounded-br-md bg-pine-950 font-semibold text-cream" 
                : "rounded-bl-md border border-pine-100 bg-paper text-pine-800 dark:bg-[#1a1a16] dark:text-pine-100"
            )}>
              {/* Renderiza o HTML formatado (negrito real) */}
              <span dangerouslySetInnerHTML={formatarTexto(m.text)} />
            </div>
          </div>
        ))}
        {thinking && <div className="text-[12px] font-bold text-pine-500 flex items-center gap-2"><span className="animate-pulse">●</span> Pensando…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-pine-100 px-3 py-3">
        {/* Botão de Microfone */}
        <button 
          type="button" 
          onClick={toggleListening}
          className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-colors", isListening ? "bg-red-500 text-white animate-pulse" : "bg-pine-100 text-pine-600 hover:bg-pine-200 dark:bg-pine-800 dark:text-pine-300")}
          title="Falar em vez de digitar"
        >
          <I name="mic" size={18} />
        </button>

        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder={isListening ? "Ouvindo..." : "Digite ou fale sua dúvida…"} 
          className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-saffron-400 dark:border-pine-700 dark:bg-pine-950 dark:text-cream"
          disabled={isListening}
        />
        <button type="submit" disabled={!input.trim() || thinking} className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950 hover:bg-saffron-300 transition-colors disabled:opacity-50">
          <I name="send" size={17} />
        </button>
      </form>
    </div>
  );
}