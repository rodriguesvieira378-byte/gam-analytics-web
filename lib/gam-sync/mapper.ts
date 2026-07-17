import type { WeeklyEntry } from "@/lib/types";
import { calculateGamSyncDelta } from "./parser";
import type {
  GamSyncDiscordMessage,
  GamSyncMappedEntry,
  GamSyncOfficerReference,
  GamSyncParsedReport
} from "./types";

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

  const prisonDelta = calculateGamSyncDelta(
    report.prisonCurrent,
    previousPrisons
  );

  const pursuitDelta = calculateGamSyncDelta(
    report.pursuitCurrent,
    previousPursuits
  );

  const mapped: GamSyncMappedEntry = {
    source: "discord",
    externalMessageId: message.messageId,
    externalChannelId: message.channelId,
    officerId: officer.officerId,
    discordId: officer.discordId,
    qru: report.qru ?? "",
    activityDate: report.activityDate,
    prisons: report.prisonCurrent,
    pursuits: report.pursuitCurrent,
    prisonGoal: report.prisonGoal,
    pursuitGoal: report.pursuitGoal,
    prisonDelta,
    pursuitDelta,
    attachmentUrls: message.attachments
      .map(
        (attachment) =>
          attachment.url ?? attachment.proxyUrl
      )
      .filter(
        (url): url is string => Boolean(url)
      ),
    rawContent: report.rawContent,
    createdAt: message.createdAt
  };

  const weeklyEntry: WeeklyEntry = {
    id: `discord-${message.messageId}`,
    officerId: officer.officerId,
    year,
    month,
    week,
    prisons: report.prisonCurrent,
    pursuits: report.pursuitCurrent,
    note: `QRU: ${report.qru ?? "N/D"} | Origem: Discord`
  };

  return {
    mapped,
    weeklyEntry
  };
}