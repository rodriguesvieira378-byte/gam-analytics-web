"use client";

import type { GamMember } from "@/lib/types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import styles from "../AdminModule.module.css";

export interface RequestCardProps {
  member: GamMember;
  onApprove: (member: GamMember) => void;
  onReject: (member: GamMember) => void;
}

const DATE_TIME_FORMATTER =
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });

function getStatusTone(
  status: GamMember["approvalStatus"]
) {
  if (status === "Aprovado") {
    return "green";
  }

  if (status === "Rejeitado") {
    return "red";
  }

  return "yellow";
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Data não informada";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : DATE_TIME_FORMATTER.format(date);
}

export function RequestCard({
  member,
  onApprove,
  onReject
}: RequestCardProps) {
  const displayName =
    member.displayName?.trim() ||
    "Usuário sem nome";

  const email =
    member.email?.trim() ||
    "E-mail não informado";

  const isPending =
    member.approvalStatus === "Pendente";

  const isApproved =
    member.approvalStatus === "Aprovado";

  const isRejected =
    member.approvalStatus === "Rejeitado";

  return (
    <article className={styles.requestCard}>
      <div className={styles.requestIdentity}>
        <div>
          <strong>{displayName}</strong>
          <small>{email}</small>
        </div>

        <Badge
          tone={getStatusTone(
            member.approvalStatus
          )}
          size="sm"
        >
          {member.approvalStatus}
        </Badge>
      </div>

      <div className={styles.requestMeta}>
        <div>
          <span>Solicitado em</span>
          <strong>
            {formatDate(member.requestedAt)}
          </strong>
        </div>

        <div>
          <span>Permissão atual</span>
          <strong>{member.role}</strong>
        </div>

        {isApproved ? (
          <div>
            <span>Aprovado em</span>
            <strong>
              {formatDate(member.approvedAt)}
            </strong>
          </div>
        ) : null}

        {isRejected ? (
          <div>
            <span>Motivo</span>
            <strong>
              {member.rejectionReason?.trim() ||
                "Não informado"}
            </strong>
          </div>
        ) : null}
      </div>

      {isPending ? (
        <div className={styles.requestActions}>
          <Button
            size="sm"
            onClick={() => onApprove(member)}
          >
            Aprovar
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => onReject(member)}
          >
            Rejeitar
          </Button>
        </div>
      ) : null}
    </article>
  );
}
