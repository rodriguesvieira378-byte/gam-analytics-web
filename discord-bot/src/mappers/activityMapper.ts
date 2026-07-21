import type { Message } from "discord.js";

import type { ParsedGamMessage } from "../parser/parseGamMessage";
import type { Activity } from "../types/activity";

function convertDateToIso(date: string): string {
  const normalizedDate = date.trim();
  const parts = normalizedDate.split("/");

  if (parts.length !== 2 && parts.length !== 3) {
    throw new Error(
      `Formato de data inválido: "${date}". Use DD/MM ou DD/MM/AAAA.`,
    );
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year =
    parts.length === 3
      ? Number(parts[2])
      : new Date().getFullYear();

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    throw new Error(
      `A data informada contém valores inválidos: "${date}".`,
    );
  }

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  const validDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  if (!validDate) {
    throw new Error(
      `A data informada não existe: "${date}".`,
    );
  }

  const formattedYear = String(year).padStart(4, "0");
  const formattedMonth = String(month).padStart(2, "0");
  const formattedDay = String(day).padStart(2, "0");

  return `${formattedYear}-${formattedMonth}-${formattedDay}`;
}

export function activityMapper(
  parsed: ParsedGamMessage,
  message: Message,
): Activity {
  const missingRequiredQru =
    parsed.activity === "ACOMPANHAMENTO" && !parsed.qru;

  if (
    !parsed.activity ||
    parsed.metaCurrent === null ||
    parsed.metaGoal === null ||
    missingRequiredQru ||
    !parsed.date
  ) {
    throw new Error(
      "Não é possível mapear um relatório inválido.",
    );
  }

  const activityDate = convertDateToIso(parsed.date);

  return {
    officerDiscordId: message.author.id,

    type: parsed.activity,

    qru: parsed.qru,

    metaCurrent: parsed.metaCurrent,

    metaGoal: parsed.metaGoal,

    activityDate,

    hasAttachment: parsed.hasAttachment,

    discordMessageId: message.id,

    discordChannelId: message.channelId,

    createdAt: new Date(),
  };
}