import {
  Events,
  type Client,
  type Message,
} from "discord.js";

import { parseGamMessage } from "../parser/parseGamMessage";
import { processGamMessage } from "../services/gamSyncService";

function getChannelName(message: Message): string {
  if ("name" in message.channel) {
    return message.channel.name ?? "canal desconhecido";
  }

  return "canal desconhecido";
}

function printRawMessageLog(message: Message): void {
  console.log("");
  console.log("==================================");
  console.log("📨 Nova mensagem recebida");
  console.log(`Autor: ${message.author.tag}`);
  console.log(`Discord ID: ${message.author.id}`);
  console.log(
    `Servidor: ${message.guild?.name ?? "Mensagem privada"}`,
  );
  console.log(`Canal: ${getChannelName(message)}`);
  console.log(`Anexos: ${message.attachments.size}`);
  console.log("");
  console.log("Conteúdo:");
  console.log(message.content || "[Mensagem sem texto]");
  console.log("==================================");
}

function printParsedMessageLog(message: Message): void {
  const parsedMessage = parseGamMessage(
    message.content,
    message.attachments.size > 0,
  );

  console.log("");
  console.log("==================================");
  console.log("📋 Relatório interpretado");
  console.log(
    `Tipo: ${parsedMessage.activity ?? "Não identificado"}`,
  );

  console.log(
    `Meta: ${
      parsedMessage.metaCurrent !== null &&
      parsedMessage.metaGoal !== null
        ? `${parsedMessage.metaCurrent}/${parsedMessage.metaGoal}`
        : "Não identificada"
    }`,
  );

  console.log(
    `QRU: ${parsedMessage.qru ?? "Não identificada"}`,
  );
  console.log(
    `Data: ${parsedMessage.date ?? "Não identificada"}`,
  );
  console.log(
    `Anexo: ${parsedMessage.hasAttachment ? "Sim" : "Não"}`,
  );

  console.log("");
  console.log(`Autor: ${message.author.tag}`);
  console.log(`Discord ID: ${message.author.id}`);
  console.log("==================================");
  console.log("");
}

export function registerMessageCreateEvent(
  client: Client,
): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) {
      return;
    }

    printRawMessageLog(message);

    const normalizedContent = message.content
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (
      normalizedContent === "olá gam" ||
      normalizedContent === "ola gam"
    ) {
      try {
        await message.reply("🤖 GAM Sync Online");
      } catch (error) {
        console.error(
          "[GAM Sync] Não foi possível responder à mensagem:",
          error,
        );
      }

      return;
    }

    printParsedMessageLog(message);

    await processGamMessage(message);
  });
}