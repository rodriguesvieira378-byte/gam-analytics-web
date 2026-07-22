import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload
} from "@supabase/supabase-js";

import {
  getSupabaseClient,
  isDemoMode
} from "../supabase";

export const GAM_REALTIME_TABLES = [
  "officers",
  "activities",
  "discord_records",
  "monthly_closures",
  "gam_members",
  "notification_reads"
] as const;

export type GamRealtimeTable =
  (typeof GAM_REALTIME_TABLES)[number];

export type GamRealtimeConnectionStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "error";

export type GamRealtimePayload =
  RealtimePostgresChangesPayload<
    Record<string, unknown>
  >;

export interface GamRealtimeEvent {
  table: GamRealtimeTable;
  eventType: GamRealtimePayload["eventType"];
  payload: GamRealtimePayload;
  receivedAt: string;
}

export interface GamRealtimeManagerOptions {
  channelName?: string;
  tables?: readonly GamRealtimeTable[];
  onEvent: (event: GamRealtimeEvent) => void;
  onStatusChange?: (
    status: GamRealtimeConnectionStatus
  ) => void;
  onError?: (error: Error) => void;
}

export interface GamRealtimeManager {
  start: () => RealtimeChannel | null;
  stop: () => Promise<void>;
  getStatus: () => GamRealtimeConnectionStatus;
}

function normalizeRealtimeError(
  cause: unknown,
  fallbackMessage: string
) {
  return cause instanceof Error
    ? cause
    : new Error(fallbackMessage);
}

export function createGamRealtimeManager({
  channelName = "gam-analytics-realtime",
  tables = GAM_REALTIME_TABLES,
  onEvent,
  onStatusChange,
  onError
}: GamRealtimeManagerOptions): GamRealtimeManager {
  let channel: RealtimeChannel | null = null;

  let status: GamRealtimeConnectionStatus =
    isDemoMode ? "disabled" : "connecting";

  function setStatus(
    nextStatus: GamRealtimeConnectionStatus
  ) {
    status = nextStatus;
    onStatusChange?.(nextStatus);
  }

  function start(): RealtimeChannel | null {
    if (isDemoMode) {
      setStatus("disabled");
      return null;
    }

    if (channel) {
      return channel;
    }

    try {
      const supabase = getSupabaseClient();

      setStatus("connecting");

      const nextChannel = supabase.channel(
        channelName
      );

      for (const table of tables) {
        nextChannel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table
          },
          (
            payload: RealtimePostgresChangesPayload<
              Record<string, unknown>
            >
          ) => {
            onEvent({
              table,
              eventType: payload.eventType,
              payload,
              receivedAt:
                new Date().toISOString()
            });
          }
        );
      }

      nextChannel.subscribe(
        (subscriptionStatus) => {
          if (
            subscriptionStatus ===
            "SUBSCRIBED"
          ) {
            setStatus("connected");
            return;
          }

          if (
            subscriptionStatus ===
              "CHANNEL_ERROR" ||
            subscriptionStatus ===
              "TIMED_OUT"
          ) {
            setStatus("error");

            onError?.(
              new Error(
                subscriptionStatus ===
                  "TIMED_OUT"
                  ? "A conexão em tempo real excedeu o tempo limite."
                  : "O Supabase Realtime encontrou um erro no canal."
              )
            );

            return;
          }

          if (
            subscriptionStatus === "CLOSED"
          ) {
            setStatus("connecting");
          }
        }
      );

      channel = nextChannel;

      return nextChannel;
    } catch (cause) {
      channel = null;
      setStatus("error");

      onError?.(
        normalizeRealtimeError(
          cause,
          "Não foi possível iniciar o Supabase Realtime."
        )
      );

      return null;
    }
  }

  async function stop() {
    if (isDemoMode) {
      channel = null;
      setStatus("disabled");
      return;
    }

    const currentChannel = channel;

    if (!currentChannel) {
      return;
    }

    channel = null;

    try {
      const supabase = getSupabaseClient();

      await supabase.removeChannel(
        currentChannel
      );

      setStatus("connecting");
    } catch (cause) {
      setStatus("error");

      onError?.(
        normalizeRealtimeError(
          cause,
          "Não foi possível encerrar o canal em tempo real."
        )
      );
    }
  }

  function getStatus() {
    return status;
  }

  return {
    start,
    stop,
    getStatus
  };
}