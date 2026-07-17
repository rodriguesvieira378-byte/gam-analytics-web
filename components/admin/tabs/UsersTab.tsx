"use client";

import {
  useMemo,
  useState
} from "react";
import type {
  AppRole,
  GamMember
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";

import { UserCard } from "../cards/UserCard";

import styles from "../AdminModule.module.css";

interface UsersTabProps {
  members: GamMember[];
  onAddMember: (input: {
    email: string;
    displayName: string;
    role: AppRole;
  }) => Promise<void> | void;
  onUpdateMember: (
    member: GamMember
  ) => Promise<void> | void;
}

export function UsersTab({
  members,
  onAddMember,
  onUpdateMember
}: UsersTabProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<"todos" | AppRole>("todos");
  const [statusFilter, setStatusFilter] =
    useState<"todos" | "ativos" | "inativos">("todos");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] =
    useState<AppRole>("Consulta");
  const [saving, setSaving] = useState(false);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return members
      .filter((member) => {
        const matchesSearch =
          !term ||
          member.displayName.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term);

        const matchesRole =
          roleFilter === "todos" ||
          member.role === roleFilter;

        const matchesStatus =
          statusFilter === "todos" ||
          (statusFilter === "ativos" && member.active) ||
          (statusFilter === "inativos" && !member.active);

        return (
          matchesSearch &&
          matchesRole &&
          matchesStatus
        );
      })
      .sort((a, b) =>
        a.displayName.localeCompare(
          b.displayName,
          "pt-BR"
        )
      );
  }, [
    members,
    roleFilter,
    search,
    statusFilter
  ]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) return;

    setSaving(true);

    try {
      await onAddMember({
        email: normalizedEmail,
        displayName: displayName.trim(),
        role
      });

      setEmail("");
      setDisplayName("");
      setRole("Consulta");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMember(
    member: GamMember
  ) {
    await onUpdateMember({
      ...member,
      active: !member.active
    });
  }

  async function changeMemberRole(
    member: GamMember,
    nextRole: AppRole
  ) {
    await onUpdateMember({
      ...member,
      role: nextRole
    });
  }

  return (
    <section className={styles.usersGrid}>
      <Card className={styles.formCard}>
        <div className={styles.cardHeader}>
          <span>Novo acesso</span>
          <h3>Vincular usuário</h3>
          <p>
            Adicione um usuário autorizado ao GAM Analytics.
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <label>
            <span>Nome exibido</span>
            <input
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              placeholder="Ex.: Cássio Vieira"
            />
          </label>

          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="usuario@email.com"
              required
            />
          </label>

          <Select
            label="Nível de acesso"
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
              setRole(
                event.target.value as AppRole
              )
            }
          />

          <Button
            type="submit"
            loading={saving}
            fullWidth
          >
            Vincular usuário
          </Button>
        </form>
      </Card>

      <Card className={styles.listCard}>
        <div className={styles.cardHeader}>
          <span>Controle de acesso</span>
          <h3>Usuários vinculados</h3>
          <p>
            {filteredMembers.length} de {members.length} usuário(s)
          </p>
        </div>

        <div className={styles.filters}>
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
            label="Permissão"
            value={roleFilter}
            options={[
              {
                value: "todos",
                label: "Todas"
              },
              {
                value: "Administrador",
                label: "Administrador"
              },
              {
                value: "Supervisor",
                label: "Supervisor"
              },
              {
                value: "Consulta",
                label: "Consulta"
              }
            ]}
            onChange={(event) =>
              setRoleFilter(
                event.target.value as
                  | "todos"
                  | AppRole
              )
            }
          />

          <Select
            label="Status"
            value={statusFilter}
            options={[
              {
                value: "todos",
                label: "Todos"
              },
              {
                value: "ativos",
                label: "Ativos"
              },
              {
                value: "inativos",
                label: "Inativos"
              }
            ]}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "todos"
                  | "ativos"
                  | "inativos"
              )
            }
          />
        </div>

        {filteredMembers.length === 0 ? (
          <EmptyState
            compact
            title="Nenhum usuário encontrado"
            description="Ajuste os filtros ou adicione um novo acesso."
          />
        ) : (
          <div className={styles.memberList}>
            {filteredMembers.map((member) => (
              <UserCard
                key={member.userId}
                member={member}
                onRoleChange={changeMemberRole}
                onToggle={toggleMember}
              />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
