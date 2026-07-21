import type { Message } from "discord.js";

import { activityMapper } from "../mappers/activityMapper";
import { parseGamMessage } from "../parser/parseGamMessage";
import { activityRepository } from "../repositories/activityRepository";
import { officerRepository } from "../repositories/officerRepository";
import type { ActivityInsert } from "../types/database";
import { validateGamMessage } from "../validators/validateGamMessage";

export async function processGamMessage(
  message: Message,
): Promise<void> {
  try {
    const parsedMessage = parseGamMessage(
      message.content,
      message.attachments.size > 0,
    );

    const validation = validateGamMessage(parsedMessage);

    if (!validation.valid) {
      console.log("");
      console.log("==================================");
      console.log("❌ Relatório inválido");

      validation.errors.forEach((error) => {
        console.log(`• ${error}`);
      });

      console.log("==================================");
      console.log("");

      return;
    }

    /*
     * Converte a mensagem validada do Discord
     * para o formato interno do GAM Sync.
     */
    const activity = activityMapper(parsedMessage, message);

    /*
     * Evita que a mesma mensagem do Discord
     * seja processada mais de uma vez.
     */
    const existingActivity =
      await activityRepository.findByDiscordMessageId(
        activity.discordMessageId,
      );

    if (existingActivity) {
      console.log("");
      console.log("==================================");
      console.log("⚠️ Relatório já registrado");
      console.log(
        `Mensagem Discord: ${activity.discordMessageId}`,
      );
      console.log("==================================");
      console.log("");

      return;
    }

    /*
     * Localiza no GAM Analytics o oficial responsável
     * pelo relatório através do Discord ID.
     */
    const officer = await officerRepository.findByDiscordId(
      activity.officerDiscordId,
    );

    if (!officer) {
      console.log("");
      console.log("==================================");
      console.log("❌ Oficial não encontrado");
      console.log(
        `Discord ID: ${activity.officerDiscordId}`,
      );
      console.log(
        "O usuário ainda não está vinculado a um oficial.",
      );
      console.log("==================================");
      console.log("");

      return;
    }

    const firstAttachment = message.attachments.first();

    /*
     * Converte a atividade interna para o formato
     * esperado pela tabela activities do Supabase.
     */
    const activityInsert: ActivityInsert = {
      officer_id: officer.id,
      type: activity.type,
      qru: activity.qru,
      meta_current: activity.metaCurrent,
      meta_goal: activity.metaGoal,
      activity_date: activity.activityDate,
      discord_message_id: activity.discordMessageId,
      discord_channel_id: activity.discordChannelId,
      image_url: firstAttachment?.url ?? null,
    };

    const savedActivity =
      await activityRepository.save(activityInsert);

    console.log("");
    console.log("==================================");
    console.log("✅ Relatório processado com sucesso");
    console.log(`Oficial: ${officer.name}`);
    console.log(`Matrícula: ${officer.registration}`);
    console.log(`Tipo: ${savedActivity.type}`);
    console.log(
      `Meta: ${savedActivity.meta_current}/${savedActivity.meta_goal}`,
    );
    console.log(`QRU: ${savedActivity.qru}`);
    console.log(`Data: ${savedActivity.activity_date}`);
    console.log(
      `Print: ${savedActivity.image_url ? "Sim" : "Não"}`,
    );
    console.log("==================================");
    console.log("");
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro desconhecido durante o processamento.";

    console.error("");
    console.error("==================================");
    console.error("❌ Erro ao processar relatório");
    console.error(errorMessage);
    console.error(`Mensagem Discord: ${message.id}`);
    console.error(`Autor Discord: ${message.author.id}`);
    console.error("==================================");
    console.error("");
  }
}