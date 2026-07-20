/**
 * ============================================================
 * GAM Analytics Core
 * helpers.ts
 *
 * Funções utilitárias puras e reutilizáveis do Core.
 *
 * Este arquivo não deve depender de React, Next.js, Supabase,
 * Discord ou qualquer camada externa da aplicação.
 * ============================================================
 */

/**
 * Limita um número entre um valor mínimo e máximo.
 */
export function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  if (minimum > maximum) {
    return clamp(value, maximum, minimum);
  }

  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Arredonda um número para a quantidade informada de casas decimais.
 */
export function round(value: number, decimalPlaces = 2): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const safeDecimalPlaces = Math.max(
    0,
    Math.min(10, Math.trunc(decimalPlaces)),
  );

  const factor = 10 ** safeDecimalPlaces;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Soma somente valores numéricos válidos.
 */
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => {
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

/**
 * Calcula a média de uma lista de números válidos.
 */
export function average(values: readonly number[]): number {
  const validValues = values.filter(Number.isFinite);

  if (validValues.length === 0) {
    return 0;
  }

  return sum(validValues) / validValues.length;
}

/**
 * Realiza uma divisão segura.
 *
 * Caso o divisor seja zero ou algum valor seja inválido,
 * retorna o valor de fallback.
 */
export function safeDivide(
  dividend: number,
  divisor: number,
  fallback = 0,
): number {
  if (
    !Number.isFinite(dividend) ||
    !Number.isFinite(divisor) ||
    divisor === 0
  ) {
    return fallback;
  }

  return dividend / divisor;
}

/**
 * Calcula quanto uma parte representa de um total em percentual.
 */
export function percentage(
  value: number,
  total: number,
  decimalPlaces = 2,
): number {
  return round(safeDivide(value, total, 0) * 100, decimalPlaces);
}

/**
 * Calcula a variação percentual entre um valor anterior e o atual.
 *
 * Quando o valor anterior é zero:
 * - retorna 0 se o atual também for zero;
 * - retorna 100 se o atual for maior que zero;
 * - retorna -100 se o atual for menor que zero.
 */
export function percentageChange(
  previousValue: number,
  currentValue: number,
  decimalPlaces = 2,
): number {
  if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue)) {
    return 0;
  }

  if (previousValue === 0) {
    if (currentValue === 0) {
      return 0;
    }

    return currentValue > 0 ? 100 : -100;
  }

  return round(
    ((currentValue - previousValue) / Math.abs(previousValue)) * 100,
    decimalPlaces,
  );
}

/**
 * Retorna apenas valores únicos de uma lista.
 */
export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/**
 * Retorna apenas valores únicos de uma lista utilizando uma chave.
 */
export function uniqueBy<T, K>(
  values: readonly T[],
  getKey: (value: T) => K,
): T[] {
  const seen = new Set<K>();

  return values.filter((value) => {
    const key = getKey(value);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Agrupa itens por uma chave.
 */
export function groupBy<T, K extends PropertyKey>(
  values: readonly T[],
  getKey: (value: T) => K,
): Record<K, T[]> {
  return values.reduce(
    (groups, value) => {
      const key = getKey(value);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(value);

      return groups;
    },
    {} as Record<K, T[]>,
  );
}

/**
 * Ordena uma lista sem modificar o array original.
 */
export function sortBy<T>(
  values: readonly T[],
  compare: (first: T, second: T) => number,
): T[] {
  return [...values].sort(compare);
}

/**
 * Ordena valores numéricos em ordem crescente.
 */
export function sortNumbersAscending(
  values: readonly number[],
): number[] {
  return sortBy(values, (first, second) => first - second);
}

/**
 * Ordena valores numéricos em ordem decrescente.
 */
export function sortNumbersDescending(
  values: readonly number[],
): number[] {
  return sortBy(values, (first, second) => second - first);
}

/**
 * Verifica se um valor é um número inteiro válido.
 */
export function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Verifica se um valor é um número finito não negativo.
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

/**
 * Verifica se um valor é um número inteiro não negativo.
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

/**
 * Verifica se um valor é um número inteiro positivo.
 */
export function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

/**
 * Verifica se uma string possui conteúdo válido.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Normaliza espaços extras de uma string.
 */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Retorna uma string normalizada para comparações.
 *
 * Remove espaços extras, acentos e converte para minúsculas.
 */
export function normalizeText(value: string): string {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Cria uma cópia rasa de um objeto removendo propriedades undefined.
 */
export function removeUndefinedValues<T extends Record<string, unknown>>(
  value: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

/**
 * Divide uma lista em blocos menores.
 */
export function chunk<T>(
  values: readonly T[],
  size: number,
): T[][] {
  const safeSize = Math.max(1, Math.trunc(size));

  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += safeSize) {
    chunks.push(values.slice(index, index + safeSize));
  }

  return chunks;
}

/**
 * Retorna o menor valor numérico válido de uma lista.
 */
export function minimum(values: readonly number[]): number | null {
  const validValues = values.filter(Number.isFinite);

  if (validValues.length === 0) {
    return null;
  }

  return Math.min(...validValues);
}

/**
 * Retorna o maior valor numérico válido de uma lista.
 */
export function maximum(values: readonly number[]): number | null {
  const validValues = values.filter(Number.isFinite);

  if (validValues.length === 0) {
    return null;
  }

  return Math.max(...validValues);
}

/**
 * Retorna o item com o menor valor calculado.
 */
export function minBy<T>(
  values: readonly T[],
  getValue: (value: T) => number,
): T | undefined {
  return values.reduce<T | undefined>((currentMinimum, value) => {
    if (!currentMinimum) {
      return value;
    }

    return getValue(value) < getValue(currentMinimum)
      ? value
      : currentMinimum;
  }, undefined);
}

/**
 * Retorna o item com o maior valor calculado.
 */
export function maxBy<T>(
  values: readonly T[],
  getValue: (value: T) => number,
): T | undefined {
  return values.reduce<T | undefined>((currentMaximum, value) => {
    if (!currentMaximum) {
      return value;
    }

    return getValue(value) > getValue(currentMaximum)
      ? value
      : currentMaximum;
  }, undefined);
}

/**
 * Garante que um valor nunca seja negativo.
 */
export function nonNegative(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

/**
 * Converte um valor desconhecido para número.
 *
 * Retorna o fallback caso a conversão não seja válida.
 */
export function toNumber(
  value: unknown,
  fallback = 0,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const convertedValue = Number(value);

    return Number.isFinite(convertedValue)
      ? convertedValue
      : fallback;
  }

  return fallback;
}

/**
 * Executa uma função e retorna um fallback caso ocorra erro.
 */
export function attempt<T>(
  callback: () => T,
  fallback: T,
): T {
  try {
    return callback();
  } catch {
    return fallback;
  }
}

/**
 * Executa uma função assíncrona e retorna um fallback caso ocorra erro.
 */
export async function attemptAsync<T>(
  callback: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await callback();
  } catch {
    return fallback;
  }
}