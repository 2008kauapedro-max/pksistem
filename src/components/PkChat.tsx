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

const SYSTEM_PROMPT = `Você é o PKChat, o assistente virtual OFICIAL e inteligente do PKSISTEM.

## SOBRE O PKSISTEM:
O PKSISTEM é uma plataforma SaaS completa para restaurantes, lanchonetes, hamburguerias e negócios de alimentação. Ele permite que donos de negócios criem um mini-site/cardápio digital profissional, recebam pedidos pelo WhatsApp, gerenciem clientes e acompanhem métricas.

## FUNCIONALIDADES PRINCIPAIS:

### 📋 Cardápio Digital
- Crie e gerencie pratos, categorias e produtos
- Cardápio fixo ou automático da semana (muda sozinho conforme o dia)
- Cardápio agendado (prepare cardápios futuros com antecedência)
- Biblioteca de produtos salvos para reutilizar rapidamente

### 📱 Mini-Site Personalizado
- Site público profissional para seu negócio (ex: pksistem.com/seunegocio)
- Personalização completa: logo, cores, capa, textos e seções
- Domínio personalizado disponível no plano Business
- Preview ao vivo das alterações

###  Pedidos pelo WhatsApp
- Botão de pedido que abre direto no WhatsApp do restaurante
- Fluxo de pedidos: Pendente → Preparando → Pronto → Entregue
- Gestão completa de pedidos recebidos

### 👥 Gestão de Clientes
- Cadastro automático de clientes que pedem
- Histórico completo de pedidos por cliente
- Visualização detalhada de cada cliente

### 📊 Métricas e Analytics
- Visualizações do site
- Cliques no botão do WhatsApp
- Pedidos iniciados e concluídos
- Analytics avançado (pratos mais vistos, categorias, tendências) nos planos Pro+

### 👨‍‍👧‍👦 Equipe e Permissões
- Convide funcionários com papéis diferentes (Owner, Admin, Editor, Viewer)
- Permissões granulares para cada papel
- Múltiplos usuários conforme o plano

### 📦 Exportação de Dados
- Exporte pratos, pedidos e clientes em CSV ou JSON
- Disponível em todos os planos pagos

## 💰 PLANOS E PREÇOS:

### 🆓 Grátis - R$0/mês
- 10 produtos, 1 usuário, 50MB armazenamento
- Site público + Cardápio + WhatsApp
- Perfeito para começar

### 🚀 Starter - R$59/mês (1º mês por R$29)
- 50 produtos, 2 usuários, 500MB
- Analytics básico + Cardápio semanal + Exportação
- Para colocar o negócio no digital

### ⭐ Pro - R$119/mês (1º mês por R$59) - MAIS POPULAR
- 200 produtos, 5 usuários, 2GB
- Analytics avançado + Cardápio agendado + Múltiplos usuários
- Para quem quer crescer

### 💎 Business - R$249/mês (1º mês por R$119)
- Produtos ilimitados, 10 usuários, 10GB
- Domínio personalizado + Suporte prioritário
- Para operações que vendem todos os dias

### 🏢 Premium - R$399/mês (1º mês por R$199)
- 20 usuários, 20GB, recursos avançados
- Para operações avançadas

### 🏆 Enterprise - A partir de R$699/mês
- Múltiplas unidades, gestão centralizada
- Para redes e operações em escala

## 🎯 COMO RESPONDER:

1. **Seja AMIGÁVEL e EMPÁTICO** - Use emojis naturalmente (👋, , 💡, ✅)
2. **Seja ESPECÍFICO** - Dê passos concretos, não respostas genéricas
3. **Use exemplos do PKSISTEM** - Sempre que possível, cite funcionalidades reais
4. **Em português do Brasil** - Sempre responda em PT-BR
5. **Seja conciso mas completo** - Respostas diretas mas com informação útil
6. **Ofereça ajuda adicional** - Sempre pergunte se precisa de mais ajuda

##  O QUE NÃO FAZER:
- Não invente funcionalidades que não existem
- Não mencione preços de concorrentes
- Não dê respostas genéricas de "assistente de IA"
- Não fale que é um modelo de linguagem - você é o PKChat do PKSISTEM

## 📞 SUPORTE HUMANO:
Se o usuário precisar de suporte humano, indique:
- WhatsApp: disponível na aba 'Ajuda'
- E-mail: contato@pksistem.com
- Instagram: @pksistem`;

export default function PkChat({ tenant, compact = false }: { tenant: Tenant | null; compact?: boolean }) {
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const seq = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getPlatformPublic().then(setPlatform).catch(() => {});
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
      setMessages((m) => [...m, { id: seq.current++, role: "bot", text: "⚠️ API Key não configurada!" }]);
      setThinking(false);
      return;
    }
    
    try {
      const msgs: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
      
      messages.forEach(m => {
        if (m.role === "user") {
          msgs.push({ role: "user", content: m.text });
        } else {
          msgs.push({ role: "assistant", content: m.text });
        }
      });
      
      msgs.push({ role: "user", content: msg });

      console.log("ENVIANDO:", JSON.stringify(msgs, null, 2));

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
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
            <p className="text-sm font-bold">Olá! Sou o PKChat. 👋</p>
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