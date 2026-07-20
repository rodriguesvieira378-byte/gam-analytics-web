"use client";

import { useMemo } from "react";

import { KPICard } from "./KPICard";
import styles from "./KPIGrid.module.css";

export interface KPIGridProps {
  totalPrisons: number;
  totalPursuits: number;
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  activeCount: number;
  metGoals: number;
  latestSyncLabel: string;
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function KPIGrid({
  totalPrisons,
  totalPursuits,
  pendingCount,
  rejectedCount,
  approvedCount,
  activeCount,
  metGoals,
  latestSyncLabel
}: KPIGridProps) {
  const metrics = useMemo(() => {
    const prisons = safeNumber(totalPrisons);
    const pursuits = safeNumber(totalPursuits);
    const pending = safeNumber(pendingCount);
    const rejected = safeNumber(rejectedCount);
    const approved = safeNumber(approvedCount);
    const active = safeNumber(activeCount);
    const goalsMet = Math.min(
      safeNumber(metGoals),
      active
    );

    const queueTotal = pending + rejected;
    const processedTotal =
      approved + pending + rejected;

    const effectiveness =
      active > 0
        ? clampPercentage((goalsMet / active) * 100)
        : 0;

    const syncProgress =
      processedTotal > 0
        ? clampPercentage(
            (approved / processedTotal) * 100
          )
        : 100;

    return {
      prisons,
      pursuits,
      pending,
      rejected,
      approved,
      active,
      goalsMet,
      queueTotal,
      effectiveness,
      syncProgress
    };
  }, [
    totalPrisons,
    totalPursuits,
    pendingCount,
    rejectedCount,
    approvedCount,
    activeCount,
    metGoals
  ]);

  const syncLabel =
    latestSyncLabel.trim() || "Sem registro";

  return (
    <section
      className={styles.grid}
      aria-label="Indicadores operacionais da G.A.M."
    >
      <KPICard
        title="Prisões"
        value={metrics.prisons}
        subtitle="Total no período"
        badge="Operação"
        badgeTone="blue"
        tone="blue"
        progress={clampPercentage(metrics.prisons)}
      />

      <KPICard
        title="Acompanhamentos"
        value={metrics.pursuits}
        subtitle="Total no período"
        badge="QRU"
        badgeTone="green"
        tone="green"
        progress={clampPercentage(metrics.pursuits)}
      />

      <KPICard
        title="Pendências"
        value={metrics.queueTotal}
        subtitle={`${metrics.pending} na fila • ${metrics.rejected} rejeitada(s)`}
        badge={
          metrics.queueTotal > 0
            ? "Atenção"
            : "Livre"
        }
        badgeTone={
          metrics.queueTotal > 0
            ? "yellow"
            : "green"
        }
        tone={
          metrics.queueTotal > 0
            ? "yellow"
            : "green"
        }
        progress={clampPercentage(
          metrics.queueTotal * 10
        )}
      />

      <KPICard
        title="Efetividade"
        value={`${metrics.effectiveness}%`}
        subtitle={`${metrics.goalsMet} meta(s) atingida(s)`}
        badge="Semana"
        badgeTone="purple"
        tone="blue"
        progress={metrics.effectiveness}
      />

      <KPICard
        title="GAM Sync"
        value={`${metrics.syncProgress}%`}
        subtitle={`Última sincronização: ${syncLabel}`}
        badge={
          metrics.syncProgress === 100
            ? "Online"
            : "Processando"
        }
        badgeTone={
          metrics.syncProgress === 100
            ? "green"
            : "yellow"
        }
        tone={
          metrics.syncProgress === 100
            ? "green"
            : "yellow"
        }
        progress={metrics.syncProgress}
      />
    </section>
  );
}

export default KPIGrid;
