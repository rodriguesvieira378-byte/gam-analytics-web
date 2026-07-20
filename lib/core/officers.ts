/**
 * ============================================================
 * GAM Analytics Core
 * officers.ts
 *
 * Regras de negócio relacionadas ao efetivo da G.A.M.
 *
 * Este arquivo define elegibilidade, status, função,
 * participação em metas, ranking e sincronização.
 * ============================================================
 */

import { CoreConfig } from "./config";

import {
  OfficerRoles,
  OfficerStatus,
  type OfficerRole,
  type OfficerStatusValue,
} from "./constants";

import {
  InvalidOfficerError,
  InvalidOfficerRoleError,
  InvalidOfficerStatusError,
  OfficerNotEligibleError,
} from "./errors";

import {
  isNonEmptyString,
  normalizeText,
  normalizeWhitespace,
} from "./helpers";

import {
  getGoalForRole,
  hasGoalForRole,
} from "./goals";

import type {
  Officer,
  OfficerGoal,
} from "./types";

/**
 * Resultado da análise de elegibilidade de um oficial.
 */
export interface OfficerEligibility {
  active: boolean;
  hasOperationalGoal: boolean;
  eligibleForGoals: boolean;
  eligibleForRanking: boolean;
  eligibleForSync: boolean;
  reasons: string[];
}

/**
 * Dados mínimos para criação de um oficial.
 */
export interface CreateOfficerInput {
  id: string;
  name: string;
  role: OfficerRole;
  status?: OfficerStatusValue;
  discordId?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Verifica se uma função de oficial é válida.
 */
export function isValidOfficerRole(
  role: unknown,
): role is OfficerRole {
  return (
    role === OfficerRoles.OFFICIAL ||
    role === OfficerRoles.INTERN ||
    role === OfficerRoles.INSTRUCTOR ||
    role === OfficerRoles.COMMAND
  );
}

/**
 * Valida uma função e lança erro quando necessário.
 */
export function assertValidOfficerRole(
  role: unknown,
): asserts role is OfficerRole {
  if (!isValidOfficerRole(role)) {
    throw new InvalidOfficerRoleError(
      "A função informada não pertence ao efetivo válido da G.A.M.",
      {
        role,
      },
    );
  }
}

/**
 * Verifica se um status de oficial é válido.
 */
export function isValidOfficerStatus(
  status: unknown,
): status is OfficerStatusValue {
  return (
    status === OfficerStatus.ACTIVE ||
    status === OfficerStatus.INACTIVE
  );
}

/**
 * Valida um status e lança erro quando necessário.
 */
export function assertValidOfficerStatus(
  status: unknown,
): asserts status is OfficerStatusValue {
  if (!isValidOfficerStatus(status)) {
    throw new InvalidOfficerStatusError(
      "O status informado para o oficial é inválido.",
      {
        status,
      },
    );
  }
}

/**
 * Verifica se uma estrutura de oficial é válida.
 */
export function isValidOfficer(
  officer: unknown,
): officer is Officer {
  if (
    typeof officer !== "object" ||
    officer === null
  ) {
    return false;
  }

  const candidate = officer as Partial<Officer>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.name) &&
    isValidOfficerRole(candidate.role) &&
    isValidOfficerStatus(candidate.status)
  );
}

/**
 * Valida um oficial e lança erro quando necessário.
 */
export function assertValidOfficer(
  officer: unknown,
): asserts officer is Officer {
  if (!isValidOfficer(officer)) {
    throw new InvalidOfficerError(
      "Os dados do oficial são inválidos ou estão incompletos.",
      {
        officer,
      },
    );
  }
}

/**
 * Cria uma estrutura normalizada de oficial.
 */
export function createOfficer(
  input: CreateOfficerInput,
): Officer {
  assertValidOfficerRole(input.role);

  const status =
    input.status ?? OfficerStatus.ACTIVE;

  assertValidOfficerStatus(status);

  const id = normalizeWhitespace(input.id);
  const name = normalizeWhitespace(input.name);

  if (!id) {
    throw new InvalidOfficerError(
      "O identificador do oficial é obrigatório.",
      {
        input,
      },
    );
  }

  if (!name) {
    throw new InvalidOfficerError(
      "O nome do oficial é obrigatório.",
      {
        input,
      },
    );
  }

  return {
    id,
    name,
    role: input.role,
    status,
    discordId: input.discordId?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

/**
 * Verifica se o oficial está ativo.
 */
export function isOfficerActive(
  officer: Pick<Officer, "status">,
): boolean {
  return officer.status === OfficerStatus.ACTIVE;
}

/**
 * Verifica se o oficial está inativo.
 */
export function isOfficerInactive(
  officer: Pick<Officer, "status">,
): boolean {
  return officer.status === OfficerStatus.INACTIVE;
}

/**
 * Verifica se o oficial pertence ao comando.
 */
export function isCommandOfficer(
  officer: Pick<Officer, "role">,
): boolean {
  return officer.role === OfficerRoles.COMMAND;
}

/**
 * Verifica se o oficial é instrutor.
 */
export function isInstructorOfficer(
  officer: Pick<Officer, "role">,
): boolean {
  return officer.role === OfficerRoles.INSTRUCTOR;
}

/**
 * Verifica se o integrante está em estágio.
 */
export function isInternOfficer(
  officer: Pick<Officer, "role">,
): boolean {
  return officer.role === OfficerRoles.INTERN;
}

/**
 * Verifica se o integrante é Oficial G.A.M.
 */
export function isOfficialOfficer(
  officer: Pick<Officer, "role">,
): boolean {
  return officer.role === OfficerRoles.OFFICIAL;
}

/**
 * Retorna a meta correspondente ao oficial.
 */
export function getGoalForOfficer(
  officer: Pick<Officer, "role">,
): OfficerGoal | null {
  return getGoalForRole(officer.role);
}

/**
 * Verifica se a função do oficial possui meta.
 */
export function officerHasGoal(
  officer: Pick<Officer, "role">,
): boolean {
  return hasGoalForRole(officer.role);
}

/**
 * Verifica se o oficial deve participar das metas.
 */
export function isOfficerEligibleForGoals(
  officer: Pick<Officer, "role" | "status">,
): boolean {
  if (!isOfficerActive(officer)) {
    return false;
  }

  if (
    isCommandOfficer(officer) &&
    !CoreConfig.officers.includeCommandInGoals
  ) {
    return false;
  }

  if (
    isInstructorOfficer(officer) &&
    !CoreConfig.officers.includeInstructorsInGoals
  ) {
    return false;
  }

  return officerHasGoal(officer);
}

/**
 * Verifica se o oficial deve participar do ranking.
 */
export function isOfficerEligibleForRanking(
  officer: Pick<Officer, "role" | "status">,
): boolean {
  if (
    !CoreConfig.officers.includeInactiveInRanking &&
    !isOfficerActive(officer)
  ) {
    return false;
  }

  return isOfficerEligibleForGoals(officer);
}

/**
 * Verifica se o oficial possui um ID do Discord válido.
 */
export function hasDiscordId(
  officer: Pick<Officer, "discordId">,
): boolean {
  return isNonEmptyString(officer.discordId);
}

/**
 * Verifica se um ID do Discord possui formato numérico.
 */
export function isValidDiscordId(
  discordId: unknown,
): discordId is string {
  if (!isNonEmptyString(discordId)) {
    return false;
  }

  return /^\d{15,25}$/.test(discordId.trim());
}

/**
 * Verifica se o oficial está apto a receber sincronizações.
 */
export function canReceiveSync(
  officer: Pick<
    Officer,
    "role" | "status" | "discordId"
  >,
): boolean {
  return (
    isOfficerActive(officer) &&
    isValidDiscordId(officer.discordId)
  );
}

/**
 * Valida se o oficial pode receber uma sincronização.
 */
export function assertOfficerCanReceiveSync(
  officer: Pick<
    Officer,
    "id" | "name" | "role" | "status" | "discordId"
  >,
): void {
  if (!isOfficerActive(officer)) {
    throw new OfficerNotEligibleError(
      "O oficial está inativo e não pode receber registros do GAM Sync.",
      {
        officerId: officer.id,
        officerName: officer.name,
        status: officer.status,
      },
    );
  }

  if (!isValidDiscordId(officer.discordId)) {
    throw new OfficerNotEligibleError(
      "O oficial não possui um ID do Discord válido para sincronização.",
      {
        officerId: officer.id,
        officerName: officer.name,
        discordId: officer.discordId,
      },
    );
  }
}

/**
 * Retorna todos os motivos que impedem um oficial
 * de participar de metas, ranking ou sincronização.
 */
export function getOfficerEligibility(
  officer: Officer,
): OfficerEligibility {
  assertValidOfficer(officer);

  const reasons: string[] = [];

  const active = isOfficerActive(officer);
  const hasOperationalGoal = officerHasGoal(officer);
  const eligibleForGoals =
    isOfficerEligibleForGoals(officer);
  const eligibleForRanking =
    isOfficerEligibleForRanking(officer);
  const eligibleForSync =
    canReceiveSync(officer);

  if (!active) {
    reasons.push("Oficial inativo.");
  }

  if (!hasOperationalGoal) {
    reasons.push(
      "A função do oficial não possui meta operacional.",
    );
  }

  if (
    isCommandOfficer(officer) &&
    !CoreConfig.officers.includeCommandInGoals
  ) {
    reasons.push(
      "Integrantes do comando não participam das metas.",
    );
  }

  if (
    isInstructorOfficer(officer) &&
    !CoreConfig.officers.includeInstructorsInGoals
  ) {
    reasons.push(
      "Instrutores não participam das metas.",
    );
  }

  if (!isValidDiscordId(officer.discordId)) {
    reasons.push(
      "ID do Discord ausente ou inválido.",
    );
  }

  return {
    active,
    hasOperationalGoal,
    eligibleForGoals,
    eligibleForRanking,
    eligibleForSync,
    reasons,
  };
}

/**
 * Procura um oficial pelo identificador interno.
 */
export function findOfficerById(
  officers: readonly Officer[],
  officerId: string,
): Officer | undefined {
  const normalizedOfficerId =
    normalizeWhitespace(officerId);

  return officers.find(
    (officer) =>
      normalizeWhitespace(officer.id) ===
      normalizedOfficerId,
  );
}

/**
 * Procura um oficial pelo ID do Discord.
 */
export function findOfficerByDiscordId(
  officers: readonly Officer[],
  discordId: string,
): Officer | undefined {
  const normalizedDiscordId = discordId.trim();

  if (!normalizedDiscordId) {
    return undefined;
  }

  return officers.find(
    (officer) =>
      officer.discordId?.trim() ===
      normalizedDiscordId,
  );
}

/**
 * Procura oficiais pelo nome.
 */
export function searchOfficersByName(
  officers: readonly Officer[],
  searchTerm: string,
): Officer[] {
  const normalizedSearchTerm =
    normalizeText(searchTerm);

  if (!normalizedSearchTerm) {
    return [];
  }

  return officers.filter((officer) =>
    normalizeText(officer.name).includes(
      normalizedSearchTerm,
    ),
  );
}

/**
 * Retorna apenas oficiais ativos.
 */
export function filterActiveOfficers(
  officers: readonly Officer[],
): Officer[] {
  return officers.filter(isOfficerActive);
}

/**
 * Retorna apenas oficiais inativos.
 */
export function filterInactiveOfficers(
  officers: readonly Officer[],
): Officer[] {
  return officers.filter(isOfficerInactive);
}

/**
 * Retorna apenas oficiais elegíveis para metas.
 */
export function filterOfficersEligibleForGoals(
  officers: readonly Officer[],
): Officer[] {
  return officers.filter(
    isOfficerEligibleForGoals,
  );
}

/**
 * Retorna apenas oficiais elegíveis para o ranking.
 */
export function filterOfficersEligibleForRanking(
  officers: readonly Officer[],
): Officer[] {
  return officers.filter(
    isOfficerEligibleForRanking,
  );
}

/**
 * Retorna apenas oficiais aptos ao GAM Sync.
 */
export function filterOfficersEligibleForSync(
  officers: readonly Officer[],
): Officer[] {
  return officers.filter(canReceiveSync);
}

/**
 * Retorna os oficiais de uma função específica.
 */
export function filterOfficersByRole(
  officers: readonly Officer[],
  role: OfficerRole,
): Officer[] {
  assertValidOfficerRole(role);

  return officers.filter(
    (officer) => officer.role === role,
  );
}

/**
 * Retorna os oficiais de um status específico.
 */
export function filterOfficersByStatus(
  officers: readonly Officer[],
  status: OfficerStatusValue,
): Officer[] {
  assertValidOfficerStatus(status);

  return officers.filter(
    (officer) => officer.status === status,
  );
}

/**
 * Ordena oficiais alfabeticamente sem alterar o array original.
 */
export function sortOfficersByName(
  officers: readonly Officer[],
): Officer[] {
  return [...officers].sort(
    (firstOfficer, secondOfficer) =>
      firstOfficer.name.localeCompare(
        secondOfficer.name,
        "pt-BR",
        {
          sensitivity: "base",
        },
      ),
  );
}

/**
 * Retorna a quantidade de oficiais ativos.
 */
export function countActiveOfficers(
  officers: readonly Officer[],
): number {
  return filterActiveOfficers(officers).length;
}

/**
 * Retorna a quantidade de oficiais elegíveis para metas.
 */
export function countOfficersEligibleForGoals(
  officers: readonly Officer[],
): number {
  return filterOfficersEligibleForGoals(
    officers,
  ).length;
}

/**
 * Retorna a quantidade de oficiais aptos ao GAM Sync.
 */
export function countOfficersEligibleForSync(
  officers: readonly Officer[],
): number {
  return filterOfficersEligibleForSync(
    officers,
  ).length;
}

/**
 * Verifica se já existe outro oficial com o mesmo ID do Discord.
 */
export function hasDuplicateDiscordId(
  officers: readonly Officer[],
  discordId: string,
  ignoredOfficerId?: string,
): boolean {
  const normalizedDiscordId = discordId.trim();

  if (!normalizedDiscordId) {
    return false;
  }

  return officers.some((officer) => {
    if (
      ignoredOfficerId &&
      officer.id === ignoredOfficerId
    ) {
      return false;
    }

    return (
      officer.discordId?.trim() ===
      normalizedDiscordId
    );
  });
}

/**
 * Valida se o ID do Discord pode ser atribuído a um oficial.
 */
export function assertUniqueDiscordId(
  officers: readonly Officer[],
  discordId: string,
  ignoredOfficerId?: string,
): void {
  if (!isValidDiscordId(discordId)) {
    throw new InvalidOfficerError(
      "O ID do Discord informado é inválido.",
      {
        discordId,
      },
    );
  }

  if (
    hasDuplicateDiscordId(
      officers,
      discordId,
      ignoredOfficerId,
    )
  ) {
    throw new InvalidOfficerError(
      "O ID do Discord informado já está vinculado a outro oficial.",
      {
        discordId,
        ignoredOfficerId,
      },
    );
  }
}

/**
 * Retorna uma cópia atualizada do oficial com novo status.
 */
export function updateOfficerStatus(
  officer: Officer,
  status: OfficerStatusValue,
): Officer {
  assertValidOfficer(officer);
  assertValidOfficerStatus(status);

  return {
    ...officer,
    status,
  };
}

/**
 * Retorna uma cópia atualizada do oficial com nova função.
 */
export function updateOfficerRole(
  officer: Officer,
  role: OfficerRole,
): Officer {
  assertValidOfficer(officer);
  assertValidOfficerRole(role);

  return {
    ...officer,
    role,
  };
}

/**
 * Retorna uma cópia atualizada do oficial com ID do Discord.
 */
export function updateOfficerDiscordId(
  officer: Officer,
  discordId?: string,
): Officer {
  assertValidOfficer(officer);

  const normalizedDiscordId =
    discordId?.trim() || undefined;

  if (
    normalizedDiscordId &&
    !isValidDiscordId(normalizedDiscordId)
  ) {
    throw new InvalidOfficerError(
      "O ID do Discord informado é inválido.",
      {
        officerId: officer.id,
        discordId,
      },
    );
  }

  return {
    ...officer,
    discordId: normalizedDiscordId,
  };
}
