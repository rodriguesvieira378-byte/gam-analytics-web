"use client";

import { MONTHS } from "@/lib/constants";
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

  const systemStatus =
    rejectedCount > 0
      ? "Atenção"
      : pendingCount > 0
        ? "Processando"
        : "Online";

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
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                Semana {value}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className={`grid kpis operational-kpis ${styles.kpiGrid}`}>
        <article className={`kpi-card ${styles.kpiCard} ${styles.kpiBlue}`}>
          <span>Prisões no período</span>
          <strong>{totalPrisons}</strong>
          <small className={styles.kpiFooter}>
            {MONTHS[month - 1]} • Semana {week}
          </small>
        </article>

        <article className={`kpi-card ${styles.kpiCard} ${styles.kpiGreen}`}>
          <span>Acompanhamentos no período</span>
          <strong>{totalPursuits}</strong>
          <small className={styles.kpiFooter}>
            {MONTHS[month - 1]} • Semana {week}
          </small>
        </article>

        <article
          className={`kpi-card ${styles.kpiCard} ${styles.kpiAmber} ${
            pendingCount > 0 ? "warning" : "good"
          }`}
        >
          <span>Fila do GAM Sync</span>
          <strong>{pendingCount}</strong>
          <small className={styles.kpiFooter}>
            {approvedCount} aprovado(s) • {rejectedCount} rejeitado(s)
          </small>
        </article>

        <article
          className={`kpi-card ${styles.kpiCard} ${styles.kpiOnline} ${
            rejectedCount > 0 ? "bad" : "good"
          }`}
        >
          <span>Sistema online</span>
          <strong>{systemStatus}</strong>
          <small className={styles.kpiFooter}>
            Última sincronização: {formatTime(latestSync)}
          </small>
        </article>
      </div>

      <div className={`grid two margin-top operational-primary-grid ${styles.primaryGrid}`}>
        <article className={`card operational-timeline-card ${styles.dashboardPanel}`}>
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
                <div className={`activity ${styles.activityRow}`} key={entry.id}>
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

        <article className={`card ${styles["ranking-premium-card"]} operational-ranking-card ${styles.dashboardPanel}`}>
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
                      <b>{metric.total}</b>
                      <small>{metric.situation}</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      <article className={`card margin-top operational-feed-card ${styles.dashboardPanel} ${styles.feedPanel}`}>
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
                  <div className={`activity ${styles.activityRow}`} key={record.id}>
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
        <article className={`card operational-health-card ${styles.dashboardPanel}`}>
          <header className={`card-head ${styles.panelHeader}`}>
            <div>
              <span>SAÚDE DO SISTEMA</span>
              <h3>Status dos serviços</h3>
            </div>
          </header>

          <div className={`activity-list ${styles.activityList}`}>
            {[
              ["Supabase", "Online"],
              ["Banco de dados", "Online"],
              ["GAM Sync", "Online"],
              ["Parser", "Online"],
              ["Discord Bot", "Em desenvolvimento"]
            ].map(([label, status]) => (
              <div className="activity" key={label}>
                <span
                  className={`dot ${
                    status === "Em desenvolvimento"
                      ? "warning"
                      : ""
                  }`}
                />

                <div>
                  <strong>{label}</strong>
                  <small>{status}</small>
                </div>

                <b>{status === "Online" ? "●" : "○"}</b>
              </div>
            ))}
          </div>
        </article>

        <article className={`card operational-officers-card ${styles.dashboardPanel}`}>
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
              <b>{metGoals}</b>
            </div>

            <div className="activity">
              <span className="dot warning" />
              <div>
                <strong>Aguardando lançamento</strong>
                <small>Sem registro na semana</small>
              </div>
              <b>{noEntries}</b>
            </div>

            <div className="activity">
              <span className={`dot ${styles["military-dot"]}`} />
              <div>
                <strong>Guarnição Militar</strong>
                <small>Integrantes militares ativos</small>
              </div>
              <b>{militaryCount}</b>
            </div>

            <div className="activity">
              <span className={`dot ${styles["civil-dot"]}`} />
              <div>
                <strong>Guarnição Civil</strong>
                <small>Integrantes civis ativos</small>
              </div>
              <b>{civilCount}</b>
            </div>

            <div className="activity">
              <span className="dot danger" />
              <div>
                <strong>Pendências do Sync</strong>
                <small>Registros rejeitados ou com falha</small>
              </div>
              <b>{rejectedCount}</b>
            </div>

            <div className="activity">
              <span className="dot muted" />
              <div>
                <strong>Fora de serviço</strong>
                <small>Integrantes inativos</small>
              </div>
              <b>{inactiveCount}</b>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default OperationalCenter;
