import type {
  GamSyncActivityProgress,
  GamSyncActivityType,
  GamSyncParseResult,
  GamSyncParsedReport
} from "./types";

const PURSUIT_LABELS = [
  "acompanhamento",
  "acompanhamentos",
  "acompanha",
  "acomp"
];

const PRISON_LABELS = [
  "prisão",
  "prisões",
  "prisao",
  "prisoes"
];

const QRU_PATTERNS = [
  /(?:^|\n)\s*qru\s*[:\-]\s*(.+?)(?=\n|$)/i,
  /(?:^|\n)\s*ocorr[eê]ncia\s*[:\-]\s*(.+?)(?=\n|$)/i,
  /(?:^|\n)\s*atividade\s*[:\-]\s*(.+?)(?=\n|$)/i
];

const DATE_PATTERNS = [
  /(?:^|\n)\s*(?:data|dia)\s*[:\-]\s*(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/i,
  /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/
];

function normalizeContent(content: string) {
  return content
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function parseNonNegativeInteger(
  value: string | undefined
) {
  if (!value) return null;

  const parsed = Number(
    value.replace(/[^\d]/g, "")
  );

  return Number.isInteger(parsed) &&
    parsed >= 0
    ? parsed
    : null;
}

function buildActivityPatterns(
  labels: string[]
) {
  const joined =
    labels.map(escapeRegExp).join("|");

  return [
    new RegExp(
      `(?:${joined})[\\s\\S]{0,40}?meta\\s*[:\\-]?\\s*(\\d{1,4})\\s*\\/\\s*(\\d{1,4})`,
      "i"
    ),
    new RegExp(
      `(?:${joined})\\s*[:\\-]?\\s*(\\d{1,4})\\s*\\/\\s*(\\d{1,4})`,
      "i"
    ),
    new RegExp(
      `(\\d{1,4})\\s*\\/\\s*(\\d{1,4})\\s*(?:${joined})`,
      "i"
    ),
    new RegExp(
      `(?:${joined})\\s*[:\\-]?\\s*(\\d{1,4})(?!\\s*\\/)`,
      "i"
    )
  ];
}

const PURSUIT_PATTERNS =
  buildActivityPatterns(PURSUIT_LABELS);

const PRISON_PATTERNS =
  buildActivityPatterns(PRISON_LABELS);

function parseActivity(
  content: string,
  type: GamSyncActivityType,
  patterns: RegExp[]
): GamSyncActivityProgress | null {
  for (const pattern of patterns) {
    const match = content.match(pattern);

    if (!match) continue;

    const current =
      parseNonNegativeInteger(match[1]);

    const goal =
      parseNonNegativeInteger(match[2]);

    if (current === null) continue;

    return {
      type,
      current,
      goal: goal ?? 0
    };
  }

  return null;
}

function parseQru(content: string) {
  for (const pattern of QRU_PATTERNS) {
    const match = content.match(pattern);
    const value = match?.[1]?.trim();

    if (value) return value;
  }

  if (
    /\bpris[aã]o\b/i.test(content) &&
    !/\bacompanhamento\b/i.test(content)
  ) {
    return "Prisão";
  }

  return null;
}

function normalizeActivityDate(
  value: string | null
) {
  if (!value) return null;

  const normalized =
    value.replace(/[.-]/g, "/");

  const parts =
    normalized.split("/").map(Number);

  if (
    parts.length < 2 ||
    parts.some(
      (part) => !Number.isFinite(part)
    )
  ) {
    return null;
  }

  const [day, month, rawYear] = parts;
  const currentYear =
    new Date().getFullYear();

  const year =
    rawYear === undefined
      ? currentYear
      : rawYear < 100
        ? 2000 + rawYear
        : rawYear;

  const date =
    new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return [
    String(day).padStart(2, "0"),
    String(month).padStart(2, "0"),
    String(year)
  ].join("/");
}

function parseDate(content: string) {
  for (const pattern of DATE_PATTERNS) {
    const match = content.match(pattern);

    if (match?.[1]) {
      return normalizeActivityDate(
        match[1]
      );
    }
  }

  return null;
}

function buildReport(
  rawContent: string,
  pursuit:
    | GamSyncActivityProgress
    | null,
  prison:
    | GamSyncActivityProgress
    | null,
  qru: string | null,
  activityDate: string | null
): GamSyncParsedReport {
  const activities = [
    pursuit,
    prison
  ].filter(
    (
      activity
    ): activity is GamSyncActivityProgress =>
      activity !== null
  );

  return {
    rawContent,
    activities,
    qru,
    activityDate,
    hasPursuit: Boolean(pursuit),
    hasPrison: Boolean(prison),
    pursuitCurrent:
      pursuit?.current ?? 0,
    pursuitGoal:
      pursuit?.goal ?? 0,
    prisonCurrent:
      prison?.current ?? 0,
    prisonGoal:
      prison?.goal ?? 0
  };
}

export function parseGamSyncReport(
  content: string
): GamSyncParseResult {
  const normalizedContent =
    normalizeContent(content);

  const errors: string[] = [];

  if (!normalizedContent) {
    return {
      success: false,
      report: null,
      errors: [
        "O relatório está vazio."
      ]
    };
  }

  const pursuit = parseActivity(
    normalizedContent,
    "Acompanhamento",
    PURSUIT_PATTERNS
  );

  const prison = parseActivity(
    normalizedContent,
    "Prisão",
    PRISON_PATTERNS
  );

  if (!pursuit && !prison) {
    errors.push(
      "Nenhuma quantidade de acompanhamento ou prisão foi encontrada."
    );
  }

  const qru =
    parseQru(normalizedContent);

  const activityDate =
    parseDate(normalizedContent);

  if (!qru) {
    errors.push(
      "A QRU não foi identificada."
    );
  }

  const report = buildReport(
    normalizedContent,
    pursuit,
    prison,
    qru,
    activityDate
  );

  return {
    success: errors.length === 0,
    report,
    errors
  };
}

export function calculateGamSyncDelta(
  currentValue: number,
  previousValue: number
) {
  if (
    !Number.isFinite(currentValue) ||
    !Number.isFinite(previousValue)
  ) {
    return 0;
  }

  const current = Math.max(
    0,
    Math.trunc(currentValue)
  );

  const previous = Math.max(
    0,
    Math.trunc(previousValue)
  );

  return Math.max(
    0,
    current - previous
  );
}

export function isGamSyncReport(
  content: string
) {
  const normalizedContent =
    normalizeContent(content);

  return (
    PURSUIT_PATTERNS.some(
      (pattern) =>
        pattern.test(normalizedContent)
    ) ||
    PRISON_PATTERNS.some(
      (pattern) =>
        pattern.test(normalizedContent)
    )
  );
}
