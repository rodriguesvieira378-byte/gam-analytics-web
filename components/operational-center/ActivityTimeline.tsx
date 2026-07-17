"use client";

import type { DiscordRecord, Officer } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

import styles from "./ActivityTimeline.module.css";

export interface ActivityTimelineProps {
  records: DiscordRecord[];
  officers: Officer[];
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

export function ActivityTimeline({
  records,
  officers
}: ActivityTimelineProps) {
  const timeline = [...records]
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(
        String(a.createdAt ?? "")
      )
    )
    .slice(0, 5);

  return (
    <Panel
      eyebrow="Linha do tempo"
      title="Atividade recente"
      description="Movimentações do período"
      compact
    >
      {timeline.length === 0 ? (
        <EmptyState
          compact
          title="Sem movimentações"
          description="Novos registros aparecerão nesta linha do tempo."
        />
      ) : (
        <div className={styles.timeline}>
          {timeline.map((record) => {
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

                <span className={styles.line}>
                  <i />
                </span>

                <div>
                  <strong>
                    {record.activityType}
                  </strong>
                  <small>
                    {officer?.name ?? "Integrante"} •{" "}
                    {record.status}
                  </small>
                </div>

                <b>+{record.quantity}</b>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export default ActivityTimeline;
