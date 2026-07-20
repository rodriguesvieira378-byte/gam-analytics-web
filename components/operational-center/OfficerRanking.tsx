"use client";

import { useMemo } from "react";

import type { OfficerMetrics } from "@/lib/types";

import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

import styles from "./OfficerRanking.module.css";

export interface OfficerRankingProps {
  metrics: OfficerMetrics[];
}

type RankingHighlight =
  | "MVP DA SEMANA"
  | "DESTAQUE"
  | "EM EVOLUÇÃO"
  | "ATENÇÃO"
  | "SEM ATIVIDADE";

function safeMetricValue(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function getPlacementClass(
  index: number,
  total: number
) {
  if (total <= 0) {
    return styles.neutral;
  }

  if (index === 0) {
    return styles.gold;
  }

  if (index === 1) {
    return styles.silver;
  }

  if (index === 2) {
    return styles.bronze;
  }

  return styles.standard;
}

function getPlacementLabel(
  index: number,
  total: number
) {
  if (total <= 0) {
    return `${index + 1}º`;
  }

  if (index === 0) {
    return "OURO";
  }

  if (index === 1) {
    return "PRATA";
  }

  if (index === 2) {
    return "BRONZE";
  }

  return `${index + 1}º`;
}

function getPlacementIcon(
  index: number,
  total: number
) {
  if (total <= 0) {
    return "—";
  }

  if (index === 0) {
    return "🏆";
  }

  if (index === 1) {
    return "🥈";
  }

  if (index === 2) {
    return "🥉";
  }

  return "◆";
}

function getSituationTone(
  situation: OfficerMetrics["situation"]
): "green" | "red" | "yellow" {
  if (situation === "META ATINGIDA") {
    return "green";
  }

  if (situation === "SEM REGISTRO") {
    return "red";
  }

  return "yellow";
}

function getRankingHighlight(
  officer: OfficerMetrics,
  index: number
): RankingHighlight {
  const total = safeMetricValue(officer.total);

  if (
    total <= 0 ||
    officer.situation === "SEM REGISTRO"
  ) {
    return "SEM ATIVIDADE";
  }

  if (index === 0) {
    return "MVP DA SEMANA";
  }

  if (index <= 2) {
    return "DESTAQUE";
  }

  if (officer.situation === "META ATINGIDA") {
    return "EM EVOLUÇÃO";
  }

  return "ATENÇÃO";
}

function getHighlightClass(
  highlight: RankingHighlight
) {
  if (highlight === "MVP DA SEMANA") {
    return styles.highlightMvp;
  }

  if (highlight === "DESTAQUE") {
    return styles.highlightFeatured;
  }

  if (highlight === "EM EVOLUÇÃO") {
    return styles.highlightPositive;
  }

  if (highlight === "ATENÇÃO") {
    return styles.highlightWarning;
  }

  return styles.highlightInactive;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  return `${Math.min(100, Math.round(value))}%`;
}

function formatAverage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(
    Number.isFinite(value) ? value : 0
  );
}

export function OfficerRanking({
  metrics
}: OfficerRankingProps) {
  const intelligence = useMemo(() => {
    const normalizedMetrics = metrics.map(
      (officer) => ({
        ...officer,
        total: safeMetricValue(officer.total)
      })
    );

    const sortedMetrics = [...normalizedMetrics].sort(
      (first, second) => {
        if (second.total !== first.total) {
          return second.total - first.total;
        }

        const firstGoalReached =
          first.situation === "META ATINGIDA";

        const secondGoalReached =
          second.situation === "META ATINGIDA";

        if (firstGoalReached !== secondGoalReached) {
          return secondGoalReached ? 1 : -1;
        }

        return first.name.localeCompare(
          second.name,
          "pt-BR",
          {
            sensitivity: "base"
          }
        );
      }
    );

    const ranking = sortedMetrics.slice(0, 5);

    const totalProduction =
      normalizedMetrics.reduce(
        (total, officer) =>
          total + officer.total,
        0
      );

    const activeInRanking = ranking.filter(
      (officer) => officer.total > 0
    );

    const topFiveProduction =
      activeInRanking.reduce(
        (total, officer) =>
          total + officer.total,
        0
      );

    const rankingAverage =
      activeInRanking.length > 0
        ? topFiveProduction /
          activeInRanking.length
        : 0;

    const goalsReached = ranking.filter(
      (officer) =>
        officer.situation === "META ATINGIDA"
    ).length;

    const leader =
      ranking[0]?.total > 0
        ? ranking[0]
        : null;

    return {
      ranking,
      totalProduction,
      rankingAverage,
      goalsReached,
      leader
    };
  }, [metrics]);

  return (
    <Panel
      eyebrow="Produtividade"
      title="Ranking Premium"
      description="Inteligência do Top 5 semanal"
      compact
    >
      <div
        className={styles.summary}
        aria-label="Resumo do ranking semanal"
      >
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>
            MVP atual
          </span>

          <strong
            className={styles.summaryValue}
            title={
              intelligence.leader?.name ??
              "Sem registros"
            }
          >
            {intelligence.leader?.name ??
              "Sem registros"}
          </strong>

          <small className={styles.summaryDetail}>
            {intelligence.leader
              ? `${intelligence.leader.total} atividade(s)`
              : "Aguardando produtividade"}
          </small>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>
            Média do Top 5
          </span>

          <strong className={styles.summaryValue}>
            {formatAverage(
              intelligence.rankingAverage
            )}
          </strong>

          <small className={styles.summaryDetail}>
            atividades por integrante ativo
          </small>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>
            Metas atingidas
          </span>

          <strong className={styles.summaryValue}>
            {intelligence.goalsReached}
          </strong>

          <small className={styles.summaryDetail}>
            integrante(s) no Top 5
          </small>
        </div>
      </div>

      <div
        className={styles.ranking}
        aria-label="Classificação semanal dos integrantes"
      >
        {intelligence.ranking.length === 0 ? (
          <div
            className={styles.empty}
            role="status"
          >
            Nenhum integrante disponível para o
            ranking.
          </div>
        ) : (
          intelligence.ranking.map(
            (officer, index) => {
              const placementClass =
                getPlacementClass(
                  index,
                  officer.total
                );

              const highlight =
                getRankingHighlight(
                  officer,
                  index
                );

              const participation =
                intelligence.totalProduction > 0
                  ? (officer.total /
                      intelligence.totalProduction) *
                    100
                  : 0;

              return (
                <article
                  className={`${styles.item} ${placementClass}`}
                  key={officer.id}
                >
                  <div className={styles.position}>
                    <span
                      className={styles.placementIcon}
                      aria-hidden="true"
                    >
                      {getPlacementIcon(
                        index,
                        officer.total
                      )}
                    </span>

                    <strong>{index + 1}</strong>

                    <small>
                      {getPlacementLabel(
                        index,
                        officer.total
                      )}
                    </small>
                  </div>

                  <div className={styles.identity}>
                    <div
                      className={
                        styles.identityHeader
                      }
                    >
                      <strong title={officer.name}>
                        {officer.name}
                      </strong>

                      <span
                        className={`${styles.highlight} ${getHighlightClass(
                          highlight
                        )}`}
                      >
                        {highlight}
                      </span>
                    </div>

                    <small>
                      {officer.registration}
                    </small>

                    <span
                      className={
                        styles.participation
                      }
                    >
                      {formatPercentage(
                        participation
                      )} da produção semanal
                    </span>
                  </div>

                  <div className={styles.result}>
                    <strong
                      className={styles.total}
                    >
                      {officer.total}
                    </strong>

                    <small
                      className={styles.totalLabel}
                    >
                      atividades
                    </small>

                    <Badge
                      tone={getSituationTone(
                        officer.situation
                      )}
                      size="sm"
                    >
                      {officer.situation}
                    </Badge>
                  </div>
                </article>
              );
            }
          )
        )}
      </div>
    </Panel>
  );
}

export default OfficerRanking;
