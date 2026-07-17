"use client";

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
  const queueTotal = pendingCount + rejectedCount;

  const effectiveness =
    activeCount > 0
      ? Math.round((metGoals / activeCount) * 100)
      : 0;

  const processedTotal =
    approvedCount + pendingCount + rejectedCount;

  const syncProgress =
    processedTotal > 0
      ? Math.round((approvedCount / processedTotal) * 100)
      : 100;

  return (
    <section className={styles.grid}>
      <KPICard
        title="Prisões"
        value={totalPrisons}
        subtitle="Total no período"
        badge="Operação"
        badgeTone="blue"
        tone="blue"
        progress={Math.min(100, totalPrisons)}
      />

      <KPICard
        title="Acompanhamentos"
        value={totalPursuits}
        subtitle="Total no período"
        badge="QRU"
        badgeTone="green"
        tone="green"
        progress={Math.min(100, totalPursuits)}
      />

      <KPICard
        title="Pendências"
        value={queueTotal}
        subtitle={`${pendingCount} na fila • ${rejectedCount} rejeitada(s)`}
        badge={queueTotal > 0 ? "Atenção" : "Livre"}
        badgeTone={queueTotal > 0 ? "yellow" : "green"}
        tone={queueTotal > 0 ? "yellow" : "green"}
        progress={Math.min(100, queueTotal * 10)}
      />

      <KPICard
        title="Efetividade"
        value={`${effectiveness}%`}
        subtitle={`${metGoals} meta(s) atingida(s)`}
        badge="Semana"
        badgeTone="purple"
        tone="blue"
        progress={effectiveness}
      />

      <KPICard
        title="GAM Sync"
        value={`${syncProgress}%`}
        subtitle={`Última sincronização: ${latestSyncLabel}`}
        badge={syncProgress === 100 ? "Online" : "Processando"}
        badgeTone={syncProgress === 100 ? "green" : "yellow"}
        tone={syncProgress === 100 ? "green" : "yellow"}
        progress={syncProgress}
      />
    </section>
  );
}

export default KPIGrid;
