export type ActivityType = "PRISAO" | "ACOMPANHAMENTO";

export interface ParsedGamMessage {
  activity: ActivityType | null;
  metaCurrent: number | null;
  metaGoal: number | null;
  qru: string | null;
  date: string | null;
  hasAttachment: boolean;
}

export function parseGamMessage(
  content: string,
  hasAttachment: boolean,
): ParsedGamMessage {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let activity: ActivityType | null = null;
  let metaCurrent: number | null = null;
  let metaGoal: number | null = null;
  let qru: string | null = null;
  let date: string | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === "PRISAO") {
      activity = "PRISAO";
      continue;
    }

    if (upper === "ACOMPANHAMENTO") {
      activity = "ACOMPANHAMENTO";
      continue;
    }

    if (upper.startsWith("META:")) {
      const value = upper.replace("META:", "").trim();

      const [current, goal] = value.split("/");

      metaCurrent = Number(current);
      metaGoal = Number(goal);

      continue;
    }

    if (upper.startsWith("QRU:")) {
      qru = line.replace(/QRU:/i, "").trim();
      continue;
    }

    if (upper.startsWith("DATA:")) {
      date = line.replace(/DATA:/i, "").trim();
      continue;
    }
  }

  return {
    activity,
    metaCurrent,
    metaGoal,
    qru,
    date,
    hasAttachment,
  };
}