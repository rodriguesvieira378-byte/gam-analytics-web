"use client";

import { useMemo } from "react";

import type {
  DiscordRecord,
  Officer
} from "@/lib/types";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

import styles from "./ActivityTimeline.module.css";

export interface ActivityTimelineProps {
  records: DiscordRecord[];
  officers: Officer[];
}

type ActivityTone =
  | "blue"
  | "green"
  | "yellow"
  | "red";

interface TimelineRecord {
  record: DiscordRecord;
  officerName: string;
  activityLabel: string;
  statusLabel: string;
  statusTone: ActivityTone;
  activityTone: ActivityTone;
  quantity: number;
  timestamp: number;
}

const DATE_TIME_FORMATTER =
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

const SHORT_DATE_FORMATTER =
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  });

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatTime(value?: string | null) {
  const date = parseDate(value);

  return date
    ? DATE_TIME_FORMATTER.format(date)
    : "—";
}

function formatDate(value?: string | null) {
  const date = parseDate(value);

  if (!date) {
    return "Data indisponível";
  }

  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  const dateKey = date.toDateString();

  if (dateKey === today.toDateString()) {
    return "Hoje";
  }

  if (
    dateKey === yesterday.toDateString()
  ) {
    return "Ontem";
  }

  return SHORT_DATE_FORMATTER
    .format(date)
    .replace(".", "");
}

function normalizeValue(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sanitizeQuantity(value: unknown) {
  const quantity = Number(value);

  return Number.isFinite(quantity)
    ? Math.trunc(quantity)
    : 0;
}

function getActivityLabel(
  activityType?: string | null
) {
  const normalized =
    normalizeValue(activityType);

  if (
    normalized.includes("prisao") ||
    normalized.includes("prison")
  ) {
    return "Prisão";
  }

  if (
    normalized.includes("acompanha") ||
    normalized.includes("pursuit")
  ) {
    return "Acompanhamento";
  }

  if (
    normalized.includes("apreensao") ||
    normalized.includes("seizure")
  ) {
    return "Apreensão";
  }

  if (
    normalized.includes("multa") ||
    normalized.includes("fine")
  ) {
    return "Multa";
  }

  return activityType?.trim() ||
    "Atividade operacional";
}

function getActivityTone(
  activityType?: string | null
): ActivityTone {
  const normalized =
    normalizeValue(activityType);

  if (
    normalized.includes("prisao") ||
    normalized.includes("prison")
  ) {
    return "red";
  }

  if (
    normalized.includes("acompanha") ||
    normalized.includes("pursuit")
  ) {
    return "blue";
  }

  if (
    normalized.includes("apreensao") ||
    normalized.includes("seizure")
  ) {
    return "yellow";
  }

  return "green";
}

function getStatusLabel(
  status?: string | null
) {
  const normalized = normalizeValue(status);

  if (
    normalized === "approved" ||
    normalized === "aprovado" ||
    normalized === "validated" ||
    normalized === "validado"
  ) {
    return "Validado";
  }

  if (
    normalized === "pending" ||
    normalized === "pendente"
  ) {
    return "Pendente";
  }

  if (
    normalized === "rejected" ||
    normalized === "rejeitado"
  ) {
    return "Rejeitado";
  }

  if (
    normalized === "processed" ||
    normalized === "processado"
  ) {
    return "Processado";
  }

  return status?.trim() || "Registrado";
}

function getStatusTone(
  status?: string | null
): ActivityTone {
  const normalized = normalizeValue(status);

  if (
    normalized === "approved" ||
    normalized === "aprovado" ||
    normalized === "validated" ||
    normalized === "validado" ||
    normalized === "processed" ||
    normalized === "processado"
  ) {
    return "green";
  }

  if (
    normalized === "pending" ||
    normalized === "pendente"
  ) {
    return "yellow";
  }

  if (
    normalized === "rejected" ||
    normalized === "rejeitado"
  ) {
    return "red";
  }

  return "blue";
}

function formatQuantity(quantity: number) {
  return quantity > 0
    ? `+${quantity}`
    : String(quantity);
}

function getDotClassName(
  tone: ActivityTone
) {
  const capitalizedTone =
    `${tone.charAt(0).toUpperCase()}${tone.slice(
      1
    )}`;

  return styles[
    `dot${capitalizedTone}` as keyof typeof styles
  ];
}

export function ActivityTimeline({
  records,
  officers
}: ActivityTimelineProps) {
  const officerMap = useMemo(() => {
    return new Map(
      officers.map((officer) => [
        officer.id,
        officer.name?.trim() ||
          "Integrante da G.A.M."
      ])
    );
  }, [officers]);

  const timeline =
    useMemo<TimelineRecord[]>(() => {
      return records
        .map((record) => {
          const date = parseDate(
            record.createdAt
          );

          const quantity =
            sanitizeQuantity(record.quantity);

          return {
            record,
            officerName:
              officerMap.get(
                record.officerId
              ) ?? "Integrante da G.A.M.",
            activityLabel:
              getActivityLabel(
                record.activityType
              ),
            statusLabel:
              getStatusLabel(record.status),
            statusTone:
              getStatusTone(record.status),
            activityTone:
              getActivityTone(
                record.activityType
              ),
            quantity,
            timestamp:
              date?.getTime() ?? 0
          };
        })
        .sort(
          (a, b) =>
            b.timestamp - a.timestamp
        )
        .slice(0, 6);
    }, [records, officerMap]);

  const totalQuantity = useMemo(() => {
    return timeline.reduce(
      (total, item) =>
        total + Math.max(0, item.quantity),
      0
    );
  }, [timeline]);

  const latestRecord = timeline[0];

  return (
    <Panel
      eyebrow="Linha do tempo G.A.M."
      title="Atividade recente"
      description="Últimas movimentações operacionais registradas"
      compact
      action={
        timeline.length > 0 ? (
          <Badge
            tone="blue"
            size="sm"
          >
            {timeline.length} recente(s)
          </Badge>
        ) : undefined
      }
    >
      {timeline.length === 0 ? (
        <EmptyState
          compact
          title="Sem movimentações"
          description="Novos registros de prisões, acompanhamentos e demais atividades da G.A.M. aparecerão aqui."
        />
      ) : (
        <>
          <div
            className={styles.summary}
            aria-label="Resumo das atividades recentes"
          >
            <div className={styles.summaryMetric}>
              <span>Movimentações</span>
              <strong>
                {timeline.length}
              </strong>
            </div>

            <div className={styles.summaryMetric}>
              <span>Quantidade total</span>
              <strong>
                {totalQuantity}
              </strong>
            </div>

            <div className={styles.summaryMetric}>
              <span>Último registro</span>
              <strong>
                {latestRecord
                  ? formatTime(
                      latestRecord.record
                        .createdAt
                    )
                  : "—"}
              </strong>
            </div>
          </div>

          <div
            className={styles.timeline}
            aria-label="Linha do tempo das atividades"
          >
            {timeline.map(
              (
                {
                  record,
                  officerName,
                  activityLabel,
                  statusLabel,
                  statusTone,
                  activityTone,
                  quantity
                },
                index
              ) => (
                <article
                  className={`${styles.item} ${
                    index === 0
                      ? styles.latest
                      : ""
                  }`}
                  key={record.id}
                >
                  <div
                    className={
                      styles.timestamp
                    }
                  >
                    <time
                      dateTime={
                        record.createdAt ??
                        undefined
                      }
                    >
                      {formatTime(
                        record.createdAt
                      )}
                    </time>

                    <small>
                      {formatDate(
                        record.createdAt
                      )}
                    </small>
                  </div>

                  <span
                    className={styles.line}
                    aria-hidden="true"
                  >
                    <i
                      className={getDotClassName(
                        activityTone
                      )}
                    />
                  </span>

                  <div
                    className={styles.content}
                  >
                    <div
                      className={
                        styles.activityHeader
                      }
                    >
                      <strong>
                        {activityLabel}
                      </strong>

                      {index === 0 ? (
                        <span
                          className={
                            styles.latestLabel
                          }
                        >
                          Mais recente
                        </span>
                      ) : null}
                    </div>

                    <small>
                      {officerName}
                    </small>

                    <Badge
                      tone={statusTone}
                      size="sm"
                    >
                      {statusLabel}
                    </Badge>
                  </div>

                  <b
                    className={
                      quantity >= 0
                        ? styles.positiveQuantity
                        : styles.negativeQuantity
                    }
                    aria-label={`Quantidade ${quantity}`}
                  >
                    {formatQuantity(quantity)}
                  </b>
                </article>
              )
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

export default ActivityTimeline;
