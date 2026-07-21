import type { Message } from "discord.js";

import type { ParsedGamMessage } from "../parser/parseGamMessage";
import type { Activity } from "../types/activity";

export function activityMapper(
  parsed: ParsedGamMessage,
  message: Message,
): Activity {
  if (
    !parsed.activity ||
    parsed.metaCurrent === null ||
    parsed.metaGoal === null ||
    !parsed.qru ||
    !parsed.date
  ) {
    throw new Error(
      "Não é possível mapear um relatório inválido.",
    );
  }

  return {
    officerDiscordId: message.author.id,

    type: parsed.activity,

    qru: parsed.qru,

    metaCurrent: parsed.metaCurrent,

    metaGoal: parsed.metaGoal,

    activityDate: parsed.date,

    hasAttachment: parsed.hasAttachment,

    discordMessageId: message.id,

    discordChannelId: message.channelId,

    createdAt: new Date(),
  };
}