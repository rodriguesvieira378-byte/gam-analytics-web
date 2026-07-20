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
  onUpdateMember: (
    member: GamMember
  ) => Promise<void> | void;
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

interface AdminTabConfig {
  key: AdminTab;
  label: string;
}

const ADMIN_TABS: AdminTabConfig[] = [
  {
    key: "usuarios",
    label: "Usuários"
  },
  {
    key: "solicitacoes",
    label: "Solicitações"
  },
  {
    key: "permissoes",
    label: "Permissões"
  },
  {
    key: "sistema",
    label: "Sistema"
  },
  {
    key: "integracoes",
    label: "Integrações"
  }
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
  const [tab, setTab] =
    useState<AdminTab>("usuarios");

  const summary = useMemo(() => {
    return members.reduce(
      (totals, member) => {
        totals.total += 1;

        if (member.active) {
          totals.active += 1;
        } else {
          totals.inactive += 1;
        }

        if (
          member.role === "Administrador"
        ) {
          totals.admins += 1;
        }

        if (member.role === "Supervisor") {
          totals.supervisors += 1;
        }

        if (member.role === "Consulta") {
          totals.consultations += 1;
        }

        return totals;
      },
      {
        total: 0,
        active: 0,
        admins: 0,
        supervisors: 0,
        consultations: 0,
        inactive: 0
      }
    );
  }, [members]);

  function renderActiveTab() {
    if (tab === "usuarios") {
      return (
        <UsersTab
          members={members}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
        />
      );
    }

    if (tab === "solicitacoes") {
      return (
        <RequestsTab
          members={members}
          onApprove={onApproveRequest}
          onReject={onRejectRequest}
        />
      );
    }

    if (tab === "permissoes") {
      return <PermissionsTab />;
    }

    if (tab === "sistema") {
      return (
        <SystemTab onBackup={onBackup} />
      );
    }

    return <IntegrationsTab />;
  }

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

      <section
        className={styles.summary}
        aria-label="Resumo administrativo"
      >
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
          tone={
            summary.inactive > 0
              ? "red"
              : "green"
          }
          label="Inativos"
          value={summary.inactive}
          description="Sem acesso ao sistema"
        />
      </section>

      <Card className={styles.tabsCard}>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Seções administrativas"
        >
          {ADMIN_TABS.map(
            ({ key, label }) => {
              const isActive = tab === key;

              return (
                <button
                  type="button"
                  role="tab"
                  key={key}
                  aria-selected={isActive}
                  aria-controls={`admin-panel-${key}`}
                  className={
                    isActive
                      ? styles.active
                      : ""
                  }
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              );
            }
          )}
        </div>
      </Card>

      <div
        id={`admin-panel-${tab}`}
        role="tabpanel"
        aria-label={
          ADMIN_TABS.find(
            (item) => item.key === tab
          )?.label
        }
      >
        {renderActiveTab()}
      </div>
    </section>
  );
}

export default AdminModule;
