export type ActivityType = "PRISAO" | "ACOMPANHAMENTO";

export interface Activity {
  officerDiscordId: string;

  type: ActivityType;

  qru: string;

  metaCurrent: number;

  metaGoal: number;

  activityDate: string;

  hasAttachment: boolean;

  discordMessageId: string;

  discordChannelId: string;

  createdAt: Date;
}