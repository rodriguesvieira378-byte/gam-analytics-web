"use client";

import { useMemo, useState } from "react";
import type {
  AppRole,
  GamMember,
  UserAccess
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

import { SummaryCard } from "./cards/SummaryCard";
import { IntegrationsTab } from "./tabs/IntegrationsTab";
import { PermissionsTab } from "./tabs/PermissionsTab";
import { RequestsTab } from "./tabs/RequestsTab";
import { SystemTab } from "./tabs/SystemTab";
import { UsersTab } from "./tabs/UsersTab";

import styles from "./AdminModule.module.css";

type AdminTab =
  | "usuarios"
  | "solicitacoes"
  | "permissoes"
  | "sistema"
  | "integracoes";

export interface AdminModuleProps {
  access: UserAccess;
  members: GamMember[];
  onAddMember: (input: {
    email: string;
    displayName: string;
    role: AppRole;
  }) => Promise<void> | void;
  onUpdateMember: (member: GamMember) => Promise<void> | void;
  onApproveRequest: (
    userId: string,
    role: AppRole
  ) => Promise<void> | void;
  onRejectRequest: (
    userId: string,
    reason: string
  ) => Promise<void> | void;
  onBackup: () => void;
}

const ADMIN_TABS: Array<[AdminTab, string]> = [
  ["usuarios", "Usuários"],
  ["solicitacoes", "Solicitações"],
  ["permissoes", "Permissões"],
  ["sistema", "Sistema"],
  ["integracoes", "Integrações"]
];

export function AdminModule({
  access,
  members,
  onAddMember,
  onUpdateMember,
  onApproveRequest,
  onRejectRequest,
  onBackup
}: AdminModuleProps) {
  const [tab, setTab] = useState<AdminTab>("usuarios");

  const summary = useMemo(() => {
    const active = members.filter((member) => member.active).length;

    return {
      total: members.length,
      active,
      admins: members.filter(
        (member) => member.role === "Administrador"
      ).length,
      supervisors: members.filter(
        (member) => member.role === "Supervisor"
      ).length,
      consultations: members.filter(
        (member) => member.role === "Consulta"
      ).length,
      inactive: members.length - active
    };
  }, [members]);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <SectionTitle
          eyebrow="Painel administrativo"
          title="Administração"
          description="Usuários, permissões, integridade e integrações do GAM Analytics."
        />

        <Badge tone="green" size="sm">
          {access.role}
        </Badge>
      </div>

      <section className={styles.summary}>
        <SummaryCard
          tone="blue"
          label="Usuários"
          value={summary.total}
          description={`${summary.active} ativo(s)`}
        />

        <SummaryCard
          tone="green"
          label="Administradores"
          value={summary.admins}
          description="Acesso total"
        />

        <SummaryCard
          tone="yellow"
          label="Supervisores"
          value={summary.supervisors}
          description="Gestão operacional"
        />

        <SummaryCard
          tone="blue"
          label="Consultas"
          value={summary.consultations}
          description="Acesso somente leitura"
        />

        <SummaryCard
          tone={summary.inactive > 0 ? "red" : "green"}
          label="Inativos"
          value={summary.inactive}
          description="Sem acesso ao sistema"
        />
      </section>

      <Card className={styles.tabsCard}>
        <div className={styles.tabs}>
          {ADMIN_TABS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={
                tab === key ? styles.active : ""
              }
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {tab === "usuarios" && (
        <UsersTab
          members={members}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
        />
      )}

      {tab === "solicitacoes" && (
        <RequestsTab
          members={members}
          onApprove={onApproveRequest}
          onReject={onRejectRequest}
        />
      )}

      {tab === "permissoes" && (
        <PermissionsTab />
      )}

      {tab === "sistema" && (
        <SystemTab onBackup={onBackup} />
      )}

      {tab === "integracoes" && (
        <IntegrationsTab />
      )}
    </section>
  );
}

export default AdminModule;
