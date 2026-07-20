"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { StatusDot } from "@/components/ui/StatusDot";

import styles from "./SystemHealth.module.css";

export interface SystemHealthProps {
  pendingCount: number;
  rejectedCount: number;
  latestSyncLabel: string;
}

type SystemLevel =
  | "Operacional"
  | "Atenção necessária"
  | "Intervenção recomendada";

type ServiceStatus =
  | "online"
  | "attention"
  | "development";

interface SystemService {
  label: string;
  detail: string;
  status: ServiceStatus;
  badge: string;
}

function sanitizeCount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function sanitizeSyncLabel(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0
    ? normalizedValue
    : "não informada";
}

function calculateHealthScore(
  pendingCount: number,
  rejectedCount: number
) {
  const pendingPenalty =
    Math.min(pendingCount * 3, 30);

  const rejectedPenalty =
    Math.min(rejectedCount * 8, 48);

  return Math.max(
    0,
    Math.min(
      100,
      100 - pendingPenalty - rejectedPenalty
    )
  );
}

function getSystemLevel(
  pendingCount: number,
  rejectedCount: number
): SystemLevel {
  if (
    rejectedCount >= 3 ||
    pendingCount >= 8
  ) {
    return "Intervenção recomendada";
  }

  if (
    rejectedCount > 0 ||
    pendingCount > 0
  ) {
    return "Atenção necessária";
  }

  return "Operacional";
}

function getSystemTone(
  level: SystemLevel
): "green" | "yellow" | "red" {
  if (level === "Operacional") {
    return "green";
  }

  if (level === "Atenção necessária") {
    return "yellow";
  }

  return "red";
}

function getServiceTone(
  status: ServiceStatus
): "green" | "yellow" | "blue" {
  if (status === "online") {
    return "green";
  }

  if (status === "attention") {
    return "yellow";
  }

  return "blue";
}

function getStatusDotValue(
  status: ServiceStatus
): "online" | "development" {
  return status === "online"
    ? "online"
    : "development";
}

function getOperationalReading(
  pendingCount: number,
  rejectedCount: number
) {
  if (
    pendingCount === 0 &&
    rejectedCount === 0
  ) {
    return "Nenhuma inconsistência foi identificada. A infraestrutura do GAM Analytics está pronta para operação.";
  }

  if (
    pendingCount > 0 &&
    rejectedCount === 0
  ) {
    return `${pendingCount} registro(s) da G.A.M. aguardam validação da supervisão.`;
  }

  if (
    pendingCount === 0 &&
    rejectedCount > 0
  ) {
    return `${rejectedCount} registro(s) rejeitado(s) precisam ser revisados antes da consolidação dos dados.`;
  }

  return `${pendingCount} registro(s) aguardam validação e ${rejectedCount} registro(s) rejeitado(s) precisam de revisão.`;
}

export function SystemHealth({
  pendingCount,
  rejectedCount,
  latestSyncLabel
}: SystemHealthProps) {
  const intelligence = useMemo(() => {
    const safePendingCount =
      sanitizeCount(pendingCount);

    const safeRejectedCount =
      sanitizeCount(rejectedCount);

    const safeLatestSyncLabel =
      sanitizeSyncLabel(latestSyncLabel);

    const attentionTotal =
      safePendingCount + safeRejectedCount;

    const healthScore =
      calculateHealthScore(
        safePendingCount,
        safeRejectedCount
      );

    const systemLevel =
      getSystemLevel(
        safePendingCount,
        safeRejectedCount
      );

    const systemTone =
      getSystemTone(systemLevel);

    const operationalReading =
      getOperationalReading(
        safePendingCount,
        safeRejectedCount
      );

    const services: SystemService[] = [
      {
        label: "Supabase",
        detail:
          "Banco de dados da G.A.M. conectado",
        status: "online",
        badge: "Online"
      },
      {
        label: "GAM Sync",
        detail: `Última sincronização ${safeLatestSyncLabel}`,
        status:
          safeRejectedCount > 0
            ? "attention"
            : "online",
        badge:
          safeRejectedCount > 0
            ? "Revisar"
            : "Ativo"
      },
      {
        label: "Parser operacional",
        detail:
          safePendingCount > 0
            ? `${safePendingCount} registro(s) aguardando validação`
            : "Leitura de prisões e acompanhamentos",
        status:
          safePendingCount > 0
            ? "attention"
            : "online",
        badge:
          safePendingCount > 0
            ? "Pendente"
            : "Online"
      },
      {
        label: "Discord G.A.M.",
        detail:
          "Integração automática em desenvolvimento",
        status: "development",
        badge: "Dev"
      }
    ];

    return {
      pendingCount: safePendingCount,
      rejectedCount: safeRejectedCount,
      attentionTotal,
      healthScore,
      systemLevel,
      systemTone,
      operationalReading,
      services
    };
  }, [
    latestSyncLabel,
    pendingCount,
    rejectedCount
  ]);

  return (
    <Panel
      eyebrow="Infraestrutura G.A.M."
      title="Saúde do sistema"
      description="Monitoramento do GAM Analytics"
      compact
      action={
        <Badge
          tone={intelligence.systemTone}
          size="sm"
        >
          {intelligence.systemLevel}
        </Badge>
      }
    >
      <div
        className={styles.overview}
        aria-label="Resumo da saúde operacional"
      >
        <div className={styles.healthScore}>
          <span className={styles.healthScoreLabel}>
            System Health
          </span>

          <strong
            className={styles.healthScoreValue}
            aria-label={`${intelligence.healthScore}% de saúde operacional`}
          >
            {intelligence.healthScore}%
          </strong>

          <small className={styles.healthScoreDetail}>
            Saúde operacional da G.A.M.
          </small>
        </div>

        <div className={styles.alertSummary}>
          <div className={styles.alertMetric}>
            <span>Pendentes</span>
            <strong>
              {intelligence.pendingCount}
            </strong>
          </div>

          <div className={styles.alertMetric}>
            <span>Rejeitados</span>
            <strong>
              {intelligence.rejectedCount}
            </strong>
          </div>

          <div className={styles.alertMetric}>
            <span>Alertas</span>
            <strong>
              {intelligence.attentionTotal}
            </strong>
          </div>
        </div>
      </div>

      <div
        className={styles.operationalReading}
        role="status"
      >
        <strong>
          Leitura operacional
        </strong>

        <p>
          {intelligence.operationalReading}
        </p>
      </div>

      <div
        className={styles.services}
        aria-label="Serviços monitorados"
      >
        {intelligence.services.map(
          (service) => (
            <article
              className={styles.item}
              key={service.label}
            >
              <StatusDot
                status={getStatusDotValue(
                  service.status
                )}
                size="sm"
              />

              <div className={styles.serviceInfo}>
                <strong>{service.label}</strong>
                <small>{service.detail}</small>
              </div>

              <Badge
                tone={getServiceTone(
                  service.status
                )}
                size="sm"
              >
                {service.badge}
              </Badge>
            </article>
          )
        )}
      </div>
    </Panel>
  );
}

export default SystemHealth;
