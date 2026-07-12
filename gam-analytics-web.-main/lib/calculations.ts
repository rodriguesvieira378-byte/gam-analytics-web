import type { Officer, OfficerMetrics, WeeklyEntry } from "@/lib/types";

export function getMetrics(
  officer: Officer,
  entries: WeeklyEntry[],
  year: number,
  month: number,
  week: number
): OfficerMetrics {
  const entry = entries.find(
    (item) =>
      item.officerId === officer.id &&
      item.year === year &&
      item.month === month &&
      item.week === week
  );

  const prisons = entry?.prisons ?? 0;
  const pursuits = entry?.pursuits ?? 0;
  const prisonRate = officer.prisonGoal > 0 ? prisons / officer.prisonGoal : 0;
  const pursuitRate =
    officer.pursuitGoal > 0 ? pursuits / officer.pursuitGoal : 0;
  const progress = Math.min(1, (prisonRate + pursuitRate) / 2);

  let situation: OfficerMetrics["situation"] = "ABAIXO DA META";

  if (officer.status === "Inativo") {
    situation = "INATIVO";
  } else if (prisons === 0 && pursuits === 0) {
    situation = "SEM REGISTRO";
  } else if (
    prisons >= officer.prisonGoal &&
    pursuits >= officer.pursuitGoal
  ) {
    situation = "META ATINGIDA";
  } else if (
    prisons >= officer.prisonGoal ||
    pursuits >= officer.pursuitGoal
  ) {
    situation = "META PARCIAL";
  } else if (progress >= 0.75) {
    situation = "PRÓXIMO DA META";
  }

  const guidance =
    situation === "META ATINGIDA"
      ? "MANTER RITMO"
      : situation === "META PARCIAL"
        ? "CONCLUIR META"
        : situation === "PRÓXIMO DA META"
          ? "INCENTIVAR"
          : situation === "SEM REGISTRO"
            ? "VERIFICAR AUSÊNCIA"
            : situation === "INATIVO"
              ? "SEM AÇÃO"
              : "REFORÇAR ATIVIDADE";

  return {
    ...officer,
    prisons,
    pursuits,
    total: prisons + pursuits,
    progress,
    situation,
    guidance
  };
}

export function monthNumberToLabel(month: number, months: readonly string[]) {
  return months[month - 1] ?? String(month);
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
