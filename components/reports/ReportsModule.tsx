"use client";

import { useMemo, useState } from "react";
import { MONTHS, WEEKS } from "@/lib/constants";
import type {
  DiscordRecord,
  Officer,
  OfficerMetrics,
  WeeklyEntry
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Select } from "@/components/ui/Select";

import styles from "./ReportsModule.module.css";

type ReportMode = "semanal" | "mensal" | "oficial";

export interface ReportsModuleProps {
  metrics: OfficerMetrics[];
  officers: Officer[];
  entries: WeeklyEntry[];
  discordRecords: DiscordRecord[];
  year: number;
  month: number;
  week: number;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadFile(
  filename: string,
  content: string,
  type: string
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function situationTone(
  situation: OfficerMetrics["situation"]
) {
  if (situation === "META ATINGIDA") return "green";
  if (situation === "SEM REGISTRO") return "red";
  return "yellow";
}

export function ReportsModule({
  metrics,
  officers,
  entries,
  discordRecords,
  year,
  month,
  week,
  onMonthChange,
  onWeekChange
}: ReportsModuleProps) {
  const [mode, setMode] =
    useState<ReportMode>("semanal");
  const [selectedOfficerId, setSelectedOfficerId] =
    useState("todos");

  const selectedOfficer = officers.find(
    (officer) => officer.id === selectedOfficerId
  );

  const selectedMetric = metrics.find(
    (metric) => metric.id === selectedOfficerId
  );

  const monthEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.year === year &&
          entry.month === month
      ),
    [entries, month, year]
  );

  const periodDiscordRecords = useMemo(
    () =>
      discordRecords.filter(
        (record) =>
          record.year === year &&
          record.month === month &&
          (mode === "mensal" || record.week === week) &&
          (selectedOfficerId === "todos" ||
            record.officerId === selectedOfficerId)
      ),
    [
      discordRecords,
      mode,
      month,
      selectedOfficerId,
      week,
      year
    ]
  );

  const reportMetrics = useMemo(
    () =>
      metrics.filter(
        (metric) =>
          selectedOfficerId === "todos" ||
          metric.id === selectedOfficerId
      ),
    [metrics, selectedOfficerId]
  );

  const weeklyPrisons = reportMetrics.reduce(
    (sum, metric) => sum + metric.prisons,
    0
  );

  const weeklyPursuits = reportMetrics.reduce(
    (sum, metric) => sum + metric.pursuits,
    0
  );

  const monthlyPrisons = monthEntries
    .filter(
      (entry) =>
        selectedOfficerId === "todos" ||
        entry.officerId === selectedOfficerId
    )
    .reduce((sum, entry) => sum + entry.prisons, 0);

  const monthlyPursuits = monthEntries
    .filter(
      (entry) =>
        selectedOfficerId === "todos" ||
        entry.officerId === selectedOfficerId
    )
    .reduce((sum, entry) => sum + entry.pursuits, 0);

  const prisons =
    mode === "mensal"
      ? monthlyPrisons
      : weeklyPrisons;

  const pursuits =
    mode === "mensal"
      ? monthlyPursuits
      : weeklyPursuits;

  const total = prisons + pursuits;

  const approvedRecords = periodDiscordRecords.filter(
    (record) => record.status === "Aprovado"
  ).length;

  const pendingRecords = periodDiscordRecords.filter(
    (record) => record.status === "Pendente"
  ).length;

  const rejectedRecords = periodDiscordRecords.filter(
    (record) => record.status === "Rejeitado"
  ).length;

  const metGoals = reportMetrics.filter(
    (metric) => metric.situation === "META ATINGIDA"
  ).length;

  const noEntries = reportMetrics.filter(
    (metric) => metric.situation === "SEM REGISTRO"
  ).length;

  const averageProgress =
    reportMetrics.length > 0
      ? Math.round(
          reportMetrics.reduce(
            (sum, metric) =>
              sum + Math.round(metric.progress * 100),
            0
          ) / reportMetrics.length
        )
      : 0;

  const ranking = [...reportMetrics]
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      return a.name.localeCompare(b.name, "pt-BR");
    })
    .slice(0, 8);

  const reportTitle =
    mode === "mensal"
      ? `Relatório mensal — ${MONTHS[month - 1]} de ${year}`
      : mode === "oficial"
        ? `Relatório individual — ${
            selectedOfficer?.name ?? "Selecione um integrante"
          }`
        : `Relatório semanal — Semana ${week}`;

  const reportSubtitle =
    mode === "mensal"
      ? "Visão consolidada do mês selecionado."
      : mode === "oficial"
        ? "Desempenho individual do integrante selecionado."
        : `Resumo operacional da Semana ${week} de ${
            MONTHS[month - 1]
          }.`;

  function handleExportCsv() {
    const header = [
      "Matrícula",
      "Nome",
      "Cargo",
      "Status",
      "Prisões",
      "Acompanhamentos",
      "Total",
      "Situação",
      "Progresso"
    ];

    const rows = reportMetrics.map((metric) => [
      metric.registration,
      metric.name,
      metric.role,
      metric.status,
      metric.prisons,
      metric.pursuits,
      metric.total,
      metric.situation,
      `${Math.round(metric.progress * 100)}%`
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(";"))
      .join("\n");

    const suffix =
      mode === "mensal"
        ? `${year}-${String(month).padStart(2, "0")}`
        : `${year}-${String(month).padStart(2, "0")}-s${week}`;

    downloadFile(
      `gam-relatorio-${mode}-${suffix}.csv`,
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8"
    );
  }

  function handleExportText() {
    const lines = [
      "GAM ANALYTICS",
      reportTitle,
      "",
      `Prisões: ${prisons}`,
      `Acompanhamentos: ${pursuits}`,
      `Total operacional: ${total}`,
      `Metas atingidas: ${metGoals}`,
      `Sem registro: ${noEntries}`,
      `Progresso médio: ${averageProgress}%`,
      `Comprovações aprovadas: ${approvedRecords}`,
      `Comprovações pendentes: ${pendingRecords}`,
      `Comprovações rejeitadas: ${rejectedRecords}`,
      "",
      "Ranking:",
      ...ranking.map(
        (metric, index) =>
          `${index + 1}. ${metric.name} — ${metric.total} atividade(s) — ${metric.situation}`
      )
    ];

    downloadFile(
      `gam-relatorio-${mode}.txt`,
      lines.join("\n"),
      "text/plain;charset=utf-8"
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <SectionTitle
          eyebrow="Relatórios operacionais"
          title="Relatórios"
          description="Resumo semanal, mensal e individual pronto para análise e apresentação."
        />

        <div className={styles.periodFilters}>
          <Select
            aria-label="Selecionar mês"
            value={month}
            options={MONTHS.map((label, index) => ({
              value: index + 1,
              label
            }))}
            onChange={(event) =>
              onMonthChange(Number(event.target.value))
            }
          />

          <Select
            aria-label="Selecionar semana"
            value={week}
            options={WEEKS.map((value) => ({
              value,
              label: `Semana ${value}`
            }))}
            onChange={(event) =>
              onWeekChange(Number(event.target.value))
            }
            disabled={mode === "mensal"}
          />
        </div>
      </div>

      <Card className={styles.toolbar}>
        <div className={styles.modeTabs}>
          <button
            type="button"
            className={mode === "semanal" ? styles.active : ""}
            onClick={() => setMode("semanal")}
          >
            Semanal
          </button>

          <button
            type="button"
            className={mode === "mensal" ? styles.active : ""}
            onClick={() => setMode("mensal")}
          >
            Mensal
          </button>

          <button
            type="button"
            className={mode === "oficial" ? styles.active : ""}
            onClick={() => setMode("oficial")}
          >
            Por oficial
          </button>
        </div>

        <div className={styles.toolbarActions}>
          {mode === "oficial" && (
            <Select
              aria-label="Selecionar integrante"
              value={selectedOfficerId}
              options={[
                {
                  value: "todos",
                  label: "Selecione um integrante"
                },
                ...officers.map((officer) => ({
                  value: officer.id,
                  label: `${officer.registration} — ${officer.name}`
                }))
              ]}
              onChange={(event) =>
                setSelectedOfficerId(event.target.value)
              }
            />
          )}

          <Button
            variant="secondary"
            onClick={handleExportText}
          >
            Exportar resumo
          </Button>

          <Button onClick={handleExportCsv}>
            Exportar CSV
          </Button>
        </div>
      </Card>

      <section className={styles.summary}>
        <Card tone="blue" className={styles.summaryCard}>
          <span>Prisões</span>
          <strong>{prisons}</strong>
          <small>{reportTitle}</small>
        </Card>

        <Card tone="green" className={styles.summaryCard}>
          <span>Acompanhamentos</span>
          <strong>{pursuits}</strong>
          <small>{reportTitle}</small>
        </Card>

        <Card tone="blue" className={styles.summaryCard}>
          <span>Total operacional</span>
          <strong>{total}</strong>
          <small>Prisões + acompanhamentos</small>
        </Card>

        <Card
          tone={noEntries > 0 ? "yellow" : "green"}
          className={styles.summaryCard}
        >
          <span>Sem registro</span>
          <strong>{noEntries}</strong>
          <small>
            {noEntries > 0
              ? "Necessitam acompanhamento"
              : "Efetivo regularizado"}
          </small>
        </Card>
      </section>

      <section className={styles.mainGrid}>
        <Card className={styles.reportCard}>
          <div className={styles.reportHeader}>
            <div>
              <span>Resumo para comando</span>
              <h3>{reportTitle}</h3>
              <p>{reportSubtitle}</p>
            </div>

            <Badge tone="blue" size="sm">
              {mode === "mensal"
                ? "Mensal"
                : mode === "oficial"
                  ? "Individual"
                  : "Semanal"}
            </Badge>
          </div>

          <div className={styles.reportBody}>
            <div className={styles.reportMetric}>
              <span>Progresso médio</span>
              <strong>{averageProgress}%</strong>
              <Progress
                value={averageProgress}
                size="sm"
                tone="blue"
              />
            </div>

            <div className={styles.reportList}>
              <article>
                <span>Metas atingidas</span>
                <strong>{metGoals}</strong>
              </article>

              <article>
                <span>Comprovações aprovadas</span>
                <strong>{approvedRecords}</strong>
              </article>

              <article>
                <span>Comprovações pendentes</span>
                <strong>{pendingRecords}</strong>
              </article>

              <article>
                <span>Comprovações rejeitadas</span>
                <strong>{rejectedRecords}</strong>
              </article>
            </div>
          </div>
        </Card>

        <Card className={styles.individualCard}>
          <div className={styles.reportHeader}>
            <div>
              <span>Destaque individual</span>
              <h3>
                {selectedMetric?.name ??
                  ranking[0]?.name ??
                  "Sem dados"}
              </h3>
              <p>
                {selectedMetric
                  ? selectedMetric.registration
                  : ranking[0]?.registration ?? "—"}
              </p>
            </div>
          </div>

          {selectedMetric || ranking[0] ? (
            (() => {
              const metric =
                selectedMetric ?? ranking[0];

              return (
                <div className={styles.featuredOfficer}>
                  <div>
                    <span>Prisões</span>
                    <strong>{metric.prisons}</strong>
                  </div>

                  <div>
                    <span>Acompanhamentos</span>
                    <strong>{metric.pursuits}</strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>{metric.total}</strong>
                  </div>

                  <Badge
                    tone={situationTone(metric.situation)}
                    size="sm"
                  >
                    {metric.situation}
                  </Badge>
                </div>
              );
            })()
          ) : (
            <EmptyState
              compact
              title="Sem dados individuais"
              description="Selecione outro período ou integrante."
            />
          )}
        </Card>
      </section>

      <Card className={styles.rankingCard}>
        <div className={styles.rankingHeader}>
          <div>
            <span>Desempenho do efetivo</span>
            <h3>Ranking do período</h3>
            <small>
              {reportMetrics.length} integrante(s) no relatório
            </small>
          </div>
        </div>

        {ranking.length === 0 ? (
          <EmptyState
            title="Nenhum dado disponível"
            description="Não existem métricas para o período selecionado."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Integrante</th>
                  <th>Prisões</th>
                  <th>Acompanhamentos</th>
                  <th>Total</th>
                  <th>Progresso</th>
                  <th>Situação</th>
                </tr>
              </thead>

              <tbody>
                {ranking.map((metric, index) => (
                  <tr key={metric.id}>
                    <td>
                      <strong>#{index + 1}</strong>
                    </td>

                    <td>
                      <strong>{metric.name}</strong>
                      <small>
                        {metric.registration} • {metric.role}
                      </small>
                    </td>

                    <td>{metric.prisons}</td>
                    <td>{metric.pursuits}</td>
                    <td>
                      <strong>{metric.total}</strong>
                    </td>

                    <td>
                      <div className={styles.tableProgress}>
                        <Progress
                          value={Math.round(
                            metric.progress * 100
                          )}
                          size="sm"
                          tone={
                            metric.situation === "META ATINGIDA"
                              ? "green"
                              : metric.situation === "SEM REGISTRO"
                                ? "red"
                                : "yellow"
                          }
                        />
                        <span>
                          {Math.round(metric.progress * 100)}%
                        </span>
                      </div>
                    </td>

                    <td>
                      <Badge
                        tone={situationTone(metric.situation)}
                        size="sm"
                      >
                        {metric.situation}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default ReportsModule;
