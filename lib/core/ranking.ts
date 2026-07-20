/**
 * ============================================================
 * GAM Analytics Core
 * ranking.ts
 *
 * Regras de negócio relacionadas ao ranking da G.A.M.
 *
 * O ranking é baseado no percentual de conclusão das metas.
 * Prisões e acompanhamentos continuam sendo analisados
 * separadamente, sem sistema de soma de pontos.
 * ============================================================
 */

import {
  average,
  nonNegative,
  normalizeWhitespace,
  round,
} from "./helpers";

import type {
  RankingItem,
} from "./types";

/**
 * Direção utilizada para ordenar o ranking.
 */
export type RankingDirection =
  | "ascending"
  | "descending";

/**
 * Tipo de movimentação de uma posição.
 */
export type RankingMovement =
  | "up"
  | "down"
  | "stable"
  | "new";

/**
 * Entrada necessária para montar um item do ranking.
 *
 * A posição é calculada automaticamente.
 */
export type RankingItemInput =
  Omit<RankingItem, "position">;

/**
 * Resultado da movimentação de um integrante no ranking.
 */
export interface RankingPositionChange {
  key: string;
  previousPosition: number | null;
  currentPosition: number;
  difference: number;
  movement: RankingMovement;
}

/**
 * Resumo geral de um ranking.
 */
export interface RankingSummary {
  totalParticipants: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  completedGoals: number;
  incompleteGoals: number;
}

/**
 * Opções para construção do ranking.
 */
export interface BuildRankingOptions {
  direction?: RankingDirection;
  allowTies?: boolean;
  maximumItems?: number;
  decimalPlaces?: number;
}

/**
 * Configuração padrão utilizada pelo ranking.
 */
const DEFAULT_OPTIONS: Required<
  BuildRankingOptions
> = {
  direction: "descending",
  allowTies: true,
  maximumItems: Number.MAX_SAFE_INTEGER,
  decimalPlaces: 2,
};

/**
 * Garante um percentual seguro para uso no ranking.
 */
export function normalizeRankingPercentage(
  percentageValue: number,
  decimalPlaces = 2,
): number {
  const safeDecimalPlaces = Math.max(
    0,
    Math.min(
      10,
      Math.trunc(decimalPlaces),
    ),
  );

  return round(
    nonNegative(percentageValue),
    safeDecimalPlaces,
  );
}

/**
 * Normaliza o nome utilizado no ranking.
 */
export function normalizeRankingName(
  officerName: string,
): string {
  return normalizeWhitespace(officerName);
}

/**
 * Verifica se uma posição é válida.
 */
export function isValidRankingPosition(
  position: number,
): boolean {
  return (
    Number.isInteger(position) &&
    position > 0
  );
}

/**
 * Verifica se um percentual é válido para o ranking.
 */
export function isValidRankingPercentage(
  percentageValue: number,
): boolean {
  return (
    Number.isFinite(percentageValue) &&
    percentageValue >= 0
  );
}

/**
 * Compara dois itens por nome.
 *
 * Utilizado como critério de desempate visual.
 */
export function compareRankingNames(
  firstName: string,
  secondName: string,
): number {
  return normalizeRankingName(
    firstName,
  ).localeCompare(
    normalizeRankingName(secondName),
    "pt-BR",
    {
      sensitivity: "base",
    },
  );
}

/**
 * Compara dois itens do ranking.
 *
 * Critérios:
 * 1. Maior percentual;
 * 2. Ordem alfabética.
 */
export function compareRankingItems(
  firstItem: Pick<
    RankingItem,
    "officerName" | "goalPercentage"
  >,
  secondItem: Pick<
    RankingItem,
    "officerName" | "goalPercentage"
  >,
  direction: RankingDirection = "descending",
): number {
  const firstPercentage =
    normalizeRankingPercentage(
      firstItem.goalPercentage,
    );

  const secondPercentage =
    normalizeRankingPercentage(
      secondItem.goalPercentage,
    );

  const percentageDifference =
    direction === "descending"
      ? secondPercentage - firstPercentage
      : firstPercentage - secondPercentage;

  if (percentageDifference !== 0) {
    return percentageDifference;
  }

  return compareRankingNames(
    firstItem.officerName,
    secondItem.officerName,
  );
}

/**
 * Ordena os integrantes sem alterar o array original.
 */
export function sortRankingItems(
  items: readonly RankingItem[],
  direction: RankingDirection = "descending",
): RankingItem[] {
  return [...items].sort(
    (firstItem, secondItem) =>
      compareRankingItems(
        firstItem,
        secondItem,
        direction,
      ),
  );
}

/**
 * Ordena entradas que ainda não possuem posição.
 */
export function sortRankingInputs(
  items: readonly RankingItemInput[],
  direction: RankingDirection = "descending",
): RankingItemInput[] {
  return [...items].sort(
    (firstItem, secondItem) =>
      compareRankingItems(
        firstItem,
        secondItem,
        direction,
      ),
  );
}

/**
 * Calcula a posição considerando empate.
 *
 * Exemplo:
 * 1º, 2º, 2º, 4º
 */
function calculateTiedPosition(
  sortedItems: readonly RankingItemInput[],
  currentIndex: number,
): number {
  if (currentIndex === 0) {
    return 1;
  }

  const currentItem =
    sortedItems[currentIndex];

  const previousItem =
    sortedItems[currentIndex - 1];

  const currentPercentage =
    normalizeRankingPercentage(
      currentItem.goalPercentage,
    );

  const previousPercentage =
    normalizeRankingPercentage(
      previousItem.goalPercentage,
    );

  if (
    currentPercentage === previousPercentage
  ) {
    return calculateTiedPosition(
      sortedItems,
      currentIndex - 1,
    );
  }

  return currentIndex + 1;
}

/**
 * Atribui posições a entradas já ordenadas.
 */
export function assignRankingPositions(
  sortedItems: readonly RankingItemInput[],
  allowTies = true,
): RankingItem[] {
  return sortedItems.map(
    (item, index) => {
      const position = allowTies
        ? calculateTiedPosition(
            sortedItems,
            index,
          )
        : index + 1;

      return {
        ...item,
        officerName:
          normalizeRankingName(
            item.officerName,
          ),
        goalPercentage:
          normalizeRankingPercentage(
            item.goalPercentage,
          ),
        position,
      };
    },
  );
}

/**
 * Monta o ranking completo.
 *
 * O percentual é o critério principal.
 * Não existe soma de pontos entre prisões e acompanhamentos.
 */
export function buildRanking(
  items: readonly RankingItemInput[],
  options: BuildRankingOptions = {},
): RankingItem[] {
  const settings = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const maximumItems = Math.max(
    0,
    Math.trunc(
      settings.maximumItems,
    ),
  );

  const normalizedItems =
    items.map((item) => ({
      ...item,
      officerName:
        normalizeRankingName(
          item.officerName,
        ),
      goalPercentage:
        normalizeRankingPercentage(
          item.goalPercentage,
          settings.decimalPlaces,
        ),
    }));

  const sortedItems =
    sortRankingInputs(
      normalizedItems,
      settings.direction,
    );

  const ranking =
    assignRankingPositions(
      sortedItems,
      settings.allowTies,
    );

  return ranking.slice(
    0,
    maximumItems,
  );
}

/**
 * Reordena um ranking já existente.
 */
export function reorderRanking(
  items: readonly RankingItem[],
  options: BuildRankingOptions = {},
): RankingItem[] {
  const inputs: RankingItemInput[] =
    items.map(
      ({
        position: _position,
        ...item
      }) => item,
    );

  return buildRanking(
    inputs,
    options,
  );
}

/**
 * Retorna uma quantidade limitada de integrantes.
 */
export function getTopRankingItems(
  items: readonly RankingItem[],
  amount = 3,
): RankingItem[] {
  const safeAmount = Math.max(
    0,
    Math.trunc(amount),
  );

  return sortRankingItems(items).slice(
    0,
    safeAmount,
  );
}

/**
 * Retorna os integrantes do pódio.
 */
export function getRankingPodium(
  items: readonly RankingItem[],
): RankingItem[] {
  return getTopRankingItems(
    items,
    3,
  );
}

/**
 * Retorna o líder do ranking.
 */
export function getRankingLeader(
  items: readonly RankingItem[],
): RankingItem | null {
  return (
    getTopRankingItems(
      items,
      1,
    )[0] ?? null
  );
}

/**
 * Procura um integrante pelo nome.
 */
export function findRankingItemByName(
  items: readonly RankingItem[],
  officerName: string,
): RankingItem | undefined {
  const normalizedName =
    normalizeRankingName(
      officerName,
    ).toLocaleLowerCase("pt-BR");

  if (!normalizedName) {
    return undefined;
  }

  return items.find(
    (item) =>
      normalizeRankingName(
        item.officerName,
      ).toLocaleLowerCase("pt-BR") ===
      normalizedName,
  );
}

/**
 * Procura um integrante pela posição.
 *
 * Em caso de empate, retorna o primeiro integrante encontrado.
 */
export function findRankingItemByPosition(
  items: readonly RankingItem[],
  position: number,
): RankingItem | undefined {
  if (!isValidRankingPosition(position)) {
    return undefined;
  }

  return items.find(
    (item) =>
      item.position === position,
  );
}

/**
 * Retorna todos os integrantes de uma posição.
 *
 * Útil quando existem empates.
 */
export function findRankingItemsByPosition(
  items: readonly RankingItem[],
  position: number,
): RankingItem[] {
  if (!isValidRankingPosition(position)) {
    return [];
  }

  return items.filter(
    (item) =>
      item.position === position,
  );
}

/**
 * Verifica se o integrante está no pódio.
 */
export function isRankingPodiumPosition(
  position: number,
): boolean {
  return (
    isValidRankingPosition(position) &&
    position <= 3
  );
}

/**
 * Verifica se o integrante ocupa a liderança.
 */
export function isRankingLeader(
  position: number,
): boolean {
  return position === 1;
}

/**
 * Retorna o nome da medalha correspondente.
 */
export function getRankingMedal(
  position: number,
): "gold" | "silver" | "bronze" | null {
  if (position === 1) {
    return "gold";
  }

  if (position === 2) {
    return "silver";
  }

  if (position === 3) {
    return "bronze";
  }

  return null;
}

/**
 * Retorna o rótulo da posição de destaque.
 */
export function getRankingPositionLabel(
  position: number,
): string {
  if (position === 1) {
    return "Ouro";
  }

  if (position === 2) {
    return "Prata";
  }

  if (position === 3) {
    return "Bronze";
  }

  if (!isValidRankingPosition(position)) {
    return "";
  }

  return `${position}º lugar`;
}

/**
 * Calcula a média percentual do ranking.
 */
export function calculateRankingAverage(
  items: readonly RankingItem[],
  decimalPlaces = 2,
): number {
  if (items.length === 0) {
    return 0;
  }

  return round(
    average(
      items.map(
        (item) =>
          normalizeRankingPercentage(
            item.goalPercentage,
            decimalPlaces,
          ),
      ),
    ),
    decimalPlaces,
  );
}

/**
 * Retorna o maior percentual encontrado.
 */
export function getHighestRankingPercentage(
  items: readonly RankingItem[],
): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.max(
    ...items.map(
      (item) =>
        normalizeRankingPercentage(
          item.goalPercentage,
        ),
    ),
  );
}

/**
 * Retorna o menor percentual encontrado.
 */
export function getLowestRankingPercentage(
  items: readonly RankingItem[],
): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.min(
    ...items.map(
      (item) =>
        normalizeRankingPercentage(
          item.goalPercentage,
        ),
    ),
  );
}

/**
 * Retorna integrantes que alcançaram um percentual mínimo.
 */
export function filterRankingByMinimumPercentage(
  items: readonly RankingItem[],
  minimumPercentage: number,
): RankingItem[] {
  const safeMinimum =
    normalizeRankingPercentage(
      minimumPercentage,
    );

  return items.filter(
    (item) =>
      normalizeRankingPercentage(
        item.goalPercentage,
      ) >= safeMinimum,
  );
}

/**
 * Retorna integrantes abaixo de um percentual.
 */
export function filterRankingBelowPercentage(
  items: readonly RankingItem[],
  percentageLimit: number,
): RankingItem[] {
  const safeLimit =
    normalizeRankingPercentage(
      percentageLimit,
    );

  return items.filter(
    (item) =>
      normalizeRankingPercentage(
        item.goalPercentage,
      ) < safeLimit,
  );
}

/**
 * Retorna quantos integrantes concluíram a meta.
 */
export function countCompletedRankingGoals(
  items: readonly RankingItem[],
): number {
  return filterRankingByMinimumPercentage(
    items,
    100,
  ).length;
}

/**
 * Retorna quantos integrantes ainda não concluíram a meta.
 */
export function countIncompleteRankingGoals(
  items: readonly RankingItem[],
): number {
  return filterRankingBelowPercentage(
    items,
    100,
  ).length;
}

/**
 * Cria um resumo geral do ranking.
 */
export function getRankingSummary(
  items: readonly RankingItem[],
  decimalPlaces = 2,
): RankingSummary {
  return {
    totalParticipants: items.length,
    averagePercentage:
      calculateRankingAverage(
        items,
        decimalPlaces,
      ),
    highestPercentage:
      getHighestRankingPercentage(items),
    lowestPercentage:
      getLowestRankingPercentage(items),
    completedGoals:
      countCompletedRankingGoals(items),
    incompleteGoals:
      countIncompleteRankingGoals(items),
  };
}

/**
 * Retorna o tipo de movimentação no ranking.
 *
 * Uma posição numericamente menor representa subida.
 */
export function getRankingMovement(
  previousPosition: number | null,
  currentPosition: number,
): RankingMovement {
  if (
    previousPosition === null ||
    !isValidRankingPosition(
      previousPosition,
    )
  ) {
    return "new";
  }

  if (
    currentPosition <
    previousPosition
  ) {
    return "up";
  }

  if (
    currentPosition >
    previousPosition
  ) {
    return "down";
  }

  return "stable";
}

/**
 * Calcula a diferença entre posições.
 *
 * Resultado positivo indica subida.
 * Resultado negativo indica queda.
 */
export function calculateRankingPositionDifference(
  previousPosition: number | null,
  currentPosition: number,
): number {
  if (
    previousPosition === null ||
    !isValidRankingPosition(
      previousPosition,
    ) ||
    !isValidRankingPosition(
      currentPosition,
    )
  ) {
    return 0;
  }

  return (
    previousPosition -
    currentPosition
  );
}

/**
 * Compara dois rankings utilizando uma chave personalizada.
 *
 * A chave pode ser o ID interno do oficial.
 */
export function compareRankingPositions<T extends RankingItem>(
  previousRanking: readonly T[],
  currentRanking: readonly T[],
  getKey: (item: T) => string,
): RankingPositionChange[] {
  const previousPositions =
    new Map<string, number>();

  for (
    const item of previousRanking
  ) {
    const key = getKey(item);

    if (key) {
      previousPositions.set(
        key,
        item.position,
      );
    }
  }

  return currentRanking.map(
    (item) => {
      const key = getKey(item);

      const previousPosition =
        previousPositions.get(key) ??
        null;

      return {
        key,
        previousPosition,
        currentPosition:
          item.position,
        difference:
          calculateRankingPositionDifference(
            previousPosition,
            item.position,
          ),
        movement:
          getRankingMovement(
            previousPosition,
            item.position,
          ),
      };
    },
  );
}

/**
 * Compara rankings utilizando o nome do oficial.
 *
 * Quando possível, prefira compareRankingPositions com ID interno.
 */
export function compareRankingPositionsByName(
  previousRanking: readonly RankingItem[],
  currentRanking: readonly RankingItem[],
): RankingPositionChange[] {
  return compareRankingPositions(
    previousRanking,
    currentRanking,
    (item) =>
      normalizeRankingName(
        item.officerName,
      ).toLocaleLowerCase("pt-BR"),
  );
}