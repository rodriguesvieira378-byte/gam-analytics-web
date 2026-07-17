export type GamSyncActivityType =
  | "Acompanhamento"
  | "Prisão";

export type GamSyncValidationSeverity =
  | "error"
  | "warning";

export interface GamSyncActivityProgress {
  type: GamSyncActivityType;
  current: number;
  goal: number;
}

export interface GamSyncAttachment {
  id?: string;
  filename: string;
  contentType?: string;
  url?: string;
  proxyUrl?: string;
  size?: number;
}

export interface GamSyncDiscordMessage {
  messageId: string;
  channelId: string;
  guildId?: string;
  authorDiscordId: string;
  authorDisplayName?: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  attachments: GamSyncAttachment[];
}

export interface GamSyncParsedReport {
  rawContent: string;
  activities: GamSyncActivityProgress[];
  qru: string | null;
  activityDate: string | null;
  hasPursuit: boolean;
  hasPrison: boolean;
  pursuitCurrent: number;
  pursuitGoal: number;
  prisonCurrent: number;
  prisonGoal: number;
}

export interface GamSyncParseResult {
  success: boolean;
  report: GamSyncParsedReport | null;
  errors: string[];
}

export interface GamSyncValidationIssue {
  code: string;
  message: string;
  severity: GamSyncValidationSeverity;
  field?: string;
}

export interface GamSyncOfficerReference {
  officerId: string;
  discordId: string;
  registration: string;
  name: string;
  active: boolean;
}

export interface GamSyncValidationContext {
  message: GamSyncDiscordMessage;
  parsedReport: GamSyncParsedReport;
  officer: GamSyncOfficerReference | null;
  previousPursuitValue?: number;
  previousPrisonValue?: number;
  existingMessageIds?: string[];
  allowedChannelIds?: string[];
  requireAttachment?: boolean;
}

export interface GamSyncValidationResult {
  valid: boolean;
  issues: GamSyncValidationIssue[];
}

export interface GamSyncMappedEntry {
  source: "discord";
  externalMessageId: string;
  externalChannelId: string;
  officerId: string;
  discordId: string;
  qru: string;
  activityDate: string | null;
  prisons: number;
  pursuits: number;
  prisonGoal: number;
  pursuitGoal: number;
  prisonDelta: number;
  pursuitDelta: number;
  attachmentUrls: string[];
  rawContent: string;
  createdAt: string;
}

export interface GamSyncProcessResult {
  success: boolean;
  entry: GamSyncMappedEntry | null;
  parseErrors: string[];
  validationIssues: GamSyncValidationIssue[];
}