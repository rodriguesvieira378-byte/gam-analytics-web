/**
 * ============================================================
 * GAM Analytics Core
 * index.ts
 *
 * Arquivo central de exportações do núcleo da aplicação.
 *
 * Permite importar recursos com:
 *
 * import { ... } from "@/lib/core";
 * ============================================================
 */

export * from "./config";
export * from "./constants";
export * from "./types";
export * from "./errors";
export * from "./helpers";
export * from "./formatter";
export * from "./goals";

/**
 * As funções genéricas de data são exportadas por dates.ts.
 *
 * weeks.ts também possui validações internas com nomes iguais,
 * por isso as exportações da semana operacional são declaradas
 * explicitamente para evitar conflitos no barrel.
 */
export type {
  OperationalWeekReference,
  OperationalWeekRange
} from "./weeks";

export {
  getMaximumOperationalWeeks,
  isValidOperationalWeekNumber,
  assertValidOperationalWeekNumber,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getOperationalWeekStart,
  getOperationalWeekEnd,
  getOperationalWeekRangeFromDate,
  getOperationalWeekNumber,
  getOperationalWeekRange,
  isSameOperationalWeek,
  isCurrentOperationalWeek,
  isOperationalWeekClosed,
  createOperationalWeek,
  createOperationalWeekFromDate,
  getCurrentOperationalWeek,
  getOperationalWeeksForMonth,
  getNextOperationalWeek,
  getPreviousOperationalWeek,
  isDateWithinOperationalWeek,
  getDaysUntilOperationalWeekClosing,
  isOperationalWeekClosingDay,
  getOperationalWeekStartingDay,
  startsOnSunday
} from "./weeks";

export * from "./dates";
export * from "./officers";
export * from "./validation";
export * from "./ranking";
export * from "./statistics";
