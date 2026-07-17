"use client";

import { useMemo, useState } from "react";
import type {
  AuditLog,
  GamMember,
  Officer
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Select } from "@/components/ui/Select";

import styles from "./AuditModule.module.css";

type ActionFilter =
  | "todas"
  | "INSERT"
  | "UPDATE"
  | "DELETE";

type ModuleFilter =
  | "todos"
  | "officers"
  | "weekly_entries"
  | "discord_records"
  | "gam_members"
  | "monthly_closures";

export interface AuditModuleProps {
  logs: AuditLog[];
  officers: Officer[];
  members: GamMember[];
}

function readValue(
  data: Record<string, unknown> | null,
  ...keys: string[]
) {
  if (!data) return undefined;

  for (const key of keys) {
    if (key in data) return data[key];
  }

  return undefined;
}

function moduleLabel(entity: string) {
  const labels: Record<string, string> = {
    officers: "Efetivo",
    weekly_entries: "Lançamentos",
    discord_records: "Discord",
    gam_members: "Acessos",
    monthly_closures: "Fechamento"
  };

  return labels[entity] ?? entity;
}

function actionLabel(log: AuditLog) {
  if (
    log.entity === "discord_records" &&
    log.action === "UPDATE"
  ) {
    const oldStatus = String(
      readValue(log.oldData, "status") ?? ""
    );

    const newStatus = String(
      readValue(log.newData, "status") ?? ""
    );

    if (
      oldStatus === "Pendente" &&
      newStatus === "Aprovado"
    ) {
      return "Aprovou";
    }

    if (
      oldStatus === "Pendente" &&
      newStatus === "Rejeitado"
    ) {
      return "Rejeitou";
    }
  }

  if (
    log.entity === "gam_members" &&
    log.action === "UPDATE"
  ) {
    const oldActive = Boolean(
      readValue(log.oldData, "active")
    );

    const newActive = Boolean(
      readValue(log.newData, "active")
    );

    if (oldActive && !newActive) return "Desativou";
    if (!oldActive && newActive) return "Reativou";
  }

  if (log.entity === "monthly_closures") {
    return log.action === "INSERT"
      ? "Fechou mês"
      : "Atualizou fechamento";
  }

  if (log.action === "INSERT") return "Criou";
  if (log.action === "UPDATE") return "Alterou";
  if (log.action === "DELETE") return "Excluiu";

  return log.action;
}

function actionTone(log: AuditLog) {
  const label = actionLabel(log);

  if (
    ["Criou", "Aprovou", "Reativou", "Fechou mês"].includes(
      label
    )
  ) {
    return "green";
  }

  if (
    ["Excluiu", "Rejeitou", "Desativou"].includes(label)
  ) {
    return "red";
  }

  return "yellow";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function targetLabel(
  log: AuditLog,
  officers: Officer[]
) {
  const data = log.newData ?? log.oldData;

  if (!data) return log.entityId;

  if (log.entity === "officers") {
    const registration = readValue(
      data,
      "registration"
    );

    const name = readValue(data, "name");

    return (
      [registration, name].filter(Boolean).join(" — ") ||
      log.entityId
    );
  }

  if (
    log.entity === "weekly_entries" ||
    log.entity === "discord_records"
  ) {
    const officerId = String(
      readValue(data, "officer_id", "officerId") ?? ""
    );

    const officer = officers.find(
      (item) => item.id === officerId
    );

    const week = readValue(data, "week");
    const month = readValue(data, "month");
    const year = readValue(data, "year");

    const period = week
      ? `S${week} • ${month}/${year}`
      : month
        ? `${month}/${year}`
        : "";

    return [officer?.name ?? "Integrante", period]
      .filter(Boolean)
      .join(" — ");
  }

  if (log.entity === "gam_members") {
    return String(
      readValue(
        data,
        "display_name",
        "displayName",
        "email"
      ) ?? log.entityId
    );
  }

  if (log.entity === "monthly_closures") {
    const month = readValue(data, "month");
    const year = readValue(data, "year");

    return month && year
      ? `${month}/${year}`
      : log.entityId;
  }

  return log.entityId;
}

function summary(log: AuditLog) {
  const data = log.newData ?? log.oldData;

  if (!data) {
    return "Ação registrada pelo sistema.";
  }

  if (log.entity === "weekly_entries") {
    const prisons = readValue(data, "prisons") ?? 0;
    const pursuits = readValue(data, "pursuits") ?? 0;

    return `${prisons} prisão(ões) • ${pursuits} acompanhamento(s)`;
  }

  if (log.entity === "discord_records") {
    const type =
      readValue(data, "activity_type", "activityType") ??
      "Atividade";

    const quantity =
      readValue(data, "quantity") ?? 0;

    const status =
      readValue(data, "status") ?? "";

    return `${type}: ${quantity} • ${status}`;
  }

  if (log.entity === "officers") {
    const role = readValue(data, "role") ?? "";
    const status = readValue(data, "status") ?? "";

    return [role, status].filter(Boolean).join(" • ");
  }

  if (log.entity === "gam_members") {
    const role = readValue(data, "role") ?? "";
    const active = Boolean(readValue(data, "active"));

    return `${role} • ${active ? "Ativo" : "Inativo"}`;
  }

  if (log.entity === "monthly_closures") {
    const hash = String(
      readValue(
        data,
        "integrity_hash",
        "integrityHash"
      ) ?? ""
    );

    return hash
      ? `Integridade ${hash.slice(0, 12)}…`
      : "Período arquivado";
  }

  return "Ação registrada pelo sistema.";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadFile(
  filename: string,
  content: string,
  type: string
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function AuditModule({
  logs,
  officers,
  members
}: AuditModuleProps) {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] =
    useState<ModuleFilter>("todos");
  const [actionFilter, setActionFilter] =
    useState<ActionFilter>("todas");
  const [actorFilter, setActorFilter] =
    useState("todos");

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...logs]
      .filter((log) => {
        const actor = members.find(
          (member) =>
            member.userId === log.actorUserId
        );

        const matchesSearch =
          !term ||
          actionLabel(log).toLowerCase().includes(term) ||
          moduleLabel(log.entity)
            .toLowerCase()
            .includes(term) ||
          targetLabel(log, officers)
            .toLowerCase()
            .includes(term) ||
          summary(log).toLowerCase().includes(term) ||
          actor?.displayName
            .toLowerCase()
            .includes(term);

        const matchesModule =
          moduleFilter === "todos" ||
          log.entity === moduleFilter;

        const matchesAction =
          actionFilter === "todas" ||
          log.action === actionFilter;

        const matchesActor =
          actorFilter === "todos" ||
          log.actorUserId === actorFilter;

        return (
          matchesSearch &&
          matchesModule &&
          matchesAction &&
          matchesActor
        );
      })
      .sort((a, b) =>
        String(b.createdAt).localeCompare(
          String(a.createdAt)
        )
      );
  }, [
    actionFilter,
    actorFilter,
    logs,
    members,
    moduleFilter,
    officers,
    search
  ]);

  const createdCount = logs.filter(
    (log) => log.action === "INSERT"
  ).length;

  const updatedCount = logs.filter(
    (log) => log.action === "UPDATE"
  ).length;

  const deletedCount = logs.filter(
    (log) => log.action === "DELETE"
  ).length;

  const discordCount = logs.filter(
    (log) => log.entity === "discord_records"
  ).length;

  function handleExportCsv() {
    const header = [
      "Data e hora",
      "Usuário",
      "Ação",
      "Módulo",
      "Alvo",
      "Resumo",
      "ID"
    ];

    const rows = filteredLogs.map((log) => {
      const actor = members.find(
        (member) =>
          member.userId === log.actorUserId
      );

      return [
        formatDate(log.createdAt),
        actor?.displayName ??
          "Sistema / usuário removido",
        actionLabel(log),
        moduleLabel(log.entity),
        targetLabel(log, officers),
        summary(log),
        log.entityId
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(";"))
      .join("\n");

    const date = new Date().toISOString().slice(0, 10);

    downloadFile(
      `gam-auditoria-${date}.csv`,
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8"
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <SectionTitle
          eyebrow="Segurança operacional"
          title="Auditoria"
          description="Histórico de alterações, aprovações, exclusões e ações administrativas."
        />

        <Button onClick={handleExportCsv}>
          Exportar CSV
        </Button>
      </div>

      <section className={styles.summary}>
        <Card tone="green" className={styles.summaryCard}>
          <span>Criações</span>
          <strong>{createdCount}</strong>
          <small>Novos registros no histórico</small>
        </Card>

        <Card tone="yellow" className={styles.summaryCard}>
          <span>Alterações</span>
          <strong>{updatedCount}</strong>
          <small>Atualizações registradas</small>
        </Card>

        <Card tone="red" className={styles.summaryCard}>
          <span>Exclusões</span>
          <strong>{deletedCount}</strong>
          <small>Ações removidas do sistema</small>
        </Card>

        <Card tone="blue" className={styles.summaryCard}>
          <span>Eventos do Discord</span>
          <strong>{discordCount}</strong>
          <small>Aprovações e rejeições</small>
        </Card>
      </section>

      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <label className={styles.searchField}>
            <span>Pesquisar</span>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Usuário, módulo, ação ou alvo"
            />
          </label>

          <Select
            label="Módulo"
            value={moduleFilter}
            options={[
              { value: "todos", label: "Todos" },
              { value: "officers", label: "Efetivo" },
              {
                value: "weekly_entries",
                label: "Lançamentos"
              },
              {
                value: "discord_records",
                label: "Discord"
              },
              {
                value: "gam_members",
                label: "Acessos"
              },
              {
                value: "monthly_closures",
                label: "Fechamento"
              }
            ]}
            onChange={(event) =>
              setModuleFilter(
                event.target.value as ModuleFilter
              )
            }
          />

          <Select
            label="Ação"
            value={actionFilter}
            options={[
              { value: "todas", label: "Todas" },
              { value: "INSERT", label: "Criações" },
              { value: "UPDATE", label: "Alterações" },
              { value: "DELETE", label: "Exclusões" }
            ]}
            onChange={(event) =>
              setActionFilter(
                event.target.value as ActionFilter
              )
            }
          />

          <Select
            label="Responsável"
            value={actorFilter}
            options={[
              { value: "todos", label: "Todos" },
              ...members.map((member) => ({
                value: member.userId,
                label:
                  member.displayName ||
                  member.email
              }))
            ]}
            onChange={(event) =>
              setActorFilter(event.target.value)
            }
          />
        </div>
      </Card>

      <Card className={styles.historyCard}>
        <div className={styles.historyHeader}>
          <div>
            <span>Histórico completo</span>
            <h3>Eventos registrados</h3>
            <small>
              {filteredLogs.length} de {logs.length} evento(s)
            </small>
          </div>

          <Badge tone="blue" size="sm">
            Auditoria ativa
          </Badge>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            title="Nenhum evento encontrado"
            description="Ajuste os filtros ou aguarde novas ações no sistema."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Responsável</th>
                  <th>Ação</th>
                  <th>Módulo</th>
                  <th>Alvo</th>
                  <th>Resumo</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => {
                  const actor = members.find(
                    (member) =>
                      member.userId === log.actorUserId
                  );

                  return (
                    <tr key={log.id}>
                      <td>{formatDate(log.createdAt)}</td>

                      <td>
                        <strong>
                          {actor?.displayName ??
                            "Sistema / usuário removido"}
                        </strong>
                        <small>
                          {actor?.email ?? "—"}
                        </small>
                      </td>

                      <td>
                        <Badge
                          tone={actionTone(log)}
                          size="sm"
                        >
                          {actionLabel(log)}
                        </Badge>
                      </td>

                      <td>
                        <Badge tone="blue" size="sm">
                          {moduleLabel(log.entity)}
                        </Badge>
                      </td>

                      <td>
                        <strong>
                          {targetLabel(log, officers)}
                        </strong>
                      </td>

                      <td>{summary(log)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default AuditModule;
