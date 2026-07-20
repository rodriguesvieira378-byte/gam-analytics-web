import type { Officer, WeeklyEntry } from "@/lib/types";

export const MONTHS = [
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
  "Dezembro"
] as const;

export const WEEKS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_YEAR = 2026;

export const INITIAL_OFFICERS: Officer[] = [
  {
    id: "GAM001",
    registration: "GAM001",
    name: "Mike",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM002",
    registration: "GAM002",
    name: "K1ra",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM003",
    registration: "GAM003",
    name: "Dadinho",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM004",
    registration: "GAM004",
    name: "Md",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM005",
    registration: "GAM005",
    name: "Vg",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM006",
    registration: "GAM006",
    name: "Matheus",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM007",
    registration: "GAM007",
    name: "Baiano",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM008",
    registration: "GAM008",
    name: "Flavio",
    role: "Estagiário",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 6,
    pursuitGoal: 12
  },
  {
    id: "GAM009",
    registration: "GAM009",
    name: "Dv",
    role: "Oficial GAM",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 4,
    pursuitGoal: 6
  },
  {
    id: "GAM010",
    registration: "GAM010",
    name: "Rafa",
    role: "Oficial GAM",
    garrison: "Militar",
    status: "Ativo",
    prisonGoal: 4,
    pursuitGoal: 6
  }
];

const juneWeekOne = [
  ["GAM001", 4, 1],
  ["GAM002", 6, 12],
  ["GAM003", 0, 0],
  ["GAM004", 0, 0],
  ["GAM005", 0, 1],
  ["GAM006", 0, 0],
  ["GAM007", 9, 12],
  ["GAM008", 15, 12],
  ["GAM009", 17, 11],
  ["GAM010", 0, 1]
] as const;

export const INITIAL_ENTRIES: WeeklyEntry[] = juneWeekOne.map(
  ([officerId, prisons, pursuits], index) => ({
    id: `demo-entry-${index + 1}`,
    officerId,
    year: 2026,
    month: 6,
    week: 1,
    prisons,
    pursuits,
    note: ""
  })
);