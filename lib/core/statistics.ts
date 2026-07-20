/**
 * ============================================================
 * GAM Analytics Core
 * statistics.ts
 *
 * Funções de análise estatística da unidade G.A.M.
 *
 * Este arquivo trabalha com prisões e acompanhamentos de forma
 * separada. Não existe sistema de soma de pontos entre as duas
 * atividades.
 * ============================================================
 */

import {
  average,
  nonNegative,
  round,
} from "./helpers";

/**
 * Dados operacionais básicos utilizados nas estatísticas.
 */
export interface OperationalValues {
  prisons: number;
  pursuits: number;
}

/**
 * Dados de uma semana operacional.
 */
export interface WeeklyOperationalValues
  extends OperationalValues {
  week: number;
}

/**
 * Dados de um oficial para análise estatística.
 */
export interface OfficerOperationalValues
  extends OperationalValues {
  officerId: string;
  officerName: string;
}

/**
 * Comparação entre dois períodos.
 */
export interface PeriodComparison {
  previousValue: number;
  currentValue: number;
  difference: number;
  percentageChange: number;
  direction: StatisticDirection;
}

/**
 * Comparação completa das atividades operacionais.
 */
export interface OperationalComparison {
  prisons: PeriodComparison;
  pursuits: PeriodComparison;
}

/**
 * Resumo estatístico de uma lista de valores.
 */
export interface NumericStatistics {
  total: number;
  average: number;
  highest: number;
  lowest: number;
  median: number;
  range: number;
  amount: number;
}

/**
 * Resumo geral das atividades da G.A.M.
 */
export interface OperationalStatistics {
  prisons: NumericStatistics;
  pursuits: NumericStatistics;
  totalRecords: number;
}

/**
 * Melhor ou pior semana encontrada.
 */
export interface WeeklyHighlight
  extends WeeklyOperationalValues {
  total: number;
}

/**
 * Resultado de tendência de um conjunto de valores.
 */
export interface TrendResult {
  direction: StatisticDirection;
  firstValue: number;
  lastValue: number;
  difference: number;
  percentageChange: number;
}

/**
 * Participação percentual de uma atividade.
 */
export interface ActivityDistribution {
  prisons: number;
  pursuits: number;
}

/**
 * Direção identificada em uma comparação.
 */
export type StatisticDirection =
  | "increase"
  | "decrease"
  | "stable";

/**
 * Critério utilizado para procurar uma semana de destaque.
 */
export type WeeklyHighlightCriterion =
  | "prisons"
  | "pursuits"
  | "total";

/**
 * Normaliza um valor operacional.
 */
export function normalizeStatisticValue(
  value: number,
  decimalPlaces = 2,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return round(
    nonNegative(value),
    decimalPlaces,
  );
}

/**
 * Normaliza uma lista de valores numéricos.
 */
export function normalizeStatisticValues(
  values: readonly number[],
  decimalPlaces = 2,
): number[] {
  return values.map((value) =>
    normalizeStatisticValue(
      value,
      decimalPlaces,
    ),
  );
}

/**
 * Soma uma lista de valores.
 */
export function calculateTotal(
  values: readonly number[],
  decimalPlaces = 2,
): number {
  const total = normalizeStatisticValues(
    values,
    decimalPlaces,
  ).reduce(
    (accumulator, value) =>
      accumulator + value,
    0,
  );

  return round(total, decimalPlaces);
}

/**
 * Calcula a média de uma lista de valores.
 */
export function calculateAverage(
  values: readonly number[],
  decimalPlaces = 2,
): number {
  if (values.length === 0) {
    return 0;
  }

  return round(
    average(
      normalizeStatisticValues(
        values,
        decimalPlaces,
      ),
    ),
    decimalPlaces,
  );
}

/**
 * Retorna o maior valor de uma lista.
 */
export function calculateHighest(
  values: readonly number[],
  decimalPlaces = 2,
): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(
    ...normalizeStatisticValues(
      values,
      decimalPlaces,
    ),
  );
}

/**
 * Retorna o menor valor de uma lista.
 */
export function calculateLowest(
  values: readonly number[],
  decimalPlaces = 2,
): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.min(
    ...normalizeStatisticValues(
      values,
      decimalPlaces,
    ),
  );
}

/**
 * Calcula a mediana de uma lista.
 */
export function calculateMedian(
  values: readonly number[],
  decimalPlaces = 2,
): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [
    ...normalizeStatisticValues(
      values,
      decimalPlaces,
    ),
  ].sort(
    (firstValue, secondValue) =>
      firstValue - secondValue,
  );

  const middleIndex = Math.floor(
    sortedValues.length / 2,
  );

  if (sortedValues.length % 2 !== 0) {
    return sortedValues[middleIndex];
  }

  const firstMiddleValue =
    sortedValues[middleIndex - 1];

  const secondMiddleValue =
    sortedValues[middleIndex];

  return round(
    (
      firstMiddleValue +
      secondMiddleValue
    ) / 2,
    decimalPlaces,
  );
}

/**
 * Calcula a amplitude de uma lista.
 */
export function calculateRange(
  values: readonly number[],
  decimalPlaces = 2,
): number {
  if (values.length === 0) {
    return 0;
  }

  return round(
    calculateHighest(
      values,
      decimalPlaces,
    ) -
      calculateLowest(
        values,
        decimalPlaces,
      ),
    decimalPlaces,
  );
}

/**
 * Monta o resumo estatístico de uma lista.
 */
export function calculateNumericStatistics(
  values: readonly number[],
  decimalPlaces = 2,
): NumericStatistics {
  return {
    total: calculateTotal(
      values,
      decimalPlaces,
    ),
    average: calculateAverage(
      values,
      decimalPlaces,
    ),
    highest: calculateHighest(
      values,
      decimalPlaces,
    ),
    lowest: calculateLowest(
      values,
      decimalPlaces,
    ),
    median: calculateMedian(
      values,
      decimalPlaces,
    ),
    range: calculateRange(
      values,
      decimalPlaces,
    ),
    amount: values.length,
  };
}

/**
 * Retorna a direção de uma diferença.
 */
export function getStatisticDirection(
  difference: number,
): StatisticDirection {
  if (difference > 0) {
    return "increase";
  }

  if (difference < 0) {
    return "decrease";
  }

  return "stable";
}

/**
 * Calcula a diferença absoluta entre dois valores.
 */
export function calculateDifference(
  previousValue: number,
  currentValue: number,
  decimalPlaces = 2,
): number {
  const previous =
    normalizeStatisticValue(
      previousValue,
      decimalPlaces,
    );

  const current =
    normalizeStatisticValue(
      currentValue,
      decimalPlaces,
    );

  return round(
    current - previous,
    decimalPlaces,
  );
}

/**
 * Calcula a variação percentual entre dois valores.
 *
 * Quando o valor anterior é zero:
 * - zero para zero retorna 0%;
 * - zero para valor positivo retorna 100%.
 */
export function calculatePercentageChange(
  previousValue: number,
  currentValue: number,
  decimalPlaces = 2,
): number {
  const previous =
    normalizeStatisticValue(
      previousValue,
      decimalPlaces,
    );

  const current =
    normalizeStatisticValue(
      currentValue,
      decimalPlaces,
    );

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return round(
    (
      (current - previous) /
      previous
    ) * 100,
    decimalPlaces,
  );
}

/**
 * Compara um valor atual com o período anterior.
 */
export function comparePeriodValues(
  previousValue: number,
  currentValue: number,
  decimalPlaces = 2,
): PeriodComparison {
  const previous =
    normalizeStatisticValue(
      previousValue,
      decimalPlaces,
    );

  const current =
    normalizeStatisticValue(
      currentValue,
      decimalPlaces,
    );

  const difference =
    calculateDifference(
      previous,
      current,
      decimalPlaces,
    );

  return {
    previousValue: previous,
    currentValue: current,
    difference,
    percentageChange:
      calculatePercentageChange(
        previous,
        current,
        decimalPlaces,
      ),
    direction:
      getStatisticDirection(
        difference,
      ),
  };
}

/**
 * Compara prisões e acompanhamentos de dois períodos.
 */
export function compareOperationalPeriods(
  previousPeriod: OperationalValues,
  currentPeriod: OperationalValues,
  decimalPlaces = 2,
): OperationalComparison {
  return {
    prisons: comparePeriodValues(
      previousPeriod.prisons,
      currentPeriod.prisons,
      decimalPlaces,
    ),
    pursuits: comparePeriodValues(
      previousPeriod.pursuits,
      currentPeriod.pursuits,
      decimalPlaces,
    ),
  };
}

/**
 * Calcula estatísticas de vários registros operacionais.
 */
export function calculateOperationalStatistics(
  records: readonly OperationalValues[],
  decimalPlaces = 2,
): OperationalStatistics {
  const prisonValues = records.map(
    (record) => record.prisons,
  );

  const pursuitValues = records.map(
    (record) => record.pursuits,
  );

  return {
    prisons:
      calculateNumericStatistics(
        prisonValues,
        decimalPlaces,
      ),
    pursuits:
      calculateNumericStatistics(
        pursuitValues,
        decimalPlaces,
      ),
    totalRecords: records.length,
  };
}

/**
 * Soma todos os registros operacionais.
 */
export function sumOperationalValues(
  records: readonly OperationalValues[],
): OperationalValues {
  return records.reduce<OperationalValues>(
    (accumulator, record) => ({
      prisons:
        accumulator.prisons +
        normalizeStatisticValue(
          record.prisons,
        ),
      pursuits:
        accumulator.pursuits +
        normalizeStatisticValue(
          record.pursuits,
        ),
    }),
    {
      prisons: 0,
      pursuits: 0,
    },
  );
}

/**
 * Calcula a média das atividades operacionais.
 */
export function averageOperationalValues(
  records: readonly OperationalValues[],
  decimalPlaces = 2,
): OperationalValues {
  if (records.length === 0) {
    return {
      prisons: 0,
      pursuits: 0,
    };
  }

  return {
    prisons: calculateAverage(
      records.map(
        (record) => record.prisons,
      ),
      decimalPlaces,
    ),
    pursuits: calculateAverage(
      records.map(
        (record) => record.pursuits,
      ),
      decimalPlaces,
    ),
  };
}

/**
 * Retorna o total combinado apenas para exibição geral.
 *
 * Esse total não representa pontuação e não deve ser utilizado
 * como regra de ranking.
 */
export function calculateOperationalVolume(
  values: OperationalValues,
): number {
  return (
    normalizeStatisticValue(
      values.prisons,
    ) +
    normalizeStatisticValue(
      values.pursuits,
    )
  );
}

/**
 * Retorna o valor utilizado por um critério de semana.
 */
function getWeeklyCriterionValue(
  values: WeeklyOperationalValues,
  criterion: WeeklyHighlightCriterion,
): number {
  if (criterion === "prisons") {
    return normalizeStatisticValue(
      values.prisons,
    );
  }

  if (criterion === "pursuits") {
    return normalizeStatisticValue(
      values.pursuits,
    );
  }

  return calculateOperationalVolume(
    values,
  );
}

/**
 * Retorna a melhor semana de um período.
 */
export function getBestWeek(
  weeks: readonly WeeklyOperationalValues[],
  criterion: WeeklyHighlightCriterion = "total",
): WeeklyHighlight | null {
  if (weeks.length === 0) {
    return null;
  }

  const bestWeek = weeks.reduce(
    (currentBest, currentWeek) => {
      const currentBestValue =
        getWeeklyCriterionValue(
          currentBest,
          criterion,
        );

      const currentWeekValue =
        getWeeklyCriterionValue(
          currentWeek,
          criterion,
        );

      if (
        currentWeekValue >
        currentBestValue
      ) {
        return currentWeek;
      }

      if (
        currentWeekValue ===
          currentBestValue &&
        currentWeek.week <
          currentBest.week
      ) {
        return currentWeek;
      }

      return currentBest;
    },
  );

  return {
    ...bestWeek,
    prisons:
      normalizeStatisticValue(
        bestWeek.prisons,
      ),
    pursuits:
      normalizeStatisticValue(
        bestWeek.pursuits,
      ),
    total:
      calculateOperationalVolume(
        bestWeek,
      ),
  };
}

/**
 * Retorna a semana com menor resultado.
 */
export function getWorstWeek(
  weeks: readonly WeeklyOperationalValues[],
  criterion: WeeklyHighlightCriterion = "total",
): WeeklyHighlight | null {
  if (weeks.length === 0) {
    return null;
  }

  const worstWeek = weeks.reduce(
    (currentWorst, currentWeek) => {
      const currentWorstValue =
        getWeeklyCriterionValue(
          currentWorst,
          criterion,
        );

      const currentWeekValue =
        getWeeklyCriterionValue(
          currentWeek,
          criterion,
        );

      if (
        currentWeekValue <
        currentWorstValue
      ) {
        return currentWeek;
      }

      if (
        currentWeekValue ===
          currentWorstValue &&
        currentWeek.week <
          currentWorst.week
      ) {
        return currentWeek;
      }

      return currentWorst;
    },
  );

  return {
    ...worstWeek,
    prisons:
      normalizeStatisticValue(
        worstWeek.prisons,
      ),
    pursuits:
      normalizeStatisticValue(
        worstWeek.pursuits,
      ),
    total:
      calculateOperationalVolume(
        worstWeek,
      ),
  };
}

/**
 * Ordena as semanas pelo número da semana.
 */
export function sortWeeksChronologically(
  weeks: readonly WeeklyOperationalValues[],
): WeeklyOperationalValues[] {
  return [...weeks].sort(
    (firstWeek, secondWeek) =>
      firstWeek.week -
      secondWeek.week,
  );
}

/**
 * Calcula a tendência entre o primeiro e o último valor.
 */
export function calculateTrend(
  values: readonly number[],
  decimalPlaces = 2,
): TrendResult {
  if (values.length === 0) {
    return {
      direction: "stable",
      firstValue: 0,
      lastValue: 0,
      difference: 0,
      percentageChange: 0,
    };
  }

  const firstValue =
    normalizeStatisticValue(
      values[0],
      decimalPlaces,
    );

  const lastValue =
    normalizeStatisticValue(
      values[values.length - 1],
      decimalPlaces,
    );

  const difference =
    calculateDifference(
      firstValue,
      lastValue,
      decimalPlaces,
    );

  return {
    direction:
      getStatisticDirection(
        difference,
      ),
    firstValue,
    lastValue,
    difference,
    percentageChange:
      calculatePercentageChange(
        firstValue,
        lastValue,
        decimalPlaces,
      ),
  };
}

/**
 * Calcula a tendência semanal de prisões.
 */
export function calculatePrisonTrend(
  weeks: readonly WeeklyOperationalValues[],
  decimalPlaces = 2,
): TrendResult {
  const sortedWeeks =
    sortWeeksChronologically(weeks);

  return calculateTrend(
    sortedWeeks.map(
      (week) => week.prisons,
    ),
    decimalPlaces,
  );
}

/**
 * Calcula a tendência semanal de acompanhamentos.
 */
export function calculatePursuitTrend(
  weeks: readonly WeeklyOperationalValues[],
  decimalPlaces = 2,
): TrendResult {
  const sortedWeeks =
    sortWeeksChronologically(weeks);

  return calculateTrend(
    sortedWeeks.map(
      (week) => week.pursuits,
    ),
    decimalPlaces,
  );
}

/**
 * Calcula a participação percentual de cada atividade.
 *
 * Essa distribuição é apenas informativa.
 */
export function calculateActivityDistribution(
  values: OperationalValues,
  decimalPlaces = 2,
): ActivityDistribution {
  const prisons =
    normalizeStatisticValue(
      values.prisons,
      decimalPlaces,
    );

  const pursuits =
    normalizeStatisticValue(
      values.pursuits,
      decimalPlaces,
    );

  const total = prisons + pursuits;

  if (total === 0) {
    return {
      prisons: 0,
      pursuits: 0,
    };
  }

  return {
    prisons: round(
      (prisons / total) * 100,
      decimalPlaces,
    ),
    pursuits: round(
      (pursuits / total) * 100,
      decimalPlaces,
    ),
  };
}

/**
 * Retorna oficiais sem registros operacionais.
 */
export function filterOfficersWithoutActivity(
  officers:
    readonly OfficerOperationalValues[],
): OfficerOperationalValues[] {
  return officers.filter(
    (officer) =>
      normalizeStatisticValue(
        officer.prisons,
      ) === 0 &&
      normalizeStatisticValue(
        officer.pursuits,
      ) === 0,
  );
}

/**
 * Retorna oficiais com pelo menos uma atividade.
 */
export function filterOfficersWithActivity(
  officers:
    readonly OfficerOperationalValues[],
): OfficerOperationalValues[] {
  return officers.filter(
    (officer) =>
      normalizeStatisticValue(
        officer.prisons,
      ) > 0 ||
      normalizeStatisticValue(
        officer.pursuits,
      ) > 0,
  );
}

/**
 * Ordena oficiais pela quantidade de prisões.
 */
export function sortOfficersByPrisons(
  officers:
    readonly OfficerOperationalValues[],
): OfficerOperationalValues[] {
  return [...officers].sort(
    (firstOfficer, secondOfficer) => {
      const difference =
        normalizeStatisticValue(
          secondOfficer.prisons,
        ) -
        normalizeStatisticValue(
          firstOfficer.prisons,
        );

      if (difference !== 0) {
        return difference;
      }

      return firstOfficer.officerName.localeCompare(
        secondOfficer.officerName,
        "pt-BR",
        {
          sensitivity: "base",
        },
      );
    },
  );
}

/**
 * Ordena oficiais pela quantidade de acompanhamentos.
 */
export function sortOfficersByPursuits(
  officers:
    readonly OfficerOperationalValues[],
): OfficerOperationalValues[] {
  return [...officers].sort(
    (firstOfficer, secondOfficer) => {
      const difference =
        normalizeStatisticValue(
          secondOfficer.pursuits,
        ) -
        normalizeStatisticValue(
          firstOfficer.pursuits,
        );

      if (difference !== 0) {
        return difference;
      }

      return firstOfficer.officerName.localeCompare(
        secondOfficer.officerName,
        "pt-BR",
        {
          sensitivity: "base",
        },
      );
    },
  );
}

/**
 * Retorna o maior responsável por prisões.
 */
export function getTopPrisonOfficer(
  officers:
    readonly OfficerOperationalValues[],
): OfficerOperationalValues | null {
  return (
    sortOfficersByPrisons(
      officers,
    )[0] ?? null
  );
}

/**
 * Retorna o maior responsável por acompanhamentos.
 */
export function getTopPursuitOfficer(
  officers:
    readonly OfficerOperationalValues[],
): OfficerOperationalValues | null {
  return (
    sortOfficersByPursuits(
      officers,
    )[0] ?? null
  );
}