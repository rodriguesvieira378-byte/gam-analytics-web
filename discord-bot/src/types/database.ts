// src/types/database.ts

export type DatabaseActivityType =
  | "PRISAO"
  | "ACOMPANHAMENTO";

export interface OfficerRow {
  id: string;
  owner_id: string;
  registration: string;
  name: string;
  role: string;
  status: string;
  prison_goal: number;
  pursuit_goal: number;
  photo_url: string | null;
  photo_path: string | null;
  discord_id: string | null;
  discord_url: string | null;
  garrison: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  officer_id: string | null;
  type: DatabaseActivityType;
  qru: string | null;
  meta_current: number;
  meta_goal: number;
  activity_date: string;
  discord_message_id: string;
  discord_channel_id: string;
  image_url: string | null;
  created_at: string;
}

export interface ActivityInsert {
  officer_id: string;
  type: DatabaseActivityType;
  qru: string | null;
  meta_current: number;
  meta_goal: number;
  activity_date: string;
  discord_message_id: string;
  discord_channel_id: string;
  image_url: string | null;
}