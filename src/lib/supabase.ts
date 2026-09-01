/**
 * Cliente Supabase.
 *
 * ⚠️ PREENCHA AQUI (ou no arquivo .env):
 *    VITE_SUPABASE_URL       → URL do seu projeto Supabase
 *    VITE_SUPABASE_ANON_KEY  → chave pública (anon). Ela é segura no frontend
 *                              DESDE QUE as políticas RLS estejam configuradas
 *                              (veja supabase/schema.sql).
 *
 * NUNCA coloque a SERVICE_ROLE key no frontend — ela fica apenas em
 * ambiente de servidor (Edge Functions / backend).
 *
 * Sem credenciais, o app roda em MODO DEMONSTRAÇÃO com um banco local
 * (localStorage) — útil para apresentar o produto sem backend.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Aceita a nova PUBLISHABLE KEY (sb_publishable_...) ou a antiga anon key.
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Bucket do Storage onde as fotos dos pratos ficam armazenadas. */
export const STORAGE_BUCKET = "food-photos";

/** Traduz erros técnicos do Supabase Auth para mensagens amigáveis. */
export function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Não foi possível entrar. Verifique seu e-mail e senha.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (msg.includes("signup") || msg.includes("already registered")) {
    return "Este e-mail já está em uso.";
  }
  return "Não foi possível entrar. Verifique seu e-mail e senha.";
}

/** Traduz erros de banco para mensagens amigáveis (sem expor detalhes técnicos). */
export function friendlyDbError(err: unknown, fallback = "Não foi possível salvar. Tente novamente."): string {
  const anyErr = err as { code?: string; message?: string } | null;
  if (anyErr?.code === "23505") return "Este item já foi adicionado ao cardápio de hoje.";
  if (anyErr?.code === "PGRST205" || anyErr?.message?.toLowerCase().includes("row-level security")) {
    return "Você não tem permissão para realizar esta ação neste restaurante.";
  }
  if (anyErr?.message?.toLowerCase().includes("fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return fallback;
}
