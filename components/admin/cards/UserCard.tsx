import type {
  AppRole,
  GamMember
} from "@/lib/types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

import styles from "../AdminModule.module.css";

export interface UserCardProps {
  member: GamMember;
  onRoleChange: (
    member: GamMember,
    role: AppRole
  ) => Promise<void> | void;
  onToggle: (
    member: GamMember
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

function getRoleTone(role: AppRole) {
  if (role === "Administrador") {
    return "green";
  }

  if (role === "Supervisor") {
    return "yellow";
  }

  return "blue";
}

export function UserCard({
  member,
  onRoleChange,
  onToggle
}: UserCardProps) {
  const displayName =
    member.displayName?.trim() ||
    "Usuário sem nome";

  const email =
    member.email?.trim() ||
    "E-mail não informado";

  return (
    <article className={styles.member}>
      <div className={styles.identity}>
        <strong>{displayName}</strong>
        <small>{email}</small>
      </div>

      <Select
        aria-label={`Permissão de ${displayName}`}
        value={member.role}
        options={ROLE_OPTIONS}
        onChange={(event) =>
          onRoleChange(
            member,
            event.target.value as AppRole
          )
        }
      />

      <Badge
        tone={getRoleTone(member.role)}
        size="sm"
      >
        {member.role}
      </Badge>

      <Button
        variant={
          member.active
            ? "danger"
            : "secondary"
        }
        size="sm"
        onClick={() => onToggle(member)}
      >
        {member.active
          ? "Desativar"
          : "Reativar"}
      </Button>
    </article>
  );
}
