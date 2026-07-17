"use client";

import {
  useMemo,
  useState
} from "react";
import type {
  AppRole,
  GamMember
} from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";

import { RequestCard } from "../cards/RequestCard";
import { ApproveRequestDialog } from "../dialogs/ApproveRequestDialog";
import { RejectRequestDialog } from "../dialogs/RejectRequestDialog";

import styles from "../AdminModule.module.css";

type RequestFilter =
  | "todas"
  | "Pendente"
  | "Aprovado"
  | "Rejeitado";

interface RequestsTabProps {
  members: GamMember[];
  onApprove: (
    userId: string,
    role: AppRole
  ) => Promise<void> | void;
  onReject: (
    userId: string,
    reason: string
  ) => Promise<void> | void;
}

export function RequestsTab({
  members,
  onApprove,
  onReject
}: RequestsTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<RequestFilter>("Pendente");
  const [approving, setApproving] =
    useState<GamMember | null>(null);
  const [rejecting, setRejecting] =
    useState<GamMember | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => ({
    pending: members.filter(
      (member) => member.approvalStatus === "Pendente"
    ).length,
    approved: members.filter(
      (member) => member.approvalStatus === "Aprovado"
    ).length,
    rejected: members.filter(
      (member) => member.approvalStatus === "Rejeitado"
    ).length
  }), [members]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return members
      .filter((member) => {
        const matchesStatus =
          filter === "todas" ||
          member.approvalStatus === filter;

        const matchesSearch =
          !term ||
          member.displayName.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) =>
        String(b.requestedAt ?? b.createdAt ?? "")
          .localeCompare(
            String(a.requestedAt ?? a.createdAt ?? "")
          )
      );
  }, [filter, members, search]);

  async function approve(
    member: GamMember,
    role: AppRole
  ) {
    setSaving(true);

    try {
      await onApprove(member.userId, role);
      setApproving(null);
    } finally {
      setSaving(false);
    }
  }

  async function reject(
    member: GamMember,
    reason: string
  ) {
    setSaving(true);

    try {
      await onReject(member.userId, reason);
      setRejecting(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className={styles.requestsPage}>
        <div className={styles.requestSummary}>
          <Card tone="yellow" className={styles.requestSummaryCard}>
            <span>Pendentes</span>
            <strong>{counts.pending}</strong>
            <small>Aguardando análise</small>
          </Card>

          <Card tone="green" className={styles.requestSummaryCard}>
            <span>Aprovadas</span>
            <strong>{counts.approved}</strong>
            <small>Acessos liberados</small>
          </Card>

          <Card
            tone={counts.rejected > 0 ? "red" : "green"}
            className={styles.requestSummaryCard}
          >
            <span>Rejeitadas</span>
            <strong>{counts.rejected}</strong>
            <small>Acessos recusados</small>
          </Card>
        </div>

        <Card className={styles.listCard}>
          <div className={styles.cardHeader}>
            <span>Controle de entrada</span>
            <h3>Solicitações de acesso</h3>
            <p>
              {filtered.length} solicitação(ões) exibida(s)
            </p>
          </div>

          <div className={styles.requestFilters}>
            <label className={styles.searchField}>
              <span>Pesquisar</span>
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Nome ou e-mail"
              />
            </label>

            <Select
              label="Status"
              value={filter}
              options={[
                {
                  value: "todas",
                  label: "Todas"
                },
                {
                  value: "Pendente",
                  label: "Pendentes"
                },
                {
                  value: "Aprovado",
                  label: "Aprovadas"
                },
                {
                  value: "Rejeitado",
                  label: "Rejeitadas"
                }
              ]}
              onChange={(event) =>
                setFilter(
                  event.target.value as RequestFilter
                )
              }
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma solicitação encontrada"
              description="Ajuste os filtros ou aguarde uma nova solicitação de acesso."
            />
          ) : (
            <div className={styles.requestList}>
              {filtered.map((member) => (
                <RequestCard
                  key={member.userId}
                  member={member}
                  onApprove={setApproving}
                  onReject={setRejecting}
                />
              ))}
            </div>
          )}
        </Card>
      </section>

      <ApproveRequestDialog
        member={approving}
        loading={saving}
        onClose={() => setApproving(null)}
        onConfirm={approve}
      />

      <RejectRequestDialog
        member={rejecting}
        loading={saving}
        onClose={() => setRejecting(null)}
        onConfirm={reject}
      />
    </>
  );
}
