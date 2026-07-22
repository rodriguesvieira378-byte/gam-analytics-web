"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  gamSyncService,
  type GamSyncDiscordMessage,
  type GamSyncOfficerReference,
  type GamSyncServiceResult
} from "@/lib/gam-sync";
import {
  loadGamSyncRecords,
  type GamSyncRecord
} from "@/lib/gam-sync/repository";
import type {
  Officer,
  WeeklyEntry
} from "@/lib/types";

import styles from "./GamSyncPanel.module.css";

interface GamSyncPanelProps {
  officers: Officer[];
  entries: WeeklyEntry[];
  year: number;
  month: number;
  week: number;
  onProcessed: (entry: WeeklyEntry) => void;
}

type OperationType =
  | "Prisão"
  | "Acompanhamento";

const QRU_OPTIONS = [
  "Caixa Eletrônico",
  "Banco Central",
  "Joalheria",
  "Registradora",
  "Caixa de Luz",
  "Corrida Ilegal",
  "Los Santos"
];

function normalizeDiscordId(value?: string) {
  if (!value) return "";

  const trimmed = value.trim();

  if (/^\d{10,25}$/.test(trimmed)) {
    return trimmed;
  }

  const matches = trimmed.match(/\d{10,25}/g);
  return matches?.at(-1) ?? "";
}

function buildOfficerReferences(
  officers: Officer[]
): GamSyncOfficerReference[] {
  return officers
    .map((officer) => ({
      officerId: officer.id,
      discordId: normalizeDiscordId(
        officer.discordUrl
      ),
      registration: officer.registration,
      name: officer.name,
      active: officer.status === "Ativo"
    }))
    .filter(
      (officer) => Boolean(officer.discordId)
    );
}

function getPreviousValues(
  entries: WeeklyEntry[],
  officerId: string,
  year: number,
  month: number,
  week: number
) {
  const entry = entries.find(
    (item) =>
      item.officerId === officerId &&
      item.year === year &&
      item.month === month &&
      item.week === week
  );

  return {
    previousPrisons: entry?.prisons ?? 0,
    previousPursuits: entry?.pursuits ?? 0
  };
}

function getResultMessage(
  result: GamSyncServiceResult
) {
  if (result.success) {
    return "Operação processada e lançamento semanal atualizado.";
  }

  if (result.status === "duplicado") {
    return "Esta mensagem já foi processada anteriormente.";
  }

  return (
    result.errorMessage ||
    "Não foi possível processar a operação."
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function statusLabel(
  status: GamSyncRecord["syncStatus"]
) {
  if (status === "Processado") {
    return "Processado";
  }

  if (status === "Rejeitado") {
    return "Rejeitado";
  }

  if (status === "Erro") {
    return "Erro";
  }

  return "Pendente";
}

export function GamSyncPanel({
  officers,
  entries,
  year,
  month,
  week,
  onProcessed
}: GamSyncPanelProps) {
  const [officerId, setOfficerId] =
    useState("");
  const [operationType, setOperationType] =
    useState<OperationType>("Acompanhamento");
  const [currentValue, setCurrentValue] =
    useState(1);
  const [goalValue, setGoalValue] =
    useState(12);
  const [qru, setQru] =
    useState(QRU_OPTIONS[0]);
  const [messageId, setMessageId] =
    useState("");
  const [channelId, setChannelId] =
    useState("");
  const [guildId, setGuildId] =
    useState("");
  const [attachmentUrl, setAttachmentUrl] =
    useState("");
  const [processing, setProcessing] =
    useState(false);
  const [loadingHistory, setLoadingHistory] =
    useState(false);
  const [result, setResult] =
    useState<GamSyncServiceResult | null>(null);
  const [history, setHistory] =
    useState<GamSyncRecord[]>([]);

  const officerReferences = useMemo(
    () => buildOfficerReferences(officers),
    [officers]
  );

  const selectedOfficer = useMemo(
    () =>
      officerReferences.find(
        (officer) =>
          officer.officerId === officerId
      ) ?? null,
    [officerId, officerReferences]
  );

  const generatedContent = useMemo(() => {
    const date = new Intl.DateTimeFormat(
      "pt-BR"
    ).format(new Date());

    if (operationType === "Prisão") {
      return [
        "PRISÃO",
        `DATA: ${date}`,
        `META: ${currentValue}/${goalValue}`,
        "PRINT DA PRISÃO:"
      ].join("\n");
    }

    return [
      "ACOMPANHAMENTO",
      `DATA: ${date}`,
      `META: ${currentValue}/${goalValue}`,
      `QRU: ${qru}`,
      "PRINT DA QRU:"
    ].join("\n");
  }, [
    currentValue,
    goalValue,
    operationType,
    qru
  ]);

  const summary = useMemo(() => {
    const processed = history.filter(
      (record) =>
        record.syncStatus === "Processado"
    ).length;

    const rejected = history.filter(
      (record) =>
        record.syncStatus === "Rejeitado"
    ).length;

    const failed = history.filter(
      (record) =>
        record.syncStatus === "Erro"
    ).length;

    return {
      total: history.length,
      processed,
      rejected,
      failed
    };
  }, [history]);

  async function refreshHistory() {
    setLoadingHistory(true);

    try {
      setHistory(
        await loadGamSyncRecords(50)
      );
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  useEffect(() => {
    if (operationType === "Prisão") {
      setGoalValue(4);
    } else {
      setGoalValue(12);
    }
  }, [operationType]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedOfficer) {
      setResult({
        success: false,
        status: "rejeitado",
        messageId: messageId.trim(),
        pipeline: null,
        saved: null,
        validationIssues: [],
        errorMessage:
          "Selecione um integrante com ID do Discord cadastrado."
      });

      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const previous = getPreviousValues(
        entries,
        selectedOfficer.officerId,
        year,
        month,
        week
      );

      const message: GamSyncDiscordMessage = {
        messageId: messageId.trim(),
        channelId: channelId.trim(),
        guildId:
          guildId.trim() || undefined,
        authorDiscordId:
          selectedOfficer.discordId,
        authorDisplayName:
          selectedOfficer.name,
        content: generatedContent,
        createdAt: new Date().toISOString(),
        attachments: attachmentUrl.trim()
          ? [
              {
                filename: "comprovacao.png",
                contentType: "image/png",
                url: attachmentUrl.trim()
              }
            ]
          : []
      };

      const processed =
        await gamSyncService.processMessage({
          message,
          officers: officerReferences,
          year,
          month,
          week,
          previousPrisons:
            previous.previousPrisons,
          previousPursuits:
            previous.previousPursuits,
          requireAttachment: false
        });

      setResult(processed);

      if (processed.saved?.weeklyEntry) {
        onProcessed(
          processed.saved.weeklyEntry
        );
      }

      if (processed.success) {
        setMessageId("");
        setAttachmentUrl("");
        await refreshHistory();
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <span>GAM SYNC</span>
          <h3>Processamento operacional</h3>
          <p>
            Validação, prevenção de duplicidade e
            atualização automática do lançamento semanal.
          </p>
        </div>

        <div className={styles.headerStatus}>
          <i />
          Motor online
        </div>
      </div>

      <section className={styles.summary}>
        <article>
          <span>Processados</span>
          <strong>{summary.processed}</strong>
        </article>

        <article>
          <span>Rejeitados</span>
          <strong>{summary.rejected}</strong>
        </article>

        <article>
          <span>Erros</span>
          <strong>{summary.failed}</strong>
        </article>

        <article>
          <span>Histórico</span>
          <strong>{summary.total}</strong>
        </article>
      </section>

      <div className={styles.mainGrid}>
        <form
          className={styles.formCard}
          onSubmit={handleSubmit}
        >
          <div className={styles.cardHeader}>
            <span>Nova sincronização</span>
            <h4>Registrar operação</h4>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.full}>
              <span>Integrante</span>
              <select
                value={officerId}
                onChange={(event) =>
                  setOfficerId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Selecione
                </option>

                {officerReferences.map(
                  (officer) => (
                    <option
                      key={officer.officerId}
                      value={officer.officerId}
                    >
                      {officer.registration} —{" "}
                      {officer.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>Tipo</span>
              <select
                value={operationType}
                onChange={(event) =>
                  setOperationType(
                    event.target
                      .value as OperationType
                  )
                }
              >
                <option value="Prisão">
                  Prisão
                </option>
                <option value="Acompanhamento">
                  Acompanhamento
                </option>
              </select>
            </label>

            <label>
              <span>Quantidade atual</span>
              <input
                type="number"
                min={0}
                value={currentValue}
                onChange={(event) =>
                  setCurrentValue(
                    Number(event.target.value)
                  )
                }
                required
              />
            </label>

            <label>
              <span>Meta</span>
              <input
                type="number"
                min={1}
                value={goalValue}
                onChange={(event) =>
                  setGoalValue(
                    Number(event.target.value)
                  )
                }
                required
              />
            </label>

            {operationType ===
              "Acompanhamento" && (
              <label>
                <span>QRU</span>
                <select
                  value={qru}
                  onChange={(event) =>
                    setQru(event.target.value)
                  }
                >
                  {QRU_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}

            <label>
              <span>ID da mensagem</span>
              <input
                value={messageId}
                onChange={(event) =>
                  setMessageId(
                    event.target.value
                  )
                }
                placeholder="ID único do Discord"
                required
              />
            </label>

            <label>
              <span>ID do canal</span>
              <input
                value={channelId}
                onChange={(event) =>
                  setChannelId(
                    event.target.value
                  )
                }
                placeholder="Canal autorizado"
                required
              />
            </label>

            <label>
              <span>ID do servidor</span>
              <input
                value={guildId}
                onChange={(event) =>
                  setGuildId(
                    event.target.value
                  )
                }
                placeholder="Opcional"
              />
            </label>

            <label className={styles.full}>
              <span>URL da comprovação</span>
              <input
                value={attachmentUrl}
                onChange={(event) =>
                  setAttachmentUrl(
                    event.target.value
                  )
                }
                placeholder="Link da imagem ou anexo"
              />
            </label>

            <div className={styles.full}>
              <span className={styles.previewLabel}>
                Mensagem gerada
              </span>

              <pre className={styles.preview}>
                {generatedContent}
              </pre>
            </div>

            {officers.length > 0 &&
              officerReferences.length === 0 && (
              <div
                className={`${styles.alert} ${styles.error} ${styles.full}`}
              >
                Nenhum integrante possui ID do
                Discord cadastrado.
              </div>
            )}

            <button
              className={`${styles.primaryButton} ${styles.full}`}
              type="submit"
              disabled={
                processing ||
                officerReferences.length === 0
              }
            >
              {processing
                ? "Processando..."
                : "Processar operação"}
            </button>
          </div>

          {result && (
            <div
              className={[
                styles.result,
                result.success
                  ? styles.success
                  : styles.error
              ].join(" ")}
            >
              <strong>
                {getResultMessage(result)}
              </strong>

              {result.validationIssues
                .length > 0 && (
                <ul>
                  {result.validationIssues.map(
                    (issue) => (
                      <li
                        key={`${issue.code}-${issue.field ?? "geral"}`}
                      >
                        {issue.message}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}
        </form>

        <section className={styles.historyCard}>
          <div className={styles.historyHeader}>
            <div>
              <span>Monitoramento</span>
              <h4>Últimas sincronizações</h4>
            </div>

            <button
              type="button"
              onClick={() =>
                void refreshHistory()
              }
              disabled={loadingHistory}
            >
              {loadingHistory
                ? "Atualizando..."
                : "Atualizar"}
            </button>
          </div>

          {history.length === 0 ? (
            <div className={styles.empty}>
              Nenhuma sincronização registrada.
            </div>
          ) : (
            <div className={styles.historyList}>
              {history
                .slice(0, 10)
                .map((record) => {
                  const officer =
                    officers.find(
                      (item) =>
                        item.id ===
                        record.officerId
                    );

                  return (
                    <article key={record.id}>
                      <div>
                        <strong>
                          {officer?.name ??
                            "Integrante"}
                        </strong>
                        <small>
                          {record.qru ||
                            "Sem QRU"}{" "}
                          •{" "}
                          {formatDate(
                            record.processedAt
                          )}
                        </small>
                      </div>

                      <span
                        className={
                          record.syncStatus ===
                          "Processado"
                            ? styles.statusSuccess
                            : record.syncStatus ===
                                "Erro"
                              ? styles.statusError
                              : styles.statusWarning
                        }
                      >
                        {statusLabel(
                          record.syncStatus
                        )}
                      </span>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default GamSyncPanel;
