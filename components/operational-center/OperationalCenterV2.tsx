"use client";

import { useMemo } from "react";
import type {
  DiscordRecord,
  Officer,
  OfficerMetrics,
  WeeklyEntry
} from "@/lib/types";

import { DashboardHeader } from "./DashboardHeader";
import { KPIGrid } from "./KPIGrid";

import styles from "./OperationalCenterV2.module.css";

export interface OperationalCenterV2Props {
  metrics: OfficerMetrics[];
  officers: Officer[];
  entries: WeeklyEntry[];
  discordRecords: DiscordRecord[];
  activeCount: number;
  totalPrisons: number;
  totalPursuits: number;
  metGoals: number;
  noEntries: number;
  month: number;
  week: number;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
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

export function OperationalCenterV2({
  discordRecords,
  activeCount,
  totalPrisons,
  totalPursuits,
  metGoals,
  month,
  week,
  onMonthChange,
  onWeekChange
}: OperationalCenterV2Props) {
  const periodRecords = useMemo(
    () =>
      discordRecords.filter(
        (record) =>
          record.month === month &&
          record.week === week
      ),
    [discordRecords, month, week]
  );

  const pendingCount = periodRecords.filter(
    (record) => record.status === "Pendente"
  ).length;

  const rejectedCount = periodRecords.filter(
    (record) => record.status === "Rejeitado"
  ).length;

  const approvedCount = periodRecords.filter(
    (record) => record.status === "Aprovado"
  ).length;

  const latestSync = useMemo(
    () =>
      [...periodRecords]
        .sort((a, b) =>
          String(b.createdAt ?? "").localeCompare(
            String(a.createdAt ?? "")
          )
        )
        .at(0)?.createdAt ?? null,
    [periodRecords]
  );

  return (
    <section className={styles.page}>
      <DashboardHeader
        month={month}
        week={week}
        onMonthChange={onMonthChange}
        onWeekChange={onWeekChange}
      />

      <KPIGrid
        totalPrisons={totalPrisons}
        totalPursuits={totalPursuits}
        pendingCount={pendingCount}
        rejectedCount={rejectedCount}
        approvedCount={approvedCount}
        activeCount={activeCount}
        metGoals={metGoals}
        latestSyncLabel={formatTime(latestSync)}
      />

      <section className={styles.nextStage}>
        <span>Operational Center V2</span>
        <strong>Topo operacional concluído</strong>
        <p>
          Feed, timeline, ranking e saúde do sistema entram
          nas próximas entregas da Sprint 4.2.
        </p>
      </section>
    </section>
  );
}

export default OperationalCenterV2;