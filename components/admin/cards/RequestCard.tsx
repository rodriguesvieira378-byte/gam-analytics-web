"use client";

import type { GamMember } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import styles from "../AdminModule.module.css";

interface RequestCardProps {
  member: GamMember;
  onApprove: (member: GamMember) => void;
  onReject: (member: GamMember) => void;
}

function statusTone(status: GamMember["approvalStatus"]) {
  if (status === "Aprovado") return "green";
  if (status === "Rejeitado") return "red";
  return "yellow";
}

function formatDate(value?: string | null) {
  if (!value) return "Data não informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function RequestCard({
  member,
  onApprove,
  onReject
}: RequestCardProps) {
  const pending = member.approvalStatus === "Pendente";

  return (
    <article className={styles.requestCard}>
      <div className={styles.requestIdentity}>
        <div>
          <strong>
            {member.displayName || "Usuário sem nome"}
          </strong>
          <small>{member.email}</small>
        </div>

        <Badge
          tone={statusTone(member.approvalStatus)}
          size="sm"
        >
          {member.approvalStatus}
        </Badge>
      </div>

      <div className={styles.requestMeta}>
        <div>
          <span>Solicitado em</span>
          <strong>{formatDate(member.requestedAt)}</strong>
        </div>

        <div>
          <span>Permissão atual</span>
          <strong>{member.role}</strong>
        </div>

        {member.approvalStatus === "Aprovado" && (
          <div>
            <span>Aprovado em</span>
            <strong>{formatDate(member.approvedAt)}</strong>
          </div>
        )}

        {member.approvalStatus === "Rejeitado" && (
          <div>
            <span>Motivo</span>
            <strong>
              {member.rejectionReason || "Não informado"}
            </strong>
          </div>
        )}
      </div>

      {pending && (
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
      )}
    </article>
  );
}
