"use client";

import { useMemo, useState } from "react";
import { MONTHS, WEEKS } from "@/lib/constants";
import type {
  DiscordActivityType,
  DiscordQru,
  DiscordRecord,
  Officer,
  WeeklyEntry
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Select } from "@/components/ui/Select";

import styles from "./OperationsModule.module.css";

const QRU_CATEGORIES = [
  "caixa eletronico",
  "Banco Central",
  "Joalheria",
  "Registradora",
  "Caixa de Luz",
  "Corrida Ilegal",
  "Los Santos",
  "Outra"
] as const satisfies readonly DiscordQru[];

type QruCategory = (typeof QRU_CATEGORIES)[number];
type TypeFilter = "todos" | DiscordActivityType;
type StatusFilter = "todos" | DiscordRecord["status"];
type QruFilter = "todas" | QruCategory | "caixa eletronico";

export interface OperationsModuleProps {
  entries: WeeklyEntry[];
  records: DiscordRecord[];
  officers: Officer[];
  month: number;
  week: number;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getRecordQru(
  record: DiscordRecord
): QruCategory | "caixa eletronico" {
  if (record.activityType !== "Acompanhamento") {
    return "caixa eletronico";
  }

  return record.qru ?? "caixa eletronico";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function statusTone(status: DiscordRecord["status"]) {
  if (status === "Aprovado") return "green";
  if (status === "Rejeitado") return "red";
  return "yellow";
}

export function OperationsModule({
  entries,
  records,
  officers,
  month,
  week,
  onMonthChange,
  onWeekChange
}: OperationsModuleProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("todos");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");
  const [qruFilter, setQruFilter] =
    useState<QruFilter>("todas");
  const [officerFilter, setOfficerFilter] =
    useState("todos");

  /*
   * Fonte operacional oficial:
   * activities -> WeeklyEntry[]
   *
   * Prisões, acompanhamentos e totais da semana devem sempre
   * ser calculados a partir desta coleção.
   */
  const periodEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.month === month &&
          entry.week === week
      ),
    [entries, month, week]
  );

  /*
   * Fonte de comprovação e auditoria:
   * discord_records -> DiscordRecord[]
   *
   * Mantida apenas para QRU, status, link da mensagem e
   * histórico detalhado das comprovações.
   */
  const periodRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.month === month &&
          record.week === week
      ),
    [month, records, week]
  );

  const enrichedRecords = useMemo(
    () =>
      periodRecords.map((record) => ({
        record,
        qru: getRecordQru(record),
        officer:
          officers.find(
            (officer) => officer.id === record.officerId
          ) ?? null
      })),
    [officers, periodRecords]
  );

  const filteredRecords = useMemo(() => {
    const term = normalizeText(search.trim());

    return enrichedRecords
      .filter(({ record, officer, qru }) => {
        const matchesSearch =
          !term ||
          normalizeText(
            `${officer?.name ?? ""} ${
              officer?.registration ?? ""
            } ${record.qru ?? ""} ${record.note ?? ""} ${record.discordUrl ?? ""}`
          ).includes(term);

        const matchesType =
          typeFilter === "todos" ||
          record.activityType === typeFilter;

        const matchesStatus =
          statusFilter === "todos" ||
          record.status === statusFilter;

        const matchesQru =
          qruFilter === "todas" ||
          qru === qruFilter;

        const matchesOfficer =
          officerFilter === "todos" ||
          record.officerId === officerFilter;

        return (
          matchesSearch &&
          matchesType &&
          matchesStatus &&
          matchesQru &&
          matchesOfficer
        );
      })
      .sort((a, b) =>
        String(b.record.createdAt ?? "").localeCompare(
          String(a.record.createdAt ?? "")
        )
      );
  }, [
    enrichedRecords,
    officerFilter,
    qruFilter,
    search,
    statusFilter,
    typeFilter
  ]);

  const prisonTotal = useMemo(
    () =>
      periodEntries.reduce(
        (sum, entry) => sum + entry.prisons,
        0
      ),
    [periodEntries]
  );

  const pursuitTotal = useMemo(
    () =>
      periodEntries.reduce(
        (sum, entry) => sum + entry.pursuits,
        0
      ),
    [periodEntries]
  );

  const totalWeek = prisonTotal + pursuitTotal;

  const qruStats = useMemo(
    () =>
      QRU_CATEGORIES.map((category) => ({
        category,
        total: enrichedRecords
          .filter(
            ({ record, qru }) =>
              record.activityType === "Acompanhamento" &&
              qru === category
          )
          .reduce(
            (sum, { record }) => sum + record.quantity,
            0
          )
      })),
    [enrichedRecords]
  );

  const maxQruTotal = Math.max(
    1,
    ...qruStats.map((item) => item.total)
  );

  const unidentifiedCount = useMemo(
    () =>
      enrichedRecords
        .filter(
          ({ record, qru }) =>
            record.activityType === "Acompanhamento" &&
            qru === "caixa eletronico"
        )
        .reduce(
          (sum, { record }) => sum + record.quantity,
          0
        ),
    [enrichedRecords]
  );

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <SectionTitle
          eyebrow="Controle operacional"
          title="Operações"
          description="Dados operacionais consolidados pelas atividades e comprovações sincronizadas pelo Discord."
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
          />
        </div>
      </div>

      <section className={styles.summary}>
        <Card tone="blue" className={styles.summaryCard}>
          <span>Prisões</span>
          <strong>{prisonTotal}</strong>
          <small>Total consolidado em atividades</small>
        </Card>

        <Card tone="green" className={styles.summaryCard}>
          <span>Acompanhamentos</span>
          <strong>{pursuitTotal}</strong>
          <small>Total consolidado em atividades</small>
        </Card>

        <Card tone="blue" className={styles.summaryCard}>
          <span>Total da semana</span>
          <strong>{totalWeek}</strong>
          <small>Prisões + acompanhamentos</small>
        </Card>

        <Card
          tone={unidentifiedCount > 0 ? "yellow" : "green"}
          className={styles.summaryCard}
        >
          <span>QRU não identificada</span>
          <strong>{unidentifiedCount}</strong>
          <small>
            {unidentifiedCount > 0
              ? "Revisar a QRU da comprovação"
              : "Todas as comprovações classificadas"}
          </small>
        </Card>
      </section>

      <section className={styles.topGrid}>
        <Card className={styles.qruPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Distribuição das comprovações</span>
              <h3>Acompanhamentos por QRU</h3>
            </div>

            <Badge tone="blue" size="sm">
              Semana {week}
            </Badge>
          </div>

          <div className={styles.qruList}>
            {qruStats.map((item) => {
              const width =
                item.total === 0
                  ? 0
                  : Math.max(
                      8,
                      Math.round(
                        (item.total / maxQruTotal) * 100
                      )
                    );

              return (
                <article
                  className={styles.qruItem}
                  key={item.category}
                >
                  <div className={styles.qruLine}>
                    <span>{item.category}</span>
                    <strong>{item.total}</strong>
                  </div>

                  <div className={styles.qruTrack}>
                    <span style={{ width: `${width}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </Card>

        <Card className={styles.statusPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Qualidade dos registros</span>
              <h3>Status das comprovações</h3>
            </div>
          </div>

          {(["Aprovado", "Pendente", "Rejeitado"] as const).map(
            (status) => {
              const items = periodRecords.filter(
                (record) => record.status === status
              );

              const quantity = items.reduce(
                (sum, record) => sum + record.quantity,
                0
              );

              return (
                <article
                  className={styles.statusItem}
                  key={status}
                >
                  <Badge
                    tone={statusTone(status)}
                    size="sm"
                  >
                    {status}
                  </Badge>

                  <div>
                    <strong>{items.length}</strong>
                    <small>registro(s)</small>
                  </div>

                  <b>{quantity}</b>
                </article>
              );
            }
          )}
        </Card>
      </section>

      <Card className={styles.historyCard}>
        <div className={styles.historyHeader}>
          <div>
            <span>Histórico de comprovações</span>
            <h3>Registros da semana</h3>
            <small>
              {filteredRecords.length} de {periodRecords.length} registro(s)
            </small>
          </div>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchField}>
            <span>Pesquisar</span>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Oficial, matrícula, observação ou Discord"
            />
          </label>

          <Select
            label="Tipo"
            value={typeFilter}
            options={[
              { value: "todos", label: "Todos" },
              { value: "Prisão", label: "Prisões" },
              {
                value: "Acompanhamento",
                label: "Acompanhamentos"
              }
            ]}
            onChange={(event) =>
              setTypeFilter(
                event.target.value as TypeFilter
              )
            }
          />

          <Select
            label="QRU"
            value={qruFilter}
            options={[
              { value: "todas", label: "Todas" },
              ...QRU_CATEGORIES.map((category) => ({
                value: category,
                label: category
              })),
              {
                value: "Não identificado",
                label: "Não identificada"
              }
            ]}
            onChange={(event) =>
              setQruFilter(
                event.target.value as QruFilter
              )
            }
          />

          <Select
            label="Status"
            value={statusFilter}
            options={[
              { value: "todos", label: "Todos" },
              { value: "Aprovado", label: "Aprovados" },
              { value: "Pendente", label: "Pendentes" },
              { value: "Rejeitado", label: "Rejeitados" }
            ]}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter
              )
            }
          />

          <Select
            label="Oficial"
            value={officerFilter}
            options={[
              { value: "todos", label: "Todos" },
              ...officers.map((officer) => ({
                value: officer.id,
                label: `${officer.registration} — ${officer.name}`
              }))
            ]}
            onChange={(event) =>
              setOfficerFilter(event.target.value)
            }
          />
        </div>

        {filteredRecords.length === 0 ? (
          <EmptyState
            title="Nenhuma comprovação encontrada"
            description="Ajuste os filtros ou aguarde novas sincronizações do Discord."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Oficial</th>
                  <th>Tipo</th>
                  <th>QRU</th>
                  <th>Qtd.</th>
                  <th>Status</th>
                  <th>Discord</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  ({ record, officer, qru }) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.createdAt)}</td>

                      <td>
                        <strong>
                          {officer?.name ?? "Integrante"}
                        </strong>
                        <small>
                          {officer?.registration ?? "—"}
                        </small>
                      </td>

                      <td>
                        <Badge
                          tone={
                            record.activityType === "Prisão"
                              ? "red"
                              : "blue"
                          }
                          size="sm"
                        >
                          {record.activityType}
                        </Badge>
                      </td>

                      <td>
                        {record.activityType === "Prisão"
                          ? "—"
                          : qru}
                      </td>

                      <td>
                        <strong>{record.quantity}</strong>
                      </td>

                      <td>
                        <Badge
                          tone={statusTone(record.status)}
                          size="sm"
                        >
                          {record.status}
                        </Badge>
                      </td>

                      <td>
                        <a
                          href={record.discordUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.discordLink}
                        >
                          Abrir
                        </a>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default OperationsModule;
