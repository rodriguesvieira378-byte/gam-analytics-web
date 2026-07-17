"use client";

import { useMemo } from "react";
import type {
  DiscordRecord,
  Officer,
  OfficerMetrics,
  WeeklyEntry
} from "@/lib/types";

import { ActivityTimeline } from "./ActivityTimeline";
import { DashboardHeader } from "./DashboardHeader";
import { FeedPanel } from "./FeedPanel";
import { KPIGrid } from "./KPIGrid";
import { OfficerRanking } from "./OfficerRanking";
import { SystemHealth } from "./SystemHealth";

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
  metrics,
  officers,
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

  const latestSyncLabel =
    formatTime(latestSync);

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
        latestSyncLabel={latestSyncLabel}
      />

      <section className={styles.modules}>
        <div className={styles.feed}>
          <FeedPanel
            records={periodRecords}
            officers={officers}
          />
        </div>

        <div className={styles.ranking}>
          <OfficerRanking
            metrics={metrics}
          />
        </div>

        <div className={styles.timeline}>
          <ActivityTimeline
            records={periodRecords}
            officers={officers}
          />
        </div>

        <div className={styles.health}>
          <SystemHealth
            pendingCount={pendingCount}
            rejectedCount={rejectedCount}
            latestSyncLabel={latestSyncLabel}
          />
        </div>
      </section>
    </section>
  );
}

export default OperationalCenterV2;
