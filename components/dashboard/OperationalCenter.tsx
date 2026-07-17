"use client";

import { useMemo } from "react";
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

function getOfficerName(
  officerId: string,
  officers: Officer[]
) {
  return (
    officers.find((officer) => officer.id === officerId)?.name ??
    "Integrante"
  );
}

function getOfficerRegistration(
  officerId: string,
  officers: Officer[]
) {
  return (
    officers.find((officer) => officer.id === officerId)
      ?.registration ?? "—"
  );
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
    (record) =>
      record.month === month &&
      record.week === week
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
      (entry) =>
        entry.month === month &&
        entry.week === week
    )
    .slice()
    .reverse()
    .slice(0, 6);

  const rankedMetrics = [...metrics]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const systemStatus =
    rejectedCount > 0
      ? "Atenção"
      : pendingCount > 0
        ? "Processando"
        : "Online";

  return (
    <section className="page operational-center">
      <header className="hero operational-hero">
        <div>
          <span>CENTRO DE COMANDO</span>
          <h2>Centro Operacional G.A.M</h2>
          <p>
            Visão rápida da operação, sincronização e situação do efetivo.
          </p>
        </div>

        <div className="filters">
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

      <div className="grid kpis operational-kpis">
        <article className="kpi-card">
          <span>Prisões hoje</span>
          <strong>{totalPrisons}</strong>
          <small>▲ operação consolidada</small>
        </article>

        <article className="kpi-card">
          <span>Acompanhamentos hoje</span>
          <strong>{totalPursuits}</strong>
          <small>▲ operação consolidada</small>
        </article>

        <article
          className={`kpi-card ${
            pendingCount > 0 ? "warning" : "good"
          }`}
        >
          <span>Fila do GAM Sync</span>
          <strong>{pendingCount}</strong>
          <small>
            {approvedCount} processado(s) • {rejectedCount} rejeitado(s)
          </small>
        </article>

        <article
          className={`kpi-card ${
            rejectedCount > 0 ? "bad" : "good"
          }`}
        >
          <span>Sistema</span>
          <strong>{systemStatus}</strong>
          <small>
            Última sincronização: {formatTime(latestSync)}
          </small>
        </article>
      </div>

      <div className="grid two margin-top">
        <article className="card">
          <header className="card-head">
            <div>
              <span>FEED OPERACIONAL</span>
              <h3>Operações recentes</h3>
            </div>
            <small>{recentOperations.length} registro(s)</small>
          </header>

          <div className="activity-list">
            {recentOperations.length === 0 ? (
              <div className="empty">
                Nenhuma operação sincronizada neste período.
              </div>
            ) : (
              recentOperations.map((record) => (
                <div className="activity" key={record.id}>
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
                    </small>
                  </div>

                  <div className="activity-meta">
                    <b>{formatTime(record.createdAt)}</b>
                    <small>{record.status}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <header className="card-head">
            <div>
              <span>SAÚDE DO SISTEMA</span>
              <h3>Status dos serviços</h3>
            </div>
          </header>

          <div className="activity-list">
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

                <b>
                  {status === "Online" ? "●" : "○"}
                </b>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid two margin-top">
        <article className="card">
          <header className="card-head">
            <div>
              <span>PRODUTIVIDADE</span>
              <h3>Destaques da semana</h3>
            </div>
            <small>{activeCount} ativos</small>
          </header>

          <div className="activity-list">
            {rankedMetrics.map((metric, index) => (
              <div className="activity" key={metric.id}>
                <span className="rank-position">
                  {index + 1}
                </span>

                <div>
                  <strong>{metric.name}</strong>
                  <small>{metric.registration}</small>
                </div>

                <div className="activity-meta">
                  <b>{metric.total}</b>
                  <small>{metric.situation}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <header className="card-head">
            <div>
              <span>SITUAÇÃO DO EFETIVO</span>
              <h3>Leitura operacional</h3>
            </div>
          </header>

          <div className="activity-list">
            <div className="activity">
              <span className="dot" />
              <div>
                <strong>Em atividade</strong>
                <small>Metas atingidas</small>
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
              <span className="dot danger" />
              <div>
                <strong>Pendências</strong>
                <small>Rejeitados ou com falha</small>
              </div>
              <b>{rejectedCount}</b>
            </div>

            <div className="activity">
              <span className="dot muted" />
              <div>
                <strong>Fora de serviço</strong>
                <small>Integrantes inativos</small>
              </div>
              <b>
                {
                  officers.filter(
                    (officer) => officer.status === "Inativo"
                  ).length
                }
              </b>
            </div>
          </div>
        </article>
      </div>

      <article className="card margin-top">
        <header className="card-head">
          <div>
            <span>TIMELINE</span>
            <h3>Últimos lançamentos</h3>
          </div>
          <small>{recentEntries.length} registro(s)</small>
        </header>

        <div className="activity-list">
          {recentEntries.length === 0 ? (
            <div className="empty">
              Nenhum lançamento neste período.
            </div>
          ) : (
            recentEntries.map((entry) => (
              <div className="activity" key={entry.id}>
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
            ))
          )}
        </div>
      </article>
    </section>
  );
}

export default OperationalCenter;
