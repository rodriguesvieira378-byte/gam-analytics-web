import {
  deleteGamSyncRecord,
  loadGamSyncMessageIds,
  saveGamSyncRecord,
  type GamSyncRecord,
  type SaveGamSyncRecordResult
} from "./repository";
import {
  processGamSyncMessage,
  type GamSyncPipelineResult,
  type GamSyncProcessContext
} from "./sync";
import type { GamSyncValidationIssue } from "./types";

export type GamSyncServiceStatus =
  | "processado"
  | "rejeitado"
  | "duplicado"
  | "erro";

export interface GamSyncServiceResult {
  success: boolean;
  status: GamSyncServiceStatus;
  messageId: string;
  pipeline: GamSyncPipelineResult | null;
  saved: SaveGamSyncRecordResult | null;
  validationIssues: GamSyncValidationIssue[];
  errorMessage: string | null;
}

export interface GamSyncBatchResult {
  total: number;
  processed: number;
  rejected: number;
  duplicated: number;
  failed: number;
  results: GamSyncServiceResult[];
}

function getErrorMessage(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message;
  }

  return "Erro desconhecido durante o GAM Sync.";
}

function isDuplicateError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("já foi processada") ||
    normalized.includes("duplicad") ||
    normalized.includes("duplicate")
  );
}

function buildRejectedResult(
  context: GamSyncProcessContext,
  pipeline: GamSyncPipelineResult
): GamSyncServiceResult {
  return {
    success: false,
    status: "rejeitado",
    messageId: context.message.messageId,
    pipeline,
    saved: null,
    validationIssues: pipeline.validationIssues,
    errorMessage:
      pipeline.validationIssues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join(" ") ||
      pipeline.parseErrors.join(" ") ||
      "A mensagem foi rejeitada pelo GAM Sync."
  };
}

export class GamSyncService {
  async processMessage(
    context: GamSyncProcessContext
  ): Promise<GamSyncServiceResult> {
    try {
      const existingMessageIds: string[] =
        context.existingMessageIds ??
        (await loadGamSyncMessageIds());

      const pipeline = processGamSyncMessage({
        ...context,
        existingMessageIds
      });

      if (
        !pipeline.success ||
        !pipeline.entry ||
        !pipeline.weeklyEntry
      ) {
        return buildRejectedResult(context, pipeline);
      }

      const saved = await saveGamSyncRecord({
        message: context.message,
        mappedEntry: pipeline.entry,
        weeklyEntry: pipeline.weeklyEntry,
        validationIssues: pipeline.validationIssues
      });

      return {
        success: true,
        status: "processado",
        messageId: context.message.messageId,
        pipeline,
        saved,
        validationIssues: pipeline.validationIssues,
        errorMessage: null
      };
    } catch (cause) {
      const errorMessage = getErrorMessage(cause);

      return {
        success: false,
        status: isDuplicateError(errorMessage)
          ? "duplicado"
          : "erro",
        messageId: context.message.messageId,
        pipeline: null,
        saved: null,
        validationIssues: [],
        errorMessage
      };
    }
  }

  async processBatch(
    contexts: GamSyncProcessContext[]
  ): Promise<GamSyncBatchResult> {
    const existingMessageIds: string[] =
      await loadGamSyncMessageIds();

    const processedIds = new Set(existingMessageIds);
    const results: GamSyncServiceResult[] = [];

    for (const context of contexts) {
      const result = await this.processMessage({
        ...context,
        existingMessageIds: [...processedIds]
      });

      results.push(result);

      if (result.status === "processado") {
        processedIds.add(context.message.messageId);
      }
    }

    return this.buildBatchResult(results);
  }

  buildBatchResult(
    results: GamSyncServiceResult[]
  ): GamSyncBatchResult {
    return {
      total: results.length,
      processed: results.filter(
        (result) => result.status === "processado"
      ).length,
      rejected: results.filter(
        (result) => result.status === "rejeitado"
      ).length,
      duplicated: results.filter(
        (result) => result.status === "duplicado"
      ).length,
      failed: results.filter(
        (result) => result.status === "erro"
      ).length,
      results
    };
  }

  async removeRecord(
    record: Pick<GamSyncRecord, "id">
  ) {
    await deleteGamSyncRecord(record.id);
  }
}

export const gamSyncService = new GamSyncService();
