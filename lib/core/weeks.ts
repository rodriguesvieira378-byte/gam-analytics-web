/**
 * ============================================================
 * GAM Analytics Core
 * weeks.ts
 *
 * Regras de negócio relacionadas às semanas operacionais.
 *
 * A semana operacional fecha no sábado, conforme definido
 * em CoreConfig.calendar.operationalWeekClosingDay.
 * ============================================================
 */

import { CoreConfig } from "./config";

import {
  CoreLimits,
  Weekdays,
} from "./constants";

import {
  InvalidDateError,
  InvalidMonthError,
  InvalidWeekError,
  InvalidYearError,
} from "./errors";

import {
  isInteger,
} from "./helpers";

import type {
  OperationalWeek,
} from "./types";

/**
 * Dados necessários para localizar uma semana operacional.
 */
export interface OperationalWeekReference {
  week: number;
  month: number;
  year: number;
}

/**
 * Intervalo de datas de uma semana operacional.
 */
export interface OperationalWeekRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Converte um valor para uma nova instância de Date.
 */
function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

/**
 * Cria uma data no horário local, sem horário residual.
 */
function createLocalDate(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Converte uma data para o formato YYYY-MM-DD.
 */
function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma data é válida.
 */
export function isValidDate(date: Date): boolean {
  return (
    date instanceof Date &&
    !Number.isNaN(date.getTime())
  );
}

/**
 * Valida uma data e lança erro quando necessário.
 */
export function assertValidDate(
  date: Date,
): asserts date is Date {
  if (!isValidDate(date)) {
    throw new InvalidDateError(
      "A data informada para a semana operacional é inválida.",
      {
        date,
      },
    );
  }
}

/**
 * Verifica se um mês é válido.
 *
 * O mês utiliza índice de 0 a 11.
 */
export function isValidMonth(month: number): boolean {
  return (
    isInteger(month) &&
    month >= CoreLimits.MIN_MONTH_INDEX &&
    month <= CoreLimits.MAX_MONTH_INDEX
  );
}

/**
 * Valida um mês e lança erro quando necessário.
 */
export function assertValidMonth(
  month: number,
): void {
  if (!isValidMonth(month)) {
    throw new InvalidMonthError(
      "O mês deve ser um número inteiro entre 0 e 11.",
      {
        month,
      },
    );
  }
}

/**
 * Verifica se um ano é válido.
 */
export function isValidYear(year: number): boolean {
  return (
    isInteger(year) &&
    year >= 1970 &&
    year <= 9999
  );
}

/**
 * Valida um ano e lança erro quando necessário.
 */
export function assertValidYear(
  year: number,
): void {
  if (!isValidYear(year)) {
    throw new InvalidYearError(
      "O ano deve ser um número inteiro entre 1970 e 9999.",
      {
        year,
      },
    );
  }
}

/**
 * Retorna a quantidade de semanas operacionais configuradas.
 */
export function getMaximumOperationalWeeks(): number {
  return CoreConfig.calendar.maxWeeksPerMonth;
}

/**
 * Verifica se um número de semana é válido.
 */
export function isValidOperationalWeekNumber(
  week: number,
): boolean {
  return (
    isInteger(week) &&
    week >= CoreLimits.MIN_WEEK_NUMBER &&
    week <= getMaximumOperationalWeeks()
  );
}

/**
 * Valida uma semana e lança erro quando necessário.
 */
export function assertValidOperationalWeekNumber(
  week: number,
): void {
  if (!isValidOperationalWeekNumber(week)) {
    throw new InvalidWeekError(
      `A semana deve ser um número inteiro entre ${CoreLimits.MIN_WEEK_NUMBER} e ${getMaximumOperationalWeeks()}.`,
      {
        week,
      },
    );
  }
}

/**
 * Retorna o primeiro dia do mês.
 */
export function getFirstDayOfMonth(
  month: number,
  year: number,
): Date {
  assertValidMonth(month);
  assertValidYear(year);

  return createLocalDate(year, month, 1);
}

/**
 * Retorna o último dia do mês.
 */
export function getLastDayOfMonth(
  month: number,
  year: number,
): Date {
  assertValidMonth(month);
  assertValidYear(year);

  return createLocalDate(year, month + 1, 0);
}

/**
 * Retorna a quantidade de dias de um mês.
 */
export function getDaysInMonth(
  month: number,
  year: number,
): number {
  return getLastDayOfMonth(
    month,
    year,
  ).getDate();
}

/**
 * Retorna o início da semana operacional que contém a data.
 *
 * Como a semana fecha no sábado, ela inicia no domingo.
 */
export function getOperationalWeekStart(
  date: Date,
): Date {
  assertValidDate(date);

  const startDate = createLocalDate(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const closingDay =
    CoreConfig.calendar.operationalWeekClosingDay;

  const startingDay = (
    closingDay + 1
  ) % 7;

  const difference = (
    startDate.getDay() - startingDay + 7
  ) % 7;

  startDate.setDate(
    startDate.getDate() - difference,
  );

  return startDate;
}

/**
 * Retorna o encerramento da semana operacional que contém a data.
 */
export function getOperationalWeekEnd(
  date: Date,
): Date {
  assertValidDate(date);

  const startDate = getOperationalWeekStart(date);
  const endDate = cloneDate(startDate);

  endDate.setDate(endDate.getDate() + 6);

  return endDate;
}

/**
 * Retorna o intervalo da semana operacional de uma data.
 */
export function getOperationalWeekRangeFromDate(
  date: Date,
): OperationalWeekRange {
  assertValidDate(date);

  return {
    startDate: getOperationalWeekStart(date),
    endDate: getOperationalWeekEnd(date),
  };
}

/**
 * Calcula o número da semana operacional dentro do mês.
 *
 * A primeira semana é a semana que contém o primeiro dia do mês.
 */
export function getOperationalWeekNumber(
  date: Date,
): number {
  assertValidDate(date);

  const firstDayOfMonth = getFirstDayOfMonth(
    date.getMonth(),
    date.getFullYear(),
  );

  const firstOperationalWeekStart =
    getOperationalWeekStart(firstDayOfMonth);

  const currentOperationalWeekStart =
    getOperationalWeekStart(date);

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const differenceInDays = Math.round(
    (
      currentOperationalWeekStart.getTime() -
      firstOperationalWeekStart.getTime()
    ) / millisecondsPerDay,
  );

  const calculatedWeek =
    Math.floor(differenceInDays / 7) + 1;

  return Math.min(
    Math.max(
      calculatedWeek,
      CoreLimits.MIN_WEEK_NUMBER,
    ),
    getMaximumOperationalWeeks(),
  );
}

/**
 * Retorna o intervalo de uma semana operacional específica.
 */
export function getOperationalWeekRange(
  reference: OperationalWeekReference,
): OperationalWeekRange {
  assertValidOperationalWeekNumber(reference.week);
  assertValidMonth(reference.month);
  assertValidYear(reference.year);

  const firstDayOfMonth = getFirstDayOfMonth(
    reference.month,
    reference.year,
  );

  const firstWeekStart =
    getOperationalWeekStart(firstDayOfMonth);

  const startDate = cloneDate(firstWeekStart);

  startDate.setDate(
    startDate.getDate() +
    (reference.week - 1) * 7,
  );

  const endDate = cloneDate(startDate);

  endDate.setDate(endDate.getDate() + 6);

  return {
    startDate,
    endDate,
  };
}

/**
 * Verifica se duas datas pertencem à mesma semana operacional.
 */
export function isSameOperationalWeek(
  firstDate: Date,
  secondDate: Date,
): boolean {
  assertValidDate(firstDate);
  assertValidDate(secondDate);

  const firstStart =
    getOperationalWeekStart(firstDate);

  const secondStart =
    getOperationalWeekStart(secondDate);

  return (
    firstStart.getFullYear() ===
      secondStart.getFullYear() &&
    firstStart.getMonth() ===
      secondStart.getMonth() &&
    firstStart.getDate() ===
      secondStart.getDate()
  );
}

/**
 * Verifica se uma data pertence à semana operacional atual.
 */
export function isCurrentOperationalWeek(
  date: Date,
  currentDate = new Date(),
): boolean {
  return isSameOperationalWeek(
    date,
    currentDate,
  );
}

/**
 * Verifica se uma semana operacional já foi encerrada.
 */
export function isOperationalWeekClosed(
  endDate: Date,
  currentDate = new Date(),
): boolean {
  assertValidDate(endDate);
  assertValidDate(currentDate);

  const normalizedEndDate = createLocalDate(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  const normalizedCurrentDate = createLocalDate(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  return (
    normalizedCurrentDate.getTime() >
    normalizedEndDate.getTime()
  );
}

/**
 * Cria uma estrutura completa de semana operacional.
 */
export function createOperationalWeek(
  reference: OperationalWeekReference,
  currentDate = new Date(),
): OperationalWeek {
  assertValidDate(currentDate);

  const range =
    getOperationalWeekRange(reference);

  return {
    week: reference.week,
    month: reference.month,
    year: reference.year,
    startDate: toLocalISODate(range.startDate),
    endDate: toLocalISODate(range.endDate),
    isCurrent: isCurrentOperationalWeek(
      range.startDate,
      currentDate,
    ),
    isClosed: isOperationalWeekClosed(
      range.endDate,
      currentDate,
    ),
  };
}

/**
 * Cria a semana operacional correspondente a uma data.
 */
export function createOperationalWeekFromDate(
  date: Date,
  currentDate = new Date(),
): OperationalWeek {
  assertValidDate(date);
  assertValidDate(currentDate);

  const week =
    getOperationalWeekNumber(date);

  const range =
    getOperationalWeekRangeFromDate(date);

  return {
    week,
    month: date.getMonth(),
    year: date.getFullYear(),
    startDate: toLocalISODate(range.startDate),
    endDate: toLocalISODate(range.endDate),
    isCurrent: isSameOperationalWeek(
      date,
      currentDate,
    ),
    isClosed: isOperationalWeekClosed(
      range.endDate,
      currentDate,
    ),
  };
}

/**
 * Retorna a semana operacional atual.
 */
export function getCurrentOperationalWeek(
  currentDate = new Date(),
): OperationalWeek {
  return createOperationalWeekFromDate(
    currentDate,
    currentDate,
  );
}

/**
 * Retorna todas as semanas operacionais de um mês.
 */
export function getOperationalWeeksForMonth(
  month: number,
  year: number,
  currentDate = new Date(),
): OperationalWeek[] {
  assertValidMonth(month);
  assertValidYear(year);
  assertValidDate(currentDate);

  const weeks: OperationalWeek[] = [];

  for (
    let week = CoreLimits.MIN_WEEK_NUMBER;
    week <= getMaximumOperationalWeeks();
    week += 1
  ) {
    weeks.push(
      createOperationalWeek(
        {
          week,
          month,
          year,
        },
        currentDate,
      ),
    );
  }

  return weeks;
}

/**
 * Retorna a próxima semana operacional.
 */
export function getNextOperationalWeek(
  date: Date,
): OperationalWeek {
  assertValidDate(date);

  const nextDate =
    getOperationalWeekStart(date);

  nextDate.setDate(
    nextDate.getDate() + 7,
  );

  return createOperationalWeekFromDate(nextDate);
}

/**
 * Retorna a semana operacional anterior.
 */
export function getPreviousOperationalWeek(
  date: Date,
): OperationalWeek {
  assertValidDate(date);

  const previousDate =
    getOperationalWeekStart(date);

  previousDate.setDate(
    previousDate.getDate() - 7,
  );

  return createOperationalWeekFromDate(previousDate);
}

/**
 * Verifica se uma data está dentro de um intervalo operacional.
 */
export function isDateWithinOperationalWeek(
  date: Date,
  range: OperationalWeekRange,
): boolean {
  assertValidDate(date);
  assertValidDate(range.startDate);
  assertValidDate(range.endDate);

  const normalizedDate = createLocalDate(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return (
    normalizedDate.getTime() >=
      range.startDate.getTime() &&
    normalizedDate.getTime() <=
      range.endDate.getTime()
  );
}

/**
 * Retorna quantos dias faltam para o fechamento da semana.
 */
export function getDaysUntilOperationalWeekClosing(
  date = new Date(),
): number {
  assertValidDate(date);

  const endDate =
    getOperationalWeekEnd(date);

  const normalizedDate = createLocalDate(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.max(
    0,
    Math.round(
      (
        endDate.getTime() -
        normalizedDate.getTime()
      ) / millisecondsPerDay,
    ),
  );
}

/**
 * Verifica se a data corresponde ao dia de fechamento.
 */
export function isOperationalWeekClosingDay(
  date = new Date(),
): boolean {
  assertValidDate(date);

  return (
    date.getDay() ===
    CoreConfig.calendar.operationalWeekClosingDay
  );
}

/**
 * Retorna o nome do dia que inicia a semana operacional.
 */
export function getOperationalWeekStartingDay(): number {
  return (
    CoreConfig.calendar.operationalWeekClosingDay +
    1
  ) % 7;
}

/**
 * Confirma que o calendário atual usa domingo como início.
 */
export function startsOnSunday(): boolean {
  return (
    getOperationalWeekStartingDay() ===
    Weekdays.SUNDAY
  );
}