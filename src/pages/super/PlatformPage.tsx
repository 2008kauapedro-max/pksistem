/* Super Admin → Plataforma: marca e contatos que aparecem para todos os tenants. */
import { useEffect, useState } from "react";
import { useAsyncData, useToast } from "../../context/providers";
import { adminApi } from "../../lib/api";
import type { PlatformSettings } from "../../lib/types";
import { onlyDigits } from "../../lib/utils";
import { Button, ErrorState, Field, Input, SkeletonRow, Toggle } from "../../components/ui";
import { I } from "../../components/icons";
import { PkMark } from "../../components/saas";

export default function PlatformPage() {
  const { push } = useToast();
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getPlatform(), []);
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function update<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await adminApi.updatePlatform(form);
      push("success", "Configurações da plataforma atualizadas.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="space-y-3"><div className="skeleton h-9 w-56 rounded-xl" /><SkeletonRow /><SkeletonRow /></div>;
  if (error || !form) return <ErrorState message={error ?? "Erro ao carregar."} onRetry={reload} />;

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Plataforma</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">
            Marca e contatos do PKSISTEM — aparecem no painel dos tenants (faixa de suporte), no PKChat e no rodapé do site.
          </p>
        </div>
        <Button icon="check" loading={saving} onClick={handleSave}>Salvar</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-pine-900">
          <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold text-pine-950 dark:text-cream">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine-100 text-pine-700 dark:bg-pine-800 dark:text-pine-200"><I name="logo" size={17} /></span>
            Identidade
          </h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-paper p-3.5 dark:bg-pine-950">
              <PkMark size={44} />
              <p className="text-[12.5px] leading-relaxed text-pine-600 dark:text-pine-300">
                Selo PK atual. Para trocar por uma logo sua, envie a imagem em qualquer página e copie o endereço — na versão Supabase, use o Storage.
              </p>
            </div>
            <Field label="Nome da plataforma">
              <Input value={form.name} maxLength={30} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Slogan">
              <Input value={form.tagline} maxLength={80} onChange={(e) => update("tagline", e.target.value)} />
            </Field>
            <Field label="Instagram profissional" hint="aparece no painel dos tenants">
              <Input value={form.instagram} placeholder="@pksistem" maxLength={40} onChange={(e) => update("instagram", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-pine-900">
          <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold text-pine-950 dark:text-cream">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine-100 text-pine-700 dark:bg-pine-800 dark:text-pine-200"><I name="whatsapp" size={17} /></span>
            Suporte & PKChat
          </h2>
          <div className="mt-4 space-y-4">
            <Field label="WhatsApp do suporte" hint="com DDI e DDD">
              <Input value={form.supportWhatsapp} inputMode="tel" maxLength={20} onChange={(e) => update("supportWhatsapp", onlyDigits(e.target.value))} />
            </Field>
            <Field label="E-mail de contato">
              <Input type="email" value={form.supportEmail} maxLength={80} onChange={(e) => update("supportEmail", e.target.value)} />
            </Field>
            <Toggle
              checked={form.pkchatEnabled}
              onChange={(v) => update("pkchatEnabled", v)}
              label="PKChat ativo para os tenants"
              description="Mostra o assistente na aba Ajuda dos negócios."
            />
            <div className="rounded-xl border border-saffron-300/60 bg-saffron-50 px-4 py-3 text-[12.5px] leading-relaxed text-saffron-900 dark:border-saffron-700/40 dark:bg-saffron-900/20 dark:text-saffron-200">
              <p className="font-extrabold">Conectar IA ao PKChat</p>
              Defina <code className="rounded bg-white/60 px-1.5 py-0.5 font-bold dark:bg-pine-950">VITE_PKCHAT_API_URL</code> com o endpoint do seu proxy seguro
              (que guarda a chave da IA). Sem essa variável, o PKChat usa o motor local de respostas.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
