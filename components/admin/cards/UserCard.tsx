import type {
  AppRole,
  GamMember
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

import styles from "../AdminModule.module.css";

interface UserCardProps {
  member: GamMember;
  onRoleChange: (
    member: GamMember,
    role: AppRole
  ) => Promise<void> | void;
  onToggle: (
    member: GamMember
  ) => Promise<void> | void;
}

function roleTone(role: AppRole) {
  if (role === "Administrador") return "green";
  if (role === "Supervisor") return "yellow";
  return "blue";
}

export function UserCard({
  member,
  onRoleChange,
  onToggle
}: UserCardProps) {
  return (
    <article
      className={styles.member}
      key={member.userId}
    >
      <div className={styles.identity}>
        <strong>
          {member.displayName || "Usuário sem nome"}
        </strong>
        <small>{member.email}</small>
      </div>

      <Select
        aria-label={`Permissão de ${member.displayName}`}
        value={member.role}
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
          onRoleChange(
            member,
            event.target.value as AppRole
          )
        }
      />

      <Badge
        tone={roleTone(member.role)}
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
