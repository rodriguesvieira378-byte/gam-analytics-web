/**
 * ============================================================
 * GAM Analytics Core
 * errors.ts
 *
 * Erros de domínio utilizados pelas regras de negócio da G.A.M.
 *
 * Esses erros permitem identificar falhas específicas sem
 * depender de mensagens genéricas ou de camadas externas.
 * ============================================================
 */

export const CoreErrorCodes = {
  INVALID_GOAL: "INVALID_GOAL",
  INVALID_OFFICER: "INVALID_OFFICER",
  INVALID_OFFICER_ROLE: "INVALID_OFFICER_ROLE",
  INVALID_OFFICER_STATUS: "INVALID_OFFICER_STATUS",
  INVALID_OPERATIONAL_ENTRY: "INVALID_OPERATIONAL_ENTRY",
  INVALID_WEEK: "INVALID_WEEK",
  INVALID_MONTH: "INVALID_MONTH",
  INVALID_YEAR: "INVALID_YEAR",
  INVALID_DATE: "INVALID_DATE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_PERCENTAGE: "INVALID_PERCENTAGE",
  INVALID_SYNC_RECORD: "INVALID_SYNC_RECORD",
  OFFICER_NOT_ELIGIBLE: "OFFICER_NOT_ELIGIBLE",
  GOAL_NOT_APPLICABLE: "GOAL_NOT_APPLICABLE",
} as const;

export type CoreErrorCode =
  (typeof CoreErrorCodes)[keyof typeof CoreErrorCodes];

export interface CoreErrorOptions {
  code: CoreErrorCode;
  message: string;
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class CoreError extends Error {
  readonly code: CoreErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(options: CoreErrorOptions) {
    super(options.message);

    this.name = "CoreError";
    this.code = options.code;
    this.details = options.details;

    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        enumerable: false,
        configurable: true,
        writable: false,
      });
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidGoalError extends CoreError {
  constructor(
    message = "A meta informada é inválida.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_GOAL,
      message,
      details,
      cause,
    });

    this.name = "InvalidGoalError";
  }
}

export class InvalidOfficerError extends CoreError {
  constructor(
    message = "O oficial informado é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_OFFICER,
      message,
      details,
      cause,
    });

    this.name = "InvalidOfficerError";
  }
}

export class InvalidOfficerRoleError extends CoreError {
  constructor(
    message = "A função do oficial é inválida.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_OFFICER_ROLE,
      message,
      details,
      cause,
    });

    this.name = "InvalidOfficerRoleError";
  }
}

export class InvalidOfficerStatusError extends CoreError {
  constructor(
    message = "O status do oficial é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_OFFICER_STATUS,
      message,
      details,
      cause,
    });

    this.name = "InvalidOfficerStatusError";
  }
}

export class InvalidOperationalEntryError extends CoreError {
  constructor(
    message = "O registro operacional informado é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_OPERATIONAL_ENTRY,
      message,
      details,
      cause,
    });

    this.name = "InvalidOperationalEntryError";
  }
}

export class InvalidWeekError extends CoreError {
  constructor(
    message = "A semana informada é inválida.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_WEEK,
      message,
      details,
      cause,
    });

    this.name = "InvalidWeekError";
  }
}

export class InvalidMonthError extends CoreError {
  constructor(
    message = "O mês informado é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_MONTH,
      message,
      details,
      cause,
    });

    this.name = "InvalidMonthError";
  }
}

export class InvalidYearError extends CoreError {
  constructor(
    message = "O ano informado é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_YEAR,
      message,
      details,
      cause,
    });

    this.name = "InvalidYearError";
  }
}

export class InvalidDateError extends CoreError {
  constructor(
    message = "A data informada é inválida.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_DATE,
      message,
      details,
      cause,
    });

    this.name = "InvalidDateError";
  }
}

export class InvalidAmountError extends CoreError {
  constructor(
    message = "A quantidade informada é inválida.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_AMOUNT,
      message,
      details,
      cause,
    });

    this.name = "InvalidAmountError";
  }
}

export class InvalidPercentageError extends CoreError {
  constructor(
    message = "O percentual informado é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_PERCENTAGE,
      message,
      details,
      cause,
    });

    this.name = "InvalidPercentageError";
  }
}

export class InvalidSyncRecordError extends CoreError {
  constructor(
    message = "O registro de sincronização é inválido.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.INVALID_SYNC_RECORD,
      message,
      details,
      cause,
    });

    this.name = "InvalidSyncRecordError";
  }
}

export class OfficerNotEligibleError extends CoreError {
  constructor(
    message = "O oficial não está elegível para esta operação.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.OFFICER_NOT_ELIGIBLE,
      message,
      details,
      cause,
    });

    this.name = "OfficerNotEligibleError";
  }
}

export class GoalNotApplicableError extends CoreError {
  constructor(
    message = "A meta não se aplica a este oficial.",
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super({
      code: CoreErrorCodes.GOAL_NOT_APPLICABLE,
      message,
      details,
      cause,
    });

    this.name = "GoalNotApplicableError";
  }
}

export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError;
}

export function getCoreErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Ocorreu um erro inesperado no GAM Analytics Core.";
}