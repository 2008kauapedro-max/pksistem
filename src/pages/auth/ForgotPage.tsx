/* Recuperação de senha — fluxo com token único e expiração. */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useToast } from "../../context/providers";
import { Button, Field, Input } from "../../components/ui";
import { I } from "../../components/icons";
import { Wordmark } from "../../components/saas";

export default function ForgotPage() {
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [token, setToken] = useState("");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { demoResetToken } = await authApi.requestPasswordReset(email);
      // Em produção este link chega por e-mail. No demo, exibimos para testar o fluxo.
      setToken(demoResetToken);
      setStep("reset");
      push("info", "Se o e-mail existir, enviamos um link de recuperação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.resetPassword(token, newPass);
      push("success", "Senha redefinida! Entre com sua nova senha.");
      window.location.hash = "#/login";
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <Link to="/" aria-label="Voltar para o início"><Wordmark size="lg" /></Link>
          <h1 className="mt-6 font-display text-[24px] font-bold text-pine-950">Recuperar acesso</h1>
          <p className="mt-1 text-[14px] text-pine-600">
            {step === "email" ? "Informe seu e-mail para receber um link de recuperação." : "Defina sua nova senha."}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleRequest} className="space-y-4.5 rounded-2xl border border-pine-100 bg-cream p-6 shadow-card">
            <Field label="E-mail" required>
              <Input type="email" autoComplete="email" placeholder="voce@restaurante.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" full loading={busy} icon={busy ? undefined : "send"}>
              Enviar link de recuperação
            </Button>
            <p className="text-center text-[13px] font-semibold"><Link to="/login" className="text-saffron-700 hover:underline">Voltar ao login</Link></p>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4.5 rounded-2xl border border-pine-100 bg-cream p-6 shadow-card">
            <div className="rounded-xl border border-saffron-300/70 bg-saffron-50 px-4 py-3 text-[12.5px] leading-relaxed text-saffron-900">
              <p className="font-extrabold">Modo demonstração</p>
              Em produção o link chega por e-mail. Aqui, o token já foi preenchido automaticamente para você testar o fluxo.
            </div>
            <Field label="Nova senha" required hint="mínimo 8 caracteres">
              <Input type="password" autoComplete="new-password" placeholder="Nova senha" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" full loading={busy} icon={busy ? undefined : "check"}>
              Redefinir senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
