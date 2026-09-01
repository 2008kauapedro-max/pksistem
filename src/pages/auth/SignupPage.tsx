/* Cadastro — cria usuário + tenant + trial. Com nicho do negócio, categorias
 * personalizadas e verificação de número de WhatsApp já em uso. */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useAuth, useToast } from "../../context/providers";
import { slugify, isValidSlug, onlyDigits } from "../../lib/utils";
import { NICHES, type Niche } from "../../lib/types";
import { Button, Field, Input } from "../../components/ui";
import { I } from "../../components/icons";
import { Wordmark } from "../../components/saas";
import { cn } from "../../lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [nicheId, setNicheId] = useState("restaurante");
  const [customCats, setCustomCats] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const previewSlug = slugTouched ? slug : slugify(restaurantName);
  const niche: Niche = NICHES.find((n) => n.id === nicheId) ?? NICHES[0];

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Informe seu nome.";
    if (!email.trim()) errs.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "E-mail inválido.";
    if (password.length < 8) errs.password = "A senha precisa ter pelo menos 8 caracteres.";
    if (!restaurantName.trim()) errs.restaurantName = "Informe o nome do seu negócio.";
    const s = slugify(slug || restaurantName);
    if (!isValidSlug(s)) errs.slug = "Endereço inválido. Use letras, números e hífens.";
    if (whatsapp && onlyDigits(whatsapp).length < 10) errs.whatsapp = "Número incompleto — use DDI + DDD (ex.: 5563999990000).";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const categories =
        nicheId === "outro"
          ? customCats.split(",").map((c) => c.trim()).filter(Boolean)
          : niche.categories;
      await authApi.signUp({
        name, email, password, restaurantName,
        slug: slug || restaurantName,
        whatsapp: onlyDigits(whatsapp) || undefined,
        niche: nicheId,
        categories: categories.length ? categories : undefined,
      });
      await refresh();
      push("success", "Conta criada! Seu trial de 14 dias começou. 🎉");
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setErrors({ global: err instanceof Error ? err.message : "Não foi possível criar a conta." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-xl animate-fade-up">
        <div className="mb-7 text-center">
          <Link to="/" aria-label="Voltar para o início"><Wordmark size="lg" /></Link>
          <h1 className="mt-6 font-display text-[26px] font-bold text-pine-950 dark:text-cream">Crie sua conta grátis</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Seu mini-site no ar em minutos. 14 dias de teste, sem cartão.</p>
        </div>

        {errors.global && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#a83a2a]/40 bg-[#f7e7e3] px-4 py-3 text-[13.5px] font-semibold text-[#7e2a1a] animate-fade-up">
            <I name="alert" size={17} className="mt-0.5 shrink-0" /> {errors.global}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-pine-100 bg-cream p-6 shadow-card dark:border-pine-800 dark:bg-pine-900">
          {/* Nicho */}
          <div>
            <span className="mb-2 block text-[13px] font-bold text-pine-900 dark:text-pine-100">Qual é o seu tipo de negócio?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NICHES.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  aria-pressed={nicheId === n.id}
                  onClick={() => { setNicheId(n.id); setErrors((x) => ({ ...x, global: "" })); }}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-left transition-all",
                    nicheId === n.id ? "border-pine-950 bg-pine-950 text-saffron-300 shadow-card dark:border-saffron-400 dark:bg-saffron-400/10" : "border-pine-200 hover:border-pine-400 dark:border-pine-700",
                  )}
                >
                  <span className={cn("block text-[12.5px] font-extrabold leading-tight", nicheId === n.id ? "" : "text-pine-900 dark:text-cream")}>{n.label}</span>
                  <span className={cn("mt-0.5 block text-[10.5px] leading-snug", nicheId === n.id ? "text-pine-300 dark:text-saffron-200" : "text-pine-500")}>{n.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] font-semibold text-pine-500 dark:text-pine-400">
              Categorias sugeridas: <strong className="text-pine-700 dark:text-pine-200">{(nicheId === "outro" ? (customCats.split(",").map((c) => c.trim()).filter(Boolean).length ? customCats.split(",").map((c) => c.trim()).filter(Boolean) : ["você define abaixo"]) : niche.categories).join(", ")}</strong> — dá para mudar tudo depois.
            </p>
            {nicheId === "outro" && (
              <div className="mt-2.5 animate-fade-up">
                <Field label="Suas categorias" hint="separe por vírgula">
                  <Input value={customCats} maxLength={120} placeholder="Ex.: Pastéis, Caldos, Porções, Bebidas" onChange={(e) => setCustomCats(e.target.value)} />
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Seu nome" required error={errors.name}>
              <Input value={name} invalid={Boolean(errors.name)} maxLength={60} placeholder="Como podemos te chamar?" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="E-mail" required error={errors.email}>
              <Input type="email" autoComplete="email" value={email} invalid={Boolean(errors.email)} placeholder="voce@negocio.com" onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          <Field label="Senha" required error={errors.password} hint="mínimo 8 caracteres">
            <Input type="password" autoComplete="new-password" value={password} invalid={Boolean(errors.password)} placeholder="Crie uma senha forte" onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome do negócio" required error={errors.restaurantName}>
              <Input value={restaurantName} invalid={Boolean(errors.restaurantName)} maxLength={60} placeholder="Ex.: Pastelaria do Zé" onChange={(e) => setRestaurantName(e.target.value)} />
            </Field>
            <Field label="Endereço do site" required error={errors.slug} hint={previewSlug ? `pksistem.app/r/${previewSlug}` : undefined}>
              <Input value={slugTouched ? slug : previewSlug} invalid={Boolean(errors.slug)} maxLength={40}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
            </Field>
          </div>
          <Field label="WhatsApp do negócio" error={errors.whatsapp} hint="DDI + DDD + número">
            <Input inputMode="tel" value={whatsapp} invalid={Boolean(errors.whatsapp)} placeholder="5563999990000" maxLength={20}
              onChange={(e) => setWhatsapp(e.target.value)} />
            {whatsapp && !errors.whatsapp && onlyDigits(whatsapp).length >= 10 && (
              <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-pine-600 dark:text-pine-300">
                <I name="check" size={13} className="text-saffron-600" /> Verificamos se o número já está em uso ao criar a conta.
              </span>
            )}
          </Field>

          <Button type="submit" size="lg" full loading={submitting} icon={submitting ? undefined : "rocket"} variant="amber">
            Criar minha conta grátis
          </Button>
          <p className="text-center text-[12px] leading-relaxed text-pine-500 dark:text-pine-400">
            Ao criar, você concorda com os{" "}
            <Link to="/termos" className="font-bold text-saffron-700 hover:underline dark:text-saffron-300">Termos de Uso</Link> e a{" "}
            <Link to="/privacidade" className="font-bold text-saffron-700 hover:underline dark:text-saffron-300">Política de Privacidade</Link>.
          </p>
        </form>

        <p className="mt-5 text-center text-[14px] font-semibold text-pine-600 dark:text-pine-300">
          Já tem conta?{" "}
          <Link to="/login" className="font-extrabold text-saffron-700 hover:underline dark:text-saffron-300">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
