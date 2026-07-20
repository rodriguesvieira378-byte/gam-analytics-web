"use client";

import {
  useEffect,
  useState
} from "react";

import type {
  AppRole,
  GamMember
} from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

import styles from "../AdminModule.module.css";

export interface ApproveRequestDialogProps {
  member: GamMember | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (
    member: GamMember,
    role: AppRole
  ) => Promise<void> | void;
}

const ROLE_OPTIONS = [
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
] satisfies Array<{
  value: AppRole;
  label: string;
}>;

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

  async function handleConfirm() {
    if (loading) {
      return;
    }

    await onConfirm(
      selectedMember,
      role
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
        aria-labelledby="approve-request-title"
        aria-describedby="approve-request-description"
      >
        <div className={styles.dialogHeader}>
          <span>
            Aprovação administrativa
          </span>

          <h3 id="approve-request-title">
            Aprovar solicitação
          </h3>

          <p id="approve-request-description">
            Defina o nível de acesso de{" "}
            <strong>{displayName}</strong>.
          </p>
        </div>

        <Select
          label="Permissão"
          value={role}
          disabled={loading}
          options={ROLE_OPTIONS}
          onChange={(event) =>
            setRole(
              event.target.value as AppRole
            )
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
            disabled={loading}
            onClick={handleConfirm}
          >
            Confirmar aprovação
          </Button>
        </div>
      </section>
    </div>
  );
}
