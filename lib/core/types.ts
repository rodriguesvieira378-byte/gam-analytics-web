/**
 * ============================================================
 * GAM Analytics Core
 * types.ts
 *
 * Tipos compartilhados das regras de negócio da G.A.M.
 *
 * Este arquivo não pode depender de React, Next.js, Supabase
 * ou qualquer camada externa da aplicação.
 * ============================================================
 */

import type {
  EntryType,
  GoalStatusValue,
  OfficerRole,
  OfficerStatusValue,
  SyncStatusValue,
} from "./constants";

export interface OfficerGoal {
  prisons: number;
  pursuits: number;
}

export interface Officer {
  id: string;
  name: string;
  role: OfficerRole;
  status: OfficerStatusValue;
  discordId?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationalEntry {
  id: string;
  officerId: string;
  type: EntryType;
  amount: number;
  date: string;
  week: number;
  month: number;
  year: number;
  source?: "manual" | "discord";
  discordMessageId?: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeeklyEntry {
  officerId: string;
  week: number;
  month: number;
  year: number;
  prisons: number;
  pursuits: number;
}

export interface GoalProgress {
  officerId: string;
  goal: OfficerGoal | null;
  current: {
    prisons: number;
    pursuits: number;
  };
  remaining: {
    prisons: number;
    pursuits: number;
  };
  percentage: {
    prisons: number;
    pursuits: number;
    overall: number;
  };
  status: GoalStatusValue;
  applicable: boolean;
}

export interface RankingItem {
  officerId: string;
  officerName: string;
  role: OfficerRole;
  prisons: number;
  pursuits: number;
  totalActivities: number;
  goalPercentage: number;
  position: number;
  previousPosition?: number;
  positionChange?: number;
}

export interface WeeklyStatistics {
  week: number;
  prisons: number;
  pursuits: number;
  totalActivities: number;
  activeOfficers: number;
  averagePerOfficer: number;
}

export interface MonthlyStatistics {
  month: number;
  year: number;
  prisons: number;
  pursuits: number;
  totalActivities: number;
  activeOfficers: number;
  weeklyAverage: number;
  officerAverage: number;
  bestWeek?: WeeklyStatistics;
  worstWeek?: WeeklyStatistics;
}

export interface GrowthResult {
  previousValue: number;
  currentValue: number;
  absoluteChange: number;
  percentageChange: number;
  direction: "up" | "down" | "stable";
}

export interface OperationalWeek {
  week: number;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isClosed: boolean;
}

export interface SyncRecord {
  id: string;
  messageId: string;
  channelId: string;
  guildId?: string;
  officerId?: string;
  status: SyncStatusValue;
  reason?: string;
  processedAt?: string;
  createdAt?: string;
}

export interface ValidationResult<T = undefined> {
  valid: boolean;
  data?: T;
  errors: string[];
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type OfficerId = Officer["id"];

export type OperationalEntryId = OperationalEntry["id"];

export type SyncRecordId = SyncRecord["id"];