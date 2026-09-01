/* Onboarding — configura o restaurante passo a passo e publica o mini-site. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useToast } from "../context/providers";
import { api } from "../lib/api";
import { CATEGORIES, type Category } from "../lib/types";
import { Progress } from "../components/saas";
import { Button, Field, Input } from "../components/ui";
import { I } from "../components/icons";
import { FlowMark } from "../components/saas";

const STEPS = ["Nome", "WhatsApp", "Endereço", "Horários", "Cores", "Cardápio", "Publicar"];

/* Paleta ampla + cor personalizada — o dono não fica preso a meia dúzia de cores. */
const COLORS = [
  "#1c523b", "#14532d", "#166534", "#134e4a", "#173f5c", "#1e3a5f", "#312e81",
  "#5b3a7a", "#701a75", "#9d3b6b", "#9f1239", "#7a2e2e", "#9a3412", "#8f5e0d",
  "#a16207", "#4d7c0f", "#0f766e", "#155e75", "#374151", "#0a0a0a",
];

export default function OnboardingPage() {
  const { membership, refresh } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(membership?.tenant.settings.name ?? "");
  const [whatsapp, setWhatsapp] = useState(membership?.tenant.settings.whatsapp ?? "");
  const [address, setAddress] = useState(membership?.tenant.settings.address ?? "");
  const [hours, setHours] = useState(membership?.tenant.settings.openingHours ?? "");
  const [color, setColor] = useState(membership?.tenant.settings.primaryColor ?? "#1c523b");
  const [dishName, setDishName] = useState("");
  const [dishCategory, setDishCategory] = useState<Category>("Carnes");

  if (!membership) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
        <p className="text-[14px] font-semibold text-pine-600">Carregando seu restaurante…</p>
      </div>
    );
  }

  const tenantId = membership.tenant.id;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  async function patchSettings(patch: Record<string, unknown>) {
    await api.updateSettings(tenantId, patch);
  }

  async function handleNext() {
    setBusy(true);
    try {
      if (step === 0) await patchSettings({ name });
      else if (step === 1) await patchSettings({ whatsapp });
      else if (step === 2) await patchSettings({ address });
      else if (step === 3) await patchSettings({ openingHours: hours });
      else if (step === 4) await patchSettings({ primaryColor: color, secondaryColor: color });
      else if (step === 5) {
        if (dishName.trim()) {
          const food = await api.createFood(tenantId, {
            name: dishName, category: dishCategory, saveToLibrary: true,
          });
          const { todayISO } = await import("../lib/utils");
          await api.addToMenu(tenantId, food.id, todayISO());
        }
      }
      if (step === STEPS.length - 1) {
        await api.publishSite(tenantId, true);
        await api.completeOnboarding(tenantId);
        await refresh();
        push("success", "Seu mini-site está no ar! 🎉");
        navigate("/app", { replace: true });
        return;
      }
      await refresh();
      setStep((s) => s + 1);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-dvh bg-paper px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-pine-800"><FlowMark size={40} /></span>
          <span className="rounded-full bg-pine-100 px-3 py-1.5 text-[12px] font-extrabold text-pine-800">
            Passo {step + 1} de {STEPS.length}
          </span>
        </div>

        <div className="mb-2 flex items-baseline justify-between">
          <h1 className="font-display text-[22px] font-bold text-pine-950">Vamos configurar seu restaurante</h1>
        </div>
        <p className="text-[13.5px] font-semibold text-pine-600">Seu site está {progress}% configurado.</p>
        <Progress value={progress} className="mt-3" />

        <div className="mt-6 rounded-2xl border border-pine-100 bg-cream p-6 shadow-card">
          <h2 className="font-display text-[19px] font-bold text-pine-950">
            {STEPS[step]}
          </h2>

          <div className="mt-5 space-y-4">
            {step === 0 && (
              <Field label="Nome do restaurante" required>
                <Input value={name} maxLength={60} placeholder="Como seus clientes te conhecem?" onChange={(e) => setName(e.target.value)} autoFocus />
              </Field>
            )}
            {step === 1 && (
              <Field label="WhatsApp do restaurante" required hint="com DDI e DDD">
                <Input value={whatsapp} inputMode="tel" placeholder="5563999990000" maxLength={20} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} />
              </Field>
            )}
            {step === 2 && (
              <Field label="Endereço" hint="opcional">
                <Input value={address} maxLength={120} placeholder="Rua, número, bairro, cidade/UF" onChange={(e) => setAddress(e.target.value)} />
              </Field>
            )}
            {step === 3 && (
              <Field label="Horário de funcionamento" hint="opcional">
                <Input value={hours} maxLength={60} placeholder="Ex.: Seg a Sáb · 11h às 14h30" onChange={(e) => setHours(e.target.value)} />
              </Field>
            )}
            {step === 4 && (
              <div>
                <span className="mb-2 block text-[13px] font-bold text-pine-900">Cor principal do seu site</span>
                <div className="flex flex-wrap gap-2.5">
                  {COLORS.map((c) => (
                    <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={color === c} onClick={() => setColor(c)}
                      className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-pine-950 ring-2 ring-saffron-400 ring-offset-2" : "border-black/10"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full border-2 border-pine-200 bg-cream px-3 text-[12px] font-bold text-pine-700 hover:border-pine-400">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0" aria-label="Cor personalizada" />
                    Outra
                  </label>
                </div>
                <p className="mt-3 text-[12.5px] text-pine-500">Você poderá trocar e refinar as cores depois, em <strong>Meu site → Aparência</strong>.</p>
              </div>
            )}
            {step === 5 && (
              <>
                <Field label="Nome do primeiro prato" hint="opcional — pode pular">
                  <Input value={dishName} maxLength={60} placeholder="Ex.: Frango assado" onChange={(e) => setDishName(e.target.value)} />
                </Field>
                <Field label="Categoria">
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button key={c} type="button" aria-pressed={dishCategory === c} onClick={() => setDishCategory(c)}
                        className={`rounded-full border-2 px-3.5 py-2 text-[13px] font-bold transition-all ${dishCategory === c ? "border-pine-700 bg-pine-700 text-cream" : "border-pine-200 bg-cream text-pine-700 hover:border-pine-400"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}
            {step === 6 && (
              <div className="rounded-xl border border-pine-200 bg-pine-50/60 p-4">
                <p className="flex items-center gap-2 font-display text-[16px] font-bold text-pine-950">
                  <I name="rocket" size={18} className="text-saffron-600" /> Tudo pronto para publicar!
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-pine-600">
                  Seu mini-site em <strong>pksistem.app/r/{membership.tenant.slug}</strong> ficará visível para seus clientes.
                  Você pode editar tudo depois, no painel.
                </p>
              </div>
            )}
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => (step === 0 ? navigate("/app", { replace: true }) : setStep((s) => s - 1))} disabled={busy}>
              {step === 0 ? "Pular por enquanto" : "Voltar"}
            </Button>
            <Button onClick={handleNext} loading={busy} icon={busy ? undefined : isLast ? "rocket" : "arrowRight"} variant={isLast ? "amber" : "primary"}>
              {isLast ? "Publicar meu site" : "Continuar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
