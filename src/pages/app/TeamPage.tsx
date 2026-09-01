/* Equipe: convites, papéis e permissões (RBAC validado no backend). */
import { useState } from "react";
import { useAuth, useAsyncData, useToast } from "../../context/providers";
import { api } from "../../lib/api";
import { can, hasFeature } from "../../lib/plans";
import { ROLE_LABEL, ROLES, type Role, type TenantMember } from "../../lib/types";
import { cn, formatDateTime } from "../../lib/utils";
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, Select, SkeletonRow } from "../../components/ui";
import { UpgradeGate } from "../../components/saas";
import { I } from "../../components/icons";

export default function TeamPage() {
  const { membership } = useAuth();
  const { push } = useToast();
  const tenant = membership?.tenant;
  const tenantId = tenant?.id ?? "";
  const myRole = membership?.role ?? null;
  const canManage = can(myRole, "users.manage");
  const allowed = hasFeature(tenant ?? null, "multiple_users");

  const [showInvite, setShowInvite] = useState(false);
  const [removing, setRemoving] = useState<TenantMember | null>(null);

  const { data: members, loading, error, reload, set } = useAsyncData(() => api.listMembers(tenantId), [tenantId]);

  async function handleRemove() {
    if (!removing) return;
    try {
      await api.removeMember(tenantId, removing.id);
      set((d) => (d ? d.filter((m) => m.id !== removing.id) : d));
      push("success", "Membro removido da equipe.");
      setRemoving(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao remover o membro.");
    }
  }

  async function handleRole(member: TenantMember, role: Role) {
    try {
      const updated = await api.setMemberRole(tenantId, member.id, role);
      set((d) => (d ? d.map((m) => (m.id === member.id ? updated : m)) : d));
      push("success", `Papel atualizado para ${ROLE_LABEL[role]}.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao alterar o papel.");
    }
  }

  if (!tenant) return null;

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-pine-950 dark:text-cream">Equipe</h1>
          <p className="mt-1 text-[14px] text-pine-600 dark:text-pine-300">Convide funcionários e controle o que cada um pode fazer.</p>
        </div>
        {canManage && allowed && <Button icon="plus" onClick={() => setShowInvite(true)}>Convidar membro</Button>}
      </header>

      {!allowed ? (
        <UpgradeGate feature="Múltiplos usuários" currentPlanId={tenant.planId} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2.5"><SkeletonRow /><SkeletonRow /></div>
      ) : (members ?? []).length === 0 ? (
        <EmptyState icon="users" title="Ninguém na equipe ainda" description="Convide um funcionário para ajudar a gerenciar o restaurante." />
      ) : (
        <div className="space-y-3">
          {(members ?? []).map((m) => (
            <article key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-pine-100 bg-cream p-4 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pine-100 font-display text-[16px] font-bold text-pine-700 dark:bg-pine-800 dark:text-pine-200">
                {(m.user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14.5px] font-extrabold text-pine-950 dark:text-cream">
                  {m.user?.name}
                  {m.role === "owner" && <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-saffron-800">dono</span>}
                </p>
                <p className="truncate text-[12.5px] font-semibold text-pine-500">{m.user?.email} · entrou {m.user?.lastLoginAt ? formatDateTime(m.user.lastLoginAt) : "nunca"}</p>
              </div>
              {canManage && m.role !== "owner" ? (
                <div className="flex items-center gap-2">
                  <Select value={m.role} onChange={(e) => handleRole(m, e.target.value as Role)} className="w-36" aria-label={`Papel de ${m.user?.name}`}>
                    {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                  <button onClick={() => setRemoving(m)} aria-label={`Remover ${m.user?.name}`} className="rounded-lg border border-pine-200 p-2 text-[#a83a2a] hover:border-[#c0563f] hover:bg-[#a83a2a]/10 dark:border-pine-700">
                    <I name="trash" size={16} />
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-pine-100 px-3 py-1.5 text-[12px] font-extrabold text-pine-700 dark:bg-pine-800 dark:text-pine-200">{ROLE_LABEL[m.role]}</span>
              )}
            </article>
          ))}
        </div>
      )}

      {canManage && allowed && (
        <div className="mt-6 rounded-2xl border border-pine-100 bg-cream p-5 shadow-card dark:border-pine-800 dark:bg-[#12211b]">
          <h2 className="font-display text-[16px] font-bold text-pine-950 dark:text-cream">O que cada papel pode fazer</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r} className="rounded-xl bg-paper p-3.5 dark:bg-[#0f1c16]">
                <p className="text-[13px] font-extrabold text-pine-950 dark:text-cream">{ROLE_LABEL[r]}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-pine-500">
                  {r === "owner" && "Tudo, incluindo billing e equipe."}
                  {r === "admin" && "Cardápio, pratos, site e equipe."}
                  {r === "editor" && "Cardápio e pratos (sem excluir/site)."}
                  {r === "viewer" && "Somente visualização."}
                </p>
              </div>
            ))}
          </div>
          <p className={cn("mt-3 text-[11.5px] font-semibold text-pine-500")}>
            As permissões são validadas no backend — esconder botões não é segurança.
          </p>
        </div>
      )}

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} tenantId={tenantId} onInvited={(m) => set((d) => (d ? [...d, m] : [m]))} />

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remover ${removing?.user?.name}?`}
        message="A pessoa perde o acesso ao painel deste restaurante imediatamente."
        confirmLabel="Remover"
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}

function InviteModal({ open, onClose, tenantId, onInvited }: { open: boolean; onClose: () => void; tenantId: string; onInvited: (m: TenantMember) => void }) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "E-mail inválido.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const member = await api.inviteMember(tenantId, email, name, role);
      push("success", `Convite criado para ${email}.`);
      setName(""); setEmail(""); setRole("editor");
      onClose();
      onInvited(member);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Erro ao convidar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Convidar membro" subtitle="Em produção o convite chega por e-mail com link de uso único."
      footer={<div className="flex justify-end gap-2.5"><Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={handleSubmit} loading={saving} icon={saving ? undefined : "send"}>Enviar convite</Button></div>}
    >
      <div className="space-y-4">
        <Field label="Nome" hint="opcional">
          <Input value={name} maxLength={60} placeholder="Nome do funcionário" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="E-mail" required error={errors.email}>
          <Input type="email" value={email} invalid={Boolean(errors.email)} placeholder="funcionario@email.com" onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: "" })); }} />
        </Field>
        <Field label="Papel" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
