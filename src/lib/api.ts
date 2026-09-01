/**
 * API — fachada única de acesso a dados do PKSISTEM.
 *
 * ROTEAMENTO DE BACKEND:
 *   - Com VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY no .env:
 *       usa o Supabase REAL (lib/supabaseApi.ts). Segurança via RLS + funções
 *       security definer (supabase/schema.sql). A chave pública é segura aqui;
 *       a SECRET_KEY nunca entra no frontend.
 *   - Sem credenciais: usa o banco local de demonstração (lib/tenantStore.ts).
 *
 * As duas implementações expõem a MESMA interface, então as páginas não mudam.
 * O modo demo herda os tipos do tenantStore (fonte tipada); o modo Supabase é
 * convertido para o mesmo formato via cast controlado abaixo.
 *
 * ⚠️ NUNCA coloque service_role / SECRET_KEY / segredos de pagamento aqui.
 */
import { isSupabaseConfigured } from "./supabase";
import { tenantApi, tenantAuth, superApi, DEMO_ACCOUNTS, IMG, resetDemoData } from "./tenantStore";
import { supabaseApi, supabaseAuth, supabaseAdmin } from "./supabaseApi";

export { isSupabaseConfigured, DEMO_ACCOUNTS, IMG, resetDemoData };

export const backendMode: "supabase" | "demo" = isSupabaseConfigured ? "supabase" : "demo";

/**
 * As implementações Supabase espelham a interface demo em runtime. O cast
 * abaixo apenas alinha os tipos para o TypeScript — o comportamento real vem
 * de cada implementação (Supabase quando configurado, demo caso contrário).
 */
export const authApi = isSupabaseConfigured
  ? (supabaseAuth as unknown as typeof tenantAuth)
  : tenantAuth;

export const api = isSupabaseConfigured
  ? (supabaseApi as unknown as typeof tenantApi)
  : tenantApi;

export const adminApi = isSupabaseConfigured
  ? (supabaseAdmin as unknown as typeof superApi)
  : superApi;
