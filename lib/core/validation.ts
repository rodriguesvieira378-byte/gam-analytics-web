/**
 * ============================================================
 * GAM Analytics Core
 * validation.ts
 *
 * Centraliza validações reutilizáveis do GAM Analytics.
 *
 * As funções deste arquivo não alteram os dados recebidos.
 * Elas apenas verificam valores e retornam resultados seguros.
 * ============================================================
 */

import {
  EntryTypes,
  type EntryType,
  type OfficerRole,
  type OfficerStatusValue,
} from "./constants";

import {
  isNonEmptyString,
  isNonNegativeInteger,
  normalizeWhitespace,
} from "./helpers";

import {
  isValidOfficer,
  isValidOfficerRole,
  isValidOfficerStatus,
  isValidDiscordId,
} from "./officers";

import {
  isValidGoal,
} from "./goals";

import {
  parseDate,
} from "./dates";

import type {
  Officer,
  OfficerGoal,
  ValidationResult,
} from "./types";

/**
 * Estrutura interna utilizada durante as validações.
 */
export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Resultado detalhado de uma validação.
 */
export interface DetailedValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Opções para validação de texto.
 */
export interface StringValidationOptions {
  required?: boolean;
  minimumLength?: number;
  maximumLength?: number;
  pattern?: RegExp;
}

/**
 * Opções para validação de números.
 */
export interface NumberValidationOptions {
  required?: boolean;
  integer?: boolean;
  minimum?: number;
  maximum?: number;
}

/**
 * Dados mínimos para validar um registro operacional.
 */
export interface OperationalEntryValidationInput {
  id?: unknown;
  officerId?: unknown;
  type?: unknown;
  amount?: unknown;
  date?: unknown;
}

/**
 * Dados mínimos para validar um registro do GAM Sync.
 */
export interface SyncRecordValidationInput {
  messageId?: unknown;
  guildId?: unknown;
  channelId?: unknown;
  authorDiscordId?: unknown;
  officerId?: unknown;
  date?: unknown;
}

/**
 * Cria um resultado detalhado de validação.
 */
export function createDetailedValidationResult(
  errors: ValidationIssue[] = [],
  warnings: ValidationIssue[] = [],
): DetailedValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Cria um resultado simples compatível com o Core.
 */
export function createValidationResult(
  errors: string[] = [],
): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  } as ValidationResult;
}

/**
 * Verifica se um valor está ausente.
 */
export function isEmptyValue(
  value: unknown,
): boolean {
  if (
    value === undefined ||
    value === null
  ) {
    return true;
  }

  if (
    typeof value === "string" &&
    normalizeWhitespace(value) === ""
  ) {
    return true;
  }

  return false;
}

/**
 * Verifica se um valor obrigatório foi preenchido.
 */
export function isRequiredValueValid(
  value: unknown,
): boolean {
  return !isEmptyValue(value);
}

/**
 * Valida um campo de texto.
 */
export function validateString(
  field: string,
  value: unknown,
  options: StringValidationOptions = {},
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];

  const {
    required = false,
    minimumLength,
    maximumLength,
    pattern,
  } = options;

  if (isEmptyValue(value)) {
    if (required) {
      errors.push({
        field,
        message: "Este campo é obrigatório.",
      });
    }

    return createDetailedValidationResult(errors);
  }

  if (typeof value !== "string") {
    errors.push({
      field,
      message: "O valor deve ser um texto.",
    });

    return createDetailedValidationResult(errors);
  }

  const normalizedValue =
    normalizeWhitespace(value);

  if (
    minimumLength !== undefined &&
    normalizedValue.length < minimumLength
  ) {
    errors.push({
      field,
      message:
        `O campo deve possuir pelo menos ${minimumLength} caracteres.`,
    });
  }

  if (
    maximumLength !== undefined &&
    normalizedValue.length > maximumLength
  ) {
    errors.push({
      field,
      message:
        `O campo deve possuir no máximo ${maximumLength} caracteres.`,
    });
  }

  if (
    pattern &&
    !pattern.test(normalizedValue)
  ) {
    errors.push({
      field,
      message: "O formato informado é inválido.",
    });
  }

  return createDetailedValidationResult(errors);
}

/**
 * Valida um campo numérico.
 */
export function validateNumber(
  field: string,
  value: unknown,
  options: NumberValidationOptions = {},
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];

  const {
    required = false,
    integer = false,
    minimum,
    maximum,
  } = options;

  if (isEmptyValue(value)) {
    if (required) {
      errors.push({
        field,
        message: "Este campo é obrigatório.",
      });
    }

    return createDetailedValidationResult(errors);
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    errors.push({
      field,
      message: "O valor deve ser um número válido.",
    });

    return createDetailedValidationResult(errors);
  }

  if (
    integer &&
    !Number.isInteger(value)
  ) {
    errors.push({
      field,
      message: "O valor deve ser um número inteiro.",
    });
  }

  if (
    minimum !== undefined &&
    value < minimum
  ) {
    errors.push({
      field,
      message:
        `O valor mínimo permitido é ${minimum}.`,
    });
  }

  if (
    maximum !== undefined &&
    value > maximum
  ) {
    errors.push({
      field,
      message:
        `O valor máximo permitido é ${maximum}.`,
    });
  }

  return createDetailedValidationResult(errors);
}

/**
 * Valida um identificador interno.
 */
export function validateId(
  field: string,
  value: unknown,
): DetailedValidationResult {
  return validateString(
    field,
    value,
    {
      required: true,
      minimumLength: 1,
      maximumLength: 150,
    },
  );
}

/**
 * Valida uma data aceita pelo Core.
 */
export function validateDateValue(
  field: string,
  value: unknown,
  required = true,
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];

  if (isEmptyValue(value)) {
    if (required) {
      errors.push({
        field,
        message: "A data é obrigatória.",
      });
    }

    return createDetailedValidationResult(errors);
  }

  if (
    !(
      value instanceof Date ||
      typeof value === "string" ||
      typeof value === "number"
    )
  ) {
    errors.push({
      field,
      message: "O formato da data é inválido.",
    });

    return createDetailedValidationResult(errors);
  }

  if (!parseDate(value)) {
    errors.push({
      field,
      message: "A data informada é inválida.",
    });
  }

  return createDetailedValidationResult(errors);
}

/**
 * Valida uma função do efetivo.
 */
export function validateOfficerRole(
  role: unknown,
): DetailedValidationResult {
  if (isValidOfficerRole(role)) {
    return createDetailedValidationResult();
  }

  return createDetailedValidationResult([
    {
      field: "role",
      message:
        "A função informada não pertence ao efetivo válido da G.A.M.",
    },
  ]);
}

/**
 * Valida um status de oficial.
 */
export function validateOfficerStatus(
  status: unknown,
): DetailedValidationResult {
  if (isValidOfficerStatus(status)) {
    return createDetailedValidationResult();
  }

  return createDetailedValidationResult([
    {
      field: "status",
      message:
        "O status informado para o oficial é inválido.",
    },
  ]);
}

/**
 * Valida um ID do Discord.
 */
export function validateDiscordId(
  discordId: unknown,
  required = false,
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];

  if (isEmptyValue(discordId)) {
    if (required) {
      errors.push({
        field: "discordId",
        message:
          "O ID do Discord é obrigatório.",
      });
    }

    return createDetailedValidationResult(errors);
  }

  if (!isValidDiscordId(discordId)) {
    errors.push({
      field: "discordId",
      message:
        "O ID do Discord deve conter apenas números e possuir entre 15 e 25 dígitos.",
    });
  }

  return createDetailedValidationResult(errors);
}

/**
 * Valida uma meta operacional.
 */
export function validateGoal(
  goal: unknown,
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];

  if (
    typeof goal !== "object" ||
    goal === null
  ) {
    errors.push({
      field: "goal",
      message:
        "A estrutura da meta é inválida.",
    });

    return createDetailedValidationResult(errors);
  }

  const candidate =
    goal as Partial<OfficerGoal>;

  if (
    !isNonNegativeInteger(
      candidate.prisons,
    )
  ) {
    errors.push({
      field: "prisons",
      message:
        "A meta de prisões deve ser um número inteiro não negativo.",
    });
  }

  if (
    !isNonNegativeInteger(
      candidate.pursuits,
    )
  ) {
    errors.push({
      field: "pursuits",
      message:
        "A meta de acompanhamentos deve ser um número inteiro não negativo.",
    });
  }

  if (
    candidate.prisons === 0 &&
    candidate.pursuits === 0
  ) {
    errors.push({
      field: "goal",
      message:
        "A meta deve possuir pelo menos um objetivo maior que zero.",
    });
  }

  if (
    errors.length === 0 &&
    !isValidGoal(candidate as OfficerGoal)
  ) {
    errors.push({
      field: "goal",
      message:
        "A meta operacional informada é inválida.",
    });
  }

  return createDetailedValidationResult(errors);
}

/**
 * Valida os dados completos de um oficial.
 */
export function validateOfficer(
  officer: unknown,
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (
    typeof officer !== "object" ||
    officer === null
  ) {
    return createDetailedValidationResult([
      {
        field: "officer",
        message:
          "Os dados do oficial são inválidos.",
      },
    ]);
  }

  const candidate =
    officer as Partial<Officer>;

  errors.push(
    ...validateId(
      "id",
      candidate.id,
    ).errors,
  );

  errors.push(
    ...validateString(
      "name",
      candidate.name,
      {
        required: true,
        minimumLength: 2,
        maximumLength: 120,
      },
    ).errors,
  );

  errors.push(
    ...validateOfficerRole(
      candidate.role,
    ).errors,
  );

  errors.push(
    ...validateOfficerStatus(
      candidate.status,
    ).errors,
  );

  const discordValidation =
    validateDiscordId(
      candidate.discordId,
      false,
    );

  errors.push(
    ...discordValidation.errors,
  );

  if (isEmptyValue(candidate.discordId)) {
    warnings.push({
      field: "discordId",
      message:
        "O oficial não poderá receber registros automáticos do GAM Sync sem um ID do Discord.",
    });
  }

  if (
    errors.length === 0 &&
    !isValidOfficer(candidate)
  ) {
    errors.push({
      field: "officer",
      message:
        "Os dados do oficial estão incompletos.",
    });
  }

  return createDetailedValidationResult(
    errors,
    warnings,
  );
}

/**
 * Verifica se um tipo de registro operacional é válido.
 */
export function isValidEntryType(
  type: unknown,
): type is EntryType {
  return (
    type === EntryTypes.PRISON ||
    type === EntryTypes.PURSUIT
  );
}

/**
 * Valida um tipo de registro operacional.
 */
export function validateEntryType(
  type: unknown,
): DetailedValidationResult {
  if (isValidEntryType(type)) {
    return createDetailedValidationResult();
  }

  return createDetailedValidationResult([
    {
      field: "type",
      message:
        "O tipo deve ser prisão ou acompanhamento.",
    },
  ]);
}

/**
 * Valida uma quantidade operacional.
 */
export function validateOperationalAmount(
  amount: unknown,
): DetailedValidationResult {
  return validateNumber(
    "amount",
    amount,
    {
      required: true,
      integer: true,
      minimum: 1,
    },
  );
}

/**
 * Valida um registro operacional.
 */
export function validateOperationalEntry(
  entry: OperationalEntryValidationInput,
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];

  errors.push(
    ...validateId(
      "id",
      entry.id,
    ).errors,
  );

  errors.push(
    ...validateId(
      "officerId",
      entry.officerId,
    ).errors,
  );

  errors.push(
    ...validateEntryType(
      entry.type,
    ).errors,
  );

  errors.push(
    ...validateOperationalAmount(
      entry.amount,
    ).errors,
  );

  errors.push(
    ...validateDateValue(
      "date",
      entry.date,
      true,
    ).errors,
  );

  return createDetailedValidationResult(errors);
}

/**
 * Valida os campos essenciais de um registro do GAM Sync.
 */
export function validateSyncRecord(
  record: SyncRecordValidationInput,
): DetailedValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  errors.push(
    ...validateId(
      "messageId",
      record.messageId,
    ).errors,
  );

  errors.push(
    ...validateId(
      "guildId",
      record.guildId,
    ).errors,
  );

  errors.push(
    ...validateId(
      "channelId",
      record.channelId,
    ).errors,
  );

  errors.push(
    ...validateDiscordId(
      record.authorDiscordId,
      true,
    ).errors.map((issue) => ({
      ...issue,
      field: "authorDiscordId",
    })),
  );

  errors.push(
    ...validateDateValue(
      "date",
      record.date,
      true,
    ).errors,
  );

  if (isEmptyValue(record.officerId)) {
    warnings.push({
      field: "officerId",
      message:
        "O registro ainda não está vinculado a um oficial da G.A.M.",
    });
  }

  return createDetailedValidationResult(
    errors,
    warnings,
  );
}

/**
 * Junta vários resultados detalhados em um único resultado.
 */
export function mergeValidationResults(
  ...results: DetailedValidationResult[]
): DetailedValidationResult {
  const errors = results.flatMap(
    (result) => result.errors,
  );

  const warnings = results.flatMap(
    (result) => result.warnings,
  );

  return createDetailedValidationResult(
    errors,
    warnings,
  );
}

/**
 * Converte um resultado detalhado em resultado simples.
 */
export function toSimpleValidationResult(
  result: DetailedValidationResult,
): ValidationResult {
  return createValidationResult(
    result.errors.map(
      (issue) => issue.message,
    ),
  );
}

/**
 * Retorna apenas as mensagens de erro.
 */
export function getValidationErrorMessages(
  result: DetailedValidationResult,
): string[] {
  return result.errors.map(
    (issue) => issue.message,
  );
}

/**
 * Retorna apenas as mensagens de aviso.
 */
export function getValidationWarningMessages(
  result: DetailedValidationResult,
): string[] {
  return result.warnings.map(
    (issue) => issue.message,
  );
}

/**
 * Verifica se existe algum erro para um campo específico.
 */
export function hasValidationError(
  result: DetailedValidationResult,
  field: string,
): boolean {
  return result.errors.some(
    (issue) => issue.field === field,
  );
}

/**
 * Retorna o primeiro erro de um campo.
 */
export function getFirstValidationError(
  result: DetailedValidationResult,
  field?: string,
): ValidationIssue | undefined {
  if (!field) {
    return result.errors[0];
  }

  return result.errors.find(
    (issue) => issue.field === field,
  );
}

/**
 * Valida se um papel pode ser utilizado pelo Core.
 */
export function validateRoleValue(
  role: OfficerRole,
): boolean {
  return isValidOfficerRole(role);
}

/**
 * Valida se um status pode ser utilizado pelo Core.
 */
export function validateStatusValue(
  status: OfficerStatusValue,
): boolean {
  return isValidOfficerStatus(status);
}

/**
 * Verifica rapidamente se um nome é válido.
 */
export function isValidOfficerName(
  name: unknown,
): name is string {
  return (
    isNonEmptyString(name) &&
    normalizeWhitespace(name).length >= 2
  );
}