import type { WeeklyEntry } from "@/lib/types";
import { calculateGamSyncDelta } from "./parser";
import type {
  GamSyncDiscordMessage,
  GamSyncMappedEntry,
  GamSyncOfficerReference,
  GamSyncParsedReport
} from "./types";

const MAX_ACTIVITY_VALUE = 9999;

export interface GamSyncMapperContext {
  message: GamSyncDiscordMessage;
  report: GamSyncParsedReport;
  officer: GamSyncOfficerReference;
  year: number;
  month: number;
  week: number;
  previousPrisons?: number;
  previousPursuits?: number;
}

function normalizeCounter(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      MAX_ACTIVITY_VALUE,
      Math.trunc(value)
    )
  );
}

function normalizeText(
  value: string | null | undefined
) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePeriodValue(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);

  if (
    normalized < minimum ||
    normalized > maximum
  ) {
    return fallback;
  }

  return normalized;
}

function getAttachmentUrls(
  message: GamSyncDiscordMessage
) {
  const urls = message.attachments
    .map((attachment) =>
      normalizeText(
        attachment.url ??
          attachment.proxyUrl
      )
    )
    .filter(Boolean);

  return Array.from(new Set(urls));
}

function buildWeeklyEntryNote(
  qru: string,
  messageId: string,
  prisonDelta: number,
  pursuitDelta: number
) {
  const activityParts: string[] = [];

  if (prisonDelta > 0) {
    activityParts.push(
      `${prisonDelta} ${
        prisonDelta === 1
          ? "prisão"
          : "prisões"
      }`
    );
  }

  if (pursuitDelta > 0) {
    activityParts.push(
      `${pursuitDelta} ${
        pursuitDelta === 1
          ? "acompanhamento"
          : "acompanhamentos"
      }`
    );
  }

  const activitySummary =
    activityParts.length > 0
      ? activityParts.join(" e ")
      : "sem novo avanço";

  return [
    `QRU: ${qru || "N/D"}`,
    `Discord: ${messageId}`,
    `Lançamento: ${activitySummary}`
  ].join(" | ");
}

export function mapDiscordReportToEntry(
  context: GamSyncMapperContext
): {
  mapped: GamSyncMappedEntry;
  weeklyEntry: WeeklyEntry;
} {
  const {
    message,
    report,
    officer,
    year,
    month,
    week,
    previousPrisons = 0,
    previousPursuits = 0
  } = context;

  const messageId =
    normalizeText(message.messageId);

  const channelId =
    normalizeText(message.channelId);

  const officerId =
    normalizeText(officer.officerId);

  const discordId =
    normalizeText(officer.discordId);

  const qru =
    normalizeText(report.qru);

  const prisonCurrent =
    normalizeCounter(
      report.prisonCurrent
    );

  const pursuitCurrent =
    normalizeCounter(
      report.pursuitCurrent
    );

  const prisonGoal =
    normalizeCounter(
      report.prisonGoal
    );

  const pursuitGoal =
    normalizeCounter(
      report.pursuitGoal
    );

  const normalizedPreviousPrisons =
    normalizeCounter(previousPrisons);

  const normalizedPreviousPursuits =
    normalizeCounter(previousPursuits);

  const prisonDelta =
    report.hasPrison
      ? calculateGamSyncDelta(
          prisonCurrent,
          normalizedPreviousPrisons
        )
      : 0;

  const pursuitDelta =
    report.hasPursuit
      ? calculateGamSyncDelta(
          pursuitCurrent,
          normalizedPreviousPursuits
        )
      : 0;

  const normalizedYear =
    normalizePeriodValue(
      year,
      2000,
      9999,
      new Date().getFullYear()
    );

  const normalizedMonth =
    normalizePeriodValue(
      month,
      1,
      12,
      new Date().getMonth() + 1
    );

  const normalizedWeek =
    normalizePeriodValue(
      week,
      1,
      6,
      1
    );

  const mapped: GamSyncMappedEntry = {
    source: "discord",
    externalMessageId: messageId,
    externalChannelId: channelId,
    officerId,
    discordId,
    qru,
    activityDate: report.activityDate,
    prisons: prisonCurrent,
    pursuits: pursuitCurrent,
    prisonGoal,
    pursuitGoal,
    prisonDelta,
    pursuitDelta,
    attachmentUrls:
      getAttachmentUrls(message),
    rawContent: report.rawContent,
    createdAt: message.createdAt
  };

  const weeklyEntry: WeeklyEntry = {
    id: `discord-${messageId}`,
    officerId,
    year: normalizedYear,
    month: normalizedMonth,
    week: normalizedWeek,
    prisons: prisonDelta,
    pursuits: pursuitDelta,
    note: buildWeeklyEntryNote(
      qru,
      messageId,
      prisonDelta,
      pursuitDelta
    )
  };

  return {
    mapped,
    weeklyEntry
  };
}
