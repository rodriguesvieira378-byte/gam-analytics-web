export type ActivityType = "PRISAO" | "ACOMPANHAMENTO";

export interface Activity {
  officerDiscordId: string;

  type: ActivityType;

  /**
   * QRU é obrigatório apenas para ACOMPANHAMENTO.
   * Em PRISÃO ele pode não existir.
   */
  qru: string | null;

  metaCurrent: number;

  metaGoal: number;

  activityDate: string;

  hasAttachment: boolean;

  discordMessageId: string;

  discordChannelId: string;

  createdAt: Date;
}