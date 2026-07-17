"use client";

import { useEffect, useState } from "react";
import type {
  AppRole,
  GamMember
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

import styles from "../AdminModule.module.css";

interface ApproveRequestDialogProps {
  member: GamMember | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (
    member: GamMember,
    role: AppRole
  ) => Promise<void> | void;
}

export function ApproveRequestDialog({
  member,
  loading,
  onClose,
  onConfirm
}: ApproveRequestDialogProps) {
  const [role, setRole] =
    useState<AppRole>("Consulta");

  useEffect(() => {
    if (member) {
      setRole("Consulta");
    }
  }, [member]);

  if (!member) return null;

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !loading) {
          onClose();
        }
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-request-title"
      >
        <div className={styles.dialogHeader}>
          <span>Aprovação administrativa</span>
          <h3 id="approve-request-title">
            Aprovar solicitação
          </h3>
          <p>
            Defina o nível de acesso de{" "}
            <strong>{member.displayName}</strong>.
          </p>
        </div>

        <Select
          label="Permissão"
          value={role}
          options={[
            {
              value: "Consulta",
              label: "Consulta"
            },
            {
              value: "Supervisor",
              label: "Supervisor"
            },
            {
              value: "Administrador",
              label: "Administrador"
            }
          ]}
          onChange={(event) =>
            setRole(event.target.value as AppRole)
          }
        />

        <div className={styles.dialogActions}>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            loading={loading}
            onClick={() => onConfirm(member, role)}
          >
            Confirmar aprovação
          </Button>
        </div>
      </section>
    </div>
  );
}
