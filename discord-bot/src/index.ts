import "dotenv/config";

import { Events } from "discord.js";

import { discordClient } from "./client";
import { config } from "./config";
import { registerMessageCreateEvent } from "./events/messageCreate";

registerMessageCreateEvent(discordClient);

discordClient.once(Events.ClientReady, (readyClient) => {
  console.log("==================================");
  console.log("🤖 GAM Sync iniciado");
  console.log(`Logado como ${readyClient.user.tag}`);
  console.log(`Servidores conectados: ${readyClient.guilds.cache.size}`);
  console.log("Aguardando mensagens...");
  console.log("==================================");
});

process.on("unhandledRejection", (error) => {
  console.error("[GAM Sync] Erro não tratado:", error);
});

process.on("uncaughtException", (error) => {
  console.error("[GAM Sync] Erro inesperado:", error);
  process.exitCode = 1;
});

async function startGamSync(): Promise<void> {
  try {
    await discordClient.login(config.discord.token);
  } catch (error) {
    console.error(
      "[GAM Sync] Não foi possível conectar ao Discord:",
      error,
    );

    process.exitCode = 1;
  }
}

void startGamSync();