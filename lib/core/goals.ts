/**
 * ============================================================
 * GAM Analytics Core
 * goals.ts
 *
 * Regras de negócio relacionadas às metas da G.A.M.
 *
 * Este arquivo concentra toda a lógica de cálculo, progresso,
 * conclusão e elegibilidade das metas operacionais.
 * ============================================================
 */

import { CoreConfig } from "./config";

import {
  GoalStatus,
  OfficerRoles,
  type GoalStatusValue,
  type OfficerRole,
} from "./constants";

import {
  InvalidGoalError,
} from "./errors";

import {
  clamp,
  isNonNegativeInteger,
  nonNegative,
  percentage,
  round,
} from "./helpers";

import type {
  GoalProgress,
  OfficerGoal,
  WeeklyEntry,
} from "./types";

/**
 * Estrutura utilizada para calcular o progresso de uma meta.
 */
export interface CalculateGoalProgressInput {
  officerId: string;
  role: OfficerRole;
  prisons: number;
  pursuits: number;
}

/**
 * Resultado resumido de uma meta.
 */
export interface GoalSummary {
  goal: OfficerGoal | null;
  applicable: boolean;
  completed: boolean;
  exceeded: boolean;
  status: GoalStatusValue;
}

/**
 * Verifica se uma função possui meta operacional.
 */
export function hasGoalForRole(role: OfficerRole): boolean {
  return (
    role === OfficerRoles.OFFICIAL ||
    role === OfficerRoles.INTERN
  );
}

/**
 * Retorna a meta correspondente à função do oficial.
 *
 * Comando e instrutores não possuem meta.
 */
export function getGoalForRole(
  role: OfficerRole,
): OfficerGoal | null {
  if (role === OfficerRoles.OFFICIAL) {
    return {
      prisons: CoreConfig.goals.official.prisons,
      pursuits: CoreConfig.goals.official.pursuits,
    };
  }

  if (role === OfficerRoles.INTERN) {
    return {
      prisons: CoreConfig.goals.intern.prisons,
      pursuits: CoreConfig.goals.intern.pursuits,
    };
  }

  return null;
}

/**
 * Valida se uma estrutura de meta é válida.
 */
export function isValidGoal(
  goal: OfficerGoal | null | undefined,
): goal is OfficerGoal {
  if (!goal) {
    return false;
  }

  return (
    isNonNegativeInteger(goal.prisons) &&
    isNonNegativeInteger(goal.pursuits) &&
    (goal.prisons > 0 || goal.pursuits > 0)
  );
}

/**
 * Valida uma meta e lança erro quando ela for inválida.
 */
export function assertValidGoal(
  goal: OfficerGoal | null | undefined,
): asserts goal is OfficerGoal {
  if (!isValidGoal(goal)) {
    throw new InvalidGoalError(
      "A meta deve possuir valores inteiros não negativos e pelo menos um objetivo maior que zero.",
      {
        goal,
      },
    );
  }
}

/**
 * Retorna a quantidade restante para concluir uma meta.
 */
export function calculateRemainingGoal(
  currentValue: number,
  goalValue: number,
): number {
  return Math.max(
    0,
    nonNegative(goalValue) - nonNegative(currentValue),
  );
}

/**
 * Calcula o percentual individual de uma meta.
 *
 * O resultado pode ultrapassar 100%.
 */
export function calculateGoalPercentage(
  currentValue: number,
  goalValue: number,
  decimalPlaces = CoreConfig.statistics.decimalPlaces,
): number {
  const safeCurrentValue = nonNegative(currentValue);
  const safeGoalValue = nonNegative(goalValue);

  if (safeGoalValue === 0) {
    return safeCurrentValue > 0 ? 100 : 0;
  }

  return percentage(
    safeCurrentValue,
    safeGoalValue,
    decimalPlaces,
  );
}

/**
 * Calcula o percentual limitado entre 0% e 100%.
 *
 * Útil para barras visuais de progresso.
 */
export function calculateClampedGoalPercentage(
  currentValue: number,
  goalValue: number,
  decimalPlaces = CoreConfig.statistics.decimalPlaces,
): number {
  return clamp(
    calculateGoalPercentage(
      currentValue,
      goalValue,
      decimalPlaces,
    ),
    0,
    100,
  );
}

/**
 * Calcula o percentual geral da meta.
 *
 * Prisões e acompanhamentos possuem o mesmo peso.
 */
export function calculateOverallGoalPercentage(
  currentPrisons: number,
  currentPursuits: number,
  goal: OfficerGoal,
  decimalPlaces = CoreConfig.statistics.decimalPlaces,
): number {
  assertValidGoal(goal);

  const prisonPercentage = calculateGoalPercentage(
    currentPrisons,
    goal.prisons,
    decimalPlaces,
  );

  const pursuitPercentage = calculateGoalPercentage(
    currentPursuits,
    goal.pursuits,
    decimalPlaces,
  );

  return round(
    (prisonPercentage + pursuitPercentage) / 2,
    decimalPlaces,
  );
}

/**
 * Calcula o percentual geral limitado a 100%.
 *
 * Evita que uma atividade excedida compense outra ainda incompleta.
 */
export function calculateClampedOverallGoalPercentage(
  currentPrisons: number,
  currentPursuits: number,
  goal: OfficerGoal,
  decimalPlaces = CoreConfig.statistics.decimalPlaces,
): number {
  assertValidGoal(goal);

  const prisonPercentage = calculateClampedGoalPercentage(
    currentPrisons,
    goal.prisons,
    decimalPlaces,
  );

  const pursuitPercentage =
    calculateClampedGoalPercentage(
      currentPursuits,
      goal.pursuits,
      decimalPlaces,
    );

  return round(
    (prisonPercentage + pursuitPercentage) / 2,
    decimalPlaces,
  );
}

/**
 * Verifica se uma meta individual foi concluída.
 */
export function isGoalValueCompleted(
  currentValue: number,
  goalValue: number,
): boolean {
  const safeGoalValue = nonNegative(goalValue);

  if (safeGoalValue === 0) {
    return true;
  }

  return nonNegative(currentValue) >= safeGoalValue;
}

/**
 * Verifica se a meta completa foi concluída.
 *
 * Ambas as metas precisam ser alcançadas.
 */
export function isGoalCompleted(
  currentPrisons: number,
  currentPursuits: number,
  goal: OfficerGoal,
): boolean {
  assertValidGoal(goal);

  return (
    isGoalValueCompleted(currentPrisons, goal.prisons) &&
    isGoalValueCompleted(currentPursuits, goal.pursuits)
  );
}

/**
 * Verifica se a meta foi superada.
 *
 * Considera superada quando pelo menos um dos valores ultrapassa
 * sua meta e todos os objetivos já foram concluídos.
 */
export function isGoalExceeded(
  currentPrisons: number,
  currentPursuits: number,
  goal: OfficerGoal,
): boolean {
  if (
    !isGoalCompleted(
      currentPrisons,
      currentPursuits,
      goal,
    )
  ) {
    return false;
  }

  return (
    nonNegative(currentPrisons) > goal.prisons ||
    nonNegative(currentPursuits) > goal.pursuits
  );
}

/**
 * Retorna o status atual da meta.
 */
export function getGoalStatus(
  currentPrisons: number,
  currentPursuits: number,
  goal: OfficerGoal | null,
): GoalStatusValue {
  if (!goal) {
    return GoalStatus.NOT_APPLICABLE;
  }

  assertValidGoal(goal);

  const safePrisons = nonNegative(currentPrisons);
  const safePursuits = nonNegative(currentPursuits);

  if (safePrisons === 0 && safePursuits === 0) {
    return GoalStatus.NOT_STARTED;
  }

  if (
    isGoalExceeded(
      safePrisons,
      safePursuits,
      goal,
    )
  ) {
    return GoalStatus.EXCEEDED;
  }

  if (
    isGoalCompleted(
      safePrisons,
      safePursuits,
      goal,
    )
  ) {
    return GoalStatus.COMPLETED;
  }

  return GoalStatus.IN_PROGRESS;
}

/**
 * Calcula o progresso completo da meta de um oficial.
 */
export function calculateGoalProgress(
  input: CalculateGoalProgressInput,
): GoalProgress {
  const goal = getGoalForRole(input.role);

  const currentPrisons = Math.trunc(
    nonNegative(input.prisons),
  );

  const currentPursuits = Math.trunc(
    nonNegative(input.pursuits),
  );

  if (!goal) {
    return {
      officerId: input.officerId,
      goal: null,
      current: {
        prisons: currentPrisons,
        pursuits: currentPursuits,
      },
      remaining: {
        prisons: 0,
        pursuits: 0,
      },
      percentage: {
        prisons: 0,
        pursuits: 0,
        overall: 0,
      },
      status: GoalStatus.NOT_APPLICABLE,
      applicable: false,
    };
  }

  const prisonPercentage =
    calculateGoalPercentage(
      currentPrisons,
      goal.prisons,
    );

  const pursuitPercentage =
    calculateGoalPercentage(
      currentPursuits,
      goal.pursuits,
    );

  const overallPercentage =
    calculateClampedOverallGoalPercentage(
      currentPrisons,
      currentPursuits,
      goal,
    );

  return {
    officerId: input.officerId,
    goal,
    current: {
      prisons: currentPrisons,
      pursuits: currentPursuits,
    },
    remaining: {
      prisons: calculateRemainingGoal(
        currentPrisons,
        goal.prisons,
      ),
      pursuits: calculateRemainingGoal(
        currentPursuits,
        goal.pursuits,
      ),
    },
    percentage: {
      prisons: prisonPercentage,
      pursuits: pursuitPercentage,
      overall: overallPercentage,
    },
    status: getGoalStatus(
      currentPrisons,
      currentPursuits,
      goal,
    ),
    applicable: true,
  };
}

/**
 * Calcula o progresso da meta utilizando um registro semanal.
 */
export function calculateWeeklyGoalProgress(
  entry: WeeklyEntry,
  role: OfficerRole,
): GoalProgress {
  return calculateGoalProgress({
    officerId: entry.officerId,
    role,
    prisons: entry.prisons,
    pursuits: entry.pursuits,
  });
}

/**
 * Retorna um resumo da meta para uma função e seus valores atuais.
 */
export function getGoalSummary(
  role: OfficerRole,
  prisons: number,
  pursuits: number,
): GoalSummary {
  const goal = getGoalForRole(role);

  if (!goal) {
    return {
      goal: null,
      applicable: false,
      completed: false,
      exceeded: false,
      status: GoalStatus.NOT_APPLICABLE,
    };
  }

  return {
    goal,
    applicable: true,
    completed: isGoalCompleted(
      prisons,
      pursuits,
      goal,
    ),
    exceeded: isGoalExceeded(
      prisons,
      pursuits,
      goal,
    ),
    status: getGoalStatus(
      prisons,
      pursuits,
      goal,
    ),
  };
}

/**
 * Retorna a soma total dos objetivos de uma meta.
 *
 * Este valor serve apenas para exibição e análise simples.
 * Ele não representa pontuação de ranking.
 */
export function getGoalTotal(goal: OfficerGoal): number {
  assertValidGoal(goal);

  return goal.prisons + goal.pursuits;
}

/**
 * Retorna a soma total das atividades realizadas.
 *
 * Este valor não deve ser usado como sistema de pontuação.
 */
export function getCurrentActivityTotal(
  prisons: number,
  pursuits: number,
): number {
  return (
    Math.trunc(nonNegative(prisons)) +
    Math.trunc(nonNegative(pursuits))
  );
}

/**
 * Verifica se o oficial iniciou alguma atividade da meta.
 */
export function hasStartedGoal(
  prisons: number,
  pursuits: number,
): boolean {
  return (
    nonNegative(prisons) > 0 ||
    nonNegative(pursuits) > 0
  );
}

/**
 * Retorna o objetivo com menor percentual de progresso.
 */
export function getLowestGoalArea(
  prisons: number,
  pursuits: number,
  goal: OfficerGoal,
): "prisons" | "pursuits" | "balanced" {
  assertValidGoal(goal);

  const prisonPercentage =
    calculateGoalPercentage(
      prisons,
      goal.prisons,
    );

  const pursuitPercentage =
    calculateGoalPercentage(
      pursuits,
      goal.pursuits,
    );

  if (prisonPercentage < pursuitPercentage) {
    return "prisons";
  }

  if (pursuitPercentage < prisonPercentage) {
    return "pursuits";
  }

  return "balanced";
}

/**
 * Retorna quantas metas individuais foram concluídas.
 *
 * Resultado possível:
 * 0, 1 ou 2.
 */
export function countCompletedGoalAreas(
  prisons: number,
  pursuits: number,
  goal: OfficerGoal,
): number {
  assertValidGoal(goal);

  let completedAreas = 0;

  if (isGoalValueCompleted(prisons, goal.prisons)) {
    completedAreas += 1;
  }

  if (
    isGoalValueCompleted(
      pursuits,
      goal.pursuits,
    )
  ) {
    completedAreas += 1;
  }

  return completedAreas;
}