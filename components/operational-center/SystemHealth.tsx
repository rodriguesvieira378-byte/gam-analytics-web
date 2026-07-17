"use client";

import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { StatusDot } from "@/components/ui/StatusDot";

import styles from "./SystemHealth.module.css";

export interface SystemHealthProps {
  pendingCount: number;
  rejectedCount: number;
  latestSyncLabel: string;
}

export function SystemHealth({
  pendingCount,
  rejectedCount,
  latestSyncLabel
}: SystemHealthProps) {
  const services = [
    {
      label: "Supabase",
      detail: "Banco conectado",
      status: "online" as const
    },
    {
      label: "GAM Sync",
      detail: `Última sync ${latestSyncLabel}`,
      status: "online" as const
    },
    {
      label: "Parser",
      detail: "Leitura operacional",
      status: "online" as const
    },
    {
      label: "Discord Bot",
      detail: "Em desenvolvimento",
      status: "development" as const
    }
  ];

  const attentionTotal =
    pendingCount + rejectedCount;

  return (
    <Panel
      eyebrow="Infraestrutura"
      title="Saúde do sistema"
      description="Status dos serviços"
      compact
      action={
        <Badge
          tone={attentionTotal > 0 ? "yellow" : "green"}
          size="sm"
        >
          {attentionTotal > 0
            ? `${attentionTotal} alerta(s)`
            : "Operacional"}
        </Badge>
      }
    >
      <div className={styles.services}>
        {services.map((service) => (
          <article
            className={styles.item}
            key={service.label}
          >
            <StatusDot
              status={service.status}
              size="sm"
            />

            <div>
              <strong>{service.label}</strong>
              <small>{service.detail}</small>
            </div>

            <Badge
              tone={
                service.status === "online"
                  ? "green"
                  : "blue"
              }
              size="sm"
            >
              {service.status === "online"
                ? "Online"
                : "Dev"}
            </Badge>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export default SystemHealth;
