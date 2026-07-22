import { getSupabaseClient, isDemoMode } from "@/lib/supabase";
import type { WeeklyEntry } from "@/lib/types";

type ActivityDatabaseRow = {
  id: string;
  officer_id: string;
  type: string;
  qru: string | null;
  activity_date: string;
  discord_message_id: string;
  discord_channel_id: string;
  image_url: string | null;
  created_at?: string | null;
};

type ActivityType = "PRISAO" | "ACOMPANHAMENTO";

type ActivityGroup = {
  officerId: string;
  year: number;
  month: number;
  week: number;
  prisons: number;
  pursuits: number;
  qrus: Set<string>;
  createdAt: string;
};

function normalizeActivityType(value: string): ActivityType | null {
  const normalized = value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (normalized === "PRISAO") {
    return "PRISAO";
  }

  if (normalized === "ACOMPANHAMENTO") {
    return "ACOMPANHAMENTO";
  }

  return null;
}

function parseActivityDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return {
    year,
    month,
    day
  };
}

function getActivityWeek(
  year: number,
  month: number,
  day: number
) {
  const firstDayOfMonth = new Date(
    Date.UTC(year, month - 1, 1)
  ).getUTCDay();

  return Math.floor(
    (firstDayOfMonth + day - 1) / 7
  ) + 1;
}

function createActivityEntryId(
  officerId: string,
  year: number,
  month: number,
  week: number
) {
  return `activity-${officerId}-${year}-${month}-${week}`;
}

function createActivityGroupKey(
  officerId: string,
  year: number,
  month: number,
  week: number
) {
  return `${officerId}:${year}:${month}:${week}`;
}

function createActivityNote(qrus: Set<string>) {
  const values = [...qrus]
    .map((qru) => qru.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (values.length === 0) {
    return "Registro automático do GAM Sync.";
  }

  return `Registro automático do GAM Sync. QRU: ${values.join(", ")}.`;
}

function mapActivityRow(row: unknown): ActivityDatabaseRow {
  const item =
    row && typeof row === "object"
      ? (row as Record<string, unknown>)
      : {};

  return {
    id: String(item.id ?? ""),
    officer_id: String(item.officer_id ?? ""),
    type: String(item.type ?? ""),
    qru: item.qru ? String(item.qru) : null,
    activity_date: String(item.activity_date ?? ""),
    discord_message_id: String(item.discord_message_id ?? ""),
    discord_channel_id: String(item.discord_channel_id ?? ""),
    image_url: item.image_url ? String(item.image_url) : null,
    created_at: item.created_at ? String(item.created_at) : null
  };
}

export async function loadActivityEntries(): Promise<WeeklyEntry[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await getSupabaseClient()
    .from("activities")
    .select(
      [
        "id",
        "officer_id",
        "type",
        "qru",
        "activity_date",
        "discord_message_id",
        "discord_channel_id",
        "image_url",
        "created_at"
      ].join(", ")
    )
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST204" ||
      error.code === "PGRST205"
    ) {
      throw new Error(
        "A tabela activities ainda não está disponível no Supabase."
      );
    }

    throw new Error(
      `Não foi possível carregar as atividades automáticas: ${error.message}`
    );
  }

  const rows: ActivityDatabaseRow[] = Array.isArray(data)
    ? data.map(mapActivityRow)
    : [];

  const groups = new Map<string, ActivityGroup>();

  for (const row of rows) {
    const officerId = row.officer_id.trim();
    const activityType = normalizeActivityType(row.type);
    const activityDate = parseActivityDate(row.activity_date);

    if (!officerId || !activityType || !activityDate) {
      continue;
    }

    const week = getActivityWeek(
      activityDate.year,
      activityDate.month,
      activityDate.day
    );
    const key = createActivityGroupKey(
      officerId,
      activityDate.year,
      activityDate.month,
      week
    );

    const existing = groups.get(key);

    const createdAt =
      String(row.created_at ?? "").trim() ||
      `${row.activity_date}T00:00:00.000Z`;

    const group: ActivityGroup = existing ?? {
      officerId,
      year: activityDate.year,
      month: activityDate.month,
      week,
      prisons: 0,
      pursuits: 0,
      qrus: new Set<string>(),
      createdAt
    };

    if (activityType === "PRISAO") {
      group.prisons += 1;
    }

    if (activityType === "ACOMPANHAMENTO") {
      group.pursuits += 1;
    }

    const qru = String(row.qru ?? "").trim();

    if (qru) {
      group.qrus.add(qru);
    }

    if (createdAt > group.createdAt) {
      group.createdAt = createdAt;
    }

    groups.set(key, group);
  }

  return [...groups.values()]
    .map(
      (group): WeeklyEntry => ({
        id: createActivityEntryId(
          group.officerId,
          group.year,
          group.month,
          group.week
        ),
        officerId: group.officerId,
        year: group.year,
        month: group.month,
        week: group.week,
        prisons: group.prisons,
        pursuits: group.pursuits,
        note: createActivityNote(group.qrus),
        createdAt: group.createdAt
      })
    )
    .sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }

      if (a.month !== b.month) {
        return b.month - a.month;
      }

      if (a.week !== b.week) {
        return b.week - a.week;
      }

      return String(b.createdAt ?? "").localeCompare(
        String(a.createdAt ?? "")
      );
    });
}
