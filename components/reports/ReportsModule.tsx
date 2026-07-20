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

type ReportMode =
  | "semanal"
  | "mensal"
  | "oficial";

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
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function clampProgress(value?: number | null) {
  const progress = Number(value);

  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(progress * 100))
  );
}

function safeQuantity(value: unknown) {
  const quantity = Number(value);

  return Number.isFinite(quantity)
    ? quantity
    : 0;
}

function situationTone(
  situation: OfficerMetrics["situation"]
) {
  if (situation === "META ATINGIDA") {
    return "green";
  }

  if (situation === "SEM REGISTRO") {
    return "red";
  }

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

  const selectedOfficer = useMemo(
    () =>
      officers.find(
        (officer) =>
          officer.id === selectedOfficerId
      ),
    [officers, selectedOfficerId]
  );

  const selectedMetric = useMemo(
    () =>
      metrics.find(
        (metric) =>
          metric.id === selectedOfficerId
      ),
    [metrics, selectedOfficerId]
  );

  const monthEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        entry.year === year &&
        entry.month === month
    );
  }, [entries, month, year]);

  const periodDiscordRecords = useMemo(() => {
    return discordRecords.filter(
      (record) =>
        record.year === year &&
        record.month === month &&
        (mode === "mensal" ||
          record.week === week) &&
        (selectedOfficerId === "todos" ||
          record.officerId === selectedOfficerId)
    );
  }, [
    discordRecords,
    mode,
    month,
    selectedOfficerId,
    week,
    year
  ]);

  const reportMetrics = useMemo(() => {
    return metrics.filter(
      (metric) =>
        selectedOfficerId === "todos" ||
        metric.id === selectedOfficerId
    );
  }, [metrics, selectedOfficerId]);

  const monthlyEntries = useMemo(() => {
    return monthEntries.filter(
      (entry) =>
        selectedOfficerId === "todos" ||
        entry.officerId === selectedOfficerId
    );
  }, [monthEntries, selectedOfficerId]);

  const reportSummary = useMemo(() => {
    const weeklyPrisons = reportMetrics.reduce(
      (sum, metric) =>
        sum + safeQuantity(metric.prisons),
      0
    );

    const weeklyPursuits = reportMetrics.reduce(
      (sum, metric) =>
        sum + safeQuantity(metric.pursuits),
      0
    );

    const monthlyPrisons = monthlyEntries.reduce(
      (sum, entry) =>
        sum + safeQuantity(entry.prisons),
      0
    );

    const monthlyPursuits = monthlyEntries.reduce(
      (sum, entry) =>
        sum + safeQuantity(entry.pursuits),
      0
    );

    const prisons =
      mode === "mensal"
        ? monthlyPrisons
        : weeklyPrisons;

    const pursuits =
      mode === "mensal"
        ? monthlyPursuits
        : weeklyPursuits;

    const approvedRecords =
      periodDiscordRecords.filter(
        (record) =>
          record.status === "Aprovado"
      ).length;

    const pendingRecords =
      periodDiscordRecords.filter(
        (record) =>
          record.status === "Pendente"
      ).length;

    const rejectedRecords =
      periodDiscordRecords.filter(
        (record) =>
          record.status === "Rejeitado"
      ).length;

    const metGoals = reportMetrics.filter(
      (metric) =>
        metric.situation === "META ATINGIDA"
    ).length;

    const noEntries = reportMetrics.filter(
      (metric) =>
        metric.situation === "SEM REGISTRO"
    ).length;

    const averageProgress =
      reportMetrics.length > 0
        ? Math.round(
            reportMetrics.reduce(
              (sum, metric) =>
                sum +
                clampProgress(metric.progress),
              0
            ) / reportMetrics.length
          )
        : 0;

    return {
      prisons,
      pursuits,
      total: prisons + pursuits,
      approvedRecords,
      pendingRecords,
      rejectedRecords,
      metGoals,
      noEntries,
      averageProgress
    };
  }, [
    mode,
    monthlyEntries,
    periodDiscordRecords,
    reportMetrics
  ]);

  const ranking = useMemo(() => {
    return [...reportMetrics]
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.name.localeCompare(
          b.name,
          "pt-BR"
        );
      })
      .slice(0, 8);
  }, [reportMetrics]);

  const featuredMetric =
    selectedMetric ?? ranking[0];

  const reportTitle =
    mode === "mensal"
      ? `Relatório mensal — ${
          MONTHS[month - 1] ?? "Mês"
        } de ${year}`
      : mode === "oficial"
        ? `Relatório individual — ${
            selectedOfficer?.name ??
            "Selecione um integrante"
          }`
        : `Relatório semanal — Semana ${week}`;

  const reportSubtitle =
    mode === "mensal"
      ? "Visão consolidada do mês selecionado."
      : mode === "oficial"
        ? "Desempenho individual do integrante selecionado."
        : `Resumo operacional da Semana ${week} de ${
            MONTHS[month - 1] ?? "mês selecionado"
          }.`;

  function handleModeChange(
    nextMode: ReportMode
  ) {
    setMode(nextMode);

    if (nextMode !== "oficial") {
      setSelectedOfficerId("todos");
    }
  }

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

    const rows = reportMetrics.map(
      (metric) => [
        metric.registration,
        metric.name,
        metric.role,
        metric.status,
        metric.prisons,
        metric.pursuits,
        metric.total,
        metric.situation,
        `${clampProgress(metric.progress)}%`
      ]
    );

    const csv = [header, ...rows]
      .map((row) =>
        row.map(csvCell).join(";")
      )
      .join("\n");

    const suffix =
      mode === "mensal"
        ? `${year}-${String(month).padStart(
            2,
            "0"
          )}`
        : `${year}-${String(month).padStart(
            2,
            "0"
          )}-s${week}`;

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
      `Prisões: ${reportSummary.prisons}`,
      `Acompanhamentos: ${reportSummary.pursuits}`,
      `Total operacional: ${reportSummary.total}`,
      `Metas atingidas: ${reportSummary.metGoals}`,
      `Sem registro: ${reportSummary.noEntries}`,
      `Progresso médio: ${reportSummary.averageProgress}%`,
      `Comprovações aprovadas: ${reportSummary.approvedRecords}`,
      `Comprovações pendentes: ${reportSummary.pendingRecords}`,
      `Comprovações rejeitadas: ${reportSummary.rejectedRecords}`,
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
            options={MONTHS.map(
              (label, index) => ({
                value: index + 1,
                label
              })
            )}
            onChange={(event) =>
              onMonthChange(
                Number(event.target.value)
              )
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
              onWeekChange(
                Number(event.target.value)
              )
            }
            disabled={mode === "mensal"}
          />
        </div>
      </div>

      <Card className={styles.toolbar}>
        <div
          className={styles.modeTabs}
          role="tablist"
          aria-label="Tipo de relatório"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "semanal"}
            className={
              mode === "semanal"
                ? styles.active
                : ""
            }
            onClick={() =>
              handleModeChange("semanal")
            }
          >
            Semanal
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "mensal"}
            className={
              mode === "mensal"
                ? styles.active
                : ""
            }
            onClick={() =>
              handleModeChange("mensal")
            }
          >
            Mensal
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "oficial"}
            className={
              mode === "oficial"
                ? styles.active
                : ""
            }
            onClick={() =>
              handleModeChange("oficial")
            }
          >
            Por oficial
          </button>
        </div>

        <div className={styles.toolbarActions}>
          {mode === "oficial" ? (
            <Select
              aria-label="Selecionar integrante"
              value={selectedOfficerId}
              options={[
                {
                  value: "todos",
                  label:
                    "Selecione um integrante"
                },
                ...officers.map(
                  (officer) => ({
                    value: officer.id,
                    label: `${officer.registration} — ${officer.name}`
                  })
                )
              ]}
              onChange={(event) =>
                setSelectedOfficerId(
                  event.target.value
                )
              }
            />
          ) : null}

          <Button
            variant="secondary"
            onClick={handleExportText}
            disabled={reportMetrics.length === 0}
          >
            Exportar resumo
          </Button>

          <Button
            onClick={handleExportCsv}
            disabled={reportMetrics.length === 0}
          >
            Exportar CSV
          </Button>
        </div>
      </Card>

      <section
        className={styles.summary}
        aria-label="Resumo do relatório"
      >
        <Card
          tone="blue"
          className={styles.summaryCard}
        >
          <span>Prisões</span>
          <strong>
            {reportSummary.prisons}
          </strong>
          <small>{reportTitle}</small>
        </Card>

        <Card
          tone="green"
          className={styles.summaryCard}
        >
          <span>Acompanhamentos</span>
          <strong>
            {reportSummary.pursuits}
          </strong>
          <small>{reportTitle}</small>
        </Card>

        <Card
          tone="blue"
          className={styles.summaryCard}
        >
          <span>Total operacional</span>
          <strong>
            {reportSummary.total}
          </strong>
          <small>
            Prisões + acompanhamentos
          </small>
        </Card>

        <Card
          tone={
            reportSummary.noEntries > 0
              ? "yellow"
              : "green"
          }
          className={styles.summaryCard}
        >
          <span>Sem registro</span>
          <strong>
            {reportSummary.noEntries}
          </strong>
          <small>
            {reportSummary.noEntries > 0
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
              <strong>
                {reportSummary.averageProgress}%
              </strong>
              <Progress
                value={
                  reportSummary.averageProgress
                }
                size="sm"
                tone="blue"
              />
            </div>

            <div className={styles.reportList}>
              <article>
                <span>Metas atingidas</span>
                <strong>
                  {reportSummary.metGoals}
                </strong>
              </article>

              <article>
                <span>
                  Comprovações aprovadas
                </span>
                <strong>
                  {
                    reportSummary.approvedRecords
                  }
                </strong>
              </article>

              <article>
                <span>
                  Comprovações pendentes
                </span>
                <strong>
                  {
                    reportSummary.pendingRecords
                  }
                </strong>
              </article>

              <article>
                <span>
                  Comprovações rejeitadas
                </span>
                <strong>
                  {
                    reportSummary.rejectedRecords
                  }
                </strong>
              </article>
            </div>
          </div>
        </Card>

        <Card className={styles.individualCard}>
          <div className={styles.reportHeader}>
            <div>
              <span>Destaque individual</span>
              <h3>
                {featuredMetric?.name ??
                  "Sem dados"}
              </h3>
              <p>
                {featuredMetric?.registration ??
                  "—"}
              </p>
            </div>
          </div>

          {featuredMetric ? (
            <div className={styles.featuredOfficer}>
              <div>
                <span>Prisões</span>
                <strong>
                  {featuredMetric.prisons}
                </strong>
              </div>

              <div>
                <span>Acompanhamentos</span>
                <strong>
                  {featuredMetric.pursuits}
                </strong>
              </div>

              <div>
                <span>Total</span>
                <strong>
                  {featuredMetric.total}
                </strong>
              </div>

              <Badge
                tone={situationTone(
                  featuredMetric.situation
                )}
                size="sm"
              >
                {featuredMetric.situation}
              </Badge>
            </div>
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
              {reportMetrics.length} integrante(s)
              no relatório
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
                {ranking.map(
                  (metric, index) => {
                    const progress =
                      clampProgress(
                        metric.progress
                      );

                    return (
                      <tr key={metric.id}>
                        <td>
                          <strong>
                            #{index + 1}
                          </strong>
                        </td>

                        <td>
                          <strong>
                            {metric.name}
                          </strong>
                          <small>
                            {metric.registration}
                            {" • "}
                            {metric.role}
                          </small>
                        </td>

                        <td>
                          {metric.prisons}
                        </td>

                        <td>
                          {metric.pursuits}
                        </td>

                        <td>
                          <strong>
                            {metric.total}
                          </strong>
                        </td>

                        <td>
                          <div
                            className={
                              styles.tableProgress
                            }
                          >
                            <Progress
                              value={progress}
                              size="sm"
                              tone={
                                metric.situation ===
                                "META ATINGIDA"
                                  ? "green"
                                  : metric.situation ===
                                      "SEM REGISTRO"
                                    ? "red"
                                    : "yellow"
                              }
                            />
                            <span>
                              {progress}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <Badge
                            tone={situationTone(
                              metric.situation
                            )}
                            size="sm"
                          >
                            {metric.situation}
                          </Badge>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default ReportsModule;
