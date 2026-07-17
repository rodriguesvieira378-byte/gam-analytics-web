import type {
  GamSyncValidationContext,
  GamSyncValidationIssue,
  GamSyncValidationResult
} from "./types";

function addIssue(
  issues: GamSyncValidationIssue[],
  issue: GamSyncValidationIssue
) {
  issues.push(issue);
}

function normalizeId(value: string | undefined | null) {
  return String(value ?? "").trim();
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

  const messageId = normalizeId(message.messageId);
  const channelId = normalizeId(message.channelId);
  const authorDiscordId = normalizeId(
    message.authorDiscordId
  );

  if (!messageId) {
    addIssue(issues, {
      code: "missing_message_id",
      message: "A mensagem do Discord não possui ID.",
      severity: "error",
      field: "messageId"
    });
  }

  if (!channelId) {
    addIssue(issues, {
      code: "missing_channel_id",
      message: "A mensagem do Discord não possui canal.",
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
    messageId &&
    existingMessageIds
      .map((id) => normalizeId(id))
      .includes(messageId)
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
    allowedChannelIds.length > 0 &&
    channelId &&
    !allowedChannelIds
      .map((id) => normalizeId(id))
      .includes(channelId)
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
    message.attachments.length === 0
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
    parsedReport.prisonCurrent <
      previousPrisonValue
  ) {
    addIssue(issues, {
      code: "prison_value_regression",
      message:
        "O total de prisões informado é menor que o valor anterior.",
      severity: "error",
      field: "prisonCurrent"
    });
  }

  if (
    parsedReport.hasPursuit &&
    parsedReport.pursuitCurrent <
      previousPursuitValue
  ) {
    addIssue(issues, {
      code: "pursuit_value_regression",
      message:
        "O total de acompanhamentos informado é menor que o valor anterior.",
      severity: "error",
      field: "pursuitCurrent"
    });
  }

  if (
    parsedReport.hasPrison &&
    parsedReport.prisonGoal <= 0
  ) {
    addIssue(issues, {
      code: "invalid_prison_goal",
      message:
        "A meta de prisões precisa ser maior que zero.",
      severity: "error",
      field: "prisonGoal"
    });
  }

  if (
    parsedReport.hasPursuit &&
    parsedReport.pursuitGoal <= 0
  ) {
    addIssue(issues, {
      code: "invalid_pursuit_goal",
      message:
        "A meta de acompanhamentos precisa ser maior que zero.",
      severity: "error",
      field: "pursuitGoal"
    });
  }

  // No formato real do Discord, a linha "QRU:" pode ficar vazia.
  // A identificação da QRU será conferida pelo print anexado.
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
