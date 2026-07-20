"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { MONTHS, WEEKS } from "@/lib/constants";
import type {
  Officer,
  OfficerMetrics
} from "@/lib/types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Select } from "@/components/ui/Select";

import styles from "./OfficersModule.module.css";

type SituationFilter =
  | "todas"
  | "META ATINGIDA"
  | "ABAIXO DA META"
  | "SEM REGISTRO";

type StatusFilter =
  | "todos"
  | "Ativo"
  | "Inativo";

type RoleFilter =
  | "todos"
  | "Oficial GAM"
  | "Estagiário";

type GarrisonFilter =
  | "todas"
  | "Militar"
  | "Civil";

type SortMode =
  | "nome"
  | "total"
  | "prisoes"
  | "acompanhamentos";

export interface OfficersModuleProps {
  metrics: OfficerMetrics[];
  officers: Officer[];
  month: number;
  week: number;
  canOperate: boolean;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
  onNewOfficer: () => void;
  onEditOfficer: (officer: Officer) => void;
  onOpenProfile: (officerId: string) => void;
}

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "GAM";
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

function getSituationTone(
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

export function OfficersModule({
  metrics,
  officers,
  month,
  week,
  canOperate,
  onMonthChange,
  onWeekChange,
  onNewOfficer,
  onEditOfficer,
  onOpenProfile
}: OfficersModuleProps) {
  const [search, setSearch] = useState("");
  const [situation, setSituation] =
    useState<SituationFilter>("todas");
  const [status, setStatus] =
    useState<StatusFilter>("todos");
  const [role, setRole] =
    useState<RoleFilter>("todos");
  const [garrison, setGarrison] =
    useState<GarrisonFilter>("todas");
  const [sortMode, setSortMode] =
    useState<SortMode>("total");

  const metricById = useMemo(() => {
    return new Map(
      metrics.map((metric) => [
        metric.id,
        metric
      ])
    );
  }, [metrics]);

  const filtered = useMemo(() => {
    const term = normalizeText(search);

    return officers
      .map((officer) => ({
        officer,
        metric: metricById.get(officer.id)
      }))
      .filter(({ officer, metric }) => {
        const searchableText = normalizeText(
          [
            officer.name,
            officer.registration,
            officer.discordUrl,
            officer.garrison
          ].join(" ")
        );

        const matchesSearch =
          !term ||
          searchableText.includes(term);

        const matchesSituation =
          situation === "todas" ||
          metric?.situation === situation;

        const matchesStatus =
          status === "todos" ||
          officer.status === status;

        const matchesRole =
          role === "todos" ||
          officer.role === role;

        const matchesGarrison =
          garrison === "todas" ||
          officer.garrison === garrison;

        return (
          matchesSearch &&
          matchesSituation &&
          matchesStatus &&
          matchesRole &&
          matchesGarrison
        );
      })
      .sort((a, b) => {
        if (sortMode === "nome") {
          return a.officer.name.localeCompare(
            b.officer.name,
            "pt-BR"
          );
        }

        const aMetric = a.metric;
        const bMetric = b.metric;

        if (sortMode === "prisoes") {
          return (
            (bMetric?.prisons ?? 0) -
            (aMetric?.prisons ?? 0)
          );
        }

        if (
          sortMode === "acompanhamentos"
        ) {
          return (
            (bMetric?.pursuits ?? 0) -
            (aMetric?.pursuits ?? 0)
          );
        }

        const totalDifference =
          (bMetric?.total ?? 0) -
          (aMetric?.total ?? 0);

        if (totalDifference !== 0) {
          return totalDifference;
        }

        return a.officer.name.localeCompare(
          b.officer.name,
          "pt-BR"
        );
      });
  }, [
    garrison,
    metricById,
    officers,
    role,
    search,
    situation,
    sortMode,
    status
  ]);

  const summary = useMemo(() => {
    const activeCount = officers.filter(
      (officer) =>
        officer.status === "Ativo"
    ).length;

    const metGoals = metrics.filter(
      (metric) =>
        metric.situation === "META ATINGIDA"
    ).length;

    const noEntries = metrics.filter(
      (metric) =>
        metric.situation === "SEM REGISTRO"
    ).length;

    const averageProgress =
      metrics.length > 0
        ? Math.round(
            metrics.reduce(
              (total, metric) =>
                total +
                clampProgress(metric.progress),
              0
            ) / metrics.length
          )
        : 0;

    return {
      activeCount,
      metGoals,
      noEntries,
      averageProgress
    };
  }, [metrics, officers]);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <SectionTitle
          eyebrow="Gestão de efetivo"
          title="Efetivo G.A.M."
          description="Identidade, desempenho e situação operacional dos integrantes."
        />

        <div className={styles.headerActions}>
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
            />
          </div>

          {canOperate ? (
            <Button onClick={onNewOfficer}>
              + Novo integrante
            </Button>
          ) : null}
        </div>
      </div>

      <section
        className={styles.summary}
        aria-label="Resumo do efetivo"
      >
        <Card
          tone="blue"
          className={styles.summaryCard}
        >
          <span>Total do efetivo</span>
          <strong>{officers.length}</strong>
          <small>
            {summary.activeCount} ativo(s)
          </small>
        </Card>

        <Card
          tone="green"
          className={styles.summaryCard}
        >
          <span>Metas atingidas</span>
          <strong>{summary.metGoals}</strong>
          <small>Semana {week}</small>
        </Card>

        <Card
          tone={
            summary.noEntries > 0
              ? "red"
              : "green"
          }
          className={styles.summaryCard}
        >
          <span>Sem registro</span>
          <strong>{summary.noEntries}</strong>
          <small>
            Precisam de acompanhamento
          </small>
        </Card>

        <Card
          tone="blue"
          className={styles.summaryCard}
        >
          <span>Progresso médio</span>
          <strong>
            {summary.averageProgress}%
          </strong>
          <Progress
            value={summary.averageProgress}
            size="sm"
            tone="blue"
          />
        </Card>
      </section>

      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <label className={styles.searchField}>
            <span>Pesquisar</span>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Nome, matrícula, Discord ou guarnição"
              autoComplete="off"
            />
          </label>

          <Select
            label="Situação"
            value={situation}
            options={[
              {
                value: "todas",
                label: "Todas"
              },
              {
                value: "META ATINGIDA",
                label: "Meta atingida"
              },
              {
                value: "ABAIXO DA META",
                label: "Abaixo da meta"
              },
              {
                value: "SEM REGISTRO",
                label: "Sem registro"
              }
            ]}
            onChange={(event) =>
              setSituation(
                event.target
                  .value as SituationFilter
              )
            }
          />

          <Select
            label="Status"
            value={status}
            options={[
              {
                value: "todos",
                label: "Todos"
              },
              {
                value: "Ativo",
                label: "Ativos"
              },
              {
                value: "Inativo",
                label: "Inativos"
              }
            ]}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as StatusFilter
              )
            }
          />

          <Select
            label="Cargo"
            value={role}
            options={[
              {
                value: "todos",
                label: "Todos"
              },
              {
                value: "Oficial GAM",
                label: "Oficial GAM"
              },
              {
                value: "Estagiário",
                label: "Estagiário"
              }
            ]}
            onChange={(event) =>
              setRole(
                event.target.value as RoleFilter
              )
            }
          />

          <Select
            label="Guarnição"
            value={garrison}
            options={[
              {
                value: "todas",
                label: "Todas"
              },
              {
                value: "Militar",
                label: "Militar"
              },
              {
                value: "Civil",
                label: "Civil"
              }
            ]}
            onChange={(event) =>
              setGarrison(
                event.target
                  .value as GarrisonFilter
              )
            }
          />

          <Select
            label="Ordenar"
            value={sortMode}
            options={[
              {
                value: "total",
                label: "Total operacional"
              },
              {
                value: "prisoes",
                label: "Prisões"
              },
              {
                value: "acompanhamentos",
                label: "Acompanhamentos"
              },
              {
                value: "nome",
                label: "Nome"
              }
            ]}
            onChange={(event) =>
              setSortMode(
                event.target.value as SortMode
              )
            }
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum integrante encontrado"
            description="Ajuste os filtros para localizar o efetivo."
          />
        </Card>
      ) : (
        <section
          className={styles.grid}
          aria-label="Integrantes da G.A.M."
        >
          {filtered.map(
            ({ officer, metric }) => {
              const progress = clampProgress(
                metric?.progress
              );

              const situationValue =
                metric?.situation ??
                "SEM REGISTRO";

              return (
                <Card
                  key={officer.id}
                  tone={
                    officer.status === "Inativo"
                      ? "red"
                      : "default"
                  }
                  interactive
                  className={styles.officerCard}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ficha de ${officer.name}`}
                  onClick={() =>
                    onOpenProfile(officer.id)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      onOpenProfile(officer.id);
                    }
                  }}
                >
                  <div className={styles.identity}>
                    <div className={styles.avatar}>
                      {officer.photoUrl ? (
                        <Image
                          src={officer.photoUrl}
                          alt={`Foto de ${officer.name}`}
                          width={88}
                          height={88}
                          unoptimized
                        />
                      ) : (
                        <span>
                          {getInitials(
                            officer.name
                          )}
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        styles.identityText
                      }
                    >
                      <span>
                        {officer.registration}
                      </span>
                      <h3>{officer.name}</h3>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap"
                        }}
                      >
                        <p>{officer.role}</p>

                        <Badge
                          tone={
                            officer.garrison ===
                            "Militar"
                              ? "blue"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {officer.garrison}
                        </Badge>
                      </div>
                    </div>

                    <Badge
                      tone={
                        officer.status === "Ativo"
                          ? "green"
                          : "red"
                      }
                      size="sm"
                    >
                      {officer.status}
                    </Badge>
                  </div>

                  <div className={styles.stats}>
                    <div>
                      <span>Prisões</span>
                      <strong>
                        {metric?.prisons ?? 0}
                        <small>
                          /
                          {metric?.prisonGoal ??
                            officer.prisonGoal}
                        </small>
                      </strong>
                    </div>

                    <div>
                      <span>
                        Acompanhamentos
                      </span>
                      <strong>
                        {metric?.pursuits ?? 0}
                        <small>
                          /
                          {metric?.pursuitGoal ??
                            officer.pursuitGoal}
                        </small>
                      </strong>
                    </div>

                    <div>
                      <span>Total</span>
                      <strong>
                        {metric?.total ?? 0}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={
                      styles.progressBlock
                    }
                  >
                    <div>
                      <span>
                        Progresso semanal
                      </span>
                      <strong>
                        {progress}%
                      </strong>
                    </div>

                    <Progress
                      value={progress}
                      tone={
                        situationValue ===
                        "META ATINGIDA"
                          ? "green"
                          : situationValue ===
                              "SEM REGISTRO"
                            ? "red"
                            : "yellow"
                      }
                      size="sm"
                    />
                  </div>

                  <div
                    className={styles.situation}
                  >
                    <Badge
                      tone={getSituationTone(
                        situationValue
                      )}
                      size="sm"
                    >
                      {situationValue}
                    </Badge>

                    <small>
                      {officer.discordUrl
                        ? `Discord ${officer.discordUrl}`
                        : "Discord não informado"}
                    </small>
                  </div>

                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenProfile(officer.id);
                      }}
                    >
                      Ver ficha
                    </Button>

                    {canOperate ? (
                      <Button
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditOfficer(officer);
                        }}
                      >
                        Editar
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            }
          )}
        </section>
      )}
    </section>
  );
}

export default OfficersModule;
