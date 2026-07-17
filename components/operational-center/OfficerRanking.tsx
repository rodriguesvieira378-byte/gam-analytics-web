"use client";

import type { OfficerMetrics } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

import styles from "./OfficerRanking.module.css";

export interface OfficerRankingProps {
  metrics: OfficerMetrics[];
}

export function OfficerRanking({
  metrics
}: OfficerRankingProps) {
  const ranking = [...metrics]
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      return a.name.localeCompare(b.name, "pt-BR");
    })
    .slice(0, 5);

  return (
    <Panel
      eyebrow="Produtividade"
      title="Ranking do efetivo"
      description="Top 5 da semana"
      compact
    >
      <div className={styles.ranking}>
        {ranking.map((officer, index) => (
          <article
            className={styles.item}
            key={officer.id}
          >
            <span className={styles.position}>
              {index + 1}
            </span>

            <div className={styles.identity}>
              <strong>{officer.name}</strong>
              <small>{officer.registration}</small>
            </div>

            <div className={styles.result}>
              <strong>{officer.total}</strong>
              <Badge
                tone={
                  officer.situation === "META ATINGIDA"
                    ? "green"
                    : officer.situation === "SEM REGISTRO"
                      ? "red"
                      : "yellow"
                }
                size="sm"
              >
                {officer.situation}
              </Badge>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export default OfficerRanking;
