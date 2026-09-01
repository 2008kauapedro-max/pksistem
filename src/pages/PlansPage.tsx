/* Página de preços do SaborFlow. */
import { Link } from "react-router-dom";
import { PLANS } from "../lib/plans";
import { PlanCard, Wordmark } from "../components/saas";
import { Reveal } from "../components/ui";
import { useState } from "react";
import { I } from "../components/icons";

export default function PlansPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-50 border-b border-pine-100/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="SaborFlow — início"><Wordmark /></Link>
          <Link to="/cadastro" className="text-[13.5px] font-extrabold text-saffron-700 hover:underline">Criar conta</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-saffron-700">Planos</p>
          <h1 className="mt-2 font-display text-[clamp(1.9rem,5vw,2.8rem)] font-bold text-pine-950">Um plano para cada fase do seu restaurante<span className="text-saffron-500">.</span></h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-pine-600">Comece grátis, evolua quando precisar. Sem fidelidade.</p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-pine-200 bg-cream p-1.5">
            <button onClick={() => setAnnual(false)} className={`rounded-full px-4 py-2 text-[13px] font-extrabold transition-all ${!annual ? "bg-pine-800 text-cream" : "text-pine-600"}`}>Mensal</button>
            <button onClick={() => setAnnual(true)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold transition-all ${annual ? "bg-pine-800 text-cream" : "text-pine-600"}`}>
              Anual <span className="rounded-full bg-saffron-400 px-1.5 py-0.5 text-[10px] text-pine-950">-20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <PlanCard planId={p.id} annual={annual} onSelect={() => { window.location.hash = "#/cadastro"; }} />
            </Reveal>
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-[13px] font-semibold text-pine-500">
          <I name="shield" size={16} /> Todos os planos incluem dados isolados por restaurante e site público.
        </p>
      </main>
    </div>
  );
}
