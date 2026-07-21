import type { ParsedGamMessage } from "../parser/parseGamMessage";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGamMessage(
  message: ParsedGamMessage,
): ValidationResult {
  const errors: string[] = [];

  if (!message.activity) {
    errors.push("Tipo da atividade não informado.");
  }

  if (message.metaCurrent === null || message.metaGoal === null) {
    errors.push("Meta inválida.");
  }

  if (!message.qru) {
    errors.push("QRU não informado.");
  }

  if (!message.date) {
    errors.push("Data não informada.");
  }

  if (!message.hasAttachment) {
    errors.push("Print da ocorrência é obrigatório.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}