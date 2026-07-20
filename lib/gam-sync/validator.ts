import type {
  GamSyncValidationContext,
  GamSyncValidationIssue,
  GamSyncValidationResult
} from "./types";

const MAX_ACTIVITY_VALUE = 9999;

function addIssue(
  issues: GamSyncValidationIssue[],
  issue: GamSyncValidationIssue
) {
  issues.push(issue);
}

function normalizeId(
  value: string | undefined | null
) {
  return String(value ?? "").trim();
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

function hasValidAttachment(
  attachments:
    | GamSyncValidationContext["message"]["attachments"]
    | undefined
) {
  return (
    Array.isArray(attachments) &&
    attachments.length > 0
  );
}

function isAllowedChannel(
  channelId: string,
  allowedChannelIds: string[]
) {
  if (allowedChannelIds.length === 0) {
    return true;
  }

  const normalizedAllowedChannels =
    new Set(
      allowedChannelIds
        .map(normalizeId)
        .filter(Boolean)
    );

  return normalizedAllowedChannels.has(
    channelId
  );
}

function isDuplicateMessage(
  messageId: string,
  existingMessageIds: string[]
) {
  if (!messageId) {
    return false;
  }

  const normalizedExistingMessages =
    new Set(
      existingMessageIds
        .map(normalizeId)
        .filter(Boolean)
    );

  return normalizedExistingMessages.has(
    messageId
  );
}

function hasCounterProgress(
  currentValue: number,
  previousValue: number
) {
  if (currentValue > previousValue) {
    return true;
  }

  return (
    currentValue < previousValue &&
    currentValue > 0
  );
}

export function validateGamSyncReport(
  context: GamSyncValidationContext
): GamSyncValidationResult {
  const {
    message,
    parsedReport,
    officer,
    previousPursuitValue = 0,
    previousPrisonValue = 0,
    existingMessageIds = [],
    allowedChannelIds = [],
    requireAttachment = true
  } = context;

  const issues: GamSyncValidationIssue[] = [];

  const messageId =
    normalizeId(message.messageId);

  const channelId =
    normalizeId(message.channelId);

  const authorDiscordId =
    normalizeId(message.authorDiscordId);

  const previousPursuit =
    normalizeCounter(previousPursuitValue);

  const previousPrison =
    normalizeCounter(previousPrisonValue);

  const pursuitCurrent =
    normalizeCounter(
      parsedReport.pursuitCurrent
    );

  const pursuitGoal =
    normalizeCounter(
      parsedReport.pursuitGoal
    );

  const prisonCurrent =
    normalizeCounter(
      parsedReport.prisonCurrent
    );

  const prisonGoal =
    normalizeCounter(
      parsedReport.prisonGoal
    );

  if (!messageId) {
    addIssue(issues, {
      code: "missing_message_id",
      message:
        "A mensagem do Discord não possui ID.",
      severity: "error",
      field: "messageId"
    });
  }

  if (!channelId) {
    addIssue(issues, {
      code: "missing_channel_id",
      message:
        "A mensagem do Discord não possui canal.",
      severity: "error",
      field: "channelId"
    });
  }

  if (!authorDiscordId) {
    addIssue(issues, {
      code: "missing_author_discord_id",
      message:
        "Não foi possível identificar o autor da mensagem.",
      severity: "error",
      field: "authorDiscordId"
    });
  }

  if (
    isDuplicateMessage(
      messageId,
      existingMessageIds
    )
  ) {
    addIssue(issues, {
      code: "duplicate_message",
      message:
        "Esta mensagem do Discord já foi processada.",
      severity: "error",
      field: "messageId"
    });
  }

  if (
    channelId &&
    !isAllowedChannel(
      channelId,
      allowedChannelIds
    )
  ) {
    addIssue(issues, {
      code: "channel_not_allowed",
      message:
        "Esta mensagem foi enviada em um canal não autorizado.",
      severity: "error",
      field: "channelId"
    });
  }

  if (!officer) {
    addIssue(issues, {
      code: "officer_not_found",
      message:
        "Nenhum integrante foi encontrado para este ID do Discord.",
      severity: "error",
      field: "authorDiscordId"
    });
  } else if (!officer.active) {
    addIssue(issues, {
      code: "officer_inactive",
      message:
        "O integrante vinculado ao Discord está inativo.",
      severity: "error",
      field: "officerId"
    });
  }

  if (
    requireAttachment &&
    !hasValidAttachment(message.attachments)
  ) {
    addIssue(issues, {
      code: "attachment_required",
      message:
        "O relatório precisa possuir pelo menos um print.",
      severity: "error",
      field: "attachments"
    });
  }

  if (
    !parsedReport.hasPrison &&
    !parsedReport.hasPursuit
  ) {
    addIssue(issues, {
      code: "activity_not_found",
      message:
        "Nenhuma atividade de prisão ou acompanhamento foi encontrada.",
      severity: "error",
      field: "activities"
    });
  }

  if (
    parsedReport.hasPrison &&
    prisonCurrent < previousPrison
  ) {
    addIssue(issues, {
      code: "prison_counter_reset",
      message:
        "O total de prisões ficou menor que o registro anterior. O sistema tratará o valor como reinício de contagem.",
      severity: "warning",
      field: "prisonCurrent"
    });
  }

  if (
    parsedReport.hasPursuit &&
    pursuitCurrent < previousPursuit
  ) {
    addIssue(issues, {
      code: "pursuit_counter_reset",
      message:
        "O total de acompanhamentos ficou menor que o registro anterior. O sistema tratará o valor como reinício de contagem.",
      severity: "warning",
      field: "pursuitCurrent"
    });
  }

  if (
    parsedReport.hasPrison &&
    prisonGoal <= 0
  ) {
    addIssue(issues, {
      code: "missing_prison_goal",
      message:
        "A meta de prisões não foi informada. O valor atual ainda poderá ser processado.",
      severity: "warning",
      field: "prisonGoal"
    });
  }

  if (
    parsedReport.hasPursuit &&
    pursuitGoal <= 0
  ) {
    addIssue(issues, {
      code: "missing_pursuit_goal",
      message:
        "A meta de acompanhamentos não foi informada. O valor atual ainda poderá ser processado.",
      severity: "warning",
      field: "pursuitGoal"
    });
  }

  const prisonAdvanced =
    parsedReport.hasPrison &&
    hasCounterProgress(
      prisonCurrent,
      previousPrison
    );

  const pursuitAdvanced =
    parsedReport.hasPursuit &&
    hasCounterProgress(
      pursuitCurrent,
      previousPursuit
    );

  if (
    (
      parsedReport.hasPrison ||
      parsedReport.hasPursuit
    ) &&
    !prisonAdvanced &&
    !pursuitAdvanced
  ) {
    addIssue(issues, {
      code: "no_activity_progress",
      message:
        "O relatório não possui avanço em relação aos valores já registrados.",
      severity: "error",
      field: "activities"
    });
  }

  if (!parsedReport.qru) {
    addIssue(issues, {
      code: "missing_qru",
      message:
        "A QRU não foi identificada no texto. O print anexado deverá permitir a conferência.",
      severity: "warning",
      field: "qru"
    });
  }

  if (!parsedReport.activityDate) {
    addIssue(issues, {
      code: "missing_activity_date",
      message:
        "A data será definida pelo momento da mensagem do Discord.",
      severity: "warning",
      field: "activityDate"
    });
  }

  return {
    valid: !issues.some(
      (issue) => issue.severity === "error"
    ),
    issues
  };
}