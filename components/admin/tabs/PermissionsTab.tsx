import type { AppRole } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

import styles from "../AdminModule.module.css";

const PERMISSIONS = [
  {
    role: "Administrador" as AppRole,
    tone: "green" as const,
    description:
      "Acesso total ao sistema, usuários, auditoria, fechamento e configurações.",
    items: [
      "Gerenciar usuários",
      "Editar efetivo",
      "Analisar registros",
      "Fechar mês",
      "Exportar e gerar backup"
    ]
  },
  {
    role: "Supervisor" as AppRole,
    tone: "yellow" as const,
    description:
      "Gestão operacional do efetivo e análise dos registros.",
    items: [
      "Editar efetivo",
      "Registrar atividades",
      "Analisar Discord",
      "Consultar auditoria",
      "Gerar relatórios"
    ]
  },
  {
    role: "Consulta" as AppRole,
    tone: "blue" as const,
    description:
      "Visualização dos módulos liberados sem poder alterar dados.",
    items: [
      "Consultar dashboard",
      "Ver desempenho",
      "Acessar relatórios",
      "Sem alteração de dados"
    ]
  }
];

export function PermissionsTab() {
  return (
    <section className={styles.permissions}>
      {PERMISSIONS.map((permission) => (
        <Card
          key={permission.role}
          tone={permission.tone}
          className={styles.permissionCard}
        >
          <Badge
            tone={permission.tone}
            size="sm"
          >
            {permission.role}
          </Badge>

          <h3>{permission.role}</h3>
          <p>{permission.description}</p>

          <ul>
            {permission.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ))}
    </section>
  );
}
