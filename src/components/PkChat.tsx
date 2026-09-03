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

const SYSTEM_PROMPT = `Você é o PKChat, assistente INTELIGENTE e PROATIVO do PKSISTEM (plataforma para restaurantes e delivery).

SUAS CAPACIDADES:
1. Você PODE e DEVE ajudar a personalizar o site do cliente
2. Você PODE sugerir adição/remoção de produtos
3. Você PODE ajustar configurações baseado nas preferências do cliente

COMO PERSONALIZAR UM SITE:
Quando o cliente pedir para personalizar o site (ex: "personaliza pra minha pastelaria"):
- Pergunte: "Qual o nome do seu negócio?"
- Pergunte: "Qual cor principal você quer? (ex: vermelho, azul, verde)"
- Pergunte: "Qual cor secundária? (para detalhes e botões)"
- Pergunte: "Qual seu Instagram ou redes sociais?"
- Depois diga: "Perfeito! Vou configurar seu site com essas informações. Acesse: Menu > Meu Site > Personalizar"

COMO ADICIONAR PRODUTOS:
Quando pedirem para adicionar produto:
- Pergunte: "Qual o nome do produto?"
- Pergunte: "Qual o preço?"
- Pergunte: "Qual categoria? (ex: Pastéis, Bebidas, Sobremesas)"
- Depois diga: "Vou adicionar! Acesse: Menu > Cardápio > + Novo Produto"

REGRAS:
- Seja CURTO e DIRETO (máx 3-4 frases)
- Use **negrito** para destacar
- Seja PROATIVO: ofereça ajuda para personalizar
- SEMPRE em português`;

function formatarTexto(texto: string) {
  let html = texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>');
  return { __html: html };
}

export default function PkChat({ tenant, compact = false, floating = false }: { tenant: Tenant | null; compact?: boolean; floating?: boolean }) {
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const seq = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    api.getPlatformPublic().then(setPlatform).catch(() => {});
    setMessages([]);

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
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking, isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz. Use Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
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
          model: "openai/gpt-oss-120b",
          messages: msgs,
          temperature: 0.5,
          max_tokens: 400
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

  // Versão flutuante
  if (floating) {
    return (
      <>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-saffron-400 text-pine-950 shadow-lg transition-all hover:scale-110 hover:bg-saffron-300 text-2xl"
          >
            💬
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
            </span>
          </button>
        )}

        {isOpen && (
          <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-pine-200 bg-cream shadow-2xl dark:border-pine-800 dark:bg-pine-900">
            <div className="flex items-center justify-between border-b border-pine-100 bg-pine-950 px-4 py-3 dark:border-pine-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-400 text-pine-950">
                  <I name="zap" size={18} />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-cream">PKChat</p>
                  <p className="text-[10px] font-semibold text-pine-300">Assistente Inteligente</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-pine-300 hover:bg-pine-800 text-xl leading-none">
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="text-center text-pine-500 py-8">
                  <p className="text-sm font-bold">Olá! Sou o PKChat. 👋</p>
                  <p className="text-xs mt-1">Posso personalizar seu site! É só pedir.</p>
                </div>
              )}
              
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", 
                    m.role === "user" 
                      ? "rounded-br-md bg-pine-950 font-semibold text-cream" 
                      : "rounded-bl-md border border-pine-100 bg-paper text-pine-800 dark:bg-[#1a1a16] dark:text-pine-100"
                  )}>
                    <span dangerouslySetInnerHTML={formatarTexto(m.text)} />
                  </div>
                </div>
              ))}
              {thinking && <div className="text-[12px] font-bold text-pine-500 flex items-center gap-2"><span className="animate-pulse">●</span> Pensando…</div>}
              <div ref={endRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-pine-100 px-3 py-3 dark:border-pine-800">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={isListening ? "🎤 Ouvindo..." : "Digite ou fale..."} 
                className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-saffron-400 dark:border-pine-700 dark:bg-pine-950 dark:text-cream"
                disabled={isListening}
              />
              
              {/* Botão de Áudio - Lado Direito (Usando Emoji para evitar erro de IconName) */}
              <button 
                type="button" 
                onClick={toggleListening}
                className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all text-lg", 
                  isListening 
                    ? "bg-red-500 text-white animate-pulse scale-110" 
                    : "bg-pine-100 text-pine-600 hover:bg-saffron-400 hover:text-pine-950 dark:bg-pine-800 dark:text-pine-300"
                )}
                title={isListening ? "Parar de ouvir" : "Falar por áudio"}
              >
                {isListening ? "🎤" : "🔊"}
              </button>

              {/* Botão de Enviar */}
              <button type="submit" disabled={!input.trim() || thinking} className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950 hover:bg-saffron-300 transition-colors disabled:opacity-50">
                <I name="send" size={17} />
              </button>
            </form>
          </div>
        )}
      </>
    );
  }

  // Versão normal (dentro da página)
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
            <p className="text-xs mt-1">Posso personalizar seu site! É só pedir.</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", 
              m.role === "user" 
                ? "rounded-br-md bg-pine-950 font-semibold text-cream" 
                : "rounded-bl-md border border-pine-100 bg-paper text-pine-800 dark:bg-[#1a1a16] dark:text-pine-100"
            )}>
              <span dangerouslySetInnerHTML={formatarTexto(m.text)} />
            </div>
          </div>
        ))}
        {thinking && <div className="text-[12px] font-bold text-pine-500 flex items-center gap-2"><span className="animate-pulse">●</span> Pensando…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-pine-100 px-3 py-3 dark:border-pine-800">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder={isListening ? "🎤 Ouvindo..." : "Digite ou fale..."} 
          className="h-10 flex-1 rounded-xl border border-pine-200 bg-cream px-3.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-saffron-400 dark:border-pine-700 dark:bg-pine-950 dark:text-cream"
          disabled={isListening}
        />
        
        <button 
          type="button" 
          onClick={toggleListening}
          className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all text-lg", 
            isListening 
              ? "bg-red-500 text-white animate-pulse scale-110" 
              : "bg-pine-100 text-pine-600 hover:bg-saffron-400 hover:text-pine-950 dark:bg-pine-800 dark:text-pine-300"
          )}
          title={isListening ? "Parar de ouvir" : "Falar por áudio"}
        >
          {isListening ? "🎤" : "🔊"}
        </button>

        <button type="submit" disabled={!input.trim() || thinking} className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-400 text-pine-950 hover:bg-saffron-300 transition-colors disabled:opacity-50">
          <I name="send" size={17} />
        </button>
      </form>
    </div>
  );
}