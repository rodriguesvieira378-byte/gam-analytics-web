"use client";

import {
  useEffect,
  useState
} from "react";

import type { GamMember } from "@/lib/types";

import { Button } from "@/components/ui/Button";

import styles from "../AdminModule.module.css";

export interface RejectRequestDialogProps {
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

  useEffect(() => {
    if (!member) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [loading, member, onClose]);

  if (!member) {
    return null;
  }

  const selectedMember: GamMember = member;

  const displayName =
    selectedMember.displayName?.trim() ||
    "Usuário sem nome";

  async function handleSubmit() {
    if (loading) {
      return;
    }

    const normalizedReason = reason.trim();

    if (normalizedReason.length < 3) {
      setError(
        "Informe o motivo da rejeição."
      );
      return;
    }

    setError("");

    await onConfirm(
      selectedMember,
      normalizedReason
    );
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
        aria-describedby="reject-request-description"
      >
        <div className={styles.dialogHeader}>
          <span>Controle de entrada</span>

          <h3 id="reject-request-title">
            Rejeitar solicitação
          </h3>

          <p id="reject-request-description">
            Informe por que o acesso de{" "}
            <strong>{displayName}</strong>{" "}
            não será liberado.
          </p>
        </div>

        <label className={styles.dialogField}>
          <span>Motivo da rejeição</span>

          <textarea
            autoFocus
            value={reason}
            maxLength={500}
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? "reject-request-error"
                : undefined
            }
            placeholder="Ex.: integrante não localizado na unidade."
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
          />
        </label>

        {error ? (
          <div
            id="reject-request-error"
            className={styles.dialogError}
            role="alert"
          >
            {error}
          </div>
        ) : null}

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
            disabled={loading}
            onClick={handleSubmit}
          >
            Confirmar rejeição
          </Button>
        </div>
      </section>
    </div>
  );
}
