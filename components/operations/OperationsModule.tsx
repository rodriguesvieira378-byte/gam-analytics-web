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
  "Caixa Eletrônico",
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
type QruFilter = "todas" | QruCategory | "Não identificado";

export interface OperationsModuleProps {
  entries: WeeklyEntry[];
  records: DiscordRecord[];
  officers: Officer[];
  month: number;
  week: number;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
  onApproveRecord?: (recordId: string) => Promise<void>;
  onRejectRecord?: (recordId: string, reason: string) => Promise<void>;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getRecordQru(
  record: DiscordRecord
): QruCategory | "Não identificado" {
  if (record.activityType !== "Acompanhamento") {
    return "Não identificado";
  }

  return record.qru ?? "Não identificado";
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
  onWeekChange,
  onApproveRecord,
  onRejectRecord
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
  const [processingRecordId, setProcessingRecordId] =
    useState<string | null>(null);
  const [rejectingRecordId, setRejectingRecordId] =
    useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");

  const periodEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.month === month &&
          entry.week === week
      ),
    [entries, month, week]
  );

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
            qru === "Não identificado"
        )
        .reduce(
          (sum, { record }) => sum + record.quantity,
          0
        ),
    [enrichedRecords]
  );

  async function handleApprove(recordId: string) {
    if (!onApproveRecord || processingRecordId) return;

    setActionError("");
    setProcessingRecordId(recordId);

    try {
      await onApproveRecord(recordId);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível aprovar a comprovação."
      );
    } finally {
      setProcessingRecordId(null);
    }
  }

  function openRejectModal(recordId: string) {
    setActionError("");
    setRejectionReason("");
    setRejectingRecordId(recordId);
  }

  function closeRejectModal() {
    if (processingRecordId) return;
    setRejectingRecordId(null);
    setRejectionReason("");
    setActionError("");
  }

  async function confirmReject() {
    if (!rejectingRecordId || !onRejectRecord || processingRecordId) return;

    const reason = rejectionReason.trim();
    if (!reason) {
      setActionError("Informe o motivo da rejeição.");
      return;
    }

    setActionError("");
    setProcessingRecordId(rejectingRecordId);

    try {
      await onRejectRecord(rejectingRecordId, reason);
      setRejectingRecordId(null);
      setRejectionReason("");
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível rejeitar a comprovação."
      );
    } finally {
      setProcessingRecordId(null);
    }
  }

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
                  <th>Ações</th>
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

                      <td>
                        {record.status === "Pendente" ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                void handleApprove(record.id)
                              }
                              disabled={
                                !onApproveRecord ||
                                processingRecordId !== null
                              }
                              style={{
                                border: "1px solid rgba(34, 197, 94, 0.45)",
                                borderRadius: 8,
                                padding: "7px 10px",
                                background: "rgba(34, 197, 94, 0.12)",
                                color: "inherit",
                                cursor: "pointer"
                              }}
                            >
                              {processingRecordId === record.id
                                ? "Processando..."
                                : "Aprovar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openRejectModal(record.id)}
                              disabled={
                                !onRejectRecord ||
                                processingRecordId !== null
                              }
                              style={{
                                border: "1px solid rgba(239, 68, 68, 0.45)",
                                borderRadius: 8,
                                padding: "7px 10px",
                                background: "rgba(239, 68, 68, 0.12)",
                                color: "inherit",
                                cursor: "pointer"
                              }}
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span style={{ opacity: 0.7 }}>Concluído</span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {rejectingRecordId && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRejectModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.72)"
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-record-title"
            style={{
              width: "min(520px, 100%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 16,
              padding: 22,
              background: "#081522",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.48)"
            }}
          >
            <h3 id="reject-record-title" style={{ marginTop: 0 }}>
              Rejeitar comprovação
            </h3>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Motivo da rejeição</span>
              <textarea
                value={rejectionReason}
                onChange={(event) => {
                  setRejectionReason(event.target.value);
                  if (actionError) setActionError("");
                }}
                rows={5}
                autoFocus
                placeholder="Informe por que esta comprovação foi rejeitada."
                style={{
                  width: "100%",
                  resize: "vertical",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  borderRadius: 10,
                  padding: 12,
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "inherit",
                  font: "inherit"
                }}
              />
            </label>

            {actionError && (
              <p style={{ marginBottom: 0, color: "#f87171" }}>
                {actionError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20
              }}
            >
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={processingRecordId !== null}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmReject()}
                disabled={processingRecordId !== null}
                style={{
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  background: "rgba(239, 68, 68, 0.16)",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                {processingRecordId === rejectingRecordId
                  ? "Rejeitando..."
                  : "Rejeitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default OperationsModule;
