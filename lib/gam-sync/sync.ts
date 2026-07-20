import type { WeeklyEntry } from "@/lib/types";
import { mapDiscordReportToEntry } from "./mapper";
import { parseGamSyncReport } from "./parser";
import type {
  GamSyncDiscordMessage,
  GamSyncMappedEntry,
  GamSyncOfficerReference,
  GamSyncParsedReport,
  GamSyncProcessResult,
  GamSyncValidationIssue
} from "./types";
import { validateGamSyncReport } from "./validator";

export interface GamSyncProcessContext {
  message: GamSyncDiscordMessage;
  officers: GamSyncOfficerReference[];
  year: number;
  month: number;
  week: number;
  previousPrisons?: number;
  previousPursuits?: number;
  existingMessageIds?: string[];
  allowedChannelIds?: string[];
  requireAttachment?: boolean;
}

export interface GamSyncPipelineResult
  extends GamSyncProcessResult {
  weeklyEntry: WeeklyEntry | null;
  parsedReport: GamSyncParsedReport | null;
}

function normalizeId(
  value: string | null | undefined
) {
  return String(value ?? "")
    .replace(/^<@!?(\d+)>$/, "$1")
    .trim();
}

function findOfficerByDiscordId(
  officers: GamSyncOfficerReference[],
  discordId: string
) {
  const normalizedDiscordId =
    normalizeId(discordId);

  if (!normalizedDiscordId) {
    return null;
  }

  return (
    officers.find(
      (officer) =>
        normalizeId(officer.discordId) ===
        normalizedDiscordId
    ) ?? null
  );
}

function buildParseIssues(
  errors: string[]
): GamSyncValidationIssue[] {
  return errors.map((message, index) => ({
    code: `parse_error_${index + 1}`,
    message,
    severity: "error" as const
  }));
}

function buildUnexpectedIssue(
  error: unknown
): GamSyncValidationIssue {
  const detail =
    error instanceof Error
      ? error.message
      : "Erro desconhecido.";

  return {
    code: "pipeline_error",
    message:
      `Falha inesperada no processamento do GAM Sync: ${detail}`,
    severity: "error"
  };
}

function buildFailureResult(
  parseErrors: string[],
  validationIssues: GamSyncValidationIssue[],
  parsedReport: GamSyncParsedReport | null = null
): GamSyncPipelineResult {
  return {
    success: false,
    entry: null,
    weeklyEntry: null,
    parsedReport,
    parseErrors,
    validationIssues
  };
}

export function processGamSyncMessage(
  context: GamSyncProcessContext
): GamSyncPipelineResult {
  try {
    const {
      message,
      officers,
      year,
      month,
      week,
      previousPrisons = 0,
      previousPursuits = 0,
      existingMessageIds = [],
      allowedChannelIds = [],
      requireAttachment = true
    } = context;

    const parseResult =
      parseGamSyncReport(message.content);

    if (
      !parseResult.success ||
      !parseResult.report
    ) {
      return buildFailureResult(
        parseResult.errors,
        buildParseIssues(parseResult.errors),
        parseResult.report
      );
    }

    const officer = findOfficerByDiscordId(
      officers,
      message.authorDiscordId
    );

    const validationResult =
      validateGamSyncReport({
        message,
        parsedReport: parseResult.report,
        officer,
        previousPrisonValue:
          previousPrisons,
        previousPursuitValue:
          previousPursuits,
        existingMessageIds,
        allowedChannelIds,
        requireAttachment
      });

    if (
      !validationResult.valid ||
      !officer
    ) {
      return buildFailureResult(
        parseResult.errors,
        validationResult.issues,
        parseResult.report
      );
    }

    const { mapped, weeklyEntry } =
      mapDiscordReportToEntry({
        message,
        report: parseResult.report,
        officer,
        year,
        month,
        week,
        previousPrisons,
        previousPursuits
      });

    return {
      success: true,
      entry: mapped,
      weeklyEntry,
      parsedReport: parseResult.report,
      parseErrors: parseResult.errors,
      validationIssues:
        validationResult.issues
    };
  } catch (error) {
    return buildFailureResult(
      [],
      [buildUnexpectedIssue(error)]
    );
  }
}

export function processGamSyncMessages(
  contexts: GamSyncProcessContext[]
): GamSyncPipelineResult[] {
  const processedMessageIds =
    new Set<string>();

  for (const context of contexts) {
    for (
      const messageId of
      context.existingMessageIds ?? []
    ) {
      const normalizedId =
        normalizeId(messageId);

      if (normalizedId) {
        processedMessageIds.add(
          normalizedId
        );
      }
    }
  }

  return contexts.map((context) => {
    const result = processGamSyncMessage({
      ...context,
      existingMessageIds: Array.from(
        processedMessageIds
      )
    });

    if (result.success) {
      const messageId =
        normalizeId(
          context.message.messageId
        );

      if (messageId) {
        processedMessageIds.add(messageId);
      }
    }

    return result;
  });
}

export function getSuccessfulGamSyncEntries(
  results: GamSyncPipelineResult[]
): GamSyncMappedEntry[] {
  return results
    .filter(
      (
        result
      ): result is GamSyncPipelineResult & {
        success: true;
        entry: GamSyncMappedEntry;
      } =>
        result.success &&
        result.entry !== null
    )
    .map((result) => result.entry);
}

export function getSuccessfulWeeklyEntries(
  results: GamSyncPipelineResult[]
): WeeklyEntry[] {
  return results
    .filter(
      (
        result
      ): result is GamSyncPipelineResult & {
        success: true;
        weeklyEntry: WeeklyEntry;
      } =>
        result.success &&
        result.weeklyEntry !== null
    )
    .map((result) => result.weeklyEntry);
}

export function getFailedGamSyncResults(
  results: GamSyncPipelineResult[]
): GamSyncPipelineResult[] {
  return results.filter(
    (result) => !result.success
  );
}

export function getGamSyncWarnings(
  result: GamSyncPipelineResult
): GamSyncValidationIssue[] {
  return result.validationIssues.filter(
    (issue) =>
      issue.severity === "warning"
  );
}

export function getGamSyncErrors(
  result: GamSyncPipelineResult
): GamSyncValidationIssue[] {
  return result.validationIssues.filter(
    (issue) =>
      issue.severity === "error"
  );
}