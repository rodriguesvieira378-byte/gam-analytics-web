import { supabase } from "../lib/supabase";
import type {
  ActivityInsert,
  ActivityRow,
} from "../types/database";

export class ActivityRepository {
  /**
   * Procura uma atividade pelo ID da mensagem do Discord.
   *
   * Esse método evita que a mesma mensagem seja registrada duas vezes.
   */
  async findByDiscordMessageId(
    discordMessageId: string,
  ): Promise<ActivityRow | null> {
    const normalizedMessageId = discordMessageId.trim();

    if (!normalizedMessageId) {
      return null;
    }

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("discord_message_id", normalizedMessageId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Não foi possível verificar a atividade no Supabase: ${error.message}`,
      );
    }

    return data as ActivityRow | null;
  }

  /**
   * Salva uma atividade na tabela activities.
   *
   * O Repository apenas persiste os dados.
   * A validação e a busca do oficial ficam no GamSyncService.
   */
  async save(activity: ActivityInsert): Promise<ActivityRow> {
    const { data, error } = await supabase
      .from("activities")
      .insert({
        officer_id: activity.officer_id,
        type: activity.type,
        qru: activity.qru,
        meta_current: activity.meta_current,
        meta_goal: activity.meta_goal,
        activity_date: activity.activity_date,
        discord_message_id: activity.discord_message_id,
        discord_channel_id: activity.discord_channel_id,
        image_url: activity.image_url,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "Esta mensagem do Discord já foi registrada anteriormente.",
        );
      }

      throw new Error(
        `Não foi possível salvar a atividade no Supabase: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(
        "O Supabase não retornou a atividade após o salvamento.",
      );
    }

    console.log("");
    console.log("==================================");
    console.log("✅ Atividade salva no Supabase");
    console.log(`ID: ${data.id}`);
    console.log(`Tipo: ${data.type}`);
    console.log(`QRU: ${data.qru}`);
    console.log("==================================");
    console.log("");

    return data as ActivityRow;
  }
}

export const activityRepository = new ActivityRepository();