import type {
  GamSyncActivityProgress,
  GamSyncActivityType,
  GamSyncParseResult,
  GamSyncParsedReport
} from "./types";

const MAX_ACTIVITY_VALUE = 9999;

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
  /(?:^|\n)\s*(?:[-•]\s*)?qru\s*[:\-–—]?\s*(.+?)(?=\n|$)/i,
  /(?:^|\n)\s*(?:[-•]\s*)?ocorr[eê]ncia\s*[:\-–—]?\s*(.+?)(?=\n|$)/i,
  /(?:^|\n)\s*(?:[-•]\s*)?atividade\s*[:\-–—]?\s*(.+?)(?=\n|$)/i
];

const DATE_PATTERNS = [
  /(?:^|\n)\s*(?:[-•]\s*)?(?:data|dia)\s*[:\-–—]?\s*(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)(?=\s|$)/i,
  /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/
];

function normalizeContent(content: string) {
  return content
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[–—]/g, "-")
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

  const digits = value.replace(/[^\d]/g, "");

  if (!digits) return null;

  const parsed = Number(digits);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0 ||
    parsed > MAX_ACTIVITY_VALUE
  ) {
    return null;
  }

  return parsed;
}

function buildActivityPatterns(
  labels: string[]
) {
  const joined =
    labels.map(escapeRegExp).join("|");

  const prefix =
    `(?:^|\\n)\\s*(?:[-•]\\s*)?(?:${joined})`;

  return [
    new RegExp(
      `${prefix}[\\s\\S]{0,36}?meta\\s*[:\\-]?\\s*(\\d{1,4})\\s*\\/\\s*(\\d{1,4})(?=\\s|$)`,
      "i"
    ),
    new RegExp(
      `${prefix}\\s*[:\\-]?\\s*(\\d{1,4})\\s*\\/\\s*(\\d{1,4})(?=\\s|$)`,
      "i"
    ),
    new RegExp(
      `(?:^|\\n)\\s*(?:[-•]\\s*)?(\\d{1,4})\\s*\\/\\s*(\\d{1,4})\\s*(?:${joined})(?=\\s|$)`,
      "i"
    ),
    new RegExp(
      `${prefix}\\s*[:\\-]?\\s*(\\d{1,4})(?!\\s*[\\/.-]\\s*\\d)(?=\\s|$)`,
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

function sanitizeQru(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[:\-–—\s]+/, "")
    .trim();
}

function parseQru(content: string) {
  for (const pattern of QRU_PATTERNS) {
    const match = content.match(pattern);
    const value = match?.[1]
      ? sanitizeQru(match[1])
      : "";

    if (value) return value;
  }

  const hasPrison =
    /\bpris(?:ão|ao|ões|oes)\b/i.test(content);

  const hasPursuit =
    /\bacomp(?:anhamento|anhamentos|anha)?\b/i.test(
      content
    );

  if (hasPrison && !hasPursuit) {
    return "Prisão";
  }

  if (hasPursuit && !hasPrison) {
    return "Acompanhamento";
  }

  if (hasPrison && hasPursuit) {
    return "Operação mista";
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
    parts.length > 3 ||
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

  if (!normalizedContent) {
    return {
      success: false,
      report: null,
      errors: [
        "O relatório está vazio."
      ]
    };
  }

  const errors: string[] = [];

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

  if (current < previous) {
    return current;
  }

  return current - previous;
}

export function isGamSyncReport(
  content: string
) {
  const normalizedContent =
    normalizeContent(content);

  if (!normalizedContent) {
    return false;
  }

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
