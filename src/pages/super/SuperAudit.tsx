/* Log de auditoria da plataforma (ações, atores, resultados). */
import { useMemo, useState } from "react";
import { useAsyncData } from "../../context/providers";
import { adminApi } from "../../lib/api";
import { cn, formatDateTime } from "../../lib/utils";
import { EmptyState, ErrorState, Input, Select, SkeletonRow } from "../../components/ui";
import { I } from "../../components/icons";

const RESULT_STYLE: Record<string, string> = {
  ok: "bg-pine-100 text-pine-800 dark:bg-pine-800 dark:text-pine-100",
  denied: "bg-[#f0dede] text-[#7e2a1a]",
  error: "bg-saffron-100 text-saffron-800",
};

export default function SuperAudit() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("todos");
  const [limit, setLimit] = useState(60);

  const { data, loading, error, reload } = useAsyncData(() => adminApi.listAudit(200), []);

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((a) => (result === "todos" ? true : a.result === result))
        .filter((a) => `${a.action} ${a.actorEmail} ${a.resource}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit),
    [data, query, result, limit],
  );

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Auditoria</h1>
        <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">
          Quem fez o quê, em qual tenant e com qual resultado. Senhas e tokens nunca são registrados.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pine-400"><I name="search" size={17} /></span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ação, ator ou recurso…" className="pl-10" aria-label="Buscar auditoria" />
        </div>
        <Select value={result} onChange={(e) => setResult(e.target.value)} className="sm:w-44" aria-label="Filtrar por resultado">
          <option value="todos">Todos</option>
          <option value="ok">Sucesso</option>
          <option value="denied">Negado</option>
          <option value="error">Erro</option>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2.5"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="shield" title="Nenhum registro" description="Ajuste a busca ou o filtro." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-pine-100 bg-cream shadow-card dark:border-pine-800 dark:bg-[#12211b]">
            <div className="divide-y divide-pine-100 dark:divide-pine-800">
              {filtered.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-pine-50/50 dark:hover:bg-pine-900/30">
                  <span className={cn("w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-[10.5px] font-extrabold uppercase", RESULT_STYLE[a.result])}>{a.result === "ok" ? "sucesso" : a.result === "denied" ? "negado" : "erro"}</span>
                  <code className="shrink-0 rounded-md bg-paper px-2 py-1 text-[11.5px] font-bold text-pine-800 dark:bg-[#0f1c16] dark:text-pine-100">{a.action}</code>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-pine-600 dark:text-pine-300">
                    {a.actorEmail}{a.tenantId ? ` · tenant ${a.tenantId.slice(0, 14)}…` : " · plataforma"}
                    {a.metadata && <span className="text-pine-400"> · {Object.entries(a.metadata).map(([k, v]) => `${k}=${v}`).join(", ")}</span>}
                  </span>
                  <span className="shrink-0 text-[11.5px] font-semibold text-pine-400">{formatDateTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
          {filtered.length >= limit && (
            <div className="mt-4 text-center">
              <button onClick={() => setLimit((l) => l + 60)} className="text-[13px] font-extrabold text-saffron-700 hover:underline">Carregar mais registros</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
