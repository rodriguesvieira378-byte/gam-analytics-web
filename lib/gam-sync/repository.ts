import {
  loadCurrentUserAccess,
  saveDiscordRecord,
  saveEntry
} from "@/lib/repository";
import {
  getSupabaseClient,
  isDemoMode
} from "@/lib/supabase";
import type {
  DiscordActivityType,
  DiscordQru,
  WeeklyEntry
} from "@/lib/types";
import type {
  GamSyncDiscordMessage,
  GamSyncMappedEntry,
  GamSyncParsedReport,
  GamSyncValidationIssue
} from "./types";

const GAM_SYNC_STORAGE_KEY = "gam.web.gam-sync-records";

export type GamSyncRecordStatus =
  | "Pendente"
  | "Processado"
  | "Rejeitado"
  | "Erro";

export interface GamSyncRecord {
  id: string;
  ownerId: string;
  officerId: string;
  weeklyEntryId: string | null;

  messageId: string;
  channelId: string;
  guildId: string | null;
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
  parsedData: Record<string, unknown>;

  syncStatus: GamSyncRecordStatus;
  validationIssues: GamSyncValidationIssue[];
  errorMessage: string | null;

  discordCreatedAt: string | null;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveGamSyncRecordInput {
  message: GamSyncDiscordMessage;
  mappedEntry: GamSyncMappedEntry;
  weeklyEntry: WeeklyEntry;
  parsedReport?: GamSyncParsedReport | null;
  validationIssues?: GamSyncValidationIssue[];
}

export interface SaveGamSyncRecordResult {
  syncRecord: GamSyncRecord;
  weeklyEntry: WeeklyEntry;
}

function readDemoRecords(): GamSyncRecord[] {
  if (typeof window === "undefined") return [];

  const rawValue = window.localStorage.getItem(
    GAM_SYNC_STORAGE_KEY
  );

  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemoRecords(records: GamSyncRecord[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    GAM_SYNC_STORAGE_KEY,
    JSON.stringify(records)
  );
}

function createDemoId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeMessageId(value: string) {
  return value.trim();
}

function normalizeChannelId(value: string) {
  return value.trim();
}

function normalizeDiscordId(value: string) {
  return value.trim();
}

const VALID_QRU_OPTIONS: DiscordQru[] = [
  "Caixa Eletrônico",
  "Banco Central",
  "Joalheria",
  "Registradora",
  "Caixa de Luz",
  "Corrida Ilegal",
  "Los Santos",
  "Outra"
];

function normalizeQru(
  value: string
): DiscordQru | null {
  const normalized = value.trim();

  return (
    VALID_QRU_OPTIONS.find(
      (option) => option === normalized
    ) ?? null
  );
}

function buildDiscordMessageUrl(
  message: GamSyncDiscordMessage
) {
  const guildId = message.guildId?.trim();
  const channelId = message.channelId.trim();
  const messageId = message.messageId.trim();

  if (!guildId) {
    throw new Error(
      "Informe o ID do servidor para registrar a comprovação no histórico operacional."
    );
  }

  if (!channelId || !messageId) {
    throw new Error(
      "A mensagem precisa possuir ID do canal e ID da mensagem válidos."
    );
  }

  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function resolveDiscordActivity(
  mappedEntry: GamSyncMappedEntry
): {
  activityType: DiscordActivityType;
  quantity: number;
  qru: DiscordQru | null;
} {
  if (mappedEntry.pursuitDelta > 0) {
    const normalizedQru = normalizeQru(
      mappedEntry.qru
    );

    if (!normalizedQru) {
      throw new Error(
        "Selecione uma QRU válida para o acompanhamento."
      );
    }

    return {
      activityType: "Acompanhamento",
      quantity: mappedEntry.pursuitDelta,
      qru: normalizedQru
    };
  }

  if (mappedEntry.prisonDelta > 0) {
    return {
      activityType: "Prisão",
      quantity: mappedEntry.prisonDelta,
      qru: null
    };
  }

  throw new Error(
    "A operação não possui aumento válido para prisão ou acompanhamento."
  );
}

function normalizeAttachmentUrls(urls: string[]) {
  return [
    ...new Set(
      urls
        .map((url) => url.trim())
        .filter(Boolean)
    )
  ];
}

function normalizeActivityDate(
  value: string | null
): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  const isoDateMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoDateMatch) {
    return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
  }

  const brazilianDateMatch = trimmed.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (brazilianDateMatch) {
    return `${brazilianDateMatch[3]}-${brazilianDateMatch[2]}-${brazilianDateMatch[1]}`;
  }

  return null;
}

function serializeParsedReport(
  report?: GamSyncParsedReport | null
): Record<string, unknown> {
  if (!report) return {};

  return {
    rawContent: report.rawContent,
    activities: report.activities,
    qru: report.qru,
    activityDate: report.activityDate,
    hasPursuit: report.hasPursuit,
    hasPrison: report.hasPrison,
    pursuitCurrent: report.pursuitCurrent,
    pursuitGoal: report.pursuitGoal,
    prisonCurrent: report.prisonCurrent,
    prisonGoal: report.prisonGoal
  };
}

function mapGamSyncRecord(
  row: Record<string, unknown>
): GamSyncRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    officerId: String(row.officer_id),

    weeklyEntryId: row.weekly_entry_id
      ? String(row.weekly_entry_id)
      : null,

    messageId: String(row.message_id ?? ""),
    channelId: String(row.channel_id ?? ""),

    guildId: row.guild_id
      ? String(row.guild_id)
      : null,

    discordId: String(row.discord_id ?? ""),

    qru: String(row.qru ?? ""),

    activityDate: row.activity_date
      ? String(row.activity_date)
      : null,

    prisons: Number(row.prisons ?? 0),
    pursuits: Number(row.pursuits ?? 0),

    prisonGoal: Number(row.prison_goal ?? 0),
    pursuitGoal: Number(row.pursuit_goal ?? 0),

    prisonDelta: Number(row.prison_delta ?? 0),
    pursuitDelta: Number(row.pursuit_delta ?? 0),

    attachmentUrls: Array.isArray(
      row.attachment_urls
    )
      ? row.attachment_urls.map(String)
      : [],

    rawContent: String(row.raw_content ?? ""),

    parsedData:
      row.parsed_data &&
      typeof row.parsed_data === "object"
        ? (
            row.parsed_data as Record<
              string,
              unknown
            >
          )
        : {},

    syncStatus: String(
      row.sync_status ?? "Pendente"
    ) as GamSyncRecordStatus,

    validationIssues: Array.isArray(
      row.validation_issues
    )
      ? (
          row.validation_issues as GamSyncValidationIssue[]
        )
      : [],

    errorMessage: row.error_message
      ? String(row.error_message)
      : null,

    discordCreatedAt: row.discord_created_at
      ? String(row.discord_created_at)
      : null,

    processedAt: String(row.processed_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function gamSyncDatabaseError(error: {
  code?: string;
  message?: string;
}) {
  const message = String(error.message ?? "");
  const normalizedMessage = message.toLowerCase();

  if (
    error.code === "23505" ||
    normalizedMessage.includes(
      "gam_sync_records_owner_message_unique"
    ) ||
    normalizedMessage.includes("duplicate")
  ) {
    return new Error(
      "Esta mensagem do Discord já foi processada pelo GAM Sync."
    );
  }

  if (
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205"
  ) {
    return new Error(
      "Execute primeiro a atualização V0.8.5.2 no SQL Editor do Supabase."
    );
  }

  return new Error(
    message ||
      "Não foi possível acessar os registros do GAM Sync."
  );
}

export async function loadGamSyncRecords(
  limit = 200
): Promise<GamSyncRecord[]> {
  const safeLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    1000
  );

  if (isDemoMode) {
    return readDemoRecords()
      .sort((a, b) =>
        b.processedAt.localeCompare(a.processedAt)
      )
      .slice(0, safeLimit);
  }

  const { data, error } = await getSupabaseClient()
    .from("gam_sync_records")
    .select(
      [
        "id",
        "owner_id",
        "officer_id",
        "weekly_entry_id",
        "message_id",
        "channel_id",
        "guild_id",
        "discord_id",
        "qru",
        "activity_date",
        "prisons",
        "pursuits",
        "prison_goal",
        "pursuit_goal",
        "prison_delta",
        "pursuit_delta",
        "attachment_urls",
        "raw_content",
        "parsed_data",
        "sync_status",
        "validation_issues",
        "error_message",
        "discord_created_at",
        "processed_at",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .order("processed_at", {
      ascending: false
    })
    .limit(safeLimit);

  if (error) {
    throw gamSyncDatabaseError(error);
  }

  return (data ?? []).map((row) =>
    mapGamSyncRecord(
      row as unknown as Record<string, unknown>
    )
  );
}

export async function loadGamSyncMessageIds(): Promise<
  string[]
> {
  if (isDemoMode) {
    return readDemoRecords().map(
      (record) => record.messageId
    );
  }

  const { data, error } = await getSupabaseClient()
    .from("gam_sync_records")
    .select("message_id");

  if (error) {
    throw gamSyncDatabaseError(error);
  }

  return (data ?? [])
    .map((row) =>
      String(row.message_id ?? "").trim()
    )
    .filter(Boolean);
}

export async function gamSyncMessageExists(
  messageId: string
): Promise<boolean> {
  const normalizedMessageId =
    normalizeMessageId(messageId);

  if (!normalizedMessageId) return false;

  if (isDemoMode) {
    return readDemoRecords().some(
      (record) =>
        record.messageId === normalizedMessageId
    );
  }

  const { data, error } = await getSupabaseClient()
    .from("gam_sync_records")
    .select("id")
    .eq("message_id", normalizedMessageId)
    .maybeSingle();

  if (error) {
    throw gamSyncDatabaseError(error);
  }

  return Boolean(data?.id);
}

async function createPendingGamSyncRecord(
  input: SaveGamSyncRecordInput,
  ownerId: string
): Promise<GamSyncRecord> {
  const {
    message,
    mappedEntry,
    parsedReport,
    validationIssues = []
  } = input;

  const now = new Date().toISOString();

  const normalizedMessageId =
    normalizeMessageId(
      mappedEntry.externalMessageId
    );

  const normalizedChannelId =
    normalizeChannelId(
      mappedEntry.externalChannelId
    );

  const normalizedDiscordId =
    normalizeDiscordId(mappedEntry.discordId);

  if (!normalizedMessageId) {
    throw new Error(
      "A mensagem do Discord não possui um ID válido."
    );
  }

  if (!normalizedChannelId) {
    throw new Error(
      "A mensagem do Discord não possui um canal válido."
    );
  }

  if (!normalizedDiscordId) {
    throw new Error(
      "O integrante não possui um ID do Discord válido."
    );
  }

  if (isDemoMode) {
    const records = readDemoRecords();

    if (
      records.some(
        (record) =>
          record.ownerId === ownerId &&
          record.messageId ===
            normalizedMessageId
      )
    ) {
      throw new Error(
        "Esta mensagem do Discord já foi processada pelo GAM Sync."
      );
    }

    const record: GamSyncRecord = {
      id: createDemoId("gam-sync"),
      ownerId,
      officerId: mappedEntry.officerId,
      weeklyEntryId: null,

      messageId: normalizedMessageId,
      channelId: normalizedChannelId,
      guildId:
        message.guildId?.trim() || null,
      discordId: normalizedDiscordId,

      qru: mappedEntry.qru.trim(),

      activityDate: normalizeActivityDate(
        mappedEntry.activityDate
      ),

      prisons: mappedEntry.prisons,
      pursuits: mappedEntry.pursuits,

      prisonGoal: mappedEntry.prisonGoal,
      pursuitGoal: mappedEntry.pursuitGoal,

      prisonDelta: mappedEntry.prisonDelta,
      pursuitDelta: mappedEntry.pursuitDelta,

      attachmentUrls: normalizeAttachmentUrls(
        mappedEntry.attachmentUrls
      ),

      rawContent: mappedEntry.rawContent,

      parsedData:
        serializeParsedReport(parsedReport),

      syncStatus: "Pendente",
      validationIssues,
      errorMessage: null,

      discordCreatedAt:
        mappedEntry.createdAt ||
        message.createdAt ||
        null,

      processedAt: now,
      createdAt: now,
      updatedAt: now
    };

    writeDemoRecords([record, ...records]);

    return record;
  }

  const { data, error } = await getSupabaseClient()
    .from("gam_sync_records")
    .insert({
      owner_id: ownerId,
      officer_id: mappedEntry.officerId,
      weekly_entry_id: null,

      message_id: normalizedMessageId,
      channel_id: normalizedChannelId,

      guild_id:
        message.guildId?.trim() || null,

      discord_id: normalizedDiscordId,

      qru: mappedEntry.qru.trim(),

      activity_date: normalizeActivityDate(
        mappedEntry.activityDate
      ),

      prisons: mappedEntry.prisons,
      pursuits: mappedEntry.pursuits,

      prison_goal: mappedEntry.prisonGoal,
      pursuit_goal: mappedEntry.pursuitGoal,

      prison_delta: mappedEntry.prisonDelta,
      pursuit_delta: mappedEntry.pursuitDelta,

      attachment_urls:
        normalizeAttachmentUrls(
          mappedEntry.attachmentUrls
        ),

      raw_content: mappedEntry.rawContent,

      parsed_data:
        serializeParsedReport(parsedReport),

      sync_status: "Pendente",
      validation_issues: validationIssues,
      error_message: null,

      discord_created_at:
        mappedEntry.createdAt ||
        message.createdAt ||
        null,

      processed_at: now
    })
    .select(
      [
        "id",
        "owner_id",
        "officer_id",
        "weekly_entry_id",
        "message_id",
        "channel_id",
        "guild_id",
        "discord_id",
        "qru",
        "activity_date",
        "prisons",
        "pursuits",
        "prison_goal",
        "pursuit_goal",
        "prison_delta",
        "pursuit_delta",
        "attachment_urls",
        "raw_content",
        "parsed_data",
        "sync_status",
        "validation_issues",
        "error_message",
        "discord_created_at",
        "processed_at",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .single();

  if (error) {
    throw gamSyncDatabaseError(error);
  }

  return mapGamSyncRecord(
    data as unknown as Record<string, unknown>
  );
}

async function markGamSyncRecordProcessed(
  recordId: string,
  weeklyEntryId: string
): Promise<GamSyncRecord> {
  if (isDemoMode) {
    const records = readDemoRecords();

    const index = records.findIndex(
      (record) => record.id === recordId
    );

    if (index < 0) {
      throw new Error(
        "Registro do GAM Sync não encontrado."
      );
    }

    records[index] = {
      ...records[index],
      weeklyEntryId,
      syncStatus: "Processado",
      errorMessage: null,
      processedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    writeDemoRecords(records);

    return records[index];
  }

  const { data, error } = await getSupabaseClient()
    .from("gam_sync_records")
    .update({
      weekly_entry_id: weeklyEntryId,
      sync_status: "Processado",
      error_message: null,
      processed_at: new Date().toISOString()
    })
    .eq("id", recordId)
    .select(
      [
        "id",
        "owner_id",
        "officer_id",
        "weekly_entry_id",
        "message_id",
        "channel_id",
        "guild_id",
        "discord_id",
        "qru",
        "activity_date",
        "prisons",
        "pursuits",
        "prison_goal",
        "pursuit_goal",
        "prison_delta",
        "pursuit_delta",
        "attachment_urls",
        "raw_content",
        "parsed_data",
        "sync_status",
        "validation_issues",
        "error_message",
        "discord_created_at",
        "processed_at",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .single();

  if (error) {
    throw gamSyncDatabaseError(error);
  }

  return mapGamSyncRecord(
    data as unknown as Record<string, unknown>
  );
}

async function markGamSyncRecordError(
  recordId: string,
  cause: unknown
) {
  const errorMessage =
    cause instanceof Error
      ? cause.message
      : "Erro desconhecido ao processar a mensagem.";

  if (isDemoMode) {
    const records = readDemoRecords();

    const index = records.findIndex(
      (record) => record.id === recordId
    );

    if (index < 0) return;

    records[index] = {
      ...records[index],
      syncStatus: "Erro",
      errorMessage,
      updatedAt: new Date().toISOString()
    };

    writeDemoRecords(records);
    return;
  }

  await getSupabaseClient()
    .from("gam_sync_records")
    .update({
      sync_status: "Erro",
      error_message: errorMessage
    })
    .eq("id", recordId);
}

export async function saveGamSyncRecord(
  input: SaveGamSyncRecordInput
): Promise<SaveGamSyncRecordResult> {
  const access = await loadCurrentUserAccess();

  if (!access) {
    throw new Error(
      "Você precisa estar conectado para executar o GAM Sync."
    );
  }

  const alreadyExists =
    await gamSyncMessageExists(
      input.mappedEntry.externalMessageId
    );

  if (alreadyExists) {
    throw new Error(
      "Esta mensagem do Discord já foi processada pelo GAM Sync."
    );
  }

  const pendingRecord =
    await createPendingGamSyncRecord(
      input,
      access.ownerId
    );

  try {
    const discordActivity =
      resolveDiscordActivity(
        input.mappedEntry
      );

    await saveDiscordRecord({
      officerId: input.mappedEntry.officerId,
      year: input.weeklyEntry.year,
      month: input.weeklyEntry.month,
      week: input.weeklyEntry.week,
      activityType:
        discordActivity.activityType,
      quantity: discordActivity.quantity,
      qru: discordActivity.qru,
      discordUrl: buildDiscordMessageUrl(
        input.message
      ),
      note: input.mappedEntry.rawContent
    });

    const savedWeeklyEntry = await saveEntry(
      input.weeklyEntry
    );

    const processedRecord =
      await markGamSyncRecordProcessed(
        pendingRecord.id,
        savedWeeklyEntry.id
      );

    return {
      syncRecord: processedRecord,
      weeklyEntry: savedWeeklyEntry
    };
  } catch (cause) {
    await markGamSyncRecordError(
      pendingRecord.id,
      cause
    );

    throw cause;
  }
}

export async function deleteGamSyncRecord(
  recordId: string
) {
  const normalizedRecordId = recordId.trim();

  if (!normalizedRecordId) {
    throw new Error(
      "Registro do GAM Sync inválido."
    );
  }

  if (isDemoMode) {
    const records = readDemoRecords();

    writeDemoRecords(
      records.filter(
        (record) =>
          record.id !== normalizedRecordId
      )
    );

    return;
  }

  const access = await loadCurrentUserAccess();

  if (
    !access ||
    access.role !== "Administrador"
  ) {
    throw new Error(
      "Somente o administrador pode excluir registros do GAM Sync."
    );
  }

  const { error } = await getSupabaseClient()
    .from("gam_sync_records")
    .delete()
    .eq("id", normalizedRecordId);

  if (error) {
    throw gamSyncDatabaseError(error);
  }
}
