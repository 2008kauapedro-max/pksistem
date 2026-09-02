/* Login — atende dono de negócio, equipe e super admin.
 * "Precisa de ajuda?" abre direto o PKChat. */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useToast } from "../../context/providers";
import { Button, Field, Input, Modal } from "../../components/ui";
import { I } from "../../components/icons";
import { Wordmark } from "../../components/saas";
import PkChat from "../../components/PkChat";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [helpOpen, setHelpOpen] = useState(false);

  function validate(): boolean {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "E-mail inválido.";
    if (!password) errs.password = "Informe sua senha.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { user, membership } = await signIn(email.trim(), password);
      push("success", `Bem-vindo(a) de volta, ${user.name.split(" ")[0]}!`);
      if (user.isSuperAdmin) navigate("/super", { replace: true });
      else if (membership && !membership.tenant.onboardingCompleted) navigate("/onboarding", { replace: true });
      else if (membership) navigate("/app", { replace: true });
      else navigate("/cadastro", { replace: true });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <Link to="/" aria-label="Voltar para o início"><Wordmark size="lg" /></Link>
          <h1 className="mt-6 font-display text-[26px] font-bold text-pine-950 dark:text-cream">Bem-vindo(a) de volta</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Entre para gerenciar seu negócio ou a plataforma.</p>
        </div>

        {globalError && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#a83a2a]/30 bg-[#a83a2a]/8 px-4 py-3 text-[13.5px] font-semibold text-[#7e2a1a] animate-fade-in">
            <I name="alert" size={17} className="mt-0.5 shrink-0" />
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4.5 rounded-2xl border border-pine-100 bg-cream p-6 shadow-card">
          <Field label="E-mail" error={fieldErrors.email} required>
            <Input
              type="email"
              autoComplete="email"
              placeholder="voce@restaurante.com"
              value={email}
              invalid={Boolean(fieldErrors.email)}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })); }}
            />
          </Field>

          <Field label="Senha" error={fieldErrors.password} required>
            <span className="relative block">
              <Input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                invalid={Boolean(fieldErrors.password)}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })); }}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-pine-500 transition-colors hover:bg-pine-100 hover:text-pine-800"
              >
                <I name={showPass ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
          </Field>

          <Button type="submit" size="lg" full loading={submitting} icon={submitting ? undefined : "arrowRight"}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>

          <div className="flex items-center justify-between gap-2 pt-1 text-[13px] font-semibold">
            <Link to="/recuperar" className="text-pine-700 transition-colors hover:text-pine-950 hover:underline dark:text-pine-300 dark:hover:text-cream">Esqueci minha senha</Link>
            <button type="button" onClick={() => setHelpOpen(true)} className="flex items-center gap-1 text-pine-700 transition-colors hover:text-pine-950 hover:underline dark:text-pine-300 dark:hover:text-cream">
              <I name="zap" size={13} className="text-saffron-600" /> Precisa de ajuda?
            </button>
            <Link to="/cadastro" className="text-saffron-700 transition-colors hover:text-saffron-800 hover:underline dark:text-saffron-300">Criar conta</Link>
          </div>
        </form>

        {/* PKChat — ajuda instantânea */}
        <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="PKChat · Ajuda PKSISTEM" subtitle="Pergunte algo — resposta na hora." size="lg">
          <PkChat tenant={null} compact />
        </Modal>

        <p className="mt-5 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-pine-600">
          <I name="shield" size={15} className="text-pine-500" />
          Acesso protegido por sessão + isolamento de dados por restaurante.
        </p>
      </div>
    </div>
  );
}