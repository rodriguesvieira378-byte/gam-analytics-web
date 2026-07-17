"use client";

import { useEffect, useState } from "react";
import type { GamMember } from "@/lib/types";
import { Button } from "@/components/ui/Button";

import styles from "../AdminModule.module.css";

interface RejectRequestDialogProps {
  member: GamMember | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (
    member: GamMember,
    reason: string
  ) => Promise<void> | void;
}

export function RejectRequestDialog({
  member,
  loading,
  onClose,
  onConfirm
}: RejectRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setReason("");
    setError("");
  }, [member]);

  if (!member) return null;

  function submit() {
    if (!member) return;

    const normalized = reason.trim();

    if (normalized.length < 3) {
      setError("Informe o motivo da rejeição.");
      return;
    }

    onConfirm(member, normalized);
  }

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.currentTarget === event.target &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-request-title"
      >
        <div className={styles.dialogHeader}>
          <span>Controle de entrada</span>

          <h3 id="reject-request-title">
            Rejeitar solicitação
          </h3>

          <p>
            Informe por que o acesso de{" "}
            <strong>{member.displayName}</strong>{" "}
            não será liberado.
          </p>
        </div>

        <label className={styles.dialogField}>
          <span>Motivo da rejeição</span>

          <textarea
            value={reason}
            maxLength={500}
            placeholder="Ex.: integrante não localizado na unidade."
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
          />
        </label>

        {error && (
          <div className={styles.dialogError}>
            {error}
          </div>
        )}

        <div className={styles.dialogActions}>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            variant="danger"
            loading={loading}
            onClick={submit}
          >
            Confirmar rejeição
          </Button>
        </div>
      </section>
    </div>
  );
}
