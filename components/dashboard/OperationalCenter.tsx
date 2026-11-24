"use client";

import { useMemo, type CSSProperties } from "react";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { MONTHS } from "@/lib/constants";
import { isDemoMode } from "@/lib/supabase";
import styles from "./OperationalCenter.module.css";

import type {
  DiscordRecord,
  Officer,
  OfficerMetrics,
  WeeklyEntry
} from "@/lib/types";

interface OperationalCenterProps {
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
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getOfficer(officerId: string, officers: Officer[]) {
  return officers.find((officer) => officer.id === officerId);
}

function getOfficerName(officerId: string, officers: Officer[]) {
  return getOfficer(officerId, officers)?.name ?? "Integrante";
}

function getOfficerRegistration(
  officerId: string,
  officers: Officer[]
) {
  return getOfficer(officerId, officers)?.registration ?? "—";
}

function getOfficerGarrison(
  officerId: string,
  officers: Officer[]
): Officer["garrison"] {
  return getOfficer(officerId, officers)?.garrison ?? "Militar";
}

function getGarrisonClass(garrison: Officer["garrison"]) {
  return [
    styles["garrison-label"],
    garrison === "Civil"
      ? styles.civil
      : styles.military
  ].join(" ");
}

function getRankingClass(index: number) {
  const baseClass = styles["ranking-premium-item"];

  if (index === 0) {
    return `${baseClass} ${styles["ranking-gold"]}`;
  }

  if (index === 1) {
    return `${baseClass} ${styles["ranking-silver"]}`;
  }

  if (index === 2) {
    return `${baseClass} ${styles["ranking-bronze"]}`;
  }

  return `${baseClass} ${styles["ranking-standard"]}`;
}

const WEEKS = [1, 2, 3, 4, 5] as const;

/** Índice usado pelo CSS para escalonar as animações de entrada. */
function delay(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}

function getRankingLabel(index: number) {
  if (index === 0) return "OURO";
  if (index === 1) return "PRATA";
  if (index === 2) return "BRONZE";
  return `${index + 1}º`;
}

export function OperationalCenter({
  metrics,
  officers,
  entries,
  discordRecords,
  activeCount,
  totalPrisons,
  totalPursuits,
  metGoals,
  noEntries,
  month,
  week,
  onMonthChange,
  onWeekChange
}: OperationalCenterProps) {
  const periodRecords = discordRecords.filter(
    (record) => record.month === month && record.week === week
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

  const recentOperations = [...periodRecords]
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(
        String(a.createdAt ?? "")
      )
    )
    .slice(0, 6);

  const latestSync = recentOperations[0]?.createdAt ?? null;

  const recentEntries = entries
    .filter(
      (entry) => entry.month === month && entry.week === week
    )
    .slice()
    .reverse()
    .slice(0, 6);

  const rankedMetrics = [...metrics]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const inactiveCount = officers.filter(
    (officer) => officer.status === "Inativo"
  ).length;

  const militaryCount = officers.filter(
    (officer) =>
      officer.status === "Ativo" &&
      officer.garrison === "Militar"
  ).length;

  const civilCount = officers.filter(
    (officer) =>
      officer.status === "Ativo" &&
      officer.garrison === "Civil"
  ).length;

  const weeklyEvolution = useMemo(
    () =>
      WEEKS.map((value) => {
        const weekEntries = entries.filter(
          (entry) => entry.month === month && entry.week === value
        );

        const prisons = weekEntries.reduce(
          (sum, entry) => sum + entry.prisons,
          0
        );

        const pursuits = weekEntries.reduce(
          (sum, entry) => sum + entry.pursuits,
          0
        );

        return {
          week: value,
          prisons,
          pursuits,
          total: prisons + pursuits
        };
      }),
    [entries, month]
  );

  const evolutionPeak = Math.max(
    1,
    ...weeklyEvolution.map((item) => item.total)
  );

  const monthTotal = weeklyEvolution.reduce(
    (sum, item) => sum + item.total,
    0
  );

  const previousWeek = weeklyEvolution.find(
    (item) => item.week === week - 1
  );

  const currentWeek = weeklyEvolution.find(
    (item) => item.week === week
  );

  const weekTrend =
    previousWeek && currentWeek && previousWeek.total > 0
      ? Math.round(
          ((currentWeek.total - previousWeek.total) / previousWeek.total) *
            100
        )
      : null;

  const rankingPeak = Math.max(
    1,
    ...rankedMetrics.map((metric) => metric.total)
  );

  const systemStatus =
    rejectedCount > 0
      ? "Atenção"
      : pendingCount > 0
        ? "Processando"
        : "Online";

  const healthItems: Array<{
    label: string;
    status: string;
    tone: "" | "warning" | "danger" | "muted";
  }> = [
    {
      label: "Supabase",
      status: isDemoMode
        ? "Modo demonstração (dados no navegador)"
        : "Conectado",
      tone: isDemoMode ? "warning" : ""
    },
    {
      label: "GAM Sync",
      status:
        rejectedCount > 0
          ? `${rejectedCount} registro(s) rejeitado(s)`
          : pendingCount > 0
            ? `${pendingCount} na fila`
            : "Fila limpa",
      tone:
        rejectedCount > 0 ? "danger" : pendingCount > 0 ? "warning" : ""
    },
    {
      label: "Discord Bot",
      status: latestSync
        ? `Último registro às ${formatTime(latestSync)}`
        : "Nenhum registro neste período",
      tone: latestSync ? "" : "muted"
    },
    {
      label: "Efetivo",
      status: `${activeCount} ativo(s) • ${inactiveCount} inativo(s)`,
      tone: ""
    }
  ];

  return (
    <section className={`page operational-center ${styles.operationalPage}`}>
      <header className={`hero operational-hero ${styles.operationalHero}`}>
        <div className={styles.heroCopy}>
          <span>CENTRO DE COMANDO</span>
          <h2>Centro Operacional G.A.M</h2>
          <p>
            Visão rápida da operação, sincronização e situação do efetivo.
          </p>
        </div>

        <div className={styles.filters}>
          <select
            value={month}
            onChange={(event) =>
              onMonthChange(Number(event.target.value))
            }
            aria-label="Selecionar mês"
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={week}
            onChange={(event) =>
              onWeekChange(Number(event.target.value))
            }
            aria-label="Selecionar semana"
          >
            {WEEKS.map((value) => (
              <option key={value} value={value}>
                Semana {value}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className={`grid kpis operational-kpis ${styles.kpiGrid}`}>
        <article
          className={`kpi-card ${styles.kpiCard} ${styles.kpiBlue}`}
          style={delay(0)}
        >
          <span>Prisões no período</span>
          <strong>
            <AnimatedNumber value={totalPrisons} />
          </strong>
          <small className={styles.kpiFooter}>
            {MONTHS[month - 1]} • Semana {week}
          </small>
        </article>

        <article
          className={`kpi-card ${styles.kpiCard} ${styles.kpiGreen}`}
          style={delay(1)}
        >
          <span>Acompanhamentos no período</span>
          <strong>
            <AnimatedNumber value={totalPursuits} />
          </strong>
          <small className={styles.kpiFooter}>
            {MONTHS[month - 1]} • Semana {week}
          </small>
        </article>

        <article
          className={`kpi-card ${styles.kpiCard} ${styles.kpiAmber} ${
            pendingCount > 0 ? "warning" : "good"
          }`}
          style={delay(2)}
        >
          <span>Fila do GAM Sync</span>
          <strong>
            <AnimatedNumber value={pendingCount} />
          </strong>
          <small className={styles.kpiFooter}>
            {approvedCount} aprovado(s) • {rejectedCount} rejeitado(s)
          </small>
        </article>

        <article
          className={`kpi-card ${styles.kpiCard} ${styles.kpiOnline} ${
            rejectedCount > 0 ? "bad" : "good"
          }`}
          style={delay(3)}
        >
          <span>Sistema online</span>
          <strong
            className={`${styles.statusValue} ${
              systemStatus === "Online"
                ? styles.pulseGood
                : systemStatus === "Atenção"
                  ? styles.pulseBad
                  : styles.pulseWarn
            }`}
          >
            <span
              className={`${styles.livePulse} ${
                systemStatus === "Online"
                  ? styles.pulseGood
                  : systemStatus === "Atenção"
                    ? styles.pulseBad
                    : styles.pulseWarn
              }`}
              aria-hidden="true"
            />
            {systemStatus}
          </strong>
          <small className={styles.kpiFooter}>
            Última sincronização: {formatTime(latestSync)}
          </small>
        </article>
      </div>

      <article
        className={`card ${styles.dashboardPanel} ${styles.evolutionPanel}`}
        style={delay(4)}
      >
        <header className={styles.evolutionHeader}>
          <div>
            <span>EVOLUÇÃO DO MÊS</span>
            <h3>Produtividade semana a semana</h3>
          </div>

          <div className={styles.evolutionSummary}>
            <div>
              <small>Total em {MONTHS[month - 1]}</small>
              <b>
                <AnimatedNumber value={monthTotal} />
              </b>
            </div>

            {weekTrend !== null && (
              <div>
                <small>Semana {week} x anterior</small>
                <b
                  className={
                    weekTrend >= 0 ? styles.trendUp : styles.trendDown
                  }
                >
                  {weekTrend >= 0 ? "▲" : "▼"} {Math.abs(weekTrend)}%
                </b>
              </div>
            )}
          </div>
        </header>

        <div
          className={styles.evolutionChart}
          role="group"
          aria-label="Atividades por semana"
        >
          {weeklyEvolution.map((item) => {
            const height = Math.round((item.total / evolutionPeak) * 100);
            const prisonShare =
              item.total > 0
                ? Math.round((item.prisons / item.total) * 100)
                : 0;

            return (
              <button
                type="button"
                key={item.week}
                className={`${styles.evolutionBar} ${
                  item.week === week ? styles.evolutionActive : ""
                }`}
                onClick={() => onWeekChange(item.week)}
                aria-pressed={item.week === week}
                title={`Semana ${item.week}: ${item.prisons} prisões • ${item.pursuits} acompanhamentos`}
              >
                <span className={styles.evolutionValue}>{item.total}</span>

                <span className={styles.evolutionTrack}>
                  <span
                    className={styles.evolutionFill}
                    style={
                      {
                        "--h": `${height}%`,
                        "--p": `${prisonShare}%`
                      } as CSSProperties
                    }
                  />
                </span>

                <span className={styles.evolutionLabel}>
                  Semana {item.week}
                </span>
              </button>
            );
          })}
        </div>

        <footer className={styles.evolutionLegend}>
          <span>
            <i className={styles.legendPrisons} /> Prisões
          </span>
          <span>
            <i className={styles.legendPursuits} /> Acompanhamentos
          </span>
          <span className={styles.legendHint}>
            Clique numa barra para ver a semana
          </span>
        </footer>
      </article>

      <div className={`grid two margin-top operational-primary-grid ${styles.primaryGrid}`}>
        <article
          className={`card operational-timeline-card ${styles.dashboardPanel}`}
          style={delay(5)}
        >
        <header className={`card-head ${styles.panelHeader}`}>
          <div>
            <span>TIMELINE</span>
            <h3>Últimos lançamentos</h3>
          </div>
          <small>{recentEntries.length} registro(s)</small>
        </header>

        <div className={`activity-list ${styles.activityList}`}>
          {recentEntries.length === 0 ? (
            <div className="empty">
              Nenhum lançamento neste período.
            </div>
          ) : (
            recentEntries.map((entry) => {
              const garrison = getOfficerGarrison(
                entry.officerId,
                officers
              );

              return (
                <div
                  className={`activity ${styles.activityRow}`}
                  key={entry.id}
                  style={delay(recentEntries.indexOf(entry))}
                >
                  <span className="dot" />

                  <div>
                    <strong>
                      {getOfficerName(entry.officerId, officers)}
                    </strong>
                    <small>
                      {getOfficerRegistration(
                        entry.officerId,
                        officers
                      )}
                      {" • "}
                      <span className={getGarrisonClass(garrison)}>
                        {garrison}
                      </span>
                    </small>
                  </div>

                  <div className="activity-meta">
                    <b>
                      {entry.prisons} P • {entry.pursuits} A
                    </b>
                    <small>
                      {entry.prisons + entry.pursuits} atividade(s)
                    </small>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>

        <article
          className={`card ${styles["ranking-premium-card"]} operational-ranking-card ${styles.dashboardPanel}`}
          style={delay(6)}
        >
          <header className={`card-head ${styles["ranking-premium-header"]}`}>
            <div>
              <span>RANKING PREMIUM</span>
              <h3>Destaques da semana</h3>
            </div>
            <small>{activeCount} ativos</small>
          </header>

          <div className={styles["ranking-premium-list"]}>
            {rankedMetrics.length === 0 ? (
              <div className="empty">
                Nenhuma produtividade registrada nesta semana.
              </div>
            ) : (
              rankedMetrics.map((metric, index) => {
                const garrison = getOfficerGarrison(
                  metric.id,
                  officers
                );

                return (
                  <div
                    className={getRankingClass(index)}
                    key={metric.id}
                    style={
                      {
                        "--i": index,
                        "--share": `${Math.round(
                          (metric.total / rankingPeak) * 100
                        )}%`
                      } as CSSProperties
                    }
                  >
                    <div className={styles["ranking-premium-position"]}>
                      <span>{index + 1}</span>
                      <small>{getRankingLabel(index)}</small>
                    </div>

                    <div className={styles["ranking-premium-identity"]}>
                      <strong>{metric.name}</strong>
                      <small>
                        {metric.registration}
                        {" • "}
                        <span className={getGarrisonClass(garrison)}>
                          {garrison}
                        </span>
                      </small>
                    </div>

                    <div className={styles["ranking-premium-result"]}>
                      <b>
                        <AnimatedNumber value={metric.total} />
                      </b>
                      <small>{metric.situation}</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      <article
          className={`card margin-top operational-feed-card ${styles.dashboardPanel} ${styles.feedPanel}`}
          style={delay(7)}
        >
          <header className={`card-head ${styles.panelHeader}`}>
            <div>
              <span>FEED OPERACIONAL</span>
              <h3>Sincronizações e atividades recentes</h3>
            </div>
            <small>{recentOperations.length} registro(s)</small>
          </header>

          <div className={`activity-list ${styles.activityList}`}>
            {recentOperations.length === 0 ? (
              <div className="empty">
                Nenhuma operação sincronizada neste período.
              </div>
            ) : (
              recentOperations.map((record) => {
                const garrison = getOfficerGarrison(
                  record.officerId,
                  officers
                );

                return (
                  <div
                    className={`activity ${styles.activityRow}`}
                    key={record.id}
                    style={delay(recentOperations.indexOf(record))}
                  >
                    <span
                      className={`dot ${
                        record.status === "Rejeitado"
                          ? "danger"
                          : record.status === "Pendente"
                            ? "warning"
                            : ""
                      }`}
                    />

                    <div>
                      <strong>
                        {getOfficerName(record.officerId, officers)}
                      </strong>
                      <small>
                        {record.activityType} • Quantidade {record.quantity}
                        {" • "}
                        <span className={getGarrisonClass(garrison)}>
                          {garrison}
                        </span>
                      </small>
                    </div>

                    <div className="activity-meta">
                      <b>{formatTime(record.createdAt)}</b>
                      <small>{record.status}</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

      <div className={`grid two margin-top operational-secondary-grid ${styles.secondaryGrid}`}>
        <article
          className={`card operational-health-card ${styles.dashboardPanel}`}
          style={delay(8)}
        >
          <header className={`card-head ${styles.panelHeader}`}>
            <div>
              <span>SAÚDE DO SISTEMA</span>
              <h3>Status dos serviços</h3>
            </div>
          </header>

          <div className={`activity-list ${styles.activityList}`}>
            {healthItems.map(({ label, status, tone }) => (
              <div className="activity" key={label}>
                <span className={`dot ${tone}`} />

                <div>
                  <strong>{label}</strong>
                  <small>{status}</small>
                </div>

                <b>{tone === "" ? "●" : "○"}</b>
              </div>
            ))}
          </div>
        </article>

        <article
          className={`card operational-officers-card ${styles.dashboardPanel}`}
          style={delay(9)}
        >
          <header className={`card-head ${styles.panelHeader}`}>
            <div>
              <span>SITUAÇÃO DO EFETIVO</span>
              <h3>Leitura operacional</h3>
            </div>
          </header>

          <div className={`activity-list ${styles.activityList}`}>
            <div className="activity">
              <span className="dot" />
              <div>
                <strong>Metas atingidas</strong>
                <small>Integrantes dentro da meta semanal</small>
              </div>
              <b>
                <AnimatedNumber value={metGoals} />
              </b>
            </div>

            <div className="activity">
              <span className="dot warning" />
              <div>
                <strong>Aguardando lançamento</strong>
                <small>Sem registro na semana</small>
              </div>
              <b>
                <AnimatedNumber value={noEntries} />
              </b>
            </div>

            <div className="activity">
              <span className={`dot ${styles["military-dot"]}`} />
              <div>
                <strong>Guarnição Militar</strong>
                <small>Integrantes militares ativos</small>
              </div>
              <b>
                <AnimatedNumber value={militaryCount} />
              </b>
            </div>

            <div className="activity">
              <span className={`dot ${styles["civil-dot"]}`} />
              <div>
                <strong>Guarnição Civil</strong>
                <small>Integrantes civis ativos</small>
              </div>
              <b>
                <AnimatedNumber value={civilCount} />
              </b>
            </div>

            <div className="activity">
              <span className="dot danger" />
              <div>
                <strong>Pendências do Sync</strong>
                <small>Registros rejeitados ou com falha</small>
              </div>
              <b>
                <AnimatedNumber value={rejectedCount} />
              </b>
            </div>

            <div className="activity">
              <span className="dot muted" />
              <div>
                <strong>Fora de serviço</strong>
                <small>Integrantes inativos</small>
              </div>
              <b>
                <AnimatedNumber value={inactiveCount} />
              </b>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default OperationalCenter;
