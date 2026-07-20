/**
 * ============================================================
 * GAM Analytics Core
 * config.ts
 *
 * Configurações operacionais da G.A.M.
 *
 * Este arquivo concentra valores que podem mudar conforme
 * decisões internas da unidade, sem alterar a lógica do sistema.
 * ============================================================
 */

export const CoreConfig = {
  goals: {
    official: {
      prisons: 4,
      pursuits: 6,
    },

    intern: {
      prisons: 6,
      pursuits: 12,
    },
  },

  ranking: {
    topSize: 10,
    podiumSize: 3,
  },

  sync: {
    maxBatchSize: 50,
    requireAttachment: true,
    allowDuplicateMessages: false,
  },

  calendar: {
    operationalWeekClosingDay: 6,
    maxWeeksPerMonth: 5,
  },

  statistics: {
    decimalPlaces: 2,
    minimumPreviousValueForGrowth: 1,
  },

  officers: {
    includeInactiveInRanking: false,
    includeCommandInGoals: false,
    includeInstructorsInGoals: false,
  },
} as const;

export type CoreConfigType = typeof CoreConfig;