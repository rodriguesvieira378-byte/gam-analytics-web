/**
 * ============================================================
 * GAM Analytics Core
 * formatter.ts
 *
 * Funções puras de formatação utilizadas pelo Core.
 *
 * Este arquivo não depende de React, Next.js, Supabase,
 * Discord ou qualquer camada externa da aplicação.
 * ============================================================
 */

import {
  EntryTypeLabels,
  GoalStatusLabels,
  MonthNames,
  OfficerRoleLabels,
  OfficerStatusLabels,
  ShortMonthNames,
  SyncStatusLabels,
  type EntryType,
  type GoalStatusValue,
  type OfficerRole,
  type OfficerStatusValue,
  type SyncStatusValue,
} from "./constants";

import type {
  Officer,
  OperationalWeek,
  RankingItem,
} from "./types";

import {
  normalizeWhitespace,
  round,
} from "./helpers";

/**
 * Garante que uma data seja convertida para um objeto Date válido.
 */
function toValidDate(value: Date | string | number): Date | null {
  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Preenche números menores que 10 com zero à esquerda.
 */
function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Formata uma quantidade numérica.
 */
export function formatNumber(
  value: number,
  decimalPlaces = 0,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeDecimalPlaces = Math.max(
    0,
    Math.min(10, Math.trunc(decimalPlaces)),
  );

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: safeDecimalPlaces,
    maximumFractionDigits: safeDecimalPlaces,
  }).format(safeValue);
}

/**
 * Formata um percentual.
 *
 * Exemplo:
 * 75 -> "75%"
 * 75.25 -> "75,25%"
 */
export function formatPercentage(
  value: number,
  decimalPlaces = 0,
): string {
  return `${formatNumber(value, decimalPlaces)}%`;
}

/**
 * Formata um percentual com sinal.
 *
 * Exemplo:
 * 12 -> "+12%"
 * -8 -> "-8%"
 * 0 -> "0%"
 */
export function formatSignedPercentage(
  value: number,
  decimalPlaces = 0,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const formattedValue = formatPercentage(
    Math.abs(safeValue),
    decimalPlaces,
  );

  if (safeValue > 0) {
    return `+${formattedValue}`;
  }

  if (safeValue < 0) {
    return `-${formattedValue}`;
  }

  return formattedValue;
}

/**
 * Formata uma variação numérica com sinal.
 *
 * Exemplo:
 * 4 -> "+4"
 * -2 -> "-2"
 * 0 -> "0"
 */
export function formatSignedNumber(
  value: number,
  decimalPlaces = 0,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const formattedValue = formatNumber(
    Math.abs(safeValue),
    decimalPlaces,
  );

  if (safeValue > 0) {
    return `+${formattedValue}`;
  }

  if (safeValue < 0) {
    return `-${formattedValue}`;
  }

  return formattedValue;
}

/**
 * Formata uma data no padrão brasileiro.
 *
 * Exemplo:
 * 18/07/2026
 */
export function formatDate(
  value: Date | string | number,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return [
    padNumber(date.getDate()),
    padNumber(date.getMonth() + 1),
    date.getFullYear(),
  ].join("/");
}

/**
 * Formata uma data no padrão ISO local.
 *
 * Exemplo:
 * 2026-07-18
 */
export function formatDateISO(
  value: Date | string | number,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("-");
}

/**
 * Formata horário no padrão brasileiro.
 *
 * Exemplo:
 * 14:35
 */
export function formatTime(
  value: Date | string | number,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return [
    padNumber(date.getHours()),
    padNumber(date.getMinutes()),
  ].join(":");
}

/**
 * Formata data e horário.
 *
 * Exemplo:
 * 18/07/2026 às 14:35
 */
export function formatDateTime(
  value: Date | string | number,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return `${formatDate(date)} às ${formatTime(date)}`;
}

/**
 * Retorna o nome completo do mês.
 *
 * Aceita índice de 0 a 11.
 */
export function formatMonthName(monthIndex: number): string {
  if (
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex >= MonthNames.length
  ) {
    return "";
  }

  return MonthNames[monthIndex];
}

/**
 * Retorna o nome abreviado do mês.
 *
 * Aceita índice de 0 a 11.
 */
export function formatShortMonthName(
  monthIndex: number,
): string {
  if (
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex >= ShortMonthNames.length
  ) {
    return "";
  }

  return ShortMonthNames[monthIndex];
}

/**
 * Formata mês e ano.
 *
 * Exemplo:
 * Julho de 2026
 */
export function formatMonthYear(
  monthIndex: number,
  year: number,
): string {
  const monthName = formatMonthName(monthIndex);

  if (!monthName || !Number.isInteger(year)) {
    return "";
  }

  return `${monthName} de ${year}`;
}

/**
 * Formata uma semana operacional.
 *
 * Exemplo:
 * Semana 2
 */
export function formatWeekNumber(week: number): string {
  if (!Number.isInteger(week) || week <= 0) {
    return "";
  }

  return `Semana ${week}`;
}

/**
 * Formata o período de uma semana operacional.
 *
 * Exemplo:
 * 13/07/2026 a 18/07/2026
 */
export function formatWeekRange(
  week: Pick<OperationalWeek, "startDate" | "endDate">,
): string {
  const startDate = formatDate(week.startDate);
  const endDate = formatDate(week.endDate);

  if (!startDate || !endDate) {
    return "";
  }

  return `${startDate} a ${endDate}`;
}

/**
 * Formata a identificação completa de uma semana.
 *
 * Exemplo:
 * Semana 2 · 13/07/2026 a 18/07/2026
 */
export function formatOperationalWeek(
  week: OperationalWeek,
): string {
  const weekNumber = formatWeekNumber(week.week);
  const weekRange = formatWeekRange(week);

  if (!weekNumber) {
    return weekRange;
  }

  if (!weekRange) {
    return weekNumber;
  }

  return `${weekNumber} · ${weekRange}`;
}

/**
 * Retorna o nome visível de uma função do efetivo.
 */
export function formatOfficerRole(
  role: OfficerRole,
): string {
  return OfficerRoleLabels[role] ?? role;
}

/**
 * Retorna o nome visível do status de um oficial.
 */
export function formatOfficerStatus(
  status: OfficerStatusValue,
): string {
  return OfficerStatusLabels[status] ?? status;
}

/**
 * Retorna o nome visível de um status de meta.
 */
export function formatGoalStatus(
  status: GoalStatusValue,
): string {
  return GoalStatusLabels[status] ?? status;
}

/**
 * Retorna o nome visível de um status de sincronização.
 */
export function formatSyncStatus(
  status: SyncStatusValue,
): string {
  return SyncStatusLabels[status] ?? status;
}

/**
 * Retorna o nome visível de um tipo de registro operacional.
 */
export function formatEntryType(
  type: EntryType,
): string {
  return EntryTypeLabels[type] ?? type;
}

/**
 * Formata o nome de um oficial.
 */
export function formatOfficerName(name: string): string {
  return normalizeWhitespace(name);
}

/**
 * Formata a identificação resumida de um oficial.
 *
 * Exemplo:
 * Cássio Vieira · Oficial G.A.M.
 */
export function formatOfficer(
  officer: Pick<Officer, "name" | "role">,
): string {
  const name = formatOfficerName(officer.name);
  const role = formatOfficerRole(officer.role);

  if (!name) {
    return role;
  }

  if (!role) {
    return name;
  }

  return `${name} · ${role}`;
}

/**
 * Formata a posição no ranking.
 *
 * Exemplo:
 * 1º
 */
export function formatRankingPosition(
  position: number,
): string {
  if (!Number.isInteger(position) || position <= 0) {
    return "";
  }

  return `${position}º`;
}

/**
 * Formata a movimentação de posição no ranking.
 *
 * Valores positivos indicam subida.
 * Valores negativos indicam queda.
 *
 * Exemplo:
 * +2 posições
 * -1 posição
 * Sem alteração
 */
export function formatPositionChange(
  positionChange?: number,
): string {
  if (
    positionChange === undefined ||
    !Number.isFinite(positionChange) ||
    positionChange === 0
  ) {
    return "Sem alteração";
  }

  const absoluteChange = Math.abs(
    Math.trunc(positionChange),
  );

  const positionLabel =
    absoluteChange === 1 ? "posição" : "posições";

  if (positionChange > 0) {
    return `+${absoluteChange} ${positionLabel}`;
  }

  return `-${absoluteChange} ${positionLabel}`;
}

/**
 * Formata um item do ranking.
 *
 * Exemplo:
 * 1º · Cássio Vieira · 85%
 */
export function formatRankingItem(
  item: Pick<
    RankingItem,
    "position" | "officerName" | "goalPercentage"
  >,
  decimalPlaces = 0,
): string {
  const position = formatRankingPosition(item.position);
  const name = formatOfficerName(item.officerName);
  const percentage = formatPercentage(
    item.goalPercentage,
    decimalPlaces,
  );

  return [position, name, percentage]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Formata uma quantidade com singular ou plural.
 *
 * Exemplo:
 * 1 prisão
 * 3 prisões
 */
export function formatQuantity(
  amount: number,
  singular: string,
  plural: string,
): string {
  const safeAmount = Number.isFinite(amount)
    ? Math.max(0, Math.trunc(amount))
    : 0;

  const label = safeAmount === 1
    ? singular
    : plural;

  return `${safeAmount} ${label}`;
}

/**
 * Formata quantidade de prisões.
 */
export function formatPrisons(amount: number): string {
  return formatQuantity(amount, "prisão", "prisões");
}

/**
 * Formata quantidade de acompanhamentos.
 */
export function formatPursuits(amount: number): string {
  return formatQuantity(
    amount,
    "acompanhamento",
    "acompanhamentos",
  );
}

/**
 * Formata quantidade total de atividades.
 */
export function formatActivities(amount: number): string {
  return formatQuantity(
    amount,
    "atividade",
    "atividades",
  );
}

/**
 * Formata uma média numérica.
 *
 * Exemplo:
 * Média de 4,25
 */
export function formatAverage(
  value: number,
  decimalPlaces = 2,
): string {
  return `Média de ${formatNumber(
    round(value, decimalPlaces),
    decimalPlaces,
  )}`;
}

/**
 * Formata um identificador do Discord.
 *
 * Exemplo:
 * 1234567890 -> ID 1234567890
 */
export function formatDiscordId(
  discordId?: string,
): string {
  const normalizedId = discordId?.trim();

  if (!normalizedId) {
    return "Discord não informado";
  }

  return `ID ${normalizedId}`;
}

/**
 * Retorna as iniciais de um nome.
 *
 * Exemplo:
 * Cássio Vieira Rodrigues -> CV
 */
export function formatInitials(
  name: string,
  maximumInitials = 2,
): string {
  const normalizedName = formatOfficerName(name);

  if (!normalizedName) {
    return "";
  }

  const safeMaximum = Math.max(
    1,
    Math.trunc(maximumInitials),
  );

  return normalizedName
    .split(" ")
    .filter(Boolean)
    .slice(0, safeMaximum)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Trunca um texto preservando um limite máximo.
 */
export function truncateText(
  value: string,
  maximumLength: number,
  suffix = "...",
): string {
  const normalizedValue = normalizeWhitespace(value);
  const safeMaximumLength = Math.max(
    0,
    Math.trunc(maximumLength),
  );

  if (
    safeMaximumLength === 0 ||
    normalizedValue.length <= safeMaximumLength
  ) {
    return normalizedValue;
  }

  if (suffix.length >= safeMaximumLength) {
    return suffix.slice(0, safeMaximumLength);
  }

  return `${normalizedValue.slice(
    0,
    safeMaximumLength - suffix.length,
  )}${suffix}`;
}