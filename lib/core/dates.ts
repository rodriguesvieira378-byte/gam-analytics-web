/**
 * ============================================================
 * GAM Analytics Core
 * dates.ts
 *
 * Funções puras para manipulação, comparação e conversão
 * de datas utilizadas pelo GAM Analytics.
 *
 * Este arquivo trabalha com datas locais para evitar alterações
 * indesejadas causadas por fuso horário.
 * ============================================================
 */

import {
  MonthNames,
  ShortMonthNames,
} from "./constants";

import {
  InvalidDateError,
  InvalidMonthError,
  InvalidYearError,
} from "./errors";

import {
  isInteger,
} from "./helpers";

/**
 * Tipos de valores aceitos pelas funções de data.
 */
export type DateInput = Date | string | number;

/**
 * Estrutura separada de uma data.
 */
export interface DateParts {
  day: number;
  month: number;
  year: number;
}

/**
 * Intervalo de datas.
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Quantidade de milissegundos em um dia.
 */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Cria uma data local sem horário residual.
 */
export function createDate(
  year: number,
  month: number,
  day: number,
): Date {
  assertValidYear(year);
  assertValidMonth(month);

  if (
    !isInteger(day) ||
    day < 1 ||
    day > getDaysInMonth(month, year)
  ) {
    throw new InvalidDateError(
      "O dia informado é inválido para o mês e ano selecionados.",
      {
        day,
        month,
        year,
      },
    );
  }

  return new Date(
    year,
    month,
    day,
    0,
    0,
    0,
    0,
  );
}

/**
 * Cria uma cópia independente de uma data.
 */
export function cloneDate(date: Date): Date {
  assertValidDate(date);

  return new Date(date.getTime());
}

/**
 * Converte uma entrada para Date.
 *
 * Strings no formato YYYY-MM-DD são interpretadas como data local.
 */
export function parseDate(
  value: DateInput,
): Date | null {
  if (value instanceof Date) {
    return isValidDate(value)
      ? cloneDate(value)
      : null;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();

    const isoDateMatch =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        normalizedValue,
      );

    if (isoDateMatch) {
      const year = Number(isoDateMatch[1]);
      const month = Number(isoDateMatch[2]) - 1;
      const day = Number(isoDateMatch[3]);

      if (
        !isValidYear(year) ||
        !isValidMonth(month)
      ) {
        return null;
      }

      const maximumDay =
        getDaysInMonth(month, year);

      if (day < 1 || day > maximumDay) {
        return null;
      }

      return createDate(year, month, day);
    }
  }

  const parsedDate = new Date(value);

  if (!isValidDate(parsedDate)) {
    return null;
  }

  return parsedDate;
}

/**
 * Converte uma entrada para Date e lança erro se for inválida.
 */
export function toDate(
  value: DateInput,
): Date {
  const date = parseDate(value);

  if (!date) {
    throw new InvalidDateError(
      "Não foi possível converter o valor informado para uma data válida.",
      {
        value,
      },
    );
  }

  return date;
}

/**
 * Verifica se um objeto Date é válido.
 */
export function isValidDate(
  value: unknown,
): value is Date {
  return (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
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
      "A data informada é inválida.",
      {
        date,
      },
    );
  }
}

/**
 * Verifica se um índice de mês é válido.
 *
 * Janeiro = 0
 * Dezembro = 11
 */
export function isValidMonth(
  month: number,
): boolean {
  return (
    isInteger(month) &&
    month >= 0 &&
    month <= 11
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
export function isValidYear(
  year: number,
): boolean {
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
 * Remove horário, minutos, segundos e milissegundos.
 */
export function startOfDay(
  value: DateInput,
): Date {
  const date = toDate(value);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Retorna o último instante do dia.
 */
export function endOfDay(
  value: DateInput,
): Date {
  const date = toDate(value);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

/**
 * Retorna o primeiro dia do mês.
 */
export function startOfMonth(
  value: DateInput,
): Date {
  const date = toDate(value);

  return createDate(
    date.getFullYear(),
    date.getMonth(),
    1,
  );
}

/**
 * Retorna o último dia do mês.
 */
export function endOfMonth(
  value: DateInput,
): Date {
  const date = toDate(value);

  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

/**
 * Retorna o primeiro dia do ano.
 */
export function startOfYear(
  value: DateInput,
): Date {
  const date = toDate(value);

  return createDate(
    date.getFullYear(),
    0,
    1,
  );
}

/**
 * Retorna o último dia do ano.
 */
export function endOfYear(
  value: DateInput,
): Date {
  const date = toDate(value);

  return new Date(
    date.getFullYear(),
    11,
    31,
    23,
    59,
    59,
    999,
  );
}

/**
 * Retorna a quantidade de dias em um mês.
 */
export function getDaysInMonth(
  month: number,
  year: number,
): number {
  assertValidMonth(month);
  assertValidYear(year);

  return new Date(
    year,
    month + 1,
    0,
  ).getDate();
}

/**
 * Verifica se um ano é bissexto.
 */
export function isLeapYear(
  year: number,
): boolean {
  assertValidYear(year);

  return (
    year % 400 === 0 ||
    (
      year % 4 === 0 &&
      year % 100 !== 0
    )
  );
}

/**
 * Retorna as partes de uma data.
 */
export function getDateParts(
  value: DateInput,
): DateParts {
  const date = toDate(value);

  return {
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

/**
 * Converte uma data para YYYY-MM-DD usando horário local.
 */
export function toLocalISODate(
  value: DateInput,
): string {
  const date = toDate(value);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Converte uma data para timestamp ISO completo.
 */
export function toISOString(
  value: DateInput,
): string {
  return toDate(value).toISOString();
}

/**
 * Adiciona dias sem modificar a data original.
 */
export function addDays(
  value: DateInput,
  amount: number,
): Date {
  const date = toDate(value);

  if (!Number.isFinite(amount)) {
    return date;
  }

  date.setDate(
    date.getDate() + Math.trunc(amount),
  );

  return date;
}

/**
 * Remove dias sem modificar a data original.
 */
export function subtractDays(
  value: DateInput,
  amount: number,
): Date {
  return addDays(
    value,
    -Math.trunc(amount),
  );
}

/**
 * Adiciona meses sem modificar a data original.
 *
 * Mantém o dia quando possível e ajusta para o último dia
 * do mês quando o mês de destino possui menos dias.
 */
export function addMonths(
  value: DateInput,
  amount: number,
): Date {
  const date = toDate(value);

  if (!Number.isFinite(amount)) {
    return date;
  }

  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(
    date.getMonth() + Math.trunc(amount),
  );

  const maximumDay = getDaysInMonth(
    date.getMonth(),
    date.getFullYear(),
  );

  date.setDate(
    Math.min(originalDay, maximumDay),
  );

  return date;
}

/**
 * Remove meses sem modificar a data original.
 */
export function subtractMonths(
  value: DateInput,
  amount: number,
): Date {
  return addMonths(
    value,
    -Math.trunc(amount),
  );
}

/**
 * Adiciona anos sem modificar a data original.
 */
export function addYears(
  value: DateInput,
  amount: number,
): Date {
  const date = toDate(value);

  if (!Number.isFinite(amount)) {
    return date;
  }

  const targetYear =
    date.getFullYear() + Math.trunc(amount);

  const originalMonth = date.getMonth();
  const originalDay = date.getDate();

  const maximumDay = getDaysInMonth(
    originalMonth,
    targetYear,
  );

  date.setFullYear(
    targetYear,
    originalMonth,
    Math.min(originalDay, maximumDay),
  );

  return date;
}

/**
 * Remove anos sem modificar a data original.
 */
export function subtractYears(
  value: DateInput,
  amount: number,
): Date {
  return addYears(
    value,
    -Math.trunc(amount),
  );
}

/**
 * Compara duas datas ignorando o horário.
 *
 * Retorna:
 * - valor negativo se a primeira for anterior;
 * - zero se forem iguais;
 * - valor positivo se a primeira for posterior.
 */
export function compareDates(
  firstValue: DateInput,
  secondValue: DateInput,
): number {
  const firstDate =
    startOfDay(firstValue).getTime();

  const secondDate =
    startOfDay(secondValue).getTime();

  return firstDate - secondDate;
}

/**
 * Verifica se duas datas representam o mesmo dia.
 */
export function isSameDay(
  firstValue: DateInput,
  secondValue: DateInput,
): boolean {
  return (
    compareDates(
      firstValue,
      secondValue,
    ) === 0
  );
}

/**
 * Verifica se duas datas estão no mesmo mês e ano.
 */
export function isSameMonth(
  firstValue: DateInput,
  secondValue: DateInput,
): boolean {
  const firstDate = toDate(firstValue);
  const secondDate = toDate(secondValue);

  return (
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getFullYear() ===
      secondDate.getFullYear()
  );
}

/**
 * Verifica se duas datas estão no mesmo ano.
 */
export function isSameYear(
  firstValue: DateInput,
  secondValue: DateInput,
): boolean {
  return (
    toDate(firstValue).getFullYear() ===
    toDate(secondValue).getFullYear()
  );
}

/**
 * Verifica se uma data é anterior a outra.
 */
export function isBefore(
  firstValue: DateInput,
  secondValue: DateInput,
): boolean {
  return (
    compareDates(
      firstValue,
      secondValue,
    ) < 0
  );
}

/**
 * Verifica se uma data é posterior a outra.
 */
export function isAfter(
  firstValue: DateInput,
  secondValue: DateInput,
): boolean {
  return (
    compareDates(
      firstValue,
      secondValue,
    ) > 0
  );
}

/**
 * Verifica se uma data é hoje.
 */
export function isToday(
  value: DateInput,
  currentDate: DateInput = new Date(),
): boolean {
  return isSameDay(
    value,
    currentDate,
  );
}

/**
 * Verifica se uma data está no passado.
 */
export function isPastDate(
  value: DateInput,
  currentDate: DateInput = new Date(),
): boolean {
  return isBefore(
    value,
    currentDate,
  );
}

/**
 * Verifica se uma data está no futuro.
 */
export function isFutureDate(
  value: DateInput,
  currentDate: DateInput = new Date(),
): boolean {
  return isAfter(
    value,
    currentDate,
  );
}

/**
 * Verifica se uma data está dentro de um intervalo inclusivo.
 */
export function isDateWithinRange(
  value: DateInput,
  range: DateRange,
): boolean {
  const date = startOfDay(value).getTime();
  const startDate =
    startOfDay(range.startDate).getTime();
  const endDate =
    startOfDay(range.endDate).getTime();

  const minimum = Math.min(
    startDate,
    endDate,
  );

  const maximum = Math.max(
    startDate,
    endDate,
  );

  return (
    date >= minimum &&
    date <= maximum
  );
}

/**
 * Retorna a diferença absoluta de dias entre duas datas.
 */
export function differenceInDays(
  firstValue: DateInput,
  secondValue: DateInput,
): number {
  const firstDate =
    startOfDay(firstValue).getTime();

  const secondDate =
    startOfDay(secondValue).getTime();

  return Math.round(
    Math.abs(
      firstDate - secondDate,
    ) / MILLISECONDS_PER_DAY,
  );
}

/**
 * Retorna a diferença de dias preservando a direção.
 *
 * Resultado positivo:
 * a segunda data está depois da primeira.
 *
 * Resultado negativo:
 * a segunda data está antes da primeira.
 */
export function signedDifferenceInDays(
  firstValue: DateInput,
  secondValue: DateInput,
): number {
  const firstDate =
    startOfDay(firstValue).getTime();

  const secondDate =
    startOfDay(secondValue).getTime();

  return Math.round(
    (
      secondDate - firstDate
    ) / MILLISECONDS_PER_DAY,
  );
}

/**
 * Retorna o próximo dia.
 */
export function getNextDay(
  value: DateInput,
): Date {
  return addDays(value, 1);
}

/**
 * Retorna o dia anterior.
 */
export function getPreviousDay(
  value: DateInput,
): Date {
  return subtractDays(value, 1);
}

/**
 * Retorna o próximo mês.
 */
export function getNextMonth(
  value: DateInput,
): Date {
  return addMonths(value, 1);
}

/**
 * Retorna o mês anterior.
 */
export function getPreviousMonth(
  value: DateInput,
): Date {
  return subtractMonths(value, 1);
}

/**
 * Retorna o nome completo de um mês.
 */
export function getMonthName(
  month: number,
): string {
  assertValidMonth(month);

  return MonthNames[month];
}

/**
 * Retorna o nome abreviado de um mês.
 */
export function getShortMonthName(
  month: number,
): string {
  assertValidMonth(month);

  return ShortMonthNames[month];
}

/**
 * Retorna todas as datas de um intervalo.
 */
export function getDatesInRange(
  range: DateRange,
): Date[] {
  const startDate =
    startOfDay(range.startDate);

  const endDate =
    startOfDay(range.endDate);

  const firstDate =
    startDate.getTime() <= endDate.getTime()
      ? startDate
      : endDate;

  const lastDate =
    startDate.getTime() <= endDate.getTime()
      ? endDate
      : startDate;

  const dates: Date[] = [];
  let currentDate = cloneDate(firstDate);

  while (
    currentDate.getTime() <=
    lastDate.getTime()
  ) {
    dates.push(cloneDate(currentDate));

    currentDate = addDays(
      currentDate,
      1,
    );
  }

  return dates;
}

/**
 * Retorna a data mais antiga de uma lista.
 */
export function getEarliestDate(
  values: readonly DateInput[],
): Date | null {
  if (values.length === 0) {
    return null;
  }

  let earliestDate: Date | null = null;

  for (const value of values) {
    const date = parseDate(value);

    if (!date) {
      continue;
    }

    if (
      !earliestDate ||
      date.getTime() < earliestDate.getTime()
    ) {
      earliestDate = date;
    }
  }

  return earliestDate;
}

/**
 * Retorna a data mais recente de uma lista.
 */
export function getLatestDate(
  values: readonly DateInput[],
): Date | null {
  if (values.length === 0) {
    return null;
  }

  let latestDate: Date | null = null;

  for (const value of values) {
    const date = parseDate(value);

    if (!date) {
      continue;
    }

    if (
      !latestDate ||
      date.getTime() > latestDate.getTime()
    ) {
      latestDate = date;
    }
  }

  return latestDate;
}

/**
 * Ordena datas da mais antiga para a mais recente.
 */
export function sortDatesAscending(
  values: readonly DateInput[],
): Date[] {
  return values
    .map(parseDate)
    .filter(
      (date): date is Date =>
        date !== null,
    )
    .sort(
      (firstDate, secondDate) =>
        firstDate.getTime() -
        secondDate.getTime(),
    );
}

/**
 * Ordena datas da mais recente para a mais antiga.
 */
export function sortDatesDescending(
  values: readonly DateInput[],
): Date[] {
  return values
    .map(parseDate)
    .filter(
      (date): date is Date =>
        date !== null,
    )
    .sort(
      (firstDate, secondDate) =>
        secondDate.getTime() -
        firstDate.getTime(),
    );
}