/**
 * ============================================================
 * GAM Analytics Core
 * constants.ts
 *
 * Constantes imutáveis do domínio da G.A.M.
 *
 * Este arquivo deve conter apenas valores fixos, que representam
 * nomes, estados, limites estruturais e identificadores internos.
 * ============================================================
 */

export const OfficerRoles = {
  OFFICIAL: "official",
  INTERN: "intern",
  INSTRUCTOR: "instructor",
  COMMAND: "command",
} as const;

export const OfficerRoleLabels = {
  [OfficerRoles.OFFICIAL]: "Oficial G.A.M.",
  [OfficerRoles.INTERN]: "Estágio",
  [OfficerRoles.INSTRUCTOR]: "Instrutor",
  [OfficerRoles.COMMAND]: "Comando",
} as const;

export const OfficerStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const OfficerStatusLabels = {
  [OfficerStatus.ACTIVE]: "Ativo",
  [OfficerStatus.INACTIVE]: "Inativo",
} as const;

export const GoalStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  EXCEEDED: "exceeded",
  NOT_APPLICABLE: "not_applicable",
} as const;

export const GoalStatusLabels = {
  [GoalStatus.NOT_STARTED]: "Não iniciada",
  [GoalStatus.IN_PROGRESS]: "Em andamento",
  [GoalStatus.COMPLETED]: "Concluída",
  [GoalStatus.EXCEEDED]: "Superada",
  [GoalStatus.NOT_APPLICABLE]: "Não se aplica",
} as const;

export const SyncStatus = {
  PENDING: "pending",
  PROCESSED: "processed",
  REJECTED: "rejected",
  DUPLICATED: "duplicated",
  FAILED: "failed",
} as const;

export const SyncStatusLabels = {
  [SyncStatus.PENDING]: "Pendente",
  [SyncStatus.PROCESSED]: "Processado",
  [SyncStatus.REJECTED]: "Rejeitado",
  [SyncStatus.DUPLICATED]: "Duplicado",
  [SyncStatus.FAILED]: "Falhou",
} as const;

export const EntryTypes = {
  PRISON: "prison",
  PURSUIT: "pursuit",
} as const;

export const EntryTypeLabels = {
  [EntryTypes.PRISON]: "Prisão",
  [EntryTypes.PURSUIT]: "Acompanhamento",
} as const;

export const Weekdays = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export const MonthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const ShortMonthNames = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const CoreLimits = {
  MIN_WEEK_NUMBER: 1,
  MAX_WEEK_NUMBER: 5,
  MIN_MONTH_INDEX: 0,
  MAX_MONTH_INDEX: 11,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
} as const;

export type OfficerRole =
  (typeof OfficerRoles)[keyof typeof OfficerRoles];

export type OfficerStatusValue =
  (typeof OfficerStatus)[keyof typeof OfficerStatus];

export type GoalStatusValue =
  (typeof GoalStatus)[keyof typeof GoalStatus];

export type SyncStatusValue =
  (typeof SyncStatus)[keyof typeof SyncStatus];

export type EntryType =
  (typeof EntryTypes)[keyof typeof EntryTypes];

export type MonthName = (typeof MonthNames)[number];