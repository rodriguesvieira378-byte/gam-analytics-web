"use client";

import { useMemo } from "react";

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

function statusClass(status: DiscordRecord["status"]) {
  if (status === "Aprovado") return styles.approved;
  if (status === "Rejeitado") return styles.rejected;
  return styles.pending;
}

function parseDate(value?: string | null) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatTime(value?: string | null) {
  const timestamp = parseDate(value);

  if (timestamp === 0) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(timestamp);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR").format(
    Number.isFinite(value) ? value : 0
  );
}

export function FeedPanel({
  records,
  officers
}: FeedPanelProps) {
  const officersById = useMemo(
    () =>
      new Map(
        officers.map((officer) => [
          officer.id,
          officer
        ])
      ),
    [officers]
  );

  const latestRecords = useMemo(
    () =>
      [...records]
        .sort(
          (first, second) =>
            parseDate(second.createdAt) -
            parseDate(first.createdAt)
        )
        .slice(0, 6),
    [records]
  );

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
        <div
          className={styles.feed}
          aria-label="Operações recentes da G.A.M."
        >
          {latestRecords.map((record) => {
            const officer = officersById.get(
              record.officerId
            );

            const validCreatedAt =
              parseDate(record.createdAt) > 0;

            return (
              <article
                className={styles.item}
                key={record.id}
              >
                <time
                  dateTime={
                    validCreatedAt
                      ? record.createdAt ?? undefined
                      : undefined
                  }
                  title={
                    validCreatedAt
                      ? new Date(
                          record.createdAt as string
                        ).toLocaleString("pt-BR")
                      : undefined
                  }
                >
                  {formatTime(record.createdAt)}
                </time>

                <span
                  className={[
                    styles.marker,
                    statusClass(record.status)
                  ].join(" ")}
                  aria-hidden="true"
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
                    {officer?.name ?? "Integrante não identificado"}
                    {" • "}
                    Quantidade {formatQuantity(record.quantity)}
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
