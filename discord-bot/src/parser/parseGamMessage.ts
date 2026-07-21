export type ActivityType = "PRISAO" | "ACOMPANHAMENTO";

export interface ParsedGamMessage {
  activity: ActivityType | null;
  metaCurrent: number | null;
  metaGoal: number | null;
  qru: string | null;
  date: string | null;
  hasAttachment: boolean;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function parseGamMessage(
  content: string,
  hasAttachment: boolean,
): ParsedGamMessage {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let activity: ActivityType | null = null;
  let metaCurrent: number | null = null;
  let metaGoal: number | null = null;
  let qru: string | null = null;
  let date: string | null = null;

  for (const line of lines) {
    const normalized = normalizeText(line);

    if (normalized === "PRISAO") {
      activity = "PRISAO";
      continue;
    }

    if (normalized === "ACOMPANHAMENTO") {
      activity = "ACOMPANHAMENTO";
      continue;
    }

    if (normalized.startsWith("META:")) {
      const value = normalized.replace("META:", "").trim();
      const [currentValue, goalValue] = value.split("/");

      const current = Number(currentValue);
      const goal = Number(goalValue);

      metaCurrent = Number.isFinite(current) ? current : null;
      metaGoal = Number.isFinite(goal) ? goal : null;

      continue;
    }

    if (normalized.startsWith("QRU:")) {
      const value = line.replace(/^QRU:/i, "").trim();
      qru = value.length > 0 ? value : null;
      continue;
    }

    if (normalized.startsWith("DATA:")) {
      const value = line.replace(/^DATA:/i, "").trim();
      date = value.length > 0 ? value : null;
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