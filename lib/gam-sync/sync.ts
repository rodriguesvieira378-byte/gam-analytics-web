import type { WeeklyEntry } from "@/lib/types";
import { mapDiscordReportToEntry } from "./mapper";
import { parseGamSyncReport } from "./parser";
import type {
  GamSyncDiscordMessage,
  GamSyncMappedEntry,
  GamSyncOfficerReference,
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
}

function normalizeDiscordId(value: string) {
  return value.trim();
}

function findOfficerByDiscordId(
  officers: GamSyncOfficerReference[],
  discordId: string
) {
  const normalizedDiscordId =
    normalizeDiscordId(discordId);

  return (
    officers.find(
      (officer) =>
        normalizeDiscordId(officer.discordId) ===
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

export function processGamSyncMessage(
  context: GamSyncProcessContext
): GamSyncPipelineResult {
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

  const parseResult = parseGamSyncReport(
    message.content
  );

  if (!parseResult.report) {
    return {
      success: false,
      entry: null,
      weeklyEntry: null,
      parseErrors: parseResult.errors,
      validationIssues: buildParseIssues(
        parseResult.errors
      )
    };
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
      previousPrisonValue: previousPrisons,
      previousPursuitValue: previousPursuits,
      existingMessageIds,
      allowedChannelIds,
      requireAttachment
    });

  if (!validationResult.valid || !officer) {
    return {
      success: false,
      entry: null,
      weeklyEntry: null,
      parseErrors: parseResult.errors,
      validationIssues:
        validationResult.issues
    };
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
    parseErrors: parseResult.errors,
    validationIssues:
      validationResult.issues
  };
}

export function processGamSyncMessages(
  contexts: GamSyncProcessContext[]
) {
  return contexts.map((context) =>
    processGamSyncMessage(context)
  );
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
) {
  return results.filter(
    (result) => !result.success
  );
}