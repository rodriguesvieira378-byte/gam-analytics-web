import {
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

discordClient.on(Events.Error, (error) => {
  console.error("[GAM Sync] Erro no cliente Discord:", error);
});