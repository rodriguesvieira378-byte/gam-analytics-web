"use client";

import type { DiscordRecord, Officer } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

import styles from "./FeedPanel.module.css";

export interface FeedPanelProps {
  records: DiscordRecord[];
  officers: Officer[];
}

function statusTone(status: DiscordRecord["status"]) {
  if (status === "Aprovado") return "green";
  if (status === "Rejeitado") return "red";
  return "yellow";
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function FeedPanel({
  records,
  officers
}: FeedPanelProps) {
  const latestRecords = [...records]
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(
        String(a.createdAt ?? "")
      )
    )
    .slice(0, 6);

  return (
    <Panel
      eyebrow="Feed operacional"
      title="Operações recentes"
      description={`${records.length} registro(s) no período`}
      compact
      footer="Atualizado automaticamente pelo GAM Sync"
    >
      {latestRecords.length === 0 ? (
        <EmptyState
          compact
          title="Nenhuma operação sincronizada"
          description="Os registros aprovados e pendentes aparecerão aqui."
        />
      ) : (
        <div className={styles.feed}>
          {latestRecords.map((record) => {
            const officer = officers.find(
              (item) => item.id === record.officerId
            );

            return (
              <article
                className={styles.item}
                key={record.id}
              >
                <time>
                  {formatTime(record.createdAt)}
                </time>

                <span
                  className={[
                    styles.marker,
                    record.status === "Aprovado"
                      ? styles.approved
                      : record.status === "Rejeitado"
                        ? styles.rejected
                        : styles.pending
                  ].join(" ")}
                />

                <div className={styles.content}>
                  <div className={styles.title}>
                    <strong>{record.activityType}</strong>

                    <Badge
                      tone={statusTone(record.status)}
                      size="sm"
                    >
                      {record.status}
                    </Badge>
                  </div>

                  <small>
                    {officer?.name ?? "Integrante"} • Quantidade{" "}
                    {record.quantity}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export default FeedPanel;
